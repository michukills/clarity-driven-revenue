// P17 — Client service-change requests (deactivation / add-on cancellation).
// All writes go through RLS. Clients can create + read their own; admins manage.

import { supabase } from "@/integrations/supabase/client";

export type ServiceRequestType = "account_deactivation" | "addon_cancellation";
export type ServiceRequestStatus = "pending" | "reviewed" | "completed" | "declined";

export interface ServiceRequestRow {
  id: string;
  customer_id: string;
  requested_by: string | null;
  request_type: ServiceRequestType;
  addon_key: string | null;
  reason: string | null;
  status: ServiceRequestStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const REQUEST_TYPE_LABEL: Record<ServiceRequestType, string> = {
  account_deactivation: "Account deactivation",
  addon_cancellation: "Add-on cancellation",
};

export const STATUS_LABEL: Record<ServiceRequestStatus, string> = {
  pending: "Pending review",
  reviewed: "Reviewed",
  completed: "Completed",
  declined: "Declined",
};

export async function createServiceRequest(opts: {
  customerId: string;
  requestType: ServiceRequestType;
  reason: string | null;
  addonKey?: string | null;
}): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const { error } = await supabase.from("client_service_requests").insert({
    customer_id: opts.customerId,
    requested_by: userId,
    request_type: opts.requestType,
    addon_key: opts.addonKey ?? null,
    reason: opts.reason?.trim() || null,
    status: "pending",
  });
  if (error) throw error;
}

export async function loadOwnRequests(customerId: string): Promise<ServiceRequestRow[]> {
  const { data, error } = await supabase
    .from("client_service_requests")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ServiceRequestRow[];
}

export interface AdminRequestRow extends ServiceRequestRow {
  customer: {
    id: string;
    full_name: string | null;
    business_name: string | null;
    industry: string | null;
    lifecycle_state: string | null;
  } | null;
}

export async function loadAllRequests(opts?: {
  status?: ServiceRequestStatus | "all";
}): Promise<AdminRequestRow[]> {
  let q = supabase
    .from("client_service_requests")
    .select(
      "*, customer:customers!client_service_requests_customer_id_fkey(id, full_name, business_name, industry, lifecycle_state)"
    )
    .order("created_at", { ascending: false });
  if (opts?.status && opts.status !== "all") q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as AdminRequestRow[];
}

export async function countPendingRequests(): Promise<number> {
  const { count, error } = await supabase
    .from("client_service_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

/**
 * Admin action. Updates the request status + optional notes. For
 * `completed` deactivations, also flips the customer's lifecycle state to
 * `inactive` (past client). NEVER deletes any customer data.
 */
export async function adminUpdateRequest(opts: {
  id: string;
  status: ServiceRequestStatus;
  adminNotes?: string | null;
}): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const reviewed_at = new Date().toISOString();

  // First load the request to know its type + customer.
  const { data: req, error: loadErr } = await supabase
    .from("client_service_requests")
    .select("id, customer_id, request_type, status")
    .eq("id", opts.id)
    .maybeSingle();
  if (loadErr) throw loadErr;
  if (!req) throw new Error("Request not found");

  const { error: updErr } = await supabase
    .from("client_service_requests")
    .update({
      status: opts.status,
      admin_notes: opts.adminNotes ?? null,
      reviewed_by: userId,
      reviewed_at,
    })
    .eq("id", opts.id);
  if (updErr) throw updErr;

  // Side-effect: completing a deactivation moves the customer to inactive
  // (past client) WITHOUT deleting any data.
  if (opts.status === "completed" && req.request_type === "account_deactivation") {
    const { error: cErr } = await supabase
      .from("customers")
      .update({
        lifecycle_state: "inactive",
        lifecycle_updated_at: new Date().toISOString(),
        lifecycle_notes: "Marked inactive after client deactivation request was completed.",
      })
      .eq("id", req.customer_id);
    if (cErr) throw cErr;
  }
}

export function hasPendingDeactivation(rows: ServiceRequestRow[]): boolean {
  return rows.some((r) => r.request_type === "account_deactivation" && r.status === "pending");
}
