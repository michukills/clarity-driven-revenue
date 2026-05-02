// P20.4c — Client-facing renderer for the existing intelligence outputs.
//
// PURE PRESENTATIONAL. Consumes ClientLeakView from analyzeLeaks().
//
// Strict client-safety rules:
//  • No raw scoring factors (impact / visibility / ease / dependency / score).
//  • No raw rationale text.
//  • No admin-only notes.
//  • No admin-only tools.
//  • No internal leak ids or scoring formula.
//  • Restricted tools are simply not listed (never shown as "broken").
//
// Sections:
//  1. Top 3 Issues (rank, plain-English title, gear, $impact if available,
//     confidence label, recommended next action)
//  2. Missing Data / Needs Verification checklist (plain English)
//  3. Tools — only client-visible tools for the resolved industry

import { CheckCircle2, ListChecks, Target } from "lucide-react";
import type { ClientLeakView } from "@/lib/leakEngine";
import type { Leak } from "@/lib/leakEngine/leakObject";
import { gearMeta } from "@/lib/gears/targetGear";

export interface ClientLeakIntelligencePanelProps {
  client: ClientLeakView;
}

const CONF_LABEL: Record<Leak["confidence"], string> = {
  Confirmed: "Confirmed",
  Estimated: "Estimated",
  "Needs Verification": "Awaiting your data",
};

const CONF_TONE: Record<Leak["confidence"], string> = {
  Confirmed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  Estimated: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  "Needs Verification": "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

function fmtMoney(n: number): string {
  if (!n || n <= 0) return "";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function GearChip({ gear }: { gear: Leak["gear"] }) {
  const meta = gearMeta(gear);
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${meta.chipClass}`}
    >
      {meta.short}
    </span>
  );
}

export function ClientLeakIntelligencePanel({ client }: ClientLeakIntelligencePanelProps) {
  const hasIssues = client.topIssues.length > 0;
  const hasNeeds = client.needsVerification.length > 0;
  const hasTools = client.visibleTools.length > 0;

  return (
    <section
      data-testid="client-leak-intelligence"
      className="space-y-6"
      aria-label="Your top issues and next steps"
    >
      {/* 1. Top 3 issues */}
      <div>
        <header className="mb-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Your Focus
          </div>
          <h3 className="mt-1 text-base text-foreground">Top issues to address</h3>
          {client.totalDollarsAtRisk > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Estimated dollars at risk across all issues:{" "}
              <span className="text-foreground tabular-nums">{fmtMoney(client.totalDollarsAtRisk)}</span>
            </p>
          )}
        </header>

        {!hasIssues ? (
          <p className="rounded-xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
            We need more data before we can confirm your top issues. Your next steps will appear after your diagnostic is reviewed.
          </p>
        ) : (
          <ol className="grid gap-3 lg:grid-cols-3">
            {client.topIssues.map((item) => (
              <li
                key={item.rank}
                className="rounded-2xl border border-border bg-card/40 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border border-border bg-muted/30 px-2 text-xs tabular-nums text-foreground">
                      #{item.rank}
                    </span>
                    <GearChip gear={item.gear} />
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${CONF_TONE[item.confidence]}`}
                  >
                    {CONF_LABEL[item.confidence]}
                  </span>
                </div>
                <h4 className="mt-3 text-sm text-foreground">{item.title}</h4>
                {item.estimated_impact > 0 && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Estimated impact:{" "}
                    <span className="text-foreground tabular-nums">{fmtMoney(item.estimated_impact)}</span>
                  </div>
                )}
                <div className="mt-3 rounded-md border border-border/70 bg-background/40 p-2.5 text-xs text-foreground">
                  <span className="text-muted-foreground">Next action: </span>
                  {item.recommendation}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* 2. Needs verification */}
      <div>
        <header className="mb-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Help Us Confirm
          </div>
          <h3 className="mt-1 text-base text-foreground">What we still need from you</h3>
        </header>
        {!hasNeeds ? (
          <p className="rounded-xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
            Nothing to verify right now — we have what we need to keep going.
          </p>
        ) : (
          <ul className="space-y-2">
            {client.needsVerification.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md border border-border bg-card/40 p-3 text-xs text-foreground"
              >
                <ListChecks className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 3. Tools */}
      <div>
        <header className="mb-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Your Tools
          </div>
          <h3 className="mt-1 text-base text-foreground">Available for {client.industryLabel}</h3>
        </header>
        {!hasTools ? (
          <p className="rounded-xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
            Tools tailored to your business will appear here once your industry is confirmed.
          </p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {client.visibleTools.map((t) => (
              <li
                key={`${t.industry}-${t.tool_key}`}
                className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3 text-xs text-foreground"
              >
                <span>{t.tool_key.replace(/_/g, " ")}</span>
                <Target className="h-3.5 w-3.5 text-muted-foreground" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default ClientLeakIntelligencePanel;