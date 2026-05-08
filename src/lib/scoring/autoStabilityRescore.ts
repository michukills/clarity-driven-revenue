/* P11.11 — Auto Stability Re-Score
 *
 * Recomputes a customer's Stability Score (0–1000) from accumulated
 * operating truth across the OS: cash position, financial obligations,
 * pipeline health, profitability, operations (bottlenecks, owner load),
 * acquisition signals, revenue review findings, and the standing
 * Insight Signal bus.
 *
 * Principle:
 *   Five pillars × 0–200 each → total 0–1000.
 *   Each pillar starts at a neutral baseline (120) and is nudged by
 *   evidence. The model is intentionally simple and explainable.
 */

import { supabase } from "@/integrations/supabase/client";
import { loadLearningSettings } from "@/lib/diagnostics/learningSettings";

export type Pillar =
  | "demand_generation"
  | "revenue_conversion"
  | "financial_visibility"
  | "operational_efficiency"
  | "leadership_execution";

export interface PillarScore {
  pillar: Pillar;
  label: string;
  score: number; // 0–200
  contributors: { label: string; delta: number }[];
}

export interface AutoScoreResult {
  customer_id: string;
  score_total: number;       // 0–1000
  prior_score: number | null;
  delta_from_prior: number | null;
  pillars: PillarScore[];
  summary: string;
  inputs: Record<string, unknown>;
  contributors: { label: string; delta: number; pillar: Pillar }[];
}

const PILLAR_LABEL: Record<Pillar, string> = {
  demand_generation: "Demand Generation",
  revenue_conversion: "Revenue Conversion",
  financial_visibility: "Financial Visibility",
  operational_efficiency: "Operational Efficiency",
  leadership_execution: "Leadership & Execution",
};

const BASELINE = 120; // per pillar (0–200), 600 total baseline
const MAX_PILLAR = 200;
const MIN_PILLAR = 0;

function clampPillar(n: number) {
  return Math.max(MIN_PILLAR, Math.min(MAX_PILLAR, Math.round(n)));
}

async function safeSelect<T>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T | null> {
  try {
    const { data, error } = await p;
    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}

/** Compute an evidence-aware score without writing anything. */
export async function computeAutoStabilityScore(customerId: string): Promise<AutoScoreResult> {
  // Initialize pillars at baseline
  const pillars: Record<Pillar, PillarScore> = {
    demand_generation: { pillar: "demand_generation", label: PILLAR_LABEL.demand_generation, score: BASELINE, contributors: [] },
    revenue_conversion: { pillar: "revenue_conversion", label: PILLAR_LABEL.revenue_conversion, score: BASELINE, contributors: [] },
    financial_visibility: { pillar: "financial_visibility", label: PILLAR_LABEL.financial_visibility, score: BASELINE, contributors: [] },
    operational_efficiency: { pillar: "operational_efficiency", label: PILLAR_LABEL.operational_efficiency, score: BASELINE, contributors: [] },
    leadership_execution: { pillar: "leadership_execution", label: PILLAR_LABEL.leadership_execution, score: BASELINE, contributors: [] },
  };

  const inputs: Record<string, unknown> = {};

  const nudge = (p: Pillar, delta: number, label: string) => {
    if (delta === 0) return;
    pillars[p].score += delta;
    pillars[p].contributors.push({ label, delta: Math.round(delta) });
  };

  // ---- Cash position (financial_visibility) ----
  const cash = await safeSelect<any[]>(
    supabase.from("cash_position_snapshots")
      .select("cash_on_hand, available_cash, snapshot_date")
      .eq("customer_id", customerId)
      .order("snapshot_date", { ascending: false })
      .limit(2),
  );
  if (cash && cash.length > 0) {
    inputs.cash_snapshots = cash.length;
    const latest = Number(cash[0].available_cash ?? cash[0].cash_on_hand ?? 0);
    if (latest > 50000) nudge("financial_visibility", +20, "Healthy cash on hand");
    else if (latest > 10000) nudge("financial_visibility", +8, "Adequate cash on hand");
    else if (latest > 0) nudge("financial_visibility", -10, "Low cash on hand");
    else nudge("financial_visibility", -25, "Cash pressure");

    if (cash.length > 1) {
      const prev = Number(cash[1].available_cash ?? cash[1].cash_on_hand ?? 0);
      if (prev > 0 && latest > prev * 1.1) nudge("financial_visibility", +6, "Cash position improving");
      else if (prev > 0 && latest < prev * 0.85) nudge("financial_visibility", -8, "Cash position weakening");
    }
  } else {
    nudge("financial_visibility", -10, "No cash position data");
  }

  // ---- Obligations (financial_visibility) ----
  const oblig = await safeSelect<any[]>(
    supabase.from("financial_obligations")
      .select("status, priority, due_date, amount_due")
      .eq("customer_id", customerId),
  );
  if (oblig) {
    const today = new Date().toISOString().slice(0, 10);
    const overdue = oblig.filter((o) => o.status === "open" && o.due_date && o.due_date < today).length;
    const critical = oblig.filter((o) => o.priority === "high" && o.status === "open").length;
    inputs.obligations_overdue = overdue;
    inputs.obligations_critical = critical;
    if (overdue > 0) nudge("financial_visibility", -Math.min(overdue * 6, 25), `${overdue} overdue obligation${overdue > 1 ? "s" : ""}`);
    if (critical > 2) nudge("financial_visibility", -8, "Multiple high-priority obligations");
  }

  // ---- Pipeline (revenue_conversion + demand_generation) ----
  const deals = await safeSelect<any[]>(
    supabase.from("client_pipeline_deals")
      .select("status, estimated_value, weighted_value, last_activity_date, created_date")
      .eq("customer_id", customerId),
  );
  if (deals && deals.length > 0) {
    const open = deals.filter((d) => d.status === "open");
    const won = deals.filter((d) => d.status === "won").length;
    const lost = deals.filter((d) => d.status === "lost").length;
    inputs.deals_open = open.length;
    inputs.deals_won = won;
    inputs.deals_lost = lost;

    if (open.length >= 5) nudge("demand_generation", +15, "Healthy open pipeline");
    else if (open.length >= 1) nudge("demand_generation", +5, "Some open opportunities");
    else nudge("demand_generation", -15, "No open pipeline");

    const totalClosed = won + lost;
    if (totalClosed >= 3) {
      const winRate = won / totalClosed;
      if (winRate >= 0.5) nudge("revenue_conversion", +18, `Strong win rate (${Math.round(winRate * 100)}%)`);
      else if (winRate >= 0.25) nudge("revenue_conversion", +4, `Moderate win rate (${Math.round(winRate * 100)}%)`);
      else nudge("revenue_conversion", -12, `Low win rate (${Math.round(winRate * 100)}%)`);
    }

    // Stagnation
    const now = Date.now();
    const stale = open.filter((d) => {
      const last = d.last_activity_date ? new Date(d.last_activity_date).getTime() : new Date(d.created_date).getTime();
      return now - last > 1000 * 60 * 60 * 24 * 30;
    }).length;
    if (stale > 0 && open.length > 0) {
      const ratio = stale / open.length;
      if (ratio > 0.5) nudge("revenue_conversion", -10, "Pipeline stagnation");
    }
  } else {
    nudge("demand_generation", -10, "No pipeline data");
  }

  // ---- Profitability (revenue_conversion / financial_visibility) ----
  const periods = await safeSelect<any[]>(
    supabase.from("business_health_snapshots")
      .select("margin_health_score, revenue_stability_score, cash_visibility_score, expense_control_score, business_health_score, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1),
  );
  if (periods && periods.length > 0) {
    const h = periods[0];
    if (h.margin_health_score != null) {
      const m = Number(h.margin_health_score);
      const d = Math.round(((m - 50) / 50) * 18);
      nudge("revenue_conversion", d, `Margin health (${m}/100)`);
    }
    if (h.revenue_stability_score != null) {
      const r = Number(h.revenue_stability_score);
      const d = Math.round(((r - 50) / 50) * 18);
      nudge("demand_generation", d, `Revenue stability (${r}/100)`);
    }
    if (h.cash_visibility_score != null) {
      const c = Number(h.cash_visibility_score);
      const d = Math.round(((c - 50) / 50) * 12);
      nudge("financial_visibility", d, `Cash visibility (${c}/100)`);
    }
    if (h.expense_control_score != null) {
      const e = Number(h.expense_control_score);
      const d = Math.round(((e - 50) / 50) * 10);
      nudge("financial_visibility", d, `Expense control (${e}/100)`);
    }
    inputs.has_health_snapshot = true;
  }

  // ---- Operations: bottlenecks + owner load (operational_efficiency + leadership_execution) ----
  const bottlenecks = await safeSelect<any[]>(
    supabase.from("operational_bottlenecks")
      .select("status, severity, recurring")
      .eq("customer_id", customerId),
  );
  if (bottlenecks) {
    const openB = bottlenecks.filter((b) => b.status !== "resolved");
    const recurring = openB.filter((b) => b.recurring).length;
    const high = openB.filter((b) => b.severity === "high" || b.severity === "critical").length;
    inputs.bottlenecks_open = openB.length;
    if (high > 0) nudge("operational_efficiency", -Math.min(high * 8, 24), `${high} high-severity bottleneck${high > 1 ? "s" : ""}`);
    if (recurring > 0) nudge("operational_efficiency", -Math.min(recurring * 5, 15), `${recurring} recurring bottleneck${recurring > 1 ? "s" : ""}`);
    if (openB.length === 0 && bottlenecks.length > 0) nudge("operational_efficiency", +10, "No open bottlenecks");
  }

  const sops = await safeSelect<any[]>(
    supabase.from("operational_sops")
      .select("status")
      .eq("customer_id", customerId),
  );
  if (sops && sops.length > 0) {
    const documented = sops.filter((s) => s.status === "active" || s.status === "usable").length;
    const ratio = documented / sops.length;
    inputs.sops_documented_ratio = Number(ratio.toFixed(2));
    if (ratio >= 0.7) nudge("operational_efficiency", +12, "Strong SOP coverage");
    else if (ratio < 0.3) nudge("operational_efficiency", -10, "Weak SOP coverage");
  }

  const owner = await safeSelect<any[]>(
    supabase.from("owner_dependence_items")
      .select("severity, status")
      .eq("customer_id", customerId),
  );
  if (owner) {
    const open = owner.filter((o) => o.status !== "resolved");
    const high = open.filter((o) => o.severity === "high" || o.severity === "critical").length;
    inputs.owner_dependence_open = open.length;
    if (high > 0) nudge("leadership_execution", -Math.min(high * 9, 30), `${high} high owner-dependence item${high > 1 ? "s" : ""}`);
    if (open.length === 0 && owner.length > 0) nudge("leadership_execution", +10, "Owner dependence resolved");
  }

  // ---- Insight signals (recent 60 days) ----
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString();
  const signals = await safeSelect<any[]>(
    supabase.from("customer_insight_signals")
      .select("signal_type, related_pillar, strength")
      .eq("customer_id", customerId)
      .gte("occurred_at", since),
  );
  if (signals) {
    inputs.recent_signals = signals.length;
    const weight = (s: any): number => (s.strength === "high" ? 6 : s.strength === "medium" ? 3 : 1);
    const pillarMap: Partial<Record<string, Pillar>> = {
      demand_generation: "demand_generation",
      revenue_conversion: "revenue_conversion",
      financial_visibility: "financial_visibility",
      operational_efficiency: "operational_efficiency",
      leadership_execution: "leadership_execution",
    };
    const agg: Partial<Record<Pillar, number>> = {};
    for (const s of signals) {
      const p = (s.related_pillar && pillarMap[s.related_pillar]) || "leadership_execution";
      const sign =
        s.signal_type === "validated_strength" || s.signal_type === "resolved_issue" || s.signal_type === "implementation_progress"
          ? +1
          : s.signal_type === "benchmark_risk" || s.signal_type === "cash_pressure" ||
            s.signal_type === "revenue_leak" || s.signal_type === "operational_bottleneck" ||
            s.signal_type === "owner_dependency" || s.signal_type === "pipeline_risk" ||
            s.signal_type === "recurring_blocker"
          ? -1
          : 0;
      agg[p] = (agg[p] ?? 0) + sign * weight(s);
    }
    for (const [pk, v] of Object.entries(agg)) {
      const capped = Math.max(-25, Math.min(25, v ?? 0));
      if (capped !== 0) nudge(pk as Pillar, capped, `Recent signal balance (${capped > 0 ? "+" : ""}${capped})`);
    }
  }

  // ---- Revenue review (demand_generation) ----
  const review = await safeSelect<any[]>(
    supabase.from("revenue_review_diagnostics")
      .select("payload, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1),
  );
  if (review && review.length > 0) {
    const p = review[0].payload || {};
    if (p.trend === "growing") nudge("demand_generation", +10, "Revenue trend growing");
    else if (p.trend === "declining") nudge("demand_generation", -12, "Revenue trend declining");
    if (p.volatility === "high") nudge("demand_generation", -8, "High revenue volatility");
    inputs.revenue_review_trend = p.trend ?? null;
  }

  // Clamp + total
  const pillarList = Object.values(pillars).map((p) => ({ ...p, score: clampPillar(p.score) }));
  const score_total = pillarList.reduce((acc, p) => acc + p.score, 0);

  // Prior score
  const { data: priorRow } = await supabase
    .from("stability_score_history")
    .select("score_total")
    .eq("customer_id", customerId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prior_score = priorRow ? Number((priorRow as any).score_total) : null;
  const delta_from_prior = prior_score != null ? score_total - prior_score : null;

  // Top contributors
  const allContribs = pillarList.flatMap((p) => p.contributors.map((c) => ({ ...c, pillar: p.pillar })));
  const topPos = [...allContribs].filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
  const topNeg = [...allContribs].filter((c) => c.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);

  let summary = `Auto-computed score ${score_total}/1000`;
  if (delta_from_prior != null) {
    const dir = delta_from_prior > 0 ? "rose" : delta_from_prior < 0 ? "fell" : "held";
    summary += ` — ${dir} ${Math.abs(delta_from_prior)} pts vs prior ${prior_score}.`;
  } else summary += " — first auto computation.";
  if (topPos.length) summary += ` Up: ${topPos.map((c) => c.label).join("; ")}.`;
  if (topNeg.length) summary += ` Down: ${topNeg.map((c) => c.label).join("; ")}.`;

  return {
    customer_id: customerId,
    score_total,
    prior_score,
    delta_from_prior,
    pillars: pillarList,
    summary,
    inputs,
    contributors: [...topPos, ...topNeg],
  };
}

/** Persist a computed score into history. Honors learning_enabled. */
export async function persistAutoStabilityScore(
  result: AutoScoreResult,
  actorId: string | null,
): Promise<{ written: boolean; reason?: string }> {
  const settings = await loadLearningSettings(result.customer_id);
  // We always allow admin manual rescore writes; auto writes still logged for the customer locally.
  if (settings && settings.learning_enabled === false && actorId == null) {
    return { written: false, reason: "learning_disabled" };
  }

  const breakdown: Record<string, { score: number; contributors: { label: string; delta: number }[] }> = {};
  for (const p of result.pillars) {
    breakdown[p.pillar] = { score: p.score, contributors: p.contributors };
  }

  const { error } = await supabase.from("stability_score_history").insert({
    customer_id: result.customer_id,
    score_total: result.score_total,
    prior_score: result.prior_score,
    delta_from_prior: result.delta_from_prior,
    pillar_breakdown: breakdown as any,
    score_source: "auto",
    score_summary: result.summary,
    score_inputs: result.inputs as any,
    contributors: result.contributors as any,
    created_by: actorId,
  });
  if (error) throw error;
  return { written: true };
}

export async function loadStabilityScoreHistory(customerId: string, limit = 12) {
  const { data, error } = await supabase
    .from("stability_score_history")
    .select("*")
    .eq("customer_id", customerId)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
