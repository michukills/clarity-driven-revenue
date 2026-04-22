-- P1.5: Admin functions for pending signup management
-- Lets admins discover auth users that signed up but aren't linked to a customer record,
-- and link them to existing customers or create a new customer record from the signup.

CREATE OR REPLACE FUNCTION public.list_unlinked_signups()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    COALESCE(p.full_name, (u.raw_user_meta_data->>'full_name')) AS full_name,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.is_admin(auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.customers c WHERE c.user_id = u.id
    )
  ORDER BY u.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.link_signup_to_customer(_user_id uuid, _customer_id uuid)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.customers;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF EXISTS (SELECT 1 FROM public.customers WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'user already linked to a customer';
  END IF;

  UPDATE public.customers
    SET user_id = _user_id,
        last_activity_at = now()
    WHERE id = _customer_id
    RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'customer not found';
  END IF;

  INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
    VALUES (result.id, 'account_linked', 'Client account linked',
            'Linked to auth user ' || _user_id::text, auth.uid());

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_customer_from_signup(_user_id uuid)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u_email text;
  u_full_name text;
  result public.customers;
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

  INSERT INTO public.customers (full_name, email, user_id, stage, status, payment_status)
    VALUES (u_full_name, u_email, _user_id, 'lead', 'active', 'unpaid')
    RETURNING * INTO result;

  INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
    VALUES (result.id, 'customer_created', 'Customer record created from signup',
            'Auto-created from auth user ' || _user_id::text, auth.uid());

  RETURN result;
END;
$$;