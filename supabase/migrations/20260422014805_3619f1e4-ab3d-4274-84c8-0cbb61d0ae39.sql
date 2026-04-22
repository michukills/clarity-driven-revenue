
-- Redirect placeholder Google Sheets URLs to internal RGS OS routes
UPDATE public.resources SET url = '/admin/tools/persona-builder', resource_type = 'link'
  WHERE title = 'Buyer Persona Tool';
UPDATE public.resources SET url = '/admin/tools/journey-mapper', resource_type = 'link'
  WHERE title = 'Customer Journey Mapper';
UPDATE public.resources SET url = '/admin/tools/process-breakdown', resource_type = 'link'
  WHERE title = 'Process Breakdown Tool';
UPDATE public.resources SET url = '/admin/tools/revenue-leak-finder', resource_type = 'link'
  WHERE title = 'Revenue Leak Finder';
UPDATE public.resources SET url = '/admin/tools/stability-scorecard', resource_type = 'link'
  WHERE title = 'RGS Stability Scorecard';

-- Client-facing add-on tools that had placeholder sheets: clear url so empty state shows
UPDATE public.resources SET url = NULL
  WHERE title IN ('Implementation Roadmap', 'Onboarding Worksheet', 'Revenue Tracker (Client)')
    AND url LIKE '%placeholder%';
