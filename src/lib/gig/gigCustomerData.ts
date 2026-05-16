/**
 * P100 — Admin-only data layer for gig customers.
 *
 * Wraps the existing `customers` table with explicit gig-aware operations.
 * Every mutation writes a `customer_gig_audit` row so lifecycle changes are
 * traceable. Conversion to full client is the only path that flips
 * `is_gig=false`; it requires an explicit admin action.
 */

import { supabase } from "@/integrations/supabase/client";
import type { GigTier } from "./gigTier";

export type GigStatus = "active" | "archived" | "converted";

export interface GigCustomerRow {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  is_gig: boolean;
  gig_tier: GigTier | null;
  gig_package_type: string | null;
  gig_status: GigStatus | null;
  gig_tier_updated_at: string | null;
  gig_converted_to_full_client_at: string | null;
  archived_at: string | null;
  lifecycle_state: string | null;
  account_kind: string | null;
  created_at: string | null;
  service_type: string | null;
}

const GIG_COLS =
  "id, full_name, business_name, email, is_gig, gig_tier, gig_package_type, gig_status, gig_tier_updated_at, gig_converted_to_full_client_at, archived_at, lifecycle_state, account_kind, created_at, service_type";

async function currentAdminContext() {
  const { data } = await supabase.auth.getUser();
  return {
    userId: data.user?.id ?? null,
    email: data.user?.email ?? null,
  };
}

async function writeAudit(args: {
  customerId: string;
  action: string;
  priorTier?: GigTier | null;
  newTier?: GigTier | null;
  priorStatus?: GigStatus | null;
  newStatus?: GigStatus | null;
  packageType?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const ctx = await currentAdminContext();
  await supabase.from("customer_gig_audit").insert([{
    customer_id: args.customerId,
    action: args.action,
    prior_tier: args.priorTier ?? null,
    new_tier: args.newTier ?? null,
    prior_status: args.priorStatus ?? null,
    new_status: args.newStatus ?? null,
    package_type: args.packageType ?? null,
    performed_by: ctx.userId,
    performer_email: ctx.email,
    notes: args.notes ?? null,
    metadata: (args.metadata ?? {}) as Record<string, unknown>,
  }]);
}

export async function adminListGigCustomers(opts: {
  includeArchived?: boolean;
  includeConverted?: boolean;
} = {}): Promise<GigCustomerRow[]> {
  let q = supabase
    .from("customers")
    .select(GIG_COLS)
    .eq("is_gig", true)
    .order("created_at", { ascending: false })
    .limit(500);
  if (!opts.includeArchived) q = q.is("archived_at", null);
  const { data, error } = await q;
  if (error || !data) return [];
  const rows = data as unknown as GigCustomerRow[];
  return opts.includeConverted ? rows : rows.filter((r) => r.gig_status !== "converted");
}

export async function adminCreateGigCustomer(input: {
  fullName: string;
  email: string;
  businessName?: string;
  tier: GigTier;
  packageType?: string;
}): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: input.fullName,
      email: input.email,
      business_name: input.businessName ?? null,
      is_gig: true,
      gig_tier: input.tier,
      gig_package_type: input.packageType ?? null,
      gig_status: "active",
      gig_tier_updated_at: new Date().toISOString(),
      account_kind: "gig_work",
      lifecycle_state: "lead",
      service_type: "standalone deliverable",
      status: "active",
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Failed to create gig customer." };
  await writeAudit({
    customerId: data.id,
    action: "gig_customer_created",
    newTier: input.tier,
    newStatus: "active",
    packageType: input.packageType ?? null,
  });
  return { id: data.id };
}

export async function adminSetGigTier(
  customerId: string,
  newTier: GigTier,
): Promise<{ ok: true } | { error: string }> {
  const { data: existing } = await supabase
    .from("customers")
    .select("gig_tier, is_gig")
    .eq("id", customerId)
    .single();
  if (!existing) return { error: "Customer not found." };
  if (!existing.is_gig) return { error: "Not a gig customer." };
  const priorTier = (existing.gig_tier ?? null) as GigTier | null;
  const { error } = await supabase
    .from("customers")
    .update({
      gig_tier: newTier,
      gig_tier_updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);
  if (error) return { error: error.message };
  await writeAudit({
    customerId,
    action: priorTier ? "gig_tier_changed" : "gig_tier_set",
    priorTier,
    newTier,
  });
  return { ok: true };
}

export async function adminSetGigPackageType(
  customerId: string,
  packageType: string,
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase
    .from("customers")
    .update({ gig_package_type: packageType })
    .eq("id", customerId);
  if (error) return { error: error.message };
  await writeAudit({
    customerId,
    action: "gig_package_changed",
    packageType,
  });
  return { ok: true };
}

export async function adminArchiveGigCustomer(
  customerId: string,
  reason?: string,
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase
    .from("customers")
    .update({ gig_status: "archived", archived_at: new Date().toISOString() })
    .eq("id", customerId);
  if (error) return { error: error.message };
  await writeAudit({
    customerId,
    action: "gig_customer_archived",
    newStatus: "archived",
    notes: reason ?? null,
  });
  return { ok: true };
}

export async function adminRestoreGigCustomer(
  customerId: string,
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase
    .from("customers")
    .update({ gig_status: "active", archived_at: null })
    .eq("id", customerId);
  if (error) return { error: error.message };
  await writeAudit({
    customerId,
    action: "gig_customer_restored",
    newStatus: "active",
  });
  return { ok: true };
}

/**
 * Convert a gig customer to a full RGS client. Requires explicit admin
 * confirmation (the UI gates this behind a typed confirmation). Preserves
 * gig history by leaving `is_gig=true` if `preserveGigHistory` is set.
 */
export async function adminConvertGigToFullClient(
  customerId: string,
  opts: { preserveGigHistory?: boolean; notes?: string } = {},
): Promise<{ ok: true } | { error: string }> {
  const { data: existing } = await supabase
    .from("customers")
    .select("gig_tier, is_gig, gig_status")
    .eq("id", customerId)
    .single();
  if (!existing) return { error: "Customer not found." };
  if (!existing.is_gig) return { error: "Not a gig customer." };
  const now = new Date().toISOString();
  const ctx = await currentAdminContext();
  const { error } = await supabase
    .from("customers")
    .update({
      gig_status: "converted",
      gig_converted_to_full_client_at: now,
      gig_converted_by: ctx.userId,
      account_kind: "client",
      lifecycle_state: "diagnostic",
      // We do not auto-enable packages — admin must assign them explicitly.
    })
    .eq("id", customerId);
  if (error) return { error: error.message };
  await writeAudit({
    customerId,
    action: "gig_converted_to_full_client",
    priorTier: (existing.gig_tier ?? null) as GigTier | null,
    priorStatus: (existing.gig_status ?? null) as GigStatus | null,
    newStatus: "converted",
    notes: opts.notes ?? null,
    metadata: { preserveGigHistory: opts.preserveGigHistory ?? true },
  });
  return { ok: true };
}

export async function adminListGigAudit(customerId: string) {
  const { data, error } = await supabase
    .from("customer_gig_audit")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data;
}
