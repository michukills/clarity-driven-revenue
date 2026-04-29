import { supabase } from "@/integrations/supabase/client";

export type ToolCatalogType =
  | "diagnostic"
  | "implementation"
  | "tracking"
  | "reporting"
  | "communication"
  | "admin_only";

export type ToolCatalogVisibility = "admin_only" | "client_available" | "hidden";
export type ToolCatalogStatus = "active" | "beta" | "deprecated";

export interface ToolCatalogRow {
  id: string;
  tool_key: string;
  name: string;
  description: string | null;
  tool_type: ToolCatalogType;
  default_visibility: ToolCatalogVisibility;
  status: ToolCatalogStatus;
  route_path: string | null;
  icon_key: string | null;
  requires_industry: boolean;
  requires_active_client: boolean;
}

export interface EffectiveTool {
  tool_id: string;
  tool_key: string;
  name: string;
  description: string | null;
  tool_type: ToolCatalogType;
  default_visibility: ToolCatalogVisibility;
  status: ToolCatalogStatus;
  route_path: string | null;
  icon_key: string | null;
  requires_industry: boolean;
  requires_active_client: boolean;
  effective_enabled: boolean;
  reason: string;
  industry_match: boolean;
  override_state: "none" | "granted" | "revoked";
}

/**
 * Returns the effective tool list for a customer.
 * - Admin callers receive the full catalog with effective_enabled and reason annotations.
 * - Client callers (only the owning client per RLS / function check) receive only
 *   tools that are effectively enabled and not admin-only / hidden.
 */
export async function getEffectiveToolsForCustomer(
  customerId: string,
): Promise<EffectiveTool[]> {
  const { data, error } = await supabase.rpc("get_effective_tools_for_customer", {
    _customer_id: customerId,
  });
  if (error) throw error;
  return (data ?? []) as unknown as EffectiveTool[];
}

/** Admin-only: list every tool catalog row. */
export async function listToolCatalog(): Promise<ToolCatalogRow[]> {
  const { data, error } = await supabase
    .from("tool_catalog")
    .select("*")
    .order("tool_type", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ToolCatalogRow[];
}

/** Admin-only: list category access rules for a tool. */
export async function listCategoryAccess(toolId: string) {
  const { data, error } = await supabase
    .from("tool_category_access")
    .select("*")
    .eq("tool_id", toolId);
  if (error) throw error;
  return data ?? [];
}

/** Admin-only: enable or disable a tool for an industry. */
export async function setCategoryAccess(opts: {
  toolId: string;
  industry: string;
  enabled: boolean;
  packageKey?: string | null;
  adminNotes?: string | null;
}) {
  const { toolId, industry, enabled, packageKey = null, adminNotes = null } = opts;
  const { data, error } = await supabase
    .from("tool_category_access")
    .upsert(
      {
        tool_id: toolId,
        industry: industry as never,
        package_key: packageKey,
        enabled,
        admin_notes: adminNotes,
      } as never,
      { onConflict: "tool_id,industry,package_key" } as never,
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Admin-only: per-customer override (grant or revoke). */
export async function setClientToolAccess(opts: {
  customerId: string;
  toolId: string;
  enabled: boolean;
  reason?: string | null;
  grantedBy?: string | null;
}) {
  const { customerId, toolId, enabled, reason = null, grantedBy = null } = opts;
  const { data, error } = await supabase
    .from("client_tool_access")
    .upsert(
      {
        customer_id: customerId,
        tool_id: toolId,
        enabled,
        reason,
        granted_by: grantedBy,
        granted_at: enabled ? new Date().toISOString() : null,
        revoked_at: enabled ? null : new Date().toISOString(),
      } as never,
      { onConflict: "customer_id,tool_id" } as never,
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Admin-only: clear an override entirely. */
export async function clearClientToolAccess(customerId: string, toolId: string) {
  const { error } = await supabase
    .from("client_tool_access")
    .delete()
    .eq("customer_id", customerId)
    .eq("tool_id", toolId);
  if (error) throw error;
}

export const REASON_LABEL: Record<string, string> = {
  admin_only: "Admin-only tool",
  hidden: "Hidden",
  override_revoked: "Revoked for this client",
  override_granted: "Granted to this client",
  not_active_client: "Requires an active client account",
  industry_unset: "Customer industry not set",
  industry_blocked: "Not enabled for this industry",
  industry_allowed: "Enabled for this industry",
  unrestricted: "Available (no industry restrictions)",
};

export const TOOL_TYPE_LABEL: Record<ToolCatalogType, string> = {
  diagnostic: "Diagnostic",
  implementation: "Implementation",
  tracking: "Tracking",
  reporting: "Reporting",
  communication: "Communication",
  admin_only: "Admin only",
};