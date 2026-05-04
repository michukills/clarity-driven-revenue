-- Implementation Completion add-on: source link + dedupe guards
ALTER TABLE public.implementation_roadmap_items
  ADD COLUMN IF NOT EXISTS source_priority_action_item_id uuid
    REFERENCES public.priority_action_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_impl_roadmap_items_source_pat
  ON public.implementation_roadmap_items(source_priority_action_item_id);

-- Per-roadmap dedupe: don't seed the same priority action twice into one roadmap
CREATE UNIQUE INDEX IF NOT EXISTS uniq_impl_roadmap_items_pat_source
  ON public.implementation_roadmap_items(roadmap_id, source_priority_action_item_id)
  WHERE source_priority_action_item_id IS NOT NULL AND archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_impl_roadmap_items_repair_source
  ON public.implementation_roadmap_items(roadmap_id, source_repair_map_item_id)
  WHERE source_repair_map_item_id IS NOT NULL AND archived_at IS NULL;

-- Tracker dedupe: one active tracker entry per (customer, tool_key)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tool_training_tracker_active
  ON public.tool_training_tracker_entries(customer_id, tool_key)
  WHERE archived_at IS NULL;