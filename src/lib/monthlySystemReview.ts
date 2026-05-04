import { supabase } from "@/integrations/supabase/client";

export type MsrReviewStatus =
  | "draft" | "in_review" | "ready_for_client" | "shared_with_client" | "archived";

export type MsrOverallSignal =
  | "improving" | "holding_steady" | "needs_attention" | "slipping" | "unknown";

export type MsrSectionKind =
  | "what_changed" | "signals_to_review" | "score_trend"
  | "priority_actions" | "owner_decisions" | "rgs_reviewed"
  | "next_review" | "other";

export interface AdminMonthlySystemReviewEntry {
  id: string;
  customer_id: string;
  title: string;
  review_period_label: string | null;
  review_period_start: string | null;
  review_period_end: string | null;
  status: MsrReviewStatus;
  overall_signal: MsrOverallSignal;
  what_changed_summary: string | null;
  signals_summary: string | null;
  score_trend_summary: string | null;
  priority_actions_summary: string | null;
  owner_decisions_summary: string | null;
  rgs_reviewed_summary: string | null;
  next_review_summary: string | null;
  client_visible_summary: string | null;
  admin_summary: string | null;
  internal_notes: string | null;
  next_review_date: string | null;
  client_visible: boolean;
  admin_review_required: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClientMonthlySystemReviewEntry {
  id: string;
  title: string;
  review_period_label: string | null;
  review_period_start: string | null;
  review_period_end: string | null;
  overall_signal: MsrOverallSignal;
  what_changed_summary: string | null;
  signals_summary: string | null;
  score_trend_summary: string | null;
  priority_actions_summary: string | null;
  owner_decisions_summary: string | null;
  rgs_reviewed_summary: string | null;
  next_review_summary: string | null;
  client_visible_summary: string | null;
  next_review_date: string | null;
  updated_at: string;
}

export const MSR_REVIEW_STATUSES: MsrReviewStatus[] = [
  "draft", "in_review", "ready_for_client", "shared_with_client", "archived",
];
export const MSR_OVERALL_SIGNALS: MsrOverallSignal[] = [
  "improving", "holding_steady", "needs_attention", "slipping", "unknown",
];

export const MSR_STATUS_LABEL: Record<MsrReviewStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  ready_for_client: "Ready for client",
  shared_with_client: "Shared with client",
  archived: "Archived",
};
export const MSR_SIGNAL_LABEL: Record<MsrOverallSignal, string> = {
  improving: "Improving",
  holding_steady: "Holding steady",
  needs_attention: "Needs attention",
  slipping: "Slipping",
  unknown: "Unknown",
};

export async function adminListMonthlySystemReviewEntries(
  customerId: string,
): Promise<AdminMonthlySystemReviewEntry[]> {
  const { data, error } = await (supabase as any)
    .from("monthly_system_review_entries")
    .select("*")
    .eq("customer_id", customerId)
    .order("review_period_end", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminMonthlySystemReviewEntry[];
}

export async function adminCreateMonthlySystemReviewEntry(
  customerId: string,
  patch: Partial<AdminMonthlySystemReviewEntry> & { title: string },
): Promise<AdminMonthlySystemReviewEntry> {
  const { data, error } = await (supabase as any)
    .from("monthly_system_review_entries")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminMonthlySystemReviewEntry;
}

export async function adminUpdateMonthlySystemReviewEntry(
  id: string,
  patch: Partial<AdminMonthlySystemReviewEntry>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("monthly_system_review_entries").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveMonthlySystemReviewEntry(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("monthly_system_review_entries")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientMonthlySystemReviewEntries(
  customerId: string,
): Promise<ClientMonthlySystemReviewEntry[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_monthly_system_review_entries",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientMonthlySystemReviewEntry[];
}
