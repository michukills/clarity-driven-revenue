import { FileText, Flag, AlertOctagon, Wrench, Lightbulb, ShieldAlert, Search, HelpCircle } from "lucide-react";
import {
  type DiagnosticCategory,
  type DiagnosticResult,
  type SeverityMap,
  type EvidenceMap,
  type FactorReportItem,
  bandLabel,
  bandTone,
  bandRing,
  buildFactorReport,
  confidenceLabel,
  fmtMoney,
} from "@/lib/diagnostics/engine";

interface Props {
  toolEyebrow: string;
  categories: DiagnosticCategory[];
  severities: SeverityMap;
  evidence?: EvidenceMap;
  result: DiagnosticResult;
  /** Admin sees internal notes + low-confidence warnings + data gaps. */
  audience: "admin" | "client";
  hideMoney?: boolean;
  scoreSuffix?: string;
  scoreOverride?: number;
}

/**
 * Generated report rendered at the top of every RGS diagnostic tool.
 *
 *   1 Executive Summary
 *   2 Scoring Evidence Summary  (high-risk factors first, with rubric + evidence + confidence)
 *   3 Category Breakdown
 *   4 What This Means
 *   5 What To Fix First
 *   6 If Ignored
 *   7 Recommended Next RGS Step
 *
 * Admin variant additionally shows internal notes, low-confidence warnings, and data gaps.
 */
export function DiagnosticReport({
  toolEyebrow,
  categories,
  severities,
  evidence,
  result,
  audience,
  hideMoney,
  scoreSuffix = "/ 100",
  scoreOverride,
}: Props) {
  const isAdmin = audience === "admin";
  const items = buildFactorReport(categories, severities, evidence);
  const high = items.filter((i) => i.score >= 4);
  const moderate = items.filter((i) => i.score === 3);
  const lowConfHigh = high.filter((i) => i.confidenceLow);
  const dataGaps = items.filter((i) => i.score >= 3 && !i.evidencePresent);
  const insufficient = result.dataState === "insufficient" && scoreOverride === undefined;
  const score = scoreOverride ?? result.score;

  // Truthful headline when nothing has been scored: do NOT show 100/Stable as a real result.
  if (insufficient) {
    const totalFactors = categories.reduce((s, c) => s + c.factors.length, 0);
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-border bg-card p-6">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            <FileText className="h-3 w-3" /> {toolEyebrow} · Generated Report
          </div>
          <div className="flex items-start gap-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <HelpCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-lg text-foreground">Insufficient evidence to score</div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                No factors have been scored yet. A 0/5 default is not the same as a healthy
                business — it just means the diagnostic has not been run. Capture evidence and
                score the factors below to generate a real assessment.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground tabular-nums">
                  {result.scoredFactors} / {totalFactors} factors scored
                </span>
                <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground tabular-nums">
                  {result.evidenceFactors} evidence notes
                </span>
                {isAdmin && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                    Next: score the factors in the panel below
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const Section = ({
    icon: Icon,
    label,
    children,
    tone,
  }: {
    icon: any;
    label: string;
    children: React.ReactNode;
    tone?: string;
  }) => (
    <section className={`rounded-xl border p-5 ${tone ?? "bg-card border-border"}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
        <Icon className="h-3 w-3" /> {label}
      </div>
      {children}
    </section>
  );

  return (
    <div className="space-y-4">
      {/* Header / Executive Summary */}
      <div className={`rounded-2xl border p-6 ${bandRing(result.band)}`}>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
          <FileText className="h-3 w-3" /> {toolEyebrow} · Generated Report
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
          <div>
            <div className={`font-display text-5xl tabular-nums leading-none ${bandTone(result.band)}`}>
              {score}
              <span className="text-base text-muted-foreground ml-2">{scoreSuffix}</span>
            </div>
            <div className={`text-[11px] uppercase tracking-wider mt-1 ${bandTone(result.band)}`}>
              {bandLabel(result.band)}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {!hideMoney && (
              <div className="rounded-lg border border-border p-3 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Estimated impact</div>
                <div className="text-foreground tabular-nums mt-1 break-words">{fmtMoney(result.monthly)} / mo</div>
                <div className="text-muted-foreground text-[11px] break-words">{fmtMoney(result.annual)} / year</div>
              </div>
            )}
            <div className="rounded-lg border border-border p-3 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Top issues</div>
              {result.topThree.length === 0 ? (
                <p className="text-muted-foreground text-[11px] mt-1 leading-snug">
                  No critical leaks identified from the scored factors.
                </p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-foreground">
                  {result.topThree.slice(0, 3).map((c) => (
                    <li key={c.key} className="truncate" title={c.label}>• {c.label}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-border p-3 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Recommended next step</div>
              <div className="text-foreground mt-1 break-words">
                {result.worst ? result.nextStep : "Capture more evidence to confirm this result"}
              </div>
              {result.worst && (
                <div className="text-muted-foreground text-[11px] mt-0.5 break-words">
                  Root: {result.worst.label}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Evidence Summary */}
      {(high.length > 0 || moderate.length > 0) && (
        <Section icon={Search} label={isAdmin ? "Scoring Evidence Summary" : "Evidence Summary"}>
          <div className="space-y-3">
            {[...high, ...moderate].slice(0, isAdmin ? 8 : 5).map((i) => (
              <EvidenceCard key={`${i.categoryKey}.${i.factorKey}`} item={i} isAdmin={isAdmin} />
            ))}
          </div>
        </Section>
      )}

      {/* Category Breakdown */}
      <Section icon={Flag} label="Category Breakdown">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {result.categories.map((c) => {
            const top = items.find((i) => i.categoryKey === c.key); // already sorted by score
            return (
              <div key={c.key} className={`rounded-lg border p-3 ${bandRing(c.band)}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-sm text-foreground">{c.label}</div>
                  <div className={`text-[10px] uppercase tracking-wider ${bandTone(c.band)}`}>{bandLabel(c.band)}</div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {isAdmin ? (
                    <>Health {c.health} · RGS internal severity {c.severity.toFixed(1)} / 5</>
                  ) : (
                    <>Evidence status: {bandLabel(c.band)}</>
                  )}
                  {!hideMoney && c.monthly > 0 && <> · {fmtMoney(c.monthly)}/mo</>}
                </div>
                {top && top.score > 0 && (
                  <div className="text-xs text-foreground/90 mt-2">
                    <span className="text-muted-foreground">Driver:</span> {top.factorLabel}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">{c.short}</div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* What This Means + Fix First + If Ignored */}
      {result.worst && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Section icon={Lightbulb} label="What This Means">
            <p className="text-sm text-foreground leading-relaxed">{result.worst.rootCause}</p>
          </Section>
          <Section icon={Wrench} label="What To Fix First" tone="bg-primary/5 border-primary/30">
            <p className="text-sm text-foreground leading-relaxed">{result.worst.fixFirst}</p>
          </Section>
          <Section icon={AlertOctagon} label="If Ignored" tone="bg-amber-500/5 border-amber-500/30">
            <p className="text-sm text-foreground leading-relaxed">{result.worst.ifIgnored}</p>
          </Section>
        </div>
      )}

      {/* Recommended Next Step */}
      <Section icon={Lightbulb} label="Recommended Next RGS Step">
        <div className="text-base text-foreground">{result.nextStep}</div>
        <p className="text-xs text-muted-foreground mt-1">
          Aligned to the locked RGS path: Diagnose → Design → Document → Hand off.
        </p>
      </Section>

      {/* Admin-only: data gaps + low confidence */}
      {isAdmin && (lowConfHigh.length > 0 || dataGaps.length > 0) && (
        <Section icon={ShieldAlert} label="Admin · Data Gaps & Confidence" tone="bg-card border-dashed border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Low-confidence high-risk factors</div>
              {lowConfHigh.length === 0 ? (
                <div className="text-muted-foreground">None.</div>
              ) : (
                <ul className="space-y-1">
                  {lowConfHigh.map((i) => (
                    <li key={`${i.categoryKey}.${i.factorKey}`} className="text-foreground">
                      • {i.factorLabel} ({i.categoryLabel}) — confirm with the client.
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Missing evidence (score ≥ 3)</div>
              {dataGaps.length === 0 ? (
                <div className="text-muted-foreground">None.</div>
              ) : (
                <ul className="space-y-1">
                  {dataGaps.map((i) => (
                    <li key={`${i.categoryKey}.${i.factorKey}`} className="text-foreground">
                      • {i.factorLabel} — add evidence to defend the score.
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

function EvidenceCard({ item, isAdmin }: { item: FactorReportItem; isAdmin: boolean }) {
  const tone =
    item.score >= 4
      ? "border-destructive/40 bg-destructive/5"
      : item.score === 3
      ? "border-amber-500/30 bg-amber-500/5"
      : "border-border bg-card";
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-sm text-foreground">
          {item.factorLabel}
          <span className="text-[11px] text-muted-foreground ml-2">{item.categoryLabel}</span>
        </div>
        <div className="text-[11px] tabular-nums text-foreground">
          {item.score} / 5 · <span className="text-muted-foreground">{item.severityLabel}</span>
        </div>
      </div>
      <p className="text-xs text-foreground/90 mt-2 leading-relaxed">
        <span className="text-muted-foreground">Why this score:</span> {item.meaning}
      </p>
      {item.clientFinding && (
        <p className="text-xs text-foreground/90 mt-1 leading-relaxed">
          <span className="text-muted-foreground">Finding:</span> {item.clientFinding}
        </p>
      )}
      <p className="text-xs text-foreground/80 mt-1 leading-relaxed">
        <span className="text-muted-foreground">Evidence:</span> {item.evidence}
      </p>
      {item.confidenceLow && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
          Confidence is low; additional data may be needed.
        </p>
      )}
      {isAdmin && (
        <div className="mt-2 pt-2 border-t border-border/60 space-y-1 text-[11px] text-muted-foreground">
          <div>{confidenceLabel(item.confidence)}</div>
          {item.lookFor && <div><span className="text-foreground/80">Look for:</span> {item.lookFor}</div>}
          {item.internalNotes && (
            <div><span className="text-foreground/80">Internal:</span> {item.internalNotes}</div>
          )}
        </div>
      )}
    </div>
  );
}