-- P30: Short-window duplicate-submit protection for public scorecard submissions.

CREATE INDEX IF NOT EXISTS scorecard_runs_email_created_idx
  ON public.scorecard_runs (lower(email), created_at DESC);

CREATE OR REPLACE FUNCTION public.scorecard_runs_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  -- Only rate-limit anonymous/public submissions. Admins are allowed any cadence.
  IF auth.uid() IS NOT NULL AND public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO recent_count
    FROM public.scorecard_runs
   WHERE lower(email) = lower(NEW.email)
     AND created_at > now() - interval '60 seconds';

  IF recent_count > 0 THEN
    RAISE EXCEPTION 'scorecard_rate_limited'
      USING ERRCODE = 'P0001',
            HINT = 'duplicate_submission_window';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scorecard_runs_rate_limit_trg ON public.scorecard_runs;
CREATE TRIGGER scorecard_runs_rate_limit_trg
  BEFORE INSERT ON public.scorecard_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.scorecard_runs_rate_limit();