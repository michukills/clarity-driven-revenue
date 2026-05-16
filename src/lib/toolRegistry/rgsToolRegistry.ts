/**
 * P102A — RGS Tool Registry. The single source of truth for tool
 * visibility, surface placement, access scope, gig/full-client eligibility,
 * and report compatibility across the RGS OS.
 *
 * This registry COMPOSES from the existing canonical sources rather than
 * duplicating them, and is the resolver every future surface (admin nav,
 * standalone tool finder, diagnostic/implementation/control workspaces,
 * client portal, reports) should consult:
 *
 *   - `REPORTABLE_TOOL_CATALOG`  → reportability + service lane
 *   - `GIG_TOOL_REGISTRY`        → gig tier eligibility
 *   - `FULL_CLIENT_ONLY_TOOLS`   → tools never available to gig customers
 *   - `TOOL_REPORT_SECTION_CATALOG` → which sections each report tool can emit
 *   - `standaloneToolRoutes`     → admin route resolver
 *
 * Pure / no DB. Tests in `src/lib/__tests__/p102a*.test.ts`.
 *
 * Claim-safety: every entry copy is admin-/RGS-safe. No registry entry may
 * include guarantee language, fake publishing/scheduling/analytics, paid
 * ads execution, or legal/tax/medical certification claims.
 */

import {
  REPORTABLE_TOOL_CATALOG,
  getReportableTool,
} from "@/lib/reports/toolReports";
import {
  GIG_TOOL_REGISTRY,
  FULL_CLIENT_ONLY_TOOLS,
  checkGigToolAccess,
  type GigTier,
  type GigToolKey,
} from "@/lib/gig/gigTier";
import {
  TOOL_REPORT_SECTION_CATALOG,
} from "@/lib/reports/toolReportSectionCatalog";
import {
  resolveStandaloneToolRoute,
  type StandaloneToolRouteResolution,
} from "@/lib/standaloneToolRoutes";
import { resolveGigToolKey } from "@/lib/gig/gigToolKeyMap";

export type ToolCategory =
  | "business_assessment"
  | "operations_sops"
  | "workflow_process"
  | "accountability_decision_rights"
  | "customer_market_strategy"
  | "marketing_campaign_strategy"
  | "financial_risk_visibility"
  | "reports_deliverables"
  | "admin_support"
  | "public_lead_entry";

export type LifecycleZone =
  | "public_funnel"
  | "diagnostic"
  | "implementation"
  | "control_system"
  | "campaign_control"
  | "admin_operations"
  | "client_portal_hub";

export type AccountKind = "admin" | "client" | "gig" | "demo" | "prospect";

export type CustomerType =
  | "prospect"
  | "scan_lead"
  | "gig_customer"
  | "diagnostic_client"
  | "implementation_client"
  | "control_system_client"
  | "full_client"
  | "demo"
  | "archived";

export type ToolSurface =
  | "public_funnel"
  | "admin_nav"
  | "admin_standalone_finder"
  | "diagnostic_workspace"
  | "implementation_workspace"
  | "control_system"
  | "campaign_control"
  | "client_portal"
  | "reports";

export type ReportMode = "gig_report" | "full_rgs_report";

export interface RGSToolEntry {
  tool_key: string;
  display_name: string;
  short_description: string;
  category: ToolCategory;
  lifecycle_zone: LifecycleZone;
  primary_gear: string;
  secondary_gears: string[];
  access_scope:
    | "public"
    | "admin_only"
    | "full_client_only"
    | "gig_capable"
    | "shared";
  allowed_account_types: AccountKind[];
  allowed_customer_types: CustomerType[];
  allowed_lifecycle_states: string[];
  gig_capable: boolean;
  minimum_gig_tier: GigTier | null;
  full_client_only: boolean;
  admin_visible: boolean;
  client_visible: boolean;
  standalone_visible: boolean;
  diagnostic_visible: boolean;
  implementation_visible: boolean;
  control_system_visible: boolean;
  report_capable: boolean;
  supported_report_modes: ReportMode[];
  /** Admin admin-global / admin-customer route for this tool. */
  resolveRoute: (customerId: string | null) => StandaloneToolRouteResolution;
  required_prerequisites: string[];
  hidden_until_prerequisites_met: boolean;
  safe_copy_notes: string;
  forbidden_claim_notes: string;
}

/**
 * P102C — Alias-aware gig lookup. Several historical tool keys (e.g.
 * `workflow_process_mapping` vs `workflow_process_map`) refer to the same
 * underlying gig deliverable. We resolve the alias before reading
 * GIG_TOOL_REGISTRY so the registry never silently treats a known
 * gig-capable tool as admin-only.
 */
function gigEntry(key: string) {
  const direct = (GIG_TOOL_REGISTRY as Record<string, { minTier: GigTier }>)[key];
  if (direct) return direct;
  const resolved = resolveGigToolKey(key);
  if (resolved.kind === "gig") {
    return (GIG_TOOL_REGISTRY as Record<string, { minTier: GigTier }>)[
      resolved.key
    ];
  }
  return undefined;
}
function isFullClientOnly(key: string) {
  if ((FULL_CLIENT_ONLY_TOOLS as readonly string[]).includes(key)) return true;
  const resolved = resolveGigToolKey(key);
  return resolved.kind === "full_client_only";
}
function hasReportSections(key: string) {
  return Boolean((TOOL_REPORT_SECTION_CATALOG as Record<string, unknown>)[key]);
}
function reportable(key: string) {
  return Boolean(getReportableTool(key));
}

const SAFE_COPY =
  "Calm, owner-respecting, premium tone. No hype. No guarantees.";
const FORBIDDEN_CLAIMS =
  "No guaranteed revenue/leads/ROI/rankings. No auto-posting, scheduling, " +
  "live analytics, or paid ads execution. No legal, tax, accounting, HR, " +
  "fiduciary, valuation, medical, or cannabis compliance certification.";

/**
 * Central registry. Entries are intentionally explicit so future tools
 * land in one place. Tools that are reportable but already covered by
 * `REPORTABLE_TOOL_CATALOG` are referenced by key — `report_capable` is
 * derived from that catalog so the two cannot drift.
 */
export const RGS_TOOL_REGISTRY: RGSToolEntry[] = [
  // ── Public funnel ───────────────────────────────────────────────────
  {
    tool_key: "operational_friction_scan",
    display_name: "Operational Friction Scan",
    short_description:
      "Public lead-gen entry. Directional friction read, not the full Business Stability Scorecard.",
    category: "public_lead_entry",
    lifecycle_zone: "public_funnel",
    primary_gear: "diagnostic_entry",
    secondary_gears: [],
    access_scope: "public",
    allowed_account_types: ["prospect", "admin", "client", "gig", "demo"],
    allowed_customer_types: ["prospect", "scan_lead"],
    allowed_lifecycle_states: ["lead", "scan_lead"],
    gig_capable: false,
    minimum_gig_tier: null,
    full_client_only: false,
    admin_visible: true,
    client_visible: false,
    standalone_visible: false,
    diagnostic_visible: false,
    implementation_visible: false,
    control_system_visible: false,
    report_capable: false,
    supported_report_modes: [],
    resolveRoute: () => ({ kind: "admin", href: "/scan" }),
    required_prerequisites: [],
    hidden_until_prerequisites_met: false,
    safe_copy_notes: SAFE_COPY,
    forbidden_claim_notes: FORBIDDEN_CLAIMS,
  },

  // ── Diagnostic (full-client only) ───────────────────────────────────
  fullClient(
    "diagnostic_scorecard",
    "Business Stability Scorecard",
    "Deterministic Diagnostic Part 1 — full stability assessment. Protected and full-client only.",
    "business_assessment",
    "diagnostic",
    "diagnostic_scorecard",
    () => ({ kind: "admin", href: "/diagnostic/scorecard" }),
    { diagnostic_visible: true },
  ),
  fullClient(
    "owner_interview",
    "Owner Diagnostic Interview",
    "Bounded owner interview that establishes diagnostic context.",
    "business_assessment",
    "diagnostic",
    "diagnostic_context",
    (cid) => resolveStandaloneToolRoute("owner_diagnostic_interview", cid),
    { diagnostic_visible: true },
  ),
  fullClient(
    "evidence_vault",
    "Evidence Vault",
    "Diagnostic, Implementation, and Control System evidence repository. Full-client only.",
    "admin_support",
    "diagnostic",
    "evidence",
    () => ({ kind: "unavailable", reason: "Evidence Vault is opened from inside a workspace." }),
    { diagnostic_visible: true, implementation_visible: true, control_system_visible: true },
  ),
  fullClient(
    "diagnostic_report",
    "Diagnostic Report",
    "Full RGS Diagnostic Report. Full-client only; never available as a gig deliverable.",
    "reports_deliverables",
    "diagnostic",
    "diagnostic_report",
    () => ({ kind: "unavailable", reason: "Generated from inside the Diagnostic Workspace." }),
    { diagnostic_visible: true },
  ),
  fullClient(
    "priority_repair_map",
    "Priority Repair Map",
    "Diagnostic → Implementation bridge. Full-client only.",
    "business_assessment",
    "diagnostic",
    "repair_map",
    (cid) => resolveStandaloneToolRoute("priority_repair_map", cid),
    { diagnostic_visible: true, implementation_visible: true },
  ),

  // ── Implementation (mostly full-client; SOP / Workflow / Decision Rights gig-capable) ──
  fullClient(
    "implementation_roadmap",
    "Implementation Roadmap",
    "Full Implementation Roadmap. Full-client only.",
    "workflow_process",
    "implementation",
    "implementation_plan",
    (cid) => resolveStandaloneToolRoute("implementation_roadmap", cid),
    { implementation_visible: true },
  ),
  gigCapable(
    "sop_training_bible",
    "SOP / Training Bible",
    "Bounded SOP / training bible for a single workflow.",
    "operations_sops",
    "implementation",
    "operations",
    (cid) => resolveStandaloneToolRoute("sop_training_bible", cid),
    { implementation_visible: true, client_visible: true },
  ),
  gigCapable(
    "workflow_process_mapping",
    "Workflow / Process Mapping",
    "Bounded process map for a single workflow.",
    "workflow_process",
    "implementation",
    "operations",
    (cid) => resolveStandaloneToolRoute("workflow_process_mapping", cid),
    { implementation_visible: true, client_visible: true },
  ),
  gigCapable(
    "decision_rights_accountability",
    "Decision Rights & Accountability",
    "Bounded decision rights / accountability map for one team or function.",
    "accountability_decision_rights",
    "implementation",
    "operations",
    (cid) => resolveStandaloneToolRoute("decision_rights_accountability", cid),
    { implementation_visible: true, client_visible: true },
  ),
  fullClient(
    "tool_assignment_training_tracker",
    "Tool Assignment & Training Tracker",
    "Admin-internal tracker. Reports are admin-only by default.",
    "admin_support",
    "implementation",
    "operations",
    (cid) => resolveStandaloneToolRoute("tool_assignment_training_tracker", cid),
    { implementation_visible: true, client_visible: false },
  ),

  // ── Customer / Market Strategy (gig-capable) ────────────────────────
  gigCapable(
    "buyer_persona_tool",
    "Buyer Persona / ICP",
    "Bounded buyer persona / ICP deliverable.",
    "customer_market_strategy",
    "diagnostic",
    "market_strategy",
    (cid) => resolveStandaloneToolRoute("buyer_persona_tool", cid),
    { diagnostic_visible: true, client_visible: true },
  ),
  gigCapable(
    "rgs_stability_snapshot",
    "SWOT / Strategic Matrix",
    "Single point-in-time SWOT-style stability snapshot.",
    "business_assessment",
    "diagnostic",
    "stability_snapshot",
    (cid) => resolveStandaloneToolRoute("rgs_stability_snapshot", cid),
    { diagnostic_visible: true, client_visible: true },
  ),

  // ── Campaign / Marketing ────────────────────────────────────────────
  {
    tool_key: "campaign_control",
    display_name: "Campaign Control Center",
    short_description:
      "Build campaign strategy, message direction, content assets, and a manual execution path from approved RGS context.",
    category: "marketing_campaign_strategy",
    lifecycle_zone: "campaign_control",
    primary_gear: "marketing",
    secondary_gears: ["sales", "operations"],
    access_scope: "shared",
    allowed_account_types: ["admin", "client"],
    allowed_customer_types: ["full_client", "diagnostic_client", "implementation_client", "control_system_client"],
    allowed_lifecycle_states: ["diagnostic", "implementation", "completed", "ongoing_support"],
    gig_capable: false,
    minimum_gig_tier: null,
    full_client_only: true,
    admin_visible: true,
    client_visible: true,
    standalone_visible: false,
    diagnostic_visible: false,
    implementation_visible: false,
    control_system_visible: true,
    report_capable: false,
    supported_report_modes: [],
    resolveRoute: (cid) =>
      cid
        ? { kind: "customer", href: `/admin/customers/${cid}/campaign-control` }
        : { kind: "admin", href: "/admin/campaign-control" },
    required_prerequisites: [],
    hidden_until_prerequisites_met: false,
    safe_copy_notes:
      "Campaign Strategy. Manual Execution. Approval-Gated. No auto-posting in this phase.",
    forbidden_claim_notes: FORBIDDEN_CLAIMS,
  },
  gigCapable(
    "campaign_brief",
    "Campaign Brief",
    "Bounded campaign brief: audience, message direction, content outline. Approval-gated. No auto-posting.",
    "marketing_campaign_strategy",
    "campaign_control",
    "marketing",
    (cid) => resolveStandaloneToolRoute("campaign_brief", cid),
    { control_system_visible: true },
  ),
  gigCapable(
    "campaign_strategy",
    "Campaign Strategy",
    "Premium campaign strategy: positioning, message arc, manual execution path. Approval-gated.",
    "marketing_campaign_strategy",
    "campaign_control",
    "marketing",
    (cid) => resolveStandaloneToolRoute("campaign_strategy", cid),
    { control_system_visible: true },
  ),
  gigCapable(
    "campaign_video_plan",
    "Campaign Video Plan",
    "Scene-level campaign video plan. External render is approval-gated; this output covers plan + review only.",
    "marketing_campaign_strategy",
    "campaign_control",
    "marketing",
    (cid) => resolveStandaloneToolRoute("campaign_video_plan", cid),
    { control_system_visible: true },
  ),

  // ── Control System (full-client) ────────────────────────────────────
  fullClient(
    "revenue_risk_monitor",
    "Revenue & Risk Monitor",
    "Full-client Control System monitor. Not a financial forecast.",
    "financial_risk_visibility",
    "control_system",
    "risk_monitor",
    (cid) => resolveStandaloneToolRoute("revenue_risk_monitor", cid),
    { control_system_visible: true },
  ),
  fullClient(
    "owner_decision_dashboard",
    "Owner Decision Dashboard",
    "Full-client Control System owner dashboard.",
    "financial_risk_visibility",
    "control_system",
    "owner_decisions",
    (cid) => resolveStandaloneToolRoute("owner_decision_dashboard", cid),
    { control_system_visible: true },
  ),
  fullClient(
    "monthly_system_review",
    "Monthly System Review",
    "Bounded monthly system review summary. Full-client only.",
    "reports_deliverables",
    "control_system",
    "review",
    (cid) => resolveStandaloneToolRoute("monthly_system_review", cid),
    { control_system_visible: true },
  ),
  fullClient(
    "advisory_notes",
    "Advisory Notes / Clarification Log",
    "Admin-only advisory log. Notes are RGS interpretation, not legal/tax/accounting/HR/compliance advice.",
    "admin_support",
    "control_system",
    "advisory",
    (cid) => resolveStandaloneToolRoute("advisory_notes", cid),
    { control_system_visible: true, client_visible: false },
  ),

  // ── Admin / Support ─────────────────────────────────────────────────
  {
    tool_key: "standalone_tool_runner",
    display_name: "Standalone Tool Runner",
    short_description: "Admin operating surface for standalone/gig deliverables.",
    category: "admin_support",
    lifecycle_zone: "admin_operations",
    primary_gear: "admin",
    secondary_gears: [],
    access_scope: "admin_only",
    allowed_account_types: ["admin"],
    allowed_customer_types: [],
    allowed_lifecycle_states: [],
    gig_capable: false,
    minimum_gig_tier: null,
    full_client_only: false,
    admin_visible: true,
    client_visible: false,
    standalone_visible: false,
    diagnostic_visible: false,
    implementation_visible: false,
    control_system_visible: false,
    report_capable: false,
    supported_report_modes: [],
    resolveRoute: () => ({ kind: "admin", href: "/admin/standalone-tool-runner" }),
    required_prerequisites: [],
    hidden_until_prerequisites_met: false,
    safe_copy_notes: SAFE_COPY,
    forbidden_claim_notes: FORBIDDEN_CLAIMS,
  },
];

// ─────────────────────────────────────────────────────────────────────
// Builders that derive report-capability and gig flags from the canonical
// sources so this registry stays a real source of truth, not a duplicate.
// ─────────────────────────────────────────────────────────────────────

function baseEntry(
  tool_key: string,
  display_name: string,
  short_description: string,
  category: ToolCategory,
  lifecycle_zone: LifecycleZone,
  primary_gear: string,
  resolveRoute: RGSToolEntry["resolveRoute"],
): RGSToolEntry {
  const isGig = Boolean(gigEntry(tool_key));
  const fullOnly = isFullClientOnly(tool_key);
  const reportCap = reportable(tool_key) || hasReportSections(tool_key);
  const modes: ReportMode[] = reportCap
    ? fullOnly
      ? ["full_rgs_report"]
      : isGig
      ? ["gig_report", "full_rgs_report"]
      : ["full_rgs_report"]
    : [];
  return {
    tool_key,
    display_name,
    short_description,
    category,
    lifecycle_zone,
    primary_gear,
    secondary_gears: [],
    access_scope: fullOnly ? "full_client_only" : isGig ? "gig_capable" : "admin_only",
    allowed_account_types: ["admin", "client"],
    allowed_customer_types: fullOnly
      ? ["full_client", "diagnostic_client", "implementation_client", "control_system_client"]
      : ["full_client", "gig_customer", "diagnostic_client", "implementation_client"],
    allowed_lifecycle_states: [],
    gig_capable: isGig && !fullOnly,
    minimum_gig_tier: (gigEntry(tool_key)?.minTier ?? null) as GigTier | null,
    full_client_only: fullOnly,
    admin_visible: true,
    client_visible: false,
    standalone_visible: isGig && !fullOnly,
    diagnostic_visible: false,
    implementation_visible: false,
    control_system_visible: false,
    report_capable: reportCap,
    supported_report_modes: modes,
    resolveRoute,
    required_prerequisites: [],
    hidden_until_prerequisites_met: false,
    safe_copy_notes: SAFE_COPY,
    forbidden_claim_notes: FORBIDDEN_CLAIMS,
  };
}

function fullClient(
  tool_key: string,
  display_name: string,
  short_description: string,
  category: ToolCategory,
  lifecycle_zone: LifecycleZone,
  primary_gear: string,
  resolveRoute: RGSToolEntry["resolveRoute"],
  overrides: Partial<RGSToolEntry> = {},
): RGSToolEntry {
  const base = baseEntry(tool_key, display_name, short_description, category, lifecycle_zone, primary_gear, resolveRoute);
  return { ...base, full_client_only: true, gig_capable: false, standalone_visible: false, ...overrides };
}

function gigCapable(
  tool_key: string,
  display_name: string,
  short_description: string,
  category: ToolCategory,
  lifecycle_zone: LifecycleZone,
  primary_gear: string,
  resolveRoute: RGSToolEntry["resolveRoute"],
  overrides: Partial<RGSToolEntry> = {},
): RGSToolEntry {
  const base = baseEntry(tool_key, display_name, short_description, category, lifecycle_zone, primary_gear, resolveRoute);
  return { ...base, gig_capable: true, full_client_only: false, standalone_visible: true, ...overrides };
}

// ─────────────────────────────────────────────────────────────────────
// Lookups + resolver
// ─────────────────────────────────────────────────────────────────────

const BY_KEY: Map<string, RGSToolEntry> = new Map(
  RGS_TOOL_REGISTRY.map((t) => [t.tool_key, t]),
);

export function getRgsTool(toolKey: string): RGSToolEntry | undefined {
  return BY_KEY.get(toolKey);
}

export function listRgsTools(): RGSToolEntry[] {
  return [...RGS_TOOL_REGISTRY];
}

export function listRgsToolsForSurface(
  surface: ToolSurface,
): RGSToolEntry[] {
  return RGS_TOOL_REGISTRY.filter((t) => isToolOnSurface(t, surface));
}

function isToolOnSurface(t: RGSToolEntry, surface: ToolSurface): boolean {
  switch (surface) {
    case "public_funnel":
      return t.access_scope === "public";
    case "admin_nav":
      return t.admin_visible && t.lifecycle_zone !== "public_funnel";
    case "admin_standalone_finder":
      return t.standalone_visible;
    case "diagnostic_workspace":
      return t.diagnostic_visible;
    case "implementation_workspace":
      return t.implementation_visible;
    case "control_system":
      return t.control_system_visible;
    case "campaign_control":
      return t.lifecycle_zone === "campaign_control";
    case "client_portal":
      return t.client_visible;
    case "reports":
      return t.report_capable;
  }
}

export interface ResolveToolVisibilityInput {
  toolKey: string;
  surface: ToolSurface;
  role?: "admin" | "client" | "anonymous";
  accountKind?: AccountKind | null;
  customer?: {
    id?: string | null;
    is_gig?: boolean | null;
    gig_tier?: GigTier | null;
    gig_status?: "active" | "archived" | "converted" | null;
    lifecycle_state?: string | null;
    is_demo_account?: boolean | null;
  } | null;
}

export interface ResolveToolVisibilityResult {
  visible: boolean;
  enabled: boolean;
  reason: string;
  route: StandaloneToolRouteResolution | null;
  badges: string[];
  reportModes: ReportMode[];
}

/**
 * Central pure resolver used by admin nav, standalone tool finder,
 * client portal, and report surfaces. Returns a deterministic
 * `{ visible, enabled, reason }` shape so UIs render disabled cards with
 * specific denial copy rather than silently dropping items.
 */
export function resolveToolVisibility(
  input: ResolveToolVisibilityInput,
): ResolveToolVisibilityResult {
  const t = getRgsTool(input.toolKey);
  if (!t) {
    return {
      visible: false,
      enabled: false,
      reason: "Tool is not registered.",
      route: null,
      badges: [],
      reportModes: [],
    };
  }

  const visible = isToolOnSurface(t, input.surface);
  if (!visible) {
    return {
      visible: false,
      enabled: false,
      reason: "Not surfaced here.",
      route: null,
      badges: [],
      reportModes: t.supported_report_modes,
    };
  }

  // Public funnel — never apply gig/full-client logic.
  if (t.access_scope === "public") {
    return {
      visible: true,
      enabled: true,
      reason: "",
      route: t.resolveRoute(input.customer?.id ?? null),
      badges: ["Public"],
      reportModes: [],
    };
  }

  // Admin nav surface: admins see admin-visible tools; clients never.
  if (input.surface === "admin_nav") {
    const isAdmin = input.role === "admin";
    return {
      visible: isAdmin && t.admin_visible,
      enabled: isAdmin,
      reason: isAdmin ? "" : "Admin only.",
      route: t.resolveRoute(input.customer?.id ?? null),
      badges: t.full_client_only ? ["Full Client"] : t.gig_capable ? ["Gig / Full Client"] : [],
      reportModes: t.supported_report_modes,
    };
  }

  const customer = input.customer ?? null;
  const isGig = Boolean(customer?.is_gig);

  // Archived gig customers cannot run active tools.
  if (isGig && customer?.gig_status === "archived") {
    return {
      visible: true,
      enabled: false,
      reason: "Archived customers cannot run active tools.",
      route: null,
      badges: ["Archived"],
      reportModes: [],
    };
  }

  // Gig customers must never reach full-client-only tools.
  if (isGig && t.full_client_only) {
    // On the client portal surface, full-client-only tools simply must
    // not appear in a gig customer's portal at all — no disabled card,
    // no denial copy. They are not part of that customer's package.
    if (input.surface === "client_portal") {
      return {
        visible: false,
        enabled: false,
        reason: "Not included in this gig package.",
        route: null,
        badges: [],
        reportModes: [],
      };
    }
    return {
      visible: true,
      enabled: false,
      reason:
        "Full RGS workflow is not available for gig customers. Convert to a full RGS engagement to unlock this tool.",
      route: null,
      badges: ["Full Client Only"],
      reportModes: t.supported_report_modes.filter((m) => m === "full_rgs_report" ? false : true),
    };
  }

  // Standalone finder + gig customer → use canonical tier gate.
  if (input.surface === "admin_standalone_finder" && isGig) {
    const access = checkGigToolAccess(t.tool_key, {
      isGig: true,
      gigTier: customer?.gig_tier ?? null,
      gigStatus: customer?.gig_status ?? "active",
    });
    if (!access.allowed) {
      return {
        visible: true,
        enabled: false,
        reason: access.reason,
        route: null,
        badges: t.minimum_gig_tier ? [`Requires ${t.minimum_gig_tier}+`] : [],
        reportModes: t.supported_report_modes.includes("gig_report") ? ["gig_report"] : [],
      };
    }
    return {
      visible: true,
      enabled: true,
      reason: "",
      route: t.resolveRoute(customer?.id ?? null),
      badges: ["Gig"],
      reportModes: t.supported_report_modes.includes("gig_report") ? ["gig_report"] : [],
    };
  }

  // Client portal: only client_visible tools, and only when not gig-excluded.
  if (input.surface === "client_portal") {
    if (!t.client_visible) {
      return {
        visible: false,
        enabled: false,
        reason: "Not a client-portal tool.",
        route: null,
        badges: [],
        reportModes: [],
      };
    }
  }

  return {
    visible: true,
    enabled: true,
    reason: "",
    route: t.resolveRoute(customer?.id ?? null),
    badges: t.gig_capable ? ["Gig / Full Client"] : t.full_client_only ? ["Full Client"] : [],
    reportModes: t.supported_report_modes,
  };
}

// Re-export for convenience.
export { GIG_TOOL_REGISTRY, FULL_CLIENT_ONLY_TOOLS, REPORTABLE_TOOL_CATALOG };
export type { GigTier, GigToolKey };
