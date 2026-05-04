import { supabase } from "@/integrations/supabase/client";

export type ShteSourceType =
  | "public_scorecard" | "paid_diagnostic" | "admin_review"
  | "monthly_review" | "manual_import" | "rgs_control_system_review" | "other";

export type ShteStabilityBand =
  | "unstable" | "needs_attention" | "stabilizing" | "stable" | "strong" | "unknown";

export type ShteTrendDirection = "improving" | "stable" | "declining" | "unknown";

export interface AdminScorecardHistoryEntry {
  id: string;
  customer_id: string;
  title: string;
  source_type: ShteSourceType;
  source_id: string | null;
  source_label: string | null;
  total_score: number | null;
  stability_band: ShteStabilityBand | null;
  demand_generation_score: number | null;
  revenue_conversion_score: number | null;
  operational_efficiency_score: number | null;
  financial_visibility_score: number | null;
  owner_independence_score: number | null;
  prior_total_score: number | null;
  score_change: number | null;
  trend_direction: ShteTrendDirection | null;
  client_visible_summary: string | null;
  admin_summary: string | null;
  internal_notes: string | null;
  scored_at: string | null;
  next_review_date: string | null;
  client_visible: boolean;
  admin_review_required: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClientScorecardHistoryEntry {
  id: string;
  title: string;
  source_type: ShteSourceType;
  source_label: string | null;
  total_score: number | null;
  stability_band: ShteStabilityBand | null;
  demand_generation_score: number | null;
  revenue_conversion_score: number | null;
  operational_efficiency_score: number | null;
  financial_visibility_score: number | null;
  owner_independence_score: number | null;
  prior_total_score: number | null;
  score_change: number | null;
  trend_direction: ShteTrendDirection | null;
  client_visible_summary: string | null;
  scored_at: string | null;
  next_review_date: string | null;
  updated_at: string;
}

export const SHTE_SOURCE_TYPES: ShteSourceType[] = [
  "public_scorecard","paid_diagnostic","admin_review","monthly_review",
  "manual_import","rgs_control_system_review","other",
];
export const SHTE_STABILITY_BANDS: ShteStabilityBand[] = [
  "unstable","needs_attention","stabilizing","stable","strong","unknown",
];
export const SHTE_TREND_DIRECTIONS: ShteTrendDirection[] = [
  "improving","stable","declining","unknown",
];

export const SHTE_SOURCE_LABEL: Record<ShteSourceType, string> = {
  public_scorecard: "Public scorecard",
  paid_diagnostic: "Paid diagnostic",
  admin_review: "Admin review",
  monthly_review: "Monthly review",
  manual_import: "Manual import",
  rgs_control_system_review: "RGS Control System review",
  other: "Other",
};
export const SHTE_BAND_LABEL: Record<ShteStabilityBand, string> = {
  unstable: "Unstable",
  needs_attention: "Needs attention",
  stabilizing: "Stabilizing",
  stable: "Stable",
  strong: "Strong",
  unknown: "Unknown",
};
export const SHTE_TREND_LABEL: Record<ShteTrendDirection, string> = {
  improving: "Improving",
  stable: "Holding steady",
  declining: "Slipping",
  unknown: "Unknown",
};

export async function adminListScorecardHistoryEntries(
  customerId: string,
): Promise<AdminScorecardHistoryEntry[]> {
  const { data, error } = await (supabase as any)
    .from("scorecard_history_entries")
    .select("*")
    .eq("customer_id", customerId)
    .order("scored_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminScorecardHistoryEntry[];
}

export async function adminCreateScorecardHistoryEntry(
  customerId: string,
  patch: Partial<AdminScorecardHistoryEntry> & { title: string },
): Promise<AdminScorecardHistoryEntry> {
  const { data, error } = await (supabase as any)
    .from("scorecard_history_entries")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminScorecardHistoryEntry;
}

export async function adminUpdateScorecardHistoryEntry(
  id: string,
  patch: Partial<AdminScorecardHistoryEntry>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("scorecard_history_entries").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveScorecardHistoryEntry(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("scorecard_history_entries")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientScorecardHistoryEntries(
  customerId: string,
): Promise<ClientScorecardHistoryEntry[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_scorecard_history_entries",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientScorecardHistoryEntry[];
}