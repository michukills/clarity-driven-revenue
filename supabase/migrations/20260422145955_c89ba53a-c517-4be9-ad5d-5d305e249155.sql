
-- Search auth users by email or name (admin only)
CREATE OR REPLACE FUNCTION public.list_auth_users_for_link(_search text DEFAULT NULL)
 RETURNS TABLE(user_id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz, linked_customer_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    COALESCE(p.full_name, (u.raw_user_meta_data->>'full_name')) AS full_name,
    u.created_at,
    u.last_sign_in_at,
    (SELECT c.id FROM public.customers c WHERE c.user_id = u.id LIMIT 1) AS linked_customer_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.is_admin(auth.uid())
    AND (
      _search IS NULL OR _search = ''
      OR lower(u.email::text) LIKE '%' || lower(_search) || '%'
      OR lower(COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', '')) LIKE '%' || lower(_search) || '%'
    )
  ORDER BY u.created_at DESC
  LIMIT 50;
$function$;

-- Repair customer links: for each unlinked customer where exactly one auth user
-- matches the email (case-insensitive), set customers.user_id. Skip ambiguous matches.
-- Returns counts so the caller can surface them.
CREATE OR REPLACE FUNCTION public.repair_customer_links()
 RETURNS TABLE(linked_count int, ambiguous_count int)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec record;
  match_user uuid;
  match_count int;
  v_linked int := 0;
  v_ambiguous int := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  FOR rec IN
    SELECT id, email FROM public.customers
    WHERE user_id IS NULL AND email IS NOT NULL AND email <> ''
  LOOP
    SELECT count(*) INTO match_count FROM auth.users u WHERE lower(u.email::text) = lower(rec.email);
    IF match_count = 1 THEN
      SELECT u.id INTO match_user FROM auth.users u WHERE lower(u.email::text) = lower(rec.email) LIMIT 1;
      -- Don't link if that auth user is already linked to another customer
      IF NOT EXISTS (SELECT 1 FROM public.customers WHERE user_id = match_user) THEN
        UPDATE public.customers
          SET user_id = match_user, last_activity_at = now()
          WHERE id = rec.id;
        INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
          VALUES (rec.id, 'account_linked', 'Auto-linked by email match',
                  'Auto-linked to auth user ' || match_user::text, auth.uid());
        v_linked := v_linked + 1;
      END IF;
    ELSIF match_count > 1 THEN
      v_ambiguous := v_ambiguous + 1;
    END IF;
  END LOOP;

  linked_count := v_linked;
  ambiguous_count := v_ambiguous;
  RETURN NEXT;
END;
$function$;

-- Explicit admin link / relink / unlink
CREATE OR REPLACE FUNCTION public.set_customer_user_link(_customer_id uuid, _user_id uuid, _force boolean DEFAULT false)
 RETURNS customers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_other uuid;
  result public.customers;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF _user_id IS NULL THEN
    -- Unlink
    UPDATE public.customers SET user_id = NULL, last_activity_at = now() WHERE id = _customer_id RETURNING * INTO result;
    INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
      VALUES (_customer_id, 'account_unlinked', 'Account unlinked', NULL, auth.uid());
    RETURN result;
  END IF;

  -- Check if user already linked to another customer
  SELECT id INTO existing_other FROM public.customers WHERE user_id = _user_id AND id <> _customer_id LIMIT 1;
  IF existing_other IS NOT NULL AND NOT _force THEN
    RAISE EXCEPTION 'auth user is already linked to another customer (%); pass _force=true to relink', existing_other;
  END IF;

  -- If forcing, unlink the other customer first
  IF existing_other IS NOT NULL AND _force THEN
    UPDATE public.customers SET user_id = NULL WHERE id = existing_other;
    INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
      VALUES (existing_other, 'account_unlinked', 'Account unlinked (relinked elsewhere)', NULL, auth.uid());
  END IF;

  UPDATE public.customers
    SET user_id = _user_id, last_activity_at = now()
    WHERE id = _customer_id
    RETURNING * INTO result;

  INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
    VALUES (_customer_id, 'account_linked', 'Account linked',
            'Linked to auth user ' || _user_id::text, auth.uid());

  RETURN result;
END;
$function$;
