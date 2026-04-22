import { useState } from "react";
import { ClientToolShell } from "@/components/tools/ClientToolShell";
import { Textarea } from "@/components/ui/textarea";

const FIELDS = [
  { key: "wins", label: "Wins this week", placeholder: "What went well? What moved forward?" },
  { key: "blockers", label: "Blockers", placeholder: "What slowed you down? What needs RGS support?" },
  { key: "metrics", label: "Key numbers", placeholder: "Revenue, leads, conversion, fulfillment notes…" },
  { key: "next_week", label: "Focus for next week", placeholder: "Top 1–3 priorities" },
  { key: "support", label: "Support requested", placeholder: "What do you need from RGS?" },
];

const defaultData = Object.fromEntries(FIELDS.map((f) => [f.key, ""]));

export default function WeeklyReflection() {
  const [data, setData] = useState<Record<string, string>>(defaultData);
  const filled = FIELDS.filter((f) => (data[f.key] || "").trim().length > 0).length;

  return (
    <ClientToolShell
      toolKey="client_weekly_reflection"
      toolTitle="Weekly Reflection"
      description="A short structured weekly check-in. Saved entries become a running operational journal RGS can review with you."
      entryNoun="reflection"
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={(d) => ({ filled: FIELDS.filter((f) => (d[f.key] || "").trim().length > 0).length })}
      rightPanel={
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Completion</div>
          <div className="text-3xl text-foreground">{filled}<span className="text-base text-muted-foreground">/{FIELDS.length}</span></div>
          <div className="text-xs text-muted-foreground mt-1">sections completed</div>
        </div>
      }
    >
      <div className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="bg-card border border-border rounded-xl p-5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</label>
            <Textarea
              value={data[f.key]}
              onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              rows={3}
              className="mt-2 bg-muted/30 border-border resize-none"
            />
          </div>
        ))}
      </div>
    </ClientToolShell>
  );
}
