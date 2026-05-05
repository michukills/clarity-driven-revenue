
-- P67B: Evidence Vault metadata, review lifecycle, linking, version/history.

CREATE TABLE IF NOT EXISTS public.evidence_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_upload_id uuid REFERENCES public.customer_uploads(id) ON DELETE SET NULL,

  uploaded_by uuid,
  uploaded_by_role text NOT NULL DEFAULT 'client'
    CHECK (uploaded_by_role IN ('client','admin','service')),

  evidence_title text,
  evidence_description text,
  evidence_type text,
  evidence_category text,

  related_gear text,
  related_metric text,
  related_scorecard_run_id uuid REFERENCES public.scorecard_runs(id) ON DELETE SET NULL,
  related_scorecard_item_key text,
  related_report_draft_id uuid REFERENCES public.report_drafts(id) ON DELETE SET NULL,
  related_report_finding_key text,
  related_repair_map_item_id uuid REFERENCES public.implementation_roadmap_items(id) ON DELETE SET NULL,
  related_tool_key text,
  related_submission_ref text,

  evidence_use_context text NOT NULL DEFAULT 'diagnostic',
  evidence_required_status text NOT NULL DEFAULT 'optional'
    CHECK (evidence_required_status IN ('required','recommended','optional')),
  evidence_sufficiency_status text NOT NULL DEFAULT 'provided'
    CHECK (evidence_sufficiency_status IN (
      'not_provided','provided','needs_review','accepted','insufficient',
      'client_clarification_needed','redaction_needed','professional_review_recommended'
    )),
  admin_review_status text NOT NULL DEFAULT 'pending'
    CHECK (admin_review_status IN ('pending','in_review','approved','rejected','needs_clarification')),
  client_visible_status text NOT NULL DEFAULT 'private'
    CHECK (client_visible_status IN ('private','client_visible','client_safe_summary_only')),

  admin_only_note text,
  client_visible_note text,

  is_regulated_industry_sensitive boolean NOT NULL DEFAULT false,
  owner_redaction_confirmed boolean NOT NULL DEFAULT false,
  contains_possible_pii_phi boolean NOT NULL DEFAULT false,
  official_record_warning_acknowledged boolean NOT NULL DEFAULT false,
  admin_only_regulatory_tag text,
  client_self_certification_blocked boolean NOT NULL DEFAULT true,

  include_in_client_report boolean NOT NULL DEFAULT false,

  version_group_id uuid NOT NULL DEFAULT gen_random_uuid(),
  version_number integer NOT NULL DEFAULT 1,
  supersedes_evidence_id uuid REFERENCES public.evidence_records(id) ON DELETE SET NULL,
  is_current_version boolean NOT NULL DEFAULT true,

  reviewed_by uuid,
  reviewed_at timestamp with time zone,

  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_records_customer
  ON public.evidence_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_scorecard
  ON public.evidence_records(related_scorecard_run_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_report
  ON public.evidence_records(related_report_draft_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_repair_map
  ON public.evidence_records(related_repair_map_item_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_version_group
  ON public.evidence_records(version_group_id);

CREATE TRIGGER trg_evidence_records_touch
BEFORE UPDATE ON public.evidence_records
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "Admins manage evidence records"
ON public.evidence_records
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Customers can view their own evidence (admin-only columns are hidden via client-safe view)
CREATE POLICY "Customers view own evidence records"
ON public.evidence_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = evidence_records.customer_id
      AND c.user_id = auth.uid()
  )
);

-- Customers may insert evidence only for their own customer record, and only with safe defaults.
-- They cannot pre-set admin review fields, regulated tags, report-inclusion, or visibility.
CREATE POLICY "Customers insert own evidence records"
ON public.evidence_records
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = evidence_records.customer_id
      AND c.user_id = auth.uid()
  )
  AND uploaded_by_role = 'client'
  AND admin_review_status = 'pending'
  AND client_visible_status = 'private'
  AND admin_only_note IS NULL
  AND admin_only_regulatory_tag IS NULL
  AND include_in_client_report = false
  AND client_self_certification_blocked = true
);

-- Customers may UPDATE only their own redaction-confirmation/version-replacement flags;
-- they cannot change review/admin/visibility/report fields. We restrict via a tight policy that
-- requires those fields to remain unchanged. Postgres RLS cannot diff old/new in WITH CHECK
-- without a trigger, so we provide a defensive trigger below.
CREATE POLICY "Customers update limited fields on own evidence"
ON public.evidence_records
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = evidence_records.customer_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = evidence_records.customer_id
      AND c.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.evidence_records_guard_client_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role / admins bypass. Only restrict authenticated non-admins.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-admin clients cannot change admin/review/regulated/report fields.
  IF NEW.admin_review_status IS DISTINCT FROM OLD.admin_review_status
     OR NEW.admin_only_note IS DISTINCT FROM OLD.admin_only_note
     OR NEW.admin_only_regulatory_tag IS DISTINCT FROM OLD.admin_only_regulatory_tag
     OR NEW.client_visible_status IS DISTINCT FROM OLD.client_visible_status
     OR NEW.include_in_client_report IS DISTINCT FROM OLD.include_in_client_report
     OR NEW.evidence_sufficiency_status IS DISTINCT FROM OLD.evidence_sufficiency_status
     OR NEW.is_current_version IS DISTINCT FROM OLD.is_current_version
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.client_self_certification_blocked = false
     OR NEW.uploaded_by_role IS DISTINCT FROM OLD.uploaded_by_role
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
  THEN
    RAISE EXCEPTION 'evidence_records_admin_only_fields' USING HINT = 'These fields are admin-managed.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evidence_records_guard_client_updates
BEFORE UPDATE ON public.evidence_records
FOR EACH ROW EXECUTE FUNCTION public.evidence_records_guard_client_updates();

-- Client-safe view: hides admin-only fields entirely. Clients query this view.
CREATE OR REPLACE VIEW public.evidence_records_client_safe
WITH (security_invoker = true) AS
SELECT
  id,
  customer_id,
  customer_upload_id,
  evidence_title,
  evidence_description,
  evidence_type,
  evidence_category,
  related_gear,
  related_metric,
  related_tool_key,
  evidence_use_context,
  evidence_sufficiency_status,
  client_visible_status,
  client_visible_note,
  owner_redaction_confirmed,
  include_in_client_report,
  version_group_id,
  version_number,
  is_current_version,
  created_at,
  updated_at
FROM public.evidence_records
WHERE client_visible_status IN ('client_visible','client_safe_summary_only')
   OR uploaded_by_role = 'client';

GRANT SELECT ON public.evidence_records_client_safe TO authenticated;
