import { useState, useMemo } from "react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ArrowDown } from "lucide-react";

type Step = {
  name: string;
  owner: string;
  duration_min: number;
  tools: string;
  bottleneck: string;
  fix: string;
  severity: 1 | 2 | 3;
};

const newStep = (): Step => ({
  name: "",
  owner: "",
  duration_min: 0,
  tools: "",
  bottleneck: "",
  fix: "",
  severity: 1,
});

const defaultData = {
  process_name: "",
  goal: "",
  steps: [newStep(), newStep(), newStep()] as Step[],
};

const sevLabel = { 1: "Low", 2: "Medium", 3: "High" } as const;
const sevTone = {
  1: "bg-muted/40 text-muted-foreground",
  2: "bg-amber-500/15 text-amber-400",
  3: "bg-destructive/15 text-destructive",
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

  return (
    <ToolRunnerShell
      toolKey="process_breakdown_tool"
      toolTitle="Process Breakdown Tool"
      description="Break a delivery process into steps, owners, and bottlenecks. Quantify time and severity to surface the highest-leverage fix."
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={() => ({ steps: data.steps.length, total_minutes: totalMin, bottlenecks, high_severity: highSev })}
      rightPanel={
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Process Summary</div>
          <div className="space-y-3 mt-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total steps</span>
              <span className="text-foreground tabular-nums">{data.steps.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total time</span>
              <span className="text-foreground tabular-nums">{totalMin} min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bottlenecks</span>
              <span className="text-foreground tabular-nums">{bottlenecks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">High severity</span>
              <span className="text-destructive tabular-nums">{highSev}</span>
            </div>
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
        </div>

        <div className="space-y-3">
          {data.steps.map((s: Step, idx: number) => (
            <div key={idx}>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="h-7 w-7 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center tabular-nums">{idx + 1}</span>
                  <Input
                    value={s.name}
                    onChange={(e) => updateStep(idx, "name", e.target.value)}
                    placeholder="Step name"
                    className="bg-muted/40 border-border max-w-sm"
                  />
                  <span className={`ml-2 px-2 py-0.5 rounded text-[10px] ${sevTone[s.severity as 1 | 2 | 3]}`}>
                    {sevLabel[s.severity as 1 | 2 | 3]} severity
                  </span>
                  <button
                    onClick={() => removeStep(idx)}
                    className="ml-auto text-muted-foreground hover:text-destructive p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  <label className="md:col-span-3">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Tools / systems used</span>
                    <Input
                      value={s.tools}
                      onChange={(e) => updateStep(idx, "tools", e.target.value)}
                      className="mt-1 bg-muted/40 border-border"
                    />
                  </label>
                  <label className="md:col-span-3">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Bottleneck / breakdown</span>
                    <Textarea
                      value={s.bottleneck}
                      onChange={(e) => updateStep(idx, "bottleneck", e.target.value)}
                      className="mt-1 bg-muted/40 border-border min-h-[60px]"
                    />
                  </label>
                  <label className="md:col-span-3">
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
          ))}
        </div>

        <button
          onClick={addStep}
          className="w-full bg-card border border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40"
        >
          + Add step
        </button>
      </div>
    </ToolRunnerShell>
  );
}