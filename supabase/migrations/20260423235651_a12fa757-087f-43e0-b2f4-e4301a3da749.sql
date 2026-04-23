ALTER TABLE public.customer_integrations
  DROP CONSTRAINT IF EXISTS customer_integrations_provider_chk;

ALTER TABLE public.customer_integrations
  ADD CONSTRAINT customer_integrations_provider_chk
  CHECK (provider IN (
    'quickbooks','stripe','hubspot','ga4','paycom','jobber','housecall_pro'
  ));

ALTER TABLE public.customer_integrations
  DROP CONSTRAINT IF EXISTS customer_integrations_status_chk;

ALTER TABLE public.customer_integrations
  ADD CONSTRAINT customer_integrations_status_chk
  CHECK (status IN (
    'not_started','requested','setup_in_progress','connected',
    'needs_review','unavailable',
    'active','disconnected','error','paused'
  ));

CREATE POLICY "Clients create own source requests"
  ON public.customer_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IS NOT NULL
    AND user_owns_customer(auth.uid(), customer_id)
  );

CREATE POLICY "Clients update own source requests"
  ON public.customer_integrations
  FOR UPDATE
  TO authenticated
  USING (
    customer_id IS NOT NULL
    AND user_owns_customer(auth.uid(), customer_id)
  )
  WITH CHECK (
    customer_id IS NOT NULL
    AND user_owns_customer(auth.uid(), customer_id)
  );