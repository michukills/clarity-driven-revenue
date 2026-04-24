/**
 * P13.RCC.H.3 — Live QuickBooks status callout for the RCC Step 1 modal.
 *
 * Replaces the static "Connect QuickBooks" link with a live, status-aware
 * panel driven by `fetchQbStatus`. It honors every state honestly:
 *
 *   not_configured → "QuickBooks connection is not configured yet" (no CTA to fake setup)
 *   disconnected   → "Connect QuickBooks" → starts OAuth via `startQbOAuth`
 *   syncing        → "Syncing…" with disabled actions
 *   connected      → "Active sync established" + Sync now / Use synced data
 *   expired/error  → "Reconnect QuickBooks" + calm error copy
 *
 * Manual entry below this callout always remains available — nothing here
 * blocks the Continue button.
 */
import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Plug, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BRANDS } from "@/config/brands";
import {
  fetchQbStatus,
  startQbOAuth,
  triggerQbSync,
  type QbStatus,
} from "@/lib/integrations/quickbooks";

function formatTime(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

interface QbSourceCalloutProps {
  customerId: string | null;
  periodStart: string;
  periodEnd: string;
  /** Called after a successful Sync now / Use synced data so parent can refetch summary. */
  onSynced?: () => void;
}

export function QbSourceCallout({
  customerId,
  periodStart,
  periodEnd,
  onSynced,
}: QbSourceCalloutProps) {
  const [status, setStatus] = useState<QbStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"connect" | "sync" | null>(null);

  const reload = async () => {
    if (!customerId) {
      setStatus(null);
      return;
    }
    setLoading(true);
    try {
      const s = await fetchQbStatus(customerId);
      setStatus(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleConnect = async () => {
    if (!customerId) return;
    setBusy("connect");
    try {
      const res = await startQbOAuth(customerId);
      if (!res.configured || !res.authorize_url) {
        toast.info(res.message ?? `${BRANDS.quickbooks} connection is not configured yet.`);
        await reload();
        return;
      }
      window.open(res.authorize_url, "_blank", "noopener,noreferrer");
      toast.info(`Approve the connection in the ${BRANDS.quickbooks} tab, then return here and click Sync now.`);
    } catch (e: any) {
      toast.error(e?.message ?? `Could not start ${BRANDS.quickbooks} connection.`);
    } finally {
      setBusy(null);
    }
  };

  const handleSync = async () => {
    if (!customerId) return;
    setBusy("sync");
    try {
      const res = await triggerQbSync({ customerId, periodStart, periodEnd });
      if (!res.ok) {
        toast.error(res.message ?? `${BRANDS.quickbooks} sync failed.`);
      } else {
        toast.success(`${BRANDS.quickbooks} synced.`);
        onSynced?.();
      }
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? `${BRANDS.quickbooks} sync failed.`);
    } finally {
      setBusy(null);
    }
  };

  // Render one of five honest states.
  let tone = "border-border bg-muted/10";
  let pillTone = "bg-muted/40 text-muted-foreground border-border";
  let pillIcon = <Plug className="h-3 w-3" />;
  let pillLabel = `${BRANDS.quickbooks}`;
  let title = `${BRANDS.quickbooks}`;
  let description: string = `Checking ${BRANDS.quickbooks} status…`;
  let actions: JSX.Element | null = null;

  if (!customerId) {
    description =
      `Sign-in is required to connect ${BRANDS.quickbooks}. You can still continue with manual entry below.`;
  } else if (loading && !status) {
    description = `Checking ${BRANDS.quickbooks} status…`;
  } else if (status) {
    switch (status.state) {
      case "not_configured":
        pillLabel = "Not configured";
        description =
          `${BRANDS.quickbooks} connection is not configured yet. Manual entry below works in the meantime.`;
        actions = (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-[11px] text-muted-foreground opacity-60 cursor-not-allowed"
          >
            <Plug className="h-3 w-3" /> Connection not available
          </button>
        );
        break;
      case "disconnected":
        tone = "border-primary/30 bg-primary/5";
        pillTone = "bg-primary/10 text-primary border-primary/30";
        pillIcon = <Plug className="h-3 w-3" />;
        pillLabel = "Live sync available";
        description =
          `Connect ${BRANDS.quickbooks} to auto-fill revenue, expenses, and AR/AP for this period.`;
        actions = (
          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={busy === "connect"}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-primary/40 bg-primary/10 text-[11px] text-foreground hover:bg-primary/20 disabled:opacity-60"
          >
            {busy === "connect" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Opening QuickBooks…
              </>
            ) : (
              <>
                <Plug className="h-3 w-3" /> Connect QuickBooks
              </>
            )}
          </button>
        );
        break;
      case "syncing":
        tone = "border-primary/30 bg-primary/5";
        pillTone = "bg-primary/10 text-primary border-primary/30";
        pillIcon = <Loader2 className="h-3 w-3 animate-spin" />;
        pillLabel = "Syncing…";
        description = status.companyName
          ? `${status.companyName} — sync in progress.`
          : `${BRANDS.quickbooks} sync in progress.`;
        actions = (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-[11px] text-muted-foreground opacity-60 cursor-not-allowed"
          >
            <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
          </button>
        );
        break;
      case "expired":
      case "error":
        tone = "border-amber-500/30 bg-amber-500/10";
        pillTone = "bg-amber-500/10 text-amber-300 border-amber-500/40";
        pillIcon = <AlertTriangle className="h-3 w-3" />;
        pillLabel = status.state === "expired" ? "Reconnect needed" : "Sync error";
        description =
          status.lastError?.trim() ||
          (status.state === "expired"
            ? `${BRANDS.quickbooks} access expired. Reconnect to resume live sync.`
            : `Last ${BRANDS.quickbooks} sync had an issue. Reconnecting usually resolves it.`);
        actions = (
          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={busy === "connect"}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-100 hover:bg-amber-500/20 disabled:opacity-60"
          >
            <RefreshCw className="h-3 w-3" /> Reconnect QuickBooks
          </button>
        );
        break;
      case "connected":
      default: {
        tone = "border-emerald-500/30 bg-emerald-500/10";
        pillTone = "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
        pillIcon = <CheckCircle2 className="h-3 w-3" />;
        pillLabel = status.isDemo ? "Demo connection active" : "Active sync established";
        const company = status.companyName ? `${status.companyName} · ` : "";
        const syncedVerb = status.isDemo ? "Last refresh" : "Last synced";
        const synced = status.lastSyncAt
          ? `${syncedVerb} ${formatTime(status.lastSyncAt)}`
          : status.isDemo
            ? "Demo data — no live Intuit sync"
            : "Not yet synced for this period";
        description = `${company}${synced}.`;
        actions = (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={busy === "sync"}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60"
            >
              {busy === "sync" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" /> Sync now
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={busy === "sync"}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-emerald-500/40 bg-emerald-500/5 text-[11px] text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-60"
            >
              Use synced data
            </button>
          </div>
        );
        title = status.companyName ?? `${BRANDS.quickbooks}`;
        break;
      }
    }
  }

  return (
    <div className={`rounded-lg border ${tone} p-3 space-y-2`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-foreground">{title}</span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] whitespace-nowrap ${pillTone}`}
            >
              {pillIcon}
              {pillLabel}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        <div className="shrink-0">{actions}</div>
      </div>
      <p className="text-[10px] text-muted-foreground italic">
        QuickBooks is the only connector with live sync today. Manual entry below always works.
      </p>
    </div>
  );
}