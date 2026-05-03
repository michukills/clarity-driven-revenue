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

/** Admin-only: list all industry/package access rules for coverage audit views. */
export async function listAllCategoryAccess() {
  const { data, error } = await supabase
    .from("tool_category_access")
    .select("tool_id, industry, package_key, enabled")
    .order("industry", { ascending: true });
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
  industry_unconfirmed: "Industry assignment is unconfirmed by admin",
  industry_needs_review: "Industry assignment is marked for admin review",
  snapshot_unverified: "Client business snapshot is not admin-verified yet",
  diagnostic_lane_inactive:
    "Diagnostic engagement is not active for this client",
  implementation_lane_inactive:
    "Implementation engagement is not active for this client",
  rcs_lane_inactive:
    "RGS Control System access is not active for this client",
  owner_interview_required:
    "Owner Diagnostic Interview must be completed first",
};

export const TOOL_TYPE_LABEL: Record<ToolCatalogType, string> = {
  diagnostic: "Diagnostic",
  implementation: "Implementation",
  tracking: "Tracking",
  reporting: "Reporting",
  communication: "Communication",
  admin_only: "Admin only",
};

/**
 * Industries supported by the tool category access layer.
 * Mirrors the public.industry_category enum.
 */
export const INDUSTRY_KEYS = [
  "trade_field_service",
  "retail",
  "restaurant",
  "mmj_cannabis",
  "general_service",
  "other",
] as const;

export type IndustryKey = (typeof INDUSTRY_KEYS)[number];

export const INDUSTRY_LABEL: Record<IndustryKey, string> = {
  trade_field_service: "Trades / Field Service",
  retail: "Retail",
  restaurant: "Restaurant",
  mmj_cannabis: "Cannabis / MMJ / Rec",
  general_service: "General / Mixed business",
  other: "Other / general business",
};

/**
 * Industries that are intentionally restrictive — tools enabled for these
 * lanes should not bleed into other lanes by accident. Admin grants are still
 * allowed, but the UI warns first.
 */
export const RESTRICTED_INDUSTRIES: ReadonlySet<IndustryKey> = new Set([
  "mmj_cannabis",
]);

/**
 * True if the given tool may be granted to a client via per-client override.
 * Admin-only tools are never grantable to clients to prevent privilege leaks.
 */
export function canGrantToClient(tool: {
  tool_type: ToolCatalogType;
  default_visibility: ToolCatalogVisibility;
  status?: ToolCatalogStatus;
}): boolean {
  if (tool.status === "deprecated") return false;
  if (tool.tool_type === "admin_only") return false;
  if (tool.default_visibility === "admin_only") return false;
  if (tool.default_visibility === "hidden") return false;
  return true;
}
