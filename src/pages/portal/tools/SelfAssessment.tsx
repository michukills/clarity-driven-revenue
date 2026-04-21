import { useState } from "react";
import { ClientToolShell } from "@/components/tools/ClientToolShell";

const PILLARS = [
  { key: "clarity", label: "Revenue Clarity", desc: "We know exactly where revenue comes from and where it leaks." },
  { key: "offer", label: "Offer Stability", desc: "Our core offers are clear, repeatable, and resonate with the right buyers." },
  { key: "delivery", label: "Delivery System", desc: "Delivery is documented and consistent across every client." },
  { key: "team", label: "Team Capacity", desc: "Roles, ownership, and capacity are clear inside our team." },
  { key: "growth", label: "Growth Engine", desc: "We have a predictable engine for generating new revenue." },
];

const defaultData = Object.fromEntries(PILLARS.map((p) => [p.key, 5]));

export default function ClientSelfAssessment() {
  const [data, setData] = useState<Record<string, number>>(defaultData);
  const total = Object.values(data).reduce((a, b) => a + Number(b || 0), 0);
  const max = PILLARS.length * 10;
  const pct = Math.round((total / max) * 100);

  return (
    <ClientToolShell
      toolKey="client_self_assessment"
      toolTitle="Stability Self-Assessment"
      description="Rate each of the five RGS pillars from 1 to 10 to surface where your business needs the most attention."
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={(d) => {
        const t = (Object.values(d) as number[]).reduce<number>((a, b) => a + Number(b || 0), 0);
        return { total: t, percentage: Math.round((t / max) * 100) };
      }}
      rightPanel={
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Overall</div>
          <div className="text-3xl text-foreground">{total}<span className="text-base text-muted-foreground">/{max}</span></div>
          <div className="text-xs text-muted-foreground mt-1">{pct}% stable</div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      }
    >
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        {PILLARS.map((p) => (
          <div key={p.key} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-sm text-foreground">{p.label}</div>
                <div className="text-xs text-muted-foreground mt-1 max-w-md">{p.desc}</div>
              </div>
              <div className="text-2xl text-foreground tabular-nums w-12 text-right">{data[p.key]}</div>
            </div>
            <input
              type="range" min={1} max={10} value={data[p.key]}
              onChange={(e) => setData({ ...data, [p.key]: Number(e.target.value) })}
              className="w-full mt-3 accent-primary"
            />
          </div>
        ))}
      </div>
    </ClientToolShell>
  );
}
