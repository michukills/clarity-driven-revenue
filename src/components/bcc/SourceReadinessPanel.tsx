/**
 * P13.RCC.H.1 — Source Readiness panel for the weekly/monthly tracking modal.
 *
 * Renders alongside the "Source systems used this week" checkboxes in
 * Step 1. Maps the free-text Step 1 source labels onto the canonical
 * 18-source Connected Sources catalog and shows truthful per-source
 * status + actions.
 *
 * Honesty rules enforced here:
 *   - Only QuickBooks is allowed to say "live sync available".
 *   - Every other connector uses request/setup language until a real
 *     sync surface ships.
 *   - "Bank account / bank report" + "Spreadsheet" never imply a
 *     connector — they route to imports/uploads.
 *   - Requests post into the existing `customer_integrations` table via
 *     `requestSourceConnection`, so admins see them in the existing
 *     Connected Source Requests panel — no parallel system.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Plug, AlertTriangle, CheckCircle2, Clock, Inbox, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listConnectedSourceRows,
  listCustomSourceRequests,
  requestSourceConnection,
  isLiveSyncSupported,
  statusUi,
  isDirectSyncFuture,
  type ConnectedSourceRow,
  type SourceStatus,
} from "@/lib/integrations/connectedSources";
import { CONNECTOR_PLANS, type ConnectorId } from "@/lib/integrations/planning";
import {
  fetchQbStatus,
  startQbOAuth,
  type QbStatus,
} from "@/lib/integrations/quickbooks";

/** Map Step 1 source-system labels to the canonical connector catalog. */
const SOURCE_LABEL_MAP: Record<
  string,
  { connectors: ConnectorId[]; route: "connectors" | "imports"; helper: string }
> = {
  QuickBooks: {
    connectors: ["quickbooks"],
    route: "connectors",
    helper: "Accounting truth — the only source with live sync today.",
  },
  "Payroll software": {
    connectors: ["paycom", "adp", "gusto"],
    route: "connectors",
    helper: "Payroll cost & headcount. Request setup for Paycom, ADP, or Gusto.",
  },
  "Invoice software": {
    connectors: ["stripe", "square", "paypal", "quickbooks"],
    route: "connectors",
    helper: "Invoices / payments. Pick the one(s) you actually use.",
  },
  "CRM / sales pipeline": {
    connectors: ["hubspot", "salesforce", "pipedrive"],
    route: "connectors",
    helper: "Pipeline + deal truth. Request setup for HubSpot, Salesforce, or Pipedrive.",
  },
  Spreadsheet: {
    connectors: [],
    route: "imports",
    helper: "Spreadsheets are imported/uploaded — no live connector.",
  },
  "Bank account / bank report": {
    connectors: [],
    route: "imports",
    helper: "Bank statements are uploaded as files — no live bank sync today.",
  },
  Other: {
    connectors: [],
    route: "connectors",
    helper: "Open Connected Sources to request the right connector.",
  },
};

interface ConnectorRowModel {
  connectorId: ConnectorId;
  label: string;
  hasLiveSync: boolean;
  status: SourceStatus;
  rowId: string | null;
}

function buildRowModel(
  connectorId: ConnectorId,
  rows: ConnectedSourceRow[],
): ConnectorRowModel {
  const plan = CONNECTOR_PLANS.find((p) => p.id === connectorId);
  const row = rows.find((r) => r.provider === connectorId) ?? null;
  return {
    connectorId,
    label: plan?.label ?? connectorId,
    hasLiveSync: isLiveSyncSupported(connectorId),
    status: (row?.status as SourceStatus) ?? "not_started",
    rowId: row?.id ?? null,
  };
}

function StatusPill({
  status,
  hasLiveSync,
  isFutureSync,
}: {
  status: SourceStatus;
  hasLiveSync: boolean;
  isFutureSync: boolean;
}) {
  const ui = statusUi(status);
  // Override label honesty: if not connected yet but live sync is supported,
  // surface "Live sync available" so the action is obvious.
  let label = ui.label;
  let tone = ui.tone;
  let icon: JSX.Element = <Inbox className="h-3 w-3" />;
  if (status === "connected" || status === "active") {
    icon = <CheckCircle2 className="h-3 w-3" />;
    label = "Active connection established";
  } else if (status === "requested" || status === "setup_in_progress") {
    icon = <Clock className="h-3 w-3" />;
  } else if (status === "needs_review") {
    icon = <AlertTriangle className="h-3 w-3" />;
  } else if (status === "not_started" && hasLiveSync) {
    label = "Live sync available";
    tone = "bg-primary/10 text-primary border-primary/30";
    icon = <Plug className="h-3 w-3" />;
  } else if (status === "not_started" && isFutureSync) {
    label = "Direct sync planned";
    tone = "bg-primary/10 text-primary border-primary/30";
    icon = <Plug className="h-3 w-3" />;
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] whitespace-nowrap ${tone}`}
    >
      {icon}
      {label}
    </span>
  );
}

interface SourceReadinessPanelProps {
  customerId: string | null;
  selectedSourceLabels: string[];
}

export function SourceReadinessPanel({
  customerId,
  selectedSourceLabels,
}: SourceReadinessPanelProps) {
  const [rows, setRows] = useState<ConnectedSourceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyConnector, setBusyConnector] = useState<ConnectorId | null>(null);
  const [qbStatus, setQbStatus] = useState<QbStatus | null>(null);
  const [qbBusy, setQbBusy] = useState(false);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const data = await listConnectedSourceRows(customerId);
      setRows(data);
    } catch (e) {
      // Non-fatal — panel just shows "not started" state.
      console.warn("connected sources load failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  // Pull live QuickBooks status whenever the panel mounts / customer changes
  // so the QuickBooks row reflects OAuth/sync truth instead of the generic
  // customer_integrations status.
  useEffect(() => {
    let cancelled = false;
    if (!customerId) return;
    void (async () => {
      try {
        const s = await fetchQbStatus(customerId);
        if (!cancelled) setQbStatus(s);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  // Resolve the unique set of connectors that map to the selected labels.
  // Also classify which selected labels have no connector (imports/uploads).
  const { connectorRows, importHints, openConnectorsHints, missingWarnings } = useMemo(() => {
    const connectorIds = new Set<ConnectorId>();
    const imports: string[] = [];
    const openConnectors: string[] = [];
    const warnings: { label: string; missing: string[] }[] = [];

    for (const label of selectedSourceLabels) {
      const map = SOURCE_LABEL_MAP[label];
      if (!map) continue;
      if (map.route === "imports") {
        imports.push(label);
        continue;
      }
      if (map.connectors.length === 0) {
        openConnectors.push(label);
        continue;
      }
      const missingForLabel: string[] = [];
      for (const cid of map.connectors) {
        connectorIds.add(cid);
        const row = rows.find((r) => r.provider === cid);
        const status = (row?.status as SourceStatus) ?? "not_started";
        const isReady =
          status === "connected" || status === "active" ||
          status === "requested" || status === "setup_in_progress";
        if (!isReady) {
          const plan = CONNECTOR_PLANS.find((p) => p.id === cid);
          missingForLabel.push(plan?.label ?? cid);
        }
      }
      // Only show the warning if EVERY connector for this label is unset.
      if (missingForLabel.length === map.connectors.length) {
        warnings.push({ label, missing: missingForLabel });
      }
    }

    const connectorRowsBuilt = Array.from(connectorIds).map((cid) => buildRowModel(cid, rows));
    // Sort: connected first, then live-sync-available, then requested/setup, then others.
    const order = (m: ConnectorRowModel) => {
      if (m.status === "connected" || m.status === "active") return 0;
      if (m.hasLiveSync && m.status === "not_started") return 1;
      if (m.status === "requested" || m.status === "setup_in_progress") return 2;
      if (m.status === "needs_review") return 3;
      return 4;
    };
    connectorRowsBuilt.sort((a, b) => order(a) - order(b) || a.label.localeCompare(b.label));

    return {
      connectorRows: connectorRowsBuilt,
      importHints: imports,
      openConnectorsHints: openConnectors,
      missingWarnings: warnings,
    };
  }, [selectedSourceLabels, rows]);

  if (selectedSourceLabels.length === 0) {
    return null;
  }

  const customRequests = listCustomSourceRequests(rows);
  const showOtherSource = selectedSourceLabels.includes("Other");

  const handleRequest = async (connectorId: ConnectorId) => {
    if (!customerId) {
      toast.info("Source requests activate once your portal is fully linked.");
      return;
    }
    setBusyConnector(connectorId);
    try {
      await requestSourceConnection({
        customerId,
        connectorId,
        note: "Requested from weekly/monthly tracking — Step 1 source readiness.",
      });
      const plan = CONNECTOR_PLANS.find((p) => p.id === connectorId);
      toast.success(`${plan?.label ?? connectorId} setup requested. Your RGS team will follow up.`);
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not record request. Please try again.");
    } finally {
      setBusyConnector(null);
    }
  };

  const handleConnectQuickBooks = async () => {
    if (!customerId) {
      toast.info("Sign in to connect QuickBooks.");
      return;
    }
    setQbBusy(true);
    try {
      const res = await startQbOAuth(customerId);
      if (!res.configured || !res.authorize_url) {
        toast.info(res.message ?? "QuickBooks connection is not configured yet.");
        return;
      }
      window.open(res.authorize_url, "_blank", "noopener,noreferrer");
      toast.info("Approve in the QuickBooks tab, then return here.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start QuickBooks connection.");
    } finally {
      setQbBusy(false);
    }
  };

  // Renders the QuickBooks row using the live OAuth status. Returns null when
  // there is no live status yet so the caller can fall back to generic UI.
  const renderQuickBooksRow = (m: ConnectorRowModel) => {
    if (!qbStatus) return null;
    let pillTone = "bg-muted/40 text-muted-foreground border-border";
    let pillIcon: JSX.Element = <Plug className="h-3 w-3" />;
    let pillLabel = "QuickBooks";
    let action: JSX.Element | null = null;
    switch (qbStatus.state) {
      case "not_configured":
        pillLabel = "Not configured";
        action = (
          <button
            type="button"
            disabled
            className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground opacity-60 whitespace-nowrap cursor-not-allowed"
          >
            Connection not available
          </button>
        );
        break;
      case "disconnected":
        pillTone = "bg-primary/10 text-primary border-primary/30";
        pillIcon = <Plug className="h-3 w-3" />;
        pillLabel = "Live sync available";
        action = (
          <button
            type="button"
            onClick={() => void handleConnectQuickBooks()}
            disabled={qbBusy}
            className="text-[11px] px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary/10 whitespace-nowrap disabled:opacity-60"
          >
            {qbBusy ? "Opening…" : "Connect QuickBooks"}
          </button>
        );
        break;
      case "syncing":
        pillTone = "bg-primary/10 text-primary border-primary/30";
        pillIcon = <Loader2 className="h-3 w-3 animate-spin" />;
        pillLabel = "Syncing…";
        break;
      case "expired":
      case "error":
        pillTone = "bg-amber-500/10 text-amber-300 border-amber-500/40";
        pillIcon = <AlertTriangle className="h-3 w-3" />;
        pillLabel = qbStatus.state === "expired" ? "Reconnect needed" : "Sync error";
        action = (
          <button
            type="button"
            onClick={() => void handleConnectQuickBooks()}
            disabled={qbBusy}
            className="text-[11px] px-2 py-1 rounded border border-amber-500/40 text-amber-100 hover:bg-amber-500/10 whitespace-nowrap disabled:opacity-60"
          >
            <RefreshCw className="h-3 w-3 inline mr-1" /> Reconnect
          </button>
        );
        break;
      case "connected":
      default:
        pillTone = "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
        pillIcon = <CheckCircle2 className="h-3 w-3" />;
        pillLabel = "Active sync established";
        action = (
          <Link
            to="/portal/connected-sources"
            className="text-[11px] px-2 py-1 rounded border border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/10 whitespace-nowrap"
          >
            Manage
          </Link>
        );
        break;
    }
    return (
      <li
        key={m.connectorId}
        className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/40 px-2.5 py-1.5"
      >
        <div className="min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-foreground">{qbStatus.companyName ?? m.label}</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] whitespace-nowrap ${pillTone}`}>
            {pillIcon}
            {pillLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">{action}</div>
      </li>
    );
  };

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Source readiness
          </div>
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">
            Status of the systems behind these numbers. Manual entry always works — connecting just makes future tracking easier.
          </p>
        </div>
        <Link
          to="/portal/connected-sources"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline whitespace-nowrap"
        >
          Open Connected Sources <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {loading && (
        <p className="text-[11px] text-muted-foreground italic">Loading source status…</p>
      )}

      {/* Per-connector status rows */}
      {connectorRows.length > 0 && (
        <ul className="space-y-1.5">
          {connectorRows.map((m) => {
            // QuickBooks gets a live-status row sourced from qb-status.
            if (m.connectorId === "quickbooks") {
              const live = renderQuickBooksRow(m);
              if (live) return live;
            }
            const canRequest =
              m.status === "not_started" ||
              m.status === "disconnected" ||
              m.status === "error" ||
              m.status === "paused";
            const isInFlight = m.status === "requested" || m.status === "setup_in_progress";
            return (
              <li
                key={m.connectorId}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/40 px-2.5 py-1.5"
              >
                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-foreground">{m.label}</span>
                  <StatusPill
                    status={m.status}
                    hasLiveSync={m.hasLiveSync}
                    isFutureSync={isDirectSyncFuture(m.connectorId)}
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {canRequest && (
                    <button
                      type="button"
                      onClick={() => void handleRequest(m.connectorId)}
                      disabled={busyConnector === m.connectorId}
                      className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-50 whitespace-nowrap"
                    >
                      {busyConnector === m.connectorId ? "Requesting…" : "Request setup"}
                    </button>
                  )}
                  {isInFlight && (
                    <Link
                      to="/portal/connected-sources"
                      className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground whitespace-nowrap"
                    >
                      View setup status
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Imports/uploads explainer */}
      {importHints.length > 0 && (
        <div className="text-[11px] text-muted-foreground rounded-md border border-border/60 bg-card/30 px-2.5 py-1.5">
          {importHints.join(" + ")} — uploaded as a file or imported as a spreadsheet.{" "}
          <Link to="/portal/imports" className="text-primary hover:underline">
            Open Imports
          </Link>
          .
        </div>
      )}

      {/* "Other" hint */}
      {openConnectorsHints.length > 0 && (
        <div className="text-[11px] text-muted-foreground rounded-md border border-border/60 bg-card/30 px-2.5 py-1.5">
          For {openConnectorsHints.join(", ")}, browse the full catalog in{" "}
          <Link to="/portal/connected-sources" className="text-primary hover:underline">
            Connected Sources
          </Link>
          .
        </div>
      )}

      {showOtherSource && (
        <div className="rounded-md border border-border/60 bg-card/30 px-2.5 py-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] text-foreground">Other source</p>
              <p className="text-[11px] text-muted-foreground">
                Request a custom source so RGS can review whether it belongs as direct sync, setup-assisted, import, or manual only.
              </p>
            </div>
            <Link
              to="/portal/connected-sources?custom=1"
              className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 whitespace-nowrap"
            >
              Request a custom source
            </Link>
          </div>

          {customRequests.length > 0 && (
            <ul className="space-y-1.5">
              {customRequests.map((request) => {
                const ui = statusUi(request.status);
                const sourceName = request.metadata?.source_name ?? request.account_label ?? "Custom source";
                const category = request.metadata?.category;
                return (
                  <li
                    key={request.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5"
                  >
                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-foreground">{sourceName}</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] whitespace-nowrap ${ui.tone}`}>
                        {ui.label}
                      </span>
                      {category && <span className="text-[10px] text-muted-foreground">{category}</span>}
                    </div>
                    <Link
                      to="/portal/connected-sources?custom=1"
                      className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground whitespace-nowrap"
                    >
                      View request
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Missing-source gentle warnings */}
      {missingWarnings.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 space-y-0.5">
          {missingWarnings.map((w) => {
            // QuickBooks in not_configured state must NOT suggest "request setup".
            const isQbNotConfigured =
              w.label === "QuickBooks" && qbStatus?.state === "not_configured";
            const isQbDisconnected =
              w.label === "QuickBooks" && qbStatus?.state === "disconnected";
            const tail = isQbNotConfigured
              ? "Manual entry below always works."
              : isQbDisconnected
                ? "You can continue manually, or connect QuickBooks above for live sync."
                : "You can continue manually, or request setup so future tracking is easier.";
            return (
              <p key={w.label} className="text-[11px] text-amber-300/90">
                <span className="text-foreground">{w.label}</span> isn't connected yet. {tail}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
