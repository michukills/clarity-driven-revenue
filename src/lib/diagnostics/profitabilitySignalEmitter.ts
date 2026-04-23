/* P11.6 — Profitability signal emitter.
 *
 * Reads the profitability rollup and emits aggregate-level signals about
 * margin health by offer and client. Honors learning_enabled via
 * recordInsightSignals. Never writes to rgs_pattern_intelligence.
 *
 * Signal types emitted:
 *   - validated_strength  consistently strong-margin offer
 *   - revenue_leak        high-revenue offer or client with weak/negative margin
 *   - benchmark_risk      stacked weakness across multiple offers/clients
 *   - report_insight      profit concentrated on one offer or client
 */

import {
  buildProfitabilityRollup,
  type ProfitWindow,
} from "@/lib/bcc/profitability";
import {
  recordInsightSignals,
  type InsightSignalInput,
} from "./insightSignals";

function fmtMoney(n: number) {
  return `$${Math.round(Math.abs(n)).toLocaleString()}`;
}
function fmtPct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export interface EmitProfitabilityArgs {
  customerId: string;
  window?: ProfitWindow;
}

export async function emitProfitabilitySignals(
  args: EmitProfitabilityArgs,
): Promise<{ emitted: number }> {
  try {
    if (!args.customerId) return { emitted: 0 };
    const r = await buildProfitabilityRollup({
      customerId: args.customerId,
      window: args.window ?? "trailing_90",
    });
    if (r.total_revenue <= 0) return { emitted: 0 };

    const occurredAt = new Date().toISOString();
    const base = {
      customer_id: args.customerId,
      signal_source: "tool_usage" as const,
      source_table: "revenue_entries" as const,
      source_id: null as string | null,
      occurred_at: occurredAt,
    };
    const out: InsightSignalInput[] = [];
    let weak = 0;

    /* validated_strength: best offer with strong margin */
    if (
      r.best_offer &&
      r.best_offer.attribution_complete &&
      r.best_offer.gross_margin >= 0.45 &&
      r.best_offer.share_of_revenue >= 0.1
    ) {
      out.push({
        ...base,
        signal_type: "validated_strength",
        related_pillar: "financial_visibility",
        strength: r.best_offer.gross_margin >= 0.6 ? "high" : "medium",
        confidence: "medium",
        evidence_label: `${r.best_offer.label}: strong-margin offer`,
        evidence_summary:
          `${r.best_offer.label} delivered ${fmtPct(r.best_offer.gross_margin)} gross margin ` +
          `on ${fmtMoney(r.best_offer.revenue)} revenue.`,
        metadata: {
          offer: r.best_offer.label,
          gross_margin: r.best_offer.gross_margin,
          revenue: r.best_offer.revenue,
          window: r.window,
        },
      });
    }

    /* revenue_leak: high-revenue offer with weak/negative margin */
    const leakOffers = r.offers.filter(
      (o) =>
        o.attribution_complete &&
        o.share_of_revenue >= 0.15 &&
        o.gross_margin < 0.1,
    );
    if (leakOffers.length > 0) {
      weak += 1;
      const top = leakOffers[0];
      out.push({
        ...base,
        signal_type: "revenue_leak",
        related_pillar: "financial_visibility",
        strength: top.gross_margin < 0 ? "high" : "medium",
        confidence: "medium",
        evidence_label: `${top.label}: weak-margin offer`,
        evidence_summary:
          `${top.label} represents ${fmtPct(top.share_of_revenue)} of revenue ` +
          `but only ${fmtPct(top.gross_margin)} gross margin.`,
        metadata: {
          offer: top.label,
          gross_margin: top.gross_margin,
          revenue: top.revenue,
          labor_cost: top.labor_cost,
          window: r.window,
        },
      });
    }

    /* revenue_leak: high-revenue client with weak margin */
    const leakClients = r.clients.filter(
      (c) =>
        c.attribution_complete &&
        c.share_of_revenue >= 0.15 &&
        c.gross_margin < 0.1,
    );
    if (leakClients.length > 0) {
      weak += 1;
      const top = leakClients[0];
      out.push({
        ...base,
        signal_type: "revenue_leak",
        related_pillar: "financial_visibility",
        strength: top.gross_margin < 0 ? "high" : "medium",
        confidence: "medium",
        evidence_label: `${top.label}: low-margin client`,
        evidence_summary:
          `${top.label} drives ${fmtPct(top.share_of_revenue)} of revenue ` +
          `at only ${fmtPct(top.gross_margin)} gross margin.`,
        metadata: {
          client: top.label,
          gross_margin: top.gross_margin,
          revenue: top.revenue,
          labor_cost: top.labor_cost,
          window: r.window,
        },
      });
    }

    /* report_insight: profit concentrated on one offer or client */
    const topOffer = r.offers.find((o) => o.share_of_profit >= 0.5);
    if (topOffer) {
      out.push({
        ...base,
        signal_type: "report_insight",
        related_pillar: "financial_visibility",
        strength: topOffer.share_of_profit >= 0.7 ? "high" : "medium",
        confidence: "medium",
        evidence_label: `${topOffer.label}: profit concentration`,
        evidence_summary: `${fmtPct(topOffer.share_of_profit)} of gross profit comes from ${topOffer.label}.`,
        metadata: { offer: topOffer.label, share_of_profit: topOffer.share_of_profit, window: r.window },
      });
    }
    const topClient = r.clients.find((c) => c.share_of_profit >= 0.5);
    if (topClient) {
      out.push({
        ...base,
        signal_type: "report_insight",
        related_pillar: "financial_visibility",
        strength: topClient.share_of_profit >= 0.7 ? "high" : "medium",
        confidence: "medium",
        evidence_label: `${topClient.label}: client concentration`,
        evidence_summary: `${fmtPct(topClient.share_of_profit)} of gross profit comes from ${topClient.label}.`,
        metadata: { client: topClient.label, share_of_profit: topClient.share_of_profit, window: r.window },
      });
    }

    /* benchmark_risk: multiple weak offers or weak overall margin */
    const weakOffers = r.offers.filter(
      (o) => o.attribution_complete && o.revenue >= 500 && o.gross_margin < 0.15,
    ).length;
    if (weak >= 2 || weakOffers >= 3 || (r.total_gross_margin < 0.1 && r.total_revenue >= 5000)) {
      out.push({
        ...base,
        signal_type: "benchmark_risk",
        related_pillar: "financial_visibility",
        strength: r.total_gross_margin < 0 ? "high" : "medium",
        confidence: "medium",
        evidence_label: "Profitability weak across multiple lines",
        evidence_summary:
          `Overall gross margin ${fmtPct(r.total_gross_margin)} on ${fmtMoney(r.total_revenue)}. ` +
          `${weakOffers} offers below 15% margin.`,
        metadata: {
          total_gross_margin: r.total_gross_margin,
          total_revenue: r.total_revenue,
          weak_offers: weakOffers,
          window: r.window,
        },
      });
    }

    if (out.length === 0) return { emitted: 0 };
    await recordInsightSignals(out);
    return { emitted: out.length };
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn("[profitabilitySignalEmitter] suppressed:", (e as Error)?.message);
    }
    return { emitted: 0 };
  }
}