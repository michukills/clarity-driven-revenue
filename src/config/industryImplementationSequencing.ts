/**
 * P93E-E2F — Industry Implementation Sequencing.
 *
 * Deterministic, additive interpretation layer that defines, per supported
 * industry, the ordered installation sequence the Implementation phase
 * proposes after Diagnostic findings.
 *
 * INSTALLATION ARCHITECTURE METADATA ONLY:
 *   - no live execution
 *   - no AI generation at read time
 *   - no legal / tax / accounting / compliance / valuation determination
 *   - no revenue / profit / growth / valuation guarantees
 *
 * Cannabis / MMJ rows must remain operational documentation visibility
 * language only. Tests in
 * src/lib/__tests__/p93eE2fImplementationDepthEngine.test.ts enforce this.
 */

import type { MatrixIndustryKey } from "@/config/industryDiagnosticDepthMatrix";

export type ImplementationSequenceStep = {
  step_number: number;
  title: string;
  why_first: string;
  prerequisite_step_numbers: ReadonlyArray<number>;
  unblocks: ReadonlyArray<string>;
  do_not_do_yet: ReadonlyArray<string>;
  leading_indicators: ReadonlyArray<string>;
  owner_bottleneck_reduced: string;
  client_safe_explanation: string;
  admin_sequencing_note: string;
};

export type IndustrySequence = ReadonlyArray<ImplementationSequenceStep>;

const TRADES: IndustrySequence = [
  {
    step_number: 1,
    title: "Inquiry capture and booking intake",
    why_first:
      "Inquiry capture and booking intake must be reliable before marketing or lead-volume expansion is recommended.",
    prerequisite_step_numbers: [],
    unblocks: ["dispatch playbook", "callback tracking", "job costing"],
    do_not_do_yet: ["Do not expand paid marketing before inquiries are captured in one place."],
    leading_indicators: ["speed-to-contact", "inquiries logged per day"],
    owner_bottleneck_reduced: "Owner answering after-hours inquiries from memory.",
    client_safe_explanation:
      "RGS would install a single inquiry log and booking intake before recommending demand growth.",
    admin_sequencing_note:
      "Confirm one inquiry log exists before approving downstream marketing items.",
  },
  {
    step_number: 2,
    title: "Dispatch priority playbook",
    why_first:
      "Dispatch decisions must follow a written playbook before capacity scaling is recommended.",
    prerequisite_step_numbers: [1],
    unblocks: ["callback tracking", "labor utilization review"],
    do_not_do_yet: ["Do not add new technicians before the dispatch playbook stabilizes."],
    leading_indicators: ["dispatch overrides per week", "owner dispatch interventions"],
    owner_bottleneck_reduced: "Owner acting as backup dispatcher.",
    client_safe_explanation:
      "RGS would document dispatch priorities so the schedule does not depend on owner memory.",
    admin_sequencing_note:
      "Verify named decision rights for dispatch escalation before capacity work.",
  },
  {
    step_number: 3,
    title: "Callback and rework tracking",
    why_first:
      "Callback and rework rate must be tracked before technician performance changes are evaluated.",
    prerequisite_step_numbers: [2],
    unblocks: ["job costing", "labor utilization review"],
    do_not_do_yet: ["Do not change technician compensation before callbacks are visible."],
    leading_indicators: ["callback rate", "warranty visits per week"],
    owner_bottleneck_reduced: "Owner absorbing callback escalations personally.",
    client_safe_explanation:
      "RGS would separate new work from callbacks so capacity can be read honestly.",
    admin_sequencing_note:
      "Treat absence of a callback log as a process gap, not a software gap.",
  },
  {
    step_number: 4,
    title: "Job costing visibility",
    why_first:
      "Job costing must exist before margin improvement decisions are made.",
    prerequisite_step_numbers: [3],
    unblocks: ["pricing review", "service line trim decisions"],
    do_not_do_yet: ["Do not run pricing changes before job costing by service line is visible."],
    leading_indicators: ["gross margin by service line", "job cost variance"],
    owner_bottleneck_reduced: "Owner pricing jobs from intuition.",
    client_safe_explanation:
      "RGS would surface margin per service line as operational visibility, not an accounting opinion.",
    admin_sequencing_note:
      "Operational margin review only. No accounting or tax determination is provided.",
  },
  {
    step_number: 5,
    title: "Labor utilization: paid hours vs billable hours",
    why_first:
      "Labor utilization must be visible before staffing decisions are made.",
    prerequisite_step_numbers: [3, 4],
    unblocks: ["owner removal from dispatch and escalation"],
    do_not_do_yet: ["Do not add headcount before billable-hour ratio is visible."],
    leading_indicators: ["billable hours per paid hour", "non-billable time drivers"],
    owner_bottleneck_reduced: "Owner approving every overtime exception.",
    client_safe_explanation:
      "RGS would compare paid hours to billable hours to show where capacity is leaking.",
    admin_sequencing_note:
      "Operational utilization review. No employment, wage-and-hour, or HR determination is provided.",
  },
];

const RESTAURANT: IndustrySequence = [
  {
    step_number: 1,
    title: "POS prime cost visibility",
    why_first:
      "Prime cost (food + labor) visibility must be installed before menu optimization is recommended.",
    prerequisite_step_numbers: [],
    unblocks: ["waste tracking", "menu margin", "labor scheduling"],
    do_not_do_yet: ["Do not redesign the menu before prime cost is visible."],
    leading_indicators: ["prime cost %", "weekly food cost variance"],
    owner_bottleneck_reduced: "Owner doing back-of-napkin cost math.",
    client_safe_explanation:
      "RGS would install prime cost visibility before recommending menu changes.",
    admin_sequencing_note:
      "Confirm POS reporting cadence before approving menu work.",
  },
  {
    step_number: 2,
    title: "Waste, comps, and voids tracking",
    why_first:
      "Waste and comps/voids tracking must precede margin decisions.",
    prerequisite_step_numbers: [1],
    unblocks: ["menu margin decisions", "manager closing procedures"],
    do_not_do_yet: ["Do not change vendor pricing before waste is tracked."],
    leading_indicators: ["comp/void rate", "weekly waste log entries"],
    owner_bottleneck_reduced: "Owner spot-checking waste from the line.",
    client_safe_explanation:
      "RGS would separate waste from comps and voids so margin work has a baseline.",
    admin_sequencing_note:
      "Look for separated waste vs. comp vs. void categories before margin decisions.",
  },
  {
    step_number: 3,
    title: "Prep forecasting and labor scheduling",
    why_first:
      "Prep forecasting must precede labor schedule fixes.",
    prerequisite_step_numbers: [1, 2],
    unblocks: ["service flow improvements"],
    do_not_do_yet: ["Do not cut labor hours before prep forecasting stabilizes."],
    leading_indicators: ["forecast vs. actual covers", "labor % of sales"],
    owner_bottleneck_reduced: "Owner adjusting schedules manually each week.",
    client_safe_explanation:
      "RGS would install prep forecasting so the schedule stops absorbing surprises.",
    admin_sequencing_note:
      "Operational scheduling visibility only. No wage-and-hour advice is provided.",
  },
  {
    step_number: 4,
    title: "Ticket time and station visibility",
    why_first:
      "Ticket time visibility must precede service flow changes.",
    prerequisite_step_numbers: [1],
    unblocks: ["menu margin", "manager closing procedures"],
    do_not_do_yet: ["Do not run promotions before ticket time is visible."],
    leading_indicators: ["ticket time by station", "long-ticket count"],
    owner_bottleneck_reduced: "Owner expediting on the line during rushes.",
    client_safe_explanation:
      "RGS would surface ticket time by station so service flow can be tightened with evidence.",
    admin_sequencing_note:
      "Confirm POS captures ticket time before approving service-flow changes.",
  },
  {
    step_number: 5,
    title: "Manager closing, cash procedures, and menu margin",
    why_first:
      "Manager closing and cash procedures must exist before owner withdrawal, and menu margin must precede promotions.",
    prerequisite_step_numbers: [1, 2, 3, 4],
    unblocks: ["owner withdrawal from nightly close"],
    do_not_do_yet: ["Do not run discount promotions before menu margin by item is visible."],
    leading_indicators: ["margin by menu item", "manager closing exceptions"],
    owner_bottleneck_reduced: "Owner closing the restaurant nightly.",
    client_safe_explanation:
      "RGS would document manager closing and surface menu margin before promotion decisions.",
    admin_sequencing_note:
      "Decision-rights work for closing. No HR or wage-and-hour advice is provided.",
  },
];

const RETAIL: IndustrySequence = [
  {
    step_number: 1,
    title: "Inventory aging and sell-through visibility",
    why_first:
      "Inventory aging and sell-through must be visible before purchasing changes are recommended.",
    prerequisite_step_numbers: [],
    unblocks: ["stockout tracking", "purchasing decision rights"],
    do_not_do_yet: ["Do not increase purchase orders before sell-through is visible."],
    leading_indicators: ["sell-through %", "weeks of supply by SKU"],
    owner_bottleneck_reduced: "Owner reordering from gut feel.",
    client_safe_explanation:
      "RGS would install sell-through and aging visibility before purchasing changes.",
    admin_sequencing_note:
      "Confirm POS captures unit sales by SKU before approving purchasing work.",
  },
  {
    step_number: 2,
    title: "Stockout tracking",
    why_first: "Stockouts must be tracked before reorder logic is changed.",
    prerequisite_step_numbers: [1],
    unblocks: ["reorder logic improvements"],
    do_not_do_yet: ["Do not automate reorder before stockouts are tracked."],
    leading_indicators: ["stockout count per week", "lost-sale signals"],
    owner_bottleneck_reduced: "Owner reacting to stockouts after the fact.",
    client_safe_explanation:
      "RGS would track stockouts so reorder logic has a real signal.",
    admin_sequencing_note:
      "Operational stockout tracking. No vendor or supplier negotiation advice is provided.",
  },
  {
    step_number: 3,
    title: "Shrink, damage, and miscount separation",
    why_first:
      "Shrink and damage must be separated from miscounts before inventory process fixes.",
    prerequisite_step_numbers: [1],
    unblocks: ["category margin work"],
    do_not_do_yet: ["Do not redesign cycle counts before causes are separated."],
    leading_indicators: ["shrink %", "damage entries per week"],
    owner_bottleneck_reduced: "Owner reconciling counts personally.",
    client_safe_explanation:
      "RGS would separate shrink, damage, and miscount before recommending inventory process fixes.",
    admin_sequencing_note:
      "Operational inventory visibility only. No loss-prevention or legal determination is provided.",
  },
  {
    step_number: 4,
    title: "Margin after markdowns by category",
    why_first:
      "Margin after markdowns must be visible before merchandising decisions.",
    prerequisite_step_numbers: [1, 3],
    unblocks: ["merchandising decisions"],
    do_not_do_yet: ["Do not run markdown campaigns before category margin is visible."],
    leading_indicators: ["margin after markdowns", "markdown frequency by category"],
    owner_bottleneck_reduced: "Owner approving markdowns case-by-case.",
    client_safe_explanation:
      "RGS would show margin after markdowns so merchandising decisions have evidence.",
    admin_sequencing_note:
      "Operational margin review. No pricing-law or tax advice is provided.",
  },
  {
    step_number: 5,
    title: "Purchasing decision rights and category margin review",
    why_first:
      "Purchasing decision rights must be assigned before owner independence improves.",
    prerequisite_step_numbers: [1, 2, 4],
    unblocks: ["owner withdrawal from purchasing"],
    do_not_do_yet: ["Do not delegate purchasing before category margin is visible."],
    leading_indicators: ["purchasing exceptions per week", "category margin trend"],
    owner_bottleneck_reduced: "Owner approving every PO.",
    client_safe_explanation:
      "RGS would document purchasing decision rights with category margin as the guardrail.",
    admin_sequencing_note:
      "Decision-rights work. No employment, HR, or vendor-contract advice is provided.",
  },
];

const PROFESSIONAL_SERVICES: IndustrySequence = [
  {
    step_number: 1,
    title: "Consult qualification and intake",
    why_first:
      "Consult qualification must be installed before more lead generation is recommended.",
    prerequisite_step_numbers: [],
    unblocks: ["proposal tracking", "scope control"],
    do_not_do_yet: ["Do not expand outbound before qualification is consistent."],
    leading_indicators: ["qualification rate", "consults per week"],
    owner_bottleneck_reduced: "Owner taking every discovery call.",
    client_safe_explanation:
      "RGS would install consult qualification before recommending more lead generation.",
    admin_sequencing_note: "Treat absence of qualification as a process gap.",
  },
  {
    step_number: 2,
    title: "Proposal tracking",
    why_first: "Proposal tracking must precede sales optimization.",
    prerequisite_step_numbers: [1],
    unblocks: ["scope control"],
    do_not_do_yet: ["Do not add sales tooling before proposal stages are tracked."],
    leading_indicators: ["proposal stage age", "proposal close rate"],
    owner_bottleneck_reduced: "Owner chasing proposal status from memory.",
    client_safe_explanation:
      "RGS would track proposals through stages so close rate has a baseline.",
    admin_sequencing_note: "Confirm CRM stages before approving sales-tooling changes.",
  },
  {
    step_number: 3,
    title: "Scope and change-request control",
    why_first:
      "Scope and change-request control must precede utilization fixes.",
    prerequisite_step_numbers: [1, 2],
    unblocks: ["utilization tracking", "delivery SOPs"],
    do_not_do_yet: ["Do not increase delivery capacity before scope is controlled."],
    leading_indicators: ["change requests per engagement", "scope creep flags"],
    owner_bottleneck_reduced: "Owner absorbing scope creep personally.",
    client_safe_explanation:
      "RGS would document scope and change-request control before utilization work.",
    admin_sequencing_note:
      "Operational scope discipline. No legal contract advice is provided.",
  },
  {
    step_number: 4,
    title: "Time tracking and utilization",
    why_first:
      "Time tracking and utilization must be visible before capacity planning.",
    prerequisite_step_numbers: [3],
    unblocks: ["delivery SOPs", "delegation"],
    do_not_do_yet: ["Do not hire before utilization is visible."],
    leading_indicators: ["billable utilization %", "non-billable drivers"],
    owner_bottleneck_reduced: "Owner billing the most hours personally.",
    client_safe_explanation:
      "RGS would surface billable utilization before recommending capacity changes.",
    admin_sequencing_note: "Operational utilization view. No labor-law guidance is provided.",
  },
  {
    step_number: 5,
    title: "AR, client concentration, and senior-knowledge transfer",
    why_first:
      "AR and client concentration visibility must precede growth decisions; senior expert knowledge transfer must precede scaling delivery.",
    prerequisite_step_numbers: [1, 2, 3, 4],
    unblocks: ["delegation", "scaling delivery"],
    do_not_do_yet: ["Do not pursue large new accounts before client concentration is visible."],
    leading_indicators: ["top-3 client concentration %", "AR days outstanding"],
    owner_bottleneck_reduced: "Owner is the only person who can deliver the senior work.",
    client_safe_explanation:
      "RGS would surface AR and client concentration as operational visibility, not a financial opinion.",
    admin_sequencing_note:
      "Operational AR and concentration visibility. No credit, collections, or legal advice is provided.",
  },
];

const ECOMMERCE: IndustrySequence = [
  {
    step_number: 1,
    title: "Margin after shipping, returns, fees, and ad cost",
    why_first:
      "Margin after shipping, returns, fees, and ad cost must be visible before scaling ads.",
    prerequisite_step_numbers: [],
    unblocks: ["ad scaling", "stockout response"],
    do_not_do_yet: ["Do not scale ad spend before contribution margin is visible."],
    leading_indicators: ["contribution margin per order", "blended ROAS"],
    owner_bottleneck_reduced: "Owner reading ad dashboards and guessing at true margin.",
    client_safe_explanation:
      "RGS would install contribution margin visibility before recommending ad scale.",
    admin_sequencing_note:
      "Operational margin review. No tax, sales-tax, or accounting determination is provided.",
  },
  {
    step_number: 2,
    title: "Stockout visibility",
    why_first: "Stockouts must be visible before paid traffic expansion.",
    prerequisite_step_numbers: [1],
    unblocks: ["purchasing changes"],
    do_not_do_yet: ["Do not increase paid traffic before stockouts are visible."],
    leading_indicators: ["stockout SKU count", "lost-sale flags"],
    owner_bottleneck_reduced: "Owner monitoring inventory by hand.",
    client_safe_explanation:
      "RGS would surface stockouts before recommending traffic expansion.",
    admin_sequencing_note: "Operational stockout visibility, not supplier negotiation.",
  },
  {
    step_number: 3,
    title: "Refund, return, and fulfillment-error tracking",
    why_first:
      "Refund and return reasons, plus fulfillment errors, must be tracked before product or customer-service optimization.",
    prerequisite_step_numbers: [1],
    unblocks: ["product optimization", "customer service playbook"],
    do_not_do_yet: ["Do not change product copy before return reasons are tracked."],
    leading_indicators: ["return reason mix", "fulfillment error rate"],
    owner_bottleneck_reduced: "Owner answering refund requests personally.",
    client_safe_explanation:
      "RGS would track return reasons and fulfillment errors before product optimization work.",
    admin_sequencing_note:
      "Operational quality view. No consumer-protection or warranty determination is provided.",
  },
  {
    step_number: 4,
    title: "Inventory sell-through and aging",
    why_first: "Sell-through and aging must be visible before purchasing changes.",
    prerequisite_step_numbers: [1, 2],
    unblocks: ["purchasing changes"],
    do_not_do_yet: ["Do not place larger POs before sell-through is visible."],
    leading_indicators: ["sell-through %", "aged inventory %"],
    owner_bottleneck_reduced: "Owner reordering by gut.",
    client_safe_explanation:
      "RGS would install sell-through and aging visibility before purchasing changes.",
    admin_sequencing_note:
      "Operational inventory visibility. No vendor or import advice is provided.",
  },
  {
    step_number: 5,
    title: "Platform, ad account, and supplier concentration; abandoned cart and email flows",
    why_first:
      "Platform, ad account, and supplier concentration must be visible before growth bets; abandoned cart and email flows come after product and margin basics are visible.",
    prerequisite_step_numbers: [1, 3, 4],
    unblocks: ["growth bets", "lifecycle email expansion"],
    do_not_do_yet: [
      "Do not place a single-platform growth bet before concentration is visible.",
      "Do not invest heavily in lifecycle email before product margin and return reasons are visible.",
    ],
    leading_indicators: ["share of revenue by platform", "supplier concentration %"],
    owner_bottleneck_reduced: "Owner depending on one platform or supplier.",
    client_safe_explanation:
      "RGS would surface platform, ad account, and supplier concentration before any single-channel growth bet.",
    admin_sequencing_note:
      "Operational concentration visibility. No investment, M&A, or platform-policy advice is provided.",
  },
];

const CANNABIS: IndustrySequence = [
  {
    step_number: 1,
    title: "Seed-to-sale reconciliation visibility",
    why_first:
      "Seed-to-sale reconciliation visibility must be installed before broader operational dashboards. This is operational documentation visibility, not a regulatory determination.",
    prerequisite_step_numbers: [],
    unblocks: ["inventory variance tracking", "cash controls"],
    do_not_do_yet: ["Do not roll out broader dashboards before seed-to-sale reconciliation is visible."],
    leading_indicators: ["reconciliation cadence", "open variance count"],
    owner_bottleneck_reduced: "Owner reconciling seed-to-sale by hand.",
    client_safe_explanation:
      "RGS would install seed-to-sale reconciliation visibility as operational documentation readiness.",
    admin_sequencing_note:
      "Operational documentation visibility only. RGS does not certify legal compliance, does not provide regulatory determination, and does not claim audit readiness.",
  },
  {
    step_number: 2,
    title: "Inventory variance and receiving / manifest checks",
    why_first:
      "Inventory variance tracking and receiving/manifest checks must precede vendor or process repair claims.",
    prerequisite_step_numbers: [1],
    unblocks: ["sales-floor process work", "documentation velocity"],
    do_not_do_yet: ["Do not change vendor process before variance is tracked."],
    leading_indicators: ["receiving variance %", "manifest match rate"],
    owner_bottleneck_reduced: "Owner verifying manifests personally.",
    client_safe_explanation:
      "RGS would track inventory variance and receiving checks as operational documentation visibility.",
    admin_sequencing_note:
      "RGS does not provide regulatory determination, does not provide legal determination, and does not certify compliance.",
  },
  {
    step_number: 3,
    title: "Cash controls",
    why_first:
      "Cash controls must be installed before financial confidence claims.",
    prerequisite_step_numbers: [1],
    unblocks: ["override and discount review", "documentation velocity"],
    do_not_do_yet: ["Do not draw conclusions about financial health before cash controls are documented."],
    leading_indicators: ["cash variance per shift", "deposit cadence"],
    owner_bottleneck_reduced: "Owner counting cash personally each shift.",
    client_safe_explanation:
      "RGS would install cash controls as operational documentation visibility, not a financial opinion.",
    admin_sequencing_note:
      "Operational cash control visibility only. No regulatory, legal, or audit determination is provided.",
  },
  {
    step_number: 4,
    title: "Override, discount, and void review",
    why_first:
      "Override, discount, and void review must precede sales-floor process changes.",
    prerequisite_step_numbers: [1, 3],
    unblocks: ["sales-floor process work"],
    do_not_do_yet: ["Do not change sales-floor procedures before overrides are reviewed."],
    leading_indicators: ["override frequency", "discount mix"],
    owner_bottleneck_reduced: "Owner reviewing every register override.",
    client_safe_explanation:
      "RGS would surface overrides, discounts, and voids as operational documentation visibility.",
    admin_sequencing_note:
      "Operational visibility only. No compliance, regulatory, or audit determination is provided.",
  },
  {
    step_number: 5,
    title: "Evidence vault completeness, document expiration, and documentation velocity",
    why_first:
      "Evidence vault completeness and document expiration deadline visibility must precede documentation-readiness claims, and documentation velocity must be tracked before relying on manual reminders.",
    prerequisite_step_numbers: [1, 2, 3, 4],
    unblocks: ["documentation velocity reporting"],
    do_not_do_yet: ["Do not rely on manual deadline reminders without documentation velocity tracking."],
    leading_indicators: ["document expiration timeline", "evidence vault completeness %"],
    owner_bottleneck_reduced: "Owner tracking document expirations on a paper calendar.",
    client_safe_explanation:
      "RGS would track evidence vault completeness and document expiration as operational documentation visibility.",
    admin_sequencing_note:
      "Operational documentation readiness visibility only. RGS does not certify legal compliance, does not provide regulatory determination, and does not claim audit certification.",
  },
];

const GENERAL: IndustrySequence = [
  {
    step_number: 1,
    title: "Inquiry and lead capture",
    why_first:
      "Inquiry and lead capture must be reliable before recommending demand work.",
    prerequisite_step_numbers: [],
    unblocks: ["follow-up cadence", "delivery visibility"],
    do_not_do_yet: ["Do not expand marketing before lead capture is consistent."],
    leading_indicators: ["leads logged per week", "speed-to-contact"],
    owner_bottleneck_reduced: "Owner remembering leads from email.",
    client_safe_explanation:
      "RGS would install consistent lead capture before recommending demand work.",
    admin_sequencing_note: "Confirm a single lead log before approving downstream work.",
  },
  {
    step_number: 2,
    title: "Follow-up cadence",
    why_first:
      "Follow-up cadence must be installed before conversion optimization is recommended.",
    prerequisite_step_numbers: [1],
    unblocks: ["delivery visibility"],
    do_not_do_yet: ["Do not optimize conversion before follow-up cadence exists."],
    leading_indicators: ["follow-up touches per lead", "stale-lead count"],
    owner_bottleneck_reduced: "Owner doing all follow-up personally.",
    client_safe_explanation:
      "RGS would document follow-up cadence so leads stop slipping through.",
    admin_sequencing_note:
      "Operational cadence work. No client-communication legal advice is provided.",
  },
  {
    step_number: 3,
    title: "Delivery and SOP visibility",
    why_first: "Delivery and SOP visibility must precede delegation.",
    prerequisite_step_numbers: [2],
    unblocks: ["delegation", "owner withdrawal"],
    do_not_do_yet: ["Do not delegate delivery before SOPs are documented."],
    leading_indicators: ["SOP coverage %", "exception count per week"],
    owner_bottleneck_reduced: "Owner being the only person who can deliver.",
    client_safe_explanation:
      "RGS would document delivery SOPs before recommending delegation.",
    admin_sequencing_note:
      "Operational SOP work. No employment or training-law advice is provided.",
  },
  {
    step_number: 4,
    title: "Margin and cash visibility",
    why_first:
      "Margin and cash visibility must exist before pricing or growth decisions.",
    prerequisite_step_numbers: [3],
    unblocks: ["pricing decisions", "growth decisions"],
    do_not_do_yet: ["Do not change pricing before margin is visible."],
    leading_indicators: ["gross margin %", "weekly cash on hand"],
    owner_bottleneck_reduced: "Owner pricing from intuition.",
    client_safe_explanation:
      "RGS would surface margin and cash as operational visibility, not an accounting opinion.",
    admin_sequencing_note:
      "Operational visibility. No accounting, tax, or audit determination is provided.",
  },
  {
    step_number: 5,
    title: "Decision rights and owner withdrawal",
    why_first:
      "Decision rights must be assigned before owner withdrawal is realistic.",
    prerequisite_step_numbers: [1, 2, 3, 4],
    unblocks: ["owner withdrawal", "Control System monitoring"],
    do_not_do_yet: ["Do not push owner withdrawal before decision rights are documented."],
    leading_indicators: ["owner intervention count", "exception escalations"],
    owner_bottleneck_reduced: "Owner remaining the named backup for everything.",
    client_safe_explanation:
      "RGS would document decision rights so the owner can step back from recurring exceptions.",
    admin_sequencing_note:
      "Decision-rights work. No HR, employment, or legal determination is provided.",
  },
];

export const INDUSTRY_IMPLEMENTATION_SEQUENCE: Record<MatrixIndustryKey, IndustrySequence> = {
  trades_home_services: TRADES,
  restaurant_food_service: RESTAURANT,
  retail: RETAIL,
  professional_services: PROFESSIONAL_SERVICES,
  ecommerce_online_retail: ECOMMERCE,
  cannabis_mmj_dispensary: CANNABIS,
  general_service_other: GENERAL,
};

/** Affirmative phrases that must NEVER appear in any sequencing copy. */
export const IMPLEMENTATION_FORBIDDEN_CLAIMS: ReadonlyArray<RegExp> = [
  /\bguarantee(d|s)?\s+(revenue|profit|growth|roi|valuation|compliance|outcomes?|results?)\b/i,
  /\bguaranteed\s+timeline\b/i,
  /\b2x\b|\b3x\b/i,
  /\bwe\s+(run|manage)\s+(your\s+)?business\b/i,
  /\blegal\s+compliance\s+achieved\b/i,
  /\baudit\s+certified\b/i,
  /\bvaluation\s+certified\b/i,
  /\bcompliance\s+certified\b/i,
  /\bunlimited\s+(support|consulting)\b/i,
  /\bdone[- ]for[- ]you\b/i,
  /\bhands[- ]off\s+for\s+the\s+owner\b/i,
];

/** Cannabis affirmative claims forbidden. Negated disclaimers remain allowed. */
export const IMPLEMENTATION_CANNABIS_AFFIRMATIVE_BLOCK: ReadonlyArray<RegExp> = [
  /\blegally\s+compliant\b/i,
  /\bcompliance\s+certified\b/i,
  /\bregulatory\s+safe\b/i,
  /\bguaranteed\s+compliant\b/i,
  /\blegally\s+verified\b/i,
  /\bsafe\s+harbor\s+achieved\b/i,
];

export function getIndustrySequence(industry: MatrixIndustryKey): IndustrySequence {
  return INDUSTRY_IMPLEMENTATION_SEQUENCE[industry];
}
