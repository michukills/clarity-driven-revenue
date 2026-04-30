// P20.4c — Admin-facing renderer for the existing intelligence outputs.
//
// PURE PRESENTATIONAL. Consumes the AdminLeakView produced by analyzeLeaks()
// and the IndustryGapReport. Adds no new business logic, scoring, or AI.
// Designed to slot into existing admin surfaces without redesigning them.
//
// Sections rendered (in order):
//  1. Top 3 Repair Priorities (rank, gear, score, band, $impact, confidence,
//     source, recommendation, why-this-ranked)
//  2. Full Ranked Issue List (impact / visibility / ease / dependency / score)
//  3. General vs Industry vs Estimate-derived split
//  4. Industry Gap Report (confirmed / fallback, missing required fields,
//     unverified fields, needs-verification leak ids)
//  5. Tool Readiness (Configured / Admin-operated / Restricted / Missing) —
//     uses the canonical industryToolCoverage classification.
//  6. Promote-to-task placeholder (disabled until approval flow ships).
//
// Empty states are calm and do not imply breakage.

import { AlertTriangle, CheckCircle2, Info, ListOrdered, ShieldCheck, Sparkles } from "lucide-react";
import type {
  AdminLeakView,
  IndustryGapReport,
  RankedLeak,
} from "@/lib/leakEngine";
import type { Leak } from "@/lib/leakEngine/leakObject";
import { gearMeta } from "@/lib/gears/targetGear";
import {
  buildIndustryToolCoverage,
  type CategoryAccessRow,
  type IndustryToolCoverage,
} from "@/lib/industryToolCoverage";
import type { ToolCatalogRow } from "@/lib/toolCatalog";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

export interface AdminLeakIntelligencePanelProps {
  admin: AdminLeakView;
  /** Optional task-promotion handler. When omitted, the button is disabled. */
  onPromoteToTask?: (leak: Leak) => void;
  /**
   * Optional tool catalog + per-industry access rows. When supplied, the
   * Tool Readiness section uses the canonical coverage classification
   * (Configured / Admin-operated / Restricted / Missing). When omitted, a
   * lighter readiness summary derived from admin.tools is shown.
   */
  toolCatalog?: ToolCatalogRow[];
  industryAccess?: CategoryAccessRow[];
  /**
   * Effective industry to look up in the readiness coverage table.
   * Defaults to admin.industryGapReport.industry.
   */
  industry?: IndustryCategory;
}

const BAND_TONE: Record<RankedLeak["scored"]["priority_band"], string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  high: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  medium: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

const CONF_TONE: Record<Leak["confidence"], string> = {
  Confirmed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  Estimated: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  "Needs Verification": "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

function fmtMoney(n: number): string {
  if (!n || n <= 0) return "$0";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function GearChip({ gear }: { gear: Leak["gear"] }) {
  const meta = gearMeta(gear);
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${meta.chipClass}`}
      title={`${meta.name} — ${meta.purpose}`}
    >
      {meta.short}
    </span>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${tone}`}>
      {children}
    </span>
  );
}

function SectionHeader({ kicker, title, hint }: { kicker: string; title: string; hint?: string }) {
  return (
    <header className="mb-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{kicker}</div>
      <h3 className="mt-1 text-base text-foreground">{title}</h3>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </header>
  );
}

function Top3Card({ entry, onPromoteToTask }: { entry: RankedLeak; onPromoteToTask?: (l: Leak) => void }) {
  const { leak, scored, explanation } = entry;
  return (
    <article className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border border-border bg-muted/30 px-2 text-xs tabular-nums text-foreground">
            #{scored.rank}
          </span>
          <GearChip gear={leak.gear} />
          <Pill tone={BAND_TONE[scored.priority_band]}>{scored.priority_band}</Pill>
          <Pill tone={CONF_TONE[leak.confidence]}>{leak.confidence}</Pill>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Priority score</div>
          <div className="text-xl tabular-nums text-foreground">{scored.priority_score}</div>
        </div>
      </div>
      <h4 className="mt-3 text-sm text-foreground">{leak.message}</h4>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Estimated impact</dt>
          <dd className="tabular-nums text-foreground">{fmtMoney(leak.estimated_revenue_impact)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Source</dt>
          <dd className="text-foreground capitalize">{leak.source}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Category</dt>
          <dd className="text-foreground">{leak.category.replace(/_/g, " ")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Severity</dt>
          <dd className="text-foreground capitalize">{leak.severity}</dd>
        </div>
      </dl>
      <div className="mt-3 rounded-md border border-border/70 bg-background/40 p-2.5 text-xs text-foreground">
        <span className="text-muted-foreground">Recommendation: </span>
        {leak.recommended_fix}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{explanation}</p>
      <div className="mt-3">
        <button
          type="button"
          disabled={!onPromoteToTask}
          onClick={onPromoteToTask ? () => onPromoteToTask(leak) : undefined}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          title={onPromoteToTask ? "Promote this leak to a customer task" : "Task promotion coming after admin approval flow is verified."}
          aria-label="Promote to task"
        >
          Promote to task
        </button>
        {!onPromoteToTask && (
          <span className="ml-2 text-[11px] text-muted-foreground">
            Task promotion coming after admin approval flow is verified.
          </span>
        )}
      </div>
    </article>
  );
}

function RankedRow({ entry }: { entry: RankedLeak }) {
  const { leak, scored } = entry;
  return (
    <tr className="border-t border-border/60 align-top">
      <td className="py-2 pr-3 text-xs text-foreground tabular-nums">#{scored.rank}</td>
      <td className="py-2 pr-3">
        <div className="text-xs text-foreground">{leak.message}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{leak.type}</span>
          <span>·</span>
          <span className="capitalize">{leak.source}</span>
        </div>
      </td>
      <td className="py-2 pr-3"><GearChip gear={leak.gear} /></td>
      <td className="py-2 pr-3"><Pill tone={CONF_TONE[leak.confidence]}>{leak.confidence}</Pill></td>
      <td className="py-2 pr-3 text-xs capitalize text-foreground">{leak.severity}</td>
      <td className="py-2 pr-3 text-xs tabular-nums text-foreground">{fmtMoney(leak.estimated_revenue_impact)}</td>
      <td className="py-2 pr-3 text-xs tabular-nums text-foreground">{scored.impact}</td>
      <td className="py-2 pr-3 text-xs tabular-nums text-foreground">{scored.visibility}</td>
      <td className="py-2 pr-3 text-xs tabular-nums text-foreground">{scored.ease_of_fix}</td>
      <td className="py-2 pr-3 text-xs tabular-nums text-foreground">{scored.dependency}</td>
      <td className="py-2 pr-3 text-xs tabular-nums text-foreground">{scored.priority_score}</td>
      <td className="py-2 pr-3"><Pill tone={BAND_TONE[scored.priority_band]}>{scored.priority_band}</Pill></td>
      <td className="py-2 pr-0 text-[11px] text-muted-foreground">{scored.rationale}</td>
    </tr>
  );
}

function LeakSubsection({
  title,
  hint,
  leaks,
  emptyHint,
}: {
  title: string;
  hint: string;
  leaks: Leak[];
  emptyHint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/30 p-4">
      <div className="text-xs text-foreground">{title}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      {leaks.length === 0 ? (
        <p className="mt-3 text-[11px] text-muted-foreground">{emptyHint}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {leaks.map((l) => (
            <li key={l.id} className="rounded-md border border-border/60 bg-background/40 p-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <GearChip gear={l.gear} />
                <Pill tone={CONF_TONE[l.confidence]}>{l.confidence}</Pill>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{l.source}</span>
              </div>
              <div className="mt-1.5 text-xs text-foreground">{l.message}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{l.recommended_fix}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GapReport({ report }: { report: IndustryGapReport }) {
  const fellBack = report.fellBackToGeneralMixed;
  return (
    <div className="rounded-xl border border-border bg-card/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill
          tone={
            report.industryConfirmed && !fellBack
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-300"
          }
        >
          {report.industryConfirmed ? "Industry confirmed" : "Industry unconfirmed"}
        </Pill>
        <Pill
          tone={
            fellBack
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          }
        >
          {fellBack
            ? "Industry-specific logic inactive — fell back to General / Mixed"
            : "Industry-specific logic active"}
        </Pill>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Missing required fields
          </div>
          {report.missingRequiredFields.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">All required fields appear to be provided.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {report.missingRequiredFields.map((f) => (
                <li key={f.field} className="flex items-start gap-2 text-xs text-foreground">
                  <AlertTriangle className="mt-0.5 h-3 w-3 text-amber-400" />
                  <span>
                    {f.field.replace(/_/g, " ")}{" "}
                    <span className="text-[10px] text-muted-foreground">
                      ({f.sources.join(", ")})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Unverified fields
          </div>
          {report.unverifiedFields.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">No fields awaiting verification.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {report.unverifiedFields.map((f) => (
                <li key={f.field} className="flex items-start gap-2 text-xs text-foreground">
                  <Info className="mt-0.5 h-3 w-3 text-sky-400" />
                  <span>{f.field.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Needs-verification leak ids
        </div>
        {report.needsVerificationLeakIds.length === 0 ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            All ranked leaks are Confirmed or Estimated.
          </p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {report.needsVerificationLeakIds.map((id) => (
              <li
                key={id}
                className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300"
              >
                {id}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Tool readiness rendered from the canonical coverage classifier. */
function ToolReadiness({
  industry,
  toolCatalog,
  industryAccess,
  fallbackTools,
}: {
  industry: IndustryCategory;
  toolCatalog?: ToolCatalogRow[];
  industryAccess?: CategoryAccessRow[];
  fallbackTools: AdminLeakView["tools"];
}) {
  // Use canonical classification when catalog rows are supplied. This is the
  // same logic that powers the admin Tool Matrix, so labels stay aligned with
  // p.fix.industry-tool-coverage-access-alignment.
  if (toolCatalog && toolCatalog.length > 0 && industry !== "other") {
    const coverage: IndustryToolCoverage[] = buildIndustryToolCoverage(
      toolCatalog,
      industryAccess ?? [],
    );
    const row = coverage.find((r) => r.industry === industry);
    if (!row) {
      return (
        <p className="text-xs text-muted-foreground">
          Tool readiness is unavailable for the resolved industry.
        </p>
      );
    }
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {row.packageCoverage.map((lane) => (
          <div key={lane.key} className="rounded-xl border border-border bg-background/30 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-foreground">{lane.label}</div>
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] ${
                  lane.coveragePct >= 80
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : lane.coveragePct >= 50
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                      : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                {lane.coveragePct}%
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">{lane.purpose}</div>
            {lane.configuredToolKeys.length > 0 && (
              <div className="mt-2 text-[11px] text-emerald-300">
                Configured: {lane.configuredToolKeys.join(", ")}
              </div>
            )}
            {lane.adminOnlyToolKeys.length > 0 && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                Admin-operated: {lane.adminOnlyToolKeys.join(", ")}
              </div>
            )}
            {lane.restrictedToolKeys.length > 0 && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                Restricted for this industry: {lane.restrictedToolKeys.join(", ")}
              </div>
            )}
            {lane.missingToolKeys.length > 0 && (
              <div className="mt-1 text-[11px] text-amber-300">
                Missing: {lane.missingToolKeys.join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Fallback summary when catalog isn't passed in (e.g., demo route).
  if (fallbackTools.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No tools resolved for this industry. Confirm the industry to unlock industry-specific tools.
      </p>
    );
  }
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {fallbackTools.map((t) => (
        <li
          key={`${t.industry}-${t.tool_key}`}
          className="rounded-md border border-border bg-background/40 p-2 text-xs text-foreground"
        >
          <div className="flex items-center justify-between gap-2">
            <span>{t.tool_key}</span>
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] ${
                t.visibility === "client_visible"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              {t.visibility === "client_visible" ? "Client-visible" : "Admin-operated"}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {t.packages.join(" · ")} · {t.output_type}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminLeakIntelligencePanel({
  admin,
  onPromoteToTask,
  toolCatalog,
  industryAccess,
  industry,
}: AdminLeakIntelligencePanelProps) {
  const resolvedIndustry: IndustryCategory = industry ?? admin.industryGapReport.industry;
  return (
    <section
      data-testid="admin-leak-intelligence"
      className="space-y-6"
      aria-label="Admin leak intelligence"
    >
      {/* 1. Top 3 */}
      <div>
        <SectionHeader
          kicker="Repair Priorities"
          title="Top 3 Repair Priorities"
          hint={`Resolved industry: ${admin.industryLabel}. Total estimated dollars at risk: ${fmtMoney(admin.totalDollarsAtRisk)}.`}
        />
        {admin.top3.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/30 p-4 text-xs text-muted-foreground">
            No confirmed leaks yet. Add data or run a diagnostic to generate ranked issues.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            {admin.top3.map((entry) => (
              <Top3Card key={entry.leak.id} entry={entry} onPromoteToTask={onPromoteToTask} />
            ))}
          </div>
        )}
      </div>

      {/* 2. Full ranked list */}
      <div>
        <SectionHeader
          kicker="Full Ranked Issues"
          title="Ranked issue list with scoring details"
          hint="impact × 2 + visibility + ease_of_fix + dependency. Source: priority engine."
        />
        {admin.ranked.length === 0 ? (
          <p className="rounded-xl border border-border bg-card/30 p-4 text-xs text-muted-foreground">
            No leaks have been generated yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card/30">
            <table className="w-full min-w-[960px] text-left">
              <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="py-2 pl-3 pr-3">#</th>
                  <th className="py-2 pr-3">Issue</th>
                  <th className="py-2 pr-3">Gear</th>
                  <th className="py-2 pr-3">Confidence</th>
                  <th className="py-2 pr-3">Severity</th>
                  <th className="py-2 pr-3">$ Impact</th>
                  <th className="py-2 pr-3">Impact</th>
                  <th className="py-2 pr-3">Visibility</th>
                  <th className="py-2 pr-3">Ease</th>
                  <th className="py-2 pr-3">Dependency</th>
                  <th className="py-2 pr-3">Score</th>
                  <th className="py-2 pr-3">Band</th>
                  <th className="py-2 pr-3">Why ranked</th>
                </tr>
              </thead>
              <tbody>
                {admin.ranked.map((entry) => (
                  <RankedRow key={entry.leak.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. General vs Industry vs Estimate */}
      <div>
        <SectionHeader
          kicker="Brain Output Split"
          title="General RGS Brain · Industry Brain · Estimate / Workflow"
          hint={
            admin.fellBackToGeneralMixed
              ? "Industry brain fell back to General / Mixed. Confirm industry to enable vertical-specific patterns."
              : "Industry-specific brain is active for the resolved industry."
          }
        />
        <div className="grid gap-3 lg:grid-cols-3">
          <LeakSubsection
            title="Universal / General RGS Brain"
            hint="Cross-vertical instability patterns."
            leaks={admin.generalLeaks}
            emptyHint="No universal patterns flagged from current signals."
          />
          <LeakSubsection
            title={`Industry Brain — ${admin.industryLabel}`}
            hint={
              admin.fellBackToGeneralMixed
                ? "Currently using General / Mixed fallback."
                : "Vertical-specific signals."
            }
            leaks={admin.industryLeaks}
            emptyHint="No industry-specific findings yet."
          />
          <LeakSubsection
            title="Estimate / Workflow"
            hint="Derived from estimate friction signals."
            leaks={admin.estimateLeaks}
            emptyHint="No estimate-derived friction detected."
          />
        </div>
      </div>

      {/* 4. Industry gap report */}
      <div>
        <SectionHeader
          kicker="Industry Gap Report"
          title="What's missing before industry-specific findings can be confirmed"
          hint="Missing data prevents confirmed profitability findings."
        />
        <GapReport report={admin.industryGapReport} />
      </div>

      {/* 5. Tool readiness */}
      <div>
        <SectionHeader
          kicker="Tool Readiness"
          title="Tools available for this industry"
          hint="States: Configured · Admin-operated · Restricted for this industry · Missing."
        />
        <ToolReadiness
          industry={resolvedIndustry}
          toolCatalog={toolCatalog}
          industryAccess={industryAccess}
          fallbackTools={admin.tools}
        />
      </div>
    </section>
  );
}

export default AdminLeakIntelligencePanel;