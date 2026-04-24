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
  | "unavailable"
  // legacy P11.7 values still understood for back-compat:
  | "active"
  | "disconnected"
  | "error"
  | "paused";

export interface ConnectedSourceRow {
  id: string;
  customer_id: string;
  provider: ConnectorId;
  status: SourceStatus;
  account_label: string | null;
  last_sync_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
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