import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { ToolWalkthroughCard } from "@/components/portal/ToolWalkthroughCard";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { CalendarClock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PremiumToolHeader } from "@/components/tools/PremiumToolHeader";
import { RcsScopeBanner } from "@/components/tools/RcsScopeBanner";
import {
  ToolGuidancePanel,
  ToolEmptyState,
  ToolLoadingState,
  ToolErrorState,
} from "@/components/tools/ToolGuidancePanel";
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
        <PremiumToolHeader
          toolName="Monthly System Review"
          lane="RGS Control System"
          purpose="A monthly read on what improved, what slipped, which signals deserve attention, and what to review next. Bounded interpretation only — not a substitute for accounting, legal, tax, compliance, payroll, or HR review."
          backTo="/portal/tools/rgs-control-system"
          backLabel="Back to RGS Control System™"
        />

        <RcsScopeBanner
          included="reviewed monthly read on pillar trends, what changed, the priorities to focus on next, and the next review date."
        />

        <ToolWalkthroughCard toolKey="monthly_system_review" />

        <ToolGuidancePanel
          purpose="Each month RGS reviews trends across the pillars and shares a plain-language read with priorities and the next review focus."
          prepare={[
            "5 quiet minutes to read the most recent review end-to-end",
            "Note any change you already know about (a new hire, a price change, a lost client) so RGS does not chase a false signal",
          ]}
          goodSubmission={[
            "You understand which pillars improved and which slipped",
            "You know the one or two priorities that matter most before next review",
          ]}
          whatHappensNext="RGS keeps trends, monthly signals, and any decisions you flag attached to your account so the next review continues the thread."
          reviewedBy="Prepared and approved by your RGS team before it appears here."
          outOfScope="Visibility and bounded interpretation only — not a substitute for owner judgment and not RGS operating the business."
        />

        {err && <ToolErrorState message={err} />}

        {loading || rows === null ? (
          <ToolLoadingState label="Loading the most recent monthly review…" />
        ) : rows.length === 0 ? (
          <ToolEmptyState
            title="No monthly system review has been shared yet."
            body="Reviews appear here after RGS prepares and approves them. Nothing is required from you in the meantime."
            responsibility="rgs"
          />
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
