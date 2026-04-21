import { useState } from "react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const defaultData = {
  name: "",
  role: "",
  industry: "",
  company_size: "",
  revenue_range: "",
  goals: "",
  pains: "",
  triggers: "",
  objections: "",
  decision_criteria: "",
  channels: "",
  message: "",
};

const FIELDS: { key: keyof typeof defaultData; label: string; long?: boolean; placeholder?: string }[] = [
  { key: "name", label: "Persona name", placeholder: "Operator-Owner Olivia" },
  { key: "role", label: "Role / title", placeholder: "Founder / CEO" },
  { key: "industry", label: "Industry", placeholder: "Professional services" },
  { key: "company_size", label: "Company size", placeholder: "5–25 employees" },
  { key: "revenue_range", label: "Revenue range", placeholder: "$1M–$5M ARR" },
  { key: "goals", label: "Top 3 goals", long: true, placeholder: "Stabilize revenue, get out of delivery, hire ops lead…" },
  { key: "pains", label: "Top pains", long: true, placeholder: "Cash flow swings, owner-dependence, scattered tools…" },
  { key: "triggers", label: "Buying triggers", long: true, placeholder: "Missed forecast, hiring breakdown, scaling chaos…" },
  { key: "objections", label: "Common objections", long: true, placeholder: "“I’m too busy,” “We tried consultants before”…" },
  { key: "decision_criteria", label: "Decision criteria", long: true, placeholder: "ROI clarity, low time investment, proof…" },
  { key: "channels", label: "Where they hang out", long: true, placeholder: "LinkedIn, peer groups, podcasts…" },
  { key: "message", label: "Core message that resonates", long: true, placeholder: "We make your revenue predictable without owner dependence." },
];

export default function PersonaBuilderTool() {
  const [data, setData] = useState<any>(defaultData);
  const set = (k: string, v: string) => setData({ ...data, [k]: v });

  const filled = Object.values(data).filter((v) => String(v).trim()).length;
  const completion = Math.round((filled / FIELDS.length) * 100);

  return (
    <ToolRunnerShell
      toolKey="buyer_persona_tool"
      toolTitle="Buyer Persona Tool"
      description="Build precise buyer profiles tied to revenue motion. Use one persona per primary segment to align messaging, sales, and delivery."
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={(d) => ({ name: d.name, role: d.role, completion })}
      rightPanel={
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Persona Snapshot</div>
          <div className="text-foreground text-lg">{data.name || "Unnamed persona"}</div>
          <div className="text-xs text-muted-foreground">{[data.role, data.industry].filter(Boolean).join(" · ") || "Add role & industry"}</div>
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Completion</span>
              <span className="tabular-nums">{completion}%</span>
            </div>
            <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${completion}%` }} />
            </div>
          </div>
          {data.message && (
            <div className="mt-5 border-t border-border pt-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Resonant message</div>
              <p className="text-sm text-foreground italic">“{data.message}”</p>
            </div>
          )}
        </div>
      }
    >
      <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <label key={f.key} className={f.long ? "md:col-span-2 block" : "block"}>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{f.label}</span>
            {f.long ? (
              <Textarea
                value={data[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="mt-1 bg-muted/40 border-border min-h-[80px]"
              />
            ) : (
              <Input
                value={data[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="mt-1 bg-muted/40 border-border"
              />
            )}
          </label>
        ))}
      </div>
    </ToolRunnerShell>
  );
}