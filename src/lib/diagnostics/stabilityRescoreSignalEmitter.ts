/* P11.11 — Emit signals when an auto stability re-score moves materially. */

import { recordInsightSignal } from "./insightSignals";
import type { AutoScoreResult } from "@/lib/scoring/autoStabilityRescore";

const MATERIAL = 30; // pts out of 1000
const STRONG = 75;

export async function emitStabilityRescoreSignals(result: AutoScoreResult): Promise<number> {
  if (result.delta_from_prior == null) return 0;
  const d = result.delta_from_prior;
  if (Math.abs(d) < MATERIAL) return 0;

  const strength = Math.abs(d) >= STRONG ? "high" : "medium";
  const isUp = d > 0;
  const summary = `Stability score ${isUp ? "rose" : "fell"} ${Math.abs(d)} pts (now ${result.score_total}/1000). ${result.summary}`;

  try {
    await recordInsightSignal({
      customer_id: result.customer_id,
      signal_source: "scorecard",
      signal_type: isUp ? "validated_strength" : "benchmark_risk",
      evidence_label: isUp ? "Stability score improved" : "Stability score declined",
      evidence_summary: summary,
      strength,
      confidence: "medium",
      client_safe: false,
      source_table: "stability_score_history",
      metadata: {
        score_total: result.score_total,
        prior_score: result.prior_score,
        delta: d,
        contributors: result.contributors,
      },
    });

    // If a single pillar dominates the move, surface a report_insight.
    const dominant = result.pillars
      .map((p) => ({ pillar: p.pillar, sum: p.contributors.reduce((a, c) => a + c.delta, 0) }))
      .sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum))[0];
    if (dominant && Math.abs(dominant.sum) >= 20) {
      await recordInsightSignal({
        customer_id: result.customer_id,
        signal_source: "scorecard",
        signal_type: "report_insight",
        evidence_label: `Pillar shift: ${dominant.pillar}`,
        evidence_summary: `${dominant.pillar} contributed ${dominant.sum > 0 ? "+" : ""}${dominant.sum} pts to the latest stability re-score.`,
        strength: "medium",
        confidence: "medium",
        client_safe: false,
        related_pillar: dominant.pillar as any,
        source_table: "stability_score_history",
        metadata: { delta: dominant.sum },
      });
      return 2;
    }
    return 1;
  } catch (e) {
    console.warn("[stabilityRescoreSignalEmitter] suppressed:", (e as Error).message);
    return 0;
  }
}
