-- P14 follow-up — clamp public diagnostic interview inserts.
--
-- Public/anonymous submitters may provide lead/contact fields and raw answers.
-- All derived/admin JSONB fields are reset by trigger and blocked by policy so
-- anonymous callers cannot smuggle admin_brief, maps, status, notes, or AI state.

CREATE OR REPLACE FUNCTION public.diagnostic_interview_public_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    NEW.customer_id := NULL;
    NEW.scorecard_run_id := NULL;
    NEW.status := 'new';
    NEW.ai_status := 'not_run';
    NEW.admin_notes := NULL;
    NEW.evidence_map := '[]'::jsonb;
    NEW.system_dependency_map := '[]'::jsonb;
    NEW.validation_checklist := '[]'::jsonb;
    NEW.admin_brief := '{}'::jsonb;
    NEW.missing_information := '[]'::jsonb;
    NEW.confidence := 'low';

    IF auth.uid() IS NULL THEN
      NEW.submitted_by := NULL;
      IF NEW.source NOT IN ('anonymous', 'scorecard') THEN
        NEW.source := 'anonymous';
      END IF;
    ELSE
      NEW.submitted_by := auth.uid();
      NEW.source := 'client';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.diagnostic_interview_public_insert_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.diagnostic_interview_public_insert_guard() FROM anon;
REVOKE ALL ON FUNCTION public.diagnostic_interview_public_insert_guard() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.diagnostic_interview_public_insert_guard() TO service_role;

DROP TRIGGER IF EXISTS diagnostic_interview_public_insert_guard_trg
  ON public.diagnostic_interview_runs;

CREATE TRIGGER diagnostic_interview_public_insert_guard_trg
  BEFORE INSERT ON public.diagnostic_interview_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.diagnostic_interview_public_insert_guard();

ALTER TABLE public.diagnostic_interview_runs
  DROP CONSTRAINT IF EXISTS diagnostic_answers_object_shape,
  DROP CONSTRAINT IF EXISTS diagnostic_answers_size_limit;

ALTER TABLE public.diagnostic_interview_runs
  ADD CONSTRAINT diagnostic_answers_object_shape
    CHECK (jsonb_typeof(answers) = 'object') NOT VALID,
  ADD CONSTRAINT diagnostic_answers_size_limit
    CHECK (octet_length(answers::text) <= 50000) NOT VALID;

DROP POLICY IF EXISTS "Public submit diagnostic interview"
  ON public.diagnostic_interview_runs;

CREATE POLICY "Public submit diagnostic interview"
  ON public.diagnostic_interview_runs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      (auth.uid() IS NULL AND lead_email IS NOT NULL AND char_length(lead_email) >= 5)
      OR
      (auth.uid() IS NOT NULL AND submitted_by = auth.uid())
    )
    AND customer_id IS NULL
    AND scorecard_run_id IS NULL
    AND status = 'new'
    AND ai_status = 'not_run'
    AND admin_notes IS NULL
    AND evidence_map = '[]'::jsonb
    AND system_dependency_map = '[]'::jsonb
    AND validation_checklist = '[]'::jsonb
    AND admin_brief = '{}'::jsonb
    AND missing_information = '[]'::jsonb
    AND confidence = 'low'
    AND jsonb_typeof(answers) = 'object'
    AND octet_length(answers::text) <= 50000
  );

REVOKE UPDATE ON public.diagnostic_interview_runs FROM anon;
REVOKE UPDATE ON public.diagnostic_interview_runs FROM authenticated;
