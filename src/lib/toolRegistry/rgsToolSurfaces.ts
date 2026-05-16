/**
 * P102B — Registry-backed surface helpers.
 *
 * Thin, pure helpers that derive eligible tools per UI surface directly from
 * `RGS_TOOL_REGISTRY` + `resolveToolVisibility`. They DO NOT introduce a new
 * registry — they project the canonical registry through the canonical
 * resolver so admin nav, client portal, workspaces, the standalone finder,
 * and report surfaces can render from a single source of truth without
 * maintaining parallel hardcoded arrays.
 *
 * UI surfaces that still render hardcoded nav arrays must be validated
 * against these helpers in tests so they cannot drift.
 */

import {
  RGS_TOOL_REGISTRY,
  resolveToolVisibility,
  listRgsToolsForSurface,
  type RGSToolEntry,
  type ToolSurface,
  type ReportMode,
  type ResolveToolVisibilityInput,
} from "@/lib/toolRegistry/rgsToolRegistry";

export interface SurfaceContext {
  role?: ResolveToolVisibilityInput["role"];
  accountKind?: ResolveToolVisibilityInput["accountKind"];
  customer?: ResolveToolVisibilityInput["customer"];
}

export interface SurfaceToolView {
  tool_key: string;
  display_name: string;
  short_description: string;
  category: RGSToolEntry["category"];
  lifecycle_zone: RGSToolEntry["lifecycle_zone"];
  route: ReturnType<RGSToolEntry["resolveRoute"]> | null;
  visible: boolean;
  enabled: boolean;
  reason: string;
  badges: string[];
  report_capable: boolean;
  supported_report_modes: ReportMode[];
}

function toView(
  entry: RGSToolEntry,
  surface: ToolSurface,
  ctx: SurfaceContext,
): SurfaceToolView {
  const res = resolveToolVisibility({
    toolKey: entry.tool_key,
    surface,
    role: ctx.role,
    accountKind: ctx.accountKind,
    customer: ctx.customer,
  });
  return {
    tool_key: entry.tool_key,
    display_name: entry.display_name,
    short_description: entry.short_description,
    category: entry.category,
    lifecycle_zone: entry.lifecycle_zone,
    route: res.route,
    visible: res.visible,
    enabled: res.enabled,
    reason: res.reason,
    badges: res.badges,
    report_capable: entry.report_capable,
    // Use the resolver-effective report modes so gig contexts never leak
    // `full_rgs_report` and full-client contexts retain `full_rgs_report`.
    supported_report_modes: res.reportModes,
  };
}

/**
 * Generic surface helper. Returns ONLY tools that the resolver says are
 * visible for `(surface, context)`. Disabled-but-visible entries (e.g. a
 * gig customer hitting a Premium-only tool on the Standalone Finder) are
 * included so callers can render specific denial copy instead of silently
 * hiding entries.
 */
export function listRgsToolsForSurfaceWithContext(
  surface: ToolSurface,
  ctx: SurfaceContext = {},
): SurfaceToolView[] {
  return listRgsToolsForSurface(surface)
    .map((t) => toView(t, surface, ctx))
    .filter((v) => v.visible);
}

export function listAdminNavTools(ctx: SurfaceContext = { role: "admin" }): SurfaceToolView[] {
  return listRgsToolsForSurfaceWithContext("admin_nav", { role: "admin", ...ctx });
}

export function listClientPortalTools(ctx: SurfaceContext = {}): SurfaceToolView[] {
  return listRgsToolsForSurfaceWithContext("client_portal", ctx);
}

export function listDiagnosticWorkspaceTools(ctx: SurfaceContext = {}): SurfaceToolView[] {
  return listRgsToolsForSurfaceWithContext("diagnostic_workspace", ctx);
}

export function listImplementationWorkspaceTools(ctx: SurfaceContext = {}): SurfaceToolView[] {
  return listRgsToolsForSurfaceWithContext("implementation_workspace", ctx);
}

export function listControlSystemTools(ctx: SurfaceContext = {}): SurfaceToolView[] {
  return listRgsToolsForSurfaceWithContext("control_system", ctx);
}

export function listStandaloneFinderTools(ctx: SurfaceContext = {}): SurfaceToolView[] {
  // Finder may want to render disabled cards with denial copy, so keep
  // visible-but-disabled entries.
  return listRgsToolsForSurface("admin_standalone_finder").map((t) =>
    toView(t, "admin_standalone_finder", ctx),
  );
}

export function listReportCapableTools(): SurfaceToolView[] {
  return RGS_TOOL_REGISTRY.filter((t) => t.report_capable).map((t) =>
    toView(t, "reports", {}),
  );
}

/**
 * Validation helper used by tests / dev-time invariants: returns tool_keys
 * present in `hardcodedKeys` that the registry says should NOT appear on
 * `surface`. Empty array = the hardcoded surface is consistent with the
 * registry.
 */
export function findHardcodedSurfaceLeaks(
  surface: ToolSurface,
  hardcodedKeys: readonly string[],
  ctx: SurfaceContext = {},
): string[] {
  const allowed = new Set(
    listRgsToolsForSurfaceWithContext(surface, ctx).map((t) => t.tool_key),
  );
  return hardcodedKeys.filter(
    (k) => RGS_TOOL_REGISTRY.some((t) => t.tool_key === k) && !allowed.has(k),
  );
}
