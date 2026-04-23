/* P11.9 — Operations module signal emitter.
 *
 * Reads the operations rollup and emits aggregate signals about SOP gaps,
 * recurring bottlenecks, capacity strain, and owner-only work. Honors
 * learning_enabled via recordInsightSignals. Never writes to
 * rgs_pattern_intelligence.
 *
 * Signal types emitted:
 *   - operational_bottleneck   recurring or high-severity bottlenecks
 *   - benchmark_risk           sustained over-capacity or stacked owner-only risk
 *   - report_insight           sustained over-capacity or undocumented critical work
 *   - implementation_progress  documented_level moves from weak to active
 *   - resolved_issue           previously-open recurring bottleneck now resolved
 */

import {
  buildOperationsRollup,
  type OperationsRollup,
} from "@/lib/operations/operations";
import {
  recordInsightSignals,
  type InsightSignalInput,
} from "./insightSignals";

export interface EmitOperationsArgs {
  customerId: string;
}

export async function emitOperationsSignals(
  args: EmitOperationsArgs,
): Promise<{ emitted: number }> {
  try {
    if (!args.customerId) return { emitted: 0 };
    const r = await buildOperationsRollup(args.customerId);
    const out = collectOperationsSignals(args.customerId, r);
    if (out.length === 0) return { emitted: 0 };
    await recordInsightSignals(out);
    return { emitted: out.length };
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn(
        "[operationsSignalEmitter] suppressed:",
        (e as Error)?.message,
      );
    }
    return { emitted: 0 };
  }
}

export function collectOperationsSignals(
  customerId: string,
  r: OperationsRollup,
): InsightSignalInput[] {
  const occurredAt = new Date().toISOString();
  const out: InsightSignalInput[] = [];
  const base = {
    customer_id: customerId,
    signal_source: "tool_usage" as const,
    occurred_at: occurredAt,
  };

  /* operational_bottleneck — recurring/constant high severity open */
  const recurringHigh = r.bottlenecks.filter(
    (b) =>
      (b.frequency === "recurring" || b.frequency === "constant") &&
      b.severity === "high" &&
      (b.status === "open" || b.status === "monitoring"),
  );
  if (recurringHigh.length > 0) {
    const top = recurringHigh[0];
    out.push({
      ...base,
      signal_type: "operational_bottleneck",
      related_pillar: "operational_efficiency",
      strength: recurringHigh.length >= 3 ? "high" : "medium",
      confidence: "medium",
      source_table: "operational_bottlenecks",
      source_id: top.id,
      evidence_label: `Recurring bottleneck: ${top.title}`,
      evidence_summary:
        `${recurringHigh.length} high-severity bottleneck${recurringHigh.length === 1 ? "" : "s"} ` +
        `recurring. Top: ${top.title} (${top.bottleneck_type.replace(/_/g, " ")}).`,
      metadata: {
        count: recurringHigh.length,
        bottleneck_type: top.bottleneck_type,
      },
    });
  }

  /* benchmark_risk — many owner-only open items / high-risk dependence */
  if (r.owner_only_open >= 3 || r.high_risk_owner_items >= 3) {
    out.push({
      ...base,
      signal_type: "benchmark_risk",
      related_pillar: "owner_independence",
      strength: r.high_risk_owner_items >= 5 ? "high" : "medium",
      confidence: "medium",
      source_table: "owner_dependence_items",
      source_id: null,
      evidence_label: "Owner dependence concentrated",
      evidence_summary:
        `${r.owner_only_open} open owner-only bottleneck(s) and ` +
        `${r.high_risk_owner_items} high-risk undelegated task(s).`,
      metadata: {
        owner_only_open: r.owner_only_open,
        high_risk_owner_items: r.high_risk_owner_items,
      },
    });
  }

  /* report_insight / benchmark_risk — sustained over-capacity */
  if (r.derived.over_capacity && r.capacity_latest) {
    const sustained =
      r.capacity_history.length >= 2 &&
      r.capacity_history.slice(0, 2).every((s) => {
        const dl = s.delivery_hours_committed != null && s.delivery_hours_available
          ? s.delivery_hours_committed / Math.max(s.delivery_hours_available, 1)
          : 0;
        const ow = (s.owner_hours_per_week ?? 0) / 40;
        return dl > 1 || ow > 1;
      });
    out.push({
      ...base,
      signal_type: sustained ? "benchmark_risk" : "report_insight",
      related_pillar: "operational_efficiency",
      strength: sustained ? "high" : "medium",
      confidence: "medium",
      source_table: "operational_capacity_snapshots",
      source_id: r.capacity_latest.id,
      evidence_label: sustained ? "Sustained over-capacity" : "Over-capacity snapshot",
      evidence_summary:
        `Latest capacity snapshot shows committed work exceeding available hours` +
        (sustained ? " across multiple snapshots." : "."),
      metadata: {
        delivery_load_ratio: r.derived.delivery_load_ratio,
        owner_load_ratio: r.derived.owner_load_ratio,
        sustained,
      },
    });
  }

  /* report_insight — many undocumented critical SOPs */
  if (r.undocumented_sops >= 3 || r.needs_review_sops >= 3) {
    out.push({
      ...base,
      signal_type: "report_insight",
      related_pillar: "operational_efficiency",
      strength: r.undocumented_sops >= 5 ? "high" : "medium",
      confidence: "medium",
      source_table: "operational_sops",
      source_id: null,
      evidence_label: "Process documentation gap",
      evidence_summary:
        `${r.undocumented_sops} SOP(s) undocumented or partial; ` +
        `${r.needs_review_sops} flagged for review.`,
      metadata: {
        undocumented_sops: r.undocumented_sops,
        needs_review_sops: r.needs_review_sops,
      },
    });
  }

  /* implementation_progress — meaningful share of SOPs fully documented and active */
  const totalSops = r.sops.length;
  const strongSops = r.sops.filter(
    (s) =>
      s.status === "active" &&
      (s.documented_level === "usable" || s.documented_level === "fully_systemized"),
  ).length;
  if (totalSops >= 3 && strongSops / totalSops >= 0.6) {
    out.push({
      ...base,
      signal_type: "implementation_progress",
      related_pillar: "operational_efficiency",
      strength: "medium",
      confidence: "medium",
      source_table: "operational_sops",
      source_id: null,
      evidence_label: "Operating processes maturing",
      evidence_summary:
        `${strongSops} of ${totalSops} SOPs are active and at least usable.`,
      metadata: { strong_sops: strongSops, total_sops: totalSops },
    });
  }

  /* resolved_issue — recurring bottleneck now resolved */
  const resolvedRecurring = r.bottlenecks.filter(
    (b) =>
      (b.frequency === "recurring" || b.frequency === "constant") &&
      b.status === "resolved",
  );
  if (resolvedRecurring.length > 0) {
    const top = resolvedRecurring[0];
    out.push({
      ...base,
      signal_type: "resolved_issue",
      related_pillar: "operational_efficiency",
      strength: "medium",
      confidence: "medium",
      source_table: "operational_bottlenecks",
      source_id: top.id,
      evidence_label: `Resolved recurring bottleneck: ${top.title}`,
      evidence_summary:
        `${resolvedRecurring.length} previously recurring bottleneck(s) now resolved.`,
      metadata: { count: resolvedRecurring.length },
    });
  }

  return out;
}