import { useState, useMemo } from "react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertTriangle, TrendingUp, Sparkles, Info, Eye, EyeOff } from "lucide-react";
import { generateRunPdf, downloadCSV } from "@/lib/exports";
import {
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer,
  ComposedChart, Line, CartesianGrid,
} from "recharts";
import {
  defaultLeakData, computeLeaks, generateLeakInsights, fmtMoney as fmt, fmtPct as pct,
  computeSystemLeak, REVENUE_SYSTEM_CATEGORIES,
  type LeakData, type Severity,
} from "@/lib/revenueLeak";
import { RevenueLeakClientView } from "@/components/tools/RevenueLeakClientView";
import { DiagnosticAdminPanel } from "@/components/diagnostics/DiagnosticAdminPanel";
import { DiagnosticReport } from "@/components/diagnostics/DiagnosticReport";
import {
  computeDiagnostic,
  hydrateSeverities,
  type FactorEvidence,
  type EvidenceMap,
  type Severity as DiagnosticSeverity,
} from "@/lib/diagnostics/engine";

export default function RevenueLeakFinderTool() {
  // Merge defaults so older saved runs (without system fields) hydrate gracefully.
  const [data, setData] = useState<LeakData>({
    ...defaultLeakData,
    system_severities: { ...defaultLeakData.system_severities },
    system_evidence: { ...(defaultLeakData.system_evidence ?? {}) },
  });
  const [clientPreview, setClientPreview] = useState(false);
  const set = (k: keyof LeakData, v: any) => setData({ ...data, [k]: v });
  const setSeverity = (catKey: string, factorKey: string, v: Severity | DiagnosticSeverity) =>
    setData({
      ...data,
      system_severities: { ...(data.system_severities ?? {}), [`${catKey}.${factorKey}`]: v as Severity },
    });
  const setEvidence = (catKey: string, factorKey: string, e: FactorEvidence) =>
    setData({
      ...data,
      system_evidence: { ...(data.system_evidence ?? {}), [`${catKey}.${factorKey}`]: e },
    });

  const computed = useMemo(() => computeLeaks(data), [data]);
  const insights = useMemo(() => generateLeakInsights(data, computed), [data, computed]);
  const sys = useMemo(() => computeSystemLeak(data), [data]);

  // Hydrated copies for shared diagnostic components (defends against old saved runs).
  const hydratedSystemSeverities = useMemo(
    () => hydrateSeverities(REVENUE_SYSTEM_CATEGORIES, data.system_severities),
    [data.system_severities],
  );
  const hydratedEvidence: EvidenceMap = data.system_evidence ?? {};
  const systemDiagnostic = useMemo(
    () =>
      computeDiagnostic(REVENUE_SYSTEM_CATEGORIES, hydratedSystemSeverities, {
        baselineMonthly: data.system_baseline_monthly,
        evidence: data.system_evidence,
      }),
    [hydratedSystemSeverities, data.system_baseline_monthly, data.system_evidence],
  );

  const summary = (d: LeakData) => {
    const c = computeLeaks(d);
    const s = computeSystemLeak(d);
    return {
      monthly_leak: c.totalMonthly,
      annual_leak: c.totalAnnual,
      biggest_leak: c.biggest.label,
      improved_monthly: Math.round(c.improvedMonthly),
      system_score: s.score,
      system_band: s.band,
      system_monthly: s.monthly,
      system_annual: s.annual,
      system_top: s.topThree.map((t) => t.label),
      system_next_step: s.nextStep,
    };
  };

  const leakChartData = computed.breakdown.map((l) => ({ name: l.label, monthly: l.monthly }));
  const scenarioData = [
    { name: "Current", revenue: Math.round(computed.currentRev) },
    { name: "Improved (50%)", revenue: Math.round(computed.improvedMonthly) },
    { name: "At benchmark", revenue: Math.round(computed.bestRev) },
  ];

  const leakColor = (idx: number, biggestKey: string, key: string) =>
    key === biggestKey ? "hsl(0 70% 55%)" : ["hsl(78 36% 55%)", "hsl(78 36% 45%)", "hsl(78 30% 40%)", "hsl(78 24% 35%)", "hsl(78 18% 30%)"][idx % 5];

  const exportCsv = () => {
    const rows: Record<string, any>[] = [
      { section: "Funnel input", metric: "Monthly leads", value: data.monthly_leads, target: "" },
      { section: "Funnel input", metric: "Response rate %", value: data.response_rate, target: data.target_response_rate },
      { section: "Funnel input", metric: "Response speed (min)", value: data.response_speed_minutes, target: data.target_response_speed },
      { section: "Funnel input", metric: "Show rate %", value: data.show_rate, target: data.target_show_rate },
      { section: "Funnel input", metric: "Close rate %", value: data.close_rate, target: data.target_close_rate },
      { section: "Funnel input", metric: "Avg ticket $", value: data.avg_ticket, target: "" },
      { section: "Funnel input", metric: "Repeat rate %", value: data.repeat_rate, target: data.target_repeat_rate },
      { section: "Funnel input", metric: "Follow-up attempts", value: data.follow_up_attempts, target: data.target_follow_ups },
      { section: "Funnel input", metric: "Missed follow-ups %", value: data.missed_follow_ups, target: data.target_missed_follow_ups },
      ...computed.breakdown.map((l) => ({ section: "Leak", metric: l.label, value: l.monthly, target: l.annual, unit: "$ monthly | $ annual" })),
      { section: "Summary", metric: "Current revenue / mo", value: Math.round(computed.currentRev), target: "" },
      { section: "Summary", metric: "Improved (50%) / mo", value: Math.round(computed.improvedMonthly), target: "" },
      { section: "Summary", metric: "At benchmark / mo", value: Math.round(computed.bestRev), target: "" },
      { section: "Summary", metric: "Total monthly leak", value: computed.totalMonthly, target: "" },
      { section: "Summary", metric: "Total annual leak", value: computed.totalAnnual, target: "" },
    ];
    downloadCSV(`revenue-leak-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportPdf = () => {
    generateRunPdf(`revenue-leak-${new Date().toISOString().slice(0, 10)}`, {
      title: "Revenue Leak Detection Engine™",
      subtitle: "Quantified breakdown of revenue lost between current funnel performance and proven benchmarks.",
      meta: [
        ["Estimated monthly leak", fmt(computed.totalMonthly)],
        ["Estimated annual leak", fmt(computed.totalAnnual)],
        ["Biggest leak", `${computed.biggest.label} (${fmt(computed.biggest.monthly)}/mo)`],
        ["Current revenue / mo", fmt(computed.currentRev)],
        ["Improved (50% gap) / mo", fmt(computed.improvedMonthly)],
        ["At benchmark / mo", fmt(computed.bestRev)],
        ["Date", new Date().toLocaleDateString()],
      ],
      sections: [
        { type: "heading", text: "Where revenue is leaking (monthly)" },
        ...computed.breakdown.map((l) => ({
          type: "bar" as const,
          label: `${l.label} — ${l.why}`,
          value: l.monthly,
          max: Math.max(1, computed.breakdown.reduce((m, x) => Math.max(m, x.monthly), 0)),
          suffix: ` $`,
        })),
        { type: "heading", text: "Scenario projection" },
        { type: "kv", pairs: [
          ["Current revenue", `${fmt(computed.currentRev)} / mo  ·  ${fmt(computed.currentRev * 12)} / yr`],
          ["Improved (50% gap closed)", `${fmt(computed.improvedMonthly)} / mo  ·  ${fmt(computed.improvedAnnual)} / yr`],
          ["At full benchmark", `${fmt(computed.bestRev)} / mo  ·  ${fmt(computed.bestRev * 12)} / yr`],
        ]},
        { type: "heading", text: "Top risks" },
        ...(insights.risks.length
          ? insights.risks.map((r) => ({ type: "paragraph" as const, text: `• ${r}` }))
          : [{ type: "paragraph" as const, text: "No critical leaks identified — funnel is running at or above benchmark." }]),
        { type: "heading", text: "Opportunities" },
        ...insights.opportunities.map((o) => ({ type: "paragraph" as const, text: `• ${o}` })),
        ...(data.notes ? [
          { type: "heading" as const, text: "Internal notes (not shown to client)" },
          { type: "paragraph" as const, text: data.notes },
        ] : []),
      ],
    });
  };

  const Field = ({
    k, label, suffix, target, hint,
  }: { k: keyof LeakData; label: string; suffix?: string; target?: number; hint?: string }) => {
    const val = data[k] as number;
    const off = target !== undefined && val !== undefined && (
      ["response_speed_minutes", "missed_follow_ups"].includes(k as string) ? val > target : val < target
    );
    return (
      <label className="block">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
          {target !== undefined && (
            <span className={`text-[10px] tabular-nums ${off ? "text-[hsl(0_70%_65%)]" : "text-[hsl(78_36%_60%)]"}`}>
              target {target}{suffix === "%" ? "%" : suffix === "min" ? " min" : ""}
            </span>
          )}
        </div>
        <div className="relative">
          <Input
            type="number"
            value={val}
            onChange={(e) => set(k, Number(e.target.value))}
            className={`bg-muted/30 border-border pr-12 ${off ? "border-[hsl(0_70%_50%)]/40" : ""}`}
          />
          {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
        </div>
        {hint && <span className="text-[10px] text-muted-foreground/80 mt-1 block">{hint}</span>}
      </label>
    );
  };

  return (
    <ToolRunnerShell
      toolKey="revenue_leak_finder"
      toolTitle="Revenue Leak Detection Engine™"
      description="One engine, two views. Adjust assumptions, scenario-test, and capture internal notes — your client only ever sees the simplified loss summary."
      data={data}
      setData={setData as any}
      defaultData={defaultLeakData}
      computeSummary={summary}
      rightPanel={
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Estimated annual leak</div>
            <div className="font-display text-4xl text-[hsl(0_70%_60%)] tabular-nums leading-none">{fmt(computed.totalAnnual)}</div>
            <div className="text-xs text-muted-foreground mt-1">{fmt(computed.totalMonthly)} / month</div>

            {computed.biggest.monthly > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-[hsl(0_70%_55%/0.1)] border border-[hsl(0_70%_55%/0.2)]">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[hsl(0_70%_70%)] mb-1">
                  <AlertTriangle className="h-3 w-3" /> Biggest leak
                </div>
                <div className="text-sm text-foreground">{computed.biggest.label}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {fmt(computed.biggest.monthly)}/mo · {fmt(computed.biggest.annual)}/yr
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button onClick={exportPdf} variant="outline" size="sm" className="border-border"><FileText className="h-3.5 w-3.5" /> PDF</Button>
              <Button onClick={exportCsv} variant="outline" size="sm" className="border-border"><Download className="h-3.5 w-3.5" /> CSV</Button>
            </div>
          </div>

          {/* View toggle */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">View</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setClientPreview(false)}
                className={`px-2 py-2 rounded-md text-xs border transition ${!clientPreview ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <EyeOff className="h-3 w-3 inline mr-1" /> Admin
              </button>
              <button
                onClick={() => setClientPreview(true)}
                className={`px-2 py-2 rounded-md text-xs border transition ${clientPreview ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <Eye className="h-3 w-3 inline mr-1" /> Client preview
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              Client preview shows exactly what the customer sees in their portal. All inputs and assumptions stay hidden.
            </p>
          </div>

          {!clientPreview && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Monthly revenue</div>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current</span>
                  <span className="text-foreground tabular-nums">{fmt(computed.currentRev)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-primary" /> Improved 50%</span>
                  <span className="text-primary tabular-nums">{fmt(computed.improvedMonthly)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border/60">
                  <span className="text-muted-foreground">At benchmark</span>
                  <span className="text-[hsl(140_50%_70%)] tabular-nums">{fmt(computed.bestRev)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      }
    >
      {clientPreview ? (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <Eye className="h-3.5 w-3.5" /> Client preview mode — this is exactly what your customer sees. Inputs and internal notes are hidden.
          </div>
          <RevenueLeakClientView data={data} computed={computed} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Leak breakdown — monthly</div>
                <div className="text-[11px] text-muted-foreground tabular-nums">Total {fmt(computed.totalMonthly)}/mo</div>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leakChartData} layout="vertical" margin={{ left: 10, right: 24, top: 8, bottom: 8 }}>
                    <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12, borderRadius: 8 }}
                      formatter={(v: any) => [fmt(Number(v)), "Monthly leak"]} />
                    <Bar dataKey="monthly" radius={[0, 4, 4, 0]}>
                      {leakChartData.map((d, i) => (
                        <Cell key={i} fill={leakColor(i, computed.biggest.key, computed.breakdown[i].key)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Scenario projection</div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={scenarioData} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12, borderRadius: 8 }}
                      formatter={(v: any) => [fmt(Number(v)), "Revenue / mo"]} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {scenarioData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "hsl(var(--muted-foreground) / 0.6)" : i === 1 ? "hsl(78 36% 50%)" : "hsl(140 50% 50%)"} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--foreground))" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {(insights.risks.length > 0 || insights.opportunities.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
                  <AlertTriangle className="h-3 w-3" /> Top Risks
                </div>
                {insights.risks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Funnel is performing at or above benchmark.</p>
                ) : (
                  <ul className="space-y-2">
                    {insights.risks.map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm text-foreground/90 leading-relaxed">
                        <span className="text-[hsl(0_70%_60%)] mt-1">●</span><span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
                  <Sparkles className="h-3 w-3" /> Opportunities
                </div>
                <ul className="space-y-2">
                  {insights.opportunities.map((o, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/90 leading-relaxed">
                      <span className="text-primary mt-1">●</span><span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* SYSTEM-WIDE LEAK ASSESSMENT (8 categories) */}
          <DiagnosticReport
            toolEyebrow="Revenue Leak Detection Engine™"
            categories={REVENUE_SYSTEM_CATEGORIES}
            severities={hydratedSystemSeverities}
            evidence={hydratedEvidence}
            result={systemDiagnostic}
            audience="admin"
          />
          <DiagnosticAdminPanel
            title="Revenue System Assessment"
            description="Diagnose leaks across the entire revenue system — market, lead capture, sales, pricing, delivery, retention, financial visibility, and owner dependency. Score each factor 0 (no leak) to 5 (severe), with rubric, evidence, and confidence."
            categories={REVENUE_SYSTEM_CATEGORIES}
            severities={hydratedSystemSeverities}
            onSeverityChange={(c, f, v) => setSeverity(c, f, v)}
            result={systemDiagnostic}
            baselineMonthly={data.system_baseline_monthly}
            onBaselineChange={(n) => set("system_baseline_monthly", n)}
            evidence={hydratedEvidence}
            onEvidenceChange={setEvidence}
          />

          {/* Inputs */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="mb-5">
              <h3 className="text-foreground">Lead → Response</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Top of funnel. Speed is the silent killer here.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field k="monthly_leads" label="Monthly leads" />
              <Field k="response_rate" label="Response rate" suffix="%" target={data.target_response_rate} />
              <Field k="response_speed_minutes" label="Response speed" suffix="min" target={data.target_response_speed} hint="Industry benchmark: under 5 minutes" />
              <Field k="follow_up_attempts" label="Follow-up attempts" target={data.target_follow_ups} />
              <Field k="missed_follow_ups" label="Missed follow-ups" suffix="%" target={data.target_missed_follow_ups} />
            </div>
          </section>

          <section className="bg-card border border-border rounded-xl p-6">
            <div className="mb-5">
              <h3 className="text-foreground">Calls → Close → Repeat</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Conversion stages and customer value.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field k="show_rate" label="Show rate" suffix="%" target={data.target_show_rate} />
              <Field k="close_rate" label="Close rate" suffix="%" target={data.target_close_rate} />
              <Field k="avg_ticket" label="Avg ticket" suffix="$" />
              <Field k="repeat_rate" label="Repeat rate (annual)" suffix="%" target={data.target_repeat_rate} />
            </div>
          </section>

          <details className="bg-card border border-border rounded-xl">
            <summary className="cursor-pointer p-5 text-sm text-foreground flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              Adjust target benchmarks (scenario testing)
              <span className="ml-auto text-[11px] text-muted-foreground">Defaults are industry-tested</span>
            </summary>
            <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field k="target_response_rate" label="Target response rate" suffix="%" />
              <Field k="target_response_speed" label="Target response speed" suffix="min" />
              <Field k="target_show_rate" label="Target show rate" suffix="%" />
              <Field k="target_close_rate" label="Target close rate" suffix="%" />
              <Field k="target_repeat_rate" label="Target repeat rate" suffix="%" />
              <Field k="target_follow_ups" label="Target follow-ups" />
              <Field k="target_missed_follow_ups" label="Target missed follow-ups" suffix="%" />
            </div>
          </details>

          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-foreground">Internal notes</h3>
              <p className="text-xs text-muted-foreground mt-0.5">For the RGS team only — never visible to the client.</p>
              <Textarea
                value={data.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Where does friction show up? Which leak is the priority fix? Internal hypotheses…"
                className="mt-3 bg-muted/30 border-border min-h-[100px]"
              />
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="text-foreground">Note for the client</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Shown at the bottom of the client view inside their portal.</p>
              <Textarea
                value={data.client_notes}
                onChange={(e) => set("client_notes", e.target.value)}
                placeholder="Plain-language summary, recommended focus, or context the client should see."
                className="mt-3 bg-muted/30 border-border min-h-[100px]"
              />
            </div>
          </section>
        </div>
      )}
    </ToolRunnerShell>
  );
}
