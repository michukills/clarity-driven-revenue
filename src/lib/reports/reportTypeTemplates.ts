// P65 — Report Generator Tiering / RGS report tier definitions.
//
// Single source of truth for what each RGS report tier includes, how
// deep it goes, what the public offer name is, what the scope boundary
// reads, and what is intentionally excluded. Used by the admin report
// generator UI, the PDF export, and the P65 contract test.
//
// Critical safety rules baked in here:
//   - Client-facing label for the SWOT-style section is always
//     "RGS Stability Snapshot" (never "SWOT Analysis").
//   - Fiverr tiers exclude the full 0–1000 Business Stability Scorecard
//     and the full five-gear flagship analysis unless the admin
//     explicitly selects `full_rgs_diagnostic`.
//   - All tiers carry the standard professional review disclaimer and
//     a tier-specific scope boundary in the PDF.

import type { ReportDraftType } from "./types";

export interface ReportTypeSection {
  key: string;
  title: string;
}

export interface ReportTypeTemplate {
  key: ReportDraftType;
  /** Internal admin label. */
  label: string;
  /** Public offer name shown to buyers / on Fiverr where applicable. */
  publicOfferName: string | null;
  /** Service lane this tier belongs to. */
  serviceLane: "diagnostic" | "implementation" | "rgs_control_system";
  /** True only for the flagship full RGS Diagnostic. */
  isFullRgsDiagnostic: boolean;
  /** Whether this tier may include the full 0–1000 Business Stability Scorecard. */
  includesFullScorecard: boolean;
  /** Whether this tier may include the full flagship five-gear analysis. */
  includesFullFiveGearAnalysis: boolean;
  /** Whether this tier includes the RGS Stability Snapshot (client-facing label). */
  includesRgsStabilitySnapshot: boolean;
  /** Whether this tier includes a Priority Repair Map (full or lite). */
  includesPriorityRepairMap: "full" | "lite" | "none";
  /** Whether this tier includes a 30 / 60 / 90 day roadmap. */
  includesThirtySixtyNinetyRoadmap: boolean;
  /** Whether this tier includes implementation readiness notes. */
  includesImplementationReadinessNotes: boolean;
  /** Approximate page length guidance (admin-only). */
  approxPageLength: string;
  /** Section list (in order) used to scaffold templates. */
  sections: ReportTypeSection[];
  /** Plain-English scope boundary appended to PDF + shown to admin. */
  scopeBoundary: string;
  /** Plain-English exclusion list (admin-facing & PDF). */
  exclusions: string[];
  /** Standard professional review disclaimer for this tier (PDF). */
  professionalDisclaimer: string;
}

/** Standard disclaimer reused across every tier. Plain RGS voice. */
const STANDARD_PROFESSIONAL_DISCLAIMER =
  "This report is a diagnostic read of the business based on the information " +
  "available at the time of review. It is not legal, tax, accounting, HR, " +
  "payroll, insurance, or compliance advice. Findings should be validated " +
  "against business records and reviewed with qualified professionals where " +
  "required before major action. The owner keeps final decision authority.";

const FULL_RGS_SECTIONS: ReportTypeSection[] = [
  { key: "executive_summary", title: "Executive Summary" },
  { key: "business_context", title: "Business Context" },
  { key: "primary_offer_reviewed", title: "Primary Offer / Product / Service Reviewed" },
  { key: "full_business_stability_scorecard", title: "Full 0–1000 Business Stability Scorecard" },
  { key: "demand_generation_gear_analysis", title: "Demand Generation Gear Analysis" },
  { key: "revenue_conversion_gear_analysis", title: "Revenue Conversion Gear Analysis" },
  { key: "operational_efficiency_gear_analysis", title: "Operational Efficiency Gear Analysis" },
  { key: "financial_visibility_gear_analysis", title: "Financial Visibility Gear Analysis" },
  { key: "owner_independence_gear_analysis", title: "Owner Independence Gear Analysis" },
  { key: "evidence_based_findings", title: "Evidence-Based Findings" },
  { key: "rgs_stability_snapshot", title: "RGS Stability Snapshot" },
  { key: "priority_repair_map", title: "Priority Repair Map" },
  { key: "diagnostic_conclusions", title: "Diagnostic Conclusions" },
  { key: "implementation_readiness_notes", title: "Implementation Readiness Notes" },
  { key: "recommended_next_steps", title: "Recommended Next Steps" },
  { key: "clarification_window_terms", title: "Clarification Window Terms" },
  { key: "scope_boundary", title: "Scope Boundary / What This Does Not Include" },
  { key: "professional_review_disclaimer", title: "Legal / Professional Review Disclaimer" },
];

const FIVERR_BASIC_SECTIONS: ReportTypeSection[] = [
  { key: "executive_snapshot", title: "Executive Snapshot" },
  { key: "business_offer_reviewed", title: "Business / Offer Reviewed" },
  { key: "top_3_revenue_leaks", title: "Top 3 Revenue Leaks" },
  { key: "quick_stability_observations", title: "Quick Stability Observations" },
  { key: "buyer_journey_conversion_friction_notes", title: "Buyer Journey / Conversion Friction Notes" },
  { key: "simple_priority_action_plan", title: "Simple Priority Action Plan" },
  { key: "what_this_does_not_include", title: "What This Does Not Include" },
  { key: "optional_next_step", title: "Optional Next Step" },
];

const FIVERR_STANDARD_SECTIONS: ReportTypeSection[] = [
  { key: "executive_summary", title: "Executive Summary" },
  { key: "business_offer_reviewed", title: "Business / Offer Reviewed" },
  { key: "current_revenue_path_overview", title: "Current Revenue Path Overview" },
  { key: "demand_generation_observations", title: "Demand Generation Observations" },
  { key: "revenue_conversion_observations", title: "Revenue Conversion Observations" },
  { key: "operational_efficiency_observations", title: "Operational Efficiency Observations" },
  { key: "financial_visibility_observations", title: "Financial Visibility Observations" },
  { key: "owner_independence_observations", title: "Owner Independence Observations" },
  { key: "top_5_7_system_leaks_or_bottlenecks", title: "Top 5–7 System Leaks or Bottlenecks" },
  { key: "priority_repair_map_lite", title: "Priority Repair Map Lite" },
  { key: "thirty_day_action_recommendations", title: "30-Day Action Recommendations" },
  { key: "scope_boundaries_what_this_does_not_include", title: "Scope Boundaries / What This Does Not Include" },
  { key: "optional_next_step", title: "Optional Next Step" },
];

const FIVERR_PREMIUM_SECTIONS: ReportTypeSection[] = [
  { key: "executive_summary", title: "Executive Summary" },
  { key: "business_context_offer_reviewed", title: "Business Context / Offer Reviewed" },
  { key: "revenue_path_overview", title: "Revenue Path Overview" },
  { key: "demand_generation_review", title: "Demand Generation Review" },
  { key: "revenue_conversion_review", title: "Revenue Conversion Review" },
  { key: "operational_efficiency_review", title: "Operational Efficiency Review" },
  { key: "financial_visibility_review", title: "Financial Visibility Review" },
  { key: "owner_independence_review", title: "Owner Independence Review" },
  { key: "rgs_stability_snapshot", title: "RGS Stability Snapshot" },
  { key: "top_system_leaks_bottlenecks", title: "Top System Leaks / Bottlenecks" },
  { key: "priority_repair_map", title: "Priority Repair Map" },
  { key: "thirty_sixty_ninety_day_action_roadmap", title: "30 / 60 / 90-Day Action Roadmap" },
  { key: "owner_decision_notes", title: "Owner Decision Notes" },
  { key: "risks_if_left_unfixed", title: "Risks If Left Unfixed" },
  { key: "recommended_next_steps", title: "Recommended Next Steps" },
  { key: "scope_boundary_what_this_does_not_include", title: "Scope Boundary / What This Does Not Include" },
  { key: "disclaimer_professional_review_language", title: "Disclaimer / Professional Review Language" },
];

const IMPLEMENTATION_SECTIONS: ReportTypeSection[] = [
  { key: "implementation_summary", title: "Implementation Summary" },
  { key: "diagnostic_findings_being_addressed", title: "Diagnostic Findings Being Addressed" },
  { key: "priority_system_repairs", title: "Priority System Repairs" },
  { key: "implementation_roadmap", title: "Implementation Roadmap" },
  { key: "sop_workflow_decision_rights_needs", title: "SOP / Workflow / Decision Rights Needs" },
  { key: "owner_responsibilities", title: "Owner Responsibilities" },
  { key: "rgs_role_boundaries", title: "RGS Role Boundaries" },
  { key: "timeline_phase_notes", title: "Timeline / Phase Notes" },
  { key: "risks_dependencies", title: "Risks / Dependencies" },
  { key: "recommended_next_steps", title: "Recommended Next Steps" },
  { key: "scope_boundary_what_this_does_not_include", title: "Scope Boundary / What This Does Not Include" },
  { key: "professional_review_disclaimer", title: "Professional Review Disclaimer" },
];

/** Tier-specific scope boundary — appears in the admin UI and the PDF. */
const FULL_RGS_SCOPE_BOUNDARY =
  "The Full RGS Diagnostic is a deep, evidence-based diagnostic only. It is " +
  "not implementation, not custom builds, not ongoing advisory, and not RGS " +
  "operating the business. Implementation and the RGS Control System™ are " +
  "separate engagements purchased separately.";

const FIVERR_BASIC_SCOPE_BOUNDARY =
  "Business Revenue Leak Snapshot — a bounded Fiverr diagnostic for one " +
  "business and one primary offer or revenue path. It is not the Full RGS " +
  "Diagnostic, not implementation, not SOP creation, not financial modeling, " +
  "not dashboard or software setup, and not ongoing advisory. Optional short " +
  "written clarification is included only if the package specifies it.";

const FIVERR_STANDARD_SCOPE_BOUNDARY =
  "Business Revenue & Operations Diagnostic — a bounded Fiverr diagnostic. " +
  "It is meaningfully deeper than the Basic snapshot but is not the Full RGS " +
  "Diagnostic. It does not include the full 0–1000 Business Stability " +
  "Scorecard, full implementation, custom SOP creation, software or " +
  "dashboard build, or ongoing advisory.";

const FIVERR_PREMIUM_SCOPE_BOUNDARY =
  "Business Stability Diagnostic & Revenue Repair Map — a premium Fiverr " +
  "diagnostic. It includes the RGS Stability Snapshot, a Priority Repair " +
  "Map, and a 30 / 60 / 90 day action roadmap. It is intentionally bounded: " +
  "it is not the Full RGS Diagnostic Report, does not include implementation, " +
  "custom SOP creation, software or dashboard build, or ongoing advisory.";

const IMPLEMENTATION_SCOPE_BOUNDARY =
  "Implementation Report / Roadmap — project-based system installation " +
  "support planning. It is not indefinite or unlimited support, not RGS " +
  "operating the business, and not the RGS Control System™ subscription " +
  "lane. Activities outside the agreed scope are out of scope.";

const FULL_RGS_EXCLUSIONS = [
  "Implementation, custom builds, and ongoing advisory are separate.",
  "RGS does not operate the business.",
  "Not legal, tax, accounting, HR, payroll, insurance, or compliance advice.",
  "No guaranteed revenue, ROI, renewal, compliance, or business outcome.",
];

const FIVERR_BASIC_EXCLUSIONS = [
  "No full 0–1000 Business Stability Scorecard.",
  "No full five-gear diagnostic scoring.",
  "No implementation, SOP creation, dashboards, or software setup.",
  "No ongoing advisory and no revision loop beyond the package terms.",
  "Not legal, tax, accounting, HR, or compliance advice.",
  "No promise of revenue outcome.",
];

const FIVERR_STANDARD_EXCLUSIONS = [
  "No full 0–1000 Business Stability Scorecard.",
  "No full implementation roadmap and no SOP / training bible build.",
  "No custom tool, dashboard, or software build.",
  "No ongoing advisory and no revision loop beyond the package terms.",
  "Not legal, tax, accounting, HR, or compliance advice.",
  "No guarantee of revenue improvement.",
];

const FIVERR_PREMIUM_EXCLUSIONS = [
  "Not the Full RGS Diagnostic Report.",
  "No full 0–1000 Business Stability Scorecard unless explicitly enabled.",
  "No implementation, custom SOP creation, dashboards, or software build.",
  "No ongoing advisory and no revision loop beyond the package terms.",
  "Not legal, tax, accounting, HR, or compliance advice.",
  "No guarantee of revenue or business outcome.",
];

const IMPLEMENTATION_EXCLUSIONS = [
  "Not indefinite support and not RGS operating the business.",
  "Not emergency support; activities follow the agreed plan.",
  "Not legal, tax, accounting, HR, payroll, insurance, or compliance advice.",
  "No guaranteed outcome.",
];

export const REPORT_TYPE_TEMPLATES: Record<ReportDraftType, ReportTypeTemplate> = {
  // ─── P65 tiers ──────────────────────────────────────────────────────────
  full_rgs_diagnostic: {
    key: "full_rgs_diagnostic",
    label: "Full RGS Diagnostic Report",
    publicOfferName: "Full RGS Diagnostic",
    serviceLane: "diagnostic",
    isFullRgsDiagnostic: true,
    includesFullScorecard: true,
    includesFullFiveGearAnalysis: true,
    includesRgsStabilitySnapshot: true,
    includesPriorityRepairMap: "full",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: true,
    approxPageLength: "Approximately 20–40+ pages.",
    sections: FULL_RGS_SECTIONS,
    scopeBoundary: FULL_RGS_SCOPE_BOUNDARY,
    exclusions: FULL_RGS_EXCLUSIONS,
    professionalDisclaimer: STANDARD_PROFESSIONAL_DISCLAIMER,
  },
  fiverr_basic_diagnostic: {
    key: "fiverr_basic_diagnostic",
    label: "Fiverr Basic Diagnostic",
    publicOfferName: "Business Revenue Leak Snapshot",
    serviceLane: "diagnostic",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: false,
    includesPriorityRepairMap: "none",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: false,
    approxPageLength: "Approximately 3–5 pages.",
    sections: FIVERR_BASIC_SECTIONS,
    scopeBoundary: FIVERR_BASIC_SCOPE_BOUNDARY,
    exclusions: FIVERR_BASIC_EXCLUSIONS,
    professionalDisclaimer: STANDARD_PROFESSIONAL_DISCLAIMER,
  },
  fiverr_standard_diagnostic: {
    key: "fiverr_standard_diagnostic",
    label: "Fiverr Standard Diagnostic",
    publicOfferName: "Business Revenue & Operations Diagnostic",
    serviceLane: "diagnostic",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: false,
    includesPriorityRepairMap: "lite",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: false,
    approxPageLength: "Approximately 6–10 pages.",
    sections: FIVERR_STANDARD_SECTIONS,
    scopeBoundary: FIVERR_STANDARD_SCOPE_BOUNDARY,
    exclusions: FIVERR_STANDARD_EXCLUSIONS,
    professionalDisclaimer: STANDARD_PROFESSIONAL_DISCLAIMER,
  },
  fiverr_premium_diagnostic: {
    key: "fiverr_premium_diagnostic",
    label: "Fiverr Premium Diagnostic",
    publicOfferName: "Business Stability Diagnostic & Revenue Repair Map",
    serviceLane: "diagnostic",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: true,
    includesPriorityRepairMap: "full",
    includesThirtySixtyNinetyRoadmap: true,
    includesImplementationReadinessNotes: false,
    approxPageLength: "Approximately 12–18 pages.",
    sections: FIVERR_PREMIUM_SECTIONS,
    scopeBoundary: FIVERR_PREMIUM_SCOPE_BOUNDARY,
    exclusions: FIVERR_PREMIUM_EXCLUSIONS,
    professionalDisclaimer: STANDARD_PROFESSIONAL_DISCLAIMER,
  },
  implementation_report: {
    key: "implementation_report",
    label: "Implementation Report / Roadmap",
    publicOfferName: "Implementation Report / Roadmap",
    serviceLane: "implementation",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: false,
    includesPriorityRepairMap: "full",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: true,
    approxPageLength: "Variable; typically 8–20 pages depending on scope.",
    sections: IMPLEMENTATION_SECTIONS,
    scopeBoundary: IMPLEMENTATION_SCOPE_BOUNDARY,
    exclusions: IMPLEMENTATION_EXCLUSIONS,
    professionalDisclaimer: STANDARD_PROFESSIONAL_DISCLAIMER,
  },

  // ─── Pre-P65 / legacy types — preserved for back-compat ─────────────────
  diagnostic: {
    key: "diagnostic",
    label: "Business Diagnostic Report (legacy)",
    publicOfferName: null,
    serviceLane: "diagnostic",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: true,
    includesPriorityRepairMap: "full",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: true,
    approxPageLength: "Variable.",
    sections: [],
    scopeBoundary: FULL_RGS_SCOPE_BOUNDARY,
    exclusions: FULL_RGS_EXCLUSIONS,
    professionalDisclaimer: STANDARD_PROFESSIONAL_DISCLAIMER,
  },
  scorecard: {
    key: "scorecard",
    label: "Stability / Scorecard Report (legacy)",
    publicOfferName: null,
    serviceLane: "diagnostic",
    isFullRgsDiagnostic: false,
    includesFullScorecard: true,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: true,
    includesPriorityRepairMap: "lite",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: false,
    approxPageLength: "Variable.",
    sections: [],
    scopeBoundary: FULL_RGS_SCOPE_BOUNDARY,
    exclusions: FULL_RGS_EXCLUSIONS,
    professionalDisclaimer: STANDARD_PROFESSIONAL_DISCLAIMER,
  },
  rcc_summary: {
    key: "rcc_summary",
    label: "Revenue Control Summary (legacy)",
    publicOfferName: null,
    serviceLane: "rgs_control_system",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: true,
    includesPriorityRepairMap: "lite",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: false,
    approxPageLength: "Variable.",
    sections: [],
    scopeBoundary: FULL_RGS_SCOPE_BOUNDARY,
    exclusions: FULL_RGS_EXCLUSIONS,
    professionalDisclaimer: STANDARD_PROFESSIONAL_DISCLAIMER,
  },
  implementation_update: {
    key: "implementation_update",
    label: "Implementation Progress Update (legacy)",
    publicOfferName: null,
    serviceLane: "implementation",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: false,
    includesPriorityRepairMap: "lite",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: true,
    approxPageLength: "Variable.",
    sections: [],
    scopeBoundary: IMPLEMENTATION_SCOPE_BOUNDARY,
    exclusions: IMPLEMENTATION_EXCLUSIONS,
    professionalDisclaimer: STANDARD_PROFESSIONAL_DISCLAIMER,
  },
};

/** P65 tier values (the five new RGS report tiers). */
export const P65_REPORT_TIER_KEYS = [
  "full_rgs_diagnostic",
  "fiverr_basic_diagnostic",
  "fiverr_standard_diagnostic",
  "fiverr_premium_diagnostic",
  "implementation_report",
] as const satisfies readonly ReportDraftType[];

/** Public offer names — keep in sync with marketing copy. */
export const P65_PUBLIC_OFFER_NAMES = {
  full_rgs_diagnostic: "Full RGS Diagnostic",
  fiverr_basic_diagnostic: "Business Revenue Leak Snapshot",
  fiverr_standard_diagnostic: "Business Revenue & Operations Diagnostic",
  fiverr_premium_diagnostic: "Business Stability Diagnostic & Revenue Repair Map",
  implementation_report: "Implementation Report / Roadmap",
} as const;

/** Helper used by the admin UI to flag bounded Fiverr tiers. */
export function isBoundedFiverrTier(t: ReportDraftType): boolean {
  return (
    t === "fiverr_basic_diagnostic" ||
    t === "fiverr_standard_diagnostic" ||
    t === "fiverr_premium_diagnostic"
  );
}

export function getReportTypeTemplate(t: ReportDraftType): ReportTypeTemplate {
  return REPORT_TYPE_TEMPLATES[t];
}