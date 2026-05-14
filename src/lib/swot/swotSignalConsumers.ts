import { supabase } from "@/integrations/supabase/client";
import type { SwotSignal, SwotSignalType } from "./types";

export type SwotSignalConsumerSurface = "campaign" | "repair_map" | "implementation";

export const SWOT_SIGNAL_CONSUMER_SCOPE =
  "SWOT signals help RGS review what may need attention. They do not automatically create new scope, change the official score, or promise outcomes.";

export const SWOT_SIGNAL_CONSUMER_GROUPS: Record<SwotSignalType, string> = {
  repair_priority: "Repair priority",
  implementation_input: "Implementation input",
  owner_independence_risk: "Owner Independence risk",
  evidence_needed: "Evidence needed",
  conversion_risk: "Conversion risk",
  financial_visibility_risk: "Financial Visibility risk",
  operational_bottleneck: "Operational bottleneck",
  control_system_watch_item: "Control System watch item",
  reengagement_trigger: "Re-engagement trigger",
  campaign_input: "Campaign input",
  buyer_persona_input: "Buyer Persona / ICP input",
  demand_opportunity: "Demand opportunity",
};

const SURFACE_SIGNAL_TYPES: Record<SwotSignalConsumerSurface, SwotSignalType[]> = {
  campaign: ["campaign_input", "buyer_persona_input", "demand_opportunity", "conversion_risk"],
  repair_map: [
    "repair_priority",
    "operational_bottleneck",
    "financial_visibility_risk",
    "owner_independence_risk",
    "conversion_risk",
    "evidence_needed",
    "reengagement_trigger",
  ],
  implementation: [
    "implementation_input",
    "operational_bottleneck",
    "owner_independence_risk",
    "financial_visibility_risk",
    "conversion_risk",
    "evidence_needed",
    "control_system_watch_item",
    "reengagement_trigger",
  ],
};

export interface SwotConsumerSignal extends SwotSignal {
  analysis_title?: string | null;
  analysis_approved_at?: string | null;
}

export interface GroupedSwotConsumerSignals {
  signal_type: SwotSignalType;
  label: string;
  signals: SwotConsumerSignal[];
}

export function signalTypesForSwotConsumer(surface: SwotSignalConsumerSurface): SwotSignalType[] {
  return SURFACE_SIGNAL_TYPES[surface];
}

export function groupSwotSignalsForConsumer(
  signals: SwotConsumerSignal[],
  surface: SwotSignalConsumerSurface,
): GroupedSwotConsumerSignals[] {
  const allowed = new Set(signalTypesForSwotConsumer(surface));
  const grouped = new Map<SwotSignalType, SwotConsumerSignal[]>();

  for (const signal of signals) {
    if (!allowed.has(signal.signal_type)) continue;
    const rows = grouped.get(signal.signal_type) ?? [];
    rows.push(signal);
    grouped.set(signal.signal_type, rows);
  }

  return signalTypesForSwotConsumer(surface)
    .map((signal_type) => ({
      signal_type,
      label: SWOT_SIGNAL_CONSUMER_GROUPS[signal_type],
      signals: grouped.get(signal_type) ?? [],
    }))
    .filter((group) => group.signals.length > 0);
}

export async function adminListApprovedSwotSignalsForConsumer(
  customerId: string,
  surface: SwotSignalConsumerSurface,
): Promise<SwotConsumerSignal[]> {
  const allowed = signalTypesForSwotConsumer(surface);
  const { data, error } = await (supabase as any)
    .from("swot_signals")
    .select(`
      *,
      swot_analyses!inner(
        title,
        status,
        approved_at,
        archived_at
      )
    `)
    .eq("customer_id", customerId)
    .in("signal_type", allowed)
    .eq("swot_analyses.status", "approved")
    .is("swot_analyses.archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    customer_id: row.customer_id,
    swot_analysis_id: row.swot_analysis_id,
    swot_item_id: row.swot_item_id,
    signal_type: row.signal_type,
    gear: row.gear,
    summary: row.summary,
    confidence: row.confidence,
    client_safe: row.client_safe,
    admin_only: row.admin_only,
    consumed_by: row.consumed_by ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    analysis_title: row.swot_analyses?.title ?? null,
    analysis_approved_at: row.swot_analyses?.approved_at ?? null,
  })) as SwotConsumerSignal[];
}

