/**
 * P20.17 — Connector Readiness & Import History (admin-only).
 *
 * Compact admin-only surface that summarizes per-customer readiness for
 * QuickBooks, Square, Stripe, and Dutchie connectors and shows recent
 * provider-related ingest/import activity.
 *
 * Security:
 *   - Admin-only via RLS on portal_audit_log + the parent panel gate.
 *   - No tokens, no raw payloads, no provider account IDs displayed.
 *   - Audit details are whitelisted to a small, safe key set.
 *
 * Cannabis/MMJ language guard:
 *   - Dutchie is described as cannabis/MMJ retail/POS only.
 *   - No healthcare/patient-care terminology.
 */

import { useEffect, useMemo, useState } from "react";
import { Activity, History, RefreshCw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import {
  computeConnectorReadiness,
  safeAuditFromRow,
  STATUS_EXPLANATIONS,
  STATUS_LABELS,
  type ProviderReadiness,
  type ReadinessInputs,
  type SafeAuditEvent,
} from "@/lib/customerMetrics/connectorReadiness";

export interface ConnectorReadinessHistoryPanelProps {
  customerId: string;
  inputs: ReadinessInputs;
  /** Bumped by parent when a refresh should re-fetch audit history. */
  refreshKey?: number;
}

const RELEVANT_ACTIONS = [
  "data_import_started",
  "data_import_completed",
  "connector_connected",
  "connector_disconnected",
] as const;

const RELEVANT_SOURCES = new Set([
  "metrics_quickbooks",
  "metrics_square",
  "metrics_stripe",
  "metrics_dutchie",
  "metrics_csv",
  "metrics_xlsx",
]);

export function ConnectorReadinessHistoryPanel({
  customerId,
  inputs,
  refreshKey = 0,
}: ConnectorReadinessHistoryPanelProps) {
  const readiness = useMemo(() => computeConnectorReadiness(inputs), [inputs]);
  const [events, setEvents] = useState<SafeAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      const { data, error: err } = await supabase
        .from("portal_audit_log")
        .select("id, action, details, created_at")
        .eq("customer_id", customerId)
        .in("action", RELEVANT_ACTIONS as unknown as never)
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setEvents([]);
      } else {
        const safe = (data ?? [])
          .map((row) =>
            safeAuditFromRow({
              id: String(row.id),
              action: String(row.action),
              details: row.details,
              created_at: String(row.created_at),
            }),
          )
          .filter((e) => {
            // Keep provider-relevant events only.
            if (e.event === "provider_summary_ingested") return true;
            if (e.action === "connector_connected") return true;
            if (e.action === "connector_disconnected") return true;
            if (e.source && RELEVANT_SOURCES.has(e.source)) return true;
            if (e.provider) return true;
            return false;
          })
          .slice(0, 20);
        setEvents(safe);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, refreshKey]);

  return (
    <section
      className="space-y-4 border-t border-border pt-5"
      data-testid="connector-readiness-history"
    >
      <div className="flex items-center gap-2 text-foreground">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">
          Connector Readiness &amp; Import History
        </h3>
        <span className="ml-auto text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Admin only
        </span>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {readiness.map((p) => (
          <ProviderRow key={p.provider} row={p} />
        ))}
      </ul>

      <details className="text-[11px] text-muted-foreground">
        <summary className="cursor-pointer">Status legend</summary>
        <dl className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key} className="flex flex-col">
              <dt className="font-medium text-foreground/80">{label}</dt>
              <dd>{STATUS_EXPLANATIONS[key as keyof typeof STATUS_EXPLANATIONS]}</dd>
            </div>
          ))}
        </dl>
      </details>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <History className="h-3 w-3" /> Recent activity
        </div>
        {loading ? (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" /> Loading history…
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Couldn't load history</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        ) : events.length === 0 ? (
          <div
            className="text-xs text-muted-foreground"
            data-testid="history-empty"
          >
            No recent connector activity yet.
          </div>
        ) : (
          <ul
            className="text-xs divide-y divide-border rounded-md border border-border"
            data-testid="history-list"
          >
            {events.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-2 px-3 py-2"
              >
                <Badge variant="outline" className="text-[10px]">
                  {e.event === "provider_summary_ingested"
                    ? "Summary ingested"
                    : e.action === "data_import_completed"
                      ? "Imported into metrics"
                      : e.action.replace(/_/g, " ")}
                </Badge>
                {e.provider && (
                  <Badge variant="secondary" className="text-[10px]">
                    {e.provider}
                  </Badge>
                )}
                {e.period_start && e.period_end && (
                  <span className="text-muted-foreground">
                    {e.period_start} → {e.period_end}
                  </span>
                )}
                {typeof e.field_count === "number" && (
                  <span className="text-muted-foreground">
                    {e.field_count} fields
                  </span>
                )}
                {e.confidence && (
                  <span className="text-muted-foreground">{e.confidence}</span>
                )}
                <span className="ml-auto text-muted-foreground/80">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ProviderRow({ row }: { row: ProviderReadiness }) {
  const variant: "default" | "secondary" | "outline" | "destructive" =
    row.status === "imported_to_metrics" || row.status === "connected"
      ? "default"
      : row.status === "error"
        ? "destructive"
        : row.status === "not_applicable"
          ? "outline"
          : "secondary";

  return (
    <li
      className="flex items-start justify-between gap-3 rounded-md border border-border bg-card/40 px-3 py-2"
      data-testid={`readiness-row-${row.provider}`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{row.label}</div>
        {row.summary?.period_start && row.summary?.period_end ? (
          <div className="text-[11px] text-muted-foreground">
            {row.summary.period_start} → {row.summary.period_end}
            {row.summary.synced_at && (
              <>
                {" "}
                · synced {new Date(row.summary.synced_at).toLocaleDateString()}
              </>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">
            {row.notes ?? "—"}
          </div>
        )}
      </div>
      <Badge
        variant={variant}
        className="text-[10px] shrink-0"
        data-testid={`readiness-status-${row.provider}`}
      >
        {STATUS_LABELS[row.status]}
      </Badge>
    </li>
  );
}

export default ConnectorReadinessHistoryPanel;