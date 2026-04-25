-- 2. Update is_admin to also include platform_owner
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'platform_owner')
  )
$$;

-- 3. Helper to check platform_owner specifically
CREATE OR REPLACE FUNCTION public.is_platform_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'platform_owner'
  )
$$;

-- 4. Platform-owner email allowlist
CREATE TABLE IF NOT EXISTS public.platform_owner_emails (
  email text PRIMARY KEY,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.platform_owner_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform owners manage owner emails"
  ON public.platform_owner_emails
  FOR ALL
  USING (public.is_platform_owner(auth.uid()))
  WITH CHECK (public.is_platform_owner(auth.uid()));

-- Seed the known platform owner email (lowercase for case-insensitive match)
INSERT INTO public.platform_owner_emails (email, notes)
VALUES ('jmchubb@revenueandgrowthsystems.com', 'Founder / platform owner — never treated as a client.')
ON CONFLICT (email) DO NOTHING;

-- 5. Promote John to platform_owner
-- Drop unique constraint allows only one role per user; we replace admin -> platform_owner
UPDATE public.user_roles
   SET role = 'platform_owner'
 WHERE user_id = 'da7e8860-d061-43e9-acaf-5bdf9412c3be';

-- 6. Updated handle_new_user — assign platform_owner if email matches, never auto-link customer for owners
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  matched_customer_id uuid;
  match_count int;
  is_owner boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Determine if this email is a known platform owner
  SELECT EXISTS (
    SELECT 1 FROM public.platform_owner_emails
    WHERE lower(email) = lower(NEW.email)
  ) INTO is_owner;

  IF is_owner THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'platform_owner')
    ON CONFLICT (user_id) DO UPDATE SET role = 'platform_owner';
    -- Skip auto-link to any customer row for platform owners
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;

  -- Auto-link only if exactly one matching unlinked, non-archived customer
  SELECT count(*) INTO match_count
    FROM public.customers
   WHERE lower(email) = lower(NEW.email)
     AND user_id IS NULL
     AND archived_at IS NULL;

  IF match_count = 1 THEN
    UPDATE public.customers
       SET user_id = NEW.id,
           last_activity_at = now()
     WHERE lower(email) = lower(NEW.email)
       AND user_id IS NULL
       AND archived_at IS NULL
    RETURNING id INTO matched_customer_id;

    IF matched_customer_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.customer_timeline
         WHERE customer_id = matched_customer_id
           AND event_type = 'auth_linked'
      ) THEN
        INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
        VALUES (matched_customer_id, 'auth_linked', 'Customer account linked',
                'Auto-linked at signup: ' || NEW.email, NEW.id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
