-- P96C — Scan lead activation infrastructure.
CREATE TABLE IF NOT EXISTS public.scan_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  business_name text NOT NULL,
  phone text,
  consent_one_liner text,
  email_consent boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'operational_friction_scan',
  scan_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  scan_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  lifecycle text NOT NULL DEFAULT 'prospect',
  requested_next_step text,
  linked_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  follow_up_email_status text NOT NULL DEFAULT 'queued',
  follow_up_email_at timestamptz,
  follow_up_email_error text,
  follow_up_email_recipients text[],
  follow_up_email_from text,
  admin_alert_email_status text NOT NULL DEFAULT 'queued',
  admin_alert_email_at timestamptz,
  admin_alert_email_error text,
  manual_followup_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new',
  source_page text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS scan_leads_email_idx ON public.scan_leads (lower(email));
CREATE INDEX IF NOT EXISTS scan_leads_created_at_idx ON public.scan_leads (created_at DESC);

ALTER TABLE public.scan_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scan_leads_anonymous_insert" ON public.scan_leads;
CREATE POLICY "scan_leads_anonymous_insert"
  ON public.scan_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "scan_leads_admin_select" ON public.scan_leads;
CREATE POLICY "scan_leads_admin_select"
  ON public.scan_leads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "scan_leads_admin_update" ON public.scan_leads;
CREATE POLICY "scan_leads_admin_update"
  ON public.scan_leads
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "scan_leads_admin_delete" ON public.scan_leads;
CREATE POLICY "scan_leads_admin_delete"
  ON public.scan_leads
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.scan_leads_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scan_leads_set_updated_at ON public.scan_leads;
CREATE TRIGGER trg_scan_leads_set_updated_at
BEFORE UPDATE ON public.scan_leads
FOR EACH ROW EXECUTE FUNCTION public.scan_leads_set_updated_at();

-- Link scan leads to an existing customer (NEVER auto-create one).
CREATE OR REPLACE FUNCTION public.ensure_scan_lead_customer_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean_email text;
  _customer_id uuid;
BEGIN
  _clean_email := lower(trim(coalesce(NEW.email, '')));
  IF _clean_email = '' THEN
    RETURN NEW;
  END IF;
  IF NEW.linked_customer_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_clean_email)::bigint);
  SELECT id INTO _customer_id
  FROM public.customers
  WHERE lower(email) = _clean_email
  ORDER BY created_at DESC
  LIMIT 1;
  IF _customer_id IS NOT NULL THEN
    NEW.linked_customer_id := _customer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scan_lead_customer_link ON public.scan_leads;
CREATE TRIGGER trg_scan_lead_customer_link
BEFORE INSERT ON public.scan_leads
FOR EACH ROW EXECUTE FUNCTION public.ensure_scan_lead_customer_link();

-- Service-role-only RPC for the scan-followup edge function to record dispatch outcomes.
CREATE OR REPLACE FUNCTION public.admin_record_scan_email_result(
  _lead_id uuid,
  _kind text,
  _status text,
  _error text,
  _recipients text[],
  _from text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _kind = 'admin_alert' THEN
    UPDATE public.scan_leads
       SET admin_alert_email_status = _status,
           admin_alert_email_at = CASE WHEN _status = 'sent' THEN now() ELSE admin_alert_email_at END,
           admin_alert_email_error = _error,
           manual_followup_required = CASE
             WHEN _status IN ('failed','skipped_missing_config') THEN true
             ELSE manual_followup_required
           END
     WHERE id = _lead_id;
  ELSIF _kind = 'follow_up' THEN
    UPDATE public.scan_leads
       SET follow_up_email_status = _status,
           follow_up_email_at = CASE WHEN _status = 'sent' THEN now() ELSE follow_up_email_at END,
           follow_up_email_error = _error,
           follow_up_email_recipients = COALESCE(_recipients, follow_up_email_recipients),
           follow_up_email_from = COALESCE(_from, follow_up_email_from),
           manual_followup_required = CASE
             WHEN _status IN ('failed','skipped_missing_config','skipped_missing_consent') THEN true
             ELSE manual_followup_required
           END
     WHERE id = _lead_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_record_scan_email_result(uuid, text, text, text, text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_record_scan_email_result(uuid, text, text, text, text[], text) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_record_scan_email_result(uuid, text, text, text, text[], text) TO service_role;