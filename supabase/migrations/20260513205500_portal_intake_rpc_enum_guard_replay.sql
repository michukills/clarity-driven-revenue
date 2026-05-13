-- Launch-blocker repair replay: keep portal intake industry values enum-safe.
--
-- Live failure guarded here:
--   Postgres 42804: customers.industry is public.industry_category, but
--   portal intake SQL/RPC parity paths were passing raw text.
--
-- Why this replay exists:
--   Production still reported 42804 after the frontend confirmation flow went
--   live. That is consistent with Lovable/Supabase running an older
--   admin_decide_signup_request/create_customer_from_signup RPC body or with
--   the prior enum-safe replacement migration not being applied. This migration
--   intentionally replaces those RPCs again so production cannot keep the old
--   v_industry text -> customers.industry path.
--
-- Rules:
--   * never weaken customers.industry from enum to text
--   * only cast after validating against public.industry_category
--   * missing/unsupported intake industry leaves customers.industry null or
--     preserves an existing enum value, and marks needs_industry_review=true

CREATE OR REPLACE FUNCTION public.admin_decide_signup_request(
  _request_id uuid,
  _decision text,
  _clarification_note text,
  _override_business_name text,
  _override_industry text
) RETURNS public.signup_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_caller text := COALESCE(auth.role(), '');
  v_req public.signup_requests;
  v_existing_customer_id uuid;
  v_account_kind text;
  v_new_status text;
  v_business text;
  v_raw_industry text;
  v_industry public.industry_category;
  v_is_demo boolean := false;
  v_needs_industry_review boolean := false;
BEGIN
  IF v_caller NOT IN ('authenticated','service_role') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;
  IF v_caller = 'authenticated' AND NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _request_id IS NULL THEN RAISE EXCEPTION 'request_id required'; END IF;

  SELECT * INTO v_req FROM public.signup_requests WHERE id = _request_id FOR UPDATE;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'signup request not found'; END IF;

  v_business := COALESCE(NULLIF(btrim(_override_business_name),''), v_req.business_name);
  v_raw_industry := COALESCE(NULLIF(btrim(_override_industry),''), NULLIF(btrim(v_req.industry),''));

  IF v_raw_industry IS NOT NULL
     AND v_raw_industry = ANY(enum_range(NULL::public.industry_category)::text[]) THEN
    v_industry := v_raw_industry::public.industry_category;
  ELSE
    v_industry := NULL;
  END IF;
  v_needs_industry_review := v_industry IS NULL;

  IF _decision = 'approve_as_client' THEN
    v_new_status := 'approved_client';
    v_account_kind := 'client';
  ELSIF _decision = 'approve_as_demo' THEN
    v_new_status := 'approved_demo';
    v_account_kind := 'demo';
    v_is_demo := true;
  ELSIF _decision = 'deny' THEN
    v_new_status := 'denied';
  ELSIF _decision = 'suspend' THEN
    v_new_status := 'suspended';
  ELSIF _decision = 'request_clarification' THEN
    v_new_status := 'clarification_requested';
  ELSE
    RAISE EXCEPTION 'unknown decision';
  END IF;

  IF v_new_status IN ('approved_client','approved_demo') THEN
    SELECT id INTO v_existing_customer_id
    FROM public.customers
    WHERE user_id = v_req.user_id
    LIMIT 1;

    IF v_existing_customer_id IS NULL THEN
      SELECT id INTO v_existing_customer_id
      FROM public.customers
      WHERE lower(email) = lower(v_req.email)
        AND user_id IS NULL
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    IF v_existing_customer_id IS NULL THEN
      INSERT INTO public.customers (
        full_name,
        email,
        business_name,
        industry,
        user_id,
        stage,
        lifecycle_state,
        status,
        payment_status,
        account_kind,
        account_kind_notes,
        is_demo_account,
        needs_industry_review,
        industry_confirmed_by_admin,
        industry_intake_source,
        industry_intake_value,
        industry_review_notes,
        contributes_to_global_learning,
        learning_enabled,
        learning_exclusion_reason
      ) VALUES (
        COALESCE(NULLIF(btrim(v_req.full_name),''), split_part(v_req.email,'@',1)),
        lower(v_req.email),
        v_business,
        v_industry,
        v_req.user_id,
        'lead',
        'lead',
        'active',
        'unpaid',
        v_account_kind,
        CASE WHEN v_is_demo
          THEN 'Approved as a demo/test account from portal intake. Demo-safe data only.'
          ELSE 'Approved as a client account from portal intake.'
        END,
        v_is_demo,
        v_needs_industry_review,
        false,
        'portal_access_request',
        v_raw_industry,
        CASE
          WHEN v_raw_industry IS NOT NULL AND v_industry IS NULL
            THEN 'Portal intake included an unsupported industry value. Review before confirming industry, payment, portal access, or delivery scope.'
          WHEN v_needs_industry_review
            THEN 'Portal intake did not include industry. Review before confirming industry, payment, portal access, or delivery scope.'
          ELSE 'Industry came from portal intake. Confirm before enabling industry-specific tools.'
        END,
        NOT v_is_demo,
        NOT v_is_demo,
        CASE WHEN v_is_demo THEN 'Demo/test account' ELSE NULL END
      )
      RETURNING id INTO v_existing_customer_id;
    ELSE
      UPDATE public.customers
         SET user_id = v_req.user_id,
             account_kind = v_account_kind,
             account_kind_notes = CASE WHEN v_is_demo
               THEN 'Approved as a demo/test account from portal intake. Demo-safe data only.'
               ELSE 'Approved as a client account from portal intake.'
             END,
             is_demo_account = v_is_demo,
             business_name = COALESCE(v_business, business_name),
             industry = COALESCE(v_industry, industry),
             lifecycle_state = 'lead',
             status = 'active',
             needs_industry_review = CASE
               WHEN v_raw_industry IS NOT NULL AND v_industry IS NULL THEN true
               ELSE COALESCE(v_industry, industry) IS NULL
             END,
             industry_confirmed_by_admin = false,
             industry_intake_source = 'portal_access_request',
             industry_intake_value = COALESCE(v_raw_industry, v_industry::text, industry::text),
             industry_review_notes = CASE
               WHEN v_raw_industry IS NOT NULL AND v_industry IS NULL
                 THEN 'Portal intake included an unsupported industry value. Review before confirming industry, payment, portal access, or delivery scope.'
               WHEN COALESCE(v_industry, industry) IS NULL
                 THEN 'Portal intake did not include industry. Review before confirming industry, payment, portal access, or delivery scope.'
               ELSE 'Industry came from portal intake or an existing customer record. Confirm before enabling industry-specific tools.'
             END,
             contributes_to_global_learning = NOT v_is_demo,
             learning_enabled = NOT v_is_demo,
             learning_exclusion_reason = CASE WHEN v_is_demo THEN 'Demo/test account' ELSE NULL END,
             last_activity_at = now()
       WHERE id = v_existing_customer_id;
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_req.user_id, 'customer')
    ON CONFLICT (user_id) DO NOTHING;

    DELETE FROM public.denied_signups WHERE user_id = v_req.user_id;

    INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
    VALUES (
      v_existing_customer_id,
      CASE WHEN v_is_demo THEN 'demo_account_linked' ELSE 'client_account_linked' END,
      CASE WHEN v_is_demo THEN 'Demo account approved' ELSE 'Client account approved' END,
      'Resolved from Portal Access Request review.',
      v_uid
    );
  END IF;

  IF v_new_status IN ('denied','suspended') THEN
    INSERT INTO public.denied_signups (user_id, email, denied_by, denied_at, reason)
    VALUES (
      v_req.user_id,
      v_req.email,
      v_uid,
      now(),
      COALESCE(NULLIF(btrim(_clarification_note),''), v_new_status || ' via signup request review')
    )
    ON CONFLICT (user_id) DO UPDATE
      SET denied_at = now(),
          denied_by = v_uid,
          reason = COALESCE(EXCLUDED.reason, public.denied_signups.reason);

    IF v_req.linked_customer_id IS NOT NULL THEN
      UPDATE public.customers
         SET status = CASE WHEN v_new_status = 'suspended' THEN 'suspended' ELSE 'inactive' END,
             portal_unlocked = false,
             last_activity_at = now()
       WHERE id = v_req.linked_customer_id;
    END IF;
  END IF;

  UPDATE public.signup_requests
     SET request_status = v_new_status,
         clarification_note = CASE WHEN v_new_status IN ('clarification_requested','denied','suspended')
                                     THEN COALESCE(NULLIF(btrim(_clarification_note),''), clarification_note)
                                   ELSE clarification_note END,
         decided_by_admin_id = v_uid,
         decided_at = now(),
         linked_customer_id = COALESCE(v_existing_customer_id, linked_customer_id),
         updated_at = now()
   WHERE id = _request_id
   RETURNING * INTO v_req;

  INSERT INTO public.admin_notifications (kind, customer_id, email, business_name, message, priority, metadata)
  VALUES (
    'signup_request_decided',
    COALESCE(v_existing_customer_id, v_req.linked_customer_id),
    v_req.email,
    v_req.business_name,
    'Signup request ' || v_new_status || ' for ' || v_req.email,
    'normal',
    jsonb_build_object(
      'signup_request_id', v_req.id,
      'decision', _decision,
      'new_status', v_new_status,
      'admin_id', v_uid
    )
  );

  RETURN v_req;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_decide_signup_request(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_signup_request(uuid,text,text,text,text) TO service_role;
COMMENT ON FUNCTION public.admin_decide_signup_request(uuid,text,text,text,text) IS
  'RGS portal intake enum-safe RPC replay; admin-account-links backend marker b41b4f80-industry-safe-v2';

CREATE OR REPLACE FUNCTION public.create_customer_from_signup(_user_id uuid)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u_email text;
  u_full_name text;
  v_req public.signup_requests;
  result public.customers;
  v_raw_industry text;
  v_industry public.industry_category;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF EXISTS (SELECT 1 FROM public.customers WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'user already linked to a customer';
  END IF;

  SELECT u.email::text,
         COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email::text, '@', 1))
    INTO u_email, u_full_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = _user_id;

  IF u_email IS NULL THEN
    RAISE EXCEPTION 'auth user not found';
  END IF;

  SELECT * INTO v_req
  FROM public.signup_requests
  WHERE user_id = _user_id
  ORDER BY created_at DESC
  LIMIT 1;

  v_raw_industry := NULLIF(btrim(v_req.industry), '');
  IF v_raw_industry IS NOT NULL
     AND v_raw_industry = ANY(enum_range(NULL::public.industry_category)::text[]) THEN
    v_industry := v_raw_industry::public.industry_category;
  ELSE
    v_industry := NULL;
  END IF;

  INSERT INTO public.customers (
    full_name,
    email,
    business_name,
    industry,
    user_id,
    stage,
    lifecycle_state,
    status,
    payment_status,
    account_kind,
    is_demo_account,
    needs_industry_review,
    industry_confirmed_by_admin,
    industry_intake_source,
    industry_intake_value,
    industry_review_notes
  )
  VALUES (
    COALESCE(NULLIF(btrim(v_req.full_name), ''), u_full_name),
    lower(u_email),
    NULLIF(btrim(v_req.business_name), ''),
    v_industry,
    _user_id,
    'lead',
    'lead',
    'active',
    'unpaid',
    CASE WHEN v_req.intended_access_type = 'demo_test' THEN 'demo' ELSE 'client' END,
    v_req.intended_access_type = 'demo_test',
    v_industry IS NULL,
    false,
    'portal_signup',
    v_raw_industry,
    CASE
      WHEN v_raw_industry IS NOT NULL AND v_industry IS NULL
        THEN 'Signup/customer creation included an unsupported industry value. Review before confirming industry, payment, portal access, or delivery scope.'
      WHEN v_industry IS NULL
        THEN 'Signup/customer creation did not include industry. Review before confirming industry, payment, portal access, or delivery scope.'
      ELSE 'Industry came from signup/customer creation. Confirm before enabling industry-specific tools.'
    END
  )
  RETURNING * INTO result;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;

  DELETE FROM public.denied_signups WHERE user_id = _user_id;

  UPDATE public.signup_requests
     SET request_status = CASE WHEN result.account_kind = 'demo' THEN 'approved_demo' ELSE 'approved_client' END,
         linked_customer_id = result.id,
         decided_by_admin_id = auth.uid(),
         decided_at = now(),
         updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
    VALUES (result.id, 'customer_created', 'Customer record created from signup',
            'Created from New Signups queue.', auth.uid());

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_signup_to_customer(_user_id uuid, _customer_id uuid)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.customers;
  v_email text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF EXISTS (SELECT 1 FROM public.customers WHERE user_id = _user_id AND id <> _customer_id) THEN
    RAISE EXCEPTION 'user already linked to another customer';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = _user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'auth user not found';
  END IF;

  UPDATE public.customers
    SET user_id = _user_id,
        status = 'active',
        last_activity_at = now()
    WHERE id = _customer_id
      AND (user_id IS NULL OR user_id = _user_id)
    RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'customer not found or already linked to another auth user';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;

  DELETE FROM public.denied_signups WHERE user_id = _user_id;

  INSERT INTO public.signup_requests (
    user_id,
    email,
    full_name,
    business_name,
    industry,
    intended_access_type,
    request_status,
    linked_customer_id,
    decided_by_admin_id,
    decided_at
  )
  VALUES (
    _user_id,
    lower(v_email),
    result.full_name,
    result.business_name,
    result.industry::text,
    CASE WHEN result.account_kind = 'demo' OR result.is_demo_account THEN 'demo_test' ELSE 'diagnostic_client' END,
    CASE WHEN result.account_kind = 'demo' OR result.is_demo_account THEN 'approved_demo' ELSE 'approved_client' END,
    result.id,
    auth.uid(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    request_status = EXCLUDED.request_status,
    linked_customer_id = EXCLUDED.linked_customer_id,
    decided_by_admin_id = EXCLUDED.decided_by_admin_id,
    decided_at = EXCLUDED.decided_at,
    updated_at = now();

  INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
    VALUES (
      result.id,
      'client_account_linked',
      'Client account linked',
      'Client portal account was linked to this customer record.',
      auth.uid()
    );

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_from_signup(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_from_signup(uuid) TO service_role;
COMMENT ON FUNCTION public.create_customer_from_signup(uuid) IS
  'RGS portal intake enum-safe RPC replay; missing/invalid industry sets needs_industry_review=true';

REVOKE ALL ON FUNCTION public.link_signup_to_customer(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_signup_to_customer(uuid, uuid) TO service_role;
COMMENT ON FUNCTION public.link_signup_to_customer(uuid, uuid) IS
  'RGS portal intake enum-safe RPC replay; preserves existing customer industry on link';
