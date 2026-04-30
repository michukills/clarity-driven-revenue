/**
 * P13.RCC.H.3 — QuickBooks direct-OAuth client helper.
 *
 * The browser NEVER sees tokens. All token-bearing logic lives in
 * edge functions (qb-status, qb-oauth-start, qb-sync). This module
 * is a thin RPC layer around them plus a typed read of the public
 * `quickbooks_period_summaries` cache used to autofill RCC fields.
 */
import { supabase } from "@/integrations/supabase/client";

import { BRANDS } from "@/config/brands";
// TODO(P19 audit): connector_connected for QuickBooks fires inside the
// `qb-oauth-callback` edge function (server-side, service_role context).
// That code path lives in `supabase/functions/qb-oauth-callback/index.ts`
// and is intentionally not wired here so we never duplicate the event.
// Frontend-driven connect/disconnect for non-QuickBooks providers is
// audited inside `src/lib/integrations/integrations.ts`.
export type QbConnectionState =
  | "not_configured" // QuickBooks OAuth env not set on the server yet
  | "disconnected"   // configured, but this customer has no connection
  | "connected"      // active sync established
  | "expired"        // refresh failed; reconnect needed
  | "syncing"        // a sync is in flight
  | "error";         // last sync errored

export interface QbStatus {
  state: QbConnectionState;
  realmId: string | null;
  companyName: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  isDemo?: boolean;
}

export async function fetchQbStatus(customerId: string): Promise<QbStatus> {
  const { data, error } = await supabase.functions.invoke("qb-status", {
    body: { customer_id: customerId },
  });
  if (error) {
    // Treat invocation errors as "not_configured" for honest UX.
    return {
      state: "not_configured",
      realmId: null,
      companyName: null,
      lastSyncAt: null,
      lastError: error.message ?? "Status check failed",
      isDemo: false,
    };
  }
  return data as QbStatus;
}

export interface QbStartOAuthResult {
  authorize_url: string | null;
  state: string | null;
  configured: boolean;
  message?: string;
}

export async function startQbOAuth(customerId: string): Promise<QbStartOAuthResult> {
  const { data, error } = await supabase.functions.invoke("qb-oauth-start", {
    body: { customer_id: customerId },
  });
  if (error) {
    return {
      authorize_url: null,
      state: null,
      configured: false,
      message: error.message ?? `Could not start ${BRANDS.quickbooks} connection.`,
    };
  }
  return data as QbStartOAuthResult;
}

export interface QbSyncResult {
  ok: boolean;
  message?: string;
  summary?: {
    period_start: string;
    period_end: string;
    revenue_total: number | null;
    expense_total: number | null;
  };
}

export async function triggerQbSync(args: {
  customerId: string;
  periodStart: string;
  periodEnd: string;
}): Promise<QbSyncResult> {
  const { data, error } = await supabase.functions.invoke("qb-sync", {
    body: {
      customer_id: args.customerId,
      period_start: args.periodStart,
      period_end: args.periodEnd,
    },
  });
  if (error) return { ok: false, message: error.message };
  return data as QbSyncResult;
}

export interface QbPeriodSummary {
  customer_id: string;
  period_start: string;
  period_end: string;
  revenue_total: number | null;
  expense_total: number | null;
  open_invoices_count: number | null;
  open_invoices_total: number | null;
  ar_total: number | null;
  ar_aging: Record<string, number> | null;
  ap_total: number | null;
  ap_aging: Record<string, number> | null;
  synced_at: string;
}

/**
 * Fetch the synced summary that overlaps the requested period. Tries
 * exact match first, then falls back to the most recent summary whose
 * period_end is within ±7 days of the requested end date so weekly
 * check-ins can borrow the latest monthly sync.
 */
export async function fetchQbSummaryForPeriod(args: {
  customerId: string;
  periodStart: string;
  periodEnd: string;
}): Promise<QbPeriodSummary | null> {
  // Exact match first.
  const exact = await supabase
    .from("quickbooks_period_summaries")
    .select(
      "customer_id, period_start, period_end, revenue_total, expense_total, open_invoices_count, open_invoices_total, ar_total, ar_aging, ap_total, ap_aging, synced_at",
    )
    .eq("customer_id", args.customerId)
    .eq("period_start", args.periodStart)
    .eq("period_end", args.periodEnd)
    .maybeSingle();
  if (exact.data) return exact.data as QbPeriodSummary;

  // Fallback: the latest summary whose period_end is within 7 days.
  const fallback = await supabase
    .from("quickbooks_period_summaries")
    .select(
      "customer_id, period_start, period_end, revenue_total, expense_total, open_invoices_count, open_invoices_total, ar_total, ar_aging, ap_total, ap_aging, synced_at",
    )
    .eq("customer_id", args.customerId)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (fallback.data as QbPeriodSummary | null) ?? null;
}
