-- P1: Auto-link customers.user_id on signup + backfill existing rows by email match.
-- This unblocks live saving in the client Revenue Tracker for assigned clients.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Default role: customer (never overwrites existing admin role)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;

  -- NEW: link the new auth user to a pre-existing customer row that matches by email,
  -- but only if that customer has no user_id yet. This allows admins to pre-create
  -- a customer record (with email) and have it auto-link the moment the client signs up.
  UPDATE public.customers
     SET user_id = NEW.id
   WHERE lower(email) = lower(NEW.email)
     AND user_id IS NULL;

  RETURN NEW;
END;
$function$;

-- One-time backfill: link any existing customer rows whose email matches an existing auth user.
UPDATE public.customers c
   SET user_id = u.id
  FROM auth.users u
 WHERE c.user_id IS NULL
   AND lower(c.email) = lower(u.email);