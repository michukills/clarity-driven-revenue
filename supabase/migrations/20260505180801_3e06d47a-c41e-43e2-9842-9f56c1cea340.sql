-- P75 — SOP / Training Bible Creator: client-side authoring

-- 1) Columns
ALTER TABLE public.sop_training_entries
  ADD COLUMN IF NOT EXISTS created_by_role text
    CHECK (created_by_role IN ('admin','client'));
ALTER TABLE public.sop_training_entries
  ADD COLUMN IF NOT EXISTS ready_for_internal_use boolean NOT NULL DEFAULT false;
ALTER TABLE public.sop_training_entries
  ADD COLUMN IF NOT EXISTS ai_assisted boolean NOT NULL DEFAULT false;
ALTER TABLE public.sop_training_entries
  ADD COLUMN IF NOT EXISTS ai_disclosure_acknowledged boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sop_entries_created_by_role
  ON public.sop_training_entries(customer_id, created_by_role);

-- 2) RLS — let clients SELECT their own drafts (in addition to admin-published client_visible rows)
DROP POLICY IF EXISTS "Client read own drafts sop_training_entries" ON public.sop_training_entries;
CREATE POLICY "Client read own drafts sop_training_entries"
  ON public.sop_training_entries FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND created_by_role = 'client'
    AND created_by = auth.uid()
    AND archived_at IS NULL
  );

-- 3) Client upsert RPC. Forces client_visible=false, admin notes untouched, status capped at 'draft' or 'ready_for_review'.
CREATE OR REPLACE FUNCTION public.client_upsert_sop_entry(
  _id uuid,
  _customer_id uuid,
  _title text,
  _purpose text,
  _gear text,
  _category text,
  _role_team text,
  _trigger_when_used text,
  _inputs_tools_needed text,
  _quality_standard text,
  _common_mistakes text,
  _escalation_point text,
  _owner_decision_point text,
  _training_notes text,
  _client_summary text,
  _steps jsonb,
  _ready_for_internal_use boolean,
  _ai_assisted boolean,
  _ai_disclosure_acknowledged boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','private'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owns boolean;
  v_id uuid := _id;
  v_existing record;
  v_status public.sop_status;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  IF _customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id required';
  END IF;
  v_owns := private.user_owns_customer(v_uid, _customer_id);
  IF NOT v_owns THEN
    RAISE EXCEPTION 'not authorized for this customer';
  END IF;
  IF _title IS NULL OR length(btrim(_title)) = 0 THEN
    RAISE EXCEPTION 'title required';
  END IF;

  v_status := CASE WHEN _ready_for_internal_use THEN 'ready_for_review'::public.sop_status
                   ELSE 'draft'::public.sop_status END;

  IF v_id IS NULL THEN
    INSERT INTO public.sop_training_entries (
      customer_id, title, purpose,
      gear, category, role_team,
      trigger_when_used, inputs_tools_needed, quality_standard,
      common_mistakes, escalation_point, owner_decision_point,
      training_notes, client_summary, steps,
      status, client_visible, created_by, created_by_role,
      ready_for_internal_use, ai_assisted, ai_disclosure_acknowledged
    ) VALUES (
      _customer_id, _title, _purpose,
      NULLIF(_gear,'')::public.impl_roadmap_gear, _category, _role_team,
      _trigger_when_used, _inputs_tools_needed, _quality_standard,
      _common_mistakes, _escalation_point, _owner_decision_point,
      _training_notes, _client_summary, COALESCE(_steps, '[]'::jsonb),
      v_status, false, v_uid, 'client',
      COALESCE(_ready_for_internal_use, false),
      COALESCE(_ai_assisted, false),
      COALESCE(_ai_disclosure_acknowledged, false)
    )
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  SELECT * INTO v_existing FROM public.sop_training_entries WHERE id = v_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sop entry not found'; END IF;
  IF v_existing.customer_id <> _customer_id THEN RAISE EXCEPTION 'customer mismatch'; END IF;
  IF v_existing.created_by_role IS DISTINCT FROM 'client' OR v_existing.created_by IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'not authorized for this sop';
  END IF;
  IF v_existing.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'cannot edit an archived sop';
  END IF;

  UPDATE public.sop_training_entries SET
    title = _title,
    purpose = _purpose,
    gear = NULLIF(_gear,'')::public.impl_roadmap_gear,
    category = _category,
    role_team = _role_team,
    trigger_when_used = _trigger_when_used,
    inputs_tools_needed = _inputs_tools_needed,
    quality_standard = _quality_standard,
    common_mistakes = _common_mistakes,
    escalation_point = _escalation_point,
    owner_decision_point = _owner_decision_point,
    training_notes = _training_notes,
    client_summary = _client_summary,
    steps = COALESCE(_steps, '[]'::jsonb),
    status = v_status,
    -- never let client toggle these
    client_visible = false,
    ready_for_internal_use = COALESCE(_ready_for_internal_use, false),
    ai_assisted = COALESCE(_ai_assisted, v_existing.ai_assisted),
    ai_disclosure_acknowledged = COALESCE(_ai_disclosure_acknowledged, v_existing.ai_disclosure_acknowledged)
  WHERE id = v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.client_upsert_sop_entry(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, text, text,
  jsonb, boolean, boolean, boolean
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_upsert_sop_entry(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, text, text,
  jsonb, boolean, boolean, boolean
) TO authenticated;

-- 4) Client delete (soft archive) of own draft
CREATE OR REPLACE FUNCTION public.client_delete_sop_draft(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','private'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  SELECT * INTO v_existing FROM public.sop_training_entries WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sop not found'; END IF;
  IF NOT private.user_owns_customer(v_uid, v_existing.customer_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_existing.created_by_role IS DISTINCT FROM 'client' OR v_existing.created_by IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'not authorized for this sop';
  END IF;
  UPDATE public.sop_training_entries
     SET archived_at = now(), status = 'archived'
   WHERE id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.client_delete_sop_draft(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_delete_sop_draft(uuid) TO authenticated;

-- 5) Client list of own drafts (no admin notes)
CREATE OR REPLACE FUNCTION public.client_list_own_sop_drafts(_customer_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  purpose text,
  gear public.impl_roadmap_gear,
  category text,
  role_team text,
  trigger_when_used text,
  inputs_tools_needed text,
  quality_standard text,
  common_mistakes text,
  escalation_point text,
  owner_decision_point text,
  training_notes text,
  client_summary text,
  steps jsonb,
  status public.sop_status,
  ready_for_internal_use boolean,
  ai_assisted boolean,
  ai_disclosure_acknowledged boolean,
  version integer,
  updated_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public','private'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF _customer_id IS NULL THEN RAISE EXCEPTION 'customer_id required'; END IF;
  IF NOT private.user_owns_customer(v_uid, _customer_id) THEN
    RAISE EXCEPTION 'not authorized for this customer';
  END IF;
  RETURN QUERY
  SELECT s.id, s.title, s.purpose, s.gear, s.category, s.role_team,
         s.trigger_when_used, s.inputs_tools_needed, s.quality_standard,
         s.common_mistakes, s.escalation_point, s.owner_decision_point,
         s.training_notes, s.client_summary, s.steps, s.status,
         s.ready_for_internal_use, s.ai_assisted, s.ai_disclosure_acknowledged,
         s.version, s.updated_at, s.created_at
    FROM public.sop_training_entries s
   WHERE s.customer_id = _customer_id
     AND s.created_by_role = 'client'
     AND s.created_by = v_uid
     AND s.archived_at IS NULL
   ORDER BY s.updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.client_list_own_sop_drafts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_list_own_sop_drafts(uuid) TO authenticated;