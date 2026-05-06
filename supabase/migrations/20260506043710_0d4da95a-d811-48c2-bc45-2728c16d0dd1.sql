
ALTER TABLE public.diagnostic_intake_answers
  ADD COLUMN IF NOT EXISTS entered_by text NOT NULL DEFAULT 'client'
    CHECK (entered_by IN ('client','admin')),
  ADD COLUMN IF NOT EXISTS admin_user_id uuid,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'client_written'
    CHECK (source_type IN ('client_written','client_verbal','interview','uploaded_evidence','admin_observation','imported_data','ai_assisted_draft')),
  ADD COLUMN IF NOT EXISTS evidence_status text NOT NULL DEFAULT 'owner_claimed'
    CHECK (evidence_status IN ('verified','partial','owner_claimed','missing','needs_followup')),
  ADD COLUMN IF NOT EXISTS client_confirmation_status text NOT NULL DEFAULT 'not_required'
    CHECK (client_confirmation_status IN ('not_required','needs_client_confirmation','confirmed_by_client','disputed_by_client')),
  ADD COLUMN IF NOT EXISTS last_edited_by uuid,
  ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS admin_clarification_note text,
  ADD COLUMN IF NOT EXISTS client_clarification_note text,
  ADD COLUMN IF NOT EXISTS interview_session_id uuid;

CREATE OR REPLACE FUNCTION public.diagnostic_intake_answers_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NOT public.is_admin(auth.uid()) THEN
    IF NEW.entered_by IS DISTINCT FROM OLD.entered_by
       OR NEW.admin_user_id IS DISTINCT FROM OLD.admin_user_id
       OR NEW.source_type IS DISTINCT FROM OLD.source_type
       OR NEW.evidence_status IS DISTINCT FROM OLD.evidence_status
       OR NEW.client_visible IS DISTINCT FROM OLD.client_visible
       OR NEW.admin_clarification_note IS DISTINCT FROM OLD.admin_clarification_note
       OR NEW.interview_session_id IS DISTINCT FROM OLD.interview_session_id THEN
      RAISE EXCEPTION 'Clients cannot modify admin attribution fields';
    END IF;
    IF OLD.entered_by = 'admin' THEN
      IF NEW.answer IS DISTINCT FROM OLD.answer THEN
        RAISE EXCEPTION 'Clients cannot overwrite admin-entered answers; use clarification note';
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'INSERT' AND NOT public.is_admin(auth.uid()) THEN
    IF NEW.entered_by IS DISTINCT FROM 'client'
       OR NEW.admin_user_id IS NOT NULL
       OR NEW.source_type NOT IN ('client_written','client_verbal') THEN
      RAISE EXCEPTION 'Clients cannot insert admin-attributed answers';
    END IF;
  END IF;
  NEW.last_edited_by := COALESCE(auth.uid(), NEW.last_edited_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS diagnostic_intake_answers_guard_trg ON public.diagnostic_intake_answers;
CREATE TRIGGER diagnostic_intake_answers_guard_trg
  BEFORE INSERT OR UPDATE ON public.diagnostic_intake_answers
  FOR EACH ROW EXECUTE FUNCTION public.diagnostic_intake_answers_guard();

CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  started_by uuid NOT NULL,
  mode text NOT NULL DEFAULT 'interview' CHECK (mode IN ('interview','assist')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','cancelled')),
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_customer ON public.interview_sessions(customer_id);
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage interview_sessions" ON public.interview_sessions;
CREATE POLICY "Admins manage interview_sessions"
  ON public.interview_sessions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients read own interview_sessions" ON public.interview_sessions;
CREATE POLICY "Clients read own interview_sessions"
  ON public.interview_sessions FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

CREATE TABLE IF NOT EXISTS public.admin_assist_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  section_key text,
  interview_session_id uuid,
  admin_user_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_assist_notes_customer ON public.admin_assist_notes(customer_id);
ALTER TABLE public.admin_assist_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage admin_assist_notes" ON public.admin_assist_notes;
CREATE POLICY "Admins manage admin_assist_notes"
  ON public.admin_assist_notes FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.interview_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  interview_session_id uuid,
  actor_id uuid,
  actor_role text NOT NULL CHECK (actor_role IN ('admin','client','system')),
  event_type text NOT NULL,
  section_key text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interview_audit_customer ON public.interview_audit_log(customer_id);
ALTER TABLE public.interview_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read interview_audit_log" ON public.interview_audit_log;
CREATE POLICY "Admins read interview_audit_log"
  ON public.interview_audit_log FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins insert interview_audit_log" ON public.interview_audit_log;
CREATE POLICY "Admins insert interview_audit_log"
  ON public.interview_audit_log FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients insert own audit (confirm/dispute)" ON public.interview_audit_log;
CREATE POLICY "Clients insert own audit (confirm/dispute)"
  ON public.interview_audit_log FOR INSERT
  WITH CHECK (
    customer_id IS NOT NULL
    AND public.user_owns_customer(auth.uid(), customer_id)
    AND actor_role = 'client'
    AND event_type IN ('client_confirmed_answer','client_disputed_answer','client_clarification_added')
  );

DROP TRIGGER IF EXISTS interview_sessions_set_updated_at ON public.interview_sessions;
CREATE TRIGGER interview_sessions_set_updated_at
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS admin_assist_notes_set_updated_at ON public.admin_assist_notes;
CREATE TRIGGER admin_assist_notes_set_updated_at
  BEFORE UPDATE ON public.admin_assist_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
