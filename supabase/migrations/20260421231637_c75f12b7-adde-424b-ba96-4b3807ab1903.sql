-- 1. Extend visibility enum with a third state
ALTER TYPE public.resource_visibility ADD VALUE IF NOT EXISTS 'client_editable';

-- Note: Postgres requires enum value commit before use in default/check, but our existing
-- 'internal' and 'customer' values remain. We treat 'customer' as "Client Visible (read-only)"
-- and 'client_editable' as "Client Editable" going forward.

-- 2. Per-assignment visibility override + internal notes for the assignment
ALTER TABLE public.resource_assignments
  ADD COLUMN IF NOT EXISTS visibility_override public.resource_visibility,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- 3. Tool run notes — split into internal vs client visible
ALTER TABLE public.tool_runs
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS client_notes text;

-- 4. Tighten the customer-visibility RLS on resources:
--    Clients should NEVER see any resource whose effective visibility is 'internal',
--    even if (mistakenly) assigned. Admins are unaffected.
DROP POLICY IF EXISTS "Customers view assigned resources" ON public.resources;
CREATE POLICY "Customers view assigned resources"
ON public.resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.resource_assignments ra
    JOIN public.customers c ON c.id = ra.customer_id
    WHERE ra.resource_id = resources.id
      AND c.user_id = auth.uid()
      AND COALESCE(ra.visibility_override, resources.visibility) <> 'internal'
  )
);

-- 5. Mirror the same protection on resource_assignments — clients shouldn't see
--    assignment rows that point to internal-only resources.
DROP POLICY IF EXISTS "Customers view own assignments" ON public.resource_assignments;
CREATE POLICY "Customers view own assignments"
ON public.resource_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = resource_assignments.customer_id
      AND c.user_id = auth.uid()
  )
  AND COALESCE(visibility_override, (
    SELECT visibility FROM public.resources WHERE id = resource_assignments.resource_id
  )) <> 'internal'
);

-- 6. Tighten tool_runs SELECT for customers — only when the run is tied to them
--    (existing policy already does this; we're not loosening it).
--    Clients still see internal_notes column data via SELECT, so we hide them via a view.
CREATE OR REPLACE VIEW public.tool_runs_client
WITH (security_invoker = on) AS
SELECT
  id,
  tool_key,
  customer_id,
  title,
  data,
  summary,
  client_notes,
  created_at,
  updated_at
FROM public.tool_runs;

COMMENT ON VIEW public.tool_runs_client IS
  'Client-safe view of tool_runs — excludes internal_notes. Use this in the client portal.';