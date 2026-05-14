// RGS SWOT Strategic Matrix — report data builder + jsPDF section builder.
//
// Produces a client-safe report model from APPROVED SWOT data and the
// deterministic SWOT engine signals. Strict exclusions enforced here:
//   - never emits admin_only_notes
//   - never emits draft / unapproved analyses or items
//   - never emits non-client-visible items
//   - never imports Campaign Control internals — Campaign signals are
//     surfaced only as future-input labels via the SWOT signal contract
//
// Two entry points:
//   - buildSwotReportModelFromAdminInputs(...)
//       Used in admin preview/export. Requires caller to pass the analysis,
//       items, and signal drafts (or pulled signal rows). Validates approval
//       state and filters items down to client_visible only before building.
//   - buildSwotReportPdfDoc(model)
//       Returns a PdfDoc compatible with src/lib/exports.ts so the project's
//       existing branded jsPDF generator can render it.

import {
  CATEGORY_LABEL,
  CONFIDENCE_LABEL,
  CONFIDENCE_PLAIN,
  GEAR_LABEL,
  ANALYSIS_MODE_LABEL,
  SCOPE_DISCLAIMER,
  STANDALONE_SCOPE_NOTE,
} from "./swotMatrixData";
import {
  buildSwotSignalSummary,
} from "./swotSignals";
import type {
  SwotAnalysis,
  SwotCategory,
  SwotItem,
  SwotSignalDraft,
  SwotSignalType,
} from "./types";
import type { PdfDoc } from "@/lib/exports";

// ============================================================================
// Report model
// ============================================================================

export type SwotReportItem = {
  id: string;
  title: string;
  client_safe_summary: string | null;
  evidence_confidence: SwotItem["evidence_confidence"];
  evidence_confidence_label: string;
  evidence_confidence_plain: string;
  linked_gear: SwotItem["linked_gear"];
  linked_gear_label: string;
  severity_or_leverage: SwotItem["severity_or_leverage"];
  recommended_action: string | null;
  downstream_labels: string[];
};

export type SwotReportSignalGroup = {
  type: SwotSignalType;
  label: string;
  description: string;
  items: { summary: string; gear: SwotItem["linked_gear"] | null }[];
};

export type SwotReportModel = {
  customer_id: string;
  analysis_id: string;
  title: string;
  analysis_mode: SwotAnalysis["analysis_mode"];
  analysis_mode_label: string;
  industry: string | null;
  business_stage: string | null;
  approved_at: string | null;
  business_name: string | null;
  is_standalone: boolean;
  cannabis_context: boolean;
  executive_snapshot: string;
  matrix: { category: SwotCategory; heading: string; sub: string; items: SwotReportItem[] }[];
  signal_groups: SwotReportSignalGroup[];
  evidence_legend: { level: string; plain: string }[];
  recommended_next_review: { item_title: string; recommended_action: string }[];
  scope_disclaimer: string;
  standalone_scope_note: string | null;
  cannabis_disclaimer: string | null;
};

// Client-facing copy
const SECTION_HEADINGS: Record<SwotCategory, { title: string; sub: string }> = {
  strength: { title: "What is working in your favor", sub: "Internal — what is working in the business" },
  weakness: { title: "What may be holding the business back", sub: "Internal — what is creating instability" },
  opportunity: { title: "Outside opportunities worth watching", sub: "External — what is worth watching" },
  threat: { title: "Outside threats or risks to monitor", sub: "External — what could destabilize revenue or control" },
};

const SIGNAL_GROUP_LABEL: Record<SwotSignalType, string> = {
  repair_priority: "Repair Map implications",
  implementation_input: "Implementation implications",
  campaign_input: "Campaign future input",
  buyer_persona_input: "Buyer Persona / ICP signals",
  control_system_watch_item: "Control System watch items",
  reengagement_trigger: "Re-engagement trigger signals",
  evidence_needed: "Evidence-needed signals",
  owner_independence_risk: "Owner Independence risk",
  conversion_risk: "Conversion risk",
  demand_opportunity: "Demand opportunity",
  financial_visibility_risk: "Financial Visibility risk",
  operational_bottleneck: "Operational bottleneck",
};

const SIGNAL_GROUP_DESCRIPTION: Record<SwotSignalType, string> = {
  repair_priority: "Items RGS may sequence into the Repair Map.",
  implementation_input: "Items RGS may carry into the Implementation plan.",
  campaign_input: "Future input for marketing/campaign planning. Surfaced as a signal only — no campaign action is taken from this report.",
  buyer_persona_input: "Demand-side context for Buyer Persona / ICP work.",
  control_system_watch_item: "Items RGS may add to ongoing Control System monitoring.",
  reengagement_trigger: "Conditions that may trigger re-engagement workflows.",
  evidence_needed: "Findings whose confidence stays low until evidence is gathered.",
  owner_independence_risk: "Owner-dependence risk pattern.",
  conversion_risk: "Conversion / closing risk pattern.",
  demand_opportunity: "Demand-side opportunity pattern.",
  financial_visibility_risk: "Financial visibility risk pattern.",
  operational_bottleneck: "Operational bottleneck pattern.",
};

const PRIMARY_SIGNAL_GROUPS: SwotSignalType[] = [
  "repair_priority",
  "implementation_input",
  "campaign_input",
  "buyer_persona_input",
  "control_system_watch_item",
  "reengagement_trigger",
  "evidence_needed",
];

const EXECUTIVE_SNAPSHOT =
  "RGS uses SWOT to separate internal business conditions from external " +
  "market conditions, then connect those signals to the operating system. " +
  "Findings here are strategic and operational guidance — they are a " +
  "starting read on stability and leverage, not a final diagnosis. Lower " +
  "evidence confidence means the finding needs review before it becomes a " +
  "strong operating conclusion.";

const CANNABIS_DISCLAIMER =
  "For cannabis or MMJ contexts, this is operational and documentation " +
  "visibility only. It is not regulatory or compliance certification.";

function downstreamLabels(it: SwotItem): string[] {
  const out: string[] = [];
  if (it.repair_map_relevance) out.push("Repair Map");
  if (it.implementation_relevance) out.push("Implementation");
  if (it.campaign_relevance) out.push("Campaign future input");
  if (it.control_system_monitoring_relevance) out.push("Control System watch");
  if (it.reengagement_trigger_relevance) out.push("Re-engagement trigger");
  return out;
}

function detectCannabisContext(analysis: SwotAnalysis, items: SwotItem[]): boolean {
  const haystack = [
    analysis.industry ?? "",
    analysis.business_stage ?? "",
    analysis.notes ?? "",
    ...items.map(i => `${i.title} ${i.description ?? ""} ${i.client_safe_summary ?? ""}`),
  ].join(" ").toLowerCase();
  return /\b(cannabis|mmj|dispensary|marijuana|cultivator|cultivation)\b/.test(haystack);
}

/**
 * Returns true when the analysis is in a state that may be exported as a
 * client-facing deliverable. Editing flips status off `approved`, so this
 * automatically blocks exports of stale / draft / archived content.
 */
export function isAnalysisExportable(a: SwotAnalysis | null | undefined): boolean {
  if (!a) return false;
  if (a.archived_at) return false;
  return a.status === "approved" && a.client_visible === true;
}

/**
 * Returns a human-friendly reason why export is disabled, for admin UI.
 */
export function exportDisabledReason(a: SwotAnalysis | null | undefined, clientVisibleItemCount: number): string | null {
  if (!a) return "Select an analysis first.";
  if (a.archived_at) return "Archived analyses cannot be exported.";
  if (a.status !== "approved") {
    return "Report export is available after approval so draft findings are not delivered as official client-facing guidance.";
  }
  if (!a.client_visible) {
    return "This analysis is approved but not marked client-visible. Toggle client-visible to enable export.";
  }
  if (clientVisibleItemCount === 0) {
    return "This analysis is approved, but no client-visible items are available for the report.";
  }
  return null;
}

/**
 * Build the report model from data the caller has already loaded.
 * Filters out non-client-visible items and strips admin_only_notes.
 * Throws if the analysis is not approved + client-visible.
 */
export function buildSwotReportModelFromAdminInputs(input: {
  analysis: SwotAnalysis;
  items: SwotItem[];
  business_name?: string | null;
  /** Optional override for signals; if omitted, deterministic engine is used. */
  signals?: SwotSignalDraft[];
}): SwotReportModel {
  const { analysis, items, business_name = null } = input;
  if (!isAnalysisExportable(analysis)) {
    throw new Error("SWOT analysis is not in an exportable state.");
  }

  // Strict client-safe item filter.
  const visible = items.filter(it => it.client_visible);

  const matrix = (["strength", "weakness", "opportunity", "threat"] as SwotCategory[]).map(cat => {
    const head = SECTION_HEADINGS[cat];
    const list = visible
      .filter(it => it.category === cat)
      .sort((a, b) => a.display_order - b.display_order)
      .map<SwotReportItem>(it => ({
        id: it.id,
        title: it.title,
        client_safe_summary: it.client_safe_summary,
        evidence_confidence: it.evidence_confidence,
        evidence_confidence_label: CONFIDENCE_LABEL[it.evidence_confidence],
        evidence_confidence_plain: CONFIDENCE_PLAIN[it.evidence_confidence],
        linked_gear: it.linked_gear,
        linked_gear_label: GEAR_LABEL[it.linked_gear],
        severity_or_leverage: it.severity_or_leverage,
        recommended_action: it.recommended_action,
        downstream_labels: downstreamLabels(it),
      }));
    return { category: cat, heading: head.title, sub: head.sub, items: list };
  });

  // Signal groups — derived deterministically from the visible items only.
  const drafts = input.signals ?? buildSwotSignalSummary(analysis.customer_id, analysis.id, visible);
  const signal_groups: SwotReportSignalGroup[] = [];
  for (const t of PRIMARY_SIGNAL_GROUPS) {
    const itemsForGroup = drafts
      .filter(d => d.signal_type === t)
      // Hide admin-only signals from the client report payload.
      .filter(d => d.client_safe || t === "evidence_needed");
    if (itemsForGroup.length === 0) continue;
    signal_groups.push({
      type: t,
      label: SIGNAL_GROUP_LABEL[t],
      description: SIGNAL_GROUP_DESCRIPTION[t],
      items: itemsForGroup.map(d => ({ summary: d.summary, gear: d.gear })),
    });
  }

  const evidence_legend = (
    ["verified", "partially_supported", "owner_claim_only", "assumption", "missing_evidence"] as SwotItem["evidence_confidence"][]
  ).map(l => ({ level: CONFIDENCE_LABEL[l], plain: CONFIDENCE_PLAIN[l] }));

  const recommended_next_review = visible
    .filter(it => it.recommended_action && it.recommended_action.trim().length > 0)
    .map(it => ({
      item_title: it.title,
      recommended_action: it.recommended_action!.trim(),
    }));

  const cannabis_context = detectCannabisContext(analysis, visible);
  const is_standalone = analysis.analysis_mode === "standalone_gig";

  return {
    customer_id: analysis.customer_id,
    analysis_id: analysis.id,
    title: analysis.title,
    analysis_mode: analysis.analysis_mode,
    analysis_mode_label: ANALYSIS_MODE_LABEL[analysis.analysis_mode],
    industry: analysis.industry,
    business_stage: analysis.business_stage,
    approved_at: analysis.approved_at,
    business_name,
    is_standalone,
    cannabis_context,
    executive_snapshot: EXECUTIVE_SNAPSHOT,
    matrix,
    signal_groups,
    evidence_legend,
    recommended_next_review,
    scope_disclaimer: SCOPE_DISCLAIMER,
    standalone_scope_note: is_standalone ? STANDALONE_SCOPE_NOTE : null,
    cannabis_disclaimer: cannabis_context ? CANNABIS_DISCLAIMER : null,
  };
}

// ============================================================================
// PdfDoc builder — reuses the project's branded jsPDF renderer.
// ============================================================================

export function buildSwotReportPdfDoc(model: SwotReportModel): PdfDoc {
  const meta: [string, string][] = [];
  if (model.business_name) meta.push(["Business", model.business_name]);
  meta.push(["Analysis", model.title]);
  meta.push(["Mode", model.analysis_mode_label]);
  if (model.industry) meta.push(["Industry", model.industry]);
  if (model.business_stage) meta.push(["Business stage", model.business_stage]);
  if (model.approved_at) meta.push(["Approved", new Date(model.approved_at).toLocaleDateString()]);

  const sections: PdfDoc["sections"] = [];

  // Executive snapshot
  sections.push({ type: "heading", text: "Executive Snapshot" });
  sections.push({ type: "paragraph", text: model.executive_snapshot });

  if (model.is_standalone && model.standalone_scope_note) {
    sections.push({ type: "paragraph", text: model.standalone_scope_note });
  }

  // Four-quadrant matrix
  sections.push({ type: "rule" });
  sections.push({ type: "heading", text: "Strategic Matrix" });
  for (const quadrant of model.matrix) {
    sections.push({ type: "subheading", text: quadrant.heading });
    sections.push({ type: "paragraph", text: quadrant.sub });
    if (quadrant.items.length === 0) {
      sections.push({ type: "paragraph", text: "No approved items in this section." });
      sections.push({ type: "spacer", height: 4 });
      continue;
    }
    for (const it of quadrant.items) {
      sections.push({ type: "paragraph", text: `• ${it.title}` });
      if (it.client_safe_summary) {
        sections.push({ type: "paragraph", text: `   ${it.client_safe_summary}` });
      }
      const tags: string[] = [];
      tags.push(`Gear: ${it.linked_gear_label}`);
      tags.push(`Confidence: ${it.evidence_confidence_label}`);
      tags.push(`Leverage: ${it.severity_or_leverage}`);
      if (it.downstream_labels.length) {
        tags.push(`Downstream: ${it.downstream_labels.join(", ")}`);
      }
      sections.push({ type: "paragraph", text: `   ${tags.join(" · ")}` });
      if (it.recommended_action) {
        sections.push({ type: "paragraph", text: `   Recommended: ${it.recommended_action}` });
      }
    }
    sections.push({ type: "spacer", height: 6 });
  }

  // Signal implications
  sections.push({ type: "rule" });
  sections.push({ type: "heading", text: "Signal Implications" });
  sections.push({
    type: "paragraph",
    text:
      "These signals help RGS identify what may belong in the Repair Map, " +
      "Implementation plan, Control System monitoring, or future campaign " +
      "planning. Inclusion here does not mean the downstream action is " +
      "automatically performed — your active engagement scope determines that.",
  });
  if (model.signal_groups.length === 0) {
    sections.push({ type: "paragraph", text: "No downstream signals were generated from this analysis." });
  } else {
    for (const g of model.signal_groups) {
      sections.push({ type: "subheading", text: g.label });
      sections.push({ type: "paragraph", text: g.description });
      for (const s of g.items.slice(0, 12)) {
        const gearLabel = s.gear ? GEAR_LABEL[s.gear] : "—";
        sections.push({ type: "paragraph", text: `• [${gearLabel}] ${s.summary}` });
      }
      if (g.items.length > 12) {
        sections.push({ type: "paragraph", text: `   + ${g.items.length - 12} additional signal(s)` });
      }
    }
  }

  // Evidence legend
  sections.push({ type: "rule" });
  sections.push({ type: "heading", text: "Evidence Confidence" });
  for (const l of model.evidence_legend) {
    sections.push({ type: "paragraph", text: `• ${l.level} — ${l.plain}` });
  }

  // Recommended next review
  sections.push({ type: "rule" });
  sections.push({ type: "heading", text: "Recommended Next Review" });
  if (model.recommended_next_review.length === 0) {
    sections.push({ type: "paragraph", text: "No approved next-step recommendations are attached to items in this analysis." });
  } else {
    for (const r of model.recommended_next_review) {
      sections.push({ type: "paragraph", text: `• ${r.item_title}` });
      sections.push({ type: "paragraph", text: `   ${r.recommended_action}` });
    }
  }

  // Scope boundary
  sections.push({ type: "rule" });
  sections.push({ type: "heading", text: "Scope Boundary" });
  sections.push({ type: "paragraph", text: model.scope_disclaimer });
  if (model.cannabis_disclaimer) {
    sections.push({ type: "paragraph", text: model.cannabis_disclaimer });
  }
  if (model.standalone_scope_note) {
    sections.push({ type: "paragraph", text: model.standalone_scope_note });
  }

  return {
    title: "SWOT Strategic Matrix",
    subtitle: model.business_name ? `Strategic deliverable for ${model.business_name}` : "Strategic deliverable",
    meta,
    sections,
  };
}

/**
 * Hard guard: re-validates the rendered PdfDoc to confirm no admin-only
 * notes leaked. This is paranoid defense-in-depth in case a future change
 * to the builder accidentally pulls in the wrong field.
 */
export function assertNoAdminLeakage(doc: PdfDoc, items: SwotItem[]): void {
  const text = JSON.stringify(doc);
  for (const it of items) {
    const note = (it.admin_only_notes ?? "").trim();
    if (note.length >= 8 && text.includes(note)) {
      throw new Error("Admin-only note leaked into SWOT report payload.");
    }
  }
}