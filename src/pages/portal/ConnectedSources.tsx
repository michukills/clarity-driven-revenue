/**
 * P12.4.C / P12.4.C.2 / P12.4.C.H — Client Connected Source workspace.
 *
 * Lets a client browse the 18 systems in the catalog (Accounting,
 * Payments, CRM / Pipeline, Analytics, Payroll / Labor, Field Ops),
 * grouped by the categories they recognize, and start a request/setup
 * workflow per source. Honest about what is truly live (admin-driven
 * QuickBooks sync today) vs. requested / setup-in-progress.
 *
 * Every action records a row in `customer_integrations` so the admin
 * Diagnostic Workspace can see and act on the request.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  DomainShell,
  DomainSection,
  DomainBoundary,
} from "@/components/domains/DomainShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Plug,
  CheckCircle2,
  Send,
  Wrench,
  AlertTriangle,
  Sparkles,
  Search,
  ExternalLink,
  RefreshCw,
  Settings,
} from "lucide-react";
import {
  SOURCE_CATEGORIES,
  buildConnectorCards,
  listConnectedSourceRows,
  requestSourceConnection,
  statusUi,
  summarizeRows,
  isDirectOAuthConnector,
  getCapabilityEntry,
  isDirectSyncFuture,
  type ConnectedSourceRow,
  type ConnectorCardModel,
} from "@/lib/integrations/connectedSources";
import type { ConnectorId } from "@/lib/integrations/planning";
import {
  fetchQbStatus,
  startQbOAuth,
  triggerQbSync,
  type QbStatus,
} from "@/lib/integrations/quickbooks";

export default function ConnectedSources() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customer, setCustomer] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConnectedSourceRow[]>([]);
  const [active, setActive] = useState<ConnectorCardModel | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [qbStatus, setQbStatus] = useState<QbStatus | null>(null);
  const [qbBusy, setQbBusy] = useState<"connect" | "sync" | null>(null);

  useEffect(() => {
    void (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) {
        setLoading(false);
        return;
      }
      setCustomer({ id: data.id });
      try {
        const r = await listConnectedSourceRows(data.id);
        setRows(r);
      } catch {
        // Surface as an empty state — the page is still usable.
      }
      try {
        const s = await fetchQbStatus(data.id);
        setQbStatus(s);
      } catch {
        setQbStatus({ state: "not_configured", realmId: null, companyName: null, lastSyncAt: null, lastError: null });
      }
      setLoading(false);
    })();
  }, [user]);

  const cards = useMemo(() => buildConnectorCards(rows), [rows]);
  const totals = useMemo(() => summarizeRows(rows), [rows]);

  const refresh = async () => {
    if (!customer) return;
    const r = await listConnectedSourceRows(customer.id);
    setRows(r);
    try {
      const s = await fetchQbStatus(customer.id);
      setQbStatus(s);
    } catch { /* ignore */ }
  };

  // Handle returning from the Intuit OAuth redirect (qb=ok|error).
  useEffect(() => {
    const qb = searchParams.get("qb");
    if (!qb) return;
    if (qb === "ok") {
      toast({ title: "QuickBooks connected", description: "Active sync established." });
    } else {
      const msg = searchParams.get("msg") ?? "Could not finish QuickBooks setup.";
      toast({ title: "QuickBooks setup failed", description: msg, variant: "destructive" });
    }
    searchParams.delete("qb");
    searchParams.delete("msg");
    setSearchParams(searchParams, { replace: true });
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleQbConnect = async () => {
    if (!customer) return;
    setQbBusy("connect");
    try {
      const res = await startQbOAuth(customer.id);
      if (!res.configured || !res.authorize_url) {
        toast({
          title: "QuickBooks not configured",
          description: res.message ?? "QuickBooks connection is not configured yet.",
          variant: "destructive",
        });
        return;
      }
      window.location.href = res.authorize_url;
    } finally {
      setQbBusy(null);
    }
  };

  const handleQbSyncNow = async () => {
    if (!customer) return;
    setQbBusy("sync");
    try {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const res = await triggerQbSync({
        customerId: customer.id,
        periodStart: fmt(start),
        periodEnd: fmt(today),
      });
      if (res.ok) {
        toast({ title: "Synced", description: res.message ?? "QuickBooks data refreshed." });
        await refresh();
      } else {
        toast({ title: "Sync failed", description: res.message ?? "Could not sync QuickBooks.", variant: "destructive" });
      }
    } finally {
      setQbBusy(null);
    }
  };

  const openRequest = (card: ConnectorCardModel) => {
    // Live-now direct-OAuth connectors must never use the request modal.
    // Future-planned direct-sync connectors may use it (RGS configures manually).
    if (
      isDirectOAuthConnector(card.connectorId) &&
      !isDirectSyncFuture(card.connectorId)
    ) {
      return;
    }
    setActive(card);
    setNote(card.note ?? "");
  };

  const submitRequest = async () => {
    if (!customer || !active) return;
    setSubmitting(true);
    try {
      await requestSourceConnection({
        customerId: customer.id,
        connectorId: active.connectorId,
        note: note.trim() || undefined,
      });
      await refresh();
      toast({
        title: "Request sent",
        description: `Your RGS team will reach out about ${active.label}.`,
      });
      setActive(null);
      setNote("");
    } catch (e) {
      toast({
        title: "Couldn't send request",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="Client Workspace · Diagnostic Input"
        title="Connected Sources"
        description="Pick the systems you already use. We connect the ones that have a real sync; for everything else, sending a request brings your RGS team in to set it up with you."
        crumbs={[
          { label: "Provide Data", to: "/portal/provide-data" },
          { label: "Connected Sources" },
        ]}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/portal/provide-data">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Provide Data
            </Link>
          </Button>
        }
      >
        <DomainBoundary
          scope="Telling RGS which business systems you use, and starting the connection or setup conversation."
          outOfScope="You don't need to set up integrations yourself. Where a real connection isn't ready yet, sending a request brings your RGS team in."
        />

        <DomainSection
          title="Your sources at a glance"
          subtitle="Honest counts — Connected means a real working sync, not a request."
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryTile label="Connected" value={totals.connected} tone="ready" />
            <SummaryTile label="Requested" value={totals.requested} tone="info" />
            <SummaryTile
              label="Setup in progress"
              value={totals.setupInProgress}
              tone="warn"
            />
            <SummaryTile
              label="Needs admin review"
              value={totals.needsReview}
              tone="warn"
            />
          </div>
        </DomainSection>

        {loading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : !customer ? (
          <div className="text-xs text-muted-foreground">
            Your account isn't set up for source connections yet. Contact your
            RGS contact.
          </div>
        ) : (
          <>
            <div className="relative max-w-md">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sources (e.g. Xero, Square, Gusto)…"
                className="pl-8 h-9 text-sm"
              />
            </div>
            {(() => {
              const q = query.trim().toLowerCase();
              const sections = SOURCE_CATEGORIES.map((cat) => {
                const inCat = cards
                  .filter((c) => cat.connectorIds.includes(c.connectorId))
                  .filter(
                    (c) =>
                      !q ||
                      c.label.toLowerCase().includes(q) ||
                      c.ownedTruthSummary.toLowerCase().includes(q),
                  );
                if (inCat.length === 0) return null;
                return (
                  <DomainSection
                    key={cat.id}
                    title={cat.label}
                    subtitle={cat.description}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {inCat.map((c) => (
                        <SourceCard
                          key={c.connectorId}
                          card={c}
                          qbStatus={c.connectorId === "quickbooks" ? qbStatus : null}
                          qbBusy={c.connectorId === "quickbooks" ? qbBusy : null}
                          onQbConnect={c.connectorId === "quickbooks" ? handleQbConnect : undefined}
                          onQbSync={c.connectorId === "quickbooks" ? handleQbSyncNow : undefined}
                          onRequest={() => openRequest(c)}
                        />
                      ))}
                    </div>
                  </DomainSection>
                );
              }).filter(Boolean);
              if (sections.length === 0) {
                return (
                  <div className="p-6 rounded-md border border-dashed border-border text-center">
                    <p className="text-sm text-foreground">
                      No sources match "{query.trim()}".
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Don't see your system? Send a note to your RGS contact —
                      we can still bring its data into your diagnostic.
                    </p>
                  </div>
                );
              }
              return sections;
            })()}
          </>
        )}
      </DomainShell>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" /> Request {active?.label} setup
            </DialogTitle>
            <DialogDescription>
              We'll record this for your RGS team. Add anything they should
              know — the account holder, whether you have admin access, or
              what data matters most.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Account is in Mary's name, ask her for access. We mostly care about invoices."
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActive(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={submitRequest} disabled={submitting}>
              {submitting ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ready" | "info" | "warn";
}) {
  const cls =
    tone === "ready"
      ? "border-secondary/40 bg-secondary/5"
      : tone === "info"
        ? "border-primary/30 bg-primary/5"
        : "border-amber-500/30 bg-amber-500/5";
  return (
    <div className={`p-4 rounded-md border ${cls}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-light text-foreground">{value}</div>
    </div>
  );
}

function SourceCard({
  card,
  qbStatus,
  qbBusy,
  onQbConnect,
  onQbSync,
  onRequest,
}: {
  card: ConnectorCardModel;
  qbStatus?: QbStatus | null;
  qbBusy?: "connect" | "sync" | null;
  onQbConnect?: () => void;
  onQbSync?: () => void;
  onRequest: () => void;
}) {
  // Build a capability-driven view. QuickBooks gets the live OAuth
  // status from qb-status; everything else uses customer_integrations.
  const view = buildCardView(card, qbStatus ?? null);
  const busy = qbBusy != null && card.connectorId === "quickbooks";

  const handlePrimary = () => {
    if (view.primaryAction === "qb_connect" && onQbConnect) onQbConnect();
    else if (view.primaryAction === "qb_sync" && onQbSync) onQbSync();
    else if (view.primaryAction === "request_setup") onRequest();
  };

  return (
    <div
      className={`p-4 rounded-md border bg-card flex flex-col gap-3 min-h-[180px] ${
        view.tone === "active"
          ? "border-secondary/40"
          : view.tone === "primary"
            ? "border-primary/30"
            : view.tone === "warn"
              ? "border-amber-500/40"
              : "border-border"
      }`}
    >
      {/* Header */}
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">{card.label}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
          {card.ownedTruthSummary}
        </p>
      </div>

      {/* Status pill */}
      <div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${view.pillTone}`}
        >
          {view.statusLabel}
        </span>
      </div>

      {/* Helper text */}
      <p className="text-[11px] text-muted-foreground leading-relaxed min-h-[2.5em]">
        {view.helper}
      </p>

      {/* Primary action — full-width, bottom-aligned */}
      <div className="mt-auto flex flex-col gap-1.5">
        {view.primaryAction === "none" ? (
          <Button size="sm" variant="secondary" disabled className="w-full">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            {view.primaryLabel}
          </Button>
        ) : view.primaryAction === "manage_link" ? (
          <Button size="sm" variant="outline" asChild className="w-full">
            <Link to="/portal/connected-sources">
              <Settings className="h-3.5 w-3.5 mr-1" /> {view.primaryLabel}
            </Link>
          </Button>
        ) : view.primaryAction === "disabled" ? (
          <Button size="sm" variant="outline" disabled className="w-full">
            {view.primaryLabel}
          </Button>
        ) : (
          <Button
            size="sm"
            variant={view.primaryAction === "qb_sync" ? "outline" : "default"}
            onClick={handlePrimary}
            disabled={busy}
            className="w-full"
          >
            {busy && qbBusy === "connect" ? (
              <>Opening QuickBooks…</>
            ) : busy && qbBusy === "sync" ? (
              <><RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> Syncing…</>
            ) : (
              <>
                <view.primaryIcon className="h-3.5 w-3.5 mr-1" />
                {view.primaryLabel}
              </>
            )}
          </Button>
        )}
        {view.secondaryLabel && view.secondaryHref && (
          <Button size="sm" variant="ghost" asChild className="w-full text-[11px] h-7">
            <Link to={view.secondaryHref}>
              {view.secondaryLabel} <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Capability-driven card view model. QuickBooks gets the live OAuth
 * state from qb-status. Other connectors fall back to the user-facing
 * `customer_integrations` row status. Importantly: any "active"
 * connector (any provider) shows an active state and never offers
 * "Request setup".
 */
type PrimaryAction =
  | "qb_connect"
  | "qb_sync"
  | "request_setup"
  | "manage_link"
  | "disabled"
  | "none";

interface CardView {
  statusLabel: string;
  pillTone: string;
  helper: string;
  tone: "active" | "primary" | "warn" | "neutral";
  primaryAction: PrimaryAction;
  primaryLabel: string;
  primaryIcon: typeof Plug;
  secondaryLabel?: string;
  secondaryHref?: string;
}

function buildCardView(card: ConnectorCardModel, qb: QbStatus | null): CardView {
  const isQuickBooks = card.connectorId === "quickbooks";
  const isDirect = isDirectOAuthConnector(card.connectorId);

  // QuickBooks: live state from qb-status drives everything.
  if (isQuickBooks && qb) {
    if (qb.state === "not_configured") {
      return {
        statusLabel: "Not configured yet",
        pillTone: "bg-muted/40 text-muted-foreground border-border",
        helper: "QuickBooks connection is not configured yet. RGS will enable it for your account.",
        tone: "neutral",
        primaryAction: "disabled",
        primaryLabel: "Connection not available",
        primaryIcon: Plug,
      };
    }
    if (qb.state === "connected") {
      const last = qb.lastSyncAt ? new Date(qb.lastSyncAt).toLocaleString() : null;
      return {
        statusLabel: "Active sync established",
        pillTone: "bg-secondary/15 text-secondary border-secondary/40",
        helper: qb.companyName
          ? `Connected to ${qb.companyName}.${last ? ` Last sync ${last}.` : ""}`
          : `Connected.${last ? ` Last sync ${last}.` : ""}`,
        tone: "active",
        primaryAction: "qb_sync",
        primaryLabel: "Sync now",
        primaryIcon: RefreshCw,
        secondaryLabel: "Manage connection",
        secondaryHref: "/portal/connected-sources",
      };
    }
    if (qb.state === "syncing") {
      return {
        statusLabel: "Syncing…",
        pillTone: "bg-primary/10 text-primary border-primary/30",
        helper: "Pulling the latest QuickBooks data. This usually takes a few seconds.",
        tone: "primary",
        primaryAction: "disabled",
        primaryLabel: "Syncing…",
        primaryIcon: RefreshCw,
      };
    }
    if (qb.state === "expired" || qb.state === "error") {
      return {
        statusLabel: qb.state === "expired" ? "Reconnect needed" : "Sync error",
        pillTone: "bg-amber-500/10 text-amber-400 border-amber-500/40",
        helper: qb.lastError
          ? `Last error: ${truncate(qb.lastError, 100)}`
          : "QuickBooks needs to be reconnected to keep syncing.",
        tone: "warn",
        primaryAction: "qb_connect",
        primaryLabel: "Reconnect QuickBooks",
        primaryIcon: Plug,
      };
    }
    // disconnected, configured.
    return {
      statusLabel: "Live sync available",
      pillTone: "bg-primary/10 text-primary border-primary/30",
      helper: "Connect once and your monthly baseline / weekly check-ins prefill from QuickBooks.",
      tone: "primary",
      primaryAction: "qb_connect",
      primaryLabel: "Connect QuickBooks",
      primaryIcon: Plug,
    };
  }

  // Other connectors — capability/status based.
  const status = card.status;
  const ui = statusUi(status);
  const isActive = status === "connected" || status === "active";

  if (isActive) {
    return {
      statusLabel: "Active connection established",
      pillTone: "bg-secondary/15 text-secondary border-secondary/40",
      helper: card.requestedAt
        ? `Connected ${new Date(card.requestedAt).toLocaleDateString()}.`
        : "Connection on file with RGS.",
      tone: "active",
      primaryAction: "none",
      primaryLabel: "Connected",
      primaryIcon: CheckCircle2,
    };
  }

  if (status === "setup_in_progress") {
    return {
      statusLabel: ui.label,
      pillTone: ui.tone,
      helper: card.note ? `"${truncate(card.note, 90)}"` : "Your RGS team is setting this up.",
      tone: "warn",
      primaryAction: "manage_link",
      primaryLabel: "View status",
      primaryIcon: Wrench,
    };
  }

  if (status === "requested") {
    return {
      statusLabel: ui.label,
      pillTone: ui.tone,
      helper: card.requestedAt
        ? `Requested ${new Date(card.requestedAt).toLocaleDateString()}. RGS will follow up.`
        : "Request on file. RGS will follow up.",
      tone: "primary",
      primaryAction: "request_setup",
      primaryLabel: "Update request",
      primaryIcon: Sparkles,
    };
  }

  if (status === "needs_review") {
    return {
      statusLabel: ui.label,
      pillTone: ui.tone,
      helper: "RGS is reviewing this connection.",
      tone: "warn",
      primaryAction: "manage_link",
      primaryLabel: "View status",
      primaryIcon: AlertTriangle,
    };
  }

  // Direct-OAuth-capable connectors whose live sync isn't shipped yet
  // (P13.RCC.H.4: future-planned). Honest copy + allow Request setup so
  // RGS can configure/export manually until the OAuth ships.
  const entry = getCapabilityEntry(card.connectorId);
  if (entry?.capability === "direct_oauth_sync_future") {
    return {
      statusLabel: "Direct sync planned",
      pillTone: "bg-primary/10 text-primary border-primary/30",
      helper:
        "Direct sync isn't live yet. Request setup and your RGS team will configure it with you.",
      tone: "primary",
      primaryAction: "request_setup",
      primaryLabel: "Request setup",
      primaryIcon: Send,
    };
  }

  // Default request_setup_only path.
  return {
    statusLabel: "Setup handled with RGS",
    pillTone: "bg-muted/40 text-muted-foreground border-border",
    helper: "Send a setup request and your RGS team will handle the connection.",
    tone: "neutral",
    primaryAction: "request_setup",
    primaryLabel: "Request setup",
    primaryIcon: Send,
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}