
-- 1. Move the Implementation Roadmap assignee onto Implementation Tracker, then drop Roadmap.
INSERT INTO public.resource_assignments (customer_id, resource_id, assignment_source, visibility_override, internal_notes)
SELECT ra.customer_id,
       '3e135ad0-4955-4352-a498-bb2f72908970'::uuid,
       ra.assignment_source,
       ra.visibility_override,
       ra.internal_notes
FROM public.resource_assignments ra
WHERE ra.resource_id = '51ed5485-8439-418b-a58b-7ac7b07b64bd'
ON CONFLICT (customer_id, resource_id) DO NOTHING;

DELETE FROM public.resource_assignments WHERE resource_id = '51ed5485-8439-418b-a58b-7ac7b07b64bd';
DELETE FROM public.resources WHERE id = '51ed5485-8439-418b-a58b-7ac7b07b64bd';

-- 2. Promote Revenue Tracker to an internal RGS tool.
DELETE FROM public.resource_assignments WHERE resource_id = '1fdc548d-6769-46b0-a874-8eb631d8c384';

UPDATE public.resources
SET title = 'Revenue Tracker',
    description = COALESCE(NULLIF(description, ''), 'Internal RGS view of a client''s revenue entries — collected, pending, overdue, recurring, and concentration. Opens the Revenue Tracker tab inside that client''s Business Control Center.'),
    tool_audience = 'internal',
    visibility = 'internal',
    category = 'diagnostic_templates',
    url = '/admin/business-control-center/revenue-tracker'
WHERE id = '1fdc548d-6769-46b0-a874-8eb631d8c384';
