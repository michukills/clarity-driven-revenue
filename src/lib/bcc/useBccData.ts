import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BccDataset } from "./types";
import { SAMPLE_DATASET } from "./sample";

export interface BccDataState {
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

/**
 * Loads BCC data for one customer. If the customer has no real records yet,
 * returns the SAMPLE_DATASET so the UI is never blank, and isSample = true.
 */
export function useBccData(customerId: string | null | undefined): BccDataState {
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
    const [rev, exp, pay, lab, inv, cash, goals] = await Promise.all([
      supabase.from("revenue_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("expense_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("payroll_entries").select("*").eq("customer_id", customerId).order("pay_period_end", { ascending: false }),
      supabase.from("labor_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("invoice_entries").select("*").eq("customer_id", customerId).order("invoice_date", { ascending: false }),
      supabase.from("cash_flow_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("business_goals").select("*").eq("customer_id", customerId),
    ]);

    const next: BccDataset = {
      revenue: (rev.data as any) || [],
      expenses: (exp.data as any) || [],
      payroll: (pay.data as any) || [],
      labor: (lab.data as any) || [],
      invoices: (inv.data as any) || [],
      cashflow: (cash.data as any) || [],
      goals: (goals.data as any) || [],
    };
    const totalRows = Object.values(next).reduce((a, arr) => a + arr.length, 0);
    if (totalRows === 0) {
      setData(SAMPLE_DATASET);
      setIsSample(true);
    } else {
      setData(next);
      setIsSample(false);
    }
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, data, isSample, reload: load };
}