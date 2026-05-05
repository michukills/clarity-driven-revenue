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
      "observations. Not the Full RGS Diagnostic.",
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

/**
 * Standalone gig scope-boundary text that MUST be present in every
 * gig deliverable so the report can never be confused with a Full RGS
 * Diagnostic / Structural Health Report™ / implementation plan / legal
 * / tax / fiduciary / valuation deliverable.
 */
export const STANDALONE_GIG_SCOPE_BOUNDARY =
  "This standalone deliverable is limited to the tool output and source " +
  "records listed here. It is not a full RGS Business Stress Test\u2122, " +
  "full RGS Structural Health Report\u2122, implementation plan, legal " +
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

  const sections = [
    {
      key: "standalone_gig_scope",
      label: "Standalone Gig Deliverable — Scope Boundary",
      body: STANDALONE_GIG_SCOPE_BOUNDARY,
    },
    {
      key: "standalone_gig_tier",
      label: "Deliverable Tier",
      body: `${tierMeta.label} — ${tierMeta.description}`,
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

  const summary = `${tierMeta.label} standalone gig deliverable`;

  return generateToolSpecificDraft({
    customerId: input.customerId,
    toolKey: tool.toolKey,
    title: input.title || `${tool.toolName} — ${tierMeta.label}`,
    sourceRecordId: input.sourceRecordId ?? null,
    summary,
    sections,
  });
}

export const STANDALONE_TOOL_RUNNER_BRAIN_KEY =
  TOOL_SPECIFIC_REPORT_AI_BRAIN_KEY;