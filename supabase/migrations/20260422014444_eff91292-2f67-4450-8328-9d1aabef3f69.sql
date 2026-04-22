-- 1) Allow customers to create / update / delete THEIR OWN tool_runs.
-- Existing policy "Customers view own tool runs" already covers SELECT.

CREATE POLICY "Customers insert own tool runs"
ON public.tool_runs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = tool_runs.customer_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Customers update own tool runs"
ON public.tool_runs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = tool_runs.customer_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = tool_runs.customer_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Customers delete own tool runs"
ON public.tool_runs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = tool_runs.customer_id AND c.user_id = auth.uid()
  )
);

-- 2) Seed resources for the 5 client-facing internal tool routes so admins can
--    assign them and clients see real entries in My Tools that route into the
--    in-app tool pages (instead of external Google Doc placeholders).
INSERT INTO public.resources (title, description, category, resource_type, visibility, tool_audience, tool_category, url, downloadable)
VALUES
  ('Stability Self-Assessment', 'Rate your business across the 5 RGS pillars to spot the weakest foundations.', 'client_scorecard_sheets', 'link', 'client_editable', 'diagnostic_client', 'diagnostic', '/portal/tools/self-assessment', false),
  ('Implementation Tracker', 'Track your in-flight implementation tasks, owners, and status.', 'client_implementation_trackers', 'link', 'client_editable', 'addon_client', 'implementation', '/portal/tools/implementation-tracker', false),
  ('Weekly Reflection', 'A short structured weekly check-in shared with your RGS team.', 'shared_implementation_tools', 'link', 'client_editable', 'addon_client', 'implementation', '/portal/tools/weekly-reflection', false),
  ('Revenue & Risk Monitor', 'Live read on revenue stability and risk signals based on your latest benchmark.', 'client_revenue_worksheets', 'link', 'customer', 'addon_client', 'addon', '/portal/tools/revenue-risk-monitor', false),
  ('Revenue Leak Detection (Client View)', 'Simplified view of your latest revenue leak benchmark from the RGS team.', 'client_revenue_worksheets', 'link', 'customer', 'diagnostic_client', 'diagnostic', '/portal/tools/revenue-leak-engine', false)
ON CONFLICT DO NOTHING;