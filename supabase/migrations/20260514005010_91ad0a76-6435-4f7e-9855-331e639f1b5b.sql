CREATE TABLE IF NOT EXISTS public.scorecard_email_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_run_id uuid NOT NULL REFERENCES public.scorecard_runs(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  email text NOT NULL,
  attempt_type text NOT NULL CHECK (attempt_type IN ('automatic','manual_resend')),
  status text NOT NULL CHECK (status IN (
    'pending','sent','failed',
    'skipped_missing_consent','skipped_missing_config',
    'skipped_invalid_email','skipped_provider_error',
    'skipped_recently_sent'
  )),
  safe_failure_reason text,
  provider_message_id text,
  email_from text,
  triggered_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS scorecard_email_attempts_run_idx
  ON public.scorecard_email_attempts(scorecard_run_id, created_at DESC);

ALTER TABLE public.scorecard_email_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read scorecard email attempts" ON public.scorecard_email_attempts;
CREATE POLICY "Admins read scorecard email attempts"
  ON public.scorecard_email_attempts
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_log_scorecard_email_attempt(
  _run_id uuid,
  _customer_id uuid,
  _email text,
  _attempt_type text,
  _status text,
  _safe_failure_reason text,
  _provider_message_id text,
  _email_from text,
  _triggered_by uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.scorecard_email_attempts (
    scorecard_run_id, customer_id, email, attempt_type, status,
    safe_failure_reason, provider_message_id, email_from,
    triggered_by_user_id, sent_at
  ) VALUES (
    _run_id, _customer_id, _email, _attempt_type, _status,
    NULLIF(LEFT(_safe_failure_reason, 500), ''),
    NULLIF(LEFT(_provider_message_id, 200), ''),
    NULLIF(LEFT(_email_from, 200), ''),
    _triggered_by,
    CASE WHEN _status = 'sent' THEN now() ELSE NULL END
  )
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_log_scorecard_email_attempt(uuid,uuid,text,text,text,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_log_scorecard_email_attempt(uuid,uuid,text,text,text,text,text,text,uuid) TO service_role;