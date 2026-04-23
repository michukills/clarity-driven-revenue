/**
 * P11.8 — Emit insight signals derived from diagnostic tool re-runs.
 *
 * Signals are intentionally low-noise: at most one signal per material
 * truth. Patterns considered:
 *   - score crossed into the "weak" band on the latest run → revenue_leak
 *     or benchmark_risk depending on the tool
 *   - sustained weak score across 2+ consecutive runs → benchmark_risk
 *   - sustained strong score across 2+ runs → validated_strength
 *   - prior weak run resolved (now strong) → resolved_issue
 *   - large positive jump (≥ 15 pts) → implementation_progress
 *   - large negative jump or first run with material findings → report_insight
 *
 * Learning controls are honored inside `recordInsightSignal`.
 */

import {
  DIAGNOSTIC_TOOL_LABELS,
  type DiagnosticToolKey,
  type DiagnosticToolRunRow,
  listDiagnosticRuns,
} from "./diagnosticRuns";
import {
  recordInsightSignal,
  type InsightSignalInput,
  type SignalPillar,
  type SignalType,
} from "./insightSignals";

const PILLAR_BY_TOOL: Record<DiagnosticToolKey, SignalPillar | null> = {
  rgs_stability_scorecard: null,
  revenue_leak_finder: "revenue_conversion",
  buyer_persona_tool: "demand_generation",
  customer_journey_mapper: "revenue_conversion",
  process_breakdown_tool: "operational_efficiency",
};

const WEAK_THRESHOLD = 50; // <= 50 health score = weak
const STRONG_THRESHOLD = 75; // >= 75 health score = strong
const MATERIAL_JUMP = 15;

export interface DiagnosticRunSignalContext {
  customerId: string;
  toolKey: DiagnosticToolKey;
  runId: string;
}

/**
 * Inspect the latest run plus its history and emit at most one meaningful
 * signal describing the durable truth this rerun reveals. Errors are
 * swallowed — emitters live downstream of user actions.
 */
export async function emitDiagnosticRunSignal(
  ctx: DiagnosticRunSignalContext,
): Promise<void> {
  try {
    const history = await listDiagnosticRuns(ctx.customerId, ctx.toolKey);
    if (!history || history.length === 0) return;

    const current = history.find((r) => r.id === ctx.runId) ?? history[0];
    const prior = history.find((r) => r.id !== current.id) ?? null;
    const recent = history.slice(0, 3);

    const cur = current.result_score;
    const pri = prior?.result_score ?? null;
    const toolLabel = current.tool_label ?? DIAGNOSTIC_TOOL_LABELS[ctx.toolKey];
    const pillar = PILLAR_BY_TOOL[ctx.toolKey];

    const base: Omit<InsightSignalInput, "signal_type" | "evidence_label" | "evidence_summary" | "strength"> = {
      customer_id: ctx.customerId,
      signal_source: "diagnostic",
      source_table: "diagnostic_tool_runs",
      source_id: current.id,
      related_pillar: pillar,
      confidence: "medium",
      occurred_at: current.run_date,
      metadata: {
        tool_key: ctx.toolKey,
        version: current.version_number,
        score: cur,
        prior_score: pri,
      },
    };

    let chosen: InsightSignalInput | null = null;

    // 1. Resolved issue — prior weak, current strong.
    if (cur != null && pri != null && pri <= WEAK_THRESHOLD && cur >= STRONG_THRESHOLD) {
      chosen = {
        ...base,
        signal_type: "resolved_issue",
        strength: "high",
        confidence: "high",
        evidence_label: `${toolLabel}: weak finding resolved`,
        evidence_summary: `Score moved from ${pri} to ${cur} between version ${prior!.version_number} and ${current.version_number}.`,
      };
    }
    // 2. Implementation progress — large positive jump regardless of band.
    else if (cur != null && pri != null && cur - pri >= MATERIAL_JUMP) {
      chosen = {
        ...base,
        signal_type: "implementation_progress",
        strength: "medium",
        evidence_label: `${toolLabel}: material improvement`,
        evidence_summary: `Score improved by ${cur - pri} pts (${pri} → ${cur}) across reruns.`,
      };
    }
    // 3. Sustained strength — 2+ recent runs at or above strong threshold.
    else if (
      cur != null &&
      cur >= STRONG_THRESHOLD &&
      recent.length >= 2 &&
      recent.slice(0, 2).every((r) => (r.result_score ?? 0) >= STRONG_THRESHOLD)
    ) {
      chosen = {
        ...base,
        signal_type: "validated_strength",
        strength: "medium",
        confidence: "high",
        evidence_label: `${toolLabel}: durable strength`,
        evidence_summary: `Score has stayed strong across the last ${Math.min(recent.length, 3)} runs (latest ${cur}).`,
      };
    }
    // 4. Sustained weakness — 2+ recent runs at/below weak threshold.
    else if (
      cur != null &&
      cur <= WEAK_THRESHOLD &&
      recent.length >= 2 &&
      recent.slice(0, 2).every((r) => (r.result_score ?? 100) <= WEAK_THRESHOLD)
    ) {
      const sigType: SignalType =
        ctx.toolKey === "revenue_leak_finder" ? "revenue_leak" :
        ctx.toolKey === "process_breakdown_tool" ? "operational_bottleneck" :
        "benchmark_risk";
      chosen = {
        ...base,
        signal_type: sigType,
        strength: "high",
        confidence: "high",
        evidence_label: `${toolLabel}: persistent weakness`,
        evidence_summary: `Score has stayed at or below ${WEAK_THRESHOLD} across the last ${Math.min(recent.length, 3)} runs (latest ${cur}).`,
      };
    }
    // 5. Latest crossed into weak band on its own (single-run risk).
    else if (cur != null && cur <= WEAK_THRESHOLD) {
      const sigType: SignalType =
        ctx.toolKey === "revenue_leak_finder" ? "revenue_leak" :
        ctx.toolKey === "process_breakdown_tool" ? "operational_bottleneck" :
        "benchmark_risk";
      chosen = {
        ...base,
        signal_type: sigType,
        strength: "medium",
        evidence_label: `${toolLabel}: weak finding`,
        evidence_summary: `Latest run scored ${cur} (≤ ${WEAK_THRESHOLD}) — material weakness recorded.`,
      };
    }
    // 6. Negative jump worth surfacing.
    else if (cur != null && pri != null && pri - cur >= MATERIAL_JUMP) {
      chosen = {
        ...base,
        signal_type: "report_insight",
        strength: "medium",
        evidence_label: `${toolLabel}: regression detected`,
        evidence_summary: `Score dropped by ${pri - cur} pts (${pri} → ${cur}) across reruns.`,
      };
    }
    // 7. First run with no comparable score — log as a report insight only when
    //    the payload carries any structured findings.
    else if (!prior) {
      const payload = current.result_payload as any;
      const hasFindings =
        payload?.summary && typeof payload.summary === "object" &&
        Object.keys(payload.summary).length > 0;
      if (hasFindings) {
        chosen = {
          ...base,
          signal_type: "report_insight",
          strength: "low",
          evidence_label: `${toolLabel}: first benchmark recorded`,
          evidence_summary: `Initial run captured (${current.result_summary ?? "no summary"}).`,
        };
      }
    }

    if (chosen) {
      await recordInsightSignal(chosen);
    }
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn("[diagnosticRunSignalEmitter] suppressed:", (e as Error)?.message);
    }
  }
}
