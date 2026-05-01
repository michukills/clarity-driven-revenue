// P20.17 — Connector readiness model.
//
// Pure helpers that classify the per-customer state of each provider
// connector (QuickBooks, Square, Stripe, Dutchie) for the admin
// "Connector Readiness & Import History" surface.
//
// We intentionally do NOT call a provider "connected" unless there is
// concrete evidence (e.g., an active OAuth row from QB status). For
// Square/Stripe/Dutchie, the safe default is `normalized_ingest_available`
// since admins can ingest a normalized period summary without live OAuth.
//
// Cannabis/MMJ language guard: Dutchie is regulated cannabis retail/POS.
// Never use healthcare/patient-care terminology here.

import type { CustomerMetricsSource } from "./types";

export type ConnectorProvider = "quickbooks" | "square" | "stripe" | "dutchie";

export type ConnectorReadinessStatus =
  | "connected"
  | "live_sync_configured"
  | "live_sync_not_configured"
  | "summary_available"
  | "imported_to_metrics"
  | "normalized_ingest_available"
  | "no_summary"
  | "planned"
  | "not_applicable"
  | "needs_verification"
  | "error";

export interface SummarySnapshot {
  period_start: string | null;
  period_end: string | null;
  synced_at?: string | null;
}

export interface ProviderReadiness {
  provider: ConnectorProvider;
  label: string;
  status: ConnectorReadinessStatus;
  /** Always true for QuickBooks; cannabis-only for Dutchie; always for Square/Stripe. */
  applicable: boolean;
  summary: SummarySnapshot | null;
  importedToMetrics: boolean;
  liveSyncConfigured: boolean;
  notes?: string;
}

export interface ReadinessInputs {
  industry: string | null | undefined;
  /** Latest customer_business_metrics.source if known. */
  currentMetricsSource?: CustomerMetricsSource | null;
  quickbooks: {
    summary: SummarySnapshot | null;
    /** True only when QB OAuth/status reports an active connection. */
    liveConnected?: boolean;
    error?: string | null;
  };
  square: { summary: SummarySnapshot | null; error?: string | null };
  stripe: { summary: SummarySnapshot | null; error?: string | null };
  dutchie: { summary: SummarySnapshot | null; error?: string | null };
}

const LABELS: Record<ConnectorProvider, string> = {
  quickbooks: "QuickBooks",
  square: "Square",
  stripe: "Stripe",
  dutchie: "Dutchie",
};

/**
 * Map a metrics source enum to the provider it represents, if any.
 */
export function sourceToProvider(
  source: CustomerMetricsSource | null | undefined,
): ConnectorProvider | null {
  switch (source) {
    case "quickbooks":
      return "quickbooks";
    case "square":
      return "square";
    case "stripe":
      return "stripe";
    case "dutchie":
      return "dutchie";
    default:
      return null;
  }
}

function computeQuickBooksStatus(
  input: ReadinessInputs,
  importedToMetrics: boolean,
): ConnectorReadinessStatus {
  if (input.quickbooks.error) return "error";
  if (importedToMetrics) return "imported_to_metrics";
  if (input.quickbooks.summary) return "summary_available";
  if (input.quickbooks.liveConnected) return "connected";
  return "no_summary";
}

function computeIngestProviderStatus(
  summary: SummarySnapshot | null,
  error: string | null | undefined,
  importedToMetrics: boolean,
): ConnectorReadinessStatus {
  if (error) return "error";
  if (importedToMetrics) return "imported_to_metrics";
  if (summary) return "summary_available";
  return "normalized_ingest_available";
}

/**
 * Compute readiness for every supported provider for a given customer.
 */
export function computeConnectorReadiness(
  input: ReadinessInputs,
): ProviderReadiness[] {
  const isCannabis = input.industry === "mmj_cannabis";
  const importedFor = sourceToProvider(input.currentMetricsSource ?? null);

  const qb: ProviderReadiness = {
    provider: "quickbooks",
    label: LABELS.quickbooks,
    applicable: true,
    summary: input.quickbooks.summary,
    importedToMetrics: importedFor === "quickbooks",
    liveSyncConfigured: !!input.quickbooks.liveConnected,
    status: computeQuickBooksStatus(input, importedFor === "quickbooks"),
  };

  const sq: ProviderReadiness = {
    provider: "square",
    label: LABELS.square,
    applicable: true,
    summary: input.square.summary,
    importedToMetrics: importedFor === "square",
    liveSyncConfigured: false,
    status: computeIngestProviderStatus(
      input.square.summary,
      input.square.error,
      importedFor === "square",
    ),
  };

  const st: ProviderReadiness = {
    provider: "stripe",
    label: LABELS.stripe,
    applicable: true,
    summary: input.stripe.summary,
    importedToMetrics: importedFor === "stripe",
    liveSyncConfigured: false,
    status: computeIngestProviderStatus(
      input.stripe.summary,
      input.stripe.error,
      importedFor === "stripe",
    ),
  };

  const du: ProviderReadiness = {
    provider: "dutchie",
    label: LABELS.dutchie,
    applicable: isCannabis,
    summary: isCannabis ? input.dutchie.summary : null,
    importedToMetrics: isCannabis && importedFor === "dutchie",
    liveSyncConfigured: false,
    status: !isCannabis
      ? "not_applicable"
      : computeIngestProviderStatus(
          input.dutchie.summary,
          input.dutchie.error,
          importedFor === "dutchie",
        ),
    notes: !isCannabis
      ? "Dutchie is cannabis/MMJ retail and POS only."
      : undefined,
  };

  return [qb, sq, st, du];
}

export const STATUS_LABELS: Record<ConnectorReadinessStatus, string> = {
  connected: "Connected",
  live_sync_configured: "Live sync configured",
  live_sync_not_configured: "Live sync not configured",
  summary_available: "Summary available",
  imported_to_metrics: "Imported into metrics",
  normalized_ingest_available: "Normalized ingest available",
  no_summary: "No summary on file",
  planned: "Planned",
  not_applicable: "Not applicable",
  needs_verification: "Needs verification",
  error: "Error",
};

export const STATUS_EXPLANATIONS: Record<ConnectorReadinessStatus, string> = {
  connected:
    "Live provider connection is active and reporting status.",
  live_sync_configured:
    "Live sync is configured server-side; tokens are never read by the browser.",
  live_sync_not_configured:
    "No live API connection is configured yet for this provider.",
  summary_available:
    "RGS has a normalized provider-period summary stored for this customer.",
  imported_to_metrics:
    "An admin imported the latest summary into client_business_metrics.",
  normalized_ingest_available:
    "Admins can paste/upload a safe normalized summary without live OAuth.",
  no_summary:
    "No provider summary has been ingested for this customer yet.",
  planned:
    "Connector is on the roadmap but not yet wired up.",
  not_applicable:
    "This connector does not apply to this customer's industry.",
  needs_verification:
    "Provider state is unclear; admin verification is required.",
  error:
    "Could not read provider state. See console / audit history for details.",
};

/** Audit event row sanitized for safe rendering in the history list. */
export interface SafeAuditEvent {
  id: string;
  action: string;
  /** Friendly event subtype if details.event is present (e.g. provider_summary_ingested). */
  event?: string | null;
  provider?: ConnectorProvider | null;
  source?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  field_count?: number | null;
  confidence?: string | null;
  readiness?: string | null;
  created_at: string;
}

const SAFE_KEYS = new Set([
  "event",
  "provider",
  "source",
  "period_start",
  "period_end",
  "field_count",
  "confidence",
  "readiness",
]);

/**
 * Map an audit row's `details` JSON to a small whitelisted shape.
 * Drops any unknown keys (no raw payloads, tokens, or IDs leak through).
 */
export function safeAuditFromRow(row: {
  id: string;
  action: string;
  details: unknown;
  created_at: string;
}): SafeAuditEvent {
  const d =
    row.details && typeof row.details === "object" && !Array.isArray(row.details)
      ? (row.details as Record<string, unknown>)
      : {};
  const safe: Record<string, unknown> = {};
  for (const k of Object.keys(d)) {
    if (SAFE_KEYS.has(k)) safe[k] = d[k];
  }
  const sourceStr =
    typeof safe.source === "string" ? (safe.source as string) : null;
  const provFromSource: ConnectorProvider | null = sourceStr
    ? sourceStr.includes("quickbooks")
      ? "quickbooks"
      : sourceStr.includes("square")
        ? "square"
        : sourceStr.includes("stripe")
          ? "stripe"
          : sourceStr.includes("dutchie")
            ? "dutchie"
            : null
    : null;
  const provFromField =
    typeof safe.provider === "string" &&
    ["quickbooks", "square", "stripe", "dutchie"].includes(safe.provider as string)
      ? (safe.provider as ConnectorProvider)
      : null;
  return {
    id: row.id,
    action: row.action,
    event: typeof safe.event === "string" ? (safe.event as string) : null,
    provider: provFromField ?? provFromSource,
    source: sourceStr,
    period_start:
      typeof safe.period_start === "string" ? (safe.period_start as string) : null,
    period_end:
      typeof safe.period_end === "string" ? (safe.period_end as string) : null,
    field_count:
      typeof safe.field_count === "number" ? (safe.field_count as number) : null,
    confidence:
      typeof safe.confidence === "string" ? (safe.confidence as string) : null,
    readiness:
      typeof safe.readiness === "string" ? (safe.readiness as string) : null,
    created_at: row.created_at,
  };
}