import { useState } from "react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

type Stage = {
  name: string;
  customer_action: string;
  touchpoint: string;
  emotion: string;
  pain: string;
  opportunity: string;
};

const newStage = (name = ""): Stage => ({
  name,
  customer_action: "",
  touchpoint: "",
  emotion: "",
  pain: "",
  opportunity: "",
});

const defaultData = {
  stages: [
    newStage("Awareness"),
    newStage("Consideration"),
    newStage("Decision"),
    newStage("Onboarding"),
    newStage("Delivery"),
    newStage("Retention"),
  ] as Stage[],
};

export default function JourneyMapperTool() {
  const [data, setData] = useState<any>(defaultData);

  const updateStage = (idx: number, k: keyof Stage, v: string) => {
    const stages = [...data.stages];
    stages[idx] = { ...stages[idx], [k]: v };
    setData({ ...data, stages });
  };
  const addStage = () => setData({ ...data, stages: [...data.stages, newStage()] });
  const removeStage = (idx: number) =>
    setData({ ...data, stages: data.stages.filter((_: any, i: number) => i !== idx) });

  const summary = (d: any) => ({
    stages: d.stages.length,
    pains: d.stages.filter((s: Stage) => s.pain.trim()).length,
    opportunities: d.stages.filter((s: Stage) => s.opportunity.trim()).length,
  });

  return (
    <ToolRunnerShell
      toolKey="customer_journey_mapper"
      toolTitle="Customer Journey Mapper"
      description="Map the full lifecycle from awareness to retention. Identify breakdowns, emotions, and the single biggest opportunity at each stage."
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={summary}
      rightPanel={
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Journey Overview</div>
          <ul className="space-y-2">
            {data.stages.map((s: Stage, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-foreground truncate">{s.name || `Stage ${i + 1}`}</span>
                {s.pain && <span className="ml-auto text-[10px] text-destructive">pain</span>}
              </li>
            ))}
          </ul>
          <button
            onClick={addStage}
            className="mt-4 w-full text-xs text-primary border border-primary/30 rounded-md py-2 hover:bg-primary/10"
          >
            + Add stage
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {data.stages.map((s: Stage, idx: number) => (
          <div key={idx} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-7 w-7 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center tabular-nums">{idx + 1}</span>
              <Input
                value={s.name}
                onChange={(e) => updateStage(idx, "name", e.target.value)}
                placeholder="Stage name"
                className="bg-muted/40 border-border max-w-xs"
              />
              <button
                onClick={() => removeStage(idx)}
                className="ml-auto text-muted-foreground hover:text-destructive p-2"
                aria-label="Remove stage"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {([
                ["customer_action", "Customer action"],
                ["touchpoint", "Touchpoint"],
                ["emotion", "Emotion"],
                ["pain", "Pain / breakdown"],
                ["opportunity", "Opportunity"],
              ] as [keyof Stage, string][]).map(([k, label]) => (
                <label key={k} className={k === "opportunity" ? "md:col-span-2" : ""}>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
                  <Textarea
                    value={s[k]}
                    onChange={(e) => updateStage(idx, k, e.target.value)}
                    className="mt-1 bg-muted/40 border-border min-h-[60px]"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ToolRunnerShell>
  );
}