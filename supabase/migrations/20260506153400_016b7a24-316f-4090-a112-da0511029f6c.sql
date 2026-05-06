
-- =========================================================
-- P87 — Evidence Vault Labeled Slots + Diagnostic Timeline
-- =========================================================

-- ---------- A. evidence_vault_slots ----------
CREATE TABLE IF NOT EXISTS public.evidence_vault_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL CHECK (slot_key IN (
    'financial_reality','sales_proof','operational_dna','pricing_strategy','time_audit'
  )),
  status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN (
    'missing','pending_review','verified','partial','rejected','expired','expiring_soon','not_applicable'
  )),
  customer_upload_id UUID NULL,
  evidence_record_id UUID NULL,
  evidence_decay_record_id UUID NULL REFERENCES public.evidence_decay_records(id) ON DELETE SET NULL,
  client_safe_message TEXT NULL,
  admin_only_note TEXT NULL,
  not_applicable_reason TEXT NULL,
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMPTZ NULL,
  ai_assistance_used BOOLEAN NOT NULL DEFAULT false,
  ai_hitl_audit_id UUID NULL REFERENCES public.ai_hitl_audit_log(id) ON DELETE SET NULL,
  source_conflict_flag_id UUID NULL,
  ttl_category TEXT NULL,
  ttl_days INTEGER NULL,
  scoring_effect_pending BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, slot_key)
);

CREATE INDEX IF NOT EXISTS idx_evs_customer ON public.evidence_vault_slots(customer_id);
CREATE INDEX IF NOT EXISTS idx_evs_status ON public.evidence_vault_slots(status);

ALTER TABLE public.evidence_vault_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage evidence vault slots" ON public.evidence_vault_slots;
CREATE POLICY "Admins manage evidence vault slots" ON public.evidence_vault_slots
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Customers may insert their own slot row, but only with status='pending_review'
DROP POLICY IF EXISTS "Customers insert own slot upload" ON public.evidence_vault_slots;
CREATE POLICY "Customers insert own slot upload" ON public.evidence_vault_slots
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'pending_review'
    AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  );

-- Customers may update only their own row to status='pending_review' (re-upload)
DROP POLICY IF EXISTS "Customers update own slot upload" ON public.evidence_vault_slots;
CREATE POLICY "Customers update own slot upload" ON public.evidence_vault_slots
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    status = 'pending_review'
    AND admin_only_note IS NULL
    AND reviewed_by IS NULL
    AND ai_assistance_used = false
  );

-- Touch updated_at
CREATE OR REPLACE FUNCTION public.touch_evidence_vault_slots_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_evs_updated_at ON public.evidence_vault_slots;
CREATE TRIGGER trg_evs_updated_at BEFORE UPDATE ON public.evidence_vault_slots
  FOR EACH ROW EXECUTE FUNCTION public.touch_evidence_vault_slots_updated_at();

-- HITL gate trigger for evidence_vault_slots
CREATE OR REPLACE FUNCTION public.enforce_evs_hitl_gate()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  audit_ok BOOLEAN := false;
BEGIN
  IF NEW.status = 'verified' AND NEW.ai_assistance_used = true THEN
    IF NEW.ai_hitl_audit_id IS NULL THEN
      RAISE EXCEPTION 'AI-assisted slot cannot be marked verified without an ai_hitl_audit_log row';
    END IF;
    SELECT may_mark_verified INTO audit_ok FROM public.ai_hitl_audit_log WHERE id = NEW.ai_hitl_audit_id;
    IF audit_ok IS NOT TRUE THEN
      RAISE EXCEPTION 'AI HITL audit gate not satisfied (raw doc cross-check + confirmation text required)';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_evs_hitl_gate ON public.evidence_vault_slots;
CREATE TRIGGER trg_evs_hitl_gate BEFORE INSERT OR UPDATE ON public.evidence_vault_slots
  FOR EACH ROW EXECUTE FUNCTION public.enforce_evs_hitl_gate();

-- Client-safe RPC for slots
CREATE OR REPLACE FUNCTION public.get_client_evidence_vault_slots(_customer_id UUID)
RETURNS TABLE (
  slot_key TEXT,
  status TEXT,
  client_safe_message TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.slot_key, s.status, s.client_safe_message, s.updated_at
  FROM public.evidence_vault_slots s
  JOIN public.customers c ON c.id = s.customer_id
  WHERE s.customer_id = _customer_id
    AND (public.is_admin(auth.uid()) OR c.user_id = auth.uid())
  ORDER BY s.slot_key;
$$;
GRANT EXECUTE ON FUNCTION public.get_client_evidence_vault_slots(UUID) TO authenticated;

-- ---------- B. diagnostic_timeline_stages ----------
CREATE TABLE IF NOT EXISTS public.diagnostic_timeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL CHECK (stage_key IN (
    'systems_interview','evidence_vault_opens','evidence_reminder',
    'evidence_window_closes','rgs_review','report_walkthrough'
  )),
  status TEXT NOT NULL DEFAULT 'not_scheduled' CHECK (status IN (
    'not_scheduled','scheduled','sent','overdue','completed','snoozed','extended'
  )),
  scheduled_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  snoozed_until TIMESTAMPTZ NULL,
  extended_until TIMESTAMPTZ NULL,
  extension_reason TEXT NULL,
  admin_only_note TEXT NULL,
  reviewed_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, stage_key)
);

CREATE INDEX IF NOT EXISTS idx_dts_customer ON public.diagnostic_timeline_stages(customer_id);

ALTER TABLE public.diagnostic_timeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage diagnostic timeline stages" ON public.diagnostic_timeline_stages;
CREATE POLICY "Admins manage diagnostic timeline stages" ON public.diagnostic_timeline_stages
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Customers can SELECT only via RPC; no direct read policy.

CREATE OR REPLACE FUNCTION public.touch_dts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_dts_updated_at ON public.diagnostic_timeline_stages;
CREATE TRIGGER trg_dts_updated_at BEFORE UPDATE ON public.diagnostic_timeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.touch_dts_updated_at();

-- Client-safe RPC for timeline
CREATE OR REPLACE FUNCTION public.get_client_diagnostic_timeline(_customer_id UUID)
RETURNS TABLE (
  stage_key TEXT,
  status TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  extended_until TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.stage_key, s.status, s.scheduled_at, s.completed_at, s.extended_until
  FROM public.diagnostic_timeline_stages s
  JOIN public.customers c ON c.id = s.customer_id
  WHERE s.customer_id = _customer_id
    AND (public.is_admin(auth.uid()) OR c.user_id = auth.uid())
  ORDER BY
    CASE s.stage_key
      WHEN 'systems_interview' THEN 1
      WHEN 'evidence_vault_opens' THEN 2
      WHEN 'evidence_reminder' THEN 3
      WHEN 'evidence_window_closes' THEN 4
      WHEN 'rgs_review' THEN 5
      WHEN 'report_walkthrough' THEN 6
      ELSE 99
    END;
$$;
GRANT EXECUTE ON FUNCTION public.get_client_diagnostic_timeline(UUID) TO authenticated;
