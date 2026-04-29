/**
 * P14 — QuickBooks Sync Health (admin-only).
 *
 * Read-only summary of the QuickBooks webhook + sync queue, plus a safe
 * Demo / Sandbox Data trigger. Does not display tokens or secrets.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plug, RefreshCw, Webhook } from "lucide-react";
import { toast } from "sonner";

type Counts = {
  queued: number;
  failed: number;
  succeeded: number;
  total: number;
};
type EventRow = {
  id: string;
  realm_id: string | null;
  entity_name: string | null;
  operation: string | null;
  signature_valid: boolean;
  processing_status: string;
  created_at: string;
};
type ConnRow = {
  id: string;
  realm_id: string;
  status: string;
  last_sync_at: string | null;
};

export function QuickBooksSyncHealthPanel() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState<Counts>({ queued: 0, failed: 0, succeeded: 0, total: 0 });
  const [events, setEvents] = useState<EventRow[]>([]);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnRow[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [evRes, jobRes, connRes] = await Promise.all([
        supabase
          .from("quickbooks_webhook_events")
          .select("id, realm_id, entity_name, operation, signature_valid, processing_status, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("quickbooks_sync_jobs")
          .select("status, processed_at"),
        (supabase.from as any)("quickbooks_connection_status")
          .select("id, realm_id, status, last_sync_at")
          .order("updated_at", { ascending: false })
          .limit(5),
      ]);

      if (evRes.data) {
        setEvents(evRes.data as EventRow[]);
        setLastEventAt(evRes.data[0]?.created_at ?? null);
      }
      if (jobRes.data) {
        const rows = jobRes.data as Array<{ status: string; processed_at: string | null }>;
        const c: Counts = { queued: 0, failed: 0, succeeded: 0, total: rows.length };
        let latest: string | null = null;
        for (const r of rows) {
          if (r.status === "queued" || r.status === "running") c.queued += 1;
          else if (r.status === "failed" || r.status === "error") c.failed += 1;
          else if (r.status === "succeeded" || r.status === "success") c.succeeded += 1;
          if (r.processed_at && (!latest || r.processed_at > latest)) latest = r.processed_at;
        }
        setCounts(c);
        setLastSyncAt(latest);
      }
      if (connRes.data) setConnections(connRes.data as ConnRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runDemo() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("qb-demo-sync", { body: {} });
      if (error) throw error;
      toast.success(`Demo sync queued — ${data?.jobs_queued ?? 0} job(s)`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Demo sync failed");
    } finally {
      setRunning(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const connState =
    connections.length === 0
      ? "Not configured"
      : connections.some((c) => c.status === "active")
      ? "Connected"
      : "Disconnected";

  const env = "Sandbox"; // QUICKBOOKS_ENV is server-only; default to Sandbox label.

  return (
    <div className="mt-8 bg-card border border-border rounded-xl p-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 text-primary p-2">
          <Webhook className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h2 className="text-base text-foreground">QuickBooks Sync Health</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Live status of the QuickBooks webhook receiver and sync job queue.{" "}
            <span className="font-medium text-foreground">Demo / Sandbox Data.</span> This
            demo uses QuickBooks sandbox data to demonstrate live accounting data-sync
            capability.
          </p>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Connection" value={connState} />
            <Stat label="Environment" value={env} />
            <Stat label="Queued" value={String(counts.queued)} />
            <Stat label="Failed" value={String(counts.failed)} />
            <Stat label="Succeeded" value={String(counts.succeeded)} />
            <Stat label="Total jobs" value={String(counts.total)} />
            <Stat label="Last webhook" value={fmt(lastEventAt)} />
            <Stat label="Last successful sync" value={fmt(lastSyncAt)} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={runDemo} disabled={running} className="bg-primary hover:bg-secondary">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              {running ? "Queuing demo…" : "Run Demo Sync"}
            </Button>
            <Button onClick={refresh} disabled={refreshing} variant="outline">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh QuickBooks Data
            </Button>
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Latest webhook events
            </div>
            {loading ? (
              <div className="text-xs text-muted-foreground">Loading…</div>
            ) : events.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No events received yet. Once Intuit posts to the webhook URL, entries will
                appear here.
              </div>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 border-b border-border/40 pb-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono " +
                          (e.signature_valid
                            ? "bg-primary/10 text-primary"
                            : "bg-destructive/10 text-destructive")
                        }
                      >
                        {e.signature_valid ? "verified" : "invalid"}
                      </span>
                      <span className="text-foreground">{e.entity_name ?? "—"}</span>
                      <span className="text-muted-foreground">{e.operation ?? "—"}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {e.realm_id ?? "—"}
                      </span>
                    </div>
                    <span className="text-muted-foreground">{fmt(e.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-5 text-[11px] text-muted-foreground">
            Webhook tokens and OAuth credentials are stored server-side only. They are never
            shown in the admin UI or sent to the browser.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground truncate">{value}</div>
    </div>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}
