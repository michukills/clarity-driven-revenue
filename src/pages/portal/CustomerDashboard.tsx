import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { isClientVisible } from "@/lib/visibility";
import { isImplementationStage, stageLabel, formatDate, canonicalToolDisplayTitle } from "@/lib/portal";
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Lock,
  Target,
  AlertTriangle,
  Wrench,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Circle,
  Flame,
  Activity,
  CalendarCheck2,
  FileText,
  Radar,
  ListChecks,
} from "lucide-react";
import { pillars as scorecardPillars } from "@/components/scorecard/scorecardData";
import { loadIntakeAnswers, buildIntakeProgress, type IntakeStatus } from "@/lib/diagnostics/intake";
import { useRccAccess } from "@/lib/access/useRccAccess";
import { CLIENT_SAFE_REPORT_SELECT } from "@/lib/reports/clientSafeReportFields";
import { loadToolActivity } from "@/lib/toolMatrixActivity";
import { toolByKey, type OverdueState } from "@/lib/toolMatrix";
import { ClientImpactCard } from "@/components/impact/ClientImpactCard";
import { OperatingCompanion } from "@/components/portal/OperatingCompanion";

type Pillar = { id: string; title: string; pct: number; status: "Critical" | "Needs Work" | "Strong" };

const pillarStatus = (pct: number): Pillar["status"] => {
  if (pct < 40) return "Critical";
  if (pct < 70) return "Needs Work";
  return "Strong";
};

const statusStyle = (s: Pillar["status"]) => {
  switch (s) {
    case "Critical":
      return { dot: "bg-[hsl(0_70%_55%)]", text: "text-[hsl(0_70%_70%)]", chip: "bg-[hsl(0_70%_55%/0.12)] border-[hsl(0_70%_55%/0.3)]" };
    case "Needs Work":
      return { dot: "bg-[hsl(38_90%_55%)]", text: "text-[hsl(38_90%_70%)]", chip: "bg-[hsl(38_90%_55%/0.12)] border-[hsl(38_90%_55%/0.3)]" };
    default:
      return { dot: "bg-[hsl(140_50%_55%)]", text: "text-[hsl(140_50%_70%)]", chip: "bg-[hsl(140_50%_55%/0.12)] border-[hsl(140_50%_55%/0.3)]" };
  }
};

const PRIORITY_OUTCOMES: Record<string, { problem: string; outcome: string }> = {
  demand: {
    problem: "Lead flow is unpredictable, so revenue swings month to month.",
    outcome: "Steady, predictable lead flow you can plan around.",
  },
  conversion: {
    problem: "Too many leads slip through the cracks before they buy.",
    outcome: "Higher close rate from the leads you already have.",
  },
  operations: {
    problem: "Day-to-day work depends on heroics instead of a system.",
    outcome: "Operations that run smoothly without you firefighting.",
  },
  financial: {
    problem: "Limited visibility into cash and margin makes decisions risky.",
    outcome: "Clear numbers so every decision is grounded in reality.",
  },
  independence: {
    problem: "The business still leans heavily on you to function.",
    outcome: "A business that runs without your daily involvement.",
  },
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { customerId: portalCustomerId, loading: portalCustomerLoading, isPreview } = usePortalCustomerId();
  const { hasAccess: hasRccAccess } = useRccAccess();
  const [customer, setCustomer] = useState<any>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [latestReport, setLatestReport] = useState<any>(null);
  const [latestCheckin, setLatestCheckin] = useState<any>(null);
  const [openTasks, setOpenTasks] = useState<any[]>([]);
  const [recentTimeline, setRecentTimeline] = useState<any[]>([]);
  const [lastToolActivityAt, setLastToolActivityAt] = useState<string | null>(null);
  const [intakeStatus, setIntakeStatus] = useState<IntakeStatus | null>(null);
  const [matrixActivity, setMatrixActivity] = useState<
    Map<string, { lastActivityAt: string | null; overdue: OverdueState }>
  >(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      if (portalCustomerLoading) return;
      if (!portalCustomerId) {
        setCustomer(null);
        setLoading(false);
        return;
      }
      const { data: c } = await supabase
        .from("customers")
        .select("*")
        .eq("id", portalCustomerId)
        .maybeSingle();
      setCustomer(c);
      if (c) {
        const [
          { data: r },
          { data: chk },
          { data: runs },
          { data: rep },
          { data: wc },
          { data: tasks },
          { data: tl },
        ] = await Promise.all([
          supabase
            .from("resource_assignments")
            .select("visibility_override, resources(*)")
            .eq("customer_id", c.id),
          supabase
            .from("checklist_items")
            .select("*")
            .eq("customer_id", c.id)
            .order("position"),
          supabase
            .from("tool_runs")
            .select("id, title, summary, data, updated_at, created_at")
            .eq("customer_id", c.id)
            .eq("tool_key", "rgs_stability_scorecard")
            .order("updated_at", { ascending: false }),
          supabase
            .from("business_control_reports")
            // P34: client-safe column allowlist — exclude internal_notes.
            .select(CLIENT_SAFE_REPORT_SELECT)
            .eq("customer_id", c.id)
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(1),
          supabase
            .from("weekly_checkins")
            .select("id, week_start, week_end, cash_concern_level, request_rgs_review, repeated_issue, process_blocker, people_blocker, sales_blocker, cash_blocker, owner_bottleneck, updated_at")
            .eq("customer_id", c.id)
            .order("week_end", { ascending: false })
            .limit(1),
          supabase
            .from("customer_tasks")
            .select("id, title, description, due_date, status, created_at")
            .eq("customer_id", c.id)
            .neq("status", "done")
            .order("due_date", { ascending: true, nullsFirst: false })
            .limit(5),
          supabase
            .from("customer_timeline")
            .select("id, event_type, title, detail, created_at")
            .eq("customer_id", c.id)
            .order("created_at", { ascending: false })
            .limit(6),
        ]);
        // Most recent tool_run timestamp (any tool, any title) — used to detect tool inactivity.
        const { data: lastRun } = await supabase
          .from("tool_runs")
          .select("updated_at")
          .eq("customer_id", c.id)
          .order("updated_at", { ascending: false })
          .limit(1);
        setLastToolActivityAt((lastRun && lastRun[0]?.updated_at) || null);
        // P6.2b — Tool Operating Matrix activity (used to surface overdue
        // priorities for Implementation Tracker, Weekly Alignment,
        // Reports & Reviews, etc.).
        try {
          const idx = await loadToolActivity([c.id]);
          const perTool = idx.get(c.id) || new Map();
          const flat = new Map<string, { lastActivityAt: string | null; overdue: OverdueState }>();
          for (const [k, v] of perTool.entries()) {
            flat.set(k, { lastActivityAt: v.lastActivityAt, overdue: v.overdue });
          }
          setMatrixActivity(flat);
        } catch {
          setMatrixActivity(new Map());
        }
        // Diagnostic intake progress (only meaningful in diagnostic stages, but always safe to load)
        try {
          const answers = await loadIntakeAnswers(c.id);
          setIntakeStatus(buildIntakeProgress(answers).status);
        } catch {
          setIntakeStatus(null);
        }
        const visible = (r ?? [])
          .filter((x: any) => x.resources && isClientVisible(x.visibility_override || x.resources.visibility))
          .map((x: any) => x.resources);
        setTools(visible);
        setChecklist(chk || []);
        setBenchmarks(runs || []);
        setLatestReport((rep && rep[0]) || null);
        setLatestCheckin((wc && wc[0]) || null);
        setOpenTasks(tasks || []);
        setRecentTimeline(tl || []);
      }
      setLoading(false);
    })();
  }, [user, portalCustomerId, portalCustomerLoading]);

  const isImpl = customer && (customer.portal_unlocked || isImplementationStage(customer.stage));

  // Latest benchmark + previous
  const latest = benchmarks[0];
  const previous = benchmarks[1];

  const pillarsView: Pillar[] = useMemo(() => {
    if (!latest?.data?.answers) return [];
    return scorecardPillars.map((p) => {
      const vals: number[] = latest.data.answers[p.id] || [];
      const raw = vals.reduce((s, v) => s + (v >= 0 ? v : 0), 0);
      const pct = Math.round((raw / 200) * 100);
      return { id: p.id, title: p.title, pct, status: pillarStatus(pct) };
    });
  }, [latest]);

  const totalScore = latest?.summary?.total ?? 0;
  const previousScore = previous?.summary?.total ?? null;
  const scoreDelta = previousScore !== null ? totalScore - previousScore : null;

  const sortedByWeakness = [...pillarsView].sort((a, b) => a.pct - b.pct);
  const biggestProblem = sortedByWeakness[0];
  const topPriorities = sortedByWeakness.slice(0, 3);

  const completedItems = checklist.filter((c) => c.completed);
  const activeItems = checklist.filter((c) => !c.completed).slice(0, 3);
  const recentlyDone = [...completedItems]
    .sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime())
    .slice(0, 3);

  if (loading) {
    return (
      <PortalShell variant="customer">
        <div className="text-muted-foreground">Loading…</div>
      </PortalShell>
    );
  }

  if (!customer) {
    return (
      <PortalShell variant="customer">
        <Welcome name={user?.email} />
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Your account is set up. Your RGS team will activate your workspace shortly.
          </p>
        </div>
      </PortalShell>
    );
  }

  // Diagnostic-only / pre-implementation
  if (!isImpl) {
    return (
      <PortalShell variant="customer">
        <Welcome name={customer.full_name} business={customer.business_name} />
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Where you are</div>
          <div className="text-xl text-foreground">{stageLabel(customer.stage)}</div>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl leading-relaxed">
            {customer.next_action ||
              "Your engagement is in motion. The full workspace becomes available once the implementation phase begins."}
          </p>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell variant="customer">
      <Welcome name={customer.full_name} business={customer.business_name} />

      {/* P11.12 — Operating Companion: This Week / This Month / What Changed / Attention Needed */}
      <OperatingCompanion customerId={customer.id} />

      {/* P5 Pass B — Client Command Center foundation
          High-signal snapshot built from existing data only.
          Sits above the deeper benchmark/work sections below. */}
      <CommandCenter
        customer={customer}
        latestReport={latestReport}
        latestCheckin={latestCheckin}
        openTasks={openTasks}
        recentTimeline={recentTimeline}
        toolsCount={tools.length}
        lastToolActivityAt={lastToolActivityAt}
        intakeStatus={intakeStatus}
        hasRccAccess={hasRccAccess}
        matrixActivity={matrixActivity}
      />

      {/* P9.0 — RGS Impact Ledger™ (only renders if there are client-visible entries) */}
      <div className="mt-6">
        <ClientImpactCard customerId={customer.id} />
      </div>

      {/* 1 — Business Health Overview */}
      <Section
        eyebrow="Business Health"
        title="Where your business stands today"
        subtitle="A single view of how stable each part of your business is right now."
      >
        {!latest ? (
          <EmptyState
            icon={TrendingUp}
            text="Your first benchmark hasn't been completed yet. Once your RGS team runs it, your scores will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                Overall score
              </div>
              <div className="flex items-baseline gap-2">
                <div className="font-display text-5xl text-foreground tabular-nums leading-none">{totalScore}</div>
                <div className="text-sm text-muted-foreground">/ 1000</div>
                {scoreDelta !== null && (
                  <span
                    className={`ml-3 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      scoreDelta >= 0
                        ? "bg-[hsl(140_50%_55%/0.15)] text-[hsl(140_50%_70%)]"
                        : "bg-[hsl(0_70%_55%/0.15)] text-[hsl(0_70%_70%)]"
                    }`}
                  >
                    {scoreDelta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {scoreDelta >= 0 ? "+" : ""}{scoreDelta}
                  </span>
                )}
              </div>
              <div className="mt-3 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (totalScore / 1000) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Typical business: 450–600 · High-performing: 750+
              </p>

              <div className="mt-5 space-y-2.5">
                {pillarsView.map((p) => {
                  const s = statusStyle(p.status);
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                      <span className="text-sm text-foreground flex-1">{p.title}</span>
                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{p.pct}%</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${s.chip} ${s.text} w-[88px] text-center`}>
                        {p.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <CalloutCard
                icon={Flame}
                eyebrow="Biggest Problem"
                title={biggestProblem?.title ?? "—"}
                body={biggestProblem ? PRIORITY_OUTCOMES[biggestProblem.id]?.problem ?? "" : ""}
                tone="critical"
              />
              <CalloutCard
                icon={Target}
                eyebrow="Current Focus"
                title={customer.next_action || (biggestProblem ? `Stabilize ${biggestProblem.title}` : "Awaiting next step")}
                body="What your RGS team is actively moving forward this week."
                tone="primary"
              />
              <CalloutCard
                icon={ArrowRight}
                eyebrow="Next Step"
                title={activeItems[0]?.title || "We'll let you know when the next step is ready."}
                body={activeItems[0]?.description || "No action needed from you right now."}
                tone="neutral"
              />
            </div>
          </div>
        )}
      </Section>

      {/* 2 — Top Priorities */}
      {latest && topPriorities.length > 0 && (
        <Section
          eyebrow="Top Priorities"
          title="The 3 things that will move the needle"
          subtitle="Ranked by impact. Fixing these first creates the biggest lift."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPriorities.map((p, i) => {
              const meta = PRIORITY_OUTCOMES[p.id];
              const s = statusStyle(p.status);
              return (
                <div key={p.id} className="bg-card border border-border rounded-xl p-5 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="h-7 w-7 rounded-full bg-primary/15 text-primary text-sm flex items-center justify-center tabular-nums">
                      {i + 1}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${s.chip} ${s.text}`}>{p.status}</span>
                  </div>
                  <h4 className="text-base text-foreground">{p.title}</h4>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{meta?.problem}</p>
                  <div className="mt-auto pt-4 border-t border-border/60">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Expected outcome</div>
                    <p className="text-xs text-foreground/90 leading-relaxed">{meta?.outcome}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* 3 — What's Holding You Back */}
      {latest && (
        <Section
          eyebrow="What's Holding You Back"
          title="The friction points slowing growth"
          subtitle="In plain language — what's getting in the way today."
        >
          <div className="bg-card border border-border rounded-xl p-6">
            <ul className="space-y-3">
              {sortedByWeakness
                .filter((p) => p.status !== "Strong")
                .slice(0, 4)
                .map((p) => (
                  <li key={p.id} className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-[hsl(38_90%_60%)] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-foreground">{p.title}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {PRIORITY_OUTCOMES[p.id]?.problem}
                      </div>
                    </div>
                  </li>
                ))}
              {sortedByWeakness.every((p) => p.status === "Strong") && (
                <li className="text-sm text-muted-foreground">No major blockers right now — focus is on momentum.</li>
              )}
            </ul>
          </div>
        </Section>
      )}

      {/* 4 — What We're Fixing */}
      <Section
        eyebrow="What We're Fixing"
        title="Active work in motion"
        subtitle="What's underway, what just shipped, and what's coming next."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="h-4 w-4 text-primary" />
              <h4 className="text-sm text-foreground">In progress</h4>
            </div>
            {activeItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing actively in motion this week.</p>
            ) : (
              <ul className="space-y-3">
                {activeItems.map((it) => (
                  <li key={it.id} className="flex items-start gap-3">
                    <Circle className="h-3.5 w-3.5 text-muted-foreground mt-1" />
                    <div>
                      <div className="text-sm text-foreground">{it.title}</div>
                      {it.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{it.description}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="text-sm text-foreground">Recently completed</h4>
            </div>
            {recentlyDone.length === 0 ? (
              <p className="text-sm text-muted-foreground">Updates will appear here as work is completed.</p>
            ) : (
              <ul className="space-y-3">
                {recentlyDone.map((it) => (
                  <li key={it.id} className="flex items-start gap-3">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5" />
                    <div>
                      <div className="text-sm text-foreground">{it.title}</div>
                      {it.completed_at && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Completed {formatDate(it.completed_at)}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      {/* 5 — Progress Tracker */}
      <Section
        eyebrow="Progress Tracker"
        title="How far you've come"
        subtitle="Compare where you are now to where you started."
      >
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Legacy scorecard · numeric benchmarks
          </div>
          {benchmarks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your first benchmark hasn't been recorded yet. Once it is, you'll see your progress here.
            </p>
          ) : benchmarks.length === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BenchmarkCard label="Current Benchmark" date={latest.updated_at} score={totalScore} highlight />
              <div className="rounded-lg border border-dashed border-border p-5 flex items-center justify-center text-center">
                <p className="text-xs text-muted-foreground">
                  We need at least one more benchmark to show your improvement over time.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BenchmarkCard label="Previous Benchmark" date={previous.updated_at} score={previousScore!} />
                <BenchmarkCard label="Current Benchmark" date={latest.updated_at} score={totalScore} highlight />
                <div className="rounded-lg bg-primary/10 border border-primary/30 p-5 flex flex-col items-center justify-center text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Improvement</div>
                  <div
                    className={`font-display text-3xl tabular-nums mt-1 ${
                      (scoreDelta ?? 0) >= 0 ? "text-[hsl(140_50%_70%)]" : "text-[hsl(0_70%_70%)]"
                    }`}
                  >
                    {(scoreDelta ?? 0) >= 0 ? "+" : ""}
                    {scoreDelta}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">points since last benchmark</div>
                </div>
              </div>

              {benchmarks.length > 2 && (
                <div className="mt-6 pt-5 border-t border-border/60">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">History</div>
                  <ul className="space-y-1.5">
                    {benchmarks.slice(0, 6).map((b) => (
                      <li key={b.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{formatDate(b.updated_at)}</span>
                        <span className="text-foreground tabular-nums">{b.summary?.total ?? 0} / 1000</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      {/* 6 — Assigned Tools */}
      {tools.length > 0 && (
        <Section
          eyebrow="Your Toolbox"
          title="Tools active in your engagement"
          subtitle="Each tool here was activated by your RGS team for a specific purpose. Open the My Tools view for the full set."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.slice(0, 6).map((t) => (
              <Link
                key={t.id}
                to="/portal/tools"
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors flex flex-col cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-2">Active</div>
                <div className="text-sm text-foreground">{canonicalToolDisplayTitle(t.title)}</div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{t.description || "—"}</p>
                <div className="mt-auto pt-3 text-[10px] uppercase tracking-[0.14em] text-primary/70">
                  <span className="hidden sm:inline">Open in My Tools →</span>
                  <span className="sm:hidden">Open →</span>
                </div>
              </Link>
            ))}
          </div>
          {tools.length > 6 && (
            <Link to="/portal/tools" className="inline-block mt-4 text-xs text-primary hover:text-secondary">
              View all {tools.length} tools →
            </Link>
          )}
        </Section>
      )}
    </PortalShell>
  );
}

/* ───────────── helpers ───────────── */

const Welcome = ({ name, business }: { name?: string | null; business?: string | null }) => (
  <div className="mb-10">
    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Welcome back</div>
    <h1 className="mt-2 text-3xl text-foreground">{name || "Client"}</h1>
    {business && <p className="text-muted-foreground mt-1">{business}</p>}
  </div>
);

const Section = ({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <section className="mb-10">
    <div className="mb-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-primary">{eyebrow}</div>
      <h2 className="mt-1 text-xl text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const CalloutCard = ({
  icon: Icon,
  eyebrow,
  title,
  body,
  tone,
}: {
  icon: any;
  eyebrow: string;
  title: string;
  body: string;
  tone: "critical" | "primary" | "neutral";
}) => {
  const toneCls =
    tone === "critical"
      ? "border-[hsl(0_70%_55%/0.3)] bg-[hsl(0_70%_55%/0.06)]"
      : tone === "primary"
        ? "border-primary/30 bg-primary/[0.06]"
        : "border-border bg-card";
  const iconCls =
    tone === "critical" ? "text-[hsl(0_70%_70%)]" : tone === "primary" ? "text-primary" : "text-muted-foreground";
  return (
    <div className={`rounded-xl border p-5 ${toneCls}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${iconCls}`} />
        {eyebrow}
      </div>
      <div className="text-sm text-foreground mt-2">{title}</div>
      {body && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{body}</p>}
    </div>
  );
};

const BenchmarkCard = ({
  label,
  date,
  score,
  highlight,
}: {
  label: string;
  date: string;
  score: number;
  highlight?: boolean;
}) => (
  <div
    className={`rounded-lg p-5 border ${
      highlight ? "border-primary/40 bg-primary/[0.06]" : "border-border bg-muted/20"
    }`}
  >
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="font-display text-3xl text-foreground tabular-nums mt-1">{score}</div>
    <div className="text-[10px] text-muted-foreground mt-0.5">/ 1000 · {formatDate(date)}</div>
  </div>
);

const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
    <Icon className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
    <p className="text-sm text-muted-foreground max-w-md mx-auto">{text}</p>
  </div>
);

/* ============================================================================
   P5 Pass B — Client Command Center

   A read-only, client-safe overview composed from existing data:
     - latest published business_control_report
     - latest weekly_checkin
     - open customer_tasks
     - recent customer_timeline (filtered to client-safe events)
     - assigned tool count
     - customer.monitoring_status / monitoring_tier / next_action

   No internal/admin notes are surfaced. No backend terms.
   ========================================================================== */

type HealthStatus = "Stable" | "Watch" | "Needs Attention" | "Critical";

function statusFromScore(score: number | null | undefined): HealthStatus {
  if (score == null) return "Watch";
  if (score >= 75) return "Stable";
  if (score >= 55) return "Watch";
  if (score >= 35) return "Needs Attention";
  return "Critical";
}

function statusTone(s: HealthStatus) {
  switch (s) {
    case "Stable":
      return { chip: "bg-[hsl(140_50%_55%/0.12)] border-[hsl(140_50%_55%/0.3)] text-[hsl(140_50%_72%)]", dot: "bg-[hsl(140_50%_55%)]" };
    case "Watch":
      return { chip: "bg-[hsl(38_90%_55%/0.12)] border-[hsl(38_90%_55%/0.3)] text-[hsl(38_90%_72%)]", dot: "bg-[hsl(38_90%_55%)]" };
    case "Needs Attention":
      return { chip: "bg-[hsl(20_85%_55%/0.12)] border-[hsl(20_85%_55%/0.35)] text-[hsl(20_85%_72%)]", dot: "bg-[hsl(20_85%_55%)]" };
    case "Critical":
      return { chip: "bg-[hsl(0_70%_55%/0.14)] border-[hsl(0_70%_55%/0.35)] text-[hsl(0_70%_72%)]", dot: "bg-[hsl(0_70%_55%)]" };
  }
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

interface Priority {
  title: string;
  why: string;
  action: string;
  href: string;
  cta: string;
  severity: "critical" | "warn" | "watch";
}

function buildPriorities(args: {
  latestReport: any;
  latestCheckin: any;
  openTasks: any[];
  customer: any;
  toolsCount?: number;
  hasRecentToolActivity?: boolean;
  intakeStatus?: "missing" | "partial" | "complete" | null;
  // P6.1 — when false, RCC-targeted priorities are dropped or redirected
  // (Revenue Control Center™ is an add-on, not a diagnostic deliverable).
  hasRccAccess?: boolean;
  // P6.2b — per-tool overdue activity from Tool Operating Matrix.
  matrixActivity?: Map<string, { lastActivityAt: string | null; overdue: OverdueState }>;
  // P6.2b — true if this customer has an active monitoring engagement.
  monitoringActive?: boolean;
}): Priority[] {
  const {
    latestReport,
    latestCheckin,
    openTasks,
    customer,
    toolsCount = 0,
    hasRecentToolActivity = true,
    intakeStatus = null,
    hasRccAccess = false,
    matrixActivity,
    monitoringActive = false,
  } = args;
  const out: Priority[] = [];

  // 0. Diagnostic intake — surfaced first if client is in a diagnostic stage and intake isn't complete
  const inDiagnosticStage =
    customer?.stage === "diagnostic_paid" ||
    customer?.stage === "diagnostic_in_progress" ||
    customer?.stage === "diagnostic_delivered" ||
    customer?.stage === "decision_pending";
  if (inDiagnosticStage && intakeStatus && intakeStatus !== "complete") {
    out.push({
      title: "Complete Diagnostic Intake",
      why:
        intakeStatus === "missing"
          ? "Your RGS Diagnostic intake hasn't been started yet."
          : "A few intake sections are still missing.",
      action: "Take 20–30 minutes to walk through the guided intake — you can save as you go.",
      href: "/portal/diagnostics",
      cta: "Open Diagnostic Intake",
      severity: "warn",
    });
  }

  /* Primary next-action priority (Pass C):
   *   1. Complete overdue weekly check-in
   *   2. Review latest published report (recent, unread context)
   *   3. Complete overdue task
   *   4. Respond to RGS review request
   *   5. Open Revenue Control Center™ if cash/revenue signal active
   *   6. Open assigned tool if no recent tool activity
   *   7. Otherwise: reassuring message (handled at render via empty state)
   */

  // 1. Overdue weekly check-in
  const checkinAge = daysSince(latestCheckin?.week_end);
  // P6.1 — weekly check-in lives inside Revenue Control Center™, so this
  // priority only applies when the client actually has RCC access.
  if (hasRccAccess && (checkinAge == null || checkinAge > 10)) {
    out.push({
      title: "Complete your weekly check-in",
      why:
        checkinAge == null
          ? "We don't have a weekly check-in on file yet."
          : `It's been ${checkinAge} days since your last check-in.`,
      action: "A 5-minute check-in keeps your Revenue Control Center™ insights accurate.",
      href: "/portal/business-control-center",
      cta: "Complete check-in",
      severity: "warn",
    });
  }

  // 2. Review latest published report — only if it's recent (≤30d) and there's a recommended step
  const reportAge = daysSince(latestReport?.published_at || latestReport?.updated_at);
  if (latestReport && reportAge != null && reportAge <= 30 && out.length < 3) {
    const nextStep: string | null =
      latestReport?.report_data?.recommendedNextStep ||
      latestReport?.recommended_next_step ||
      null;
    out.push({
      title: nextStep ? `Review your latest report: ${nextStep}` : "Review your latest report",
      why:
        latestReport?.report_data?.recommendationReason ||
        "Your most recent business health report has a recommended next step.",
      action: "Open the full report to see the context behind this recommendation.",
      href: `/portal/reports/${latestReport.id}`,
      cta: "Open report",
      severity: "watch",
    });
  }

  // 3. Overdue task
  const today = new Date();
  const overdueTask = openTasks.find(
    (t: any) => t.due_date && new Date(t.due_date) < today,
  );
  if (overdueTask && out.length < 3) {
    out.push({
      title: `Overdue: ${overdueTask.title}`,
      why: `This task was due ${formatDate(overdueTask.due_date)}.`,
      action: overdueTask.description || "Open your task list to mark it complete.",
      href: "/portal/progress",
      cta: "View tasks",
      severity: "warn",
    });
  }

  // 4. Respond to RGS review request
  if (hasRccAccess && latestCheckin?.request_rgs_review && out.length < 3) {
    out.push({
      title: "RGS review requested",
      why: "You requested an RGS review in your latest check-in.",
      action: "Your RGS team will follow up — confirm anything new in the meantime.",
      href: "/portal/business-control-center",
      cta: "Open Revenue Control Center™",
      severity: "watch",
    });
  }

  // 5. Cash / revenue signal — open Revenue Control Center™
  if (hasRccAccess && latestCheckin?.cash_concern_level === "critical" && out.length < 3) {
    out.push({
      title: "Cash position needs immediate attention",
      why: "Your last weekly check-in flagged cash as critical.",
      action: "Review upcoming inflows and obligations before committing new spend.",
      href: "/portal/business-control-center",
      cta: "Open Revenue Control Center™",
      severity: "critical",
    });
  } else if (hasRccAccess && latestCheckin?.cash_concern_level === "high" && out.length < 3) {
    out.push({
      title: "Cash pressure is building",
      why: "Your last check-in marked cash concern as high.",
      action: "Look at receivables and 30-day obligations together this week.",
      href: "/portal/business-control-center",
      cta: "Open Revenue Control Center™",
      severity: "warn",
    });
  }

  // 5b. Repeated blocker
  if (hasRccAccess && latestCheckin?.repeated_issue && out.length < 3) {
    const blockerLabel =
      latestCheckin.process_blocker ? "process" :
      latestCheckin.people_blocker ? "people" :
      latestCheckin.sales_blocker ? "sales" :
      latestCheckin.cash_blocker ? "cash" :
      latestCheckin.owner_bottleneck ? "owner" : null;
    out.push({
      title: blockerLabel
        ? `Repeated ${blockerLabel} blocker is showing up`
        : "A repeated blocker is showing up",
      why: "The same issue has appeared in more than one weekly check-in.",
      action: "Surface this in your next conversation with your RGS team.",
      href: "/portal/business-control-center",
      cta: "Review trends",
      severity: "warn",
    });
  }

  // 6. Open assigned tool if no recent tool activity
  if (toolsCount > 0 && !hasRecentToolActivity && out.length < 3) {
    out.push({
      title: "Open one of your assigned tools",
      why: "It's been a while since you last used a Diagnostic Engine or Control System.",
      action: "Spending a few minutes inside a tool keeps your data fresh.",
      href: "/portal/tools",
      cta: "Open My Tools",
      severity: "watch",
    });
  }

  // P6.2b — Tool Operating Matrix overdue prompts. These come from per-tool
  // activity, not from generic tool_runs recency. Each is gated so we don't
  // imply access the client doesn't have.
  if (matrixActivity && out.length < 3) {
    // Implementation Command Tracker™ — only meaningful while in implementation.
    const inImpl = isImplementationStage(customer?.stage);
    const ictTool = toolByKey("implementation_command_tracker");
    const ict = matrixActivity.get("implementation_command_tracker");
    if (inImpl && ictTool && (ict?.overdue === "overdue" || ict?.overdue === "not_started" || !ict)) {
      out.push({
        title: "Update your Implementation Command Tracker™",
        why:
          ict?.lastActivityAt
            ? `Last update was ${formatDate(ict.lastActivityAt)}.`
            : "No tracker updates on file yet.",
        action: "A weekly tracker update keeps your implementation on schedule.",
        href: ictTool.route || "/portal/tools",
        cta: "Open tracker",
        severity: ict?.overdue === "overdue" ? "warn" : "watch",
      });
    }
  }

  if (matrixActivity && out.length < 3) {
    // Weekly Alignment System™ — client-facing reflection, no RCC required.
    const wasTool = toolByKey("weekly_alignment_system");
    const was = matrixActivity.get("weekly_alignment_system");
    if (wasTool && (was?.overdue === "overdue" || was?.overdue === "not_started")) {
      out.push({
        title: "Complete your Weekly Alignment System™",
        why:
          was?.lastActivityAt
            ? `Last alignment was ${formatDate(was.lastActivityAt)}.`
            : "No weekly alignment on file yet.",
        action: "Capture this week's wins, blockers, and next steps.",
        href: wasTool.route || "/portal/tools",
        cta: "Start alignment",
        severity: was?.overdue === "overdue" ? "warn" : "watch",
      });
    }
  }

  if (matrixActivity && out.length < 3 && monitoringActive) {
    // Reports & Reviews™ — surface only when monitoring is active.
    const rrTool = toolByKey("reports_and_reviews");
    const rr = matrixActivity.get("reports_and_reviews");
    if (rrTool && rr?.overdue === "overdue") {
      out.push({
        title: "Review your latest Reports & Reviews™",
        why: rr.lastActivityAt
          ? `Last published ${formatDate(rr.lastActivityAt)} — a new review cycle is due.`
          : "A new review cycle is due.",
        action: "Open the latest published report and confirm next steps.",
        href: latestReport ? `/portal/reports/${latestReport.id}` : "/portal/reports",
        cta: "Open report",
        severity: "watch",
      });
    }
  }

  // Fallback: customer-record next_action (only if nothing else is urgent)
  if (out.length === 0 && customer?.next_action) {
    out.push({
      title: customer.next_action,
      why: "Your RGS team has flagged this as the current focus.",
      action: "No action needed from you right now unless they reach out.",
      href: hasRccAccess ? "/portal/business-control-center" : "/portal/progress",
      cta: hasRccAccess ? "Open Revenue Control Center™" : "View progress",
      severity: "watch",
    });
  }

  return out.slice(0, 3);
}

const SAFE_TIMELINE_EVENTS = new Set([
  "report_published",
  "report_unpublished",
  "implementation_started",
  "stage_change",
  "account_linked",
  "client_account_auto_linked",
  "client_account_linked",
  "customer_created",
  // P7.2.6 — engagement billing status updates (no amounts/payment details).
  "diagnostic_payment_updated",
  "implementation_payment_updated",
  "addon_payment_updated",
  // Render-only — do not create schema. Logged when/if the source code starts emitting them.
  "tool_assigned",
  "benchmark_saved",
  "weekly_checkin_submitted",
  "task_completed",
]);

function CommandCenter({
  customer,
  latestReport,
  latestCheckin,
  openTasks,
  recentTimeline,
  toolsCount,
  lastToolActivityAt,
  intakeStatus,
  hasRccAccess,
  matrixActivity,
}: {
  customer: any;
  latestReport: any;
  latestCheckin: any;
  openTasks: any[];
  recentTimeline: any[];
  toolsCount: number;
  lastToolActivityAt?: string | null;
  intakeStatus: IntakeStatus | null;
  hasRccAccess: boolean;
  matrixActivity?: Map<string, { lastActivityAt: string | null; overdue: OverdueState }>;
}) {
  const score: number | null =
    latestReport?.health_score ??
    latestReport?.report_data?.healthScore ??
    null;
  const status = statusFromScore(score);
  const tone = statusTone(status);

  const checkinAge = daysSince(latestCheckin?.week_end);
  const checkinLabel =
    checkinAge == null
      ? "Not on file"
      : checkinAge === 0
        ? "Today"
        : checkinAge === 1
          ? "Yesterday"
          : `${checkinAge} days ago`;
  const checkinOverdue = checkinAge == null || checkinAge > 7;

  const reportLabel = latestReport
    ? formatDate(latestReport.published_at || latestReport.updated_at)
    : "No report yet";

  const monitoringActive =
    customer?.monitoring_status && customer.monitoring_status !== "not_active";
  const monitoringLabel = monitoringActive
    ? `${prettyMonitoring(customer.monitoring_status)}${customer.monitoring_tier && customer.monitoring_tier !== "none" ? ` · ${prettyMonitoring(customer.monitoring_tier)}` : ""}`
    : "Not active";

  const toolAge = daysSince(lastToolActivityAt);
  const hasRecentToolActivity = toolAge != null && toolAge <= 30;
  const priorities = buildPriorities({
    latestReport,
    latestCheckin,
    openTasks,
    customer,
    toolsCount,
    hasRecentToolActivity,
    intakeStatus,
    hasRccAccess,
    matrixActivity,
    monitoringActive: !!monitoringActive,
  });

  const safeTimeline = (recentTimeline || [])
    .filter((t) => SAFE_TIMELINE_EVENTS.has(t.event_type))
    .slice(0, 4);

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Command Center</div>
          <h2 className="mt-1 text-xl text-foreground">Your business at a glance</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            What's healthy, what changed, and what needs attention right now.
          </p>
        </div>
      </div>

      {/* Snapshot row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <SnapshotTile
          label="Business Health"
          value={score != null ? `${Math.round(score)}` : "—"}
          sub={score != null ? "/ 100" : "Awaiting first report"}
          chip={
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border ${tone.chip}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              {status}
            </span>
          }
          icon={Activity}
        />
        <SnapshotTile
          label="Last Check-In"
          value={checkinLabel}
          sub={latestCheckin?.week_end ? `Week ending ${formatDate(latestCheckin.week_end)}` : "Submit your first check-in"}
          icon={CalendarCheck2}
          warn={checkinOverdue}
        />
        <SnapshotTile
          label="Latest Report"
          value={reportLabel}
          sub={latestReport ? `${prettyReportType(latestReport.report_type)} · published` : "None published yet"}
          icon={FileText}
        />
        <SnapshotTile
          label="Monitoring"
          value={monitoringLabel}
          sub={monitoringActive ? "Active oversight" : "Not on a monitoring plan"}
          icon={Radar}
        />
        <SnapshotTile
          label="Active Tools"
          value={`${toolsCount}`}
          sub={toolsCount === 0 ? "Awaiting assignment" : "Assigned by your RGS team"}
          icon={Wrench}
        />
      </div>

      {/* Two-up: Needs Attention + Check-in / Report / Recommended */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        {/* Needs Attention */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <h3 className="text-sm text-foreground">What needs attention</h3>
            </div>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Top {priorities.length || 0}
            </span>
          </div>
          {priorities.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <CheckCircle2 className="h-5 w-5 text-[hsl(140_50%_65%)] mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nothing urgent right now. Keep your weekly check-in current and your insights stay sharp.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {priorities.map((p, i) => {
                const sev =
                  p.severity === "critical"
                    ? "border-[hsl(0_70%_55%/0.35)] bg-[hsl(0_70%_55%/0.05)]"
                    : p.severity === "warn"
                      ? "border-[hsl(38_90%_55%/0.35)] bg-[hsl(38_90%_55%/0.05)]"
                      : "border-border bg-muted/20";
                return (
                  <li key={i} className={`rounded-lg border p-4 ${sev}`}>
                    <div className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center tabular-nums mt-0.5 flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground">{p.title}</div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.why}</p>
                        <p className="text-xs text-foreground/90 mt-2 leading-relaxed">{p.action}</p>
                        <Link
                          to={p.href}
                          className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:text-secondary"
                        >
                          {p.cta} <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Side stack */}
        <div className="space-y-4">
          <CheckInStatusCard latestCheckin={latestCheckin} hasRccAccess={hasRccAccess} />
          <LatestReportCard report={latestReport} />
          <RecommendedStepCard report={latestReport} customer={customer} />
        </div>
      </div>

      {/* What changed */}
      {safeTimeline.length > 0 && (
        <div className="mt-5 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="h-4 w-4 text-primary" />
            <h3 className="text-sm text-foreground">What changed recently</h3>
          </div>
          <ul className="space-y-2.5">
            {safeTimeline.map((t) => (
              <li key={t.id} className="flex items-start gap-3 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-foreground">{t.title}</span>
                  {t.detail && <span className="text-muted-foreground"> — {t.detail}</span>}
                </div>
                <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                  {formatDate(t.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function prettyMonitoring(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function prettyReportType(t: string) {
  if (t === "monthly") return "Monthly";
  if (t === "quarterly") return "Quarterly";
  return t;
}

function SnapshotTile({
  label,
  value,
  sub,
  chip,
  icon: Icon,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  chip?: React.ReactNode;
  icon: any;
  warn?: boolean;
}) {
  return (
    <div className={`bg-card border rounded-xl p-4 ${warn ? "border-[hsl(38_90%_55%/0.35)]" : "border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="text-lg text-foreground leading-tight truncate">{value}</div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {sub ? <div className="text-[11px] text-muted-foreground truncate">{sub}</div> : <span />}
        {chip}
      </div>
    </div>
  );
}

function CheckInStatusCard({ latestCheckin, hasRccAccess }: { latestCheckin: any; hasRccAccess: boolean }) {
  const age = daysSince(latestCheckin?.week_end);
  const overdue = age == null || age > 7;
  // P6.1 — without RCC access, the weekly check-in flow doesn't apply.
  // Show a calm "not active" line and link to diagnostics instead.
  if (!hasRccAccess) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm text-foreground">Weekly check-in</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Weekly check-ins are part of Revenue Control Center™ (ongoing-control add-on). Not active for your account.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <CalendarCheck2 className="h-4 w-4 text-primary" />
        <h4 className="text-sm text-foreground">Weekly check-in</h4>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {latestCheckin
          ? overdue
            ? `Last check-in was ${age} days ago. Submitting one this week keeps your insights accurate.`
            : `Last submitted ${age === 0 ? "today" : age === 1 ? "yesterday" : `${age} days ago`}. You're current.`
          : "You haven't submitted a weekly check-in yet. It only takes a few minutes."}
      </p>
      <Link
        to="/portal/business-control-center"
        className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:text-secondary"
      >
        {overdue ? "Complete weekly check-in" : "Open check-in"} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function LatestReportCard({ report }: { report: any }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-primary" />
        <h4 className="text-sm text-foreground">Latest report</h4>
      </div>
      {report ? (
        <>
          <div className="text-xs text-muted-foreground">
            {prettyReportType(report.report_type)} · {formatDate(report.period_start)} – {formatDate(report.period_end)}
          </div>
          {report.report_data?.condition && (
            <div className="text-xs text-foreground/90 mt-2 leading-relaxed">
              Condition: <span className="text-foreground">{report.report_data.condition}</span>
            </div>
          )}
          <Link
            to={`/portal/reports/${report.id}`}
            className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:text-secondary"
          >
            Open latest Reports & Reviews™ report <ArrowRight className="h-3 w-3" />
          </Link>
        </>
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Awaiting first Reports & Reviews™ report. Your RGS team will publish one when ready.
        </p>
      )}
    </div>
  );
}

function RecommendedStepCard({ report, customer }: { report: any; customer: any }) {
  const step: string | null =
    report?.report_data?.recommendedNextStep ||
    report?.recommended_next_step ||
    customer?.next_action ||
    null;
  const reason: string | null =
    report?.report_data?.recommendationReason ||
    (customer?.next_action ? "Current focus from your RGS team." : null);
  return (
    <div className="bg-primary/[0.06] border border-primary/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-4 w-4 text-primary" />
        <h4 className="text-sm text-foreground">RGS recommended next step</h4>
      </div>
      {step ? (
        <>
          <div className="text-sm text-foreground">{step}</div>
          {reason && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{reason}</p>}
        </>
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Once your next report or check-in is in, your recommended next step will appear here.
        </p>
      )}
    </div>
  );
}
