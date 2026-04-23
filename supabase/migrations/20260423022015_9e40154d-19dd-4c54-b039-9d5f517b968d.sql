-- 1) Add a future-safe marker for welcome email send state.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz NULL;

-- 2) Update repair_customer_links to be safer + log a dedicated event,
--    idempotent (no duplicate auto-link timeline events).
CREATE OR REPLACE FUNCTION public.repair_customer_links()
RETURNS TABLE(linked_count integer, ambiguous_count integer)
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
  already_logged boolean;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  FOR rec IN
    SELECT id, email
      FROM public.customers
     WHERE user_id IS NULL
       AND email IS NOT NULL
       AND email <> ''
       AND archived_at IS NULL
  LOOP
    SELECT count(*) INTO match_count
      FROM auth.users u
     WHERE lower(u.email::text) = lower(rec.email);

    IF match_count = 1 THEN
      SELECT u.id INTO match_user
        FROM auth.users u
       WHERE lower(u.email::text) = lower(rec.email)
       LIMIT 1;

      -- Don't link if that auth user is already linked to another customer
      IF NOT EXISTS (SELECT 1 FROM public.customers WHERE user_id = match_user) THEN
        UPDATE public.customers
           SET user_id = match_user,
               last_activity_at = now()
         WHERE id = rec.id
           AND user_id IS NULL;       -- never overwrite

        -- Idempotent timeline: only insert once per customer
        SELECT EXISTS (
          SELECT 1 FROM public.customer_timeline
           WHERE customer_id = rec.id
             AND event_type IN ('client_account_auto_linked','account_linked')
        ) INTO already_logged;

        IF NOT already_logged THEN
          INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
          VALUES (
            rec.id,
            'client_account_auto_linked',
            'Client account linked',
            'Client portal account was linked to this customer record.',
            auth.uid()
          );
        END IF;

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

-- 3) Update handle_new_user so when an auth user is auto-linked to a
--    pre-existing customer at signup, we log a client-safe timeline event.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  matched_customer_id uuid;
  match_count int;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;

  -- Only auto-link if there is exactly one matching unlinked, non-archived customer.
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
      -- Idempotent timeline log
      IF NOT EXISTS (
        SELECT 1 FROM public.customer_timeline
         WHERE customer_id = matched_customer_id
           AND event_type IN ('client_account_auto_linked','account_linked')
      ) THEN
        INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
        VALUES (
          matched_customer_id,
          'client_account_auto_linked',
          'Client account linked',
          'Client portal account was linked to this customer record.',
          NULL
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;