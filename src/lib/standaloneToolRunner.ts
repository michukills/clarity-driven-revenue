// P77 — Owner Admin Command Center: standalone tool runner + gig
// deliverable report generator.
//
// Purpose
// -------
// Lets the owner/admin run an eligible RGS tool as a standalone service
// or gig deliverable for a single customer, then generate a real
// tool-specific report draft using the P76 framework.
//
// This module is intentionally a thin, additive layer:
//   • It REUSES the P76 reportable tool registry (no duplicate registry).
//   • It REUSES `generateToolSpecificDraft` (no duplicate report writer).
//   • It REUSES the P75A AI brain registry anchor `tool_specific_report`
//     (no duplicate brain pack, no duplicate forbidden-claim scanner).
//   • Storage / PDF / signed-URL / approval flow is handled by the
//     existing P76 `StoredToolReportsPanel` once the draft is opened in
//     `/admin/report-drafts/:id`.
//
// What this layer adds
// --------------------
//   • Honest tool-eligibility classification so the UI can hide fake
//     "Run" / "Generate Report" actions for tools that are not actually
//     runnable yet.
//   • Standalone gig deliverable tier selection (Fiverr Basic / Standard
//     / internal admin / client summary / implementation support).
//   • A required standalone scope boundary section that says — in
//     plain English — "this is one tool's output, not a full RGS
//     diagnostic / implementation / legal / tax / compliance / fiduciary
//     / valuation deliverable."
//   • Optional cannabis/MMJ operational-readiness framing — never
//     framed as legal compliance certification.

import {
  REPORTABLE_TOOL_CATALOG,
  TOOL_SPECIFIC_REPORT_AI_BRAIN_KEY,
  assertToolSpecificAiBrainRegistered,
  generateToolSpecificDraft,
  getReportableTool,
  type ReportableToolDefinition,
} from "@/lib/reports/toolReports";
import type { ReportDraftRow } from "@/lib/reports/types";
import { findForbiddenAiClaims } from "@/lib/rgsAiSafety";
import { findForbiddenSopPhrases } from "@/lib/sopForbiddenPhrases";

/**
 * Honest runtime status for a reportable tool when used as a standalone
 * service / gig deliverable. Drives whether the UI can show a real
 * "Run / Generate Report" action.
 */
export type StandaloneToolEligibility =
  | "eligible_built"
  | "eligible_needs_data"
  | "admin_only"
  | "client_internal_only"
  | "not_reportable_yet"
  | "planned";

export interface StandaloneToolEntry extends ReportableToolDefinition {
  eligibility: StandaloneToolEligibility;
  /** Whether the admin can press "Generate Standalone Report" right now. */
  canRun: boolean;
  /** Plain-English description of how this tool is sold as a gig. */
  gigUseCase: string;
}

/**
 * P77 — Eligibility map. Only tools whose underlying RGS surface is
 * actually built and runnable are flagged `eligible_built`. The map is
 * the single source of truth the runner uses to decide whether an admin
 * action is allowed. Anything not listed here defaults to `planned` so
 * we never show a fake "Run" button.
 */
const ELIGIBILITY: Record<
  string,
  { eligibility: StandaloneToolEligibility; gigUseCase: string }
> = {
  owner_diagnostic_interview: {
    eligibility: "eligible_built",
    gigUseCase:
      "Standalone owner interview write-up — plain-English read of the " +
      "owner's starting context, not a full RGS Diagnostic.",
  },
  business_stability_scorecard: {
    eligibility: "eligible_built",
    gigUseCase:
      "Standalone scorecard read — stability band, gear signals, top " +
      "observations. Not the Full RGS Business Stability Diagnostic Report.",
  },
  buyer_persona_tool: {
    eligibility: "eligible_built",
    gigUseCase:
      "Buyer persona / ideal customer profile deliverable — buyer clarity, " +
      "pain points, decision concerns, and messaging direction without " +
      "lead-generation promises.",
  },
  customer_journey_mapper: {
    eligibility: "eligible_built",
    gigUseCase:
      "Standalone buyer journey map — where prospects move, hesitate, " +
      "need proof, and need follow-up clarity.",
  },
  rgs_stability_snapshot: {
    eligibility: "eligible_built",
    gigUseCase:
      "Single point-in-time SWOT-style stability snapshot for one " +
      "business.",
  },
  priority_repair_map: {
    eligibility: "eligible_needs_data",
    gigUseCase:
      "Standalone priority repair map slice — only meaningful when the " +
      "client has provided real signals to map against.",
  },
  financial_visibility: {
    eligibility: "eligible_needs_data",
    gigUseCase:
      "Standalone read of connected source / financial visibility " +
      "status. Not legal, tax, or accounting advice.",
  },
  revenue_leak_finder: {
    eligibility: "eligible_needs_data",
    gigUseCase:
      "Standalone business leakage review — visible revenue, time, and " +
      "operations friction based on provided information. Not forecasting.",
  },
  implementation_roadmap: {
    eligibility: "eligible_built",
    gigUseCase:
      "Standalone implementation roadmap output — not the Full RGS " +
      "Implementation Report or unlimited build engagement.",
  },
  sop_training_bible: {
    eligibility: "eligible_built",
    gigUseCase:
      "Bounded SOP / training bible export for a single workflow — not " +
      "an HR, legal, OSHA, or compliance certification.",
  },
  decision_rights_accountability: {
    eligibility: "eligible_built",
    gigUseCase:
      "Standalone decision rights / accountability map for one team or " +
      "function.",
  },
  workflow_process_mapping: {
    eligibility: "eligible_built",
    gigUseCase: "Standalone process map summary for a single workflow.",
  },
  tool_assignment_training_tracker: {
    eligibility: "admin_only",
    gigUseCase:
      "Internal admin tracker. Standalone export is admin-only — it " +
      "does not auto-publish to the client.",
  },
  priority_action_tracker: {
    eligibility: "eligible_built",
    gigUseCase: "Standalone priority action tracker snapshot for one client.",
  },
  revenue_risk_monitor: {
    eligibility: "eligible_built",
    gigUseCase:
      "Standalone revenue/risk signal review using admin-reviewed monitor " +
      "items. Not a financial forecast or risk-protection service.",
  },
  owner_decision_dashboard: {
    eligibility: "eligible_built",
    gigUseCase: "Standalone owner decision dashboard read.",
  },
  scorecard_history: {
    eligibility: "eligible_needs_data",
    gigUseCase:
      "Stability trend report across recorded scorecards — needs at " +
      "least two scorecards to be useful.",
  },
  monthly_system_review: {
    eligibility: "eligible_built",
    gigUseCase: "Standalone monthly system review summary.",
  },
  advisory_notes: {
    eligibility: "admin_only",
    gigUseCase:
      "Admin-only advisory log. Notes are RGS interpretation, not " +
      "legal, tax, accounting, HR, or compliance advice.",
  },
};

/** Returns the registry decorated with P77 standalone eligibility. */
export function listStandaloneTools(): StandaloneToolEntry[] {
  return REPORTABLE_TOOL_CATALOG.map((t) => {
    const e = ELIGIBILITY[t.toolKey] ?? {
      eligibility: "planned" as StandaloneToolEligibility,
      gigUseCase:
        "Planned standalone deliverable. Not currently runnable as a " +
        "gig output.",
    };
    return {
      ...t,
      eligibility: e.eligibility,
      gigUseCase: e.gigUseCase,
      canRun:
        e.eligibility === "eligible_built" ||
        e.eligibility === "eligible_needs_data" ||
        e.eligibility === "admin_only",
    };
  });
}

export function getStandaloneTool(
  toolKey: string,
): StandaloneToolEntry | undefined {
  return listStandaloneTools().find((t) => t.toolKey === toolKey);
}

/** P77 gig deliverable tiers — drives the report header + scope language. */
export type StandaloneGigTier =
  | "fiverr_basic_snapshot"
  | "fiverr_standard"
  | "fiverr_premium"
  | "internal_admin_report"
  | "client_summary"
  | "implementation_support_report";

export const STANDALONE_GIG_TIERS: ReadonlyArray<{
  key: StandaloneGigTier;
  label: string;
  description: string;
}> = [
  {
    key: "fiverr_basic_snapshot",
    label: "Fiverr Basic / Snapshot",
    description:
      "Shortest gig deliverable. One tool, top 1–3 observations, " +
      "plain-English summary, light recommendations.",
  },
  {
    key: "fiverr_standard",
    label: "Fiverr Standard",
    description:
      "Standard gig deliverable. One tool, full observations, next " +
      "review steps, no Repair Map sequencing.",
  },
  {
    key: "fiverr_premium",
    label: "Fiverr Premium",
    description:
      "Deepest standalone tool deliverable. One tool, clearer priority " +
      "sequence, stronger next-step review, still not a full RGS Diagnostic.",
  },
  {
    key: "client_summary",
    label: "Client Summary",
    description:
      "Client-facing summary of one tool's output. Requires admin " +
      "approval and client_visible toggle before publication.",
  },
  {
    key: "implementation_support_report",
    label: "Implementation Support",
    description:
      "Standalone implementation-support deliverable for one tool. " +
      "Not the Full RGS Implementation Report.",
  },
  {
    key: "internal_admin_report",
    label: "Internal Admin Only",
    description:
      "Admin-internal deliverable. Never exposed to the client portal.",
  },
];

export type StandalonePackageLevel = "basic" | "standard" | "premium";

export interface StandaloneReportPackage {
  level: StandalonePackageLevel;
  packageName: string;
  reportName: string;
  purpose: string;
  includes: string[];
  excludes: string[];
  scopeBoundary: string;
  pdfExportRequired: boolean;
  adminReviewRequired: boolean;
  clientApprovalGateRequired: boolean;
}

export interface StandaloneToolPackageLadder {
  toolKey: string;
  toolName: string;
  recommendedGigUseCase: string;
  currentRoute: string;
  currentComponent: string;
  readinessScore: number;
  canBeSoldNow: boolean;
  requiredInputData: string[];
  structuredOutputAvailable: boolean;
  aiAssistAvailable: boolean;
  adminReviewAvailable: boolean;
  pdfExportAvailable: boolean;
  internalReportStorageAvailable: boolean;
  clientVisibleApprovalGateAvailable: boolean;
  tenantIsolationRlsSafe: boolean;
  missingBeforeSale: string[];
  packages: Record<StandalonePackageLevel, StandaloneReportPackage>;
}

const COMMON_STANDALONE_SCOPE =
  "This is a bounded standalone deliverable based on the selected tool " +
  "and the information provided. It is not the Full RGS Business Stability " +
  "Diagnostic Report, not implementation, not ongoing support, and not legal, " +
  "tax, accounting, HR, valuation, fiduciary, or regulated compliance advice.";

const pkg = (
  level: StandalonePackageLevel,
  packageName: string,
  reportName: string,
  purpose: string,
  includes: string[],
  excludes: string[],
): StandaloneReportPackage => ({
  level,
  packageName,
  reportName,
  purpose,
  includes,
  excludes,
  scopeBoundary: COMMON_STANDALONE_SCOPE,
  pdfExportRequired: true,
  adminReviewRequired: true,
  clientApprovalGateRequired: true,
});

export const STANDALONE_TOOL_PACKAGE_LADDERS: StandaloneToolPackageLadder[] = [
  {
    toolKey: "sop_training_bible",
    toolName: "SOP / Training Bible",
    recommendedGigUseCase:
      "I will create clear SOPs and a training guide for your business process.",
    currentRoute: "/admin/customers/:customerId/sop-training-bible",
    currentComponent: "src/pages/admin/SopTrainingBibleAdmin.tsx",
    readinessScore: 94,
    canBeSoldNow: true,
    requiredInputData: ["process name", "current steps", "responsible role", "quality checkpoints"],
    structuredOutputAvailable: true,
    aiAssistAvailable: true,
    adminReviewAvailable: true,
    pdfExportAvailable: true,
    internalReportStorageAvailable: true,
    clientVisibleApprovalGateAvailable: true,
    tenantIsolationRlsSafe: true,
    missingBeforeSale: [],
    packages: {
      basic: pkg(
        "basic",
        "Single SOP Build",
        "Single SOP Process Report",
        "Create one clean SOP for one business process.",
        [
          "process name and purpose",
          "owner / responsible role",
          "trigger or start point",
          "step-by-step workflow",
          "quality checkpoints",
          "common mistakes",
          "simple handoff notes",
          "basic training notes",
        ],
        ["full training bible", "department-wide system", "implementation support", "legal or HR compliance certification"],
      ),
      standard: pkg(
        "standard",
        "SOP + Training Guide",
        "SOP Training Guide Report",
        "Create a stronger SOP with training guidance for one process or small workflow.",
        [
          "everything in Basic",
          "training explanation",
          "role expectations",
          "do / do not section",
          "manager review checklist",
          "simple accountability checkoff",
          "suggested improvement notes",
        ],
        ["department-wide system", "implementation support", "legal or HR compliance certification"],
      ),
      premium: pkg(
        "premium",
        "Process Training Bible",
        "Process Training Bible Report",
        "Create a fuller process/training document for a repeated operational workflow.",
        [
          "everything in Standard",
          "full workflow map / sequence",
          "escalation points",
          "quality control standards",
          "handoff rules",
          "owner / manager review notes",
          "training checklist",
          "first-week use guide",
          "improvement opportunities",
        ],
        ["employee handbook", "HR legal policy", "full implementation engagement", "ongoing training support"],
      ),
    },
  },
  {
    toolKey: "buyer_persona_tool",
    toolName: "Buyer Persona / ICP",
    recommendedGigUseCase:
      "I will create buyer personas and an ideal customer profile for your business.",
    currentRoute: "/admin/tools/persona-builder",
    currentComponent: "src/pages/admin/tools/PersonaBuilder.tsx",
    readinessScore: 90,
    canBeSoldNow: true,
    requiredInputData: ["offer", "target market", "best customers", "sales notes", "buyer concerns"],
    structuredOutputAvailable: true,
    aiAssistAvailable: true,
    adminReviewAvailable: true,
    pdfExportAvailable: true,
    internalReportStorageAvailable: true,
    clientVisibleApprovalGateAvailable: true,
    tenantIsolationRlsSafe: true,
    missingBeforeSale: [],
    packages: {
      basic: pkg(
        "basic",
        "Buyer Snapshot",
        "Buyer Snapshot Report",
        "Create a simple buyer profile for one target customer type.",
        [
          "target buyer summary",
          "buyer pain points",
          "buying triggers",
          "decision concerns",
          "plain-English messaging angle",
          "basic offer-positioning notes",
        ],
        ["lead-generation promise", "ad performance promise", "marketing campaign build", "financial projections"],
      ),
      standard: pkg(
        "standard",
        "ICP + Buyer Persona",
        "ICP and Buyer Persona Report",
        "Create a clearer ideal customer profile and buyer persona for marketing/sales clarity.",
        [
          "ideal customer profile",
          "primary buyer persona",
          "pains and frictions",
          "desired outcomes",
          "trust objections",
          "buying triggers",
          "decision criteria",
          "messaging recommendations",
          "sales conversation notes",
        ],
        ["lead-generation promise", "full marketing campaign build", "financial projections", "legal claims review"],
      ),
      premium: pkg(
        "premium",
        "Buyer Strategy Map",
        "Buyer Strategy Map Report",
        "Create a deeper buyer strategy report connecting ICP, persona, messaging, offer fit, and buyer journey.",
        [
          "everything in Standard",
          "buyer journey stages",
          "awareness / problem language",
          "decision objections",
          "proof needed at each stage",
          "messaging themes",
          "channel / content suggestions",
          "sales follow-up angles",
          "priority recommendations",
        ],
        ["lead-generation promise", "ad performance promise", "full campaign build", "financial projections", "legal claims review"],
      ),
    },
  },
  {
    toolKey: "workflow_process_mapping",
    toolName: "Workflow / Process Mapping",
    recommendedGigUseCase:
      "I will map your business workflow and find process bottlenecks.",
    currentRoute: "/admin/customers/:customerId/workflow-process-mapping",
    currentComponent: "src/pages/admin/WorkflowProcessMappingAdmin.tsx",
    readinessScore: 94,
    canBeSoldNow: true,
    requiredInputData: ["workflow name", "start/end point", "steps", "handoffs", "known friction"],
    structuredOutputAvailable: true,
    aiAssistAvailable: false,
    adminReviewAvailable: true,
    pdfExportAvailable: true,
    internalReportStorageAvailable: true,
    clientVisibleApprovalGateAvailable: true,
    tenantIsolationRlsSafe: true,
    missingBeforeSale: [],
    packages: {
      basic: pkg(
        "basic",
        "Workflow Snapshot",
        "Workflow Snapshot Report",
        "Map one simple workflow and identify obvious friction points.",
        ["workflow summary", "start/end point", "main steps", "responsible role", "visible bottlenecks", "basic improvement notes"],
        ["full implementation", "software configuration", "employment or legal compliance advice"],
      ),
      standard: pkg(
        "standard",
        "Process Breakdown",
        "Process Breakdown Report",
        "Map and analyze one operational process in more detail.",
        ["workflow map", "step-by-step breakdown", "handoffs", "bottlenecks", "rework loops", "missing ownership", "time/friction risks", "recommended fixes"],
        ["full implementation", "software configuration", "employment or legal compliance advice"],
      ),
      premium: pkg(
        "premium",
        "Workflow Repair Map",
        "Workflow Repair Map Report",
        "Create a deeper process repair report with prioritized workflow improvements.",
        ["full process breakdown", "bottleneck analysis", "handoff breakdown", "waste/rework points", "accountability gaps", "quick wins", "deeper repair items", "implementation caution notes", "owner/manager next steps"],
        ["done-for-you implementation", "software configuration unless separately scoped", "employment or legal compliance advice"],
      ),
    },
  },
  {
    toolKey: "decision_rights_accountability",
    toolName: "Decision Rights & Accountability",
    recommendedGigUseCase:
      "I will clarify team roles, decision rights, and accountability gaps.",
    currentRoute: "/admin/customers/:customerId/decision-rights-accountability",
    currentComponent: "src/pages/admin/DecisionRightsAdmin.tsx",
    readinessScore: 94,
    canBeSoldNow: true,
    requiredInputData: ["roles involved", "decisions getting stuck", "handoffs", "escalation points"],
    structuredOutputAvailable: true,
    aiAssistAvailable: false,
    adminReviewAvailable: true,
    pdfExportAvailable: true,
    internalReportStorageAvailable: true,
    clientVisibleApprovalGateAvailable: true,
    tenantIsolationRlsSafe: true,
    missingBeforeSale: [],
    packages: {
      basic: pkg(
        "basic",
        "Role Clarity Snapshot",
        "Role Clarity Snapshot Report",
        "Identify basic ownership gaps in a small team or process.",
        ["roles involved", "responsibility summary", "unclear ownership points", "basic decision gaps", "simple clarification notes"],
        ["legal HR policy", "employment law advice", "restructuring mandate", "management coaching engagement"],
      ),
      standard: pkg(
        "standard",
        "Accountability Map",
        "Accountability Map Report",
        "Map who owns what and where decisions are getting stuck.",
        ["role map", "decision ownership", "escalation points", "handoff gaps", "accountability risks", "recommended role clarity fixes"],
        ["legal HR policy", "employment law advice", "restructuring mandate", "management coaching engagement"],
      ),
      premium: pkg(
        "premium",
        "Decision Rights Repair Map",
        "Decision Rights Repair Map Report",
        "Create a deeper accountability and decision-rights repair report.",
        ["role clarity map", "decision rights by area", "escalation rules", "owner-dependence risks", "accountability gaps", "recommended operating rules", "priority repair sequence"],
        ["legal HR policy", "employment law advice", "restructuring mandate", "management coaching engagement"],
      ),
    },
  },
  {
    toolKey: "revenue_risk_monitor",
    toolName: "Revenue & Risk / Business Leakage",
    recommendedGigUseCase:
      "I will find business revenue leaks and operational risk points.",
    currentRoute: "/admin/customers/:customerId/revenue-risk-monitor",
    currentComponent: "src/pages/admin/RevenueRiskMonitorAdmin.tsx",
    readinessScore: 90,
    canBeSoldNow: true,
    requiredInputData: ["buyer-provided information", "visible leak/risk signals", "admin-reviewed monitor items"],
    structuredOutputAvailable: true,
    aiAssistAvailable: false,
    adminReviewAvailable: true,
    pdfExportAvailable: true,
    internalReportStorageAvailable: true,
    clientVisibleApprovalGateAvailable: true,
    tenantIsolationRlsSafe: true,
    missingBeforeSale: [],
    packages: {
      basic: pkg(
        "basic",
        "Leak Snapshot",
        "Revenue Leak Snapshot Report",
        "Identify visible revenue/time/operations leaks based on buyer-provided information.",
        ["visible leak summary", "likely source of friction", "business area affected", "basic priority notes", "missing evidence notes"],
        ["financial forecast", "accounting advice", "tax advice", "valuation advice", "revenue recovery promise"],
      ),
      standard: pkg(
        "standard",
        "Revenue Risk Review",
        "Revenue Risk Review Report",
        "Review sales/operations/financial visibility friction and identify key risks.",
        ["leak categories", "impact explanation", "operational risk points", "financial visibility gaps", "priority recommendations", "evidence gaps"],
        ["financial forecast", "accounting advice", "tax advice", "valuation advice", "revenue recovery promise"],
      ),
      premium: pkg(
        "premium",
        "Revenue Repair Map",
        "Revenue Repair Map Report",
        "Create a deeper repair map for revenue leaks and operational friction.",
        ["visible revenue/time leak analysis", "root-cause notes", "risk prioritization", "quick wins", "deeper repair opportunities", "recommended next-step sequence"],
        ["financial forecast", "accounting advice", "tax advice", "valuation advice", "ROI promise"],
      ),
    },
  },
];

export function getStandalonePackageLadder(
  toolKey: string,
): StandaloneToolPackageLadder | undefined {
  return STANDALONE_TOOL_PACKAGE_LADDERS.find((l) => l.toolKey === toolKey);
}

const tierToPackageLevel: Record<StandaloneGigTier, StandalonePackageLevel> = {
  fiverr_basic_snapshot: "basic",
  fiverr_standard: "standard",
  fiverr_premium: "premium",
  client_summary: "standard",
  implementation_support_report: "premium",
  internal_admin_report: "standard",
};

export function getStandalonePackageForTier(
  toolKey: string,
  tier: StandaloneGigTier,
): StandaloneReportPackage | null {
  const ladder = getStandalonePackageLadder(toolKey);
  if (!ladder) return null;
  return ladder.packages[tierToPackageLevel[tier]];
}

export function getStandaloneToolReadinessAudit() {
  return listStandaloneTools().map((tool) => {
    const ladder = getStandalonePackageLadder(tool.toolKey);
    return {
      tool_key: tool.toolKey,
      tool_name: tool.toolName,
      current_route: ladder?.currentRoute ?? null,
      current_component: ladder?.currentComponent ?? null,
      purpose: tool.summary,
      eligible_for_standalone_deliverable: Boolean(ladder),
      readiness_score: ladder?.readinessScore ?? (tool.canRun ? 75 : 35),
      required_input_data: ladder?.requiredInputData ?? ["admin-authored observations"],
      deterministic_or_structured_output_available:
        ladder?.structuredOutputAvailable ?? tool.canRun,
      ai_assist_available: ladder?.aiAssistAvailable ?? false,
      admin_review_available: ladder?.adminReviewAvailable ?? true,
      pdf_report_export_available: ladder?.pdfExportAvailable ?? true,
      internal_report_storage_available:
        ladder?.internalReportStorageAvailable ?? true,
      client_visible_approval_gate_available:
        ladder?.clientVisibleApprovalGateAvailable ?? true,
      tenant_isolation_rls_safe: ladder?.tenantIsolationRlsSafe ?? true,
      can_be_sold_now: Boolean(ladder?.canBeSoldNow),
      missing_before_sale: ladder?.missingBeforeSale ?? [
        "No dedicated three-level package ladder has been approved yet.",
      ],
      recommended_standalone_report_name:
        ladder?.packages.standard.reportName ?? `${tool.toolName} Report`,
      recommended_package_names: ladder
        ? [
            ladder.packages.basic.packageName,
            ladder.packages.standard.packageName,
            ladder.packages.premium.packageName,
          ]
        : ["Not ready", "Not ready", "Not ready"],
      recommended_service_gig_use_case:
        ladder?.recommendedGigUseCase ?? tool.gigUseCase,
    };
  });
}

/**
 * Standalone gig scope-boundary text that MUST be present in every
 * gig deliverable so the report can never be confused with a Full RGS
 * Business Stability Diagnostic Report / implementation plan / legal
 * / tax / fiduciary / valuation deliverable.
 */
export const STANDALONE_GIG_SCOPE_BOUNDARY =
  "This standalone deliverable is limited to the tool output and source " +
  "records listed here. It is not the Full RGS Business Stability Diagnostic " +
  "Report, implementation plan, legal " +
  "opinion, tax/accounting review, compliance certification, valuation, " +
  "fiduciary recommendation, or guarantee of business results.";

/**
 * Cannabis / MMJ operational-readiness framing. RGS does NOT certify
 * cannabis legal compliance — only operational documentation readiness.
 */
export const CANNABIS_OPERATIONAL_READINESS_NOTE =
  "Cannabis / MMJ standalone deliverables are limited to operational " +
  "documentation readiness, evidence organization, process stability, " +
  "and inventory / sales-floor / security / personnel / financial " +
  "visibility readiness. They are not legal compliance certifications, " +
  "METRC / BioTrack reconciliations, or state regulatory assurance. " +
  "Have a qualified attorney or licensed compliance professional review " +
  "any cannabis operational deliverable before relying on it for " +
  "regulated decisions.";

export interface CreateStandaloneGigDeliverableInput {
  customerId: string;
  toolKey: string;
  tier: StandaloneGigTier;
  /** Admin-authored title for the deliverable. */
  title: string;
  /** Admin-authored observations for the gig deliverable. */
  observations: string;
  /** Optional admin-authored next review steps (not advice). */
  nextReviewSteps?: string;
  /**
   * If the deliverable is being run for a cannabis / MMJ operator, the
   * cannabis operational-readiness note is appended automatically. RGS
   * never frames cannabis deliverables as legal compliance.
   */
  cannabisOperationalContext?: boolean;
  /** Mark the draft as AI-assisted (records the brain key in notes). */
  aiAssisted?: boolean;
  /** Optional source record id linking back to original tool data. */
  sourceRecordId?: string | null;
}

/**
 * Create a standalone gig deliverable as a real `report_drafts` row of
 * `report_type = 'tool_specific'`. The draft is created with
 * `client_safe = false` (every section is admin-only by default) so the
 * existing admin review surface controls when it can be published.
 */
export async function createStandaloneGigDeliverable(
  input: CreateStandaloneGigDeliverableInput,
): Promise<ReportDraftRow> {
  const tool = getStandaloneTool(input.toolKey);
  if (!tool) {
    throw new Error(
      `Standalone tool '${input.toolKey}' is not registered as reportable.`,
    );
  }
  if (!tool.canRun) {
    throw new Error(
      `Standalone tool '${tool.toolName}' is currently '${tool.eligibility}' ` +
        "and cannot be generated as a gig deliverable.",
    );
  }

  // Defense in depth: refuse to even create the draft if the
  // admin-authored body already contains forbidden legal/tax/compliance/
  // valuation/guarantee language. (P76 also re-scans at PDF storage.)
  const fields: Record<string, string> = {
    title: input.title,
    observations: input.observations,
    next_review_steps: input.nextReviewSteps ?? "",
  };
  const aiHits = findForbiddenAiClaims(fields);
  const sopHits = findForbiddenSopPhrases(fields);
  const all = [
    ...aiHits.map((h) => `${h.field}: "${h.phrase}"`),
    ...sopHits.map((h) => `${h.field}: "${h.phrase}"`),
  ];
  if (all.length > 0) {
    throw new Error(
      "Refusing to create standalone gig deliverable — forbidden " +
        `claim(s) detected: ${all.slice(0, 5).join("; ")}`,
    );
  }

  // If AI is involved (now or later), the brain pack must be registered.
  if (input.aiAssisted) {
    assertToolSpecificAiBrainRegistered();
  }

  const tierMeta =
    STANDALONE_GIG_TIERS.find((t) => t.key === input.tier) ??
    STANDALONE_GIG_TIERS[0];
  const packageMeta = getStandalonePackageForTier(tool.toolKey, input.tier);
  const reportTitle =
    input.title ||
    (packageMeta
      ? `${packageMeta.reportName} — ${tool.toolName}`
      : `${tool.toolName} — ${tierMeta.label}`);

  const sections = [
    {
      key: "standalone_gig_scope",
      label: "Standalone Gig Deliverable — Scope Boundary",
      body: packageMeta?.scopeBoundary ?? STANDALONE_GIG_SCOPE_BOUNDARY,
    },
    {
      key: "standalone_gig_tier",
      label: "Deliverable Tier",
      body: packageMeta
        ? `${packageMeta.packageName} — ${packageMeta.reportName}\n\n${packageMeta.purpose}`
        : `${tierMeta.label} — ${tierMeta.description}`,
    },
    ...(packageMeta
      ? [
          {
            key: "standalone_gig_includes",
            label: "What This Includes",
            body: packageMeta.includes.map((item) => `• ${item}`).join("\n"),
          },
          {
            key: "standalone_gig_excludes",
            label: "What This Does Not Include",
            body: packageMeta.excludes.map((item) => `• ${item}`).join("\n"),
          },
        ]
      : []),
    {
      key: "standalone_gig_pdf_review_gate",
      label: "PDF / Review Gate",
      body:
        "PDF export uses the existing tool-specific report workflow. The " +
        "draft starts admin-only, stored PDFs start admin-only, and a client " +
        "can only see an approved artifact after explicit client-visible " +
        "approval.",
    },
    {
      key: "standalone_gig_observations",
      label: "Observations",
      body: input.observations,
    },
  ];

  if (input.nextReviewSteps && input.nextReviewSteps.trim().length > 0) {
    sections.push({
      key: "standalone_gig_next_steps",
      label: "Suggested Next Review Steps",
      body: input.nextReviewSteps,
    });
  }

  if (input.cannabisOperationalContext) {
    sections.push({
      key: "standalone_gig_cannabis_readiness",
      label: "Cannabis / MMJ Operational Readiness Note",
      body: CANNABIS_OPERATIONAL_READINESS_NOTE,
    });
  }

  if (input.aiAssisted) {
    sections.push({
      key: "standalone_gig_ai_disclosure",
      label: "AI Disclosure",
      body:
        "AI assisted with drafting this deliverable using the registered " +
        `'${TOOL_SPECIFIC_REPORT_AI_BRAIN_KEY}' RGS AI brain pack. The ` +
        "deterministic source records remain the source of truth. An RGS " +
        "admin reviewed the draft before any client-visible publication.",
    });
  }

  const summary = packageMeta
    ? `${packageMeta.packageName} standalone deliverable`
    : `${tierMeta.label} standalone gig deliverable`;

  return generateToolSpecificDraft({
    customerId: input.customerId,
    toolKey: tool.toolKey,
    title: reportTitle,
    sourceRecordId: input.sourceRecordId ?? null,
    summary,
    sections,
  });
}

export const STANDALONE_TOOL_RUNNER_BRAIN_KEY =
  TOOL_SPECIFIC_REPORT_AI_BRAIN_KEY;
