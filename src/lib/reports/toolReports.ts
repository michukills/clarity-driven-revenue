// P69 — Tool-Specific Report Generator framework.
//
// A reusable, bounded helper that lets eligible RGS tools produce a
// standalone "tool-specific" report draft (stored as a `report_drafts`
// row with `report_type = 'tool_specific'`) and a separately exported PDF.
//
// CRITICAL — this is intentionally a bounded, additive layer:
//   • It does NOT replace the main report tiers (full_rgs_diagnostic,
//     fiverr_*_diagnostic, implementation_report).
//   • It NEVER auto-publishes to clients — admin review and explicit
//     `client_safe = true` is still required, exactly like every other
//     report draft.
//   • It NEVER includes admin-only / internal notes in the exported PDF.
//   • It ALWAYS appends the bounded scope boundary + professional review
//     disclaimer for the `tool_specific` template, so a tool report can
//     never be mistaken for a Full RGS Business Stability Diagnostic Report, an Implementation
//     Report, or an RGS Control System™ deliverable.

import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  getReportTypeTemplate,
} from "./reportTypeTemplates";
import type {
  DraftSection,
  EvidenceSnapshot,
  ReportDraftRow,
} from "./types";
import { buildRunPdfBlob, generateRunPdf, type PdfDoc } from "@/lib/exports";
import { findForbiddenAiClaims } from "@/lib/rgsAiSafety";
import { findForbiddenSopPhrases } from "@/lib/sopForbiddenPhrases";
import { getRgsAiBrain } from "@/config/rgsAiBrains";
import {
  resolveReportMode,
  filterSectionsToAllowed,
  type ResolveReportModeInput,
  type ToolReportMode,
} from "./toolReportMode";
import type { GigTier } from "@/lib/gig/gigTier";

type ReportDraftInsert = Database["public"]["Tables"]["report_drafts"]["Insert"];
type ToolReportArtifactUpdate =
  Database["public"]["Tables"]["tool_report_artifacts"]["Update"];

const toJson = (value: unknown): Json => value as unknown as Json;

/**
 * P76 — AI brain key used when AI assists tool-specific report drafting.
 * Anchors this framework to the P75A AI Brain Registry so AI report
 * drafting cannot bypass forbidden-claim rules / drafting standards.
 */
export const TOOL_SPECIFIC_REPORT_AI_BRAIN_KEY = "tool_specific_report" as const;

/** Scan client-facing sections for forbidden claims. Throws with a
 *  helpful message if any unsafe phrase is present. */
export function assertSectionsClientSafe(sections: DraftSection[]): void {
  const fields: Record<string, string> = {};
  for (const s of sections) {
    fields[`${s.key}__label`] = s.label;
    fields[`${s.key}__body`] = s.body ?? "";
  }
  const aiHits = findForbiddenAiClaims(fields);
  const sopHits = findForbiddenSopPhrases(fields);
  const all = [
    ...aiHits.map((h) => `${h.field}: "${h.phrase}"`),
    ...sopHits.map((h) => `${h.field}: "${h.phrase}"`),
  ];
  if (all.length > 0) {
    throw new Error(
      "Refusing to publish tool-specific report — forbidden claim(s) " +
        "detected in client-safe sections. Edit the draft to remove " +
        "legal/tax/accounting/HR/compliance/valuation/guarantee language " +
        `before publishing. Hits: ${all.slice(0, 5).join("; ")}`,
    );
  }
}

/** P76 — confirm the tool_specific_report AI brain pack is registered.
 *  Throws if the registry has been mutated to drop it. Used both at
 *  test-time and any runtime AI-assist entry point. */
export function assertToolSpecificAiBrainRegistered(): void {
  const brain = getRgsAiBrain(TOOL_SPECIFIC_REPORT_AI_BRAIN_KEY);
  if (!brain) {
    throw new Error(
      "RGS AI brain 'tool_specific_report' is missing from the registry — " +
        "tool-specific AI drafting must use a registered P75A brain pack.",
    );
  }
}

/** Service lane a tool belongs to. */
export type ToolServiceLane =
  | "diagnostic"
  | "implementation"
  | "rgs_control_system"
  | "campaign_marketing"
  | "admin_internal";

/** Per-tool registration entry. The catalog drives which tools may
 * generate a standalone tool-specific report. Tools NOT in this list
 * are explicitly excluded (with a documented reason in the audit doc). */
export interface ReportableToolDefinition {
  /** Stable tool key — matches the route / module identifier. */
  toolKey: string;
  /** Human label (PDF title, admin UI). */
  toolName: string;
  serviceLane: ToolServiceLane;
  /** Whether the tool may produce a client-visible report after admin
   * approval (vs. admin-only internal report only). */
  clientFacingEligible: boolean;
  /** Short admin-facing description of what the report covers. */
  summary: string;
}

/**
 * Catalog of tools eligible for a standalone tool-specific report.
 * Audit lives in `docs/rgs-tool-specific-report-generator.md`.
 */
export const REPORTABLE_TOOL_CATALOG: ReportableToolDefinition[] = [
  // Diagnostic lane
  {
    toolKey: "owner_diagnostic_interview",
    toolName: "Owner Diagnostic Interview",
    serviceLane: "diagnostic",
    clientFacingEligible: true,
    summary:
      "Bounded read of the owner interview: business context, primary " +
      "offer, owner dependency signals, and next-step observations.",
  },
  {
    toolKey: "business_stability_scorecard",
    toolName: "0–1000 Business Stability Scorecard",
    serviceLane: "diagnostic",
    clientFacingEligible: true,
    summary:
      "Standalone scorecard read with stability band, gear signals, and " +
      "priority observations. Not the Full RGS Business Stability Diagnostic Report.",
  },
  {
    toolKey: "buyer_persona_tool",
    toolName: "Buyer Persona / ICP",
    serviceLane: "diagnostic",
    clientFacingEligible: true,
    summary:
      "Bounded buyer persona / ideal customer profile output. Not a " +
      "marketing campaign build or lead-generation promise.",
  },
  {
    toolKey: "customer_journey_mapper",
    toolName: "Customer Journey Mapper",
    serviceLane: "diagnostic",
    clientFacingEligible: true,
    summary:
      "Bounded buyer journey map output for messaging, follow-up, and " +
      "decision-friction review.",
  },
  {
    toolKey: "rgs_stability_snapshot",
    toolName: "RGS Stability Snapshot",
    serviceLane: "diagnostic",
    clientFacingEligible: true,
    summary:
      "Bounded SWOT-style stability read for a single business at a " +
      "single point in time.",
  },
  {
    toolKey: "priority_repair_map",
    toolName: "Priority Repair Map",
    serviceLane: "diagnostic",
    clientFacingEligible: true,
    summary: "Standalone priority repair map output for a single client.",
  },
  {
    toolKey: "financial_visibility",
    toolName: "Financial Visibility Review",
    serviceLane: "diagnostic",
    clientFacingEligible: true,
    summary:
      "Bounded read of connected source / financial visibility status. " +
      "Not legal, tax, or accounting advice.",
  },
  {
    toolKey: "revenue_leak_finder",
    toolName: "Revenue Leak Detection Engine",
    serviceLane: "diagnostic",
    clientFacingEligible: true,
    summary:
      "Bounded revenue/time/operations leakage read based on supplied " +
      "information. Not financial forecasting or revenue recovery advice.",
  },
  // Implementation lane
  {
    toolKey: "implementation_roadmap",
    toolName: "Implementation Roadmap",
    serviceLane: "implementation",
    clientFacingEligible: true,
    summary:
      "Standalone implementation roadmap output. Not the Full RGS " +
      "Implementation Report.",
  },
  {
    toolKey: "sop_training_bible",
    toolName: "SOP / Training Bible",
    serviceLane: "implementation",
    clientFacingEligible: true,
    summary: "Bounded SOP / training bible export for a single workflow.",
  },
  {
    toolKey: "decision_rights_accountability",
    toolName: "Decision Rights & Accountability",
    serviceLane: "implementation",
    clientFacingEligible: true,
    summary: "Standalone decision rights / accountability report.",
  },
  {
    toolKey: "workflow_process_mapping",
    toolName: "Workflow / Process Mapping",
    serviceLane: "implementation",
    clientFacingEligible: true,
    summary: "Standalone process map summary for a single workflow.",
  },
  {
    toolKey: "tool_assignment_training_tracker",
    toolName: "Tool Assignment & Training Tracker",
    serviceLane: "implementation",
    clientFacingEligible: false,
    summary:
      "Admin-internal tool. Report is admin-only by default and does " +
      "not auto-publish to the client.",
  },
  // RGS Control System™ lane
  {
    toolKey: "priority_action_tracker",
    toolName: "Priority Action Tracker",
    serviceLane: "rgs_control_system",
    clientFacingEligible: true,
    summary: "Bounded priority action tracker snapshot.",
  },
  {
    toolKey: "revenue_risk_monitor",
    toolName: "Revenue & Risk Monitor",
    serviceLane: "rgs_control_system",
    clientFacingEligible: true,
    summary:
      "Bounded revenue/risk signal snapshot based on admin-reviewed, " +
      "client-visible monitor items.",
  },
  {
    toolKey: "owner_decision_dashboard",
    toolName: "Owner Decision Dashboard",
    serviceLane: "rgs_control_system",
    clientFacingEligible: true,
    summary: "Bounded owner decision dashboard read.",
  },
  {
    toolKey: "scorecard_history",
    toolName: "Scorecard History / Stability Trend",
    serviceLane: "rgs_control_system",
    clientFacingEligible: true,
    summary: "Bounded stability trend report across recorded scorecards.",
  },
  {
    toolKey: "monthly_system_review",
    toolName: "Monthly System Review",
    serviceLane: "rgs_control_system",
    clientFacingEligible: true,
    summary: "Bounded monthly system review summary.",
  },
  {
    toolKey: "advisory_notes",
    toolName: "Advisory Notes / Clarification Log",
    serviceLane: "rgs_control_system",
    clientFacingEligible: false,
    summary:
      "Admin-only by default. Notes are bounded RGS interpretation, not " +
      "legal, tax, accounting, HR, or compliance advice.",
  },
];

export function getReportableTool(
  toolKey: string,
): ReportableToolDefinition | undefined {
  return REPORTABLE_TOOL_CATALOG.find((t) => t.toolKey === toolKey);
}

export function isToolReportable(toolKey: string): boolean {
  return !!getReportableTool(toolKey);
}

/** Input passed by a tool when it requests a standalone report draft. */
export interface GenerateToolReportInput {
  customerId: string;
  toolKey: string;
  /** Tool-supplied bounded sections. Each section is admin-only by
   * default; the admin must explicitly mark sections client_safe in the
   * existing report editor before any client visibility. */
  sections: Array<{ key: string; label: string; body: string }>;
  /** Optional short executive summary line. */
  summary?: string;
  /** Optional source record id linking back to the original tool data. */
  sourceRecordId?: string | null;
  /** Optional title override. */
  title?: string;
}

/**
 * Generate a tool-specific report draft. Always:
 *   • report_type = 'tool_specific'
 *   • status      = 'draft'
 *   • client_safe = false  (admin must explicitly approve client visibility)
 *
 * Returns the inserted `report_drafts` row.
 */
export async function generateToolSpecificDraft(
  input: GenerateToolReportInput,
): Promise<ReportDraftRow> {
  const def = getReportableTool(input.toolKey);
  if (!def) {
    throw new Error(
      `Tool '${input.toolKey}' is not registered as reportable. Add it to ` +
        "REPORTABLE_TOOL_CATALOG with a documented audit entry first.",
    );
  }

  const { data: u } = await supabase.auth.getUser();
  const actor = u.user?.id ?? null;

  const sections: DraftSection[] = input.sections.map((s) => ({
    key: s.key,
    label: s.label,
    body: s.body,
    client_safe: false,
  }));

  // Tool metadata travels inside evidence_snapshot so we don't need a
  // schema change. The shape stays compatible with the existing
  // EvidenceSnapshot consumer surface.
  const evidence: EvidenceSnapshot = {
    collected_at: new Date().toISOString(),
    customer_id: input.customerId,
    customer_label: "",
    is_demo_account: false,
    items: [],
    counts: {},
    notes: [
      `tool_key:${def.toolKey}`,
      `tool_name:${def.toolName}`,
      `service_lane:${def.serviceLane}`,
      ...(input.sourceRecordId ? [`source_record_id:${input.sourceRecordId}`] : []),
      ...(input.summary ? [`summary:${input.summary}`] : []),
    ],
  };

  const insertRow: ReportDraftInsert = {
    customer_id: input.customerId,
    scorecard_run_id: null,
    report_type: "tool_specific" as const,
    title: input.title ?? `${def.toolName} — Tool-Specific Report`,
    status: "draft" as const,
    generation_mode: "deterministic" as const,
    ai_status: "not_run" as const,
    rubric_version: "tool_specific.v1",
    evidence_snapshot: toJson(evidence),
    draft_sections: toJson({ sections }),
    recommendations: toJson([]),
    risks: toJson([]),
    missing_information: toJson([]),
    confidence: "low" as const,
    client_safe: false,
    generated_by: actor,
  };

  const { data, error } = await supabase
    .from("report_drafts")
    .insert([insertRow])
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ReportDraftRow;
}

/**
 * Build the PDF document body for a tool-specific report.
 * Pure function — no IO — so it is safe to unit-test.
 *
 * Always:
 *   • Includes only sections marked client_safe in the export.
 *   • Appends the `tool_specific` scope boundary + exclusions.
 *   • Appends the standard professional review disclaimer.
 *   • NEVER includes admin_notes / internal evidence detail.
 */
export function buildToolReportPdfDoc(args: {
  toolName: string;
  customerLabel: string;
  title: string;
  sections: DraftSection[];
  generatedAt?: Date;
}): PdfDoc {
  const generated = args.generatedAt ?? new Date();
  const tpl = getReportTypeTemplate("tool_specific");
  const docSections: PdfDoc["sections"] = [];

  for (const s of args.sections.filter((s) => s.client_safe)) {
    docSections.push({ type: "heading", text: s.label });
    docSections.push({ type: "paragraph", text: s.body || "—" });
  }

  docSections.push({ type: "rule" });
  docSections.push({ type: "heading", text: "Scope Boundary" });
  docSections.push({ type: "paragraph", text: tpl.scopeBoundary });
  if (tpl.exclusions.length) {
    docSections.push({
      type: "paragraph",
      text: tpl.exclusions.map((e) => `• ${e}`).join("\n"),
    });
  }
  docSections.push({ type: "heading", text: "Professional Review Disclaimer" });
  docSections.push({ type: "paragraph", text: tpl.professionalDisclaimer });

  return {
    title: args.title,
    subtitle:
      `Tool-Specific Report — ${args.toolName}. A bounded standalone read ` +
      "of one RGS tool, not the Full RGS Business Stability Diagnostic Report or Implementation Report.",
    meta: [
      ["Tool", args.toolName],
      ["Report type", "Tool-Specific Report"],
      ["Generated", generated.toLocaleDateString()],
    ],
    sections: docSections,
  };
}

/** Build a safe filename for a tool-specific report PDF. */
export function buildToolReportFilename(toolName: string, title: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const date = new Date().toISOString().slice(0, 10);
  return `tool-report-${slug(toolName)}-${slug(title)}-${date}`.slice(0, 120);
}

/** Trigger a local PDF download for a tool-specific report. */
export function downloadToolReportPdf(args: {
  toolName: string;
  customerLabel: string;
  title: string;
  sections: DraftSection[];
}) {
  const doc = buildToolReportPdfDoc(args);
  const filename = buildToolReportFilename(args.toolName, args.title);
  generateRunPdf(filename, doc);
}

// ─────────────────────────────────────────────────────────────────────────────
// P70 — Internal PDF storage for tool-specific reports.
//
// Stored in the private `tool-reports` bucket under a tenant-safe path:
//
//     {customer_id}/{tool_key}/{report_draft_id}/{filename}.pdf
//
// Access is controlled by storage RLS + the `tool_report_artifacts`
// metadata table (admin-only by default; clients only see rows where the
// linked draft is approved + client_safe AND `client_visible = true`).

export const TOOL_REPORTS_BUCKET = "tool-reports";

export function buildToolReportStoragePath(args: {
  customerId: string;
  toolKey: string;
  reportDraftId: string;
  fileName: string;
}): string {
  const safe = args.fileName.endsWith(".pdf")
    ? args.fileName
    : `${args.fileName}.pdf`;
  return `${args.customerId}/${args.toolKey}/${args.reportDraftId}/${safe}`;
}

export interface ToolReportArtifactRow {
  id: string;
  customer_id: string;
  report_draft_id: string;
  tool_key: string;
  tool_name: string;
  service_lane: string;
  source_record_id: string | null;
  source_record_type: string | null;
  version: number;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number | null;
  client_visible: boolean;
  generated_by: string | null;
  generated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // P101
  report_mode?: "gig_report" | "full_rgs_report";
  gig_tier?: "basic" | "standard" | "premium" | null;
  allowed_sections?: string[] | null;
  excluded_sections?: string[] | null;
}

export interface StoreToolReportPdfInput {
  customerId: string;
  customerLabel: string;
  toolKey: string;
  reportDraftId: string;
  title: string;
  sections: DraftSection[];
  sourceRecordId?: string | null;
  sourceRecordType?: string | null;
  version?: number;
  /**
   * P101 — Report mode + customer scope. When omitted, behavior matches
   * pre-P101 callers (mode defaults to the safest restricted value at
   * the DB layer). When supplied, write-time enforcement filters
   * sections to the allowed set and rejects mode mismatches.
   */
  reportMode?: ToolReportMode;
  customerScope?: ResolveReportModeInput["customer"];
}

/**
 * Render a tool-specific report PDF and upload it to the private
 * `tool-reports` bucket, then record metadata in
 * `tool_report_artifacts`. Always admin-only on creation —
 * `client_visible = false`. Returns the inserted artifact row.
 */
export async function storeToolReportPdf(
  input: StoreToolReportPdfInput,
): Promise<ToolReportArtifactRow> {
  const def = getReportableTool(input.toolKey);
  if (!def) {
    throw new Error(
      `Tool '${input.toolKey}' is not registered as reportable. Add it to ` +
        "REPORTABLE_TOOL_CATALOG before storing a tool-specific PDF.",
    );
  }

  // P76 — defense in depth: never persist a stored PDF whose client-safe
  // sections contain forbidden legal/tax/compliance/valuation/guarantee
  // language. The admin must edit the draft first.
  assertSectionsClientSafe(input.sections);

  // P101 — write-time report-mode enforcement. If caller supplied scope,
  // resolve mode and filter sections to the allowed keyset; deny if the
  // requested mode is not allowed for this customer/tool.
  let resolvedMode: ToolReportMode = input.reportMode ?? "gig_report";
  let resolvedTier: GigTier | null = input.customerScope?.gigTier ?? null;
  let allowedKeys: string[] = [];
  let excludedKeys: string[] = [];
  let sectionsToStore = input.sections;
  if (input.customerScope) {
    const resolved = resolveReportMode({
      customer: input.customerScope,
      toolKey: input.toolKey,
      requestedMode: resolvedMode,
    });
    if (!resolved.allowed) {
      throw new Error(
        resolved.denialReason ??
          "Report mode is not allowed for this customer/tool combination.",
      );
    }
    resolvedMode = resolved.mode;
    resolvedTier = resolved.gigTier;
    allowedKeys = resolved.allowedSections.map((s) => s.key);
    excludedKeys = resolved.excludedSectionKeys;
    sectionsToStore = filterSectionsToAllowed(input.sections, resolved);
    if (sectionsToStore.length === 0) {
      throw new Error(
        "No client-safe sections matched the allowed section set for this report mode and tier.",
      );
    }
  }

  const doc = buildToolReportPdfDoc({
    toolName: def.toolName,
    customerLabel: input.customerLabel,
    title: input.title,
    sections: sectionsToStore,
  });
  const blob = buildRunPdfBlob(doc);
  const fileName = `${buildToolReportFilename(def.toolName, input.title)}.pdf`;
  const storagePath = buildToolReportStoragePath({
    customerId: input.customerId,
    toolKey: def.toolKey,
    reportDraftId: input.reportDraftId,
    fileName,
  });

  const { error: upErr } = await supabase.storage
    .from(TOOL_REPORTS_BUCKET)
    .upload(storagePath, blob, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data: u } = await supabase.auth.getUser();
  const actor = u.user?.id ?? null;

  const { data, error } = await supabase
    .from("tool_report_artifacts")
    .insert([
      {
        customer_id: input.customerId,
        report_draft_id: input.reportDraftId,
        tool_key: def.toolKey,
        tool_name: def.toolName,
        service_lane: def.serviceLane,
        source_record_id: input.sourceRecordId ?? null,
        source_record_type: input.sourceRecordType ?? null,
        version: input.version ?? 1,
        storage_bucket: TOOL_REPORTS_BUCKET,
        storage_path: storagePath,
        file_name: fileName,
        mime_type: "application/pdf",
        size_bytes: blob.size ?? null,
        client_visible: false,
        generated_by: actor,
        report_mode: resolvedMode,
        gig_tier: resolvedTier,
        allowed_sections: toJson(allowedKeys),
        excluded_sections: toJson(excludedKeys),
      },
    ])
    .select()
    .single();
  if (error) {
    // best-effort cleanup of the uploaded object so we don't leave
    // an orphan blob in storage if metadata insert fails
    await supabase.storage.from(TOOL_REPORTS_BUCKET).remove([storagePath]);
    throw error;
  }
  return data as unknown as ToolReportArtifactRow;
}

/** Admin: list stored PDFs for a customer. RLS already restricts to admins
 * + the customer's own approved+client_visible rows. */
export async function listToolReportArtifacts(
  customerId: string,
): Promise<ToolReportArtifactRow[]> {
  const { data, error } = await supabase
    .from("tool_report_artifacts")
    .select("*")
    .eq("customer_id", customerId)
    .is("archived_at", null)
    .order("generated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ToolReportArtifactRow[];
}

/** Admin: mark an artifact client-visible (after the underlying draft is
 * approved + client_safe). Storage RLS double-checks both conditions. */
export async function setToolReportArtifactClientVisible(
  artifactId: string,
  clientVisible: boolean,
): Promise<ToolReportArtifactRow> {
  const { data: u } = await supabase.auth.getUser();
  const actor = u.user?.id ?? null;
  // P101 — defensive read-side check: never mark a full_rgs_report
  // client-visible if the linked customer is a gig customer. RLS already
  // blocks the read, but blocking the flip surfaces a clearer error and
  // keeps the artifact row consistent.
  if (clientVisible) {
    const { data: row } = await supabase
      .from("tool_report_artifacts")
      .select("id, report_mode, customer_id")
      .eq("id", artifactId)
      .maybeSingle();
    if (row?.report_mode === "full_rgs_report" && row.customer_id) {
      const { data: cust } = await supabase
        .from("customers")
        .select("is_gig")
        .eq("id", row.customer_id)
        .maybeSingle();
      if (cust?.is_gig === true) {
        throw new Error(
          "Full RGS Report is not available for this gig customer. Mark client-visible was denied.",
        );
      }
    }
  }
  const patch: ToolReportArtifactUpdate = {
    client_visible: clientVisible,
    approved_at: clientVisible ? new Date().toISOString() : null,
    approved_by: clientVisible ? actor : null,
  };
  const { data, error } = await supabase
    .from("tool_report_artifacts")
    .update(patch)
    .eq("id", artifactId)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ToolReportArtifactRow;
}

/** Create a short-lived signed URL to retrieve a stored PDF. Storage RLS
 * decides whether the caller may read the underlying object. */
export async function getToolReportSignedUrl(
  artifact: Pick<ToolReportArtifactRow, "storage_bucket" | "storage_path">,
  expiresInSeconds = 60,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(artifact.storage_bucket)
    .createSignedUrl(artifact.storage_path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
