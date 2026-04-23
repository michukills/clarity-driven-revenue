/* P11.4 — Acquisition Control Center signal emitter.
 *
 * Reads recent channels + spend + lead metrics, builds rollups, and emits
 * a small number of structured signals into customer_insight_signals.
 *
 * Signal types:
 *   - revenue_leak      high spend + weak outcomes
 *   - validated_strength strong channel with healthy conversion
 *   - follow_up_gap      many leads, few booked calls
 *   - pipeline_risk      many booked calls, few wins
 *   - benchmark_risk     stacked weakness across multiple channels
 *
 * Best-effort. Honors learning_enabled via recordInsightSignals.
 * Never writes to rgs_pattern_intelligence.
 */

import {
  buildChannelRollups,
  listChannels,
  listMetrics,
  listSpend,
  type ChannelRollup,
} from "@/lib/acquisition/acquisition";
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

export interface EmitAcquisitionArgs {
  customerId: string;
  /** Lookback for entries to consider (default ~90 days). */
  sinceDays?: number;
}

export async function emitAcquisitionSignals(
  args: EmitAcquisitionArgs,
): Promise<{ emitted: number }> {
  try {
    if (!args.customerId) return { emitted: 0 };
    const sinceDays = args.sinceDays ?? 90;

    const [channels, spend, metrics] = await Promise.all([
      listChannels(args.customerId),
      listSpend(args.customerId, { sinceDays }),
      listMetrics(args.customerId, { sinceDays }),
    ]);
    if (channels.length === 0) return { emitted: 0 };
    if (spend.length === 0 && metrics.length === 0) return { emitted: 0 };

    const rollups = buildChannelRollups({ channels, spend, metrics });
    // Only consider channels with material activity.
    const active = rollups.filter(
      (r) =>
        r.status !== "archived" &&
        (r.spend > 0 || r.leads > 0 || r.booked_calls > 0 || r.won_deals > 0),
    );
    if (active.length === 0) return { emitted: 0 };

    const occurredAt = new Date().toISOString();
    const base = {
      customer_id: args.customerId,
      signal_source: "business_control_report" as const,
      source_table: "lead_source_metrics" as const,
      source_id: null as string | null,
      occurred_at: occurredAt,
    };

    const out: InsightSignalInput[] = [];

    let weakStackCount = 0;

    for (const r of active) {
      /* revenue_leak: meaningful spend, weak outcomes */
      const weakOutcomes =
        r.spend >= 500 &&
        ((r.won_deals === 0 && r.booked_calls < 2) ||
          (r.revenue_to_spend !== null && r.revenue_to_spend < 1) ||
          (r.cost_per_qualified_lead !== null && r.cost_per_qualified_lead > 500));
      if (weakOutcomes) {
        weakStackCount += 1;
        out.push({
          ...base,
          source_id: r.channel_id,
          signal_type: "revenue_leak",
          related_pillar: "demand_generation",
          strength: r.spend >= 2500 ? "high" : "medium",
          confidence: "medium",
          evidence_label: `${r.label}: spend without return`,
          evidence_summary:
            `Spent ${fmtMoney(r.spend)}` +
            (r.won_deals > 0
              ? `, won ${r.won_deals} (${fmtMoney(r.revenue_attributed)} attributed)`
              : `, no won deals recorded`) +
            (r.cost_per_qualified_lead !== null
              ? `, CPQL ${fmtMoney(r.cost_per_qualified_lead)}.`
              : "."),
          metadata: {
            channel_key: r.channel_key,
            spend: r.spend,
            leads: r.leads,
            qualified_leads: r.qualified_leads,
            booked_calls: r.booked_calls,
            won_deals: r.won_deals,
            revenue_attributed: r.revenue_attributed,
            cost_per_lead: r.cost_per_lead,
            cost_per_qualified_lead: r.cost_per_qualified_lead,
            revenue_to_spend: r.revenue_to_spend,
          },
        });
      }

      /* validated_strength: healthy converter */
      const strong =
        r.won_deals >= 2 &&
        ((r.revenue_to_spend !== null && r.revenue_to_spend >= 3) ||
          (r.spend === 0 && r.revenue_attributed > 0)) &&
        (r.call_to_win_rate === null || r.call_to_win_rate >= 0.2);
      if (strong) {
        out.push({
          ...base,
          source_id: r.channel_id,
          signal_type: "validated_strength",
          related_pillar: "revenue_conversion",
          strength: "high",
          confidence: "medium",
          evidence_label: `${r.label}: reliable revenue source`,
          evidence_summary:
            `${r.won_deals} won deals, ${fmtMoney(r.revenue_attributed)} attributed` +
            (r.spend > 0
              ? `, ${r.revenue_to_spend!.toFixed(1)}× return on ${fmtMoney(r.spend)}.`
              : ` with no recorded spend.`),
          metadata: {
            channel_key: r.channel_key,
            spend: r.spend,
            won_deals: r.won_deals,
            revenue_attributed: r.revenue_attributed,
            revenue_to_spend: r.revenue_to_spend,
            call_to_win_rate: r.call_to_win_rate,
          },
        });
      }

      /* follow_up_gap: many leads, few booked calls */
      if (r.leads >= 10 && r.lead_to_call_rate !== null && r.lead_to_call_rate < 0.1) {
        out.push({
          ...base,
          source_id: r.channel_id,
          signal_type: "follow_up_gap",
          related_pillar: "revenue_conversion",
          strength: r.leads >= 30 ? "high" : "medium",
          confidence: "medium",
          evidence_label: `${r.label}: leads not converting to calls`,
          evidence_summary: `${r.leads} leads → ${r.booked_calls} booked calls (${fmtPct(r.lead_to_call_rate)}).`,
          metadata: {
            channel_key: r.channel_key,
            leads: r.leads,
            booked_calls: r.booked_calls,
            lead_to_call_rate: r.lead_to_call_rate,
          },
        });
      }

      /* pipeline_risk: calls without wins */
      if (
        r.booked_calls >= 5 &&
        r.call_to_win_rate !== null &&
        r.call_to_win_rate < 0.1
      ) {
        out.push({
          ...base,
          source_id: r.channel_id,
          signal_type: "pipeline_risk",
          related_pillar: "revenue_conversion",
          strength: r.booked_calls >= 15 ? "high" : "medium",
          confidence: "medium",
          evidence_label: `${r.label}: calls not converting to deals`,
          evidence_summary: `${r.booked_calls} booked calls → ${r.won_deals} won (${fmtPct(r.call_to_win_rate)}).`,
          metadata: {
            channel_key: r.channel_key,
            booked_calls: r.booked_calls,
            won_deals: r.won_deals,
            call_to_win_rate: r.call_to_win_rate,
          },
        });
      }
    }

    /* benchmark_risk: stacked weakness across portfolio */
    const totalSpend = active.reduce((s, r) => s + r.spend, 0);
    const totalRevenue = active.reduce((s, r) => s + r.revenue_attributed, 0);
    if (
      weakStackCount >= 2 ||
      (totalSpend >= 2000 && totalRevenue > 0 && totalRevenue / totalSpend < 1)
    ) {
      out.push({
        ...base,
        source_id: null,
        signal_type: "benchmark_risk",
        related_pillar: "demand_generation",
        strength: weakStackCount >= 3 ? "high" : "medium",
        confidence: "medium",
        evidence_label: "Acquisition portfolio underperforming",
        evidence_summary:
          `${weakStackCount} channels showing leak.` +
          (totalSpend > 0
            ? ` Portfolio: ${fmtMoney(totalSpend)} spend → ${fmtMoney(totalRevenue)} attributed.`
            : ""),
        metadata: {
          weak_channel_count: weakStackCount,
          total_spend: totalSpend,
          total_revenue_attributed: totalRevenue,
          portfolio_revenue_to_spend:
            totalSpend > 0 ? totalRevenue / totalSpend : null,
        },
      });
    }

    if (out.length === 0) return { emitted: 0 };
    await recordInsightSignals(out);
    return { emitted: out.length };
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn(
        "[acquisitionSignalEmitter] suppressed:",
        (e as Error)?.message,
      );
    }
    return { emitted: 0 };
  }
}

export type { ChannelRollup };
