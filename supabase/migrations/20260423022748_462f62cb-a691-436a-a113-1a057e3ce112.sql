-- P7.4: Use distinct event type for manual client account links so Zapier
-- can fire the welcome email on either auto- or manual-link without
-- collapsing them into the same audit row.
CREATE OR REPLACE FUNCTION public.link_signup_to_customer(_user_id uuid, _customer_id uuid)
 RETURNS customers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Idempotent: only insert a link timeline event once per customer.
  IF NOT EXISTS (
    SELECT 1 FROM public.customer_timeline
     WHERE customer_id = result.id
       AND event_type IN ('client_account_linked','client_account_auto_linked','account_linked')
  ) THEN
    INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
      VALUES (
        result.id,
        'client_account_linked',
        'Client account linked',
        'Client portal account was linked to this customer record.',
        auth.uid()
      );
  END IF;

  RETURN result;
END;
$function$;