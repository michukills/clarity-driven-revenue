-- P83A — Request Portal Access + New Accounts approval queue (launch-safe, minimal extension)

-- 1. Table
CREATE TABLE IF NOT EXISTS public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  business_name text,
  business_website text,
  industry text,
  intended_access_type text NOT NULL DEFAULT 'other'
    CHECK (intended_access_type IN ('diagnostic_client','demo_test','existing_client','other')),
  requester_note text,
  consent_acknowledged_at timestamptz,
  request_status text NOT NULL DEFAULT 'pending_review'
    CHECK (request_status IN ('pending_review','clarification_requested','approved_client','approved_demo','denied','suspended')),
  clarification_note text,
  decided_by_admin_id uuid,
  decided_at timestamptz,
  linked_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_requests_status ON public.signup_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_signup_requests_email ON public.signup_requests(lower(email));

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own signup request"
  ON public.signup_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own signup request"
  ON public.signup_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all signup requests"
  ON public.signup_requests FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update signup requests"
  ON public.signup_requests FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete signup requests"
  ON public.signup_requests FOR DELETE
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_signup_requests_updated_at
  BEFORE UPDATE ON public.signup_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. submit_signup_request (called by authenticated user immediately after signup)
CREATE OR REPLACE FUNCTION public.submit_signup_request(
  _full_name text,
  _business_name text,
  _business_website text,
  _industry text,
  _intended_access_type text,
  _requester_note text,
  _consent boolean
) RETURNS public.signup_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_kind text := COALESCE(_intended_access_type, 'other');
  v_row public.signup_requests;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF NOT _consent THEN RAISE EXCEPTION 'consent required'; END IF;
  IF v_kind NOT IN ('diagnostic_client','demo_test','existing_client','other') THEN
    v_kind := 'other';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN RAISE EXCEPTION 'auth user not found'; END IF;

  INSERT INTO public.signup_requests (
    user_id, email, full_name, business_name, business_website, industry,
    intended_access_type, requester_note, consent_acknowledged_at, request_status
  ) VALUES (
    v_uid, v_email, NULLIF(btrim(_full_name),''), NULLIF(btrim(_business_name),''),
    NULLIF(btrim(_business_website),''), NULLIF(btrim(_industry),''),
    v_kind, NULLIF(btrim(_requester_note),''), now(), 'pending_review'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.signup_requests.full_name),
    business_name = COALESCE(EXCLUDED.business_name, public.signup_requests.business_name),
    business_website = COALESCE(EXCLUDED.business_website, public.signup_requests.business_website),
    industry = COALESCE(EXCLUDED.industry, public.signup_requests.industry),
    intended_access_type = EXCLUDED.intended_access_type,
    requester_note = COALESCE(EXCLUDED.requester_note, public.signup_requests.requester_note),
    consent_acknowledged_at = now(),
    -- only reset to pending_review if currently in clarification_requested
    request_status = CASE
      WHEN public.signup_requests.request_status = 'clarification_requested' THEN 'pending_review'
      ELSE public.signup_requests.request_status
    END,
    updated_at = now()
  RETURNING * INTO v_row;

  -- Queue an admin_notifications row (no email sent here; existing pipeline picks up)
  INSERT INTO public.admin_notifications (kind, email, business_name, message, priority, metadata)
  VALUES (
    'signup_request_received', v_email,
    v_row.business_name,
    'New portal access request from ' || v_email,
    'normal',
    jsonb_build_object(
      'signup_request_id', v_row.id,
      'intended_access_type', v_row.intended_access_type,
      'industry', v_row.industry
    )
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_signup_request(text,text,text,text,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_signup_request(text,text,text,text,text,text,boolean) TO authenticated, service_role;

-- 3. admin_decide_signup_request — admin-only (gated; callers must be admin)
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
  v_customer public.customers;
  v_existing_customer_id uuid;
  v_account_kind text;
  v_new_status text;
  v_business text;
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

  IF _decision = 'approve_as_client' THEN
    v_new_status := 'approved_client';
    v_account_kind := 'client';
  ELSIF _decision = 'approve_as_demo' THEN
    v_new_status := 'approved_demo';
    v_account_kind := 'demo';
  ELSIF _decision = 'deny' THEN
    v_new_status := 'denied';
  ELSIF _decision = 'suspend' THEN
    v_new_status := 'suspended';
  ELSIF _decision = 'request_clarification' THEN
    v_new_status := 'clarification_requested';
  ELSE
    RAISE EXCEPTION 'unknown decision';
  END IF;

  -- For approve flows, ensure or create the customer row
  IF v_new_status IN ('approved_client','approved_demo') THEN
    SELECT id INTO v_existing_customer_id FROM public.customers WHERE user_id = v_req.user_id LIMIT 1;
    IF v_existing_customer_id IS NULL THEN
      INSERT INTO public.customers (
        full_name, email, business_name, industry, user_id, stage, status, payment_status,
        account_kind, is_demo_account
      ) VALUES (
        COALESCE(v_req.full_name, split_part(v_req.email,'@',1)),
        v_req.email,
        v_business,
        COALESCE(NULLIF(btrim(_override_industry),''), v_req.industry),
        v_req.user_id,
        'lead', 'active', 'unpaid',
        v_account_kind,
        v_account_kind = 'demo'
      )
      RETURNING id INTO v_existing_customer_id;

      INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
      VALUES (v_existing_customer_id, 'customer_created',
              CASE WHEN v_account_kind='demo' THEN 'Demo account provisioned from signup request'
                   ELSE 'Client account provisioned from signup request' END,
              'Created via admin approval of signup request ' || v_req.id::text,
              v_uid);
    ELSE
      UPDATE public.customers
         SET account_kind = v_account_kind,
             is_demo_account = (v_account_kind = 'demo'),
             business_name = COALESCE(v_business, business_name),
             industry = COALESCE(NULLIF(btrim(_override_industry),''), industry),
             last_activity_at = now()
       WHERE id = v_existing_customer_id;

      INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
      VALUES (v_existing_customer_id, 'account_kind_changed',
              'Approved as ' || v_account_kind,
              'Approved via signup request ' || v_req.id::text, v_uid);
    END IF;
  END IF;

  -- Deny → write to denied_signups (so existing pending-signup queue + auth gating already work)
  IF v_new_status = 'denied' THEN
    INSERT INTO public.denied_signups (user_id, email, denied_by, denied_at, reason)
    VALUES (v_req.user_id, v_req.email, v_uid, now(), COALESCE(NULLIF(btrim(_clarification_note),''), 'denied via signup request review'))
    ON CONFLICT (user_id) DO UPDATE
      SET denied_at = now(), denied_by = v_uid, reason = COALESCE(EXCLUDED.reason, public.denied_signups.reason);
  END IF;

  -- Suspend / Approve → make sure user is NOT in denied_signups so login proceeds correctly
  IF v_new_status IN ('approved_client','approved_demo','clarification_requested') THEN
    DELETE FROM public.denied_signups WHERE user_id = v_req.user_id;
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

  -- Queue notification row (no email sent here; existing pipeline / Zapier event handles delivery)
  INSERT INTO public.admin_notifications (kind, customer_id, email, business_name, message, priority, metadata)
  VALUES (
    'signup_request_decided',
    v_existing_customer_id,
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
