import { useEffect, useMemo, useState } from "react";
import { ClientToolShell } from "@/components/tools/ClientToolShell";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, ShieldCheck, Eye, AlertOctagon, Flame,
  Clock, CalendarClock, CalendarDays, Layers, Plus, Trash2, ArrowUp, ArrowDown,
  Activity, Target, Wrench, TrendingUp, Lightbulb, Flag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";

type Industry = "service" | "trades" | "retail";
type Condition = "stable" | "watch" | "at_risk" | "critical";
type Horizon = "immediate" | "30d" | "90d" | "structural";

interface Signal {
  id: string;
  title: string;
  whatHappening: string;
  whyMatters: string;
  ifIgnored: string;
  rootCause: string;
  horizon: Horizon;
  silentRisk: boolean;
  leverageImpact: string;
}

interface Data {
  industry: Industry;
  condition: Condition;
  conditionNote: string;
  signals: Signal[];
  workingOn: string;
  prevBenchmark: string;
  currentBenchmark: string;
}

const INDUSTRY_LABEL: Record<Industry, string> = {
  service: "Service Business",
  trades: "Trades",
  retail: "Retail",
};

const INDUSTRY_PRESETS: Record<Industry, Partial<Signal>[]> = {
  service: [
    { title: "Conversion Breakdown", whatHappening: "Discovery calls are not turning into clients.", whyMatters: "Pipeline activity hides a closing problem.", ifIgnored: "Revenue stalls while lead spend keeps climbing.", rootCause: "Unclear offer or weak qualification step.", horizon: "immediate", silentRisk: false, leverageImpact: "Fixing close rate lifts every other revenue activity." },
  ],
  trades: [
    { title: "Job Margin Erosion", whatHappening: "Jobs are completing under target margin.", whyMatters: "You're working harder for the same money.", ifIgnored: "Cash buffer disappears in a slow month.", rootCause: "Estimating or scope-control gap.", horizon: "30d", silentRisk: false, leverageImpact: "Tightening estimates protects every future job." },
  ],
  retail: [
    { title: "Stock Mix Drift", whatHappening: "Top sellers go out of stock while slow movers sit.", whyMatters: "You lose easy revenue while capital sits frozen.", ifIgnored: "Working capital tightens and best customers leave.", rootCause: "No reorder rule tied to sell-through.", horizon: "30d", silentRisk: false, leverageImpact: "Better stock mix improves cash, margin, and loyalty together." },
  ],
};

const newSignal = (preset?: Partial<Signal>): Signal => ({
  id: crypto.randomUUID(),
  title: preset?.title ?? "New signal",
  whatHappening: preset?.whatHappening ?? "",
  whyMatters: preset?.whyMatters ?? "",
  ifIgnored: preset?.ifIgnored ?? "",
  rootCause: preset?.rootCause ?? "",
  horizon: preset?.horizon ?? "30d",
  silentRisk: preset?.silentRisk ?? false,
  leverageImpact: preset?.leverageImpact ?? "",
});

const defaultData: Data = {
  industry: "service",
  condition: "watch",
  conditionNote: "Revenue is steady but a few signals are starting to drift. Worth attention this month.",
  signals: INDUSTRY_PRESETS.service.map((p) => newSignal(p)),
  workingOn: "",
  prevBenchmark: "",
  currentBenchmark: "",
};

const CONDITION_META: Record<Condition, { label: string; icon: any; color: string; bg: string; ring: string }> = {
  stable:   { label: "Stable",        icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
  watch:    { label: "Watch Closely", icon: Eye,         color: "text-amber-500",   bg: "bg-amber-500/10",   ring: "ring-amber-500/30" },
  at_risk:  { label: "At Risk",       icon: AlertTriangle,color: "text-orange-500", bg: "bg-orange-500/10",  ring: "ring-orange-500/30" },
  critical: { label: "Critical",      icon: Flame,       color: "text-destructive", bg: "bg-destructive/10", ring: "ring-destructive/30" },
};

const HORIZON_META: Record<Horizon, { label: string; icon: any; weight: number }> = {
  immediate:  { label: "Immediate",  icon: AlertOctagon, weight: 4 },
  "30d":      { label: "30-Day",     icon: Clock,        weight: 3 },
  "90d":      { label: "90-Day",     icon: CalendarClock,weight: 2 },
  structural: { label: "Structural", icon: Layers,       weight: 1 },
};

export default function RevenueRiskMonitor() {
  const [data, setData] = useState<Data>(defaultData);
  const { customerId } = usePortalCustomerId();
  const [benchmark, setBenchmark] = useState<{ title: string; total: number; band: string; weakest?: string; strongest?: string; updated_at: string } | null>(null);

  // Deep tool connection: pull latest Benchmark for this customer to drive client-view insights.
  useEffect(() => {
    if (!customerId) {
      setBenchmark(null);
      return;
    }
    (async () => {
      const { data: r } = await supabase
        .from("tool_runs")
        .select("title, summary, updated_at")
        .eq("tool_key", "rgs_stability_scorecard")
        .eq("customer_id", customerId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (r?.summary) {
        const s: any = r.summary;
        setBenchmark({
          title: r.title,
          total: Number(s.total ?? 0),
          band: s.band ?? "—",
          weakest: s.weakest,
          strongest: s.strongest,
          updated_at: r.updated_at,
        });
      }
    })();
  }, [customerId]);

  const update = (patch: Partial<Data>) => setData({ ...data, ...patch });
  const updateSignal = (id: string, patch: Partial<Signal>) =>
    setData({ ...data, signals: data.signals.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const removeSignal = (id: string) =>
    setData({ ...data, signals: data.signals.filter((s) => s.id !== id) });
  const move = (id: string, dir: -1 | 1) => {
    const i = data.signals.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= data.signals.length) return;
    const next = [...data.signals];
    [next[i], next[j]] = [next[j], next[i]];
    setData({ ...data, signals: next });
  };
  const addFromPreset = () => {
    const preset = INDUSTRY_PRESETS[data.industry][0];
    setData({ ...data, signals: [...data.signals, newSignal(preset)] });
  };
  const addBlank = () => setData({ ...data, signals: [...data.signals, newSignal()] });

  const cond = CONDITION_META[data.condition];
  const CondIcon = cond.icon;

  const change = useMemo(() => {
    const a = parseFloat(data.prevBenchmark);
    const b = parseFloat(data.currentBenchmark);
    if (Number.isFinite(a) && Number.isFinite(b)) return b - a;
    return null;
  }, [data.prevBenchmark, data.currentBenchmark]);

  const silentRisks = data.signals.filter((s) => s.silentRisk);

  return (
    <ClientToolShell
      toolKey="client_revenue_risk_monitor"
      toolTitle="Revenue & Risk Monitor™"
      description="A real-time read on where revenue is leaking, where risk is building, and what to fix first."
      entryNoun="report"
      data={data}
      setData={setData as any}
      defaultData={defaultData}
      computeSummary={(d: Data) => ({
        condition: d.condition,
        industry: d.industry,
        signal_count: d.signals.length,
        silent_risks: d.signals.filter((s) => s.silentRisk).length,
        priority_top: d.signals[0]?.title ?? null,
      })}
      rightPanel={
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Industry Version</div>
            <div className="text-sm text-foreground">{INDUSTRY_LABEL[data.industry]}</div>
            <p className="text-[11px] text-muted-foreground mt-2">Your RGS team selects the version that matches your business model.</p>
          </div>
          <div className={`rounded-xl p-5 ring-1 ${cond.ring} ${cond.bg}`}>
            <div className={`flex items-center gap-2 ${cond.color}`}>
              <CondIcon className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Current Condition</span>
            </div>
            <div className="text-2xl text-foreground mt-2">{cond.label}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Activity className="h-3 w-3" /> At-a-glance</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Active signals</span><span className="text-foreground tabular-nums">{data.signals.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Silent risks</span><span className="text-foreground tabular-nums">{silentRisks.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Top priority</span><span className="text-foreground truncate max-w-[140px] text-right">{data.signals[0]?.title || "—"}</span></div>
            </div>
          </div>
        </div>
      }
    >
      {/* ─────────── CLIENT VIEW (6-section structure, derived from latest Benchmark) ─────────── */}
      <div className="space-y-4">
        {/* 1. Top Impact */}
        <div className={`rounded-2xl p-6 ring-1 ${cond.ring} ${cond.bg}`}>
          <div className={`flex items-center gap-2 ${cond.color} text-[11px] uppercase tracking-[0.18em] mb-2`}>
            <CondIcon className="h-3.5 w-3.5" /> 1 · Top Impact — Current Condition
          </div>
          <div className="text-3xl text-foreground">{cond.label}</div>
          {data.conditionNote && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{data.conditionNote}</p>}
          {benchmark && (
            <div className="text-[11px] text-muted-foreground mt-3">
              Based on benchmark <span className="text-foreground">{benchmark.title}</span> — {benchmark.total}/1000 · {benchmark.band}
              <span className="ml-2 opacity-70">· updated {new Date(benchmark.updated_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* 2. What's Happening — risk signals */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            <Activity className="h-3 w-3" /> 2 · What's Happening — Risk Signals
          </div>
          {data.signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active risk signals right now.</p>
          ) : (
            <ul className="space-y-2">
              {data.signals.slice(0, 5).map((s, i) => (
                <li key={s.id} className="flex items-start gap-3 text-sm">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center tabular-nums flex-shrink-0">{i + 1}</span>
                  <div>
                    <div className="text-foreground">{s.title}</div>
                    {s.whatHappening && <div className="text-xs text-muted-foreground mt-0.5">{s.whatHappening}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 3. What's Most Important — biggest risk */}
        {data.signals[0] && (
          <div className="rounded-2xl border border-destructive/30 bg-card p-6">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-destructive mb-2">
              <Flag className="h-3.5 w-3.5" /> 3 · What's Most Important — Biggest Risk
            </div>
            <h3 className="text-xl text-foreground">{data.signals[0].title}</h3>
            {data.signals[0].whyMatters && <p className="text-sm text-muted-foreground mt-1">{data.signals[0].whyMatters}</p>}
          </div>
        )}

        {/* 4. Why It's Happening */}
        {data.signals[0]?.rootCause && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              <Lightbulb className="h-3.5 w-3.5" /> 4 · Why It's Happening
            </div>
            <p className="text-sm text-foreground leading-relaxed">{data.signals[0].rootCause}</p>
          </div>
        )}

        {/* 5. What To Do Next */}
        <div className="bg-primary/5 border border-primary/30 rounded-xl p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary mb-2">
            <Wrench className="h-3.5 w-3.5" /> 5 · What To Do Next — What We're Fixing
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {data.workingOn || (data.signals[0]?.leverageImpact ?? "Your RGS team will assign the next move during your weekly check-in.")}
          </p>
        </div>

        {/* 6. If Ignored */}
        {data.signals[0]?.ifIgnored && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-amber-500 mb-2">
              <AlertOctagon className="h-3.5 w-3.5" /> 6 · If Ignored
            </div>
            <p className="text-sm text-foreground leading-relaxed">{data.signals[0].ifIgnored}</p>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-6">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-4">Editable detail (admin / power view)</div>
      </div>

      {/* Industry + Condition */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Industry Version (admin)</div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(INDUSTRY_LABEL) as Industry[]).map((ind) => (
              <button
                key={ind}
                onClick={() => update({ industry: ind })}
                className={`px-3 py-2 rounded-md text-sm border transition ${
                  data.industry === ind ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {INDUSTRY_LABEL[ind]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Current Condition</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.keys(CONDITION_META) as Condition[]).map((c) => {
              const m = CONDITION_META[c];
              const Icon = m.icon;
              const active = data.condition === c;
              return (
                <button
                  key={c}
                  onClick={() => update({ condition: c })}
                  className={`p-3 rounded-md border text-left transition ${
                    active ? `border-transparent ring-1 ${m.ring} ${m.bg}` : "border-border hover:bg-muted/30"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? m.color : "text-muted-foreground"}`} />
                  <div className={`text-sm mt-1.5 ${active ? "text-foreground" : "text-muted-foreground"}`}>{m.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Plain-language read</div>
          <Textarea
            value={data.conditionNote}
            onChange={(e) => update({ conditionNote: e.target.value })}
            rows={2}
            placeholder="One or two sentences describing the current business condition."
            className="bg-muted/30 border-border resize-none"
          />
        </div>
      </div>

      {/* Signals */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Revenue & Risk Signals</div>
            <div className="text-sm text-muted-foreground mt-1">Order top-to-bottom = priority fix order.</div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addFromPreset} variant="outline" size="sm" className="border-border"><Target className="h-3.5 w-3.5" /> Preset</Button>
            <Button onClick={addBlank} variant="outline" size="sm" className="border-border"><Plus className="h-3.5 w-3.5" /> Blank</Button>
          </div>
        </div>

        {data.signals.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No signals yet.</p>
        ) : (
          <ol className="space-y-4">
            {data.signals.map((s, idx) => {
              const h = HORIZON_META[s.horizon];
              const HIcon = h.icon;
              return (
                <li key={s.id} className="border border-border rounded-lg p-4 bg-background/40">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs tabular-nums">{idx + 1}</div>
                      <Input
                        value={s.title}
                        onChange={(e) => updateSignal(s.id, { title: e.target.value })}
                        className="bg-muted/30 border-border text-sm"
                        placeholder="Signal title (e.g. High Risk: Conversion Breakdown)"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => move(s.id, -1)} className="p-1.5 text-muted-foreground hover:text-foreground"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button onClick={() => move(s.id, 1)} className="p-1.5 text-muted-foreground hover:text-foreground"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button onClick={() => removeSignal(s.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="What is happening" value={s.whatHappening} onChange={(v) => updateSignal(s.id, { whatHappening: v })} />
                    <Field label="Why it matters" value={s.whyMatters} onChange={(v) => updateSignal(s.id, { whyMatters: v })} />
                    <Field label="If ignored" value={s.ifIgnored} onChange={(v) => updateSignal(s.id, { ifIgnored: v })} />
                    <Field label="Root cause" value={s.rootCause} onChange={(v) => updateSignal(s.id, { rootCause: v })} />
                    <Field label="Leverage impact" value={s.leverageImpact} onChange={(v) => updateSignal(s.id, { leverageImpact: v })} className="md:col-span-2" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">Timeline:</div>
                    {(Object.keys(HORIZON_META) as Horizon[]).map((hz) => {
                      const HM = HORIZON_META[hz].icon;
                      const active = s.horizon === hz;
                      return (
                        <button
                          key={hz}
                          onClick={() => updateSignal(s.id, { horizon: hz })}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] ${
                            active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <HM className="h-3 w-3" /> {HORIZON_META[hz].label}
                        </button>
                      );
                    })}
                    <label className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s.silentRisk}
                        onChange={(e) => updateSignal(s.id, { silentRisk: e.target.checked })}
                        className="accent-primary"
                      />
                      Silent risk (long-term fragility)
                    </label>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/40 text-[11px] text-muted-foreground">
                      <HIcon className="h-3 w-3" /> {h.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* What we're doing */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
          <Wrench className="h-3.5 w-3.5" /> What we're doing
        </div>
        <Textarea
          value={data.workingOn}
          onChange={(e) => update({ workingOn: e.target.value })}
          rows={3}
          placeholder="Specific actions actively in motion this week."
          className="bg-muted/30 border-border resize-none"
        />
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
          <TrendingUp className="h-3.5 w-3.5" /> Progress Tracking
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Previous Benchmark</label>
            <Input value={data.prevBenchmark} onChange={(e) => update({ prevBenchmark: e.target.value })} placeholder="e.g. 480" className="mt-1 bg-muted/30 border-border" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Current Benchmark</label>
            <Input value={data.currentBenchmark} onChange={(e) => update({ currentBenchmark: e.target.value })} placeholder="e.g. 540" className="mt-1 bg-muted/30 border-border" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Change</label>
            <div className="mt-1 h-10 flex items-center px-3 rounded-md bg-muted/30 border border-border text-sm">
              {change === null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <span className={change > 0 ? "text-emerald-500" : change < 0 ? "text-destructive" : "text-muted-foreground"}>
                  {change > 0 ? "+" : ""}{change}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Silent risk callout */}
      {silentRisks.length > 0 && (
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5">
          <div className="flex items-center gap-2 text-amber-500 text-[11px] uppercase tracking-wider mb-2">
            <AlertTriangle className="h-3.5 w-3.5" /> Silent Risks
          </div>
          <ul className="text-sm text-foreground space-y-1">
            {silentRisks.map((s) => (
              <li key={s.id} className="flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                <span>{s.title}{s.ifIgnored ? <span className="text-muted-foreground"> — {s.ifIgnored}</span> : null}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ClientToolShell>
  );
}

function Field({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="mt-1 bg-muted/30 border-border resize-none text-sm"
      />
    </div>
  );
}
