
DROP POLICY IF EXISTS "anyone may submit a diagnostic intake" ON public.diagnostic_intakes;

CREATE POLICY "Public may submit a diagnostic intake"
  ON public.diagnostic_intakes
  FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (
      fit_status = 'pending'::diagnostic_intake_fit
      AND intake_status = 'submitted'::diagnostic_intake_status
      AND admin_notes IS NULL
      AND reviewed_by IS NULL
      AND reviewed_at IS NULL
      AND customer_id IS NULL
    )
  );

CREATE OR REPLACE FUNCTION public.diagnostic_intakes_public_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    NEW.fit_status := 'pending'::diagnostic_intake_fit;
    NEW.intake_status := 'submitted'::diagnostic_intake_status;
    NEW.admin_notes := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.customer_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS diagnostic_intakes_public_insert_guard_trg ON public.diagnostic_intakes;
CREATE TRIGGER diagnostic_intakes_public_insert_guard_trg
  BEFORE INSERT ON public.diagnostic_intakes
  FOR EACH ROW EXECUTE FUNCTION public.diagnostic_intakes_public_insert_guard();

CREATE OR REPLACE FUNCTION public.checklist_items_client_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.target_gear IS DISTINCT FROM OLD.target_gear
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Clients may only update completion status on checklist items';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS checklist_items_client_update_guard_trg ON public.checklist_items;
CREATE TRIGGER checklist_items_client_update_guard_trg
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.checklist_items_client_update_guard();

DROP POLICY IF EXISTS "Clients insert own on diagnostic_intake_answers"
  ON public.diagnostic_intake_answers;

CREATE POLICY "Clients insert own on diagnostic_intake_answers"
  ON public.diagnostic_intake_answers
  FOR INSERT
  WITH CHECK (
    customer_id IS NOT NULL
    AND public.user_owns_customer(auth.uid(), customer_id)
    AND entered_by = 'client'
    AND admin_user_id IS NULL
    AND admin_clarification_note IS NULL
    AND source_type IN ('client_written','client_verbal')
    AND evidence_status IN ('owner_claimed','missing','needs_followup')
    AND client_confirmation_status IN ('not_required','confirmed_by_client','disputed_by_client')
    AND interview_session_id IS NULL
  );
