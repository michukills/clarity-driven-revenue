
ALTER TABLE public.customer_tasks ADD COLUMN IF NOT EXISTS target_gear smallint NULL;
ALTER TABLE public.checklist_items ADD COLUMN IF NOT EXISTS target_gear smallint NULL;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS target_gear smallint NULL;
ALTER TABLE public.resource_assignments ADD COLUMN IF NOT EXISTS target_gear smallint NULL;
ALTER TABLE public.customer_insight_memory ADD COLUMN IF NOT EXISTS target_gear smallint NULL;

ALTER TABLE public.customer_tasks DROP CONSTRAINT IF EXISTS customer_tasks_target_gear_chk;
ALTER TABLE public.customer_tasks ADD CONSTRAINT customer_tasks_target_gear_chk CHECK (target_gear IS NULL OR target_gear BETWEEN 1 AND 5);
ALTER TABLE public.checklist_items DROP CONSTRAINT IF EXISTS checklist_items_target_gear_chk;
ALTER TABLE public.checklist_items ADD CONSTRAINT checklist_items_target_gear_chk CHECK (target_gear IS NULL OR target_gear BETWEEN 1 AND 5);
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_target_gear_chk;
ALTER TABLE public.resources ADD CONSTRAINT resources_target_gear_chk CHECK (target_gear IS NULL OR target_gear BETWEEN 1 AND 5);
ALTER TABLE public.resource_assignments DROP CONSTRAINT IF EXISTS resource_assignments_target_gear_chk;
ALTER TABLE public.resource_assignments ADD CONSTRAINT resource_assignments_target_gear_chk CHECK (target_gear IS NULL OR target_gear BETWEEN 1 AND 5);
ALTER TABLE public.customer_insight_memory DROP CONSTRAINT IF EXISTS customer_insight_memory_target_gear_chk;
ALTER TABLE public.customer_insight_memory ADD CONSTRAINT customer_insight_memory_target_gear_chk CHECK (target_gear IS NULL OR target_gear BETWEEN 1 AND 5);

CREATE INDEX IF NOT EXISTS idx_customer_tasks_target_gear ON public.customer_tasks(target_gear) WHERE target_gear IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_target_gear ON public.resources(target_gear) WHERE target_gear IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resource_assignments_target_gear ON public.resource_assignments(target_gear) WHERE target_gear IS NOT NULL;
