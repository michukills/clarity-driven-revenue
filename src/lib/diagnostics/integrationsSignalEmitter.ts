/* P11.7 — Integrations signal emitter.
 *
 * Reads the integration rollup and emits aggregate-level signals about
 * connected-data health: stale syncs, growing reconciliation backlog,
 * connector errors, and validated multi-source coverage. Honors
 * learning_enabled via recordInsightSignals. Never writes to
 * rgs_pattern_intelligence.
 *
 * Signal types emitted:
 *   - missing_source_data   no integrations OR every connector stale/errored
 *   - cash_pressure         imported overdue obligations / unpaid invoices via sync (handled downstream)
 *   - report_insight        large pending reconciliation backlog
 *   - validated_strength    fresh, healthy connector coverage
 *   - benchmark_risk        recurring connector errors
 */

import { buildIntegrationRollup } from "@/lib/integrations/integrations";
import { BRANDS } from "@/config/brands";
import {
  recordInsightSignals,
  type InsightSignalInput,
} from "./insightSignals";

export interface EmitIntegrationsArgs {
  customerId: string;
}

export async function emitIntegrationSignals(
  args: EmitIntegrationsArgs,
): Promise<{ emitted: number }> {
  try {
    if (!args.customerId) return { emitted: 0 };
    const r = await buildIntegrationRollup(args.customerId);

    const occurredAt = new Date().toISOString();
    const base = {
      customer_id: args.customerId,
      signal_source: "tool_usage" as const,
      source_table: "customer_integrations" as const,
      source_id: null as string | null,
      occurred_at: occurredAt,
    };
    const out: InsightSignalInput[] = [];

    /* missing_source_data: nothing connected, OR everything stale/broken */
    if (r.total_integrations === 0) {
      out.push({
        ...base,
        signal_type: "missing_source_data",
        related_pillar: "financial_visibility",
        strength: "medium",
        confidence: "high",
        evidence_label: "No external systems connected",
        evidence_summary:
          `Client has no integrations connected (e.g. ${BRANDS.quickbooks}). Financial truth is fully manual.`,
        metadata: { rollup: r },
      });
    } else if (r.has_stale_sync) {
      out.push({
        ...base,
        signal_type: "missing_source_data",
        related_pillar: "financial_visibility",
        strength: r.errored > 0 ? "high" : "medium",
        confidence: "high",
        evidence_label: "Integration data is stale",
        evidence_summary:
          r.last_successful_sync_at == null
            ? `Connected ${r.total_integrations} integration${r.total_integrations === 1 ? "" : "s"} but no successful sync yet.`
            : `Last successful sync was ${r.data_freshness_days} day${r.data_freshness_days === 1 ? "" : "s"} ago.`,
        metadata: { rollup: r },
      });
    }

    /* report_insight: large reconciliation backlog */
    if (r.pending_reconcile >= 10 || (r.oldest_pending_days ?? 0) >= 14) {
      out.push({
        ...base,
        signal_type: "report_insight",
        related_pillar: "financial_visibility",
        strength: r.pending_reconcile >= 25 ? "high" : "medium",
        confidence: "medium",
        evidence_label: "Reconciliation backlog growing",
        evidence_summary:
          `${r.pending_reconcile} synced records still pending review` +
          (r.oldest_pending_days != null
            ? ` (oldest ${r.oldest_pending_days} days).`
            : "."),
        metadata: { rollup: r },
      });
    }

    /* benchmark_risk: connectors erroring */
    if (r.errored >= 1) {
      out.push({
        ...base,
        signal_type: "benchmark_risk",
        related_pillar: "financial_visibility",
        strength: r.errored >= 2 ? "high" : "medium",
        confidence: "high",
        evidence_label: "Connector(s) in error state",
        evidence_summary: `${r.errored} integration${r.errored === 1 ? " is" : "s are"} reporting sync errors.`,
        metadata: { rollup: r },
      });
    }

    /* validated_strength: at least one healthy, recently synced connector */
    if (
      r.active >= 1 &&
      r.errored === 0 &&
      r.data_freshness_days != null &&
      r.data_freshness_days <= 7 &&
      r.imported_total >= 3
    ) {
      out.push({
        ...base,
        signal_type: "validated_strength",
        related_pillar: "financial_visibility",
        strength: r.imported_total >= 10 ? "high" : "medium",
        confidence: "high",
        evidence_label: "Trusted external data flowing",
        evidence_summary: `Healthy connector coverage with ${r.imported_total} reconciled records and recent sync.`,
        metadata: { rollup: r },
      });
    }

    if (out.length === 0) return { emitted: 0 };
    await recordInsightSignals(out);
    return { emitted: out.length };
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn("[integrationsSignalEmitter] suppressed:", (e as Error)?.message);
    }
    return { emitted: 0 };
  }
}