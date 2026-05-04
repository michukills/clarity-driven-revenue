-- P63: Industry Brain Enhancements

DO $$ BEGIN
  CREATE TYPE public.industry_brain_industry_key AS ENUM (
    'trades_services',
    'restaurant_food_service',
    'retail',
    'cannabis_mmj_mmc',
    'general_small_business'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.industry_brain_template_type AS ENUM (
    'diagnostic_question_example',
    'diagnostic_interpretation',
    'report_language',
    'risk_signal',
    'benchmark_note',
    'implementation_example',
    'workflow_example',
    'sop_example',
    'decision_rights_example',
    'financial_visibility_caveat',
    'rgs_control_system_note',
    'compliance_sensitive_note',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.industry_brain_gear AS ENUM (
    'demand_generation',
    'revenue_conversion',
    'operational_efficiency',
    'financial_visibility',
    'owner_independence',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.industry_brain_status AS ENUM (
    'draft',
    'active',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.industry_brain_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_key public.industry_brain_industry_key NOT NULL,
  industry_label text NOT NULL,
  title text NOT NULL,
  summary text,
  content text,
  caution_note text,
  template_type public.industry_brain_template_type NOT NULL DEFAULT 'other',
  gear public.industry_brain_gear NOT NULL DEFAULT 'general',
  service_lane text NOT NULL DEFAULT 'shared_support',
  customer_journey_phase text NOT NULL DEFAULT 'admin_review',
  industry_behavior text NOT NULL DEFAULT 'industry_aware_outputs',
  related_tool_key text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  status public.industry_brain_status NOT NULL DEFAULT 'draft',
  client_visible boolean NOT NULL DEFAULT false,
  contains_internal_notes boolean NOT NULL DEFAULT true,
  internal_notes text,
  admin_notes text,
  display_order integer NOT NULL DEFAULT 100,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT ibe_service_lane_chk CHECK (service_lane IN (
    'diagnostic','implementation','rgs_control_system','revenue_control_system',
    'admin_only','shared_support','report_only','public_pre_client'
  )),
  CONSTRAINT ibe_journey_phase_chk CHECK (customer_journey_phase IN (
    'public_pre_client','paid_diagnostic','owner_interview','diagnostic_tools',
    'admin_review','report_repair_map','implementation_planning',
    'implementation_execution','training_handoff','rcs_ongoing_visibility',
    'renewal_health_monitoring','internal_admin_operations'
  )),
  CONSTRAINT ibe_industry_behavior_chk CHECK (industry_behavior IN (
    'all_industries_shared','industry_aware_copy','industry_aware_questions',
    'industry_aware_outputs','industry_specific_benchmarks',
    'industry_specific_templates','industry_restricted','general_fallback'
  ))
);

CREATE INDEX IF NOT EXISTS idx_ibe_industry ON public.industry_brain_entries(industry_key);
CREATE INDEX IF NOT EXISTS idx_ibe_gear ON public.industry_brain_entries(gear);
CREATE INDEX IF NOT EXISTS idx_ibe_status ON public.industry_brain_entries(status);
CREATE INDEX IF NOT EXISTS idx_ibe_template_type ON public.industry_brain_entries(template_type);

ALTER TABLE public.industry_brain_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage industry brain entries" ON public.industry_brain_entries;
CREATE POLICY "Admin manage industry brain entries"
  ON public.industry_brain_entries FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_ibe_touch ON public.industry_brain_entries;
CREATE TRIGGER trg_ibe_touch
  BEFORE UPDATE ON public.industry_brain_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed starter entries (admin-only by default; client_visible = false)
INSERT INTO public.industry_brain_entries (
  industry_key, industry_label, title, summary, content, caution_note,
  template_type, gear, service_lane, customer_journey_phase, industry_behavior,
  status, client_visible, display_order
) VALUES
-- Trades / Services
('trades_services','Trades / Services','Job scheduling and dispatch flow',
 'Operational signal: jobs dispatched without a repeatable scheduling and confirmation flow tend to slip on margin and customer follow-through.',
 'Look for: jobs scheduled in head/text only, missed confirmations, techs arriving without job context, repeat callbacks not tracked.',
 'Industry-aware example only. Does not replace owner judgment or qualified advisors.',
 'workflow_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,10),
('trades_services','Trades / Services','Job-level margin visibility',
 'Financial visibility signal: labor and materials per job often unreconciled, leaving owner unsure which jobs actually make money.',
 'Look for: estimates not reconciled to actuals, no per-job material tracking, owner relying on bank balance as profitability proxy.',
 'Visibility support only. Not accounting or tax review. Use qualified accountants where required.',
 'financial_visibility_caveat','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,20),
('trades_services','Trades / Services','Owner memory to repeatable estimate flow',
 'Owner independence signal: estimating logic trapped in owner head; team cannot price consistently when owner is unavailable.',
 'Look for: only owner can quote, inconsistent margin between similar jobs, no written pricing rules.',
 NULL,
 'sop_example','owner_independence','shared_support','admin_review','industry_aware_outputs','active',false,30),

-- Restaurant / Food Service
('restaurant_food_service','Restaurant / Food Service','Prime cost and prep visibility',
 'Operational signal: food and labor cost not visible weekly; waste and over-prep drive silent margin loss.',
 'Look for: no weekly prime cost number, prep guessed from memory, end-of-shift waste not logged.',
 'Visibility support only. Not accounting or tax review.',
 'workflow_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,10),
('restaurant_food_service','Restaurant / Food Service','Cash and card reconciliation',
 'Financial visibility signal: cash drawer and card batch not reconciled daily; small variances accumulate into unexplained gaps.',
 'Look for: no daily reconciliation routine, owner reconciles weeks later, tip handling unclear.',
 'Visibility support only. Not a guarantee of financial accuracy. Use qualified accountants where required.',
 'financial_visibility_caveat','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,20),
('restaurant_food_service','Restaurant / Food Service','Average ticket and repeat visit visibility',
 'Revenue conversion signal: no view of average ticket or repeat customer rate; promotions decided on feel.',
 'Look for: no per-day or per-shift average ticket trend, no clear repeat customer signal in POS.',
 NULL,
 'benchmark_note','revenue_conversion','shared_support','admin_review','industry_aware_outputs','active',false,30),

-- Retail
('retail','Retail','Inventory turn and stockout handling',
 'Operational signal: slow-moving inventory ties up cash; frequent stockouts lose sales without clear pattern.',
 'Look for: no turn metric by category, manual reorder triggers, stockouts noticed only by customers.',
 NULL,
 'workflow_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,10),
('retail','Retail','Margin by category and shrink visibility',
 'Financial visibility signal: blended margin hides which categories actually carry the store; shrink not measured.',
 'Look for: one blended margin number, no shrink tracking, vendor cost changes not reflected in pricing.',
 'Visibility support only. Not accounting or tax review.',
 'financial_visibility_caveat','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,20),
('retail','Retail','Repeat customer trigger visibility',
 'Demand generation signal: foot traffic and repeat customers not measured; marketing decisions made on instinct.',
 'Look for: no repeat customer signal at POS, no local visibility check (search/maps/reviews), promotions not measured against baseline.',
 NULL,
 'benchmark_note','demand_generation','shared_support','admin_review','industry_aware_outputs','active',false,30),

-- Cannabis / MMJ / MMC
('cannabis_mmj_mmc','Cannabis / MMJ / MMC','Budtender and customer handoff flow',
 'Operational signal: budtender handoff inconsistent across shifts; product knowledge and approval steps vary by person.',
 'Look for: no documented handoff steps, ID/approval check inconsistent, product knowledge in heads only.',
 'Compliance-sensitive context. State-specific rules may apply. Review with qualified counsel or compliance support where required. This is not legal advice and not a compliance guarantee.',
 'workflow_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,10),
('cannabis_mmj_mmc','Cannabis / MMJ / MMC','Inventory and vendor handling',
 'Operational signal: inventory and vendor receipt steps must align with state-specific traceability; informal handoffs create exposure.',
 'Look for: receiving steps not documented, vendor records ad-hoc, traceability handled in head/email only.',
 'Compliance-sensitive operations context. State-specific rules may apply. Review with qualified counsel or compliance support where required. Not legal advice and not a compliance guarantee. Cannabis/MMJ/MMC context here means dispensary/retail/operations logic, not healthcare or patient-care logic.',
 'compliance_sensitive_note','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,20),
('cannabis_mmj_mmc','Cannabis / MMJ / MMC','Cash-heavy and payment-limited reconciliation',
 'Financial visibility signal: cash-heavy or payment-limited operations mean standard payment processor data may be a partial visibility source, not a complete financial picture.',
 'Treat connected payment processor data as a partial visibility source unless admin verifies completeness. Reconcile cash records separately. Do not assume connected data captures all revenue.',
 'Visibility support only. Not accounting, tax, or compliance review. Use qualified accountants and qualified counsel where required. Not a legal or compliance guarantee. Cannabis context here is dispensary/retail business logic, not healthcare or patient-care logic.',
 'financial_visibility_caveat','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,30),

-- General Small Business
('general_small_business','General Small Business','Decisions trapped in owner memory',
 'Owner independence signal: key decisions and pricing logic live in the owner''s head; team cannot act consistently when owner is unavailable.',
 'Look for: only owner can quote/decide, inconsistent answers across team, no written decision rights.',
 NULL,
 'decision_rights_example','owner_independence','shared_support','admin_review','industry_aware_outputs','active',false,10),
('general_small_business','General Small Business','Numbers available but not translated into owner decisions',
 'Financial visibility signal: bookkeeping exists but the owner does not use it to decide; numbers reviewed quarterly or not at all.',
 'Look for: reports generated but unread, no monthly review cadence, owner uses bank balance as decision proxy.',
 'Visibility support only. Not accounting or tax review. Use qualified accountants where required.',
 'financial_visibility_caveat','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,20)
ON CONFLICT DO NOTHING;