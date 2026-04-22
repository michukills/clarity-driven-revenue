
CREATE TABLE IF NOT EXISTS public.diagnostic_intake_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  section_key text NOT NULL,
  answer text,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, section_key)
);

CREATE INDEX IF NOT EXISTS diagnostic_intake_answers_customer_idx
  ON public.diagnostic_intake_answers (customer_id);

ALTER TABLE public.diagnostic_intake_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage all on diagnostic_intake_answers" ON public.diagnostic_intake_answers;
CREATE POLICY "Admins manage all on diagnostic_intake_answers"
  ON public.diagnostic_intake_answers
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients view own on diagnostic_intake_answers" ON public.diagnostic_intake_answers;
CREATE POLICY "Clients view own on diagnostic_intake_answers"
  ON public.diagnostic_intake_answers
  FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

DROP POLICY IF EXISTS "Clients insert own on diagnostic_intake_answers" ON public.diagnostic_intake_answers;
CREATE POLICY "Clients insert own on diagnostic_intake_answers"
  ON public.diagnostic_intake_answers
  FOR INSERT
  WITH CHECK (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

DROP POLICY IF EXISTS "Clients update own on diagnostic_intake_answers" ON public.diagnostic_intake_answers;
CREATE POLICY "Clients update own on diagnostic_intake_answers"
  ON public.diagnostic_intake_answers
  FOR UPDATE
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id))
  WITH CHECK (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

DROP POLICY IF EXISTS "Clients delete own on diagnostic_intake_answers" ON public.diagnostic_intake_answers;
CREATE POLICY "Clients delete own on diagnostic_intake_answers"
  ON public.diagnostic_intake_answers
  FOR DELETE
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

DROP TRIGGER IF EXISTS diagnostic_intake_answers_touch ON public.diagnostic_intake_answers;
CREATE TRIGGER diagnostic_intake_answers_touch
  BEFORE UPDATE ON public.diagnostic_intake_answers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
