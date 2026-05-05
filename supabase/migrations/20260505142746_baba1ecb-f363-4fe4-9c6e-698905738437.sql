-- P68B — Client-safe Repair Map evidence RPC.
-- Returns approved, client-visible evidence linked to repair-map (implementation_roadmap_items) items
-- for a given customer. Strips admin-only fields, regulated tags, file paths, and anything not
-- explicitly client-safe. Reuses existing evidence_records.related_repair_map_item_id link.

CREATE OR REPLACE FUNCTION public.get_client_repair_map_evidence(_customer_id uuid)
RETURNS TABLE (
  evidence_id uuid,
  repair_map_item_id uuid,
  evidence_title text,
  related_gear text,
  evidence_sufficiency_status text,
  client_visible_note text,
  reviewed_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_owns boolean;
BEGIN
  IF _customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id required';
  END IF;
  v_is_admin := private.is_admin(v_uid);
  v_owns := private.user_owns_customer(v_uid, _customer_id);
  IF NOT v_is_admin AND NOT v_owns THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT e.id,
         e.related_repair_map_item_id,
         e.evidence_title,
         e.related_gear,
         e.evidence_sufficiency_status,
         e.client_visible_note,
         e.reviewed_at
    FROM public.evidence_records e
   WHERE e.customer_id = _customer_id
     AND e.related_repair_map_item_id IS NOT NULL
     AND e.is_current_version = true
     AND e.include_in_client_report = true
     AND e.client_visible_status IN ('client_visible','client_safe_summary_only')
     AND e.admin_review_status = 'approved'
   ORDER BY e.reviewed_at DESC NULLS LAST, e.created_at DESC;
END;
$$;

-- Admin-side: list ALL evidence for a customer (admin only). Used by the
-- per-repair-item evidence picker so admins can attach/detach evidence with
-- full review-status visibility.
CREATE OR REPLACE FUNCTION public.admin_list_customer_evidence_for_repair_picker(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  evidence_title text,
  related_gear text,
  related_metric text,
  evidence_sufficiency_status text,
  admin_review_status text,
  client_visible_status text,
  include_in_client_report boolean,
  is_regulated_industry_sensitive boolean,
  contains_possible_pii_phi boolean,
  admin_only_regulatory_tag text,
  related_repair_map_item_id uuid,
  is_current_version boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT private.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id required';
  END IF;
  RETURN QUERY
  SELECT e.id, e.evidence_title, e.related_gear, e.related_metric,
         e.evidence_sufficiency_status, e.admin_review_status,
         e.client_visible_status, e.include_in_client_report,
         e.is_regulated_industry_sensitive, e.contains_possible_pii_phi,
         e.admin_only_regulatory_tag, e.related_repair_map_item_id,
         e.is_current_version, e.created_at, e.updated_at
    FROM public.evidence_records e
   WHERE e.customer_id = _customer_id
     AND e.is_current_version = true
   ORDER BY e.updated_at DESC;
END;
$$;