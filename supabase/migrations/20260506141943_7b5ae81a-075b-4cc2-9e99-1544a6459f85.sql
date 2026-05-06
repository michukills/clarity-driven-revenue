
-- =========================================================
-- P86 — Evidence Decay, Email Consent Gate, Labor Burden,
-- Pulse Check, Owner Intervention, External Risk, AI HITL
-- =========================================================

-- ---------- A. email_communication_consents ----------
CREATE TABLE IF NOT EXISTS public.email_communication_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  consent_status TEXT NOT NULL CHECK (consent_status IN ('active','revoked','missing','unknown')),
  consent_source TEXT NOT NULL CHECK (consent_source IN ('signup','checkout','portal_onboarding','admin_invite','manual_admin','preference_center','other')),
  consent_text TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consented_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  unsubscribe_status TEXT NOT NULL DEFAULT 'subscribed' CHECK (unsubscribe_status IN ('subscribed','unsubscribed','bounced','complained','unknown')),
  preference_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_consent_email ON public.email_communication_consents(lower(email));
CREATE INDEX IF NOT EXISTS idx_email_consent_user ON public.email_communication_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_email_consent_customer ON public.email_communication_consents(customer_id);
ALTER TABLE public.email_communication_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage email consents" ON public.email_communication_consents;
CREATE POLICY "Admins manage email consents" ON public.email_communication_consents
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own email consent" ON public.email_communication_consents;
CREATE POLICY "Users read own email consent" ON public.email_communication_consents
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = email_communication_consents.customer_id AND c.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users update own email consent" ON public.email_communication_consents;
CREATE POLICY "Users update own email consent" ON public.email_communication_consents
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = email_communication_consents.customer_id AND c.user_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.touch_email_consent_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_email_consent_updated_at ON public.email_communication_consents;
CREATE TRIGGER trg_email_consent_updated_at BEFORE UPDATE ON public.email_communication_consents
  FOR EACH ROW EXECUTE FUNCTION public.touch_email_consent_updated_at();

-- ---------- B. email_notification_attempts ----------
CREATE TABLE IF NOT EXISTS public.email_notification_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NULL,
  user_id UUID NULL,
  email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  related_record_type TEXT NULL,
  related_record_id UUID NULL,
  consent_checked BOOLEAN NOT NULL DEFAULT false,
  consent_status_at_send TEXT NULL,
  send_status TEXT NOT NULL CHECK (send_status IN ('sent','blocked_missing_consent','blocked_revoked_consent','blocked_no_email_backend','admin_tracked_only','failed')),
  email_backend TEXT NULL,
  provider_message_id TEXT NULL,
  failure_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_attempt_customer ON public.email_notification_attempts(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_attempt_user ON public.email_notification_attempts(user_id);
ALTER TABLE public.email_notification_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage email attempts" ON public.email_notification_attempts;
CREATE POLICY "Admins manage email attempts" ON public.email_notification_attempts
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own email attempts" ON public.email_notification_attempts;
CREATE POLICY "Users read own email attempts" ON public.email_notification_attempts
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = email_notification_attempts.customer_id AND c.user_id = auth.uid())
    )
  );

-- ---------- C. evidence_decay_records ----------
CREATE TABLE IF NOT EXISTS public.evidence_decay_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  evidence_id UUID NULL,
  source_table TEXT NULL,
  source_record_id UUID NULL,
  gear_key TEXT NOT NULL,
  evidence_category TEXT NOT NULL,
  evidence_label TEXT NOT NULL,
  review_state TEXT NOT NULL CHECK (review_state IN ('missing','pending_review','partial','approved','rejected','not_applicable')),
  verified_at TIMESTAMPTZ NULL,
  ttl_days INTEGER NULL,
  expires_at TIMESTAMPTZ NULL,
  decay_state TEXT NOT NULL CHECK (decay_state IN ('current','expiring_soon','expired','missing','pending_review','partial','rejected','not_applicable')),
  days_until_expiry INTEGER NULL,
  client_visible BOOLEAN NOT NULL DEFAULT false,
  approved_for_client BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT NULL,
  client_safe_message TEXT NULL,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_edr_customer ON public.evidence_decay_records(customer_id);
ALTER TABLE public.evidence_decay_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage evidence decay" ON public.evidence_decay_records;
CREATE POLICY "Admins manage evidence decay" ON public.evidence_decay_records
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_edr_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_edr_updated_at ON public.evidence_decay_records;
CREATE TRIGGER trg_edr_updated_at BEFORE UPDATE ON public.evidence_decay_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_edr_updated_at();

CREATE OR REPLACE FUNCTION public.get_client_evidence_decay(_customer_id UUID)
RETURNS TABLE (
  id UUID, gear_key TEXT, evidence_category TEXT, evidence_label TEXT,
  review_state TEXT, decay_state TEXT, expires_at TIMESTAMPTZ,
  days_until_expiry INTEGER, client_safe_message TEXT, updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.gear_key, r.evidence_category, r.evidence_label,
         r.review_state, r.decay_state, r.expires_at,
         r.days_until_expiry, r.client_safe_message, r.updated_at
  FROM public.evidence_decay_records r
  WHERE r.customer_id = _customer_id
    AND r.approved_for_client = true
    AND r.client_visible = true
    AND (public.is_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = r.customer_id AND c.user_id = auth.uid()))
  ORDER BY r.expires_at NULLS LAST, r.updated_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_client_evidence_decay(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_client_evidence_decay(UUID) TO authenticated;

-- ---------- D. evidence_expiration_reminders ----------
CREATE TABLE IF NOT EXISTS public.evidence_expiration_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  evidence_decay_record_id UUID NULL REFERENCES public.evidence_decay_records(id) ON DELETE SET NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('expiring_soon','expired','refresh_requested')),
  due_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','snoozed','completed','cancelled')),
  email_consent_checked BOOLEAN NOT NULL DEFAULT false,
  email_consent_status TEXT NULL,
  email_attempt_id UUID NULL REFERENCES public.email_notification_attempts(id) ON DELETE SET NULL,
  email_status TEXT NOT NULL DEFAULT 'admin_tracked_only' CHECK (email_status IN ('sent','blocked_missing_consent','blocked_revoked_consent','blocked_no_email_backend','admin_tracked_only','failed')),
  admin_notes TEXT NULL,
  client_safe_message TEXT NULL,
  client_visible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  completed_by UUID NULL
);
CREATE INDEX IF NOT EXISTS idx_eer_customer ON public.evidence_expiration_reminders(customer_id);
ALTER TABLE public.evidence_expiration_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage expiration reminders" ON public.evidence_expiration_reminders;
CREATE POLICY "Admins manage expiration reminders" ON public.evidence_expiration_reminders
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------- E. labor_burden_calculations ----------
CREATE TABLE IF NOT EXISTS public.labor_burden_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  industry_key TEXT NOT NULL,
  total_field_payroll_hours NUMERIC NOT NULL,
  total_billable_hours NUMERIC NOT NULL,
  has_payroll_evidence BOOLEAN NOT NULL DEFAULT false,
  payroll_evidence_label TEXT NULL,
  field_ops_evidence_label TEXT NULL,
  paid_to_billable_gap_pct NUMERIC NULL,
  status TEXT NOT NULL CHECK (status IN ('current','high_risk','missing','invalid_input','needs_admin_review')),
  scoring_impact_gear TEXT NOT NULL DEFAULT 'operational_efficiency',
  scoring_impact_points INTEGER NOT NULL DEFAULT 0,
  client_visible BOOLEAN NOT NULL DEFAULT false,
  approved_for_client BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT NULL,
  client_safe_explanation TEXT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lbc_customer ON public.labor_burden_calculations(customer_id);
ALTER TABLE public.labor_burden_calculations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage labor burden" ON public.labor_burden_calculations;
CREATE POLICY "Admins manage labor burden" ON public.labor_burden_calculations
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_lbc_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_lbc_updated_at ON public.labor_burden_calculations;
CREATE TRIGGER trg_lbc_updated_at BEFORE UPDATE ON public.labor_burden_calculations
  FOR EACH ROW EXECUTE FUNCTION public.touch_lbc_updated_at();

CREATE OR REPLACE FUNCTION public.get_client_labor_burden(_customer_id UUID)
RETURNS TABLE (
  id UUID, industry_key TEXT, status TEXT, paid_to_billable_gap_pct NUMERIC,
  scoring_impact_gear TEXT, scoring_impact_points INTEGER,
  client_safe_explanation TEXT, updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.industry_key, r.status, r.paid_to_billable_gap_pct,
         r.scoring_impact_gear, r.scoring_impact_points,
         r.client_safe_explanation, r.updated_at
  FROM public.labor_burden_calculations r
  WHERE r.customer_id = _customer_id
    AND r.approved_for_client = true
    AND r.client_visible = true
    AND (public.is_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = r.customer_id AND c.user_id = auth.uid()))
  ORDER BY r.updated_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_client_labor_burden(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_client_labor_burden(UUID) TO authenticated;

-- ---------- F. rgs_pulse_check_runs ----------
CREATE TABLE IF NOT EXISTS public.rgs_pulse_check_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_label TEXT NOT NULL DEFAULT 'RGS Pulse Check',
  scheduled_for TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  completed_by UUID NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','missed','cancelled')),
  checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rgs_pulse_check_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage pulse check" ON public.rgs_pulse_check_runs;
CREATE POLICY "Admins manage pulse check" ON public.rgs_pulse_check_runs
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_pulse_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_pulse_updated_at ON public.rgs_pulse_check_runs;
CREATE TRIGGER trg_pulse_updated_at BEFORE UPDATE ON public.rgs_pulse_check_runs
  FOR EACH ROW EXECUTE FUNCTION public.touch_pulse_updated_at();

-- ---------- G. owner_intervention_log ----------
CREATE TABLE IF NOT EXISTS public.owner_intervention_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  intervention_type TEXT NOT NULL,
  intervention_date TIMESTAMPTZ NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  repeated_pattern_flag BOOLEAN NOT NULL DEFAULT false,
  triggers_owner_independence_risk BOOLEAN NOT NULL DEFAULT false,
  related_workflow TEXT NULL,
  admin_notes TEXT NULL,
  client_safe_summary TEXT NULL,
  client_visible BOOLEAN NOT NULL DEFAULT false,
  approved_for_client BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oil_customer ON public.owner_intervention_log(customer_id);
ALTER TABLE public.owner_intervention_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage owner interventions" ON public.owner_intervention_log;
CREATE POLICY "Admins manage owner interventions" ON public.owner_intervention_log
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_oil_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_oil_updated_at ON public.owner_intervention_log;
CREATE TRIGGER trg_oil_updated_at BEFORE UPDATE ON public.owner_intervention_log
  FOR EACH ROW EXECUTE FUNCTION public.touch_oil_updated_at();

CREATE OR REPLACE FUNCTION public.get_client_owner_interventions(_customer_id UUID)
RETURNS TABLE (
  id UUID, intervention_type TEXT, intervention_date TIMESTAMPTZ, severity TEXT,
  related_workflow TEXT, client_safe_summary TEXT, created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.intervention_type, r.intervention_date, r.severity,
         r.related_workflow, r.client_safe_summary, r.created_at
  FROM public.owner_intervention_log r
  WHERE r.customer_id = _customer_id
    AND r.approved_for_client = true
    AND r.client_visible = true
    AND (public.is_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = r.customer_id AND c.user_id = auth.uid()))
  ORDER BY r.intervention_date DESC;
$$;
REVOKE ALL ON FUNCTION public.get_client_owner_interventions(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_client_owner_interventions(UUID) TO authenticated;

-- ---------- H. external_risk_triggers ----------
CREATE TABLE IF NOT EXISTS public.external_risk_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  trigger_type TEXT NOT NULL,
  affected_gear TEXT NOT NULL,
  source_note TEXT NOT NULL,
  source_url TEXT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','severe','critical')),
  marks_needs_reinspection BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed','resolved')),
  client_safe_summary TEXT NULL,
  client_visible BOOLEAN NOT NULL DEFAULT false,
  approved_for_client BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL
);
CREATE INDEX IF NOT EXISTS idx_ert_customer ON public.external_risk_triggers(customer_id);
ALTER TABLE public.external_risk_triggers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage external risk triggers" ON public.external_risk_triggers;
CREATE POLICY "Admins manage external risk triggers" ON public.external_risk_triggers
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_client_external_risks(_customer_id UUID)
RETURNS TABLE (
  id UUID, trigger_type TEXT, affected_gear TEXT, severity TEXT, status TEXT,
  client_safe_summary TEXT, created_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.trigger_type, r.affected_gear, r.severity, r.status,
         r.client_safe_summary, r.created_at, r.resolved_at
  FROM public.external_risk_triggers r
  WHERE r.customer_id = _customer_id
    AND r.approved_for_client = true
    AND r.client_visible = true
    AND (public.is_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = r.customer_id AND c.user_id = auth.uid()))
  ORDER BY r.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_client_external_risks(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_client_external_risks(UUID) TO authenticated;

-- ---------- I. ai_hitl_audit_log ----------
CREATE TABLE IF NOT EXISTS public.ai_hitl_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  evidence_id UUID NULL,
  source_table TEXT NULL,
  source_record_id UUID NULL,
  ai_task_type TEXT NOT NULL CHECK (ai_task_type IN ('summarize','interpret','classify','draft','other')),
  ai_assistance_used BOOLEAN NOT NULL DEFAULT true,
  raw_document_cross_checked BOOLEAN NOT NULL DEFAULT false,
  confirmation_text TEXT NULL,
  may_mark_verified BOOLEAN NOT NULL DEFAULT false,
  admin_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hitl_customer ON public.ai_hitl_audit_log(customer_id);
ALTER TABLE public.ai_hitl_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage hitl audit" ON public.ai_hitl_audit_log;
CREATE POLICY "Admins manage hitl audit" ON public.ai_hitl_audit_log
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- DB-level guard: prevent may_mark_verified=true unless cross-check + exact phrase
CREATE OR REPLACE FUNCTION public.enforce_hitl_gate()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ai_assistance_used = true AND NEW.may_mark_verified = true THEN
    IF NEW.raw_document_cross_checked IS DISTINCT FROM true
       OR COALESCE(btrim(NEW.confirmation_text), '') <> 'I have cross-referenced the AI summary with the raw PDF.' THEN
      RAISE EXCEPTION 'AI HITL gate: may_mark_verified requires raw_document_cross_checked=true and exact confirmation_text';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_enforce_hitl_gate ON public.ai_hitl_audit_log;
CREATE TRIGGER trg_enforce_hitl_gate BEFORE INSERT OR UPDATE ON public.ai_hitl_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hitl_gate();
