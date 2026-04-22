
-- 1. Audience enum + column on resources
DO $$ BEGIN
  CREATE TYPE public.tool_audience AS ENUM ('internal', 'diagnostic_client', 'addon_client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS tool_audience public.tool_audience;

-- Backfill: internal visibility → internal audience; everything else → addon_client by default
UPDATE public.resources
   SET tool_audience = CASE
     WHEN visibility = 'internal' THEN 'internal'::public.tool_audience
     ELSE 'addon_client'::public.tool_audience
   END
 WHERE tool_audience IS NULL;

ALTER TABLE public.resources
  ALTER COLUMN tool_audience SET DEFAULT 'internal'::public.tool_audience,
  ALTER COLUMN tool_audience SET NOT NULL;

-- 2. Fix infinite recursion: security-definer helpers that bypass RLS
CREATE OR REPLACE FUNCTION public.resource_visibility_for(_resource_id uuid)
RETURNS public.resource_visibility
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT visibility FROM public.resources WHERE id = _resource_id
$$;

CREATE OR REPLACE FUNCTION public.user_owns_customer(_user_id uuid, _customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.customers WHERE id = _customer_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.user_has_resource_assignment(_user_id uuid, _resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resource_assignments ra
    JOIN public.customers c ON c.id = ra.customer_id
    WHERE ra.resource_id = _resource_id
      AND c.user_id = _user_id
      AND COALESCE(ra.visibility_override, (SELECT r.visibility FROM public.resources r WHERE r.id = _resource_id)) <> 'internal'::public.resource_visibility
  )
$$;

-- Drop and recreate the recursive policies
DROP POLICY IF EXISTS "Customers view own assignments" ON public.resource_assignments;
DROP POLICY IF EXISTS "Customers view assigned resources" ON public.resources;

CREATE POLICY "Customers view own assignments"
ON public.resource_assignments
FOR SELECT
USING (
  public.user_owns_customer(auth.uid(), customer_id)
  AND COALESCE(visibility_override, public.resource_visibility_for(resource_id)) <> 'internal'::public.resource_visibility
);

CREATE POLICY "Customers view assigned resources"
ON public.resources
FOR SELECT
USING (public.user_has_resource_assignment(auth.uid(), id));
