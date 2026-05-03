
-- P47: Implementation Roadmap Tool

-- Status enums
DO $$ BEGIN
  CREATE TYPE public.impl_roadmap_status AS ENUM ('draft','ready_for_client','active','paused','complete','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.impl_roadmap_item_status AS ENUM ('draft','not_started','in_progress','waiting_on_client','waiting_on_rgs','blocked','complete','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.impl_roadmap_phase AS ENUM ('stabilize','install','train','handoff','ongoing_visibility');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.impl_roadmap_gear AS ENUM ('demand_generation','revenue_conversion','operational_efficiency','financial_visibility','owner_independence');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.impl_roadmap_owner AS ENUM ('rgs','client','shared');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Roadmap container
CREATE TABLE IF NOT EXISTS public.implementation_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  source_report_id uuid,
  title text NOT NULL,
  summary text,
  status public.impl_roadmap_status NOT NULL DEFAULT 'draft',
  client_visible boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_impl_roadmaps_customer ON public.implementation_roadmaps(customer_id);

ALTER TABLE public.implementation_roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage implementation_roadmaps" ON public.implementation_roadmaps;
CREATE POLICY "Admin manage implementation_roadmaps"
  ON public.implementation_roadmaps FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible implementation_roadmap" ON public.implementation_roadmaps;
CREATE POLICY "Client read own visible implementation_roadmap"
  ON public.implementation_roadmaps FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND archived_at IS NULL
  );

DROP TRIGGER IF EXISTS trg_impl_roadmaps_touch ON public.implementation_roadmaps;
CREATE TRIGGER trg_impl_roadmaps_touch
  BEFORE UPDATE ON public.implementation_roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Roadmap items
CREATE TABLE IF NOT EXISTS public.implementation_roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES public.implementation_roadmaps(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  source_repair_map_item_id uuid,
  source_finding_id uuid,
  gear public.impl_roadmap_gear,
  title text NOT NULL,
  description text,
  client_summary text,
  internal_notes text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  impact text NOT NULL DEFAULT 'medium' CHECK (impact IN ('low','medium','high')),
  effort text NOT NULL DEFAULT 'medium' CHECK (effort IN ('low','medium','high')),
  dependency text NOT NULL DEFAULT 'none' CHECK (dependency IN ('none','has_dependencies','blocks_other_work')),
  phase public.impl_roadmap_phase NOT NULL DEFAULT 'install',
  owner_type public.impl_roadmap_owner NOT NULL DEFAULT 'shared',
  status public.impl_roadmap_item_status NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  deliverable text,
  success_indicator text,
  client_visible boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_impl_roadmap_items_roadmap ON public.implementation_roadmap_items(roadmap_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_impl_roadmap_items_customer ON public.implementation_roadmap_items(customer_id);

ALTER TABLE public.implementation_roadmap_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage implementation_roadmap_items" ON public.implementation_roadmap_items;
CREATE POLICY "Admin manage implementation_roadmap_items"
  ON public.implementation_roadmap_items FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Client read own visible roadmap items" ON public.implementation_roadmap_items;
CREATE POLICY "Client read own visible roadmap items"
  ON public.implementation_roadmap_items FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND archived_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.implementation_roadmaps r
       WHERE r.id = roadmap_id
         AND r.client_visible = true
         AND r.archived_at IS NULL
    )
  );

DROP TRIGGER IF EXISTS trg_impl_roadmap_items_touch ON public.implementation_roadmap_items;
CREATE TRIGGER trg_impl_roadmap_items_touch
  BEFORE UPDATE ON public.implementation_roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client-safe RPC. Returns only client-safe columns, never internal_notes.
CREATE OR REPLACE FUNCTION public.get_client_implementation_roadmap(_customer_id uuid)
RETURNS TABLE (
  roadmap_id uuid,
  title text,
  summary text,
  status public.impl_roadmap_status,
  updated_at timestamptz,
  item_id uuid,
  gear public.impl_roadmap_gear,
  item_title text,
  client_summary text,
  priority text,
  phase public.impl_roadmap_phase,
  owner_type public.impl_roadmap_owner,
  item_status public.impl_roadmap_item_status,
  sort_order integer,
  deliverable text,
  success_indicator text
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
  SELECT r.id, r.title, r.summary, r.status, r.updated_at,
         i.id, i.gear, i.title, i.client_summary, i.priority, i.phase,
         i.owner_type, i.status, i.sort_order, i.deliverable, i.success_indicator
  FROM public.implementation_roadmaps r
  LEFT JOIN public.implementation_roadmap_items i
    ON i.roadmap_id = r.id
   AND i.client_visible = true
   AND i.archived_at IS NULL
  WHERE r.customer_id = _customer_id
    AND r.client_visible = true
    AND r.archived_at IS NULL
  ORDER BY i.sort_order NULLS LAST, i.created_at NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_implementation_roadmap(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_implementation_roadmap(uuid) TO authenticated;

-- Register tool in catalog
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client
) VALUES (
  'implementation_roadmap',
  'Implementation Roadmap',
  'Bounded implementation plan turning diagnostic findings into a sequenced repair plan with clear ownership, deliverables, and next steps.',
  'implementation',
  'client_available',
  'active',
  '/portal/tools/implementation-roadmap',
  'list-checks',
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
      requires_active_client = EXCLUDED.requires_active_client;
