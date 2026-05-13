-- Live funnel hardening: public Scorecard insert must always become an
-- admin-visible lead/customer even if the browser cannot read the inserted
-- row back through RLS or the follow-up edge function is delayed.
--
-- Email delivery remains in scorecard-followup. This trigger only links or
-- creates the safe admin lead record from confirmed public scorecard fields.

CREATE OR REPLACE FUNCTION public.ensure_scorecard_run_customer_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean_email text;
  _customer_id uuid;
  _full_name text;
BEGIN
  _clean_email := lower(trim(coalesce(NEW.email, '')));
  IF _clean_email = '' THEN
    RETURN NEW;
  END IF;

  -- Prevent duplicate customer creation if two scorecard submissions from
  -- the same normalized email land at nearly the same time.
  PERFORM pg_advisory_xact_lock(hashtext(_clean_email)::bigint);

  IF NEW.linked_customer_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO _customer_id
  FROM public.customers
  WHERE lower(email) = _clean_email
  ORDER BY created_at DESC
  LIMIT 1;

  IF _customer_id IS NULL THEN
    _full_name := nullif(trim(
      concat_ws(' ', nullif(trim(coalesce(NEW.first_name, '')), ''), nullif(trim(coalesce(NEW.last_name, '')), ''))
    ), '');

    INSERT INTO public.customers (
      email,
      full_name,
      business_name,
      phone,
      service_type,
      stage,
      lifecycle_state,
      linked_scorecard_run_id,
      industry_intake_source,
      industry_intake_value,
      needs_industry_review,
      industry_confirmed_by_admin,
      industry_review_notes
    )
    VALUES (
      _clean_email,
      coalesce(_full_name, _clean_email),
      nullif(trim(coalesce(NEW.business_name, '')), ''),
      nullif(trim(coalesce(NEW.phone, '')), ''),
      nullif(trim(coalesce(NEW.role, '')), ''),
      'lead',
      'lead',
      NEW.id,
      'public_scorecard',
      NEW.industry_intake_value,
      true,
      false,
      'Created from public scorecard submission. Review before confirming industry, payment, portal access, or delivery scope.'
    )
    RETURNING id INTO _customer_id;
  ELSE
    UPDATE public.customers
    SET linked_scorecard_run_id = coalesce(linked_scorecard_run_id, NEW.id),
        industry_intake_source = coalesce(industry_intake_source, 'public_scorecard'),
        needs_industry_review = true,
        industry_review_notes = coalesce(
          industry_review_notes,
          'Matched from public scorecard submission. Review before confirming industry, payment, portal access, or delivery scope.'
        )
    WHERE id = _customer_id;
  END IF;

  IF _customer_id IS NOT NULL THEN
    UPDATE public.scorecard_runs
    SET linked_customer_id = _customer_id
    WHERE id = NEW.id
      AND linked_customer_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scorecard_run_customer_lead ON public.scorecard_runs;
CREATE TRIGGER trg_scorecard_run_customer_lead
AFTER INSERT ON public.scorecard_runs
FOR EACH ROW
EXECUTE FUNCTION public.ensure_scorecard_run_customer_lead();

REVOKE ALL ON FUNCTION public.ensure_scorecard_run_customer_lead() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_scorecard_run_customer_lead() TO service_role;
