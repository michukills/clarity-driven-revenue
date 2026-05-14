/**
 * P93E-E2G-P4 — Professional Services FindingCalibration seeds.
 *
 * Industry-specific finding shapes the future report builder will hydrate
 * from `industry_diagnostic_responses` for service-firm accounts. Each finding
 * is evidence-aware: when supporting evidence is missing, the report layer
 * must downgrade the finding to a structured interview claim or owner
 * estimate rather than overstating certainty.
 */
import type { FindingCalibration } from "../depthStandard";

export const PROFESSIONAL_SERVICES_FINDING_CALIBRATIONS: FindingCalibration[] = [
  {
    key: "prosvc.pipeline_discipline_gap",
    industry: "professional_services",
    gear: "demand",
    finding_title: "Pipeline is not tracked with stage, owner, and next step",
    why_it_matters:
      "When pipeline lives in someone's head or a stale spreadsheet, the firm can't see which deals are real, which are stalled, and which are about to slip — so revenue planning is reactive.",
    evidence_supports: [
      "CRM pipeline export (HubSpot / Salesforce / Pipedrive)",
      "Lead source field populated for last 90 days",
      "Stage history with last-touch date",
    ],
    evidence_missing_means:
      "Without a current CRM export with stage and last-touch fields, pipeline discipline is reported as a structured interview claim, not a measured KPI.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "pipeline_discipline_install",
    client_safe_explanation:
      "Pipeline stage, owner, and next follow-up are not consistently captured, which limits forecast accuracy and slows recovery on stalled opportunities.",
    admin_only_interpretation:
      "If owner cannot name top 5 open opportunities + close date + next step from memory, treat any close-rate or pipeline claim as owner estimate.",
  },
  {
    key: "prosvc.proposal_followup_gap",
    industry: "professional_services",
    gear: "sales",
    finding_title: "Proposal follow-up has no defined cadence or owner",
    why_it_matters:
      "Most lost professional-services revenue is not lost on the merits — it's lost to silence after the proposal. Without a cadence, deals quietly age out.",
    evidence_supports: [
      "90-day proposal log with status and last-touch date",
      "CRM activity history on proposal-stage deals",
    ],
    evidence_missing_means:
      "Without a proposal log and last-touch dates, follow-up discipline is reported as a structured interview claim.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "proposal_followup_cadence_install",
    client_safe_explanation:
      "Follow-up after a proposal is sent is not on a defined cadence with a clear owner, which limits recovery on otherwise winnable engagements.",
  },
  {
    key: "prosvc.scope_creep_leakage",
    industry: "professional_services",
    gear: "operations",
    finding_title: "Out-of-scope work is delivered without change orders",
    why_it_matters:
      "When 'small favors' for clients aren't tracked as change orders, time and margin leak invisibly — and the team gets blamed for being slow on the work that was actually scoped.",
    evidence_supports: [
      "Recent signed SOW / engagement letter",
      "Change orders for the last 90 days",
      "Time tracking by person × project",
    ],
    evidence_missing_means:
      "Without SOWs and a change-order log, scope creep impact is owner intuition only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "change_order_discipline_install",
    client_safe_explanation:
      "Work outside the original scope is sometimes delivered without a change order, which limits margin protection and delivery predictability.",
    admin_only_interpretation:
      "If 'we just helped them' is the pattern, scope creep is bleeding margin invisibly even when the team feels productive.",
  },
  {
    key: "prosvc.utilization_visibility_gap",
    industry: "professional_services",
    gear: "operations",
    finding_title: "Billable vs. non-billable time is not measured",
    why_it_matters:
      "Without utilization visibility, the firm cannot tell whether the team is busy with billable work or busy with internal work — and capacity decisions become guesswork.",
    evidence_supports: [
      "Time tracking by person × project, last 30 days",
      "Utilization report by person",
    ],
    evidence_missing_means:
      "Without time-tracking records, utilization is a structured interview claim, not a measured rate.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "utilization_visibility_install",
    client_safe_explanation:
      "Billable vs. non-billable time is not consistently measured by person, which limits capacity planning and pricing decisions.",
  },
  {
    key: "prosvc.effective_hourly_rate_blind_spot",
    industry: "professional_services",
    gear: "financial",
    finding_title: "Effective hourly rate by engagement is not visible",
    why_it_matters:
      "Two engagements with identical revenue can earn very different effective hourly rates. Without that visibility, the firm sells more of the wrong work and treats high-revenue clients as high-margin.",
    evidence_supports: [
      "Time tracking by person × project",
      "Project margin = revenue − labor cost",
      "Revenue by service line",
    ],
    evidence_missing_means:
      "Without per-project hours and revenue, effective hourly rate is owner intuition only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "effective_rate_visibility_install",
    client_safe_explanation:
      "Effective hourly rate is not yet visible by engagement, which limits decisions about pricing, scope, and which work to prioritize.",
  },
  {
    key: "prosvc.owner_delivery_bottleneck",
    industry: "professional_services",
    gear: "owner_independence",
    finding_title: "Client delivery still depends on the owner",
    why_it_matters:
      "When the owner is on most engagements, capacity is capped at one calendar and quality depends on one person — so growth and time-off both create immediate risk.",
    evidence_supports: [
      "Time tracking by person × project showing owner hours",
      "Org chart with delivery ownership",
      "Owner calendar — 2 representative weeks",
    ],
    evidence_missing_means:
      "Without delivery hours and an org chart, owner-delivery dependency is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "owner_dependency",
    owner_independence_lift: "high",
    cash_control_impact: "medium",
    repair_map_trigger: "delivery_team_capability_install",
    client_safe_explanation:
      "Most active engagements still depend on the owner for delivery, which limits both capacity and the ability to take time away.",
    admin_only_interpretation:
      "Owner-on-everything = bottleneck even when the team is technically capable; treat any 'team can run it' claim with skepticism until evidence shows otherwise.",
  },
  {
    key: "prosvc.owner_sales_bottleneck",
    industry: "professional_services",
    gear: "demand",
    finding_title: "New business depends on the owner's personal network",
    why_it_matters:
      "When most leads come through the owner's relationships, a quiet stretch of personal activity becomes a quiet quarter of revenue — and no one else can fill the gap.",
    evidence_supports: [
      "CRM pipeline with lead-source field",
      "Top lead source share, last 90 days",
      "Referral-source list",
    ],
    evidence_missing_means:
      "Without lead-source data, owner-network dependency is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "owner_dependency",
    owner_independence_lift: "high",
    cash_control_impact: "medium",
    repair_map_trigger: "owner_sales_bottleneck_relief",
    client_safe_explanation:
      "A high share of new business currently depends on the owner's personal network, which limits demand resilience when the owner is heads-down on delivery.",
  },
  {
    key: "prosvc.client_onboarding_weakness",
    industry: "professional_services",
    gear: "operations",
    finding_title: "Each new client starts a little differently",
    why_it_matters:
      "Inconsistent onboarding sets the tone for the whole engagement. Forgotten setup steps cause rework, missed deadlines, and lower client confidence in the first 30 days.",
    evidence_supports: [
      "Client onboarding checklist document",
      "Kickoff checklist document",
      "Sample kickoff documents from last 3 new clients",
    ],
    evidence_missing_means:
      "Without written onboarding and kickoff checklists, onboarding consistency is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "low",
    repair_map_trigger: "client_onboarding_install",
    client_safe_explanation:
      "Client onboarding and kickoff are not driven by a written checklist, which limits a consistent first-30-day experience for new clients.",
  },
  {
    key: "prosvc.project_profitability_gap",
    industry: "professional_services",
    gear: "financial",
    finding_title: "Project profitability is not visible",
    why_it_matters:
      "Knowing project revenue without project cost steers the firm toward volume, not profit. Two projects with identical fees can earn very different margins.",
    evidence_supports: [
      "Project margin report (revenue − labor cost − pass-through)",
      "Time tracking by person × project",
      "Pass-through cost records",
    ],
    evidence_missing_means:
      "Without cost and hour data per project, project profitability is owner intuition only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "project_margin_visibility_install",
    client_safe_explanation:
      "Profitability by project is not yet visible, which limits decisions about pricing, scope, and which work to grow.",
  },
  {
    key: "prosvc.ar_billing_cadence_risk",
    industry: "professional_services",
    gear: "financial",
    finding_title: "Billing cadence and collections rely on the owner",
    why_it_matters:
      "When invoicing waits for a 'good stopping point' and collections depend on the owner chasing them personally, cash arrives late and operating decisions get tighter than they need to be.",
    evidence_supports: [
      "AR Aging Summary",
      "Invoice aging by client",
      "Billing cadence per client (milestone / monthly / hourly)",
    ],
    evidence_missing_means:
      "Without AR aging and a billing cadence record, billing and collections discipline is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "cash",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "billing_cadence_install",
    client_safe_explanation:
      "Invoicing timing and collections follow-up are not on a defined cadence with a clear owner, which limits cash-flow predictability.",
  },
  {
    key: "prosvc.client_concentration_risk",
    industry: "professional_services",
    gear: "financial",
    finding_title: "Top client represents a high share of revenue",
    why_it_matters:
      "Concentration looks like loyalty until it doesn't. A 25%+ top-client share means a single budget change, leadership change, or scope pause becomes a firm-wide cash event.",
    evidence_supports: [
      "Top 10 clients by revenue, trailing 12 months",
      "Signed backlog list",
    ],
    evidence_missing_means:
      "Without revenue concentration data, client concentration is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "client_concentration_diversification",
    client_safe_explanation:
      "A meaningful share of revenue currently comes from one client, which limits resilience if that relationship pauses or shifts.",
    admin_only_interpretation:
      "Top-client share ≥25% is concentration risk regardless of how strong the relationship feels.",
  },
  {
    key: "prosvc.delivery_standards_gap",
    industry: "professional_services",
    gear: "owner_independence",
    finding_title: "Delivery quality depends on who performs the work",
    why_it_matters:
      "When standards live in the owner's head, quality swings with the calendar. New hires take longer to ramp, reviews bottleneck on the owner, and clients notice the inconsistency.",
    evidence_supports: [
      "Delivery SOPs / playbooks for top service lines",
      "Pre-delivery QA checklist",
      "Sample reviewed deliverables with comments",
    ],
    evidence_missing_means:
      "Without written SOPs and a QA checklist, delivery standards are a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "growth_drag",
    owner_independence_lift: "high",
    cash_control_impact: "medium",
    repair_map_trigger: "delivery_standards_install",
    client_safe_explanation:
      "Delivery quality is not yet anchored in written standards, which limits consistency across team members and engagements.",
  },
  {
    key: "prosvc.capacity_planning_gap",
    industry: "professional_services",
    gear: "operations",
    finding_title: "Capacity is felt, not measured",
    why_it_matters:
      "Without a real capacity model, the firm either turns down work it could deliver or over-commits — both of which cost real money over a quarter.",
    evidence_supports: [
      "Utilization report by person",
      "Signed backlog list",
      "Time tracking by person × project",
    ],
    evidence_missing_means:
      "Without utilization and backlog data, capacity is owner intuition only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "capacity_planning_install",
    client_safe_explanation:
      "Team capacity is currently judged by feel rather than by a model, which limits confident decisions about new engagements and hiring.",
  },
  {
    key: "prosvc.retainer_project_mix_risk",
    industry: "professional_services",
    gear: "financial",
    finding_title: "Revenue is mostly project-based with limited recurring base",
    why_it_matters:
      "Project-heavy mix means cash flow shifts every time a project ends. A modest recurring retainer base smooths cash and reduces sales pressure each quarter.",
    evidence_supports: [
      "Active retainer list with monthly value",
      "Revenue by service line",
      "Backlog list",
    ],
    evidence_missing_means:
      "Without a retainer list and backlog, recurring share is owner intuition only.",
    confidence_floor: "medium",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "retainer_conversion_program",
    client_safe_explanation:
      "Recurring retainer revenue is a small share of the mix, which limits cash-flow stability between projects.",
  },
  {
    key: "prosvc.client_escalation_dependency",
    industry: "professional_services",
    gear: "owner_independence",
    finding_title: "Client escalations route directly to the owner",
    why_it_matters:
      "When unhappy clients always call the owner, every operational issue becomes an owner issue — and there is no defined first response that the team can own.",
    evidence_supports: [
      "Escalation path / decision-rights document",
      "Recent escalation log or examples",
    ],
    evidence_missing_means:
      "Without a written escalation path, escalation dependency is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "owner_dependency",
    owner_independence_lift: "high",
    cash_control_impact: "low",
    repair_map_trigger: "escalation_path_install",
    client_safe_explanation:
      "Client escalations currently route to the owner by default, which limits team ownership of resolution and the owner's ability to step back.",
  },
];
