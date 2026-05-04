-- P63.1 — Industry Brain Deep Expansion
-- Adds unique constraint and deepens seed coverage across all 5 industries.
-- All entries are admin-only by default (client_visible = false).
-- Cannabis / MMJ / MMC stays dispensary/retail/operations logic — never
-- healthcare, patient-care, insurance, or claims framing.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ibe_industry_title
  ON public.industry_brain_entries(industry_key, title);

INSERT INTO public.industry_brain_entries (
  industry_key, industry_label, title, summary, content, caution_note,
  template_type, gear, service_lane, customer_journey_phase, industry_behavior,
  status, client_visible, display_order
) VALUES

-- ============================================================
-- TRADES / FIELD SERVICE — deep expansion
-- ============================================================
('trades_services','Trades / Services','Estimate-to-sale conversion variables',
 'Conversion signal: estimates sent without a structured follow-up cadence drift; close rate becomes invisible.',
 'Look for: estimates sent and forgotten, no follow-up rhythm, no win/loss reason captured, price objections not tracked.',
 'Operational visibility support only. Does not promise a specific result.',
 'workflow_example','revenue_conversion','shared_support','admin_review','industry_aware_outputs','active',false,40),

('trades_services','Trades / Services','Lead source and demand visibility',
 'Demand signal: referrals, repeat customers, local search and paid sources are not separated; marketing decisions are made on feel.',
 'Look for: no source captured at intake, referral attribution missing, repeat-customer signal not tracked, paid-ad spend not reconciled to jobs.',
 NULL,
 'benchmark_note','demand_generation','shared_support','admin_review','industry_aware_outputs','active',false,50),

('trades_services','Trades / Services','Crew handoff and field documentation',
 'Operational signal: job context lives in the owner''s head; crews arrive without scope, materials list, or customer history.',
 'Look for: no job packet, missing site notes, change orders verbal only, no photo/document trail per job.',
 NULL,
 'workflow_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,60),

('trades_services','Trades / Services','Callbacks, rework and warranty visibility',
 'Operational signal: callbacks and rework hide margin loss; root cause not captured.',
 'Look for: no callback log, warranty work mixed into new jobs, recurring crew-level error pattern not tracked.',
 NULL,
 'risk_signal','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,70),

('trades_services','Trades / Services','Invoice timing and AR aging',
 'Financial visibility signal: invoices issued days or weeks after job completion; AR aging hidden in spreadsheets.',
 'Look for: lag between job done and invoice sent, no weekly AR review, partial payments not reconciled, deposits not tracked separately.',
 'Visibility support only. Not accounting or tax review. Use qualified accountants where required.',
 'financial_visibility_caveat','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,80),

('trades_services','Trades / Services','Owner-dependent quoting bottleneck',
 'Owner-independence signal: only the owner can quote; team idle waiting on quotes during owner absence.',
 'Look for: backlog of quotes queued behind owner, no written pricing rules, inconsistent margin between similar jobs.',
 NULL,
 'decision_rights_example','owner_independence','shared_support','admin_review','industry_aware_outputs','active',false,90),

('trades_services','Trades / Services','Software, POS and CRM evidence sources',
 'Evidence-source signal: typical evidence comes from job management (e.g. Jobber, Housecall Pro, ServiceTitan), accounting (QuickBooks, Xero), scheduling, and uploaded photos/PDFs.',
 'Confirm which systems are the source of truth before pulling visibility numbers. Treat spreadsheets as secondary unless explicitly admin-approved as primary.',
 NULL,
 'workflow_example','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,100),

('trades_services','Trades / Services','Capacity, scheduling and dispatch limits',
 'Capacity signal: revenue is bottlenecked by available crew-hours, equipment, and dispatch routing — not demand.',
 'Look for: jobs delayed by crew availability rather than backlog, dispatch decisions made by owner alone, equipment downtime not tracked.',
 NULL,
 'workflow_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,110),

('trades_services','Trades / Services','Repair map: reduce owner-only quoting and tighten follow-up',
 'Repair-map implication: standardize quote/follow-up flow, document pricing rules, separate AR review from quoting, and assign clear owners for each step.',
 'Pairs with: SOP / Training Bible, Decision Rights, Workflow / Process Mapping, Priority Action Tracker.',
 NULL,
 'sop_example','owner_independence','shared_support','admin_review','industry_aware_outputs','active',false,120),

('trades_services','Trades / Services','Tool readiness for trades / field service',
 'Tool/report readiness: Diagnostic Report, RGS Stability Snapshot, Implementation Roadmap, SOP / Training Bible, Decision Rights, Workflow / Process Mapping, Tool Assignment + Training Tracker, Revenue & Risk Monitor, Priority Action Tracker, Owner Decision Dashboard, Scorecard History, Monthly System Review, Financial Visibility.',
 'Default tool set for trades / field service is mapped — not a guarantee that every variable, vendor, or workflow is fully covered.',
 NULL,
 'rgs_control_system_note','general','shared_support','admin_review','industry_aware_outputs','active',false,130),

-- ============================================================
-- RESTAURANT / FOOD SERVICE — deep expansion
-- ============================================================
('restaurant_food_service','Restaurant / Food Service','Menu mix and category profitability',
 'Margin signal: blended margin hides which items actually carry the kitchen; price changes happen on instinct.',
 'Look for: no per-item or per-category margin view, top-sellers not separated from top-profit items, vendor cost changes not reflected in menu pricing.',
 NULL,
 'benchmark_note','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,40),

('restaurant_food_service','Restaurant / Food Service','Vendor cost change and ordering rhythm',
 'Operational signal: vendor cost increases absorbed silently; ordering done from memory.',
 'Look for: no scheduled price-check on key SKUs, no par-level system, ordering done in head/text only.',
 NULL,
 'workflow_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,50),

('restaurant_food_service','Restaurant / Food Service','Labor scheduling and shift-level cost visibility',
 'Operational/financial signal: labor scheduled by feel; shift-level cost not visible until end of week.',
 'Look for: schedule built without forecast, no real-time labor% view, shift swaps undocumented.',
 NULL,
 'workflow_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,60),

('restaurant_food_service','Restaurant / Food Service','Ticket time and prep/line handoff',
 'Customer-experience signal: ticket times drift; prep-to-line handoff inconsistent across shifts.',
 'Look for: no ticket-time target by daypart, prep handoff verbal only, expo/line accountability gaps.',
 NULL,
 'workflow_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,70),

('restaurant_food_service','Restaurant / Food Service','Promotion, discount and comp leakage',
 'Margin signal: promotions, discounts, voids, and comps not measured against baseline; silent margin leak.',
 'Look for: no comp/void review cadence, promotion ROI not measured, manager discounts unmonitored.',
 NULL,
 'risk_signal','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,80),

('restaurant_food_service','Restaurant / Food Service','Online ordering and delivery channel mix',
 'Demand signal: dine-in, online ordering, delivery platform, and catering not separated; channel margin invisible.',
 'Look for: blended revenue without channel split, third-party fees not isolated, delivery refunds untracked.',
 NULL,
 'benchmark_note','demand_generation','shared_support','admin_review','industry_aware_outputs','active',false,90),

('restaurant_food_service','Restaurant / Food Service','Software and POS evidence sources',
 'Evidence-source signal: typical evidence comes from POS (Square, Toast-style POS exports), accounting (QuickBooks, Xero), payroll, scheduling, and inventory tools.',
 'Confirm POS is the system of record before pulling daily/weekly trends. Treat manual cash logs as a partial source.',
 NULL,
 'workflow_example','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,100),

('restaurant_food_service','Restaurant / Food Service','Owner-dependent decisions and manager bandwidth',
 'Owner-independence signal: pricing, scheduling, and vendor calls all funnel through the owner.',
 'Look for: managers cannot adjust schedule without owner, vendor calls answered only by owner, menu changes only the owner can make.',
 NULL,
 'decision_rights_example','owner_independence','shared_support','admin_review','industry_aware_outputs','active',false,110),

('restaurant_food_service','Restaurant / Food Service','Repair map: prime cost rhythm and channel/menu visibility',
 'Repair-map implication: install a weekly prime-cost review, separate channel and menu margin, document line/prep handoff, and assign decision rights for promotions and comps.',
 'Pairs with: Monthly System Review, Priority Action Tracker, Workflow / Process Mapping, Decision Rights, Financial Visibility.',
 NULL,
 'sop_example','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,120),

('restaurant_food_service','Restaurant / Food Service','Tool readiness for restaurant / food service',
 'Tool/report readiness: Diagnostic Report, RGS Stability Snapshot, Implementation Roadmap, SOP / Training Bible, Decision Rights, Workflow / Process Mapping, Tool Assignment + Training Tracker, Revenue & Risk Monitor, Priority Action Tracker, Owner Decision Dashboard, Scorecard History, Monthly System Review, Financial Visibility.',
 'Default tool set for restaurant / food service is mapped — not a guarantee that every menu, vendor, channel, or shift pattern is fully covered.',
 NULL,
 'rgs_control_system_note','general','shared_support','admin_review','industry_aware_outputs','active',false,130),

-- ============================================================
-- RETAIL — deep expansion
-- ============================================================
('retail','Retail','Product and category margin visibility',
 'Margin signal: blended margin hides which categories carry the store; high-sales / low-margin SKUs absorb attention.',
 'Look for: one blended margin number, no high-sales/low-margin flag, vendor cost changes not reflected in pricing.',
 NULL,
 'benchmark_note','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,40),

('retail','Retail','Inventory turn, dead stock and reorder triggers',
 'Operational signal: slow-moving inventory ties up cash; reorder triggers are manual.',
 'Look for: no turn metric by category, no dead-stock value, reorder decisions made from memory.',
 NULL,
 'workflow_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,50),

('retail','Retail','POS, e-commerce and inventory sync evidence sources',
 'Evidence-source signal: typical evidence comes from POS (Square, Stripe), e-commerce platform, inventory system, and accounting (QuickBooks, Xero).',
 'Confirm which system is the source of truth for inventory before reconciling. Treat spreadsheets as secondary unless explicitly admin-approved.',
 NULL,
 'workflow_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,60),

('retail','Retail','Repeat customer and loyalty visibility',
 'Demand signal: repeat customers and loyalty members not separated from one-time buyers.',
 'Look for: no repeat-customer signal at POS, loyalty data unused for promotions, no review/referral cadence.',
 NULL,
 'benchmark_note','demand_generation','shared_support','admin_review','industry_aware_outputs','active',false,70),

('retail','Retail','Stockouts, overstock and vendor reorder process',
 'Operational signal: stockouts noticed only by customers; overstock visible only at year-end count.',
 'Look for: no stockout log, no overstock list, vendor reorder lead times not documented.',
 NULL,
 'risk_signal','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,80),

('retail','Retail','Pricing, promotions and discount discipline',
 'Margin signal: promotions discounted on instinct; staff overrides not reviewed.',
 'Look for: no promotion ROI review, manager discounts unmonitored, price changes not version-tracked.',
 NULL,
 'risk_signal','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,90),

('retail','Retail','Customer handoff at register and post-purchase',
 'Customer-experience signal: handoff at register inconsistent; post-purchase follow-up missing.',
 'Look for: no greeting/closing standard, no receipt-to-review nudge, returns handled differently per shift.',
 NULL,
 'workflow_example','revenue_conversion','shared_support','admin_review','industry_aware_outputs','active',false,100),

('retail','Retail','Owner-dependent buying and merchandising',
 'Owner-independence signal: buying, merchandising, and vendor calls all funnel through the owner.',
 'Look for: only owner can place orders, no documented merchandising rules, vendor relationships only owner-held.',
 NULL,
 'decision_rights_example','owner_independence','shared_support','admin_review','industry_aware_outputs','active',false,110),

('retail','Retail','Repair map: tighten margin visibility and reduce buying bottleneck',
 'Repair-map implication: introduce category margin views, document buying/merchandising rules, install a weekly stockout/overstock review, and assign decision rights for pricing.',
 'Pairs with: SOP / Training Bible, Decision Rights, Workflow / Process Mapping, Monthly System Review, Financial Visibility.',
 NULL,
 'sop_example','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,120),

('retail','Retail','Tool readiness for retail',
 'Tool/report readiness: Diagnostic Report, RGS Stability Snapshot, Implementation Roadmap, SOP / Training Bible, Decision Rights, Workflow / Process Mapping, Tool Assignment + Training Tracker, Revenue & Risk Monitor, Priority Action Tracker, Owner Decision Dashboard, Scorecard History, Monthly System Review, Financial Visibility.',
 'Default tool set for retail is mapped — not a guarantee that every SKU, channel, or vendor relationship is fully covered.',
 NULL,
 'rgs_control_system_note','general','shared_support','admin_review','industry_aware_outputs','active',false,130),

-- ============================================================
-- CANNABIS / MMJ / MMC — deep expansion
-- (Dispensary / retail / operations logic only.
--  Not healthcare, not patient-care, not insurance, not claims.)
-- ============================================================
('cannabis_mmj_mmc','Cannabis / MMJ / MMC','POS and menu accuracy',
 'Operational signal: menu, in-store signage, and POS quantities drift from each other; budtenders correct on the fly.',
 'Look for: menu vs POS mismatch, manual price overrides at register, signage updated by memory.',
 'Compliance-sensitive operations context. State-specific rules may apply. Review with qualified counsel or compliance support where required. Not legal advice and not a compliance guarantee. Cannabis / MMJ / MMC context here is dispensary / retail / operations logic — not healthcare or patient-care logic.',
 'compliance_sensitive_note','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,40),

('cannabis_mmj_mmc','Cannabis / MMJ / MMC','Inventory traceability and state reporting sensitivity',
 'Operational signal: inventory movement, transfers, and waste must align with state-specific traceability; informal handling creates exposure.',
 'Look for: inventory adjustments not logged in real time, waste/destruction handled in head/email, transfers between rooms undocumented.',
 'Compliance-sensitive context. State-specific rules may apply. Visibility and warning support only. Not legal advice and not a compliance guarantee. This is dispensary / retail / operations logic — not healthcare or patient-care logic.',
 'compliance_sensitive_note','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,50),

('cannabis_mmj_mmc','Cannabis / MMJ / MMC','Product and category margin pressure',
 'Margin signal: regulated pricing, vendor cost movement, and discount/promotion impact compress category margin.',
 'Look for: blended margin only, no per-category view, promo impact not isolated, high-sales / low-margin SKUs not flagged.',
 'Visibility support only. Not accounting, tax, or compliance review.',
 'financial_visibility_caveat','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,60),

('cannabis_mmj_mmc','Cannabis / MMJ / MMC','Cash handling and payment handoff workflow',
 'Operational signal: cash and limited-payment handling create reconciliation gaps; standard processor data is a partial visibility source.',
 'Look for: drawer counts done loosely, deposits batched without log, payment handoff not separated by shift.',
 'Visibility support only. Not accounting or compliance review. Cannabis context here is dispensary / retail / operations logic — not healthcare or patient-care logic.',
 'compliance_sensitive_note','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,70),

('cannabis_mmj_mmc','Cannabis / MMJ / MMC','ID and age verification workflow',
 'Operational signal: ID / age verification at intake or register varies across shifts; no checklist or audit trail.',
 'Look for: verification done by memory, no documented refusal log, no shift-level audit of compliance steps.',
 'Compliance-sensitive operations context. State-specific rules may apply. Review with qualified counsel or compliance support where required. Not legal advice and not a compliance guarantee. This is dispensary / retail / operations logic — not healthcare or patient-care logic.',
 'compliance_sensitive_note','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,80),

('cannabis_mmj_mmc','Cannabis / MMJ / MMC','Vendor and license document handling',
 'Operational signal: vendor licenses, COAs, and intake documents managed in email and folders; expiry dates not tracked.',
 'Look for: COAs scattered across drives, vendor license expirations not surfaced, intake docs not linked to inventory.',
 'Compliance-sensitive context. State-specific rules may apply. Not a compliance guarantee. Cannabis context here is dispensary / retail / operations logic — not healthcare or patient-care logic.',
 'compliance_sensitive_note','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,90),

('cannabis_mmj_mmc','Cannabis / MMJ / MMC','Regulated marketing and promotion constraints',
 'Demand signal: marketing channels and promotion mechanics are state-restricted; visibility into what is allowed is uneven.',
 'Look for: promotions launched without compliance review, channel mix not documented, claims/language reviewed inconsistently.',
 'Compliance-sensitive context. State-specific rules may apply. Review with qualified counsel or compliance support where required. Not legal advice and not a compliance guarantee. This is dispensary / retail / operations logic — not healthcare or patient-care logic.',
 'compliance_sensitive_note','demand_generation','shared_support','admin_review','industry_aware_outputs','active',false,100),

('cannabis_mmj_mmc','Cannabis / MMJ / MMC','Staff certification, training and budtender consistency',
 'Staffing signal: certifications and product training tracked informally; budtender knowledge varies by shift.',
 'Look for: no certification expiry tracking, no documented onboarding, product education delivered ad-hoc.',
 'Compliance-sensitive context. State-specific rules may apply. Cannabis context here is dispensary / retail / operations logic — not healthcare or patient-care logic.',
 'compliance_sensitive_note','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,110),

('cannabis_mmj_mmc','Cannabis / MMJ / MMC','Repair map: tighten traceability, payment workflow, and documented handoffs',
 'Repair-map implication: document POS/menu/inventory reconciliation cadence, formalize cash and payment handoff, surface vendor/license expirations, and standardize budtender handoff.',
 'Pairs with: SOP / Training Bible, Workflow / Process Mapping, Decision Rights, Tool Assignment + Training Tracker, Monthly System Review. Not a compliance certification.',
 NULL,
 'sop_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,120),

('cannabis_mmj_mmc','Cannabis / MMJ / MMC','Tool readiness for cannabis / dispensary',
 'Tool/report readiness: Diagnostic Report, RGS Stability Snapshot, Implementation Roadmap, SOP / Training Bible, Decision Rights, Workflow / Process Mapping, Tool Assignment + Training Tracker, Revenue & Risk Monitor, Priority Action Tracker, Owner Decision Dashboard, Scorecard History, Monthly System Review, Financial Visibility.',
 'Default tool set for cannabis / dispensary is mapped — not a guarantee that every state rule, vendor, or compliance step is fully covered. State-specific review may still be required. Cannabis context here is dispensary / retail / operations logic — not healthcare or patient-care logic.',
 NULL,
 'rgs_control_system_note','general','shared_support','admin_review','industry_aware_outputs','active',false,130),

-- ============================================================
-- GENERAL / MIXED SMALL BUSINESS — deep expansion
-- ============================================================
('general_small_business','General Small Business','Unclear primary revenue stream',
 'Revenue signal: primary, secondary, recurring vs one-time, and add-on revenue are blended; concentration risk hidden.',
 'Look for: one revenue line in accounting, no recurring vs one-time split, no top-customer concentration view.',
 NULL,
 'benchmark_note','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,30),

('general_small_business','General Small Business','Weak follow-up and conversion process',
 'Conversion signal: leads or quotes lose momentum without a structured follow-up cadence.',
 'Look for: no defined follow-up steps, no win/loss reason captured, abandoned leads not reviewed.',
 NULL,
 'workflow_example','revenue_conversion','shared_support','admin_review','industry_aware_outputs','active',false,40),

('general_small_business','General Small Business','Demand source attribution',
 'Demand signal: referrals, repeat customers, organic, and paid sources are not separated.',
 'Look for: no source captured at intake, marketing decisions made on instinct, no review/referral cadence.',
 NULL,
 'benchmark_note','demand_generation','shared_support','admin_review','industry_aware_outputs','active',false,50),

('general_small_business','General Small Business','Undocumented core processes',
 'Operational signal: core workflows live in heads; new staff onboarded by shadowing only.',
 'Look for: no SOP library, training delivered ad-hoc, handoffs verbal, quality checks inconsistent.',
 NULL,
 'sop_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,60),

('general_small_business','General Small Business','Owner as the bottleneck for decisions',
 'Owner-independence signal: pricing, scheduling, and customer-issue resolution all funnel through the owner.',
 'Look for: team waiting on owner for routine decisions, no decision-rights matrix, owner reachable on every shift.',
 NULL,
 'decision_rights_example','owner_independence','shared_support','admin_review','industry_aware_outputs','active',false,70),

('general_small_business','General Small Business','Staffing accountability and role clarity',
 'Staffing signal: roles overlap; accountability for outcomes unclear.',
 'Look for: no role docs, no clear owner per workflow, training/certification not tracked, turnover risk unmeasured.',
 NULL,
 'workflow_example','operational_efficiency','shared_support','admin_review','industry_aware_outputs','active',false,80),

('general_small_business','General Small Business','Customer handoff and follow-through',
 'Customer-experience signal: intake, status updates, delivery, and post-sale follow-up vary by person.',
 'Look for: no documented intake script, no status-update cadence, complaints handled differently per staff member.',
 NULL,
 'workflow_example','revenue_conversion','shared_support','admin_review','industry_aware_outputs','active',false,90),

('general_small_business','General Small Business','Software, evidence and reporting sources',
 'Evidence-source signal: typical evidence comes from accounting (QuickBooks, Xero, FreshBooks), CRM (HubSpot, Salesforce, Pipedrive), payment processors (Stripe, Square, PayPal), payroll (ADP, Gusto, Paycom), spreadsheets, and uploaded documents.',
 'Confirm system of record per data type before pulling visibility numbers. Treat spreadsheets as secondary unless admin-approved.',
 NULL,
 'workflow_example','financial_visibility','shared_support','admin_review','industry_aware_outputs','active',false,100),

('general_small_business','General Small Business','Repair map: clarify offer, follow-up, and decision rights',
 'Repair-map implication: clarify offer/revenue path, install structured follow-up, document core workflows, assign decision rights, and improve financial visibility.',
 'Pairs with: SOP / Training Bible, Decision Rights, Workflow / Process Mapping, Priority Action Tracker, Monthly System Review, Financial Visibility.',
 NULL,
 'sop_example','owner_independence','shared_support','admin_review','industry_aware_outputs','active',false,110),

('general_small_business','General Small Business','Tool readiness for general / mixed small business',
 'Tool/report readiness: Diagnostic Report, RGS Stability Snapshot, Implementation Roadmap, SOP / Training Bible, Decision Rights, Workflow / Process Mapping, Tool Assignment + Training Tracker, Revenue & Risk Monitor, Priority Action Tracker, Owner Decision Dashboard, Scorecard History, Monthly System Review, Financial Visibility.',
 'Default tool set for general / mixed small business is mapped — not a guarantee that every offer, channel, or workflow is fully covered.',
 NULL,
 'rgs_control_system_note','general','shared_support','admin_review','industry_aware_outputs','active',false,120)

ON CONFLICT (industry_key, title) DO NOTHING;