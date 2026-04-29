-- P32.2 — Industry assignment lead-stage gate + intake source tracking.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS needs_industry_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS industry_intake_source text,
  ADD COLUMN IF NOT EXISTS industry_intake_value text,
  ADD COLUMN IF NOT EXISTS industry_review_notes text;

COMMENT ON COLUMN public.customers.needs_industry_review IS
  'Admin-flagged: industry assignment is uncertain and needs human review. Industry-specific tools/learning remain restricted while this is true.';
COMMENT ON COLUMN public.customers.industry_intake_value IS
  'Raw industry value selected at intake. NEVER treated as admin-confirmed.';

ALTER TABLE public.scorecard_runs
  ADD COLUMN IF NOT EXISTS industry_intake_value text,
  ADD COLUMN IF NOT EXISTS industry_intake_other text;

COMMENT ON COLUMN public.scorecard_runs.industry_intake_value IS
  'Self-described industry from public intake. Never treated as admin-confirmed.';

-- Lead-stage guard: a customer cannot enter `lead` lifecycle without an
-- industry value OR an explicit needs_industry_review flag. Admins can still
-- flip `needs_industry_review` and proceed.
CREATE OR REPLACE FUNCTION public.enforce_lead_stage_industry_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.lifecycle_state = 'lead'
     AND (OLD.lifecycle_state IS DISTINCT FROM 'lead' OR TG_OP = 'INSERT')
     AND NEW.industry IS NULL
     AND COALESCE(NEW.needs_industry_review, false) = false THEN
    RAISE EXCEPTION 'industry_required_for_lead'
      USING ERRCODE = 'P0001',
            HINT = 'Set customers.industry, or set needs_industry_review=true to flag for explicit admin review.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_customers_lead_stage_industry_guard ON public.customers;
CREATE TRIGGER trg_customers_lead_stage_industry_guard
  BEFORE INSERT OR UPDATE OF lifecycle_state, industry, needs_industry_review
  ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_lead_stage_industry_guard();