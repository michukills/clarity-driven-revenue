import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, CalendarCheck, CalendarClock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientMonthlySystemReviewEntries,
  MSR_SIGNAL_LABEL,
  type ClientMonthlySystemReviewEntry,
  type MsrOverallSignal,
} from "@/lib/monthlySystemReview";

const SIGNAL_TONE: Record<MsrOverallSignal, string> = {
  improving: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  holding_steady: "bg-primary/15 text-primary border-primary/30",
  needs_attention: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  slipping: "bg-destructive/15 text-destructive border-destructive/40",
  unknown: "",
};

function signalIcon(s: MsrOverallSignal) {
  if (s === "improving") return <TrendingUp className="h-3 w-3 mr-1" />;
  if (s === "slipping") return <TrendingDown className="h-3 w-3 mr-1" />;
  return <Minus className="h-3 w-3 mr-1" />;
}

function fmtPeriod(e: ClientMonthlySystemReviewEntry): string | null {
  if (e.review_period_label) return e.review_period_label;
  if (e.review_period_start && e.review_period_end) {
    return `${new Date(e.review_period_start).toLocaleDateString()} – ${new Date(e.review_period_end).toLocaleDateString()}`;
  }
  if (e.review_period_end) return new Date(e.review_period_end).toLocaleDateString();
  return null;
}

export default function MonthlySystemReview() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientMonthlySystemReviewEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientMonthlySystemReviewEntries(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load monthly system review");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  return (
    <PortalShell variant="customer">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarCheck className="h-3.5 w-3.5" />
            Part of the RGS Control System™ ·{" "}
            <Link to="/portal/tools/rgs-control-system" className="text-primary hover:underline">
              Back to RGS Control System™
            </Link>
          </div>
          <h1 className="text-2xl text-foreground font-serif">Monthly System Review</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Each month, RGS prepares a calm, plain-language review of what changed,
            what signals are worth your attention, where score and trend are moving,
            which priority actions are active, and what to review next. This is a
            bounded review and visibility tool. It does not replace owner judgment
            and does not substitute for accounting, legal, tax, compliance, payroll,
            or HR review.
          </p>
        </header>

        {err && (
          <div className="border border-destructive/30 bg-destructive/10 rounded-md p-3 text-sm text-destructive">
            {err}
          </div>
        )}

        {loading || rows === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading monthly system review…
          </div>
        ) : rows.length === 0 ? (
          <div className="border border-border bg-card rounded-xl p-6 text-center text-sm text-muted-foreground">
            No monthly system review has been shared yet. When RGS shares a review,
            it will appear here.
          </div>
        ) : (
          <ul className="space-y-4">
            {rows.map(r => (
              <li key={r.id} className="border border-border bg-card rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg text-foreground font-serif">{r.title}</h2>
                    {fmtPeriod(r) && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Review period: {fmtPeriod(r)}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className={SIGNAL_TONE[r.overall_signal]}>
                    {signalIcon(r.overall_signal)}
                    {MSR_SIGNAL_LABEL[r.overall_signal]}
                  </Badge>
                </div>

                {r.client_visible_summary && (
                  <p className="text-sm text-foreground border-t border-border pt-3">
                    {r.client_visible_summary}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Section title="What changed this month" body={r.what_changed_summary} />
                  <Section title="Signals worth reviewing" body={r.signals_summary} />
                  <Section title="Score and trend movement" body={r.score_trend_summary} />
                  <Section title="Active priority actions" body={r.priority_actions_summary} />
                  <Section title="Owner decisions to review" body={r.owner_decisions_summary} />
                  <Section title="What RGS reviewed" body={r.rgs_reviewed_summary} />
                  <Section title="What to review next" body={r.next_review_summary} className="sm:col-span-2" />
                </div>

                {r.next_review_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t border-border">
                    <CalendarClock className="h-3 w-3" />
                    <span>Next review: </span>
                    <span className="text-foreground">{new Date(r.next_review_date).toLocaleDateString()}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PortalShell>
  );
}

function Section({ title, body, className = "" }: { title: string; body: string | null; className?: string }) {
  if (!body) return null;
  return (
    <div className={`rounded-md border border-border bg-muted/10 p-3 ${className}`}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      <p className="text-sm text-foreground whitespace-pre-line">{body}</p>
    </div>
  );
}
