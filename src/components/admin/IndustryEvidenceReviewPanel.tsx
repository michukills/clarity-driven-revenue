/**
 * IB-H4 — Industry Evidence Review Panel (admin-only).
 *
 * Surfaces the IB-H3 / IB-H3B / IB-H2 evidence interpretation for an
 * admin reviewer on diagnostic / report-builder surfaces. This panel:
 *
 *  - never auto-publishes findings
 *  - never alters the deterministic 0–1000 scorecard
 *  - separates admin-only notes from client-safe summaries
 *  - defaults all generated items to clientVisible=false
 *
 * It is rendered only inside admin routes already gated by
 * ProtectedRoute requireRole="admin". When no signals are provided yet,
 * a documented empty state is shown — never fake findings.
 */
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Compass, Lock, Eye } from "lucide-react";
import {
  buildIndustryEvidenceReportSections,
  buildRepairMapCandidatesFromEvidence,
  type EvidenceSignal,
} from "@/lib/intelligence/evidenceInterpretation";
import type { IndustryDepthIndustryKey } from "@/lib/intelligence/industryDepthQuestionRegistry";

export interface IndustryEvidenceReviewPanelProps {
  signals?: EvidenceSignal[];
  industryKey?: IndustryDepthIndustryKey | null;
  className?: string;
}

function Section({
  title,
  items,
  empty,
  tone = "default",
}: {
  title: string;
  items: string[];
  empty: string;
  tone?: "default" | "warn" | "ok";
}) {
  const toneCls =
    tone === "warn"
      ? "text-amber-300"
      : tone === "ok"
        ? "text-emerald-300"
        : "text-foreground";
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{empty}</p>
      ) : (
        <ul className={`text-xs ${toneCls} list-disc pl-4 space-y-1`}>
          {items.slice(0, 8).map((s, i) => (
            <li key={`${title}-${i}`}>{s}</li>
          ))}
          {items.length > 8 ? (
            <li className="text-muted-foreground list-none italic">
              +{items.length - 8} more
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

export function IndustryEvidenceReviewPanel({
  signals,
  industryKey = null,
  className,
}: IndustryEvidenceReviewPanelProps) {
  const safeSignals = signals ?? [];
  const hasSignals = safeSignals.length > 0;
  const sections = buildIndustryEvidenceReportSections(safeSignals, industryKey);
  const candidates = buildRepairMapCandidatesFromEvidence(safeSignals);

  return (
    <section
      className={
        "bg-card border border-border rounded-xl p-5 space-y-4 " +
        (className ?? "")
      }
      data-testid="industry-evidence-review-panel"
      data-industry-evidence-industry={industryKey ?? "unspecified"}
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              Industry evidence review
            </h3>
            <Badge variant="outline" className="text-[10px]">
              Admin only
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              IB-H4
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Interprets gear metric and industry-depth answers into review
            cues, report seeds, and repair-map candidates. Does not change
            the deterministic 0–1000 score and does not auto-publish.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" /> review required
          <span aria-hidden>·</span>
          <Eye className="h-3 w-3" /> client-visible: off
        </div>
      </header>

      {!hasSignals ? (
        <div className="border border-dashed border-border rounded-md p-4 text-xs text-muted-foreground">
          Industry evidence signals will appear here after mapped diagnostic
          answers are submitted. This panel is prepared for IB-H4 consumption
          and does not alter the deterministic score.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section
              title="Strengths (verified)"
              items={sections.strengths}
              empty="No verified strengths yet."
              tone="ok"
            />
            <Section
              title="Slipping signals"
              items={sections.slippingSignals}
              empty="No slipping signals."
              tone="warn"
            />
            <Section
              title="Visibility weaknesses (unknown / not tracked)"
              items={sections.visibilityWeaknesses}
              empty="No visibility gaps."
              tone="warn"
            />
            <Section
              title="Priority clarifications"
              items={sections.priorityClarifications}
              empty="No priority clarifications."
            />
          </div>

          <div className="border-t border-border pt-3 space-y-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Repair-map candidates ({candidates.length})
            </div>
            {candidates.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No repair candidates — all answers are verified.
              </p>
            ) : (
              <ul className="text-xs text-foreground space-y-1">
                {candidates.slice(0, 8).map((c) => (
                  <li key={c.key} className="flex justify-between gap-3">
                    <span>{c.title}</span>
                    <span className="text-muted-foreground">
                      {c.gear} · {c.severity} · {c.belongsTo}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details className="border border-border rounded-md bg-muted/20 p-3">
            <summary className="text-xs font-medium text-foreground cursor-pointer flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              Admin-only interpretation notes
            </summary>
            <ul className="mt-2 text-[11px] text-muted-foreground list-disc pl-4 space-y-1">
              {sections.adminOnlyNotes.slice(0, 12).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-amber-300">
              These notes never appear in client-facing output.
            </p>
          </details>
        </>
      )}

      <p className="text-[11px] text-muted-foreground">
        Source: IB-H3 metric registry + IB-H3B industry depth registry +
        IB-H2 anchor catalog. All generated items default to{" "}
        <span className="font-mono">clientVisible=false</span> until admin
        approval.
      </p>
    </section>
  );
}

export default IndustryEvidenceReviewPanel;