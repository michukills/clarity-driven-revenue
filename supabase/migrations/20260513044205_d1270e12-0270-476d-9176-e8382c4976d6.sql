
ALTER TABLE public.scorecard_runs
  ADD COLUMN IF NOT EXISTS email_consent boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'public_scorecard',
  ADD COLUMN IF NOT EXISTS manual_followup_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS follow_up_email_status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS follow_up_email_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_email_error text,
  ADD COLUMN IF NOT EXISTS follow_up_email_recipients text[],
  ADD COLUMN IF NOT EXISTS follow_up_email_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follow_up_email_from text,
  ADD COLUMN IF NOT EXISTS admin_alert_email_status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS admin_alert_email_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_alert_email_error text,
  ADD COLUMN IF NOT EXISTS admin_alert_email_recipients text[];

DO $$ BEGIN
  ALTER TABLE public.scorecard_runs
    ADD CONSTRAINT scorecard_runs_followup_email_status_chk
    CHECK (follow_up_email_status IN ('queued','sent','failed','skipped_missing_consent','skipped_missing_config','bounced','retry_needed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.scorecard_runs
    ADD CONSTRAINT scorecard_runs_admin_alert_status_chk
    CHECK (admin_alert_email_status IN ('queued','sent','failed','skipped_missing_config','retry_needed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS scorecard_runs_followup_status_idx
  ON public.scorecard_runs (follow_up_email_status);
CREATE INDEX IF NOT EXISTS scorecard_runs_linked_customer_idx
  ON public.scorecard_runs (linked_customer_id);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS linked_scorecard_run_id uuid REFERENCES public.scorecard_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS customers_linked_scorecard_idx
  ON public.customers (linked_scorecard_run_id);

-- Trigger: when a customer is inserted, if there's a matching scorecard run by email, link both ways.
CREATE OR REPLACE FUNCTION public.link_customer_to_scorecard_run()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _run_id uuid;
BEGIN
  IF NEW.email IS NULL OR length(trim(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.linked_scorecard_run_id IS NULL THEN
    SELECT id INTO _run_id
    FROM public.scorecard_runs
    WHERE lower(email) = lower(NEW.email)
    ORDER BY created_at DESC
    LIMIT 1;
    IF _run_id IS NOT NULL THEN
      NEW.linked_scorecard_run_id := _run_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_customer_to_scorecard_run ON public.customers;
CREATE TRIGGER trg_link_customer_to_scorecard_run
BEFORE INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.link_customer_to_scorecard_run();

-- After-insert: backfill the scorecard_runs.linked_customer_id so admin pipeline shows account state.
CREATE OR REPLACE FUNCTION public.backlink_scorecard_run_to_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.linked_scorecard_run_id IS NOT NULL THEN
    UPDATE public.scorecard_runs
    SET linked_customer_id = NEW.id
    WHERE id = NEW.linked_scorecard_run_id
      AND (linked_customer_id IS NULL OR linked_customer_id <> NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backlink_scorecard_run_to_customer ON public.customers;
CREATE TRIGGER trg_backlink_scorecard_run_to_customer
AFTER INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.backlink_scorecard_run_to_customer();

-- Service-role-only RPC used by the edge function to record email send outcomes.
CREATE OR REPLACE FUNCTION public.admin_record_scorecard_email_result(
  _run_id uuid,
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
  IF _kind = 'follow_up' THEN
    UPDATE public.scorecard_runs
    SET follow_up_email_status = _status,
        follow_up_email_at = CASE WHEN _status = 'sent' THEN now() ELSE follow_up_email_at END,
        follow_up_email_error = _error,
        follow_up_email_recipients = _recipients,
        follow_up_email_attempts = follow_up_email_attempts + 1,
        follow_up_email_from = COALESCE(_from, follow_up_email_from),
        manual_followup_required = (_status IN ('skipped_missing_consent','failed','skipped_missing_config'))
    WHERE id = _run_id;
  ELSIF _kind = 'admin_alert' THEN
    UPDATE public.scorecard_runs
    SET admin_alert_email_status = _status,
        admin_alert_email_at = CASE WHEN _status = 'sent' THEN now() ELSE admin_alert_email_at END,
        admin_alert_email_error = _error,
        admin_alert_email_recipients = _recipients
    WHERE id = _run_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_record_scorecard_email_result(uuid, text, text, text, text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_record_scorecard_email_result(uuid, text, text, text, text[], text) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_record_scorecard_email_result(uuid, text, text, text, text[], text) TO service_role;
