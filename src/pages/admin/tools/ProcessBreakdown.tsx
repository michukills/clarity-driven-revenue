import { useState, useMemo } from "react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowDown, Download, FileText, AlertTriangle, Clock, Wrench, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { downloadCSV, generateRunPdf } from "@/lib/exports";

type Step = {
  name: string;
  owner: string;
  duration_min: number;
  tools: string;
  bottleneck: string;
  fix: string;
  severity: 1 | 2 | 3;
  automation_potential: 1 | 2 | 3;
};

const newStep = (): Step => ({
  name: "",
  owner: "",
  duration_min: 0,
  tools: "",
  bottleneck: "",
  fix: "",
  severity: 1,
  automation_potential: 1,
});

const defaultData = {
  process_name: "",
  goal: "",
  current_outcome: "",
  desired_outcome: "",
  steps: [newStep(), newStep(), newStep()] as Step[],
};

const sevMeta = {
  1: { label: "Low", tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", color: "hsl(160 60% 45%)" },
  2: { label: "Medium", tone: "bg-amber-500/15 text-amber-400 border-amber-500/30", color: "hsl(38 92% 55%)" },
  3: { label: "High", tone: "bg-destructive/15 text-destructive border-destructive/30", color: "hsl(var(--destructive))" },
} as const;

const autoMeta = {
  1: "Manual",
  2: "Semi-auto",
  3: "Automatable",
} as const;

export default function ProcessBreakdownTool() {
  const [data, setData] = useState<any>(defaultData);

  const updateStep = (idx: number, k: keyof Step, v: any) => {
    const steps = [...data.steps];
    steps[idx] = { ...steps[idx], [k]: v };
    setData({ ...data, steps });
  };
  const addStep = () => setData({ ...data, steps: [...data.steps, newStep()] });
  const removeStep = (idx: number) =>
    setData({ ...data, steps: data.steps.filter((_: any, i: number) => i !== idx) });

  const totalMin = useMemo(
    () => data.steps.reduce((s: number, st: Step) => s + Number(st.duration_min || 0), 0),
    [data.steps],
  );
  const bottlenecks = data.steps.filter((s: Step) => s.bottleneck.trim()).length;
  const highSev = data.steps.filter((s: Step) => Number(s.severity) === 3).length;
  const automatable = data.steps.filter((s: Step) => Number(s.automation_potential) === 3).length;

  const chartData = useMemo(
    () =>
      data.steps.map((s: Step, i: number) => ({
        name: s.name || `Step ${i + 1}`,
        minutes: Number(s.duration_min) || 0,
        severity: Number(s.severity),
        color: sevMeta[(Number(s.severity) || 1) as 1 | 2 | 3].color,
      })),
    [data.steps],
  );

  const sevDistribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    data.steps.forEach((s: Step) => (counts[Number(s.severity)] = (counts[Number(s.severity)] || 0) + 1));
    return [
      { name: "Low", value: counts[1], color: sevMeta[1].color },
      { name: "Medium", value: counts[2], color: sevMeta[2].color },
      { name: "High", value: counts[3], color: sevMeta[3].color },
    ].filter((d) => d.value > 0);
  }, [data.steps]);

  // Insights
  const insights = useMemo(() => {
    const risks: string[] = [];
    const opps: string[] = [];
    const heaviest = [...data.steps].sort((a, b) => Number(b.duration_min) - Number(a.duration_min))[0];
    if (heaviest && Number(heaviest.duration_min) > 0 && totalMin > 0) {
      const pct = Math.round((Number(heaviest.duration_min) / totalMin) * 100);
      if (pct >= 30)
        risks.push(`"${heaviest.name || "A single step"}" consumes ${pct}% of total process time — single point of leverage.`);
    }
    if (highSev >= 2)
      risks.push(`${highSev} high-severity bottlenecks signal compounding fragility — fix in sequence, not parallel.`);
    if (automatable >= 2)
      opps.push(`${automatable} steps marked Automatable — bundle into a single automation sprint.`);
    const ownerCounts: Record<string, number> = {};
    data.steps.forEach((s: Step) => {
      if (s.owner.trim()) ownerCounts[s.owner] = (ownerCounts[s.owner] || 0) + 1;
    });
    const overloaded = Object.entries(ownerCounts).find(([_, n]) => n >= 3);
    if (overloaded) risks.push(`${overloaded[0]} owns ${overloaded[1]} steps — concentration risk.`);
    if (bottlenecks === 0 && data.steps.length >= 3)
      opps.push(`No bottlenecks logged — process is documented but unaudited; verify with operator interview.`);
    return { risks, opps };
  }, [data.steps, totalMin, highSev, automatable, bottlenecks]);

  const exportCSV = () => {
    const rows = data.steps.map((s: Step, i: number) => ({
      step_number: i + 1,
      name: s.name,
      owner: s.owner,
      duration_min: s.duration_min,
      tools: s.tools,
      severity: sevMeta[(Number(s.severity) || 1) as 1 | 2 | 3].label,
      automation_potential: autoMeta[(Number(s.automation_potential) || 1) as 1 | 2 | 3],
      bottleneck: s.bottleneck,
      proposed_fix: s.fix,
    }));
    downloadCSV(`process-breakdown-${(data.process_name || "untitled").replace(/\s+/g, "-")}.csv`, rows);
  };

  const exportPDF = () => {
    const sections: any[] = [
      { type: "heading", text: "Process Overview" },
      {
        type: "kv",
        pairs: [
          ["Process", data.process_name || "—"],
          ["Goal", data.goal || "—"],
          ["Current outcome", data.current_outcome || "—"],
          ["Desired outcome", data.desired_outcome || "—"],
          ["Total steps", String(data.steps.length)],
          ["Total time", `${totalMin} min`],
          ["Bottlenecks", String(bottlenecks)],
          ["High severity", String(highSev)],
          ["Automatable", String(automatable)],
        ],
      },
      { type: "heading", text: "Time Distribution by Step" },
    ];
    data.steps.forEach((s: Step, i: number) => {
      sections.push({
        type: "bar",
        label: `${i + 1}. ${s.name || "Untitled"} — ${sevMeta[(Number(s.severity) || 1) as 1 | 2 | 3].label}`,
        value: Number(s.duration_min) || 0,
        max: totalMin || 1,
        suffix: " min",
      });
    });
    sections.push({ type: "heading", text: "Step Detail" });
    data.steps.forEach((s: Step, i: number) => {
      sections.push({ type: "subheading", text: `Step ${i + 1}: ${s.name || "Untitled"}` });
      sections.push({
        type: "kv",
        pairs: [
          ["Owner", s.owner || "—"],
          ["Duration", `${s.duration_min || 0} min`],
          ["Tools", s.tools || "—"],
          ["Severity", sevMeta[(Number(s.severity) || 1) as 1 | 2 | 3].label],
          ["Automation", autoMeta[(Number(s.automation_potential) || 1) as 1 | 2 | 3]],
        ],
      });
      if (s.bottleneck) sections.push({ type: "paragraph", text: `Bottleneck: ${s.bottleneck}` });
      if (s.fix) sections.push({ type: "paragraph", text: `Proposed fix: ${s.fix}` });
      sections.push({ type: "rule" });
    });
    if (insights.risks.length || insights.opps.length) {
      sections.push({ type: "heading", text: "Insights" });
      if (insights.risks.length) {
        sections.push({ type: "subheading", text: "Top Risks" });
        insights.risks.forEach((r) => sections.push({ type: "paragraph", text: `• ${r}` }));
      }
      if (insights.opps.length) {
        sections.push({ type: "subheading", text: "Opportunities" });
        insights.opps.forEach((o) => sections.push({ type: "paragraph", text: `• ${o}` }));
      }
    }
    generateRunPdf(`process-breakdown-${(data.process_name || "untitled").replace(/\s+/g, "-")}.pdf`, {
      title: "Process Breakdown",
      subtitle: data.process_name || "Untitled process",
      meta: [
        ["Date", new Date().toLocaleDateString()],
        ["Steps", String(data.steps.length)],
        ["Total time", `${totalMin} min`],
      ],
      sections,
    });
  };

  return (
    <ToolRunnerShell
      toolKey="process_breakdown_tool"
      toolTitle="Process Clarity Engine™"
      description="Decompose a delivery process into steps, owners, time, and bottlenecks. Quantify severity and automation potential to surface the highest-leverage fix."
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={() => ({
        steps: data.steps.length,
        total_minutes: totalMin,
        bottlenecks,
        high_severity: highSev,
        automatable,
      })}
      rightPanel={
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Process Summary</div>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Steps" value={data.steps.length} />
              <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Minutes" value={totalMin} />
              <Stat icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Bottlenecks" value={bottlenecks} />
              <Stat
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                label="High sev."
                value={highSev}
                tone={highSev > 0 ? "text-destructive" : undefined}
              />
              <Stat
                icon={<Wrench className="h-3.5 w-3.5" />}
                label="Automatable"
                value={automatable}
                tone={automatable > 0 ? "text-primary" : undefined}
              />
              <Stat
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label="Avg/step"
                value={data.steps.length ? Math.round(totalMin / data.steps.length) : 0}
              />
            </div>
          </div>

          {sevDistribution.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Severity Mix</div>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sevDistribution}
                      dataKey="value"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={2}
                      stroke="hsl(var(--background))"
                    >
                      {sevDistribution.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-3 text-[10px] text-muted-foreground mt-1">
                {sevDistribution.map((d) => (
                  <span key={d.name} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} /> {d.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Export</div>
            <Button onClick={exportPDF} variant="outline" className="w-full justify-start border-border">
              <FileText className="h-4 w-4" /> Download PDF
            </Button>
            <Button onClick={exportCSV} variant="outline" className="w-full justify-start border-border">
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Process name</span>
            <Input
              value={data.process_name}
              onChange={(e) => setData({ ...data, process_name: e.target.value })}
              placeholder="e.g. Client onboarding"
              className="mt-1 bg-muted/40 border-border"
            />
          </label>
          <label>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Goal of this process</span>
            <Input
              value={data.goal}
              onChange={(e) => setData({ ...data, goal: e.target.value })}
              placeholder="What outcome does it produce?"
              className="mt-1 bg-muted/40 border-border"
            />
          </label>
          <label>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Current outcome</span>
            <Textarea
              value={data.current_outcome}
              onChange={(e) => setData({ ...data, current_outcome: e.target.value })}
              placeholder="What's happening today?"
              className="mt-1 bg-muted/40 border-border min-h-[60px]"
            />
          </label>
          <label>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Desired outcome</span>
            <Textarea
              value={data.desired_outcome}
              onChange={(e) => setData({ ...data, desired_outcome: e.target.value })}
              placeholder="What should happen instead?"
              className="mt-1 bg-muted/40 border-border min-h-[60px]"
            />
          </label>
        </div>

        {chartData.some((c: any) => c.minutes > 0) && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Time per step · color = severity
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => [`${v} min`, "Duration"]}
                  />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                    {chartData.map((d: any, i: number) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {data.steps.map((s: Step, idx: number) => {
            const meta = sevMeta[(Number(s.severity) || 1) as 1 | 2 | 3];
            return (
              <div key={idx}>
                <div
                  className="bg-card border rounded-xl p-5 transition-colors"
                  style={{ borderColor: Number(s.severity) === 3 ? meta.color : undefined }}
                >
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span
                      className="h-7 w-7 rounded-full text-xs flex items-center justify-center tabular-nums font-medium"
                      style={{ background: `${meta.color}25`, color: meta.color }}
                    >
                      {idx + 1}
                    </span>
                    <Input
                      value={s.name}
                      onChange={(e) => updateStep(idx, "name", e.target.value)}
                      placeholder="Step name"
                      className="bg-muted/40 border-border max-w-sm"
                    />
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${meta.tone}`}>
                      {meta.label} severity
                    </span>
                    {Number(s.automation_potential) === 3 && (
                      <span className="px-2 py-0.5 rounded text-[10px] border bg-primary/15 text-primary border-primary/30">
                        Automatable
                      </span>
                    )}
                    <button
                      onClick={() => removeStep(idx)}
                      className="ml-auto text-muted-foreground hover:text-destructive p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <label>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Owner</span>
                      <Input
                        value={s.owner}
                        onChange={(e) => updateStep(idx, "owner", e.target.value)}
                        className="mt-1 bg-muted/40 border-border"
                      />
                    </label>
                    <label>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Duration (min)</span>
                      <Input
                        type="number"
                        value={s.duration_min}
                        onChange={(e) => updateStep(idx, "duration_min", Number(e.target.value))}
                        className="mt-1 bg-muted/40 border-border"
                      />
                    </label>
                    <label>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Severity</span>
                      <select
                        value={s.severity}
                        onChange={(e) => updateStep(idx, "severity", Number(e.target.value))}
                        className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
                      >
                        <option value={1}>Low</option>
                        <option value={2}>Medium</option>
                        <option value={3}>High</option>
                      </select>
                    </label>
                    <label>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Automation</span>
                      <select
                        value={s.automation_potential}
                        onChange={(e) => updateStep(idx, "automation_potential", Number(e.target.value))}
                        className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
                      >
                        <option value={1}>Manual</option>
                        <option value={2}>Semi-auto</option>
                        <option value={3}>Automatable</option>
                      </select>
                    </label>
                    <label className="md:col-span-4">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Tools / systems used
                      </span>
                      <Input
                        value={s.tools}
                        onChange={(e) => updateStep(idx, "tools", e.target.value)}
                        className="mt-1 bg-muted/40 border-border"
                      />
                    </label>
                    <label className="md:col-span-4">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Bottleneck / breakdown
                      </span>
                      <Textarea
                        value={s.bottleneck}
                        onChange={(e) => updateStep(idx, "bottleneck", e.target.value)}
                        className="mt-1 bg-muted/40 border-border min-h-[60px]"
                      />
                    </label>
                    <label className="md:col-span-4">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Proposed fix</span>
                      <Textarea
                        value={s.fix}
                        onChange={(e) => updateStep(idx, "fix", e.target.value)}
                        className="mt-1 bg-muted/40 border-border min-h-[60px]"
                      />
                    </label>
                  </div>
                </div>
                {idx < data.steps.length - 1 && (
                  <div className="flex justify-center py-1 text-muted-foreground">
                    <ArrowDown className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={addStep}
          className="w-full bg-card border border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40"
        >
          + Add step
        </button>

        {(insights.risks.length > 0 || insights.opps.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.risks.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-destructive mb-3">
                  <AlertTriangle className="h-3.5 w-3.5" /> Top Risks
                </div>
                <ul className="space-y-2">
                  {insights.risks.map((r, i) => (
                    <li key={i} className="text-sm text-foreground/90 flex gap-2">
                      <span className="text-destructive">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insights.opps.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-3">
                  <TrendingUp className="h-3.5 w-3.5" /> Opportunities
                </div>
                <ul className="space-y-2">
                  {insights.opps.map((o, i) => (
                    <li key={i} className="text-sm text-foreground/90 flex gap-2">
                      <span className="text-primary">•</span>
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolRunnerShell>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <div className="bg-muted/30 border border-border/50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`text-xl mt-1 tabular-nums ${tone || "text-foreground"}`}>{value}</div>
    </div>
  );
}
