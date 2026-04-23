/* P11.2 — Cash Position + Obligations data layer.
 *
 * Pure data access + small derived helpers for:
 *   - cash_position_snapshots
 *   - financial_obligations
 *
 * Admin-managed under RLS. Client SELECT is allowed by RLS but no client
 * UI is wired in this pass.
 */

import { supabase } from "@/integrations/supabase/client";

export type ObligationType =
  | "vendor_payable"
  | "payroll"
  | "tax"
  | "debt"
  | "rent"
  | "insurance"
  | "software"
  | "owner_draw"
  | "other";

export type ObligationStatus =
  | "open"
  | "paid"
  | "overdue"
  | "deferred"
  | "canceled";

export type ObligationPriority = "high" | "medium" | "low";

export interface CashPositionSnapshot {
  id: string;
  customer_id: string;
  snapshot_date: string;
  cash_on_hand: number;
  available_cash: number | null;
  restricted_cash: number | null;
  notes: string | null;
  source: string | null;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialObligation {
  id: string;
  customer_id: string;
  obligation_type: ObligationType;
  label: string;
  vendor_or_payee: string | null;
  amount_due: number;
  due_date: string;
  status: ObligationStatus;
  priority: ObligationPriority;
  recurring: boolean;
  recurrence_label: string | null;
  notes: string | null;
  source: string | null;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

export const OBLIGATION_TYPE_LABEL: Record<ObligationType, string> = {
  vendor_payable: "Vendor / Payable",
  payroll: "Payroll",
  tax: "Tax",
  debt: "Debt / Loan",
  rent: "Rent",
  insurance: "Insurance",
  software: "Software",
  owner_draw: "Owner Draw",
  other: "Other",
};

/* ---------------------- cash position ---------------------- */

export async function listCashSnapshots(
  customerId: string,
  limit = 12,
): Promise<CashPositionSnapshot[]> {
  const { data, error } = await supabase
    .from("cash_position_snapshots")
    .select("*")
    .eq("customer_id", customerId)
    .order("snapshot_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CashPositionSnapshot[];
}

export async function latestCashSnapshot(
  customerId: string,
): Promise<CashPositionSnapshot | null> {
  const rows = await listCashSnapshots(customerId, 1);
  return rows[0] ?? null;
}

export async function upsertCashSnapshot(input: {
  customer_id: string;
  snapshot_date: string;
  cash_on_hand: number;
  available_cash?: number | null;
  restricted_cash?: number | null;
  notes?: string | null;
  source?: string | null;
  source_ref?: string | null;
}): Promise<CashPositionSnapshot> {
  const { data: auth } = await supabase.auth.getUser();
  const row = {
    customer_id: input.customer_id,
    snapshot_date: input.snapshot_date,
    cash_on_hand: input.cash_on_hand,
    available_cash: input.available_cash ?? null,
    restricted_cash: input.restricted_cash ?? null,
    notes: input.notes ?? null,
    source: input.source ?? "Manual",
    source_ref: input.source_ref ?? null,
    updated_by: auth.user?.id ?? null,
    created_by: auth.user?.id ?? null,
  };
  const { data, error } = await supabase
    .from("cash_position_snapshots")
    .upsert(row, { onConflict: "customer_id,snapshot_date" })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as CashPositionSnapshot;
}

/* ---------------------- obligations ---------------------- */

export async function listObligations(
  customerId: string,
): Promise<FinancialObligation[]> {
  const { data, error } = await supabase
    .from("financial_obligations")
    .select("*")
    .eq("customer_id", customerId)
    .order("due_date", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as FinancialObligation[];
}

export async function createObligation(input: {
  customer_id: string;
  obligation_type: ObligationType;
  label: string;
  vendor_or_payee?: string | null;
  amount_due: number;
  due_date: string;
  status?: ObligationStatus;
  priority?: ObligationPriority;
  recurring?: boolean;
  recurrence_label?: string | null;
  notes?: string | null;
  source?: string | null;
  source_ref?: string | null;
}): Promise<FinancialObligation> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("financial_obligations")
    .insert({
      customer_id: input.customer_id,
      obligation_type: input.obligation_type,
      label: input.label,
      vendor_or_payee: input.vendor_or_payee ?? null,
      amount_due: input.amount_due,
      due_date: input.due_date,
      status: input.status ?? "open",
      priority: input.priority ?? "medium",
      recurring: input.recurring ?? false,
      recurrence_label: input.recurrence_label ?? null,
      notes: input.notes ?? null,
      source: input.source ?? "Manual",
      source_ref: input.source_ref ?? null,
      created_by: auth.user?.id ?? null,
      updated_by: auth.user?.id ?? null,
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as FinancialObligation;
}

export async function updateObligation(
  id: string,
  patch: Partial<Omit<FinancialObligation, "id" | "customer_id" | "created_at" | "updated_at">>,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("financial_obligations")
    .update({ ...patch, updated_by: auth.user?.id ?? null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteObligation(id: string): Promise<void> {
  const { error } = await supabase.from("financial_obligations").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------- derived summary ---------------------- */

export interface CashPressureSummary {
  cashOnHand: number | null;
  availableCash: number | null;
  snapshotDate: string | null;
  obligationsTotalOpen: number;
  overdueTotal: number;
  overdueCount: number;
  dueIn7Total: number;
  dueIn7Count: number;
  dueIn30Total: number;
  dueIn30Count: number;
  /** Estimated months of runway, or null when inputs insufficient. */
  runwayMonths: number | null;
  /** Optional monthly burn used for runway, or null when unknown. */
  monthlyBurn: number | null;
}

/** Derive the operational cash-pressure summary. `monthlyBurn` is optional. */
export function summarizeCashPressure(args: {
  snapshot: CashPositionSnapshot | null;
  obligations: FinancialObligation[];
  monthlyBurn?: number | null;
  asOf?: Date;
}): CashPressureSummary {
  const today = args.asOf ?? new Date();
  const todayMs = new Date(today.toISOString().slice(0, 10)).getTime();
  const day = 24 * 60 * 60 * 1000;
  const open = args.obligations.filter(
    (o) => o.status === "open" || o.status === "overdue",
  );
  let overdueTotal = 0;
  let overdueCount = 0;
  let dueIn7Total = 0;
  let dueIn7Count = 0;
  let dueIn30Total = 0;
  let dueIn30Count = 0;
  let totalOpen = 0;
  for (const o of open) {
    const diffDays = Math.floor((new Date(o.due_date).getTime() - todayMs) / day);
    totalOpen += o.amount_due;
    if (o.status === "overdue" || diffDays < 0) {
      overdueTotal += o.amount_due;
      overdueCount += 1;
    } else {
      if (diffDays <= 7) {
        dueIn7Total += o.amount_due;
        dueIn7Count += 1;
      }
      if (diffDays <= 30) {
        dueIn30Total += o.amount_due;
        dueIn30Count += 1;
      }
    }
  }

  const cashOnHand = args.snapshot?.cash_on_hand ?? null;
  const availableCash = args.snapshot?.available_cash ?? cashOnHand;

  let runwayMonths: number | null = null;
  if (
    cashOnHand !== null &&
    typeof args.monthlyBurn === "number" &&
    args.monthlyBurn > 0
  ) {
    runwayMonths = cashOnHand / args.monthlyBurn;
  }

  return {
    cashOnHand,
    availableCash,
    snapshotDate: args.snapshot?.snapshot_date ?? null,
    obligationsTotalOpen: totalOpen,
    overdueTotal,
    overdueCount,
    dueIn7Total,
    dueIn7Count,
    dueIn30Total,
    dueIn30Count,
    runwayMonths,
    monthlyBurn:
      typeof args.monthlyBurn === "number" && args.monthlyBurn > 0
        ? args.monthlyBurn
        : null,
  };
}