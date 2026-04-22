import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isClientVisible } from "@/lib/visibility";
import { isImplementationStage, stageLabel, formatDate } from "@/lib/portal";
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
} from "lucide-react";
import { pillars as scorecardPillars } from "@/components/scorecard/scorecardData";

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
  const [customer, setCustomer] = useState<any>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: c } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setCustomer(c);
      if (c) {
        const [{ data: r }, { data: chk }, { data: runs }] = await Promise.all([
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
        ]);
        const visible = (r ?? [])
          .filter((x: any) => x.resources && isClientVisible(x.visibility_override || x.resources.visibility))
          .map((x: any) => x.resources);
        setTools(visible);
        setChecklist(chk || []);
        setBenchmarks(runs || []);
      }
      setLoading(false);
    })();
  }, [user]);

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
              "Your engagement is in motion. Your full workspace will unlock once the implementation phase begins."}
          </p>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell variant="customer">
      <Welcome name={customer.full_name} business={customer.business_name} />

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
                <div className="text-sm text-foreground">{t.title}</div>
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
