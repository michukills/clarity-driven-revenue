// RGS SWOT Strategic Matrix — report data builder.
//
// Produces a client-safe report model from approved SWOT data.
// - Excludes admin_only_notes from every payload it returns.
// - In client context, also requires analysis.status = "approved",
//   analysis.client_visible = true, and item.client_visible = true.
// - Groups items into the four SWOT quadrants in display order.
// - Derives downstream signal implications via the deterministic engine
//   (no Campaign Control internals are imported or modified).
// - Adds standalone/gig and cannabis/MMJ scope notes when applicable.
//
// Hard rule: never imports Campaign Control internals. Never embeds
// admin-only fields. Never makes legal/tax/accounting/compliance/
// valuation/revenue/profit/growth/leads/ROI promises.

import { buildSwotSignalSummary } from "./swotSignals";
import {
  CATEGORY_LABEL,
  CATEGORY_BLURB,
  CONFIDENCE_LABEL,
  CONFIDENCE_PLAIN,
  GEAR_LABEL,
  SIGNAL_LABEL,
  ANALYSIS_MODE_LABEL,
  SCOPE_DISCLAIMER,
  STANDALONE_SCOPE_NOTE,
} from "./swotMatrixData";
import type {
  SwotAnalysis,
  SwotCategory,
  SwotItem,
  SwotSignalDraft,
  SwotSignalType,
} from "./types";

export type SwotReportViewer = "admin" | "client";

export interface SwotReportItem {
  id: string;
  title: string;
  client_safe_summary: string | null;
  recommended_action: string | null;
  evidence_confidence: SwotItem["evidence_confidence"];
  evidence_confidence_label: string;
  evidence_confidence_plain: string;
  linked_gear: SwotItem["linked_gear"];
  linked_gear_label: string;
  severity_or_leverage: SwotItem["severity_or_leverage"];
  internal_external: SwotItem["internal_external"];
  downstream_relevance: string[];
}

export interface SwotReportSignalGroup {
  signal_type: SwotSignalType;
  label: string;
  count: number;
  summaries: string[];
}

export interface SwotReportModel {
  viewer: SwotReportViewer;
  customer_name: string | null;
  analysis: {
    id: string;
    title: string;
    status: SwotAnalysis["status"];
    analysis_mode: SwotAnalysis["analysis_mode"];
    analysis_mode_label: string;
    industry: string | null;
    business_stage: string | null;
    approved_at: string | null;
    client_visible: boolean;
  };
  quadrants: Record<SwotCategory, {
    category: SwotCategory;
    label: string;
    blurb: string;
    client_heading: string;
    items: SwotReportItem[];
  }>;
  signal_groups: {
    repair_map: SwotReportSignalGroup[];
    implementation: SwotReportSignalGroup[];
    campaign: SwotReportSignalGroup[];
    buyer_persona: SwotReportSignalGroup[];
    control_system: SwotReportSignalGroup[];
    reengagement: SwotReportSignalGroup[];
    evidence_needed: SwotReportSignalGroup[];
  };
  recommended_next_review: string[];
  scope_disclaimer: string;
  standalone_scope_note: string | null;
  cannabis_scope_note: string | null;
  exportable: boolean;
  export_block_reason: string | null;
  empty_client_visible_warning: string | null;
}

export const CLIENT_HEADINGS: Record<SwotCategory, string> = {
  strength: "What is working in your favor",
  weakness: "What may be holding the business back",
  opportunity: "Outside opportunities worth watching",
  threat: "Outside threats or risks to monitor",
};

export const SWOT_EXECUTIVE_SNAPSHOT =
  "RGS uses SWOT to separate internal business conditions from external " +
  "market conditions, then connect those signals to the operating system. " +
  "Each finding is paired with an evidence confidence level so you can see " +
  "which observations are verified, which are owner-stated, and which are " +
  "still working assumptions that need review.";

export const SWOT_SIGNAL_FOOTNOTE =
  "These signals help RGS identify what may belong in the Repair Map, " +
  "Implementation plan, Control System monitoring, or future campaign " +
  "planning. They do not automatically trigger downstream work unless that " +
  "scope has been purchased or approved.";

export const SWOT_CANNABIS_SCOPE_NOTE =
  "For cannabis or MMJ contexts, this is operational and documentation " +
  "visibility only. It is not regulatory or compliance certification.";

function looksCannabis(a: Pick<SwotAnalysis, "industry"> & { industry: string | null }): boolean {
  const s = (a.industry ?? "").toLowerCase();
  return /cannabis|mmj|dispensary|marijuana|hemp/.test(s);
}

function downstreamLabels(item: SwotItem): string[] {
  const out: string[] = [];
  if (item.repair_map_relevance) out.push("Repair Map");
  if (item.implementation_relevance) out.push("Implementation");
  if (item.campaign_relevance) out.push("Campaign future input");
  if (item.control_system_monitoring_relevance) out.push("Control System watch");
  if (item.reengagement_trigger_relevance) out.push("Re-engagement trigger");
  return out;
}

function toReportItem(item: SwotItem): SwotReportItem {
  return {
    id: item.id,
    title: item.title,
    client_safe_summary: item.client_safe_summary,
    recommended_action: item.recommended_action,
    evidence_confidence: item.evidence_confidence,
    evidence_confidence_label: CONFIDENCE_LABEL[item.evidence_confidence],
    evidence_confidence_plain: CONFIDENCE_PLAIN[item.evidence_confidence],
    linked_gear: item.linked_gear,
    linked_gear_label: GEAR_LABEL[item.linked_gear],
    severity_or_leverage: item.severity_or_leverage,
    internal_external: item.internal_external,
    downstream_relevance: downstreamLabels(item),
  };
}

function groupSignals(
  signals: SwotSignalDraft[],
  types: SwotSignalType[],
  viewer: SwotReportViewer,
): SwotReportSignalGroup[] {
  const out: SwotReportSignalGroup[] = [];
  for (const t of types) {
    const list = signals.filter((s) => {
      if (s.signal_type !== t) return false;
      if (viewer === "client") return s.client_safe && !s.admin_only;
      return true;
    });
    if (list.length === 0) continue;
    out.push({
      signal_type: t,
      label: SIGNAL_LABEL[t],
      count: list.length,
      summaries: list.map((s) => s.summary),
    });
  }
  return out;
}

export interface BuildSwotReportInput {
  viewer: SwotReportViewer;
  customer_name?: string | null;
  analysis: SwotAnalysis;
  items: SwotItem[];
}

export function buildSwotReport(input: BuildSwotReportInput): SwotReportModel {
  const { viewer, analysis } = input;

  // Defense-in-depth filtering. RLS + admin/client query layers already
  // gate this; we filter again so the report payload is safe even if the
  // caller passed raw rows.
  const itemsRaw = (input.items ?? []).filter((i) =>
    i.swot_analysis_id === analysis.id && i.customer_id === analysis.customer_id,
  );
  const items = viewer === "client"
    ? itemsRaw.filter((i) => i.client_visible)
    : itemsRaw;

  // Strip admin-only notes from EVERY report item, including admin viewer,
  // because the report payload is a deliverable and must not leak notes.
  const safeItems = items.map((i) => ({ ...i, admin_only_notes: null }));

  // Quadrants
  const quadrants = {
    strength: { category: "strength" as SwotCategory, label: CATEGORY_LABEL.strength, blurb: CATEGORY_BLURB.strength, client_heading: CLIENT_HEADINGS.strength, items: [] as SwotReportItem[] },
    weakness: { category: "weakness" as SwotCategory, label: CATEGORY_LABEL.weakness, blurb: CATEGORY_BLURB.weakness, client_heading: CLIENT_HEADINGS.weakness, items: [] as SwotReportItem[] },
    opportunity: { category: "opportunity" as SwotCategory, label: CATEGORY_LABEL.opportunity, blurb: CATEGORY_BLURB.opportunity, client_heading: CLIENT_HEADINGS.opportunity, items: [] as SwotReportItem[] },
    threat: { category: "threat" as SwotCategory, label: CATEGORY_LABEL.threat, blurb: CATEGORY_BLURB.threat, client_heading: CLIENT_HEADINGS.threat, items: [] as SwotReportItem[] },
  };
  for (const it of safeItems) {
    quadrants[it.category].items.push(toReportItem(it));
  }

  // Signals — derive deterministically from items in scope.
  const signals = buildSwotSignalSummary(analysis.customer_id, analysis.id, safeItems as SwotItem[]);

  const signal_groups = {
    repair_map: groupSignals(signals, ["repair_priority", "operational_bottleneck", "financial_visibility_risk"], viewer),
    implementation: groupSignals(signals, ["implementation_input", "owner_independence_risk"], viewer),
    campaign: groupSignals(signals, ["campaign_input", "demand_opportunity"], viewer),
    buyer_persona: groupSignals(signals, ["buyer_persona_input"], viewer),
    control_system: groupSignals(signals, ["control_system_watch_item", "conversion_risk"], viewer),
    // Re-engagement triggers are admin-only by design.
    reengagement: viewer === "admin"
      ? groupSignals(signals, ["reengagement_trigger"], "admin")
      : [],
    evidence_needed: viewer === "admin"
      ? groupSignals(signals, ["evidence_needed"], "admin")
      : [],
  };

  // Recommended next review — approved + client-safe recommended actions.
  const recommended_next_review = safeItems
    .filter((i) => i.recommended_action && i.client_visible)
    .map((i) => i.recommended_action!.trim())
    .filter((s) => s.length > 0);

  const standalone_scope_note =
    analysis.analysis_mode === "standalone_gig" ? STANDALONE_SCOPE_NOTE : null;
  const cannabis_scope_note = looksCannabis(analysis) ? SWOT_CANNABIS_SCOPE_NOTE : null;

  // Export gating
  let exportable = true;
  let export_block_reason: string | null = null;
  if (analysis.status !== "approved" || analysis.archived_at) {
    exportable = false;
    export_block_reason =
      "Report export is available after approval so draft findings are not delivered as official client-facing guidance.";
  } else if (viewer === "client" && !analysis.client_visible) {
    exportable = false;
    export_block_reason =
      "This analysis is approved but is not yet marked client-visible.";
  }

  const clientVisibleItemCount = safeItems.filter((i) => i.client_visible).length;
  const empty_client_visible_warning =
    analysis.status === "approved" && clientVisibleItemCount === 0
      ? "This analysis is approved, but no client-visible items are available for the report."
      : null;

  return {
    viewer,
    customer_name: input.customer_name ?? null,
    analysis: {
      id: analysis.id,
      title: analysis.title,
      status: analysis.status,
      analysis_mode: analysis.analysis_mode,
      analysis_mode_label: ANALYSIS_MODE_LABEL[analysis.analysis_mode],
      industry: analysis.industry,
      business_stage: analysis.business_stage,
      approved_at: analysis.approved_at,
      client_visible: analysis.client_visible,
    },
    quadrants,
    signal_groups,
    recommended_next_review,
    scope_disclaimer: SCOPE_DISCLAIMER,
    standalone_scope_note,
    cannabis_scope_note,
    exportable,
    export_block_reason,
    empty_client_visible_warning,
  };
}

/**
 * Defense-in-depth: scan a serialized payload for accidental admin-only
 * note leakage. Throws if any admin-only notes from the source items end
 * up in the rendered text.
 */
export function assertNoAdminNotesLeakage(
  payloadText: string,
  sourceItems: SwotItem[],
): void {
  for (const it of sourceItems) {
    const note = (it.admin_only_notes ?? "").trim();
    if (note.length === 0) continue;
    if (payloadText.includes(note)) {
      throw new Error(
        `SWOT report payload contains admin-only notes for item ${it.id}`,
      );
    }
  }
}

// PDF export via shared exports.ts pipeline.
export async function exportSwotReportPdf(
  filename: string,
  model: SwotReportModel,
  sourceItems: SwotItem[],
): Promise<void> {
  const mod = await import("@/lib/exports");
  const doc = swotReportToPdfDoc(model);
  const text = JSON.stringify(doc);
  assertNoAdminNotesLeakage(text, sourceItems);
  mod.generateRunPdf(filename, doc as Parameters<typeof mod.generateRunPdf>[1]);
}

export function swotReportToPdfDoc(model: SwotReportModel) {
  const sections: any[] = [];

  sections.push({ type: "heading", text: "Executive Snapshot" });
  sections.push({ type: "paragraph", text: SWOT_EXECUTIVE_SNAPSHOT });

  for (const cat of ["strength", "weakness", "opportunity", "threat"] as SwotCategory[]) {
    const q = model.quadrants[cat];
    sections.push({ type: "heading", text: q.client_heading });
    sections.push({ type: "subheading", text: q.label });
    if (q.items.length === 0) {
      sections.push({ type: "paragraph", text: "No findings recorded in this quadrant." });
      continue;
    }
    for (const it of q.items) {
      sections.push({ type: "paragraph", text: `• ${it.title}` });
      if (it.client_safe_summary) {
        sections.push({ type: "paragraph", text: `   ${it.client_safe_summary}` });
      }
      const tags = [
        `Gear: ${it.linked_gear_label}`,
        `Confidence: ${it.evidence_confidence_label}`,
        `Severity/leverage: ${it.severity_or_leverage}`,
      ];
      if (it.downstream_relevance.length > 0) {
        tags.push(`Downstream: ${it.downstream_relevance.join(", ")}`);
      }
      sections.push({ type: "paragraph", text: `   ${tags.join(" · ")}` });
      sections.push({ type: "paragraph", text: `   ${it.evidence_confidence_plain}` });
      if (it.recommended_action) {
        sections.push({ type: "paragraph", text: `   Recommended next review: ${it.recommended_action}` });
      }
    }
    sections.push({ type: "spacer", height: 6 });
  }

  sections.push({ type: "heading", text: "Signal Implications" });
  sections.push({ type: "paragraph", text: SWOT_SIGNAL_FOOTNOTE });
  const sgroups: Array<[string, SwotReportSignalGroup[]]> = [
    ["Repair Map", model.signal_groups.repair_map],
    ["Implementation", model.signal_groups.implementation],
    ["Campaign future planning", model.signal_groups.campaign],
    ["Buyer Persona / ICP", model.signal_groups.buyer_persona],
    ["Control System monitoring", model.signal_groups.control_system],
    ["Re-engagement trigger potential", model.signal_groups.reengagement],
    ["Evidence needed", model.signal_groups.evidence_needed],
  ];
  let anySignals = false;
  for (const [label, groups] of sgroups) {
    if (groups.length === 0) continue;
    anySignals = true;
    sections.push({ type: "subheading", text: label });
    for (const g of groups) {
      sections.push({ type: "paragraph", text: `${g.label} (${g.count})` });
      for (const s of g.summaries.slice(0, 8)) {
        sections.push({ type: "paragraph", text: `   • ${s}` });
      }
      if (g.summaries.length > 8) {
        sections.push({ type: "paragraph", text: `   + ${g.summaries.length - 8} more` });
      }
    }
  }
  if (!anySignals) {
    sections.push({ type: "paragraph", text: "No downstream signals are available in this report scope." });
  }

  sections.push({ type: "heading", text: "Evidence Confidence" });
  sections.push({
    type: "paragraph",
    text:
      "Verified — backed by reviewed evidence. " +
      "Partially supported — some supporting evidence, not fully verified. " +
      "Owner claim only — stated by the owner, not independently verified. " +
      "Assumption — working assumption that needs evidence. " +
      "Missing evidence — has not been gathered yet. " +
      "Lower-confidence findings should be reviewed before they become " +
      "operating conclusions.",
  });

  sections.push({ type: "heading", text: "Recommended Next Review" });
  if (model.recommended_next_review.length === 0) {
    sections.push({ type: "paragraph", text: "No approved client-facing recommended next reviews are available yet." });
  } else {
    for (const r of model.recommended_next_review) {
      sections.push({ type: "paragraph", text: `• ${r}` });
    }
  }

  sections.push({ type: "heading", text: "Scope Boundary" });
  sections.push({ type: "paragraph", text: model.scope_disclaimer });
  if (model.cannabis_scope_note) {
    sections.push({ type: "paragraph", text: model.cannabis_scope_note });
  }
  if (model.standalone_scope_note) {
    sections.push({ type: "paragraph", text: model.standalone_scope_note });
  }

  return {
    title: "SWOT Strategic Matrix",
    subtitle: model.customer_name
      ? `${model.customer_name} · ${model.analysis.title}`
      : model.analysis.title,
    meta: [
      ["Analysis mode", model.analysis.analysis_mode_label],
      ["Industry", model.analysis.industry ?? "—"],
      ["Business stage", model.analysis.business_stage ?? "—"],
      ["Approved", model.analysis.approved_at
        ? new Date(model.analysis.approved_at).toLocaleDateString()
        : "—"],
    ] as [string, string][],
    sections,
  };
}