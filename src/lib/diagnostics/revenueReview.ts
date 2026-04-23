/* P11.10 — Revenue Review Diagnostic.
 *
 * Structured diagnostic over 12-36 months of monthly revenue points.
 * Produces:
 *   - trend / volatility / seasonality / inflection metrics
 *   - strengths / risks / ranked priority actions
 *   - provenance + verification visibility
 *
 * Reads/writes:
 *   - revenue_review_diagnostics
 *   - revenue_review_monthly_points
 *
 * Pulls verified imported revenue from `integration_external_records`
 * (record_kind = 'revenue') when available — pending imports stay pending
 * until the client verifies them.
 */

import { supabase } from "@/integrations/supabase/client";

export type ReviewStatus = "draft" | "completed" | "archived";
export type PointConfidence = "low" | "medium" | "high";
export type PointSource = "manual" | "csv" | "imported_quickbooks" | "imported" | "inferred";

export interface RevenueReviewDiagnostic {
  id: string;
  customer_id: string;
  status: ReviewStatus;
  analysis_window_months: number;
  period_start: string | null;
  period_end: string | null;
  summary: string | null;
  strengths: ReviewFinding[];
  risks: ReviewFinding[];
  priority_actions: PriorityAction[];
  analysis_payload: Record<string, unknown>;
  source: string;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevenueReviewPoint {
  id: string;
  customer_id: string;
  diagnostic_id: string;
  month_date: string; // YYYY-MM-01
  revenue_amount: number;
  source: string;
  source_ref: string | null;
  confidence: PointConfidence;
  is_verified: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewFinding {
  label: string;
  detail: string;
  metric?: string;
}

export type PriorityRank = "highest" | "medium" | "lower";

export interface PriorityAction {
  rank: PriorityRank;
  label: string;
  rationale: string;
}

/* ========== CRUD ========== */

export async function listReviews(customerId: string): Promise<RevenueReviewDiagnostic[]> {
  const { data, error } = await supabase
    .from("revenue_review_diagnostics")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(coerceDiag);
}

export async function createReview(
  customerId: string,
  windowMonths = 12,
): Promise<RevenueReviewDiagnostic> {
  const today = new Date();
  const periodEnd = monthFloor(today);
  const periodStart = addMonths(periodEnd, -(windowMonths - 1));
  const { data, error } = await supabase
    .from("revenue_review_diagnostics")
    .insert({
      customer_id: customerId,
      analysis_window_months: windowMonths,
      period_start: ymd(periodStart),
      period_end: ymd(periodEnd),
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw error;
  return coerceDiag(data);
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from("revenue_review_diagnostics").delete().eq("id", id);
  if (error) throw error;
}

export async function listPoints(diagnosticId: string): Promise<RevenueReviewPoint[]> {
  const { data, error } = await supabase
    .from("revenue_review_monthly_points")
    .select("*")
    .eq("diagnostic_id", diagnosticId)
    .order("month_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RevenueReviewPoint[];
}

export async function upsertPoint(
  row: Partial<RevenueReviewPoint> & {
    customer_id: string;
    diagnostic_id: string;
    month_date: string;
  },
): Promise<RevenueReviewPoint> {
  const { data, error } = await supabase
    .from("revenue_review_monthly_points")
    .upsert(row as never, { onConflict: "diagnostic_id,month_date" })
    .select("*")
    .single();
  if (error) throw error;
  return data as RevenueReviewPoint;
}

export async function setPointVerified(id: string, verified: boolean) {
  const { error } = await supabase
    .from("revenue_review_monthly_points")
    .update({ is_verified: verified })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePoint(id: string) {
  const { error } = await supabase.from("revenue_review_monthly_points").delete().eq("id", id);
  if (error) throw error;
}

/* ========== Imports ==========
 * Stage verified imported revenue from `integration_external_records` into
 * the review's monthly points. Verified imports prefill as `is_verified=true`,
 * pending imports prefill as `is_verified=false` for client approval.
 */
export async function importRevenueFromIntegrations(
  diag: RevenueReviewDiagnostic,
): Promise<{ imported: number; pending: number }> {
  const { data: rows, error } = await supabase
    .from("integration_external_records")
    .select("id, payload, external_id, provider, reconcile_status, external_updated_at")
    .eq("customer_id", diag.customer_id)
    .eq("record_kind", "revenue");
  if (error) throw error;

  const buckets = new Map<string, { amount: number; verified: boolean; source_ref: string; provider: string }>();
  const start = diag.period_start ? new Date(diag.period_start) : null;
  const end = diag.period_end ? new Date(diag.period_end) : null;

  for (const r of rows ?? []) {
    const p = (r.payload ?? {}) as Record<string, unknown>;
    const dateStr = (p.month_date as string) || (p.date as string) || (r as any).external_updated_at;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) continue;
    if (start && d < start) continue;
    if (end && d > addMonths(end, 1)) continue;
    const month = ymd(monthFloor(d));
    const amount = Number(p.revenue_amount ?? p.amount ?? 0) || 0;
    if (amount === 0) continue;
    const verified = r.reconcile_status === "imported" || r.reconcile_status === "matched";
    const prev = buckets.get(month);
    if (prev) {
      prev.amount += amount;
      prev.verified = prev.verified && verified;
    } else {
      buckets.set(month, {
        amount,
        verified,
        source_ref: r.external_id ?? r.id,
        provider: r.provider,
      });
    }
  }

  let imported = 0;
  let pending = 0;
  for (const [month, b] of buckets) {
    await upsertPoint({
      customer_id: diag.customer_id,
      diagnostic_id: diag.id,
      month_date: month,
      revenue_amount: b.amount,
      source: `imported_${b.provider}`,
      source_ref: b.source_ref,
      confidence: b.verified ? "high" : "medium",
      is_verified: b.verified,
    });
    if (b.verified) imported += 1;
    else pending += 1;
  }
  return { imported, pending };
}

/* ========== Analysis ========== */

export interface RevenueReviewAnalysis {
  total_months: number;
  verified_months: number;
  pending_months: number;
  total_revenue: number;
  average_monthly: number;
  best_month: { month: string; amount: number } | null;
  worst_month: { month: string; amount: number } | null;
  recent_3m_avg: number | null;
  prior_3m_avg: number | null;
  recent_vs_prior_change_pct: number | null;
  trend_direction: "growing" | "flat" | "declining" | "volatile" | "insufficient_data";
  volatility_coefficient: number | null; // stddev / mean
  yoy_change_pct: number | null;
  seasonality_flag: boolean;
  inflection_month: string | null;
  strengths: ReviewFinding[];
  risks: ReviewFinding[];
  priority_actions: PriorityAction[];
  summary: string;
}

export function analyzeReview(points: RevenueReviewPoint[]): RevenueReviewAnalysis {
  const verified = points.filter((p) => p.is_verified && p.revenue_amount >= 0);
  const pending = points.filter((p) => !p.is_verified).length;
  const months = verified.length;

  if (months === 0) {
    return emptyAnalysis(points.length, pending);
  }

  const amounts = verified.map((p) => Number(p.revenue_amount) || 0);
  const total = sum(amounts);
  const avg = total / months;
  const best = verified.reduce((a, b) => (b.revenue_amount > a.revenue_amount ? b : a));
  const worst = verified.reduce((a, b) => (b.revenue_amount < a.revenue_amount ? b : a));

  const recent3 = amounts.slice(-3);
  const prior3 = amounts.slice(-6, -3);
  const recent3Avg = recent3.length ? sum(recent3) / recent3.length : null;
  const prior3Avg = prior3.length ? sum(prior3) / prior3.length : null;
  const recentVsPrior =
    recent3Avg != null && prior3Avg != null && prior3Avg > 0
      ? (recent3Avg - prior3Avg) / prior3Avg
      : null;

  // YoY: compare last 3 months to same months 12 prior
  let yoy: number | null = null;
  if (months >= 15) {
    const last3 = amounts.slice(-3);
    const yearAgo = amounts.slice(-15, -12);
    const prior = sum(yearAgo);
    const recent = sum(last3);
    if (prior > 0) yoy = (recent - prior) / prior;
  }

  const std = stddev(amounts);
  const cov = avg > 0 ? std / avg : null;

  // Trend direction via simple linear regression slope as % of mean
  const slopePct = avg > 0 ? slope(amounts) / avg : 0;
  let trend: RevenueReviewAnalysis["trend_direction"];
  if (months < 4) trend = "insufficient_data";
  else if (cov != null && cov > 0.4) trend = "volatile";
  else if (slopePct > 0.02) trend = "growing";
  else if (slopePct < -0.02) trend = "declining";
  else trend = "flat";

  // Inflection: largest month-over-month delta
  let inflection: string | null = null;
  let maxDelta = 0;
  for (let i = 1; i < verified.length; i++) {
    const d = Math.abs(verified[i].revenue_amount - verified[i - 1].revenue_amount);
    if (d > maxDelta) {
      maxDelta = d;
      inflection = verified[i].month_date;
    }
  }
  if (avg > 0 && maxDelta < avg * 0.25) inflection = null;

  // Seasonality: same calendar month repeats consistently above/below mean
  const seasonality = months >= 13 ? detectSeasonality(verified, avg) : false;

  const { strengths, risks, priority_actions } = interpret({
    months, avg, total, trend, cov, recentVsPrior, yoy,
    best, worst, inflection, seasonality, pending,
  });

  const summary = buildSummary({
    months, total, avg, trend, recentVsPrior, yoy, cov, seasonality,
  });

  return {
    total_months: months,
    verified_months: months,
    pending_months: pending,
    total_revenue: total,
    average_monthly: avg,
    best_month: { month: best.month_date, amount: best.revenue_amount },
    worst_month: { month: worst.month_date, amount: worst.revenue_amount },
    recent_3m_avg: recent3Avg,
    prior_3m_avg: prior3Avg,
    recent_vs_prior_change_pct: recentVsPrior,
    trend_direction: trend,
    volatility_coefficient: cov,
    yoy_change_pct: yoy,
    seasonality_flag: seasonality,
    inflection_month: inflection,
    strengths,
    risks,
    priority_actions,
    summary,
  };
}

function emptyAnalysis(total: number, pending: number): RevenueReviewAnalysis {
  return {
    total_months: total,
    verified_months: 0,
    pending_months: pending,
    total_revenue: 0,
    average_monthly: 0,
    best_month: null,
    worst_month: null,
    recent_3m_avg: null,
    prior_3m_avg: null,
    recent_vs_prior_change_pct: null,
    trend_direction: "insufficient_data",
    volatility_coefficient: null,
    yoy_change_pct: null,
    seasonality_flag: false,
    inflection_month: null,
    strengths: [],
    risks: [],
    priority_actions: [],
    summary: "Not enough verified revenue data to analyze.",
  };
}

function interpret(c: {
  months: number;
  avg: number;
  total: number;
  trend: RevenueReviewAnalysis["trend_direction"];
  cov: number | null;
  recentVsPrior: number | null;
  yoy: number | null;
  best: RevenueReviewPoint;
  worst: RevenueReviewPoint;
  inflection: string | null;
  seasonality: boolean;
  pending: number;
}): { strengths: ReviewFinding[]; risks: ReviewFinding[]; priority_actions: PriorityAction[] } {
  const strengths: ReviewFinding[] = [];
  const risks: ReviewFinding[] = [];
  const actions: PriorityAction[] = [];

  if (c.trend === "growing") {
    strengths.push({
      label: "Sustained growth trend",
      detail: `Revenue trajectory is upward across the analyzed window (avg ${money(c.avg)}/mo).`,
    });
  }
  if (c.recentVsPrior != null && c.recentVsPrior >= 0.15) {
    strengths.push({
      label: "Recent acceleration",
      detail: `Last 3 months are ${pct(c.recentVsPrior)} above the prior 3 months.`,
      metric: pct(c.recentVsPrior),
    });
  }
  if (c.yoy != null && c.yoy >= 0.2) {
    strengths.push({
      label: "Strong year-over-year",
      detail: `Recent quarter is ${pct(c.yoy)} above the same period last year.`,
      metric: pct(c.yoy),
    });
  }
  if (c.cov != null && c.cov < 0.15 && c.trend !== "declining") {
    strengths.push({
      label: "Stable monthly base",
      detail: `Volatility is low (coefficient ${c.cov.toFixed(2)}). The base is dependable.`,
    });
  }

  if (c.trend === "declining") {
    risks.push({
      label: "Declining revenue trend",
      detail: `Linear trend is downward across the window. Recent average ${money(c.avg)}/mo.`,
    });
    actions.push({
      rank: "highest",
      label: "Stabilize revenue base before adding cost",
      rationale: "A declining trend left unchecked compounds. Diagnose the source before reinvesting in growth.",
    });
  }
  if (c.recentVsPrior != null && c.recentVsPrior <= -0.15) {
    risks.push({
      label: "Recent slowdown",
      detail: `Last 3 months are ${pct(c.recentVsPrior)} vs the prior 3 months.`,
      metric: pct(c.recentVsPrior),
    });
    if (!actions.some((a) => a.rank === "highest")) {
      actions.push({
        rank: "highest",
        label: "Investigate the recent 3-month slowdown",
        rationale: "The drop is recent enough to still be reversible. Identify lost channels or accounts now.",
      });
    }
  }
  if (c.cov != null && c.cov > 0.4) {
    risks.push({
      label: "High monthly volatility",
      detail: `Revenue swings significantly month over month (coefficient ${c.cov.toFixed(2)}).`,
      metric: c.cov.toFixed(2),
    });
    actions.push({
      rank: "medium",
      label: "Add a recurring or predictable revenue layer",
      rationale: "Volatility this high makes planning and cash management unreliable.",
    });
  }
  if (c.trend === "flat" && c.cov != null && c.cov < 0.2) {
    risks.push({
      label: "Flatline pattern",
      detail: "Revenue is stable but not growing. Risk of stagnation.",
    });
    actions.push({
      rank: "medium",
      label: "Identify the next growth lever",
      rationale: "A long flat period suggests the current model has reached its ceiling without intervention.",
    });
  }
  if (c.seasonality) {
    risks.push({
      label: "Seasonal swings",
      detail: "The same calendar months repeatedly outperform/underperform the average.",
    });
    actions.push({
      rank: "lower",
      label: "Plan cash and capacity around the seasonal cycle",
      rationale: "Predictable seasonality is manageable when actively planned for.",
    });
  }
  if (c.inflection) {
    risks.push({
      label: "Material inflection detected",
      detail: `A meaningful month-over-month change occurred at ${c.inflection.slice(0, 7)}. Investigate the cause.`,
    });
  }
  if (c.pending > 0) {
    risks.push({
      label: `${c.pending} unverified imported month(s)`,
      detail: "Imported values still need client approval before they shape downstream truth.",
    });
  }

  if (strengths.length === 0 && c.months >= 6) {
    strengths.push({
      label: "Sufficient history captured",
      detail: `${c.months} months of verified data available for ongoing benchmark comparisons.`,
    });
  }

  // Always end with at least one action
  if (actions.length === 0) {
    actions.push({
      rank: "lower",
      label: "Maintain current monthly tracking discipline",
      rationale: "No urgent revenue pattern issues detected. Keep capturing monthly data.",
    });
  }

  return { strengths, risks, priority_actions: actions };
}

function buildSummary(c: {
  months: number; total: number; avg: number;
  trend: RevenueReviewAnalysis["trend_direction"];
  recentVsPrior: number | null; yoy: number | null;
  cov: number | null; seasonality: boolean;
}): string {
  const parts: string[] = [];
  parts.push(`${c.months} months of verified revenue, totaling ${money(c.total)} (avg ${money(c.avg)}/mo).`);
  parts.push(`Trend: ${c.trend.replace(/_/g, " ")}.`);
  if (c.recentVsPrior != null) parts.push(`Recent vs prior 3 months: ${pct(c.recentVsPrior)}.`);
  if (c.yoy != null) parts.push(`Year-over-year: ${pct(c.yoy)}.`);
  if (c.cov != null) parts.push(`Volatility coefficient ${c.cov.toFixed(2)}.`);
  if (c.seasonality) parts.push("Seasonal pattern detected.");
  return parts.join(" ");
}

/* ========== Save analysis to diagnostic ========== */
export async function saveAnalysisToDiagnostic(
  diag: RevenueReviewDiagnostic,
  analysis: RevenueReviewAnalysis,
  finalize = false,
): Promise<RevenueReviewDiagnostic> {
  const { data, error } = await supabase
    .from("revenue_review_diagnostics")
    .update({
      summary: analysis.summary,
      strengths: analysis.strengths as never,
      risks: analysis.risks as never,
      priority_actions: analysis.priority_actions as never,
      analysis_payload: analysis as never,
      status: finalize ? "completed" : diag.status,
    })
    .eq("id", diag.id)
    .select("*")
    .single();
  if (error) throw error;
  return coerceDiag(data);
}

/* ========== Helpers ========== */

function coerceDiag(d: any): RevenueReviewDiagnostic {
  return {
    ...d,
    strengths: Array.isArray(d.strengths) ? d.strengths : [],
    risks: Array.isArray(d.risks) ? d.risks : [],
    priority_actions: Array.isArray(d.priority_actions) ? d.priority_actions : [],
    analysis_payload: d.analysis_payload ?? {},
  } as RevenueReviewDiagnostic;
}

function sum(a: number[]) { return a.reduce((s, x) => s + x, 0); }
function stddev(a: number[]) {
  if (a.length === 0) return 0;
  const m = sum(a) / a.length;
  return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / a.length);
}
function slope(a: number[]) {
  // Simple slope of values vs index (least squares).
  const n = a.length;
  if (n < 2) return 0;
  const xs = Array.from({ length: n }, (_, i) => i);
  const xm = (n - 1) / 2;
  const ym = sum(a) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xm) * (a[i] - ym);
    den += (xs[i] - xm) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function detectSeasonality(points: RevenueReviewPoint[], avg: number): boolean {
  if (avg <= 0) return false;
  const byMonth = new Map<number, number[]>();
  for (const p of points) {
    const m = new Date(p.month_date).getUTCMonth();
    const arr = byMonth.get(m) ?? [];
    arr.push(p.revenue_amount);
    byMonth.set(m, arr);
  }
  let strong = 0;
  for (const arr of byMonth.values()) {
    if (arr.length < 2) continue;
    const m = arr.reduce((s, x) => s + x, 0) / arr.length;
    if (Math.abs(m - avg) / avg >= 0.2) strong += 1;
  }
  return strong >= 2;
}

function monthFloor(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function money(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}
function pct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${Math.round(n * 100)}%`;
}