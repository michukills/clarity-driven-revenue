import { useState, useMemo } from "react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { pillars } from "@/components/scorecard/scorecardData";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { generateRunPdf } from "@/lib/exports";

const defaultData = {
  answers: pillars.reduce((acc, p) => {
    acc[p.id] = p.questions.map(() => -1);
    return acc;
  }, {} as Record<string, number[]>),
  notes: "",
};

const band = (score: number) => {
  if (score < 300) return { label: "Unstable system", tone: "destructive" };
  if (score < 600) return { label: "Inconsistent performance", tone: "warning" };
  if (score < 800) return { label: "Structured but limited", tone: "secondary" };
  return { label: "Stable and scalable", tone: "primary" };
};

export default function StabilityScorecardTool() {
  const [data, setData] = useState<any>(defaultData);

  const pillarScore = (id: string) =>
    (data.answers[id] || []).reduce((s: number, v: number) => s + (v >= 0 ? v : 0), 0);

  const total = useMemo(
    () => pillars.reduce((s, p) => s + pillarScore(p.id), 0),
    [data],
  );

  const setAnswer = (pid: string, qIdx: number, value: number) => {
    setData({
      ...data,
      answers: {
        ...data.answers,
        [pid]: data.answers[pid].map((v: number, i: number) => (i === qIdx ? value : v)),
      },
    });
  };

  const summary = (d: any) => {
    const ranked = pillars.map((p) => ({
      title: p.title,
      score: (d.answers[p.id] || []).reduce((s: number, v: number) => s + (v >= 0 ? v : 0), 0),
    }));
    const totalLocal = ranked.reduce((s, r) => s + r.score, 0);
    return { total: totalLocal, band: band(totalLocal).label, lowest: [...ranked].sort((a, b) => a.score - b.score)[0]?.title };
  };

  const b = band(total);

  const exportPdf = () => {
    generateRunPdf(`stability-scorecard-${new Date().toISOString().slice(0, 10)}`, {
      title: "RGS Stability Scorecard",
      subtitle: "Diagnostic of foundational business stability across the 5 RGS pillars.",
      meta: [
        ["Total score", `${total} / 1,000`],
        ["Banding", b.label],
        ["Date", new Date().toLocaleDateString()],
      ],
      sections: [
        { type: "heading", text: "Pillar breakdown" },
        ...pillars.map((p) => ({
          type: "bar" as const,
          label: p.title,
          value: pillarScore(p.id),
          max: 200,
        })),
        { type: "spacer" },
        { type: "heading", text: "Summary" },
        {
          type: "paragraph",
          text: `This business currently scores ${total} out of 1,000 on the RGS Stability Framework, placing it in the "${b.label}" band. The lowest-scoring pillar is the highest-leverage starting point for stabilization work.`,
        },
        ...(data.notes
          ? [
              { type: "heading" as const, text: "Notes" },
              { type: "paragraph" as const, text: data.notes },
            ]
          : []),
      ],
    });
  };

  return (
    <ToolRunnerShell
      toolKey="rgs_stability_scorecard"
      toolTitle="RGS Stability Scorecard"
      description="Score a business across the 5 RGS pillars to surface foundational risk. Each pillar has 5 questions on a 0–40 scale (max 1,000)."
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={summary}
      rightPanel={
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total Score</div>
          <div className="font-display text-5xl text-foreground tabular-nums">{total}</div>
          <div className="text-xs text-muted-foreground">/ 1,000</div>
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs bg-primary/15 text-primary">{b.label}</div>
          <Button onClick={exportPdf} variant="outline" className="border-border w-full mt-4" size="sm">
            <Download className="h-3.5 w-3.5" /> Export PDF
          </Button>
          <div className="mt-5 space-y-2">
            {pillars.map((p) => {
              const s = pillarScore(p.id);
              const pct = (s / 200) * 100;
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>{p.title}</span>
                    <span className="tabular-nums">{s}/200</span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {pillars.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground">{p.title}</h3>
              <span className="text-xs text-muted-foreground tabular-nums">{pillarScore(p.id)}/200</span>
            </div>
            <div className="space-y-4">
              {p.questions.map((q, qi) => (
                <div key={qi} className="border-t border-border/40 pt-3 first:border-0 first:pt-0">
                  <div className="text-sm text-foreground mb-2">{q.text}</div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {q.options.map((opt) => {
                      const selected = data.answers[p.id][qi] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setAnswer(p.id, qi, opt.value)}
                          className={`px-2 py-2 rounded-md text-[11px] border text-left transition-colors ${
                            selected
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="tabular-nums text-[10px] mb-1">{opt.value}</div>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ToolRunnerShell>
  );
}