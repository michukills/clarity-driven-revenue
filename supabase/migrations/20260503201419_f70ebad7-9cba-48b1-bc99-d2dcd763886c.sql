
-- P48: SOP / Training Bible Creator

DO $$ BEGIN
  CREATE TYPE public.sop_status AS ENUM ('draft','ready_for_review','client_visible','active','needs_update','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sop_review_state AS ENUM ('not_reviewed','admin_reviewed','client_reviewed','needs_revision');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.sop_training_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  implementation_roadmap_id uuid REFERENCES public.implementation_roadmaps(id) ON DELETE SET NULL,
  implementation_roadmap_item_id uuid REFERENCES public.implementation_roadmap_items(id) ON DELETE SET NULL,
  title text NOT NULL,
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
  internal_notes text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.sop_status NOT NULL DEFAULT 'draft',
  review_state public.sop_review_state NOT NULL DEFAULT 'not_reviewed',
  version integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  client_visible boolean NOT NULL DEFAULT false,
  last_reviewed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_sop_entries_customer ON public.sop_training_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_sop_entries_roadmap_item ON public.sop_training_entries(implementation_roadmap_item_id);

ALTER TABLE public.sop_training_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage sop_training_entries" ON public.sop_training_entries;
CREATE POLICY "Admin manage sop_training_entries"
  ON public.sop_training_entries FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible sop_training_entries" ON public.sop_training_entries;
CREATE POLICY "Client read own visible sop_training_entries"
  ON public.sop_training_entries FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND archived_at IS NULL
    AND status <> 'draft'
  );

DROP TRIGGER IF EXISTS trg_sop_entries_touch ON public.sop_training_entries;
CREATE TRIGGER trg_sop_entries_touch
  BEFORE UPDATE ON public.sop_training_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC. Never returns internal_notes.
CREATE OR REPLACE FUNCTION public.get_client_sop_training_bible(_customer_id uuid)
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
  version integer,
  sort_order integer,
  updated_at timestamptz,
  implementation_roadmap_item_id uuid
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public','private'
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
  SELECT s.id, s.title, s.purpose, s.gear, s.category, s.role_team,
         s.trigger_when_used, s.inputs_tools_needed, s.quality_standard,
         s.common_mistakes, s.escalation_point, s.owner_decision_point,
         s.training_notes, s.client_summary, s.steps, s.status, s.version,
         s.sort_order, s.updated_at, s.implementation_roadmap_item_id
  FROM public.sop_training_entries s
  WHERE s.customer_id = _customer_id
    AND s.client_visible = true
    AND s.archived_at IS NULL
    AND s.status <> 'draft'
  ORDER BY s.category NULLS LAST, s.sort_order ASC, s.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_sop_training_bible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_sop_training_bible(uuid) TO authenticated;

-- Register tool
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client
) VALUES (
  'sop_training_bible',
  'SOP / Training Bible Creator',
  'Turn approved processes, roles, and roadmap items into clear, repeatable step-by-step operating instructions and training notes.',
  'implementation',
  'client_available',
  'active',
  '/portal/tools/sop-training-bible',
  'book-open',
  false,
  true
)
ON CONFLICT (tool_key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      route_path = EXCLUDED.route_path,
      tool_type = EXCLUDED.tool_type,
      default_visibility = EXCLUDED.default_visibility,
      status = EXCLUDED.status,
      icon_key = EXCLUDED.icon_key,
      requires_active_client = EXCLUDED.requires_active_client;
