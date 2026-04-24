/**
 * P12.4.C — Client Connected Source workspace registry.
 *
 * A small, honest registry that maps the connectors planned in
 * `src/lib/integrations/planning.ts` into category groups the client
 * actually recognises ("Accounting", "Payments", "CRM / Pipeline", …)
 * and pairs each with a request/connection lifecycle the UI can drive.
 *
 * Only QuickBooks has a real simulated sync today (P11.7 Integrations
 * panel). Every other source is honestly surfaced as "Request connection"
 * — the request is recorded in `customer_integrations` so admins see it
 * in the diagnostic workspace as part of client-supplied truth.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  CONNECTOR_PLANS,
  type ConnectorId,
} from "@/lib/integrations/planning";

export type SourceCategoryId =
  | "accounting"
  | "payments"
  | "crm_pipeline"
  | "analytics"
  | "payroll_labor"
  | "field_ops";

export interface SourceCategory {
  id: SourceCategoryId;
  label: string;
  description: string;
  connectorIds: ConnectorId[];
}

/**
 * P13.RCC.H.3 — Connector capability model.
 *
 * Each connector declares HOW it integrates so the UI can render the
 * right CTA and copy without one-off branches per provider:
 *
 *   - direct_oauth_sync : real external OAuth + server-side token + sync.
 *                         Today: QuickBooks. Future: Stripe, HubSpot, etc.
 *   - request_setup_only: no live integration yet — admin handles setup.
 *   - import_upload     : not a connector — routes to file/spreadsheet
 *                         imports (kept for completeness; not used in the
 *                         connector catalog itself).
 *   - manual_entry_only : no plan to integrate; manual entry is canonical.
 */
export type ConnectorCapability =
  | "direct_oauth_sync"
  | "request_setup_only"
  | "import_upload"
  | "manual_entry_only";

/**
 * Map every catalog connector to its current capability. Adding a new
 * direct-sync connector in the future = flip its entry to
 * `direct_oauth_sync` and ship the matching edge functions; the UI
 * adapts automatically.
 */
export const CONNECTOR_CAPABILITIES: Record<ConnectorId, ConnectorCapability> = {
  quickbooks: "direct_oauth_sync",
  // Everything below uses request-setup until a real OAuth/sync ships.
  xero: "request_setup_only",
  freshbooks: "request_setup_only",
  stripe: "request_setup_only",
  square: "request_setup_only",
  paypal: "request_setup_only",
  hubspot: "request_setup_only",
  salesforce: "request_setup_only",
  pipedrive: "request_setup_only",
  ga4: "request_setup_only",
  google_search_console: "request_setup_only",
  meta_ads: "request_setup_only",
  paycom: "request_setup_only",
  adp: "request_setup_only",
  gusto: "request_setup_only",
  jobber: "request_setup_only",
  housecall_pro: "request_setup_only",
  servicetitan: "request_setup_only",
};

export function getConnectorCapability(id: ConnectorId): ConnectorCapability {
  return CONNECTOR_CAPABILITIES[id] ?? "request_setup_only";
}

export function isDirectOAuthConnector(id: ConnectorId): boolean {
  return getConnectorCapability(id) === "direct_oauth_sync";
}

// ─────────────────────────────────────────────────────────────────────────────
// P13.RCC.H.4 — Connector Capability Parity Matrix
//
// The capability matrix declares, per connector, the honest answer to:
//   - what kind of integration is this? (live OAuth now, planned, request-only,
//     import/upload, manual-only)
//   - what auth pattern would it use?
//   - which objects we'd pull
//   - which RCC weekly/monthly fields we'd autofill
//   - what the user-facing status / action copy must be
//
// Both /portal/connected-sources and the RCC Step 1 Source Readiness panel
// read from this single matrix so behavior never drifts between surfaces.
// ─────────────────────────────────────────────────────────────────────────────

export type CapabilityKind =
  | "direct_oauth_sync_now"
  | "direct_oauth_sync_future"
  | "request_setup_only"
  | "import_upload"
  | "manual_entry_only";

export type AuthType =
  | "oauth2"
  | "oauth2_planned"
  | "service_account"
  | "admin_handled"
  | "file_upload"
  | "none";

/**
 * RCC weekly/monthly field keys that autofill maps target. Kept as a
 * string union so we can cross-reference with WeeklyCheckIn form fields
 * without a circular import.
 */
export type RccFieldKey =
  | "rev_collected"
  | "rev_pending"
  | "exp_total"
  | "ar_outstanding"
  | "ar_aging_0_30"
  | "ar_aging_31_60"
  | "ar_aging_61_90"
  | "ar_aging_90_plus"
  | "payroll_cost"
  | "labor_hours"
  | "headcount"
  | "pipeline_deal_count"
  | "pipeline_deal_value"
  | "pipeline_stage_movement"
  | "marketing_traffic"
  | "marketing_spend"
  | "marketing_leads";

export interface ConnectorCapabilityEntry {
  id: ConnectorId | "spreadsheet_csv" | "bank_report";
  label: string;
  category:
    | "Accounting"
    | "Payments"
    | "CRM / Pipeline"
    | "Analytics"
    | "Payroll / Labor"
    | "Field Ops"
    | "Imports";
  capability: CapabilityKind;
  authType: AuthType;
  /** Objects we'd pull from the source (informational, not enforced). */
  expectedSyncedObjects: string[];
  /** RCC fields this connector can autofill once live. */
  rccAutofillFields: RccFieldKey[];
  /** Honest current implementation note for admins/devs. */
  implementationStatus: string;
  /** Default user-facing status copy when not connected. */
  statusCopy: string;
  /** Default user-facing primary action label. */
  actionLabel: string;
  /** Whether the "Request setup" workflow is allowed for this connector. */
  allowSetupRequest: boolean;
  /** Whether the connector can transition to an "active" connected state today. */
  supportsActiveState: boolean;
}

/**
 * Source of truth. Edit this matrix to flip a connector from
 * future-planned to live-now: change `capability` to `direct_oauth_sync_now`
 * (and keep `CONNECTOR_CAPABILITIES[id] = "direct_oauth_sync"`).
 */
export const CONNECTOR_CAPABILITY_MATRIX: ConnectorCapabilityEntry[] = [
  // Accounting ────────────────────────────────────────────────────────────────
  {
    id: "quickbooks",
    label: "QuickBooks",
    category: "Accounting",
    capability: "direct_oauth_sync_now",
    authType: "oauth2",
    expectedSyncedObjects: ["Invoice", "Bill / Expense", "P&L summary", "AR aging"],
    rccAutofillFields: [
      "rev_collected",
      "rev_pending",
      "exp_total",
      "ar_outstanding",
      "ar_aging_0_30",
      "ar_aging_31_60",
      "ar_aging_61_90",
      "ar_aging_90_plus",
    ],
    implementationStatus: "Live: qb-oauth-start/callback, qb-status, qb-sync, period summaries.",
    statusCopy: "Live sync available",
    actionLabel: "Connect QuickBooks",
    allowSetupRequest: false,
    supportsActiveState: true,
  },
  {
    id: "xero",
    label: "Xero",
    category: "Accounting",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Invoice", "Bill", "P&L summary", "AR aging"],
    rccAutofillFields: ["rev_collected", "rev_pending", "exp_total", "ar_outstanding"],
    implementationStatus: "Planned: Xero OAuth & sync not yet shipped. RGS configures manually today.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },
  {
    id: "freshbooks",
    label: "FreshBooks",
    category: "Accounting",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Invoice", "Expense", "Time tracking"],
    rccAutofillFields: ["rev_collected", "rev_pending", "exp_total"],
    implementationStatus: "Planned: FreshBooks OAuth not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },

  // Payments ─────────────────────────────────────────────────────────────────
  {
    id: "stripe",
    label: "Stripe",
    category: "Payments",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Charge", "Refund", "Subscription", "Payout"],
    rccAutofillFields: ["rev_collected"],
    implementationStatus: "Planned: Stripe OAuth/API not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },
  {
    id: "square",
    label: "Square",
    category: "Payments",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Payment", "Refund", "Payout"],
    rccAutofillFields: ["rev_collected"],
    implementationStatus: "Planned: Square OAuth not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },
  {
    id: "paypal",
    label: "PayPal",
    category: "Payments",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Transaction", "Refund", "Payout"],
    rccAutofillFields: ["rev_collected"],
    implementationStatus: "Planned: PayPal OAuth not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },

  // CRM / Pipeline ───────────────────────────────────────────────────────────
  {
    id: "hubspot",
    label: "HubSpot",
    category: "CRM / Pipeline",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Deal", "Contact", "Lifecycle stage", "Source attribution"],
    rccAutofillFields: ["pipeline_deal_count", "pipeline_deal_value", "pipeline_stage_movement"],
    implementationStatus: "Planned: HubSpot OAuth not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },
  {
    id: "salesforce",
    label: "Salesforce",
    category: "CRM / Pipeline",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Opportunity", "Stage", "Account"],
    rccAutofillFields: ["pipeline_deal_count", "pipeline_deal_value", "pipeline_stage_movement"],
    implementationStatus: "Planned: Salesforce OAuth not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },
  {
    id: "pipedrive",
    label: "Pipedrive",
    category: "CRM / Pipeline",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Deal", "Stage transition"],
    rccAutofillFields: ["pipeline_deal_count", "pipeline_deal_value", "pipeline_stage_movement"],
    implementationStatus: "Planned: Pipedrive OAuth not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },

  // Analytics ────────────────────────────────────────────────────────────────
  {
    id: "ga4",
    label: "Google Analytics (GA4)",
    category: "Analytics",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Sessions", "Source / medium", "Conversion events"],
    rccAutofillFields: ["marketing_traffic"],
    implementationStatus: "Planned: GA4 not yet shipped. Marketing-only — no RCC financial autofill.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },
  {
    id: "google_search_console",
    label: "Google Search Console",
    category: "Analytics",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Queries", "Pages", "Impressions", "Clicks"],
    rccAutofillFields: ["marketing_traffic"],
    implementationStatus: "Planned: GSC not yet shipped. Marketing-only.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },
  {
    id: "meta_ads",
    label: "Meta Ads (Facebook / Instagram)",
    category: "Analytics",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Campaign spend", "Leads", "Conversions"],
    rccAutofillFields: ["marketing_spend", "marketing_leads"],
    implementationStatus: "Planned: Meta Ads OAuth not yet shipped. Marketing-only.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },

  // Payroll / Labor ──────────────────────────────────────────────────────────
  {
    id: "paycom",
    label: "Paycom",
    category: "Payroll / Labor",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Payroll run", "Headcount", "Hours"],
    rccAutofillFields: ["payroll_cost", "labor_hours", "headcount"],
    implementationStatus: "Planned: Paycom not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },
  {
    id: "adp",
    label: "ADP",
    category: "Payroll / Labor",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Payroll run", "Headcount", "Hours"],
    rccAutofillFields: ["payroll_cost", "labor_hours", "headcount"],
    implementationStatus: "Planned: ADP not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },
  {
    id: "gusto",
    label: "Gusto",
    category: "Payroll / Labor",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Payroll run", "Headcount", "Hours"],
    rccAutofillFields: ["payroll_cost", "labor_hours", "headcount"],
    implementationStatus: "Planned: Gusto not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },

  // Field Ops ────────────────────────────────────────────────────────────────
  {
    id: "jobber",
    label: "Jobber",
    category: "Field Ops",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Job", "Estimate", "Schedule", "Completion"],
    rccAutofillFields: ["rev_pending"],
    implementationStatus: "Planned: Jobber not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },
  {
    id: "housecall_pro",
    label: "Housecall Pro",
    category: "Field Ops",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Job", "Estimate", "Schedule"],
    rccAutofillFields: ["rev_pending"],
    implementationStatus: "Planned: Housecall Pro not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },
  {
    id: "servicetitan",
    label: "ServiceTitan",
    category: "Field Ops",
    capability: "direct_oauth_sync_future",
    authType: "oauth2_planned",
    expectedSyncedObjects: ["Job", "Estimate", "Booked vs completed"],
    rccAutofillFields: ["rev_pending"],
    implementationStatus: "Planned: ServiceTitan not yet shipped.",
    statusCopy: "Direct sync planned",
    actionLabel: "Request setup",
    allowSetupRequest: true,
    supportsActiveState: true,
  },

  // Imports / Uploads ────────────────────────────────────────────────────────
  {
    id: "spreadsheet_csv",
    label: "Spreadsheet / CSV",
    category: "Imports",
    capability: "import_upload",
    authType: "file_upload",
    expectedSyncedObjects: ["Mapped rows from CSV/XLSX"],
    rccAutofillFields: [],
    implementationStatus: "Live via /portal/imports CSV/XLSX wizard.",
    statusCopy: "Upload or import a file",
    actionLabel: "Open Imports",
    allowSetupRequest: false,
    supportsActiveState: false,
  },
  {
    id: "bank_report",
    label: "Bank report upload",
    category: "Imports",
    capability: "import_upload",
    authType: "file_upload",
    expectedSyncedObjects: ["Bank statement PDF / CSV"],
    rccAutofillFields: [],
    implementationStatus: "Live via /portal/uploads. No live bank sync.",
    statusCopy: "Upload a bank report",
    actionLabel: "Open Uploads",
    allowSetupRequest: false,
    supportsActiveState: false,
  },
];

/**
 * Lookup helper. Accepts a real ConnectorId or one of the import-only ids.
 */
export function getCapabilityEntry(
  id: ConnectorId | "spreadsheet_csv" | "bank_report",
): ConnectorCapabilityEntry | null {
  return CONNECTOR_CAPABILITY_MATRIX.find((e) => e.id === id) ?? null;
}

export function getCapabilityKind(id: ConnectorId): CapabilityKind {
  const entry = CONNECTOR_CAPABILITY_MATRIX.find((e) => e.id === id);
  if (!entry) return "request_setup_only";
  return entry.capability;
}

export function isDirectSyncFuture(id: ConnectorId): boolean {
  return getCapabilityKind(id) === "direct_oauth_sync_future";
}

export const SOURCE_CATEGORIES: SourceCategory[] = [
  {
    id: "accounting",
    label: "Accounting",
    description: "Books, invoices, AR / AP — the financial truth your diagnostic depends on.",
    connectorIds: ["quickbooks", "xero", "freshbooks"],
  },
  {
    id: "payments",
    label: "Payments",
    description: "Payment timing, refunds, recurring revenue cadence.",
    connectorIds: ["stripe", "square", "paypal"],
  },
  {
    id: "crm_pipeline",
    label: "CRM / Pipeline",
    description: "Leads, deals, stage transitions, source attribution.",
    connectorIds: ["hubspot", "salesforce", "pipedrive"],
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Top-of-funnel traffic and conversion events. Useful when digital is material.",
    connectorIds: ["ga4", "google_search_console", "meta_ads"],
  },
  {
    id: "payroll_labor",
    label: "Payroll / Labor",
    description: "Payroll cost, headcount, labor share of revenue.",
    connectorIds: ["paycom", "adp", "gusto"],
  },
  {
    id: "field_ops",
    label: "Field Ops",
    description: "Jobs, scheduling, dispatch, completion — for trades / home-services shops.",
    connectorIds: ["jobber", "housecall_pro", "servicetitan"],
  },
];

/**
 * Live status model. `not_started` is the implied state when no row exists.
 * `connected` means real working sync. Everything else is honest about
 * being mid-flight or admin-handled.
 */
export type SourceStatus =
  | "not_started"
  | "requested"
  | "setup_in_progress"
  | "connected"
  | "needs_review"
  | "import_ready"
  | "manual_only"
  | "unsupported"
  | "unavailable"
  // legacy P11.7 values still understood for back-compat:
  | "active"
  | "disconnected"
  | "error"
  | "paused";

export interface ConnectedSourceRow {
  id: string;
  customer_id: string;
  provider: ConnectorId | "custom";
  status: SourceStatus;
  account_label: string | null;
  last_sync_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type CustomSourceCategory =
  | "Accounting"
  | "Payments"
  | "CRM / Pipeline"
  | "Analytics"
  | "Payroll / Labor"
  | "Field Ops"
  | "Bank / Financial Report"
  | "Spreadsheet / CSV"
  | "Other";

export type CustomSourceDataType =
  | "revenue"
  | "expenses"
  | "invoices"
  | "ar_ap"
  | "payroll_labor"
  | "pipeline"
  | "marketing"
  | "job_project_data"
  | "cash_bank_reports"
  | "other";

export type CustomSourceAccessMethod =
  | "external_login_available"
  | "export_csv_xlsx"
  | "upload_reports_pdfs"
  | "rgs_should_review"
  | "manual_entry_only";

export interface CustomSourceRequestInput {
  sourceName: string;
  websiteUrl?: string;
  category: CustomSourceCategory;
  dataTypes: CustomSourceDataType[];
  accessMethods: CustomSourceAccessMethod[];
  notes?: string;
  ownerOrAccessContact?: string;
}

export interface CustomSourceRequestRow extends ConnectedSourceRow {
  provider: "custom";
  metadata: ConnectedSourceRow["metadata"] & {
    request_type?: "custom_source";
    created_from?: string;
    source_name?: string;
    category?: CustomSourceCategory;
    data_types?: CustomSourceDataType[];
    access_method?: CustomSourceAccessMethod[];
    website_url?: string | null;
    notes?: string | null;
    owner_or_access_contact?: string | null;
  };
}

export interface ConnectorCardModel {
  connectorId: ConnectorId;
  label: string;
  ownedTruthSummary: string;
  status: SourceStatus;
  hasLiveSync: boolean;
  rowId: string | null;
  requestedAt: string | null;
  note: string | null;
  accountLabel: string | null;
  lastSyncAt: string | null;
}

export function getConnectorPlan(id: ConnectorId) {
  const plan = CONNECTOR_PLANS.find((c) => c.id === id);
  if (!plan) throw new Error(`Unknown connector: ${id}`);
  return plan;
}

/**
 * Map status to a friendly tone + action verb. Keeps the UI honest:
 * `Connected` is reserved for real sync.
 */
export function statusUi(s: SourceStatus): {
  label: string;
  tone: string;
  isTerminalGood: boolean;
} {
  switch (s) {
    case "connected":
    case "active":
      return {
        label: "Connected",
        tone: "bg-secondary/15 text-secondary border-secondary/40",
        isTerminalGood: true,
      };
    case "requested":
      return {
        label: "Requested",
        tone: "bg-primary/10 text-primary border-primary/30",
        isTerminalGood: false,
      };
    case "setup_in_progress":
      return {
        label: "Setup in progress",
        tone: "bg-amber-500/10 text-amber-400 border-amber-500/40",
        isTerminalGood: false,
      };
    case "needs_review":
      return {
        label: "Needs admin review",
        tone: "bg-amber-500/10 text-amber-400 border-amber-500/40",
        isTerminalGood: false,
      };
    case "import_ready":
      return {
        label: "Import ready",
        tone: "bg-primary/10 text-primary border-primary/30",
        isTerminalGood: false,
      };
    case "manual_only":
      return {
        label: "Manual entry only",
        tone: "bg-muted/40 text-muted-foreground border-border",
        isTerminalGood: false,
      };
    case "unsupported":
      return {
        label: "Unsupported",
        tone: "bg-muted/40 text-muted-foreground border-border",
        isTerminalGood: false,
      };
    case "unavailable":
      return {
        label: "Not available yet",
        tone: "bg-muted/40 text-muted-foreground border-border",
        isTerminalGood: false,
      };
    case "disconnected":
    case "error":
    case "paused":
      return {
        label: s.charAt(0).toUpperCase() + s.slice(1),
        tone: "bg-muted/40 text-muted-foreground border-border",
        isTerminalGood: false,
      };
    case "not_started":
    default:
      return {
        label: "Not started",
        tone: "bg-muted/40 text-muted-foreground border-border",
        isTerminalGood: false,
      };
  }
}

export function isLiveSyncSupported(id: ConnectorId): boolean {
  // "Live sync" === a direct OAuth/sync capability. As future
  // connectors flip to direct_oauth_sync they automatically qualify.
  return isDirectOAuthConnector(id);
}

export async function listConnectedSourceRows(
  customerId: string,
): Promise<ConnectedSourceRow[]> {
  const { data, error } = await supabase
    .from("customer_integrations")
    .select("id, customer_id, provider, status, account_label, last_sync_at, metadata, created_at, updated_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConnectedSourceRow[];
}

/**
 * Record (or refresh) a client request to set up a source. We treat the
 * latest row per provider as the active one — listConnectorCards()
 * collapses by provider so duplicates don't matter operationally.
 */
export async function requestSourceConnection(args: {
  customerId: string;
  connectorId: ConnectorId;
  note?: string;
}): Promise<ConnectedSourceRow> {
  const { data: existing } = await supabase
    .from("customer_integrations")
    .select("id, status, metadata")
    .eq("customer_id", args.customerId)
    .eq("provider", args.connectorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const userRes = await supabase.auth.getUser();
  const uid = userRes.data.user?.id ?? null;

  // If we already have a connected/active row, leave it alone.
  if (existing && (existing.status === "connected" || existing.status === "active")) {
    return existing as ConnectedSourceRow;
  }

  const baseMeta = (existing?.metadata as Record<string, any>) ?? {};
  const metadata = {
    ...baseMeta,
    request_note: args.note ?? baseMeta.request_note ?? null,
    requested_at: new Date().toISOString(),
    requested_by: uid,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("customer_integrations")
      .update({
        status: "requested",
        metadata,
        updated_by: uid,
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as ConnectedSourceRow;
  }

  const { data, error } = await supabase
    .from("customer_integrations")
    .insert({
      customer_id: args.customerId,
      provider: args.connectorId,
      status: "requested",
      account_label: null,
      metadata,
      created_by: uid,
      updated_by: uid,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ConnectedSourceRow;
}

export async function requestCustomSourceConnection(args: {
  customerId: string;
  request: CustomSourceRequestInput;
}): Promise<CustomSourceRequestRow> {
  const userRes = await supabase.auth.getUser();
  const uid = userRes.data.user?.id ?? null;
  const metadata: CustomSourceRequestRow["metadata"] = {
    request_type: "custom_source",
    created_from: "connected_sources_custom_tile",
    source_name: args.request.sourceName.trim(),
    category: args.request.category,
    data_types: args.request.dataTypes,
    access_method: args.request.accessMethods,
    website_url: args.request.websiteUrl?.trim() || null,
    notes: args.request.notes?.trim() || null,
    owner_or_access_contact: args.request.ownerOrAccessContact?.trim() || null,
    requested_at: new Date().toISOString(),
    requested_by: uid,
  };

  const { data, error } = await supabase
    .from("customer_integrations")
    .insert({
      customer_id: args.customerId,
      provider: "custom",
      status: "needs_review",
      account_label: args.request.sourceName.trim(),
      metadata,
      created_by: uid,
      updated_by: uid,
    })
    .select("id, customer_id, provider, status, account_label, last_sync_at, metadata, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as CustomSourceRequestRow;
}

export function listCustomSourceRequests(rows: ConnectedSourceRow[]): CustomSourceRequestRow[] {
  return rows.filter(
    (row): row is CustomSourceRequestRow =>
      row.provider === "custom" && row.metadata?.request_type === "custom_source",
  );
}

/** Build the per-connector view shown in the client workspace. */
export function buildConnectorCards(rows: ConnectedSourceRow[]): ConnectorCardModel[] {
  return CONNECTOR_PLANS.map((plan) => {
    const row = rows.find((r) => r.provider === plan.id) ?? null;
    const status: SourceStatus = (row?.status as SourceStatus) ?? "not_started";
    return {
      connectorId: plan.id,
      label: plan.label,
      ownedTruthSummary: plan.ownedTruthSummary,
      status,
      hasLiveSync: isLiveSyncSupported(plan.id),
      rowId: row?.id ?? null,
      requestedAt:
        (row?.metadata as Record<string, any>)?.requested_at ?? row?.created_at ?? null,
      note: (row?.metadata as Record<string, any>)?.request_note ?? null,
      accountLabel: row?.account_label ?? null,
      lastSyncAt: row?.last_sync_at ?? null,
    };
  });
}

export interface ConnectedSourceTotals {
  connected: number;
  requested: number;
  setupInProgress: number;
  needsReview: number;
  total: number;
}

export function summarizeRows(rows: ConnectedSourceRow[]): ConnectedSourceTotals {
  const t: ConnectedSourceTotals = {
    connected: 0,
    requested: 0,
    setupInProgress: 0,
    needsReview: 0,
    total: rows.length,
  };
  for (const r of rows) {
    if (r.status === "connected" || r.status === "active") t.connected++;
    else if (r.status === "requested") t.requested++;
    else if (r.status === "setup_in_progress") t.setupInProgress++;
    else if (r.status === "needs_review") t.needsReview++;
  }
  return t;
}