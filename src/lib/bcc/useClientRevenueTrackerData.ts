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
    const [revenue, expenses, payroll, labor, invoices, cashflow, goals] = await Promise.all([
      supabase.from("revenue_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("expense_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("payroll_entries").select("*").eq("customer_id", customerId).order("pay_period_end", { ascending: false }),
      supabase.from("labor_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("invoice_entries").select("*").eq("customer_id", customerId).order("invoice_date", { ascending: false }),
      supabase.from("cash_flow_entries").select("*").eq("customer_id", customerId).order("entry_date", { ascending: false }),
      supabase.from("business_goals").select("*").eq("customer_id", customerId),
    ]);

    const next: BccDataset = {
      revenue: (revenue.data as any) || [],
      expenses: (expenses.data as any) || [],
      payroll: (payroll.data as any) || [],
      labor: (labor.data as any) || [],
      invoices: (invoices.data as any) || [],
      cashflow: (cashflow.data as any) || [],
      goals: (goals.data as any) || [],
    };

    const totalRows = Object.values(next).reduce((sum, rows) => sum + rows.length, 0);
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