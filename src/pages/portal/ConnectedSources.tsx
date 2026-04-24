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
import { Link } from "react-router-dom";
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
} from "lucide-react";
import {
  SOURCE_CATEGORIES,
  buildConnectorCards,
  listConnectedSourceRows,
  requestSourceConnection,
  statusUi,
  summarizeRows,
  type ConnectedSourceRow,
  type ConnectorCardModel,
} from "@/lib/integrations/connectedSources";
import type { ConnectorId } from "@/lib/integrations/planning";

export default function ConnectedSources() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConnectedSourceRow[]>([]);
  const [active, setActive] = useState<ConnectorCardModel | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");

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
      setLoading(false);
    })();
  }, [user]);

  const cards = useMemo(() => buildConnectorCards(rows), [rows]);
  const totals = useMemo(() => summarizeRows(rows), [rows]);

  const refresh = async () => {
    if (!customer) return;
    const r = await listConnectedSourceRows(customer.id);
    setRows(r);
  };

  const openRequest = (card: ConnectorCardModel) => {
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
  onRequest,
}: {
  card: ConnectorCardModel;
  onRequest: () => void;
}) {
  const ui = statusUi(card.status);
  const isConnected = ui.isTerminalGood;
  const isPending =
    card.status === "requested" || card.status === "setup_in_progress";

  // Action verb — honest about whether we have real sync or just a request flow.
  let actionLabel: string;
  let ActionIcon = Send;
  if (isConnected) {
    actionLabel = "Connected";
    ActionIcon = CheckCircle2;
  } else if (card.status === "setup_in_progress") {
    actionLabel = "Continue setup";
    ActionIcon = Wrench;
  } else if (card.status === "needs_review") {
    actionLabel = "View status";
    ActionIcon = AlertTriangle;
  } else if (card.status === "requested") {
    actionLabel = "Update request";
    ActionIcon = Sparkles;
  } else if (card.hasLiveSync) {
    actionLabel = "Request connection";
  } else {
    actionLabel = "Request setup";
  }

  return (
    <div className="p-4 rounded-md border border-border bg-card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground flex items-center gap-2">
            <Plug className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{card.label}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            {card.ownedTruthSummary}
          </p>
        </div>
        <span
          className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider ${ui.tone}`}
        >
          {ui.label}
        </span>
      </div>

      {isPending && card.requestedAt && (
        <div className="text-[10px] text-muted-foreground">
          Last update {new Date(card.requestedAt).toLocaleDateString()}
          {card.note ? ` · "${truncate(card.note, 60)}"` : ""}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto">
        <span className="text-[10px] text-muted-foreground">
          {card.hasLiveSync ? "Live sync available" : "Setup handled with RGS"}
        </span>
        <Button
          size="sm"
          variant={isConnected ? "secondary" : "default"}
          disabled={isConnected}
          onClick={onRequest}
        >
          <ActionIcon className="h-3.5 w-3.5 mr-1" /> {actionLabel}
        </Button>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}