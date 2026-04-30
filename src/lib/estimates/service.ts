// P20.1 — Estimates service.
//
// Thin Supabase wrapper that respects RLS (admins see all, clients see own).
// Status transitions go through `updateEstimateStatus` so the DB trigger
// records history and stamps lifecycle timestamps.

import { supabase } from "@/integrations/supabase/client";
import type { Estimate, EstimateStatus } from "./types";

export async function listEstimates(customerId: string): Promise<Estimate[]> {
  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("customer_id", customerId)
    .order("estimate_date", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as Estimate[];
}

export async function listInvoiceEstimateLinks(customerId: string) {
  const { data, error } = await supabase
    .from("invoice_entries")
    .select("source_estimate_id")
    .eq("customer_id", customerId)
    .not("source_estimate_id", "is", null);
  if (error) throw error;
  return (data ?? []) as { source_estimate_id: string | null }[];
}

export async function createEstimate(input: {
  customer_id: string;
  amount: number;
  client_or_job?: string | null;
  service_category?: string | null;
  estimate_number?: string | null;
  estimate_date?: string;
  expires_at?: string | null;
  notes?: string | null;
  status?: EstimateStatus;
}): Promise<Estimate> {
  const { data, error } = await supabase
    .from("estimates")
    .insert({
      customer_id: input.customer_id,
      amount: input.amount,
      client_or_job: input.client_or_job ?? null,
      service_category: input.service_category ?? null,
      estimate_number: input.estimate_number ?? null,
      estimate_date: input.estimate_date ?? new Date().toISOString().slice(0, 10),
      expires_at: input.expires_at ?? null,
      notes: input.notes ?? null,
      status: input.status ?? "draft",
      source: "manual",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Estimate;
}

export async function updateEstimateStatus(
  estimateId: string,
  status: EstimateStatus,
): Promise<Estimate> {
  const { data, error } = await supabase
    .from("estimates")
    .update({ status })
    .eq("id", estimateId)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Estimate;
}

export async function linkInvoiceToEstimate(
  estimateId: string,
  invoiceId: string,
): Promise<void> {
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from("invoice_entries").update({ source_estimate_id: estimateId }).eq("id", invoiceId),
    supabase
      .from("estimates")
      .update({ status: "converted", converted_invoice_id: invoiceId })
      .eq("id", estimateId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
}

export async function deleteEstimate(estimateId: string): Promise<void> {
  const { error } = await supabase.from("estimates").delete().eq("id", estimateId);
  if (error) throw error;
}