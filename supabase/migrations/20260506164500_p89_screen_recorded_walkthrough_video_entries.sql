-- P89 continuation / video integration support.
-- Seeds approved, client-visible, screen-recorded walkthrough videos without
-- changing access control. Client visibility still depends on the existing
-- get_client_tool_walkthrough_videos() RPC and the tool page's ClientToolGuard.

WITH video_seed(tool_key, title, short_description, video_url, transcript, duration_seconds) AS (
  VALUES
    (
      'portal_welcome',
      'Welcome to your RGS portal',
      'A short screen-recorded tour of the client dashboard using a demo account.',
      '/videos/walkthroughs/revenue-growth-systems-welcome-to-your-rgs-portal-walkthrough.mp4',
      'This walkthrough shows the client dashboard, how to read the next visible step, and where tool access appears. It uses demo data and does not expose internal RGS logic.',
      44
    ),
    (
      'owner_diagnostic_interview',
      'How the Owner Diagnostic Interview works',
      'A screen-recorded guide to the structured interview, including Interview Assist and Admin Assist boundaries.',
      '/videos/walkthroughs/revenue-growth-systems-owner-diagnostic-interview-walkthrough.mp4',
      'This walkthrough shows how the owner interview captures plain-language context. Interview Assist means RGS can help capture answers during a call while the client follows along. Admin Assist means RGS can help complete or clean up a form inside the account with permission.',
      50
    ),
    (
      'rgs_stability_scorecard',
      'Using the 0-1000 Business Stability Scorecard',
      'A screen-recorded guide to the scorecard flow and deterministic scoring boundary.',
      '/videos/walkthroughs/revenue-growth-systems-0-1000-business-stability-scorecard-walkthrough.mp4',
      'This walkthrough shows the scorecard flow, what the owner reviews before submitting, and why the public scorecard is a starting signal rather than a promise of results.',
      42
    ),
    (
      'revenue_leak_finder',
      'Using the Revenue Leak Detection Engine',
      'A screen-recorded guide to reading leak signals without treating them as automatic fixes.',
      '/videos/walkthroughs/revenue-growth-systems-revenue-leak-detection-engine-walkthrough.mp4',
      'This walkthrough shows how the Revenue Leak Detection Engine organizes likely leak areas so the owner can review what may need attention next.',
      40
    ),
    (
      'implementation_roadmap',
      'Reading your Implementation Roadmap',
      'A screen-recorded guide to implementation priorities, sequence, and owner review points.',
      '/videos/walkthroughs/revenue-growth-systems-implementation-roadmap-walkthrough.mp4',
      'This walkthrough shows how the roadmap turns diagnostic findings into bounded implementation priorities and next steps.',
      40
    ),
    (
      'priority_action_tracker',
      'Using the Priority Action Tracker',
      'A screen-recorded guide to reviewed priority actions and owner-visible next steps.',
      '/videos/walkthroughs/revenue-growth-systems-priority-action-tracker-walkthrough.mp4',
      'This walkthrough shows how to read current priority actions, due dates, success signals, and status without turning RGS into the operator.',
      39
    ),
    (
      'owner_decision_dashboard',
      'Using the Owner Decision Dashboard',
      'A screen-recorded guide to owner-level decisions inside the RGS Control System.',
      '/videos/walkthroughs/revenue-growth-systems-owner-decision-dashboard-walkthrough.mp4',
      'This walkthrough shows how the owner can review decisions, priority signals, and next review timing while retaining final authority.',
      40
    ),
    (
      'monthly_system_review',
      'Reading the Monthly System Review',
      'A screen-recorded guide to monthly signals and bounded review language.',
      '/videos/walkthroughs/revenue-growth-systems-monthly-system-review-walkthrough.mp4',
      'This walkthrough shows how monthly review summaries keep system movement visible without replacing owner judgment or professional review.',
      38
    ),
    (
      'scorecard_history_tracker',
      'Reading your Scorecard History',
      'A screen-recorded guide to stability trend review over time.',
      '/videos/walkthroughs/revenue-growth-systems-scorecard-history-walkthrough.mp4',
      'This walkthrough shows how to read score movement, trend direction, and what changed since the last reviewed snapshot.',
      37
    ),
    (
      'connector_financial_visibility',
      'Using Financial Visibility',
      'A screen-recorded guide to manual source-of-truth visibility and connector boundaries.',
      '/videos/walkthroughs/revenue-growth-systems-financial-visibility-walkthrough.mp4',
      'This walkthrough shows how financial visibility records help the owner see what sources exist, what may be stale, and what requires review. It is not accounting, tax, payroll, legal, or compliance review.',
      41
    ),
    (
      'rgs_control_system',
      'Using the RGS Control System',
      'A screen-recorded guide to the RGS Control System umbrella.',
      '/videos/walkthroughs/revenue-growth-systems-rgs-control-system-walkthrough.mp4',
      'This walkthrough shows how the RGS Control System keeps visibility, priorities, reviews, and decision support connected without turning RGS into an operator inside the business.',
      41
    )
),
updated AS (
  UPDATE public.tool_walkthrough_videos t
  SET
    title = v.title,
    short_description = v.short_description,
    video_url = v.video_url,
    embed_url = NULL,
    video_status = 'approved',
    transcript = v.transcript,
    captions = NULL,
    caption_format = NULL,
    duration_seconds = v.duration_seconds,
    client_visible = true,
    internal_notes = NULL,
    archived_at = NULL,
    updated_at = now()
  FROM video_seed v
  WHERE t.tool_key = v.tool_key
    AND t.archived_at IS NULL
  RETURNING t.tool_key
)
INSERT INTO public.tool_walkthrough_videos (
  tool_key,
  title,
  short_description,
  video_url,
  embed_url,
  video_status,
  transcript,
  captions,
  caption_format,
  duration_seconds,
  client_visible,
  internal_notes
)
SELECT
  v.tool_key,
  v.title,
  v.short_description,
  v.video_url,
  NULL,
  'approved',
  v.transcript,
  NULL,
  NULL,
  v.duration_seconds,
  true,
  NULL
FROM video_seed v
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tool_walkthrough_videos t
  WHERE t.tool_key = v.tool_key
    AND t.archived_at IS NULL
);
