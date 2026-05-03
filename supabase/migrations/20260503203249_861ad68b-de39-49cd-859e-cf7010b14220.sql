-- P48.2: Tool Catalog Lane / Phase / Industry classification metadata
-- Non-breaking: all new columns are nullable / have safe defaults.
-- No access control, RLS, route, or RPC behavior changes.

ALTER TABLE public.tool_catalog
  ADD COLUMN IF NOT EXISTS service_lane text,
  ADD COLUMN IF NOT EXISTS customer_journey_phase text,
  ADD COLUMN IF NOT EXISTS industry_behavior text,
  ADD COLUMN IF NOT EXISTS contains_internal_notes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_be_client_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lane_sort_order integer,
  ADD COLUMN IF NOT EXISTS phase_sort_order integer;

-- Soft check constraints (nullable allowed for legacy rows)
ALTER TABLE public.tool_catalog
  DROP CONSTRAINT IF EXISTS tool_catalog_service_lane_chk;
ALTER TABLE public.tool_catalog
  ADD CONSTRAINT tool_catalog_service_lane_chk
  CHECK (service_lane IS NULL OR service_lane IN (
    'diagnostic','implementation','rgs_control_system','revenue_control_system',
    'admin_only','shared_support','report_only','public_pre_client'
  ));

ALTER TABLE public.tool_catalog
  DROP CONSTRAINT IF EXISTS tool_catalog_journey_phase_chk;
ALTER TABLE public.tool_catalog
  ADD CONSTRAINT tool_catalog_journey_phase_chk
  CHECK (customer_journey_phase IS NULL OR customer_journey_phase IN (
    'public_pre_client','paid_diagnostic','owner_interview','diagnostic_tools',
    'admin_review','report_repair_map','implementation_planning',
    'implementation_execution','training_handoff','rcs_ongoing_visibility',
    'renewal_health_monitoring','internal_admin_operations'
  ));

ALTER TABLE public.tool_catalog
  DROP CONSTRAINT IF EXISTS tool_catalog_industry_behavior_chk;
ALTER TABLE public.tool_catalog
  ADD CONSTRAINT tool_catalog_industry_behavior_chk
  CHECK (industry_behavior IS NULL OR industry_behavior IN (
    'all_industries_shared','industry_aware_copy','industry_aware_questions',
    'industry_aware_outputs','industry_specific_benchmarks',
    'industry_specific_templates','industry_restricted','general_fallback'
  ));

CREATE INDEX IF NOT EXISTS tool_catalog_service_lane_idx
  ON public.tool_catalog (service_lane);

-- ===== Classification updates =====

-- Diagnostic lane
UPDATE public.tool_catalog SET
  service_lane='diagnostic', customer_journey_phase='owner_interview',
  industry_behavior='industry_aware_questions', can_be_client_visible=true,
  contains_internal_notes=false, lane_sort_order=10, phase_sort_order=10
WHERE tool_key='owner_diagnostic_interview';

UPDATE public.tool_catalog SET
  service_lane='diagnostic', customer_journey_phase='diagnostic_tools',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  lane_sort_order=10, phase_sort_order=20
WHERE tool_key='rgs_stability_scorecard';

UPDATE public.tool_catalog SET
  service_lane='public_pre_client', customer_journey_phase='public_pre_client',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  lane_sort_order=5, phase_sort_order=5
WHERE tool_key='scorecard';

UPDATE public.tool_catalog SET
  service_lane='diagnostic', customer_journey_phase='diagnostic_tools',
  industry_behavior='industry_aware_outputs', can_be_client_visible=false,
  contains_internal_notes=true, lane_sort_order=10, phase_sort_order=30
WHERE tool_key='buyer_persona_tool';

UPDATE public.tool_catalog SET
  service_lane='diagnostic', customer_journey_phase='diagnostic_tools',
  industry_behavior='industry_aware_outputs', can_be_client_visible=false,
  contains_internal_notes=true, lane_sort_order=10, phase_sort_order=40
WHERE tool_key='customer_journey_mapper';

UPDATE public.tool_catalog SET
  service_lane='diagnostic', customer_journey_phase='diagnostic_tools',
  industry_behavior='industry_aware_outputs', can_be_client_visible=false,
  contains_internal_notes=true, lane_sort_order=10, phase_sort_order=50
WHERE tool_key='process_breakdown_tool';

UPDATE public.tool_catalog SET
  service_lane='diagnostic', customer_journey_phase='diagnostic_tools',
  industry_behavior='industry_specific_benchmarks', can_be_client_visible=false,
  contains_internal_notes=true, lane_sort_order=10, phase_sort_order=60
WHERE tool_key='revenue_leak_finder';

UPDATE public.tool_catalog SET
  service_lane='admin_only', customer_journey_phase='admin_review',
  industry_behavior='all_industries_shared', can_be_client_visible=false,
  contains_internal_notes=true, lane_sort_order=90, phase_sort_order=10
WHERE tool_key='diagnostic_workspace';

-- Implementation lane
UPDATE public.tool_catalog SET
  service_lane='implementation', customer_journey_phase='implementation_planning',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  contains_internal_notes=true, lane_sort_order=20, phase_sort_order=10
WHERE tool_key='implementation_roadmap';

UPDATE public.tool_catalog SET
  service_lane='implementation', customer_journey_phase='training_handoff',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  contains_internal_notes=true, lane_sort_order=20, phase_sort_order=40
WHERE tool_key='sop_training_bible';

UPDATE public.tool_catalog SET
  service_lane='implementation', customer_journey_phase='implementation_execution',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  lane_sort_order=20, phase_sort_order=20
WHERE tool_key='implementation_foundation_system';

UPDATE public.tool_catalog SET
  service_lane='implementation', customer_journey_phase='implementation_execution',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  lane_sort_order=20, phase_sort_order=30
WHERE tool_key='implementation_command_tracker';

UPDATE public.tool_catalog SET
  service_lane='implementation', customer_journey_phase='implementation_execution',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  lane_sort_order=20, phase_sort_order=25
WHERE tool_key='priority_tasks';

-- RGS Control System / Revenue Control System lane
UPDATE public.tool_catalog SET
  service_lane='rgs_control_system', customer_journey_phase='rcs_ongoing_visibility',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  lane_sort_order=30, phase_sort_order=10
WHERE tool_key='revenue_control_center';

UPDATE public.tool_catalog SET
  service_lane='rgs_control_system', customer_journey_phase='rcs_ongoing_visibility',
  industry_behavior='industry_specific_benchmarks', can_be_client_visible=true,
  lane_sort_order=30, phase_sort_order=20
WHERE tool_key='revenue_risk_monitor';

UPDATE public.tool_catalog SET
  service_lane='rgs_control_system', customer_journey_phase='rcs_ongoing_visibility',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  lane_sort_order=30, phase_sort_order=30
WHERE tool_key='revenue_tracker';

UPDATE public.tool_catalog SET
  service_lane='rgs_control_system', customer_journey_phase='rcs_ongoing_visibility',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  lane_sort_order=30, phase_sort_order=40
WHERE tool_key='quickbooks_sync_health';

-- Shared / report-only / communication
UPDATE public.tool_catalog SET
  service_lane='report_only', customer_journey_phase='report_repair_map',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  contains_internal_notes=true, lane_sort_order=40, phase_sort_order=10
WHERE tool_key='reports_and_reviews';

UPDATE public.tool_catalog SET
  service_lane='shared_support', customer_journey_phase='rcs_ongoing_visibility',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  lane_sort_order=50, phase_sort_order=10
WHERE tool_key='client_service_requests';

UPDATE public.tool_catalog SET
  service_lane='shared_support', customer_journey_phase='diagnostic_tools',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  lane_sort_order=50, phase_sort_order=20
WHERE tool_key='evidence_uploads';

UPDATE public.tool_catalog SET
  service_lane='shared_support', customer_journey_phase='rcs_ongoing_visibility',
  industry_behavior='all_industries_shared', can_be_client_visible=true,
  lane_sort_order=50, phase_sort_order=30
WHERE tool_key='weekly_alignment_system';

-- Admin-only / internal
UPDATE public.tool_catalog SET
  service_lane='admin_only', customer_journey_phase='internal_admin_operations',
  industry_behavior='all_industries_shared', can_be_client_visible=false,
  contains_internal_notes=true, lane_sort_order=90
WHERE tool_key IN (
  'admin_settings','demo_sandbox_tools','learning_brain','operational_profile',
  'outcome_review','priority_roadmap','report_drafts'
);
