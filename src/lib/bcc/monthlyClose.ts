/* P11.3 — Monthly Close ritual.
 *
 * Provides admin helpers to manage monthly_closes rows and to trigger
 * canonical BCC signal emission on close.
 */

import { supabase } from "@/integrations/supabase/client";
import { emitBccPeriodSignals } from "@/lib/diagnostics/bccSignalEmitter";

export type MonthlyCloseStatus = "open" | "ready" | "closed" | "reopened";

export interface MonthlyCloseRow {
  id: string;
  customer_id: string;
  period_start: string;
  period_end: string;
  status: MonthlyCloseStatus;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  last_signals_emitted_at: string | null;
  signals_emitted_count: number;
  created_at: string;
  updated_at: string;
}

/** Build the first/last day of the month containing `dateStr` (YYYY-MM-DD). */
export function monthBounds(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + "T00:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function priorMonthBounds(periodStart: string): { start: string; end: string } {
  const d = new Date(periodStart + "T00:00:00Z");
  const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return monthBounds(prev.toISOString().slice(0, 10));
}

export async function listMonthlyCloses(
  customerId: string,
  limit = 12,
): Promise<MonthlyCloseRow[]> {
  const { data, error } = await supabase
    .from("monthly_closes")
    .select("*")
    .eq("customer_id", customerId)
    .order("period_end", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as MonthlyCloseRow[];
}

export async function getOrCreateMonthlyClose(
  customerId: string,
  periodStart: string,
  periodEnd: string,
): Promise<MonthlyCloseRow> {
  const existing = await supabase
    .from("monthly_closes")
    .select("*")
    .eq("customer_id", customerId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();
  if (existing.data) return existing.data as MonthlyCloseRow;
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("monthly_closes")
    .insert({
      customer_id: customerId,
      period_start: periodStart,
      period_end: periodEnd,
      status: "open",
      created_by: u.user?.id ?? null,
      updated_by: u.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MonthlyCloseRow;
}

export async function setMonthlyCloseStatus(
  rowId: string,
  status: MonthlyCloseStatus,
  notes?: string | null,
): Promise<MonthlyCloseRow> {
  const { data: u } = await supabase.auth.getUser();
  const patch: {
    status: MonthlyCloseStatus;
    updated_by: string | null;
    closed_at?: string | null;
    closed_by?: string | null;
    notes?: string | null;
  } = {
    status,
    updated_by: u.user?.id ?? null,
  };
  if (status === "closed") {
    patch.closed_at = new Date().toISOString();
    patch.closed_by = u.user?.id ?? null;
  }
  if (typeof notes === "string") patch.notes = notes;

  const { data, error } = await supabase
    .from("monthly_closes")
    .update(patch as never)
    .eq("id", rowId)
    .select("*")
    .single();
  if (error) throw error;
  return data as MonthlyCloseRow;
}

/**
 * Close a monthly period and emit canonical BCC signals.
 * Dedupes naturally via the unique upsert key in `recordInsightSignal`
 * (customer_id, signal_source, signal_type, source_table, source_id, evidence_label).
 * Re-closing or reopen+close on the same monthly_closes.id will not duplicate signals.
 */
export async function closeMonthAndEmitSignals(
  customerId: string,
  periodStart: string,
  periodEnd: string,
  notes?: string | null,
): Promise<{ row: MonthlyCloseRow; emitted: number }> {
  const row = await getOrCreateMonthlyClose(customerId, periodStart, periodEnd);
  const closed = await setMonthlyCloseStatus(row.id, "closed", notes ?? row.notes ?? null);

  let emitted = 0;
  try {
    const res = await emitBccPeriodSignals({
      customerId,
      periodStart,
      periodEnd,
      monthlyCloseId: closed.id,
    });
    emitted = res.emitted;
  } catch {
    /* swallow */
  }

  // Stamp emission status (best effort, non-blocking).
  try {
    await supabase
      .from("monthly_closes")
      .update({
        last_signals_emitted_at: new Date().toISOString(),
        signals_emitted_count: (closed.signals_emitted_count ?? 0) + emitted,
      })
      .eq("id", closed.id);
  } catch {
    /* swallow */
  }

  return { row: { ...closed, last_signals_emitted_at: new Date().toISOString() }, emitted };
}

export const MONTHLY_CLOSE_STATUS_LABEL: Record<MonthlyCloseStatus, string> = {
  open: "Open",
  ready: "Ready to close",
  closed: "Closed",
  reopened: "Reopened",
};
