
-- Archive support for customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS customers_archived_at_idx ON public.customers (archived_at);

-- Denied signups tracker (lightweight; auth users we never want to see in pending again)
CREATE TABLE IF NOT EXISTS public.denied_signups (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  denied_by uuid NULL,
  denied_at timestamptz NOT NULL DEFAULT now(),
  reason text NULL
);

ALTER TABLE public.denied_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage denied_signups" ON public.denied_signups;
CREATE POLICY "Admins manage denied_signups"
  ON public.denied_signups
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Update list_unlinked_signups to exclude denied
CREATE OR REPLACE FUNCTION public.list_unlinked_signups()
 RETURNS TABLE(user_id uuid, email text, full_name text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    COALESCE(p.full_name, (u.raw_user_meta_data->>'full_name')) AS full_name,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.is_admin(auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.denied_signups d WHERE d.user_id = u.id)
  ORDER BY u.created_at DESC;
$function$;

-- Deny a pending signup (admin only)
CREATE OR REPLACE FUNCTION public.deny_signup(_user_id uuid, _reason text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE u_email text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  SELECT email::text INTO u_email FROM auth.users WHERE id = _user_id;
  IF u_email IS NULL THEN RAISE EXCEPTION 'auth user not found'; END IF;
  INSERT INTO public.denied_signups (user_id, email, denied_by, reason)
    VALUES (_user_id, u_email, auth.uid(), _reason)
    ON CONFLICT (user_id) DO UPDATE SET denied_at = now(), denied_by = auth.uid(), reason = COALESCE(EXCLUDED.reason, denied_signups.reason);
END;
$function$;

-- Allow admin to undo deny
CREATE OR REPLACE FUNCTION public.undeny_signup(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  DELETE FROM public.denied_signups WHERE user_id = _user_id;
END;
$function$;
