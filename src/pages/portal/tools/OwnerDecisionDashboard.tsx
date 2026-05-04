import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, LayoutDashboard, Flag, Target, CalendarClock, Wrench, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientOwnerDecisionDashboard,
  CLIENT_ITEM_TYPE_LABEL,
  type ClientDashboardItem,
} from "@/lib/ownerDecisionDashboard";

const PRIORITY_TONE: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function fmt(s: string | null) {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export default function OwnerDecisionDashboard() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientDashboardItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientOwnerDecisionDashboard(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load decision dashboard");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  const groups = useMemo(() => {
    const all = rows ?? [];
    const needsReview = all.filter(
      (r) =>
        r.status === "review_needed" ||
        r.status === "waiting_on_owner" ||
        r.status === "needs_owner_review",
    );
    const highest = all.filter(
      (r) => r.priority_or_severity === "critical" || r.priority_or_severity === "high",
    );
    const signals = all.filter((r) => r.item_type === "revenue_risk_monitor");
    const recent = [...all]
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .slice(0, 5);
    return { needsReview, highest, signals, recent };
  }, [rows]);

  return (
    <PortalShell variant="customer">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Part of the RGS Control System™ ·{" "}
            <Link to="/portal/tools/rgs-control-system" className="text-primary hover:underline">
              Back to RGS Control System™
            </Link>
          </div>
          <h1 className="text-2xl text-foreground font-serif">Owner Decision Dashboard</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            This dashboard keeps the next important owner-level decisions visible.
            It does not mean RGS is making the decision for you or taking over
            execution. It is a review and decision-support view, not a project
            tracker, accounting / legal / compliance review, or replacement for
            owner judgment.
          </p>
        </header>

        {err && (
          <div className="border border-destructive/30 bg-destructive/10 rounded-md p-3 text-sm text-destructive">
            {err}
          </div>
        )}

        {loading || rows === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
          </div>
        ) : rows.length === 0 ? (
          <div className="border border-border bg-card rounded-xl p-6 text-center text-sm text-muted-foreground">
            No visible owner decision items yet. When RGS marks a reviewed
            decision, priority, or signal as client-visible, it will appear here.
          </div>
        ) : (
          <>
            <Section title="Needs owner review" items={groups.needsReview} />
            <Section title="Highest priority" items={groups.highest} />
            <Section title="Revenue and risk signals" items={groups.signals} />
            <Section title="Recently updated" items={groups.recent} />
          </>
        )}
      </div>
    </PortalShell>
  );
}

function Section({ title, items }: { title: string; items: ClientDashboardItem[] }) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm uppercase tracking-wider text-muted-foreground">{title}</h2>
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={`${r.item_type}-${r.item_id}`} className="border border-border bg-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base text-foreground font-medium">{r.title}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {r.priority_or_severity && (
                  <Badge
                    variant="outline"
                    className={PRIORITY_TONE[r.priority_or_severity] ?? ""}
                  >
                    <Flag className="h-3 w-3 mr-1" />
                    {fmt(r.priority_or_severity)}
                  </Badge>
                )}
                {r.status && <Badge variant="outline">{fmt(r.status)}</Badge>}
                {r.gear && <Badge variant="secondary">{fmt(r.gear)}</Badge>}
                <Badge variant="outline">{CLIENT_ITEM_TYPE_LABEL[r.item_type]}</Badge>
              </div>
            </div>

            {r.description && (
              <p className="text-sm text-foreground">{r.description}</p>
            )}

            {r.decision_question && (
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                  <Compass className="h-3 w-3" /> Decision question
                </div>
                <p className="text-sm text-foreground">{r.decision_question}</p>
              </div>
            )}

            {r.recommended_owner_review && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                  Recommended owner review
                </div>
                <p className="text-sm text-foreground">{r.recommended_owner_review}</p>
              </div>
            )}

            {r.why_it_matters && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                  Why it matters
                </div>
                <p className="text-sm text-foreground">{r.why_it_matters}</p>
              </div>
            )}

            {r.recommended_next_step && (
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> Recommended next step
                </div>
                <p className="text-sm text-foreground">{r.recommended_next_step}</p>
              </div>
            )}

            {r.success_signal && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                  <Target className="h-3 w-3" /> Success signal
                </div>
                <p className="text-sm text-foreground">{r.success_signal}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-2 border-t border-border">
              <Row label="Source" value={r.source_label ?? fmt(r.source_type)} />
              {r.due_or_decision_date && (
                <div className="text-sm flex items-center gap-1">
                  <CalendarClock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Decision needed by: </span>
                  <span className="text-foreground">
                    {new Date(r.due_or_decision_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {r.next_review_date && (
                <div className="text-sm flex items-center gap-1">
                  <CalendarClock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Next review: </span>
                  <span className="text-foreground">
                    {new Date(r.next_review_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {r.client_notes && (
              <p className="text-xs text-muted-foreground border-t border-border pt-2">
                {r.client_notes}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}