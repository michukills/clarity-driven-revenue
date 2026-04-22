import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BccDataset } from "./types";
import { SAMPLE_DATASET } from "./sample";

export interface ClientRevenueTrackerDataState {
  loading: boolean;
  data: BccDataset;
  isSample: boolean;
  reload: () => Promise<void>;
}

const empty: BccDataset = {
  revenue: [],
  expenses: [],
  payroll: [],
  labor: [],
  invoices: [],
  cashflow: [],
  goals: [],
};

export function useClientRevenueTrackerData(customerId: string | null | undefined): ClientRevenueTrackerDataState {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BccDataset>(empty);
  const [isSample, setIsSample] = useState(false);

  const load = useCallback(async () => {
    if (!customerId) {
      setData(SAMPLE_DATASET);
      setIsSample(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [revenue, expenses, payroll, labor, invoices, cashflow, goals, weekly] = await Promise.all([
      supabase.from("revenue_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("expense_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("payroll_entries").select("*").eq("customer_id", customerId).order("pay_period_end", { ascending: false }),
      supabase.from("labor_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("invoice_entries").select("*").eq("customer_id", customerId).order("invoice_date", { ascending: false }),
      supabase.from("cash_flow_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("business_goals").select("*").eq("customer_id", customerId),
      supabase.from("weekly_checkins").select("*").eq("customer_id", customerId).order("week_end", { ascending: false }),
    ]);

    const next: BccDataset = {
      revenue: (revenue.data as any) || [],
      expenses: (expenses.data as any) || [],
      payroll: (payroll.data as any) || [],
      labor: (labor.data as any) || [],
      invoices: (invoices.data as any) || [],
      cashflow: (cashflow.data as any) || [],
      goals: (goals.data as any) || [],
      weekly_checkins: dedupLatestPerWeek((weekly?.data as any) || []),
    };

    // Linked clients always see their own (possibly empty) data.
    // Sample data is only shown for unlinked previews (no customerId), handled above.
    setData(next);
    setIsSample(false);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, data, isSample, reload: load };
}

/**
 * Treat weekly_checkins as one weekly summary record per customer per week.
 * Saves still insert new rows (preserving history), but reporting/trends
 * always read the latest row for each (customer_id, week_end). The newest
 * created_at wins. Existing rows are preserved.
 */
function dedupLatestPerWeek(rows: any[]): any[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const byKey = new Map<string, any>();
  for (const r of rows) {
    const key = `${r.customer_id || ""}|${r.week_end || ""}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, r);
      continue;
    }
    const a = new Date(existing.created_at || 0).getTime();
    const b = new Date(r.created_at || 0).getTime();
    if (b > a) byKey.set(key, r);
  }
  return Array.from(byKey.values()).sort((x, y) =>
    (x.week_end || "") < (y.week_end || "") ? 1 : -1,
  );
}