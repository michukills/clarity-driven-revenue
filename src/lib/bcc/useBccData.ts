import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BccDataset } from "./types";
import { SAMPLE_DATASET } from "./sample";

export interface BccDataState {
  loading: boolean;
  data: BccDataset;
  isSample: boolean;
  /** True when the customer record is flagged `is_demo_account = true`. */
  isDemoAccount: boolean;
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

function mapExpenseCategoryName(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/^\[([^\]]+)\]\s*/);
  return match?.[1]?.trim() || null;
}

/**
 * Loads Business Control Center data for one customer.
 *
 * Sample-data rules (P12.3.R correction):
 * - Sample/seeded showcase data is ONLY ever returned for accounts explicitly
 *   flagged `customers.is_demo_account = true`. This is the explicit demo
 *   account concept.
 * - Normal accounts with zero records render a clean empty state. They never
 *   see pseudo "sample" rows that look like saved data but cannot be edited.
 * - When `customerId` is null (no auth context yet), we render SAMPLE_DATASET
 *   purely as a marketing/preview fallback so the surface is never blank in
 *   landing/preview contexts.
 */
export function useBccData(customerId: string | null | undefined): BccDataState {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BccDataset>(empty);
  const [isSample, setIsSample] = useState(false);
  const [isDemoAccount, setIsDemoAccount] = useState(false);

  const load = useCallback(async () => {
    if (!customerId) {
      setData(SAMPLE_DATASET);
      setIsSample(true);
      setIsDemoAccount(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [customer, rev, exp, pay, lab, inv, cash, goals] = await Promise.all([
      supabase.from("customers").select("is_demo_account").eq("id", customerId).maybeSingle(),
      supabase.from("revenue_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("expense_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("payroll_entries").select("*").eq("customer_id", customerId).order("pay_period_end", { ascending: false }),
      supabase.from("labor_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("invoice_entries").select("*").eq("customer_id", customerId).order("invoice_date", { ascending: false }),
      supabase.from("cash_flow_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("business_goals").select("*").eq("customer_id", customerId),
    ]);

    const demo = Boolean((customer.data as any)?.is_demo_account);
    setIsDemoAccount(demo);

    const next: BccDataset = {
      revenue: (rev.data as any) || [],
      expenses: (((exp.data as any) || []) as BccDataset["expenses"]).map((row) => ({
        ...row,
        category_name: row.category_name ?? mapExpenseCategoryName(row.notes),
      })),
      payroll: (pay.data as any) || [],
      labor: (lab.data as any) || [],
      invoices: (inv.data as any) || [],
      cashflow: (cash.data as any) || [],
      goals: (goals.data as any) || [],
    };
    const totalRows = Object.values(next).reduce((a, arr) => a + arr.length, 0);
    if (totalRows > 0) {
      // Real data — always render it, regardless of demo flag.
      setData(next);
      setIsSample(false);
    } else if (demo) {
      // Demo account, no real records yet — show seeded showcase data.
      setData(SAMPLE_DATASET);
      setIsSample(true);
    } else {
      // Normal account with no data — clean empty state, never seeded rows.
      setData(empty);
      setIsSample(false);
    }
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, data, isSample, isDemoAccount, reload: load };
}