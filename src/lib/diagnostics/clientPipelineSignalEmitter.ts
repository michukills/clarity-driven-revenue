/* P11.5 — Client Sales Pipeline signal emitter.
 *
 * Reads stages + deals, builds rollups, and emits aggregate-level signals.
 * Honors learning_enabled via recordInsightSignals. Never writes to
 * rgs_pattern_intelligence directly.
 *
 * Signal types emitted:
 *   - pipeline_risk      stalled deals, low close rate, bloated low-progression pipeline
 *   - follow_up_gap      open deals with no recent activity
 *   - validated_strength repeated wins from clear stage/source patterns
 *   - revenue_leak       proposals/quotes sent without conversions
 *   - benchmark_risk     stacked weakness across the pipeline
 */

import {
  buildPipelineRollup,
  isAging,
  listDeals,
  listStages,
  type PipelineDeal,
} from "@/lib/pipeline/clientPipeline";
import {
  recordInsightSignals,
  type InsightSignalInput,
} from "./insightSignals";

function fmtMoney(n: number): string {
  return `$${Math.round(Math.abs(n)).toLocaleString()}`;
}
function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export interface EmitClientPipelineArgs {
  customerId: string;
}

export async function emitClientPipelineSignals(
  args: EmitClientPipelineArgs,
): Promise<{ emitted: number }> {
  try {
    if (!args.customerId) return { emitted: 0 };

    const [stages, deals] = await Promise.all([
      listStages(args.customerId),
      listDeals(args.customerId),
    ]);
    const meaningful = deals.filter((d) => d.status !== "archived");
    if (meaningful.length === 0) return { emitted: 0 };

    const r = buildPipelineRollup({ stages, deals: meaningful });
    const occurredAt = new Date().toISOString();
    const base = {
      customer_id: args.customerId,
      signal_source: "tool_usage" as const,
      source_table: "client_pipeline_deals" as const,
      source_id: null as string | null,
      occurred_at: occurredAt,
    };

    const out: InsightSignalInput[] = [];
    let weakSignals = 0;

    /* pipeline_risk: many stalled deals or significant stalled value */
    if (r.stalled_count >= 3 || r.stalled_value >= 5000) {
      weakSignals += 1;
      out.push({
        ...base,
        signal_type: "pipeline_risk",
        related_pillar: "revenue_conversion",
        strength: r.stalled_count >= 6 ? "high" : "medium",
        confidence: "medium",
        evidence_label: "Stalled deals piling up",
        evidence_summary: `${r.stalled_count} stalled deals worth ${fmtMoney(r.stalled_value)}.`,
        metadata: {
          stalled_count: r.stalled_count,
          stalled_value: r.stalled_value,
        },
      });
    }

    /* follow_up_gap: aging open deals */
    if (r.aging_count >= 3 || r.aging_value >= 5000) {
      weakSignals += 1;
      out.push({
        ...base,
        signal_type: "follow_up_gap",
        related_pillar: "revenue_conversion",
        strength: r.aging_count >= 6 ? "high" : "medium",
        confidence: "medium",
        evidence_label: "Open deals lack recent activity",
        evidence_summary: `${r.aging_count} open deals (${fmtMoney(r.aging_value)}) have no activity in 30+ days.`,
        metadata: {
          aging_count: r.aging_count,
          aging_value: r.aging_value,
        },
      });
    }

    /* revenue_leak: proposals sent without conversion */
    if (
      r.proposal_to_win_rate !== null &&
      r.proposal_to_win_rate < 0.1 &&
      r.won_count + r.lost_count + r.stalled_count >= 5
    ) {
      weakSignals += 1;
      out.push({
        ...base,
        signal_type: "revenue_leak",
        related_pillar: "revenue_conversion",
        strength: "medium",
        confidence: "medium",
        evidence_label: "Proposals not converting to wins",
        evidence_summary: `Proposal-to-win rate ${fmtPct(r.proposal_to_win_rate)} across recent pipeline.`,
        metadata: {
          proposal_to_win_rate: r.proposal_to_win_rate,
          won_count: r.won_count,
          lost_count: r.lost_count,
        },
      });
    }

    /* validated_strength: repeated wins concentrated by source */
    const wonBySource = new Map<string, { count: number; value: number }>();
    for (const d of meaningful) {
      if (d.status !== "won") continue;
      const key = (d.source_channel || "Unspecified").trim();
      const cur = wonBySource.get(key) ?? { count: 0, value: 0 };
      cur.count += 1;
      cur.value += Number(d.estimated_value) || 0;
      wonBySource.set(key, cur);
    }
    for (const [src, agg] of wonBySource.entries()) {
      if (agg.count >= 3 && src !== "Unspecified") {
        out.push({
          ...base,
          signal_type: "validated_strength",
          related_pillar: "revenue_conversion",
          strength: agg.count >= 5 ? "high" : "medium",
          confidence: "medium",
          evidence_label: `${src}: reliable conversion source`,
          evidence_summary: `${agg.count} won deals worth ${fmtMoney(agg.value)} via ${src}.`,
          metadata: { source_channel: src, won_count: agg.count, won_value: agg.value },
        });
      }
    }

    /* benchmark_risk: bloated pipeline with low progression */
    const totalNonArchived = meaningful.length;
    const lateStageCount = r.by_stage
      .filter((s) => /(proposal|negotiation)/i.test(s.label))
      .reduce((acc, s) => acc + s.count, 0);
    if (
      (weakSignals >= 2) ||
      (totalNonArchived >= 10 && lateStageCount / totalNonArchived < 0.15)
    ) {
      out.push({
        ...base,
        signal_type: "benchmark_risk",
        related_pillar: "revenue_conversion",
        strength: weakSignals >= 3 ? "high" : "medium",
        confidence: "medium",
        evidence_label: "Pipeline weak across multiple dimensions",
        evidence_summary:
          `${weakSignals} pipeline weaknesses detected. ` +
          `${r.open_count} open / ${r.stalled_count} stalled / ${r.aging_count} aging.`,
        metadata: {
          open_count: r.open_count,
          stalled_count: r.stalled_count,
          aging_count: r.aging_count,
          weighted_value: r.weighted_value,
        },
      });
    }

    if (out.length === 0) return { emitted: 0 };
    await recordInsightSignals(out);
    return { emitted: out.length };
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn("[clientPipelineSignalEmitter] suppressed:", (e as Error)?.message);
    }
    return { emitted: 0 };
  }
}