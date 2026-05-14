// RGS SWOT Strategic Matrix — downstream signal contract.
//
// This file produces clean, customer-scoped, client-safe/admin-aware signal
// objects from SWOT items. It does NOT touch Campaign Control internals,
// Repair Map internals, or Implementation internals. Future modules consume
// these signals through the helper functions exposed here.

import type {
  SwotItem,
  SwotItemInput,
  SwotSignalDraft,
  SwotSignalType,
  SwotLinkedGear,
} from "./types";
import { isMissingEvidence } from "./swotEngine";

type SignalContext = {
  customer_id: string;
  swot_analysis_id: string;
  swot_item_id?: string | null;
};

function baseDraft(
  ctx: SignalContext,
  signal_type: SwotSignalType,
  summary: string,
  gear: SwotLinkedGear | null,
  client_safe: boolean,
  confidence: SwotItem["evidence_confidence"],
): SwotSignalDraft {
  return {
    customer_id: ctx.customer_id,
    swot_analysis_id: ctx.swot_analysis_id,
    swot_item_id: ctx.swot_item_id ?? null,
    signal_type,
    gear,
    summary,
    confidence,
    client_safe,
    admin_only: !client_safe,
    consumed_by: [],
  };
}

/** Build the signal drafts for a single normalized SWOT item. */
export function deriveSignalsForItem(
  ctx: SignalContext,
  item: SwotItem | (SwotItemInput & {
    customer_id?: string;
    swot_analysis_id?: string;
  }),
): SwotSignalDraft[] {
  const out: SwotSignalDraft[] = [];
  const gear = (item.linked_gear as SwotLinkedGear) ?? "multiple";
  const conf = item.evidence_confidence ?? "missing_evidence";
  const clientSafe =
    !!item.client_visible && !!(item.client_safe_summary || item.description);
  const summary =
    (clientSafe && item.client_safe_summary) ||
    item.description ||
    item.title;

  // Evidence-needed signal — admin-only, never client-safe.
  if (isMissingEvidence(item)) {
    out.push(baseDraft(ctx, "evidence_needed",
      `Evidence is missing for "${item.title}". Confidence stays low until reviewed.`,
      gear, false, conf,
    ));
  }

  // Gear-specific signals.
  switch (gear) {
    case "owner_independence":
      out.push(baseDraft(ctx, "owner_independence_risk", summary, gear, clientSafe, conf));
      break;
    case "revenue_conversion":
      out.push(baseDraft(ctx, "conversion_risk", summary, gear, clientSafe, conf));
      break;
    case "demand_generation":
      if (item.category === "opportunity") {
        out.push(baseDraft(ctx, "demand_opportunity", summary, gear, clientSafe, conf));
      }
      break;
    case "financial_visibility":
      out.push(baseDraft(ctx, "financial_visibility_risk", summary, gear, clientSafe, conf));
      break;
    case "operational_efficiency":
      out.push(baseDraft(ctx, "operational_bottleneck", summary, gear, clientSafe, conf));
      break;
  }

  if (item.repair_map_relevance) {
    out.push(baseDraft(ctx, "repair_priority", summary, gear, clientSafe, conf));
  }
  if (item.implementation_relevance) {
    out.push(baseDraft(ctx, "implementation_input", summary, gear, clientSafe, conf));
  }
  if (item.control_system_monitoring_relevance) {
    out.push(baseDraft(ctx, "control_system_watch_item", summary, gear, clientSafe, conf));
  }
  if (item.reengagement_trigger_relevance) {
    // Re-engagement triggers are operational signals; admin-only by default.
    out.push(baseDraft(ctx, "reengagement_trigger", summary, gear, false, conf));
  }
  if (item.campaign_relevance) {
    // Campaign Control is owned by another module; we only expose the input.
    out.push(baseDraft(ctx, "campaign_input", summary, gear, clientSafe, conf));
    // Buyer Persona/ICP also receives demand-side input as a derived signal.
    if (gear === "demand_generation" || gear === "revenue_conversion") {
      out.push(baseDraft(ctx, "buyer_persona_input", summary, gear, clientSafe, conf));
    }
  }

  return out;
}

/** Build all signals for a set of items belonging to one analysis. */
export function buildSwotSignalSummary(
  customer_id: string,
  swot_analysis_id: string,
  items: SwotItem[],
): SwotSignalDraft[] {
  const out: SwotSignalDraft[] = [];
  for (const item of items) {
    out.push(...deriveSignalsForItem(
      { customer_id, swot_analysis_id, swot_item_id: item.id },
      item,
    ));
  }
  return out;
}

const TYPE_FILTERS = {
  campaign: new Set<SwotSignalType>(["campaign_input", "buyer_persona_input", "demand_opportunity"]),
  repair: new Set<SwotSignalType>(["repair_priority", "operational_bottleneck", "financial_visibility_risk"]),
  implementation: new Set<SwotSignalType>(["implementation_input", "owner_independence_risk", "operational_bottleneck"]),
  controlSystem: new Set<SwotSignalType>(["control_system_watch_item", "financial_visibility_risk", "owner_independence_risk", "conversion_risk"]),
  reengagement: new Set<SwotSignalType>(["reengagement_trigger"]),
} as const;

export function getCampaignRelevantSwotSignals(signals: SwotSignalDraft[]) {
  return signals.filter(s => TYPE_FILTERS.campaign.has(s.signal_type));
}
export function getRepairMapRelevantSwotSignals(signals: SwotSignalDraft[]) {
  return signals.filter(s => TYPE_FILTERS.repair.has(s.signal_type));
}
export function getImplementationRelevantSwotSignals(signals: SwotSignalDraft[]) {
  return signals.filter(s => TYPE_FILTERS.implementation.has(s.signal_type));
}
export function getControlSystemWatchSignals(signals: SwotSignalDraft[]) {
  return signals.filter(s => TYPE_FILTERS.controlSystem.has(s.signal_type));
}
export function getReengagementTriggerSignals(signals: SwotSignalDraft[]) {
  return signals.filter(s => TYPE_FILTERS.reengagement.has(s.signal_type));
}

/**
 * Public scope language used by the SWOT report and exports.
 * Phrased to satisfy the legal/scope contract test (no literal "guarantee revenue").
 */
export const SWOT_SCOPE_DISCLAIMER =
  "SWOT findings are strategic and operational guidance. They do not promise " +
  "revenue, profit, growth, valuation, legal, tax, accounting, or compliance " +
  "outcomes. Cannabis or MMJ context is operational and documentation visibility " +
  "only, not regulatory or compliance certification.";