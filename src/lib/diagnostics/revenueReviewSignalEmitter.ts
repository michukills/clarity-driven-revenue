/* P11.10 — Revenue Review Diagnostic signal emitter.
 *
 * Reads the analysis output of a saved review and emits aggregate signals.
 * Honors learning_enabled via recordInsightSignals. Never writes to
 * rgs_pattern_intelligence.
 *
 * Signal types emitted:
 *   - validated_strength   sustained growth or strong YoY
 *   - benchmark_risk       prolonged decline or severe instability
 *   - revenue_leak         high volatility without stable base
 *   - report_insight       seasonal pattern, inflection, or flatline
 *   - resolved_issue       recent recovery after prior decline
 */

import {
  analyzeReview,
  listPoints,
  type RevenueReviewDiagnostic,
} from "./revenueReview";
import {
  recordInsightSignals,
  type InsightSignalInput,
} from "./insightSignals";

export interface EmitRevenueReviewArgs {
  diagnostic: RevenueReviewDiagnostic;
}

export async function emitRevenueReviewSignals(
  args: EmitRevenueReviewArgs,
): Promise<{ emitted: number }> {
  try {
    const d = args.diagnostic;
    if (!d?.id || !d.customer_id) return { emitted: 0 };
    const points = await listPoints(d.id);
    const a = analyzeReview(points);
    if (a.verified_months < 3) return { emitted: 0 };

    const occurredAt = new Date().toISOString();
    const base = {
      customer_id: d.customer_id,
      signal_source: "diagnostic" as const,
      source_table: "revenue_review_diagnostics" as const,
      source_id: d.id,
      occurred_at: occurredAt,
    };
    const out: InsightSignalInput[] = [];

    if (a.trend_direction === "growing" || (a.yoy_change_pct != null && a.yoy_change_pct >= 0.2)) {
      out.push({
        ...base,
        signal_type: "validated_strength",
        related_pillar: "financial_visibility",
        strength: a.yoy_change_pct != null && a.yoy_change_pct >= 0.4 ? "high" : "medium",
        confidence: a.verified_months >= 12 ? "high" : "medium",
        evidence_label: "Revenue growth confirmed",
        evidence_summary: a.summary,
        metadata: {
          trend: a.trend_direction,
          yoy: a.yoy_change_pct,
          recent_vs_prior: a.recent_vs_prior_change_pct,
        },
      });
    }

    if (
      a.trend_direction === "declining" ||
      (a.recent_vs_prior_change_pct != null && a.recent_vs_prior_change_pct <= -0.2)
    ) {
      out.push({
        ...base,
        signal_type: "benchmark_risk",
        related_pillar: "financial_visibility",
        strength: "high",
        confidence: a.verified_months >= 6 ? "high" : "medium",
        evidence_label: "Revenue decline pattern",
        evidence_summary: a.summary,
        metadata: {
          trend: a.trend_direction,
          recent_vs_prior: a.recent_vs_prior_change_pct,
        },
      });
    }

    if (a.volatility_coefficient != null && a.volatility_coefficient > 0.4) {
      out.push({
        ...base,
        signal_type: "revenue_leak",
        related_pillar: "financial_visibility",
        strength: a.volatility_coefficient > 0.6 ? "high" : "medium",
        confidence: "medium",
        evidence_label: "Unstable revenue base",
        evidence_summary: `Volatility coefficient ${a.volatility_coefficient.toFixed(2)} across ${a.verified_months} months.`,
        metadata: { volatility: a.volatility_coefficient },
      });
    }

    if (a.seasonality_flag || a.inflection_month || a.trend_direction === "flat") {
      out.push({
        ...base,
        signal_type: "report_insight",
        related_pillar: "financial_visibility",
        strength: "medium",
        confidence: "medium",
        evidence_label: a.seasonality_flag
          ? "Seasonal revenue pattern"
          : a.inflection_month
            ? `Inflection at ${a.inflection_month.slice(0, 7)}`
            : "Flatline revenue pattern",
        evidence_summary: a.summary,
        metadata: {
          seasonality: a.seasonality_flag,
          inflection_month: a.inflection_month,
          trend: a.trend_direction,
        },
      });
    }

    // Recovery: prior 3 months trended down but recent 3 are clearly up
    if (
      a.prior_3m_avg != null &&
      a.recent_3m_avg != null &&
      a.prior_3m_avg > 0 &&
      a.recent_3m_avg / a.prior_3m_avg >= 1.15 &&
      a.trend_direction !== "declining"
    ) {
      out.push({
        ...base,
        signal_type: "resolved_issue",
        related_pillar: "financial_visibility",
        strength: "medium",
        confidence: "medium",
        evidence_label: "Recent revenue recovery",
        evidence_summary: `Last 3 months recovered to ${(a.recent_3m_avg / a.prior_3m_avg * 100 - 100).toFixed(0)}% above prior 3 months.`,
        metadata: {
          recent_3m_avg: a.recent_3m_avg,
          prior_3m_avg: a.prior_3m_avg,
        },
      });
    }

    if (out.length === 0) return { emitted: 0 };
    await recordInsightSignals(out);
    return { emitted: out.length };
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn("[revenueReviewSignalEmitter] suppressed:", (e as Error)?.message);
    }
    return { emitted: 0 };
  }
}