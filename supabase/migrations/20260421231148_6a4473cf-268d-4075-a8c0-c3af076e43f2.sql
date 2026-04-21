-- Prevent duplicate role rows for the same user (one role per user)
-- First, deduplicate any existing rows (keeping admin if present)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id
  AND a.id <> b.id
  AND (
    -- Drop a if b is admin and a is not, otherwise drop the older row
    (b.role = 'admin' AND a.role <> 'admin')
    OR (a.role = b.role AND a.created_at > b.created_at)
  );

-- Enforce one role per user
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_unique ON public.user_roles(user_id);

-- Update handle_new_user so existing users (e.g. admins) don't get downgraded
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

  -- Only assign customer role if no role exists yet (never overwrite admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;