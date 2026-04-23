/* P10.2d — Cross-platform Insight Signal Bus.
 *
 * Central API used by every RGS surface to emit structured, client-specific
 * observations into `customer_insight_signals`. The Insight Engine reads
 * summarized signals here as supporting evidence.
 *
 * Principle:
 *   Tools emit signals.
 *   The Insight Engine interprets signals.
 *   RGS approves guidance.
 *   Published reports freeze approved truth.
 *
 * Learning controls
 *   - If the customer's `learning_enabled` is false, automatic emitters do
 *     not write rows. Admin-marked manual signals (`signal_source: "admin"`)
 *     are still allowed.
 *   - `contributes_to_global_learning` does NOT gate local signal capture.
 *     Global pattern intelligence is updated by separate protected helpers.
 *   - This module never writes to `rgs_pattern_intelligence`.
 */

import { supabase } from "@/integrations/supabase/client";
import { loadLearningSettings } from "./learningSettings";

export type SignalSource =
  | "weekly_checkin"
  | "rcc"
  | "rgs_review"
  | "business_control_report"
  | "impact_ledger"
  | "diagnostic"
  | "scorecard"
  | "tool_usage"
  | "admin"
  | "system";

export type SignalType =
  | "recurring_blocker"
  | "cash_pressure"
  | "pipeline_risk"
  | "missing_source_data"
  | "low_engagement"
  | "high_engagement"
  | "resolved_issue"
  | "validated_strength"
  | "benchmark_risk"
  | "operational_bottleneck"
  | "owner_dependency"
  | "revenue_leak"
  | "follow_up_gap"
  | "report_insight"
  | "review_requested"
  | "review_resolved"
  | "implementation_progress"
  | "tool_adoption"
  | "tool_abandonment";

export type SignalPillar =
  | "demand_generation"
  | "revenue_conversion"
  | "operational_efficiency"
  | "financial_visibility"
  | "owner_independence";

export type SignalStrength = "low" | "medium" | "high";
export type SignalConfidence = "low" | "medium" | "high";

export interface InsightSignalInput {
  customer_id: string;
  signal_source: SignalSource;
  signal_type: SignalType;
  evidence_label: string;
  evidence_summary: string;
  related_pillar?: SignalPillar | null;
  strength?: SignalStrength;
  confidence?: SignalConfidence;
  client_safe?: boolean;
  source_table?: string | null;
  source_id?: string | null;
  occurred_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface InsightSignalRow {
  id: string;
  customer_id: string;
  signal_source: SignalSource;
  signal_type: SignalType;
  related_pillar: SignalPillar | null;
  strength: SignalStrength;
  confidence: SignalConfidence;
  evidence_label: string;
  evidence_summary: string;
  client_safe: boolean;
  source_table: string | null;
  source_id: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Build a stable dedupe key for a signal. */
export function dedupeSignalKey(input: InsightSignalInput): string {
  return [
    input.customer_id,
    input.signal_source,
    input.signal_type,
    input.source_table ?? "",
    input.source_id ?? "",
    input.related_pillar ?? "",
    input.evidence_label,
  ].join("|");
}

const MAX_LABEL = 160;
const MAX_SUMMARY = 600;

function clip(s: string, n: number): string {
  const t = (s ?? "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
}

/**
 * True if this customer currently allows local signal capture.
 * Auto emitters (everything except `signal_source: "admin"`) require
 * `learning_enabled = true`. Admin manual signals are always allowed.
 */
async function isCaptureAllowed(
  customerId: string,
  source: SignalSource,
): Promise<boolean> {
  if (source === "admin") return true;
  try {
    const s = await loadLearningSettings(customerId);
    return s.learning_enabled;
  } catch {
    // Fail closed on auto signals if we can't read the flag.
    return false;
  }
}

/** Record a single insight signal. Returns the row id, or null when skipped. */
export async function recordInsightSignal(
  input: InsightSignalInput,
): Promise<string | null> {
  if (!input.customer_id || !input.evidence_label || !input.evidence_summary) {
    return null;
  }
  if (!(await isCaptureAllowed(input.customer_id, input.signal_source))) {
    return null;
  }

  const row = {
    customer_id: input.customer_id,
    signal_source: input.signal_source,
    signal_type: input.signal_type,
    related_pillar: input.related_pillar ?? null,
    strength: input.strength ?? "medium",
    confidence: input.confidence ?? "medium",
    evidence_label: clip(input.evidence_label, MAX_LABEL),
    evidence_summary: clip(input.evidence_summary, MAX_SUMMARY),
    client_safe: input.client_safe ?? false,
    source_table: input.source_table ?? null,
    source_id: input.source_id ?? null,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    metadata: (input.metadata ?? {}) as never,
  };

  const { data, error } = await supabase
    .from("customer_insight_signals")
    .upsert(row, {
      onConflict:
        "customer_id,signal_source,signal_type,source_table,source_id,evidence_label",
      ignoreDuplicates: true,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Never throw out of an emitter — emitters live in user-facing flows.
    if (typeof console !== "undefined") {
      console.warn("[insightSignals] insert failed:", error.message);
    }
    return null;
  }
  return data?.id ?? null;
}

/** Record many signals. Errors on individual rows are swallowed. */
export async function recordInsightSignals(
  inputs: InsightSignalInput[],
): Promise<void> {
  if (!inputs || inputs.length === 0) return;
  // Process sequentially so each row's learning-flag check runs.
  // (In practice the same customer is reused, so this is fine.)
  for (const input of inputs) {
    try {
      await recordInsightSignal(input);
    } catch {
      /* swallow */
    }
  }
}

export interface ListSignalsOptions {
  limit?: number;
  sinceDays?: number;
  signalSources?: SignalSource[];
  signalTypes?: SignalType[];
}

/** Load recent signals for a customer (admin-only via RLS). */
export async function listInsightSignalsForCustomer(
  customerId: string,
  opts: ListSignalsOptions = {},
): Promise<InsightSignalRow[]> {
  let q = supabase
    .from("customer_insight_signals")
    .select("*")
    .eq("customer_id", customerId)
    .order("occurred_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.sinceDays && opts.sinceDays > 0) {
    const since = new Date(Date.now() - opts.sinceDays * 24 * 60 * 60 * 1000);
    q = q.gte("occurred_at", since.toISOString());
  }
  if (opts.signalSources && opts.signalSources.length) {
    q = q.in("signal_source", opts.signalSources);
  }
  if (opts.signalTypes && opts.signalTypes.length) {
    q = q.in("signal_type", opts.signalTypes);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as InsightSignalRow[];
}

export interface SignalSummary {
  total: number;
  by_type: Partial<Record<SignalType, number>>;
  by_pillar: Partial<Record<SignalPillar | "unspecified", number>>;
  by_source: Partial<Record<SignalSource, number>>;
  /** Strongest recent signals (high strength first, then recency). */
  top: InsightSignalRow[];
  /** Signal types repeated 3+ times in the lookback window. */
  recurring_types: SignalType[];
}

/** Group + summarize recent signals for the Insight Engine. */
export async function summarizeSignalsForInsightEngine(
  customerId: string,
  sinceDays = 60,
): Promise<SignalSummary> {
  const rows = await listInsightSignalsForCustomer(customerId, {
    limit: 200,
    sinceDays,
  }).catch(() => [] as InsightSignalRow[]);

  const by_type: Partial<Record<SignalType, number>> = {};
  const by_pillar: Partial<Record<SignalPillar | "unspecified", number>> = {};
  const by_source: Partial<Record<SignalSource, number>> = {};

  for (const r of rows) {
    by_type[r.signal_type] = (by_type[r.signal_type] ?? 0) + 1;
    const pk = (r.related_pillar ?? "unspecified") as SignalPillar | "unspecified";
    by_pillar[pk] = (by_pillar[pk] ?? 0) + 1;
    by_source[r.signal_source] = (by_source[r.signal_source] ?? 0) + 1;
  }

  const strengthRank: Record<SignalStrength, number> = { low: 0, medium: 1, high: 2 };
  const top = [...rows]
    .sort((a, b) => {
      const s = strengthRank[b.strength] - strengthRank[a.strength];
      if (s !== 0) return s;
      return new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime();
    })
    .slice(0, 8);

  const recurring_types = (Object.entries(by_type) as [SignalType, number][])
    .filter(([, n]) => n >= 3)
    .map(([t]) => t);

  return {
    total: rows.length,
    by_type,
    by_pillar,
    by_source,
    top,
    recurring_types,
  };
}

export const SIGNAL_TYPE_LABEL: Record<SignalType, string> = {
  recurring_blocker: "Recurring blocker",
  cash_pressure: "Cash pressure",
  pipeline_risk: "Pipeline risk",
  missing_source_data: "Missing source data",
  low_engagement: "Low engagement",
  high_engagement: "High engagement",
  resolved_issue: "Resolved issue",
  validated_strength: "Validated strength",
  benchmark_risk: "Benchmark risk",
  operational_bottleneck: "Operational bottleneck",
  owner_dependency: "Owner dependency",
  revenue_leak: "Revenue leak",
  follow_up_gap: "Follow-up gap",
  report_insight: "Report insight",
  review_requested: "Review requested",
  review_resolved: "Review resolved",
  implementation_progress: "Implementation progress",
  tool_adoption: "Tool adoption",
  tool_abandonment: "Tool abandonment",
};

export const SIGNAL_SOURCE_LABEL: Record<SignalSource, string> = {
  weekly_checkin: "Weekly check-in",
  rcc: "Revenue Control Center",
  rgs_review: "RGS review queue",
  business_control_report: "Business Control report",
  impact_ledger: "Impact Ledger",
  diagnostic: "Diagnostic",
  scorecard: "Scorecard",
  tool_usage: "Tool usage",
  admin: "Admin",
  system: "System",
};