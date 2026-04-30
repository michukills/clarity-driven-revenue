// P20.8 — Customer business metrics service.
//
// Admin-only writes/reads (RLS enforces this on the DB; we never expose
// the service-role key in the frontend). Reads return latest-by-customer.

import { supabase } from "@/integrations/supabase/client";
import type { CustomerBusinessMetrics, CustomerBusinessMetricsUpsert } from "./types";

const TABLE = "client_business_metrics" as const;

export async function listCustomerMetrics(
  customerId: string,
): Promise<CustomerBusinessMetrics[]> {
  if (!customerId) return [];
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CustomerBusinessMetrics[];
}

export async function getLatestCustomerMetrics(
  customerId: string,
): Promise<CustomerBusinessMetrics | null> {
  if (!customerId) return null;
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as CustomerBusinessMetrics | null) ?? null;
}

/**
 * Upsert the latest metrics row for a customer. If a metrics row already
 * exists for the customer, update it; otherwise insert a new row. Null
 * values stay null (we never silently coerce to 0).
 */
export async function upsertCustomerMetrics(
  customerId: string,
  payload: Omit<CustomerBusinessMetricsUpsert, "customer_id">,
): Promise<CustomerBusinessMetrics> {
  if (!customerId) throw new Error("customer_id required");
  const existing = await getLatestCustomerMetrics(customerId);
  const row = { ...payload, customer_id: customerId };
  if (existing) {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as CustomerBusinessMetrics;
  }
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as CustomerBusinessMetrics;
}