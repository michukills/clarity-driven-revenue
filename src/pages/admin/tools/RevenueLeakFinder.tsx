import { useState, useMemo } from "react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertTriangle, TrendingUp, Sparkles, Info } from "lucide-react";
import { generateRunPdf, downloadCSV } from "@/lib/exports";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

/* ───────────────────────────── Helpers ───────────────────────────── */

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const pct = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

/* ───────────────────────────── Data model ───────────────────────────── */

const defaultData = {
  // funnel inputs
  monthly_leads: 100,
  response_rate: 70,            // % of leads responded to
  response_speed_minutes: 240,  // avg response time in minutes
  show_rate: 60,                // % of booked calls that show
  close_rate: 25,               // % closed
  avg_ticket: 5000,             // $ per closed deal
  repeat_rate: 15,              // % of customers who buy again in a year
  follow_up_attempts: 2,        // avg attempts per lead
  missed_follow_ups: 35,        // % of leads that drop without proper follow-up

  // industry-tested benchmarks (editable)
  target_response_rate: 95,
  target_response_speed: 5,     // minutes (5-min rule)
  target_show_rate: 80,
  target_close_rate: 35,
  target_repeat_rate: 30,
  target_follow_ups: 6,
  target_missed_follow_ups: 10,

  notes: "",
};

type Data = typeof defaultData;

/* ───────────────────────────── Leak engine ───────────────────────────── */

/**
 * Each leak is computed as: revenue we *would* have captured at benchmark
 * minus revenue we capture today, isolating one variable at a time so
 * leaks don't double-count.
 *
 * Baseline funnel: leads × response × show × close × avg_ticket
 * Each "fixed" leak rerun the funnel with one variable upgraded to target.
 */
function computeLeaks(d: Data) {
  const leads = Math.max(0, d.monthly_leads);
  const r = d.response_rate / 100;
  const s = d.show_rate / 100;
  const c = d.close_rate / 100;
  const ticket = Math.max(0, d.avg_ticket);

  const tR = d.target_response_rate / 100;
  const tS = d.target_show_rate / 100;
  const tC = d.target_close_rate / 100;

  // Current monthly revenue
  const currentSales = leads * r * s * c;
  const currentRev = currentSales * ticket;

  // Best-case (all targets hit)
  const bestSales = leads * tR * tS * tC;
  const bestRev = bestSales * ticket;

  // Per-stage isolated leak: upgrade one stage to target, hold others at current
  const responseLeak = Math.max(0, leads * tR * s * c * ticket - currentRev);
  const showLeak = Math.max(0, leads * r * tS * c * ticket - currentRev);
  const closeLeak = Math.max(0, leads * r * s * tC * ticket - currentRev);

  // Speed leak — based on the 5-minute rule. Slow response converts ~5x worse than fast.
  // Linear penalty model: every 30 min over target reduces effective conversion by 5% (cap at 60%).
  const speedPenalty = Math.min(0.6, Math.max(0, (d.response_speed_minutes - d.target_response_speed) / 30) * 0.05);
  // Speed leak is the additional revenue if we instantly responded (current funnel × 1/(1-penalty) − current)
  const speedLeak = speedPenalty > 0 ? currentRev / (1 - speedPenalty) - currentRev : 0;

  // Follow-up leak — missed follow-ups are leads that never got worked. They would have
  // converted at the current close rate from response onward.
  const missedDelta = Math.max(0, (d.missed_follow_ups - d.target_missed_follow_ups) / 100);
  const missedLeads = leads * missedDelta;
  const followUpLeak = missedLeads * s * c * ticket;

  // Repeat / retention leak — annualized then divided by 12 to express monthly
  const customersPerMonth = currentSales;
  const repeatDelta = Math.max(0, (d.target_repeat_rate - d.repeat_rate) / 100);
  const repeatLeakAnnual = customersPerMonth * 12 * repeatDelta * ticket;
  const repeatLeak = repeatLeakAnnual / 12;

  const breakdown = [
    { key: "response", label: "Response rate", monthly: responseLeak, why: "Leads not contacted at all." },
    { key: "speed", label: "Response speed", monthly: speedLeak, why: "Slow first contact tanks conversion (the 5-minute rule)." },
    { key: "show", label: "Show rate", monthly: showLeak, why: "Booked calls that don't show up." },
    { key: "close", label: "Close rate", monthly: closeLeak, why: "Calls that show but don't close." },
    { key: "followup", label: "Missed follow-ups", monthly: followUpLeak, why: "Leads dropped before reaching close stage." },
    { key: "repeat", label: "Repeat / retention", monthly: repeatLeak, why: "Existing customers never bought again." },
  ].map((l) => ({ ...l, monthly: Math.round(l.monthly), annual: Math.round(l.monthly * 12) }));

  const totalMonthly = breakdown.reduce((s, l) => s + l.monthly, 0);
  const totalAnnual = totalMonthly * 12;

  const sortedDesc = [...breakdown].sort((a, b) => b.monthly - a.monthly);
  const biggest = sortedDesc[0];

  // Improved scenario (50% closure of every gap)
  const improvedMonthly = currentRev + totalMonthly * 0.5;
  const improvedAnnual = improvedMonthly * 12;

  return {
    currentRev,
    bestRev,
    breakdown,
    biggest,
    totalMonthly,
    totalAnnual,
    improvedMonthly,
    improvedAnnual,
    currentSales,
    bestSales,
  };
}

/* ───────────────────────────── Insights ───────────────────────────── */

function generateInsights(d: Data, c: ReturnType<typeof computeLeaks>) {
  const risks: string[] = [];
  const opportunities: string[] = [];

  if (c.biggest.monthly > 0) {
    risks.push(
      `Biggest single leak is ${c.biggest.label.toLowerCase()} — ${fmt(c.biggest.monthly)}/mo (${fmt(c.biggest.annual)}/yr). ${c.biggest.why}`,
    );
  }
  if (d.response_speed_minutes > d.target_response_speed * 6) {
    risks.push(`Response time of ${d.response_speed_minutes} min is ${Math.round(d.response_speed_minutes / d.target_response_speed)}× slower than target — conversion is silently dropping.`);
  }
  if (d.missed_follow_ups > 25) {
    risks.push(`${d.missed_follow_ups}% of leads never get worked properly — pure dead-weight in the pipeline.`);
  }
  if (d.repeat_rate < 15) {
    risks.push(`Repeat rate of ${d.repeat_rate}% means almost every dollar has to be re-earned. No compounding.`);
  }
  if (d.close_rate > d.target_close_rate * 0.9) {
    opportunities.push(`Close rate (${d.close_rate}%) is already near benchmark — the bottleneck is upstream, not in the sales conversation.`);
  }
  if (c.improvedMonthly > c.currentRev * 1.4) {
    opportunities.push(`Closing just 50% of these leaks would add ${fmt(c.improvedMonthly - c.currentRev)}/mo (${fmt((c.improvedMonthly - c.currentRev) * 12)}/yr) without a single new lead.`);
  } else if (c.totalMonthly > 0) {
    opportunities.push(`Recovering half of the identified leaks would add ${fmt((c.improvedMonthly - c.currentRev))}/mo — system fixes outperform new lead spend here.`);
  }

  return { risks, opportunities };
}

/* ───────────────────────────── Component ───────────────────────────── */

export default function RevenueLeakFinderTool() {
  const [data, setData] = useState<Data>(defaultData);
  const set = (k: keyof Data, v: any) => setData({ ...data, [k]: v });

  const computed = useMemo(() => computeLeaks(data), [data]);
  const insights = useMemo(() => generateInsights(data, computed), [data, computed]);

  const summary = (d: Data) => {
    const c = computeLeaks(d);
    return {
      monthly_leak: c.totalMonthly,
      annual_leak: c.totalAnnual,
      biggest_leak: c.biggest.label,
      improved_monthly: Math.round(c.improvedMonthly),
    };
  };

  /* ───────── Charts ───────── */

  const leakChartData = computed.breakdown.map((l) => ({
    name: l.label,
    monthly: l.monthly,
  }));

  const scenarioData = [
    { name: "Current", revenue: Math.round(computed.currentRev) },
    { name: "Improved (50%)", revenue: Math.round(computed.improvedMonthly) },
    { name: "At benchmark", revenue: Math.round(computed.bestRev) },
  ];

  const leakColor = (idx: number, biggestKey: string, key: string) =>
    key === biggestKey ? "hsl(0 70% 55%)" : ["hsl(78 36% 55%)", "hsl(78 36% 45%)", "hsl(78 30% 40%)", "hsl(78 24% 35%)", "hsl(78 18% 30%)"][idx % 5];

  /* ───────── Exports ───────── */

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
      ...computed.breakdown.map((l) => ({
        section: "Leak",
        metric: l.label,
        value: l.monthly,
        target: l.annual,
        unit: "$ monthly | $ annual",
      })),
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
      title: "Revenue Leak Finder",
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
        {
          type: "kv",
          pairs: [
            ["Current revenue", `${fmt(computed.currentRev)} / mo  ·  ${fmt(computed.currentRev * 12)} / yr`],
            ["Improved (50% gap closed)", `${fmt(computed.improvedMonthly)} / mo  ·  ${fmt(computed.improvedAnnual)} / yr`],
            ["At full benchmark", `${fmt(computed.bestRev)} / mo  ·  ${fmt(computed.bestRev * 12)} / yr`],
          ],
        },
        { type: "heading", text: "Top risks" },
        ...(insights.risks.length
          ? insights.risks.map((r) => ({ type: "paragraph" as const, text: `• ${r}` }))
          : [{ type: "paragraph" as const, text: "No critical leaks identified — funnel is running at or above benchmark." }]),
        { type: "heading", text: "Opportunities" },
        ...insights.opportunities.map((o) => ({ type: "paragraph" as const, text: `• ${o}` })),
        { type: "heading", text: "Funnel inputs vs. benchmarks" },
        {
          type: "kv",
          pairs: [
            ["Monthly leads", String(data.monthly_leads)],
            ["Response rate", `${pct(data.response_rate)}  (target ${pct(data.target_response_rate)})`],
            ["Response speed", `${data.response_speed_minutes} min  (target ${data.target_response_speed} min)`],
            ["Show rate", `${pct(data.show_rate)}  (target ${pct(data.target_show_rate)})`],
            ["Close rate", `${pct(data.close_rate)}  (target ${pct(data.target_close_rate)})`],
            ["Avg ticket", fmt(data.avg_ticket)],
            ["Repeat rate", `${pct(data.repeat_rate)}  (target ${pct(data.target_repeat_rate)})`],
            ["Follow-up attempts", `${data.follow_up_attempts}  (target ${data.target_follow_ups})`],
            ["Missed follow-ups", `${pct(data.missed_follow_ups)}  (target ${pct(data.target_missed_follow_ups)})`],
          ],
        },
        ...(data.notes
          ? [
              { type: "heading" as const, text: "Diagnostic notes" },
              { type: "paragraph" as const, text: data.notes },
            ]
          : []),
      ],
    });
  };

  /* ───────── Field helper ───────── */

  const Field = ({
    k,
    label,
    suffix,
    target,
    hint,
  }: {
    k: keyof Data;
    label: string;
    suffix?: string;
    target?: number;
    hint?: string;
  }) => {
    const val = data[k] as number;
    const off = target !== undefined && val !== undefined && (
      // for "lower is better" metrics
      ["response_speed_minutes", "missed_follow_ups"].includes(k as string)
        ? val > target
        : val < target
    );
    return (
      <label className="block">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
          {target !== undefined && (
            <span className={`text-[10px] tabular-nums ${off ? "text-[hsl(0_70%_65%)]" : "text-[hsl(78_36%_60%)]"}`}>
              target {target}
              {suffix === "%" ? "%" : suffix === " min" ? " min" : ""}
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
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
          )}
        </div>
        {hint && <span className="text-[10px] text-muted-foreground/80 mt-1 block">{hint}</span>}
      </label>
    );
  };

  /* ───────── Render ───────── */

  return (
    <ToolRunnerShell
      toolKey="revenue_leak_finder"
      toolTitle="Revenue Leak Finder"
      description="Quantify where revenue is being lost between lead, conversion, and retention. Compare current funnel performance against proven benchmarks and project the upside of fixing each leak."
      data={data}
      setData={setData as any}
      defaultData={defaultData}
      computeSummary={summary}
      rightPanel={
        <div className="space-y-4">
          {/* Hero */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Estimated annual leak
            </div>
            <div className="font-display text-4xl text-[hsl(0_70%_60%)] tabular-nums leading-none">
              {fmt(computed.totalAnnual)}
            </div>
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
              <Button onClick={exportPdf} variant="outline" size="sm" className="border-border">
                <FileText className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button onClick={exportCsv} variant="outline" size="sm" className="border-border">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>

          {/* Scenario summary */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Monthly revenue</div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current</span>
                <span className="text-foreground tabular-nums">{fmt(computed.currentRev)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" /> Improved 50%
                </span>
                <span className="text-primary tabular-nums">{fmt(computed.improvedMonthly)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border/60">
                <span className="text-muted-foreground">At benchmark</span>
                <span className="text-[hsl(140_50%_70%)] tabular-nums">{fmt(computed.bestRev)}</span>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Leak breakdown — monthly
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                Total {fmt(computed.totalMonthly)}/mo
              </div>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leakChartData} layout="vertical" margin={{ left: 10, right: 24, top: 8, bottom: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                      borderRadius: 8,
                    }}
                    formatter={(v: any) => [fmt(Number(v)), "Monthly leak"]}
                  />
                  <Bar dataKey="monthly" radius={[0, 4, 4, 0]}>
                    {leakChartData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={leakColor(i, computed.biggest.key, computed.breakdown[i].key)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Scenario projection
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={scenarioData} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                      borderRadius: 8,
                    }}
                    formatter={(v: any) => [fmt(Number(v)), "Revenue / mo"]}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {scenarioData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          i === 0
                            ? "hsl(var(--muted-foreground) / 0.6)"
                            : i === 1
                              ? "hsl(78 36% 50%)"
                              : "hsl(140 50% 50%)"
                        }
                      />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Insights strip */}
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
                      <span className="text-[hsl(0_70%_60%)] mt-1">●</span>
                      <span>{r}</span>
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
                    <span className="text-primary mt-1">●</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Inputs sections */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-foreground">Lead → Response</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Top of funnel. Speed is the silent killer here.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field k="monthly_leads" label="Monthly leads" />
            <Field k="response_rate" label="Response rate" suffix="%" target={data.target_response_rate} />
            <Field
              k="response_speed_minutes"
              label="Response speed"
              suffix="min"
              target={data.target_response_speed}
              hint="Industry benchmark: under 5 minutes"
            />
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
            Adjust target benchmarks
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

        <section className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-foreground mb-3">Diagnostic notes</h3>
          <Textarea
            value={data.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Where does friction show up? What stage breaks first? Which leak is the priority fix?"
            className="bg-muted/30 border-border min-h-[120px]"
          />
        </section>
      </div>
    </ToolRunnerShell>
  );
}