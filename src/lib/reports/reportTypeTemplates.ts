// P65 — Report Generator Tiering / RGS report tier definitions.
//
// Single source of truth for what each RGS report tier includes, how
// deep it goes, what the public offer/package name is, what the scope
// boundary reads, and what is intentionally excluded. Used by the admin
// report generator UI, the PDF export, and report safety tests.
//
// Critical safety rules baked in here:
//   - Client-facing label for the SWOT-style section is always
//     "RGS Stability Snapshot" (never "SWOT Analysis").
//   - Fiverr tiers are clearly separated from the full RGS paying-client
//     report. They can show the score/gear summary their package promises,
//     but they do not receive flagship-only sections unless the admin
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
  /** Exact report name rendered on PDFs and client-safe artifacts. */
  reportName: string;
  /** Package/offer name where this report is sold as a package. */
  packageName: string | null;
  /** Public offer name shown to buyers / on Fiverr where applicable. */
  publicOfferName: string | null;
  /** Clear separation between standalone/Fiverr and full RGS client reports. */
  reportWorld:
    | "fiverr_standalone_diagnostic"
    | "full_rgs_client_diagnostic"
    | "implementation"
    | "legacy"
    | "tool_specific";
  /** Short package description when sold as a Fiverr / standalone offer. */
  shortPackageDescription: string | null;
  /** Target delivery time for packaged Fiverr/standalone diagnostic reports. */
  expectedDeliveryDays: number | null;
  /** Minimum walkthrough/clarification call length when package terms require it. */
  walkthroughMinutes: number | null;
  /** Admin-only pricing target/guidance. */
  priceTarget: string | null;
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
  { key: "source_of_truth_notes", title: "Source-of-Truth Notes" },
  { key: "rgs_stability_snapshot", title: "RGS Stability Snapshot" },
  { key: "worn_tooth_signals", title: "Worn Tooth Signals" },
  { key: "reality_check_flags", title: "Reality Check Flags" },
  { key: "cost_of_friction", title: "Cost of Friction Findings" },
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
  { key: "business_metadata", title: "Client / Business Metadata" },
  { key: "overall_0_1000_score", title: "Overall 0–1000 Score" },
  { key: "high_level_gear_score_summary", title: "High-Level Gear Score Summary" },
  { key: "key_weak_points", title: "3–5 Key Weak Points" },
  { key: "short_rgs_stability_snapshot", title: "Short RGS Stability Snapshot" },
  { key: "basic_next_steps", title: "Basic Next Steps" },
  { key: "scope_boundary", title: "Scope Boundary / High-Level Review Limits" },
];

const FIVERR_STANDARD_SECTIONS: ReportTypeSection[] = [
  { key: "executive_summary", title: "Executive Summary" },
  { key: "business_metadata", title: "Client / Business Metadata" },
  { key: "score_breakdown_0_1000", title: "0–1000 Score Breakdown" },
  { key: "demand_generation_explanation", title: "Demand Generation Explanation" },
  { key: "revenue_conversion_explanation", title: "Revenue Conversion Explanation" },
  { key: "operational_efficiency_explanation", title: "Operational Efficiency Explanation" },
  { key: "financial_visibility_explanation", title: "Financial Visibility Explanation" },
  { key: "owner_independence_explanation", title: "Owner Independence Explanation" },
  { key: "top_system_leaks", title: "Top System Leaks" },
  { key: "top_3_priorities", title: "Top 3 Priorities" },
  { key: "rgs_stability_snapshot", title: "RGS Stability Snapshot" },
  { key: "basic_repair_recommendations", title: "Basic Repair Recommendations" },
  { key: "scope_boundary", title: "Scope Boundary / What This Does Not Include" },
];

const FIVERR_PREMIUM_SECTIONS: ReportTypeSection[] = [
  { key: "executive_summary", title: "Executive Summary" },
  { key: "business_metadata", title: "Client / Business Metadata" },
  { key: "full_diagnostic_summary", title: "Full Diagnostic Summary" },
  { key: "rgs_stability_snapshot", title: "RGS Stability Snapshot" },
  { key: "root_cause_notes", title: "Root-Cause Notes" },
  { key: "revenue_time_operational_leak_analysis", title: "Revenue / Time / Operational Leak Analysis" },
  { key: "priority_repair_roadmap", title: "Priority Repair Roadmap" },
  { key: "quick_wins", title: "Quick Wins" },
  { key: "big_rocks", title: "Big Rocks" },
  { key: "fillers", title: "Fillers" },
  { key: "de_prioritize", title: "De-Prioritize" },
  { key: "fix_sequence", title: "What to Fix First, Second, and Later" },
  { key: "risks_if_left_unfixed", title: "Risks If Left Unfixed" },
  { key: "evidence_gaps_clarification_needs", title: "Evidence Gaps / Clarification Needs" },
  { key: "recommended_next_steps", title: "Recommended Next Steps" },
  { key: "scope_boundary", title: "Scope Boundary / What This Does Not Include" },
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
  "The Full RGS Business Stability Diagnostic Report is the flagship RGS " +
  "paid-client diagnostic deliverable. It is deeper than the Fiverr / " +
  "standalone reports, but it is still diagnostic only: not implementation, " +
  "not custom builds, not ongoing advisory, and not RGS operating the business. " +
  "Implementation and the RGS Control System™ are separate engagements.";

const FIVERR_BASIC_SCOPE_BOUNDARY =
  "Business Health Check Report — a bounded Fiverr / standalone diagnostic " +
  "for one business and one quick stability read. It is a high-level review, " +
  "not the Full RGS Business Stability Diagnostic Report, not implementation, " +
  "not financial forecasting, not dashboard or software setup, and not ongoing " +
  "advisory. The call, when included, is for report walkthrough and clarification.";

const FIVERR_STANDARD_SCOPE_BOUNDARY =
  "Business Systems Diagnostic Report — a bounded Fiverr / standalone " +
  "diagnostic with a systems audit and priority breakdown. It is deeper than " +
  "the Business Health Check Report, but it is not the Full RGS Business " +
  "Stability Diagnostic Report. It does not include implementation, custom " +
  "SOP creation, software or dashboard build, or ongoing advisory.";

const FIVERR_PREMIUM_SCOPE_BOUNDARY =
  "Priority Repair Roadmap Report — a premium Fiverr / standalone diagnostic " +
  "with a deeper repair sequence. It includes the RGS Stability Snapshot, " +
  "root-cause notes, and a Priority Repair Roadmap, but it is intentionally " +
  "bounded: it is not the Full RGS Business Stability Diagnostic Report and " +
  "does not include implementation, custom SOP creation, software or dashboard " +
  "build, or ongoing advisory.";

const IMPLEMENTATION_SCOPE_BOUNDARY =
  "Implementation Report / Roadmap — project-based system installation " +
  "support planning. It is not indefinite or unlimited support, not RGS " +
  "operating the business, and not the RGS Control System™ subscription " +
  "lane. Activities outside the agreed scope are out of scope.";

const FULL_RGS_EXCLUSIONS = [
  "Implementation, custom builds, and ongoing advisory are separate.",
  "RGS does not operate the business.",
  "Not legal, tax, accounting, HR, payroll, insurance, or compliance advice.",
  "No promised revenue, ROI, renewal, compliance, or business outcome.",
];

const FIVERR_BASIC_EXCLUSIONS = [
  "No deep repair roadmap.",
  "No full implementation plan.",
  "No implementation, SOP creation, dashboards, or software setup.",
  "No financial forecast, valuation, legal, tax, accounting, HR, or compliance conclusion.",
  "No ongoing advisory and no revision loop beyond package terms.",
  "No promised revenue or business outcome.",
];

const FIVERR_STANDARD_EXCLUSIONS = [
  "Not the Full RGS Business Stability Diagnostic Report.",
  "No flagship-only evidence/source-of-truth sections unless explicitly approved.",
  "No full implementation plan and no SOP / training bible build.",
  "No custom tool, dashboard, or software build.",
  "No ongoing advisory and no revision loop beyond the package terms.",
  "Not legal, tax, accounting, HR, or compliance advice.",
  "No promised revenue improvement.",
];

const FIVERR_PREMIUM_EXCLUSIONS = [
  "Not the Full RGS Business Stability Diagnostic Report.",
  "No flagship-only sections unless specifically approved.",
  "No implementation, custom SOP creation, dashboards, or software build.",
  "No ongoing advisory and no revision loop beyond the package terms.",
  "Not legal, tax, accounting, HR, or compliance advice.",
  "No promised revenue or business outcome.",
];

const IMPLEMENTATION_EXCLUSIONS = [
  "Not indefinite support and not RGS operating the business.",
  "Not emergency support; activities follow the agreed plan.",
  "Not legal, tax, accounting, HR, payroll, insurance, or compliance advice.",
  "No promised outcome.",
];

export const REPORT_TYPE_TEMPLATES: Record<ReportDraftType, ReportTypeTemplate> = {
  // ─── P65 tiers ──────────────────────────────────────────────────────────
  full_rgs_diagnostic: {
    key: "full_rgs_diagnostic",
    label: "Full RGS Business Stability Diagnostic Report",
    reportName: "Full RGS Business Stability Diagnostic Report",
    packageName: null,
    publicOfferName: "Full RGS Business Stability Diagnostic Report",
    reportWorld: "full_rgs_client_diagnostic",
    shortPackageDescription: null,
    expectedDeliveryDays: null,
    walkthroughMinutes: null,
    priceTarget: null,
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
    label: "Business Health Check Report",
    reportName: "Business Health Check Report",
    packageName: "Business Health Check",
    publicOfferName: "Business Health Check",
    reportWorld: "fiverr_standalone_diagnostic",
    shortPackageDescription: "Quick stability score and system snapshot.",
    expectedDeliveryDays: 2,
    walkthroughMinutes: 30,
    priceTarget: "$150",
    serviceLane: "diagnostic",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: true,
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
    label: "Business Systems Diagnostic Report",
    reportName: "Business Systems Diagnostic Report",
    packageName: "Business Systems Diagnostic Report",
    publicOfferName: "Business Systems Diagnostic Report",
    reportWorld: "fiverr_standalone_diagnostic",
    shortPackageDescription: "Full systems audit and priority breakdown.",
    expectedDeliveryDays: 3,
    walkthroughMinutes: 30,
    priceTarget: "$300-$350",
    serviceLane: "diagnostic",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: true,
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
    label: "Priority Repair Roadmap Report",
    reportName: "Priority Repair Roadmap Report",
    packageName: "Priority Repair Roadmap Report",
    publicOfferName: "Priority Repair Roadmap Report",
    reportWorld: "fiverr_standalone_diagnostic",
    shortPackageDescription: "Deep diagnostic with root causes and repair roadmap.",
    expectedDeliveryDays: 4,
    walkthroughMinutes: 60,
    priceTarget: "$600-$650",
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
    reportName: "Implementation Report / Roadmap",
    packageName: null,
    publicOfferName: "Implementation Report / Roadmap",
    reportWorld: "implementation",
    shortPackageDescription: null,
    expectedDeliveryDays: null,
    walkthroughMinutes: null,
    priceTarget: null,
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
    reportName: "Business Diagnostic Report (legacy)",
    packageName: null,
    publicOfferName: null,
    reportWorld: "legacy",
    shortPackageDescription: null,
    expectedDeliveryDays: null,
    walkthroughMinutes: null,
    priceTarget: null,
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
    reportName: "Stability / Scorecard Report (legacy)",
    packageName: null,
    publicOfferName: null,
    reportWorld: "legacy",
    shortPackageDescription: null,
    expectedDeliveryDays: null,
    walkthroughMinutes: null,
    priceTarget: null,
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
    reportName: "Revenue Control Summary (legacy)",
    packageName: null,
    publicOfferName: null,
    reportWorld: "legacy",
    shortPackageDescription: null,
    expectedDeliveryDays: null,
    walkthroughMinutes: null,
    priceTarget: null,
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
    reportName: "Implementation Progress Update (legacy)",
    packageName: null,
    publicOfferName: null,
    reportWorld: "legacy",
    shortPackageDescription: null,
    expectedDeliveryDays: null,
    walkthroughMinutes: null,
    priceTarget: null,
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
  // P69 — Tool-Specific Report. A bounded, standalone deliverable produced
  // from a single RGS tool. Distinct from the main full diagnostic /
  // Fiverr / implementation report tiers.
  tool_specific: {
    key: "tool_specific",
    label: "Tool-Specific Report",
    reportName: "Tool-Specific Report",
    packageName: null,
    publicOfferName: null,
    reportWorld: "tool_specific",
    shortPackageDescription: "Limited-scope output from one eligible RGS tool.",
    expectedDeliveryDays: null,
    walkthroughMinutes: null,
    priceTarget: null,
    serviceLane: "diagnostic",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: false,
    includesPriorityRepairMap: "none",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: false,
    approxPageLength: "Bounded — typically 1–6 pages depending on the tool.",
    sections: [],
    scopeBoundary:
      "Tool-Specific Report — a bounded standalone read of a single RGS " +
      "tool. It is not the Full RGS Business Stability Diagnostic Report, not implementation, not " +
      "the RGS Control System™ subscription, and not ongoing advisory. " +
      "It does not imply any of those engagements were purchased.",
    exclusions: [
      "Not the Full RGS Business Stability Diagnostic Report.",
      "Not implementation, custom builds, SOPs, dashboards, or software setup.",
      "Not ongoing advisory or revision loop beyond the tool's own scope.",
      "Not legal, tax, accounting, HR, payroll, insurance, or compliance advice.",
      "No guaranteed revenue, ROI, or business outcome.",
    ],
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
  full_rgs_diagnostic: "Full RGS Business Stability Diagnostic Report",
  fiverr_basic_diagnostic: "Business Health Check",
  fiverr_standard_diagnostic: "Business Systems Diagnostic Report",
  fiverr_premium_diagnostic: "Priority Repair Roadmap Report",
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

export function reportTypeLabel(t: ReportDraftType): string {
  return REPORT_TYPE_TEMPLATES[t].reportName;
}

function filenamePart(value: string): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "Client";
}

export function buildReportPdfFilename(
  reportType: ReportDraftType,
  clientName: string | null | undefined,
  generatedAt: Date = new Date(),
): string {
  const report = filenamePart(REPORT_TYPE_TEMPLATES[reportType].reportName);
  const client = filenamePart(clientName || "Client");
  const date = generatedAt.toISOString().slice(0, 10);
  return `${report}_${client}_${date}.pdf`;
}
