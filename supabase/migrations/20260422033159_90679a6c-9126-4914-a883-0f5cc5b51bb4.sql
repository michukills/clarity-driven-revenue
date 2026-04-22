
-- Tighten auto-assign trigger so it never assigns internal-audience tools to clients,
-- and so it includes addon tools when the customer is in an addon/implementation stage.
CREATE OR REPLACE FUNCTION public.auto_assign_tools_on_stage_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cats public.tool_category[];
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.stage IS DISTINCT FROM NEW.stage) THEN
    cats := public.tool_categories_for_stage(NEW.stage);

    IF array_length(cats, 1) IS NOT NULL THEN
      INSERT INTO public.resource_assignments (customer_id, resource_id, assignment_source)
      SELECT NEW.id, r.id, 'stage'::public.assignment_source
      FROM public.resources r
      WHERE r.tool_category = ANY(cats)
        AND r.tool_audience <> 'internal'::public.tool_audience
      ON CONFLICT (customer_id, resource_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill: assign every existing customer the client-facing tools their current stage warrants.
INSERT INTO public.resource_assignments (customer_id, resource_id, assignment_source)
SELECT c.id, r.id, 'stage'::public.assignment_source
FROM public.customers c
CROSS JOIN public.resources r
WHERE r.tool_audience <> 'internal'::public.tool_audience
  AND r.tool_category = ANY(public.tool_categories_for_stage(c.stage))
ON CONFLICT (customer_id, resource_id) DO NOTHING;
