/* ============================================================================
   P7.2 — Cross-Client Revenue Control Center™ Alert Aggregation

   Pure aggregation layer. Loads RCC-active clients in bulk (one query per
   table) and runs the existing intelligence + longTrend engines per-client
   in memory to produce a flat list of typed alerts. No new tables, no
   persistence, no resolution lifecycle. Diagnostic-only clients are
   excluded — RCC access requires an explicit "addon" client resource.

   Severity scale:
     - critical : RGS review requested, critical cash concern, sustained
                  negative net cash
     - warning  : sustained decline / rising expense / rising labor /
                  pipeline confidence low / repeated blocker pattern /
                  multi-week revenue down or expense up
     - watch    : missing data / overdue weekly check-in / low confidence
   ========================================================================= */

import { supabase } from "@/integrations/supabase/client";
import type { BccDataset, WeeklyCheckin } from "./types";
import { buildWeekRollups, assessDataQuality } from "./intelligence";
import { buildLongHorizonAnalysis } from "./longTrend";
import { isRccResource } from "@/lib/access/rccResource";

export type RccAlertSeverity = "critical" | "warning" | "watch";

export type RccAlertType =
  | "rgs_review_requested"
  | "cash_critical"
  | "cash_persistent"
  | "revenue_decline_persistent"
  | "expense_pressure_persistent"
  | "labor_pressure_persistent"
  | "pipeline_confidence_low"
  | "repeated_blocker_pattern"
  | "revenue_down_streak"
  | "net_cash_negative_streak"
  | "checkin_overdue"
  | "low_confidence_data";

export interface RccCrossClientAlert {
  id: string;
  customerId: string;
  customerLabel: string;
  type: RccAlertType;
  severity: RccAlertSeverity;
  title: string;
  reason: string;
  latestSignalAt: string | null;
  href: string;
}

interface CustomerLite {
  id: string;
  full_name: string;
  business_name: string | null;
}

/* ------------------------------------------------------------------ */
/*  RCC-active client identification (P7.2.1)                          */
/* ------------------------------------------------------------------ */
/*  RCC access = at least one assigned resource that is the Revenue    */
/*  Control Center™ / Revenue Tracker (Client) row, matched via the    */
/*  shared isRccResource helper. Generic add-ons (Onboarding Worksheet,*/
/*  Revenue & Risk Monitor, etc.) do NOT count. This matches the gate  */
/*  used by useRccAccess.ts so admins see exactly the set of clients   */
/*  who themselves have RCC unlocked.                                  */

async function loadRccActiveCustomerIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("resource_assignments")
    .select("customer_id, resources!inner(title, url, tool_category, tool_audience)");
  if (error || !data) return [];
  const ids = new Set<string>();
  for (const row of data as any[]) {
    if (row.customer_id && isRccResource(row.resources)) {
      ids.add(row.customer_id);
    }
  }
  return Array.from(ids);
}

/* ------------------------------------------------------------------ */
/*  Bulk data load (only across active RCC clients)                    */
/* ------------------------------------------------------------------ */

async function bulkLoadFor(customerIds: string[]) {
  if (customerIds.length === 0) {
    return {
      customers: [] as CustomerLite[],
      perCustomer: new Map<string, BccDataset>(),
      latestCheckinAt: new Map<string, string>(),
    };
  }

  const [cust, rev, exp, pay, lab, inv, cash, goals, checkins] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, business_name")
      .in("id", customerIds)
      .is("archived_at", null),
    supabase.from("revenue_entries").select("*").in("customer_id", customerIds),
    supabase.from("expense_entries").select("*").in("customer_id", customerIds),
    supabase.from("payroll_entries").select("*").in("customer_id", customerIds),
    supabase.from("labor_entries").select("*").in("customer_id", customerIds),
    supabase.from("invoice_entries").select("*").in("customer_id", customerIds),
    supabase.from("cash_flow_entries").select("*").in("customer_id", customerIds),
    supabase.from("business_goals").select("*").in("customer_id", customerIds),
    supabase
      .from("weekly_checkins")
      .select("*")
      .in("customer_id", customerIds)
      .order("week_end", { ascending: false }),
  ]);

  const customers = (cust.data as CustomerLite[]) || [];
  const perCustomer = new Map<string, BccDataset>();
  const latestCheckinAt = new Map<string, string>();

  for (const c of customers) {
    perCustomer.set(c.id, {
      revenue: [],
      expenses: [],
      payroll: [],
      labor: [],
      invoices: [],
      cashflow: [],
      goals: [],
      weekly_checkins: [],
    });
  }

  const push = <K extends keyof BccDataset>(arr: any[] | null, key: K) => {
    for (const row of arr || []) {
      const d = perCustomer.get(row.customer_id);
      if (!d) continue;
      (d[key] as any[]).push(row);
    }
  };
  push(rev.data as any[], "revenue");
  push(exp.data as any[], "expenses");
  push(pay.data as any[], "payroll");
  push(lab.data as any[], "labor");
  push(inv.data as any[], "invoices");
  push(cash.data as any[], "cashflow");
  push(goals.data as any[], "goals");

  // Dedupe weekly_checkins per (customer, week_end) — latest created_at wins.
  const seen = new Map<string, WeeklyCheckin>();
  for (const row of ((checkins.data as unknown) as WeeklyCheckin[]) || []) {
    const key = `${row.customer_id}|${row.week_end}`;
    const prev = seen.get(key);
    if (!prev || (row.created_at && prev.created_at && row.created_at > prev.created_at)) {
      seen.set(key, row);
    }
    const recent = latestCheckinAt.get(row.customer_id);
    if (!recent || (row.week_end && row.week_end > recent)) {
      latestCheckinAt.set(row.customer_id, row.week_end);
    }
  }
  for (const c of seen.values()) {
    perCustomer.get(c.customer_id)?.weekly_checkins!.push(c);
  }

  return { customers, perCustomer, latestCheckinAt };
}

/* ------------------------------------------------------------------ */
/*  Per-client alert builder                                           */
/* ------------------------------------------------------------------ */

const TEN_DAYS_MS = 10 * 86400_000;

function customerLabel(c: CustomerLite): string {
  return (c.business_name && c.business_name.trim()) || c.full_name || "Client";
}

function rccHref(customerId: string): string {
  return `/admin/clients/${customerId}/business-control`;
}

function buildAlertsForClient(
  c: CustomerLite,
  data: BccDataset,
  latestCheckinWeekEnd: string | null,
): RccCrossClientAlert[] {
  const out: RccCrossClientAlert[] = [];
  const label = customerLabel(c);
  const href = rccHref(c.id);

  const weeks = buildWeekRollups(data);
  const quality = assessDataQuality(weeks);
  const longTrend = buildLongHorizonAnalysis(weeks, quality.confidence);

  const latestWeek = weeks[0] || null;
  const latestCheckin = latestWeek?.checkin || null;
  const latestSignal = latestWeek?.weekEnd || latestCheckinWeekEnd || null;

  // 1. Client requested RGS review (latest check-in)
  if (latestCheckin?.request_rgs_review) {
    out.push({
      id: `${c.id}:rgs_review_requested`,
      customerId: c.id,
      customerLabel: label,
      type: "rgs_review_requested",
      severity: "critical",
      title: "Client requested RGS review",
      reason: "Review the latest weekly check-in and follow up directly.",
      latestSignalAt: latestSignal,
      href,
    });
  }

  // 2. Critical cash concern (latest check-in)
  if (latestCheckin?.cash_concern_level === "critical") {
    out.push({
      id: `${c.id}:cash_critical`,
      customerId: c.id,
      customerLabel: label,
      type: "cash_critical",
      severity: "critical",
      title: "Critical cash concern reported",
      reason: "Confirm cash position and obligations for the next 7–30 days.",
      latestSignalAt: latestSignal,
      href,
    });
  }

  // 3. Cash concern persisted 3+ of last 6 weeks
  const cashPersistence = longTrend.persistence.find((p) => p.key === "cash_concern");
  if (cashPersistence?.active) {
    out.push({
      id: `${c.id}:cash_persistent`,
      customerId: c.id,
      customerLabel: label,
      type: "cash_persistent",
      severity: "warning",
      title: "Pattern detected: persistent cash pressure",
      reason: cashPersistence.narrative,
      latestSignalAt: latestSignal,
      href,
    });
  }

  // 4. Revenue declined 4+ of last 6 weeks
  const revPersistence = longTrend.persistence.find((p) => p.key === "revenue_decline");
  if (revPersistence?.active) {
    out.push({
      id: `${c.id}:revenue_decline_persistent`,
      customerId: c.id,
      customerLabel: label,
      type: "revenue_decline_persistent",
      severity: "warning",
      title: "Pattern detected: sustained revenue decline",
      reason: revPersistence.narrative,
      latestSignalAt: latestSignal,
      href,
    });
  }

  // 5. Expenses rising 4+ of last 6 weeks
  const expPersistence = longTrend.persistence.find((p) => p.key === "expense_pressure");
  if (expPersistence?.active) {
    out.push({
      id: `${c.id}:expense_pressure_persistent`,
      customerId: c.id,
      customerLabel: label,
      type: "expense_pressure_persistent",
      severity: "warning",
      title: "Pattern detected: rising expense pressure",
      reason: expPersistence.narrative,
      latestSignalAt: latestSignal,
      href,
    });
  }

  // 6. Labor pressure rising 4+ of last 6 weeks
  const laborPersistence = longTrend.persistence.find((p) => p.key === "labor_pressure");
  if (laborPersistence?.active) {
    out.push({
      id: `${c.id}:labor_pressure_persistent`,
      customerId: c.id,
      customerLabel: label,
      type: "labor_pressure_persistent",
      severity: "warning",
      title: "Pattern detected: rising labor cost",
      reason: laborPersistence.narrative,
      latestSignalAt: latestSignal,
      href,
    });
  }

  // 7. Pipeline confidence low 2+ recent check-ins
  const pipePersistence = longTrend.persistence.find((p) => p.key === "low_pipeline_confidence");
  if (pipePersistence?.active) {
    out.push({
      id: `${c.id}:pipeline_confidence_low`,
      customerId: c.id,
      customerLabel: label,
      type: "pipeline_confidence_low",
      severity: "warning",
      title: "Pattern detected: low pipeline confidence",
      reason: pipePersistence.narrative,
      latestSignalAt: latestSignal,
      href,
    });
  }

  // 8. Repeated blocker pattern (process / people / sales / cash / owner)
  for (const b of longTrend.blockerStreaks) {
    out.push({
      id: `${c.id}:repeated_blocker:${b.type}`,
      customerId: c.id,
      customerLabel: label,
      type: "repeated_blocker_pattern",
      severity: "warning",
      title: `Pattern detected: ${b.label.toLowerCase()}`,
      reason: b.narrative,
      latestSignalAt: latestSignal,
      href,
    });
  }

  // 9. Revenue down consecutive weeks (streak)
  const revStreak = longTrend.streaks.find((s) => s.metric === "revenue_down");
  if (revStreak && revStreak.weeks >= 3) {
    out.push({
      id: `${c.id}:revenue_down_streak`,
      customerId: c.id,
      customerLabel: label,
      type: "revenue_down_streak",
      severity: "warning",
      title: "Revenue down multiple weeks in a row",
      reason: revStreak.narrative,
      latestSignalAt: latestSignal,
      href,
    });
  }

  // 10. Net cash negative consecutive weeks
  const cashStreak = longTrend.streaks.find((s) => s.metric === "cash_negative");
  if (cashStreak && cashStreak.weeks >= 2) {
    const sustained = cashStreak.weeks >= 3;
    out.push({
      id: `${c.id}:net_cash_negative_streak`,
      customerId: c.id,
      customerLabel: label,
      type: "net_cash_negative_streak",
      severity: sustained ? "critical" : "warning",
      title: sustained
        ? "Sustained negative net cash"
        : "Net cash negative two weeks running",
      reason: cashStreak.narrative,
      latestSignalAt: latestSignal,
      href,
    });
  }

  // 11. Weekly check-in overdue (no check-in within ~10 days)
  const lastWeekEnd = latestCheckinWeekEnd ? new Date(latestCheckinWeekEnd).getTime() : null;
  const isOverdue =
    !lastWeekEnd || Date.now() - lastWeekEnd > TEN_DAYS_MS;
  if (isOverdue) {
    out.push({
      id: `${c.id}:checkin_overdue`,
      customerId: c.id,
      customerLabel: label,
      type: "checkin_overdue",
      severity: "watch",
      title: lastWeekEnd
        ? "Weekly check-in overdue"
        : "No weekly check-in on file",
      reason: lastWeekEnd
        ? `Last check-in covered week ending ${latestCheckinWeekEnd}. Follow up to keep cadence.`
        : "No weekly check-in has been saved yet. Confirm the client knows the cadence.",
      latestSignalAt: latestCheckinWeekEnd,
      href,
    });
  }

  // 12. Missing data / low confidence
  if (quality.confidence === "low" && weeks.length > 0) {
    out.push({
      id: `${c.id}:low_confidence_data`,
      customerId: c.id,
      customerLabel: label,
      type: "low_confidence_data",
      severity: "watch",
      title: "Low-confidence RCC insight",
      reason: quality.note,
      latestSignalAt: latestSignal,
      href,
    });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/*  Public entry — load + aggregate                                    */
/* ------------------------------------------------------------------ */

const SEV_RANK: Record<RccAlertSeverity, number> = {
  critical: 0,
  warning: 1,
  watch: 2,
};

export interface RccCrossClientAlertsResult {
  alerts: RccCrossClientAlert[];
  activeClientCount: number;
}

export async function loadRccCrossClientAlerts(): Promise<RccCrossClientAlertsResult> {
  const ids = await loadRccActiveCustomerIds();
  if (ids.length === 0) return { alerts: [], activeClientCount: 0 };

  const { customers, perCustomer, latestCheckinAt } = await bulkLoadFor(ids);

  const alerts: RccCrossClientAlert[] = [];
  for (const c of customers) {
    const data = perCustomer.get(c.id);
    if (!data) continue;
    const latestWeekEnd = latestCheckinAt.get(c.id) || null;
    alerts.push(...buildAlertsForClient(c, data, latestWeekEnd));
  }

  alerts.sort((a, b) => {
    const sev = SEV_RANK[a.severity] - SEV_RANK[b.severity];
    if (sev !== 0) return sev;
    const at = (b.latestSignalAt || "").localeCompare(a.latestSignalAt || "");
    if (at !== 0) return at;
    return a.customerLabel.localeCompare(b.customerLabel);
  });

  return { alerts, activeClientCount: customers.length };
}