-- P70 — Reality Check Flags™ + Contradiction Detection
-- Deterministic, admin-reviewed contradiction/evidence-gap workflow.

CREATE TABLE IF NOT EXISTS public.reality_check_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  title text NOT NULL,
  summary text,

  affected_gear text,                  -- demand_generation | revenue_conversion | operational_efficiency | financial_visibility | owner_independence | regulated
  affected_metric text,

  flag_type text NOT NULL DEFAULT 'owner_claim_unsupported'
    CHECK (flag_type IN (
      'owner_claim_unsupported','owner_claim_contradicted',
      'evidence_missing','evidence_stale',
      'metric_contradiction','score_contradiction',
      'regulated_claim_unsupported','financial_visibility_gap',
      'owner_independence_gap','source_of_truth_missing',
      'report_claim_needs_support'
    )),
  severity text NOT NULL DEFAULT 'watch'
    CHECK (severity IN ('watch','warning','critical')),
  status text NOT NULL DEFAULT 'detected'
    CHECK (status IN ('detected','admin_review','client_visible','dismissed','resolved')),

  detected_source text,                -- 'deterministic_rule' | 'admin_manual' | 'evidence_review' | 'connector_matrix'
  owner_claim text,
  evidence_gap text,
  contradicting_metric text,

  linked_scorecard_item_id uuid,
  linked_scorecard_run_id uuid REFERENCES public.scorecard_runs(id) ON DELETE SET NULL,
  linked_tool_submission_id uuid,
  linked_evidence_record_id uuid REFERENCES public.evidence_records(id) ON DELETE SET NULL,
  linked_repair_map_item_id uuid REFERENCES public.implementation_roadmap_items(id) ON DELETE SET NULL,
  linked_report_draft_id uuid REFERENCES public.report_drafts(id) ON DELETE SET NULL,
  linked_connector_provider text,

  admin_only_note text,
  client_visible_explanation text,

  professional_review_recommended boolean NOT NULL DEFAULT false,
  regulated_industry_sensitive boolean NOT NULL DEFAULT false,
  client_visible boolean NOT NULL DEFAULT false,
  approved_for_client boolean NOT NULL DEFAULT false,
  include_in_report boolean NOT NULL DEFAULT false,

  dismissed_reason text,
  resolved_at timestamp with time zone,

  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,

  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reality_check_flags_customer
  ON public.reality_check_flags(customer_id);
CREATE INDEX IF NOT EXISTS idx_reality_check_flags_repair_map
  ON public.reality_check_flags(linked_repair_map_item_id);
CREATE INDEX IF NOT EXISTS idx_reality_check_flags_evidence
  ON public.reality_check_flags(linked_evidence_record_id);
CREATE INDEX IF NOT EXISTS idx_reality_check_flags_status
  ON public.reality_check_flags(customer_id, status);

CREATE TRIGGER trg_reality_check_flags_touch
BEFORE UPDATE ON public.reality_check_flags
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.reality_check_flags ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "Admins manage reality check flags"
ON public.reality_check_flags
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Clients can read only approved client-visible flags for their own customer
CREATE POLICY "Customers view own approved client-visible flags"
ON public.reality_check_flags
FOR SELECT
USING (
  approved_for_client = true
  AND client_visible = true
  AND status NOT IN ('dismissed','detected','admin_review')
  AND EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = reality_check_flags.customer_id
      AND c.user_id = auth.uid()
  )
);

-- Client-safe RPC: returns only approved + client-visible flags, no admin notes.
CREATE OR REPLACE FUNCTION public.get_client_reality_check_flags(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  client_visible_explanation text,
  affected_gear text,
  severity text,
  status text,
  professional_review_recommended boolean,
  linked_repair_map_item_id uuid,
  reviewed_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id, f.title, f.client_visible_explanation, f.affected_gear, f.severity, f.status,
    f.professional_review_recommended, f.linked_repair_map_item_id, f.reviewed_at
  FROM public.reality_check_flags f
  WHERE f.customer_id = _customer_id
    AND f.approved_for_client = true
    AND f.client_visible = true
    AND f.status IN ('client_visible','resolved')
    AND (
      public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.id = _customer_id AND c.user_id = auth.uid()
      )
    );
$$;

-- Admin-only RPC for the report builder: returns approved client-visible flags marked for inclusion.
CREATE OR REPLACE FUNCTION public.admin_list_report_reality_check_flags(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  client_visible_explanation text,
  affected_gear text,
  severity text,
  professional_review_recommended boolean,
  linked_repair_map_item_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id, f.title, f.client_visible_explanation, f.affected_gear, f.severity,
    f.professional_review_recommended, f.linked_repair_map_item_id
  FROM public.reality_check_flags f
  WHERE f.customer_id = _customer_id
    AND f.approved_for_client = true
    AND f.client_visible = true
    AND f.include_in_report = true
    AND f.status IN ('client_visible','resolved')
    AND public.is_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_client_reality_check_flags(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_reality_check_flags(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_list_report_reality_check_flags(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_report_reality_check_flags(uuid) TO authenticated;