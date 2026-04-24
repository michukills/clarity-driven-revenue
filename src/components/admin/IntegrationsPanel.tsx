/* P11.7 — Integrations admin panel.
 *
 * Connect / disconnect external systems (QuickBooks first), trigger
 * syncs, review staged records, and import or ignore each one. Imported
 * rows write into the trusted local tables with `source` + `source_ref`
 * preserved so BCC, cash position, profitability, and signal emitters
 * see the same lineage. Admins can also emit aggregate integration
 * signals into the learning bus on demand.
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BRANDS } from "@/config/brands";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plug, RefreshCw, PowerOff, CheckCircle2, X, AlertTriangle, Sparkles } from "lucide-react";
import {
  buildIntegrationRollup,
  connectIntegration,
  disconnectIntegration,
  ignoreExternalRecord,
  importExternalRecord,
  listExternalRecords,
  listIntegrations,
  listSyncRuns,
  providerLabel,
  recordKindLabel,
  runIntegrationSync,
  type CustomerIntegration,
  type IntegrationExternalRecord,
  type IntegrationRollup,
  type IntegrationSyncRun,
} from "@/lib/integrations/integrations";
import { emitIntegrationSignals } from "@/lib/diagnostics/integrationsSignalEmitter";

function fmtDate(v: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

function statusTone(s: string) {
  switch (s) {
    case "active":
    case "success":
    case "imported":
    case "matched":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "error":
    case "failed":
    case "conflict":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "pending":
    case "running":
    case "paused":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "ignored":
    case "disconnected":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export function IntegrationsPanel({ customerId }: { customerId: string }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [integrations, setIntegrations] = useState<CustomerIntegration[]>([]);
  const [rollup, setRollup] = useState<IntegrationRollup | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [runs, setRuns] = useState<IntegrationSyncRun[]>([]);
  const [records, setRecords] = useState<IntegrationExternalRecord[]>([]);

  const active = useMemo(
    () => integrations.find((i) => i.id === activeId) ?? null,
    [integrations, activeId],
  );

  async function refreshAll() {
    setLoading(true);
    try {
      const [list, r] = await Promise.all([
        listIntegrations(customerId),
        buildIntegrationRollup(customerId),
      ]);
      setIntegrations(list);
      setRollup(r);
      const next = activeId && list.find((i) => i.id === activeId) ? activeId : list[0]?.id ?? null;
      setActiveId(next);
      if (next) {
        const [rr, recs] = await Promise.all([
          listSyncRuns(next, 10),
          listExternalRecords(next, { limit: 100 }),
        ]);
        setRuns(rr);
        setRecords(recs);
      } else {
        setRuns([]);
        setRecords([]);
      }
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    if (!activeId) return;
    (async () => {
      try {
        const [rr, recs] = await Promise.all([
          listSyncRuns(activeId, 10),
          listExternalRecords(activeId, { limit: 100 }),
        ]);
        setRuns(rr);
        setRecords(recs);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [activeId]);

  async function handleConnectQuickBooks() {
    setBusy(true);
    try {
      await connectIntegration({
        customerId,
        provider: "quickbooks",
        accountLabel: `${BRANDS.quickbooks} Online`,
      });
      toast.success(`${BRANDS.quickbooks} connected`);
      await refreshAll();
    } catch (e) {
      toast.error((e as Error).message ?? "Connect failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    if (!active) return;
    setBusy(true);
    try {
      const res = await runIntegrationSync({ integration: active });
      toast.success(`Synced ${res.pulled} records`);
      await refreshAll();
    } catch (e) {
      toast.error((e as Error).message ?? "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!active) return;
    if (!confirm(`Disconnect ${providerLabel(active.provider)}?`)) return;
    setBusy(true);
    try {
      await disconnectIntegration(active.id);
      toast.success("Disconnected");
      await refreshAll();
    } catch (e) {
      toast.error((e as Error).message ?? "Disconnect failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(rec: IntegrationExternalRecord) {
    setBusy(true);
    try {
      await importExternalRecord(rec);
      toast.success("Imported into trusted records");
      await refreshAll();
    } catch (e) {
      toast.error((e as Error).message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleIgnore(rec: IntegrationExternalRecord) {
    setBusy(true);
    try {
      await ignoreExternalRecord(rec.id);
      toast.success("Marked ignored");
      await refreshAll();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to ignore");
    } finally {
      setBusy(false);
    }
  }

  async function handleEmitSignals() {
    setBusy(true);
    try {
      const r = await emitIntegrationSignals({ customerId });
      toast.success(r.emitted > 0 ? `Emitted ${r.emitted} signal${r.emitted === 1 ? "" : "s"}` : "No signals to emit");
    } catch (e) {
      toast.error((e as Error).message ?? "Emit failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Loading integrations…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plug className="w-4 h-4 text-primary" /> Integrations
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Connect external systems (starting with QuickBooks) to reduce manual entry. Synced
            records land in a staging area — you confirm what gets imported into trusted records.
            Lineage (source + external id) is preserved so BCC, cash position, and signal emitters
            see the same provenance.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button size="sm" variant="outline" onClick={handleEmitSignals} disabled={busy}>
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Emit signals
          </Button>
          <Button size="sm" onClick={handleConnectQuickBooks} disabled={busy}>
            <Plug className="w-3.5 h-3.5 mr-1" /> Connect QuickBooks
          </Button>
        </div>
      </div>

      {rollup && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile label="Connected" value={`${rollup.active}/${rollup.total_integrations}`} hint={`${rollup.errored} errored, ${rollup.paused} paused`} />
          <Tile label="Pending review" value={String(rollup.pending_reconcile)} hint={rollup.oldest_pending_days != null ? `oldest ${rollup.oldest_pending_days}d` : "—"} />
          <Tile label="Imported" value={String(rollup.imported_total)} hint={`${rollup.conflicts} conflicts`} />
          <Tile
            label="Data freshness"
            value={rollup.data_freshness_days == null ? "—" : `${rollup.data_freshness_days}d`}
            hint={rollup.last_successful_sync_at ? `last ok ${fmtDate(rollup.last_successful_sync_at)}` : "no successful sync yet"}
          />
        </div>
      )}

      {integrations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No integrations yet. Connect QuickBooks to begin pulling structured financial data.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last sync</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map((i) => (
                  <TableRow
                    key={i.id}
                    data-state={activeId === i.id ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => setActiveId(i.id)}
                  >
                    <TableCell className="font-medium">{providerLabel(i.provider)}</TableCell>
                    <TableCell>{i.account_label ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusTone(i.status)}>{i.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(i.last_sync_at)}
                      {i.last_sync_error && (
                        <div className="text-rose-300 flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3" /> {i.last_sync_error}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {activeId === i.id && (
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleSync(); }} disabled={busy || i.status === "disconnected"}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sync now
                          </Button>
                          {i.status !== "disconnected" && (
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDisconnect(); }} disabled={busy}>
                              <PowerOff className="w-3.5 h-3.5 mr-1" /> Disconnect
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {active && (
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Staged records</h3>
                  <span className="text-xs text-muted-foreground">{records.length} total</span>
                </div>
                {records.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center">
                    No staged records yet. Run a sync to pull data.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kind</TableHead>
                        <TableHead>Summary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => {
                        const p = r.payload as Record<string, unknown>;
                        const summary =
                          r.record_kind === "revenue" || r.record_kind === "expense"
                            ? `$${Number(p.amount ?? 0).toLocaleString()} • ${(p.client_or_job as string) ?? (p.vendor as string) ?? "—"}`
                            : r.record_kind === "invoice"
                              ? `${p.invoice_number ?? "—"} • $${Number(p.amount ?? 0).toLocaleString()}`
                              : r.record_kind === "obligation"
                                ? `${p.label ?? "—"} • $${Number(p.amount_due ?? 0).toLocaleString()} due ${p.due_date ?? "—"}`
                                : (r.external_id ?? "—");
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs">{recordKindLabel(r.record_kind)}</TableCell>
                            <TableCell className="text-sm">{summary}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusTone(r.reconcile_status)}>{r.reconcile_status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {r.reconcile_status === "pending" && (
                                <div className="flex gap-2 justify-end">
                                  <Button size="sm" variant="outline" onClick={() => handleImport(r)} disabled={busy}>
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Import
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleIgnore(r)} disabled={busy}>
                                    <X className="w-3.5 h-3.5 mr-1" /> Ignore
                                  </Button>
                                </div>
                              )}
                              {r.reconcile_status === "imported" && r.linked_local_table && (
                                <span className="text-xs text-muted-foreground">→ {r.linked_local_table}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold">Sync history</h3>
                </div>
                {runs.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center">No sync runs yet.</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {runs.map((r) => (
                      <li key={r.id} className="px-4 py-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{fmtDate(r.started_at)}</span>
                          <Badge variant="outline" className={statusTone(r.status)}>{r.status}</Badge>
                        </div>
                        <div className="mt-1 text-foreground">
                          pulled {r.records_pulled} • reconciled {r.records_reconciled} • pending {r.records_pending}
                        </div>
                        {r.error_message && (
                          <div className="mt-1 text-rose-300">{r.error_message}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}