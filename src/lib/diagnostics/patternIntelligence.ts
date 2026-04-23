/* P10.2b — Global RGS pattern intelligence (anonymized, admin-only).
 *
 * Stores generalized counts and templates derived from admin actions
 * across ALL customers. Never stores customer names, raw client text,
 * or any client-identifying fields — only categories, counts, bands, and
 * stable pattern keys.
 *
 * The insight engine reads this to:
 *   - rank suggestions (templates with high approval rates rank higher),
 *   - soften suggestions admins commonly reject,
 *   - influence wording templates and confidence language.
 *
 * It MUST NOT be used as the sole reason to surface a recommendation —
 * client-specific evidence is always required first.
 */

import { supabase } from "@/integrations/supabase/client";

export type PatternType =
  | "recurring_blocker"
  | "benchmark_risk"
  | "recommendation_approval_pattern"
  | "recommendation_rejection_pattern"
  | "stage_risk_pattern"
  | "tool_engagement_pattern"
  | "review_trigger_pattern";

export type PatternStatus = "active" | "watching" | "archived";
export type PatternConfidence = "high" | "medium" | "low";

export interface PatternRow {
  id: string;
  pattern_key: string;
  pattern_type: PatternType;
  title: string;
  summary: string | null;
  related_pillar: string | null;
  benchmark_band: string | null;
  customer_stage: string | null;
  signal_count: number;
  approval_count: number;
  rejection_count: number;
  confidence: PatternConfidence;
  last_seen_at: string;
  status: PatternStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Load every active or watching pattern row. Small table; fine to scan. */
export async function loadActivePatterns(): Promise<PatternRow[]> {
  const { data, error } = await supabase
    .from("rgs_pattern_intelligence")
    .select("*")
    .neq("status", "archived");
  if (error) throw error;
  return (data ?? []) as PatternRow[];
}

/** Look up a single pattern by key. */
export async function getPattern(patternKey: string): Promise<PatternRow | null> {
  const { data, error } = await supabase
    .from("rgs_pattern_intelligence")
    .select("*")
    .eq("pattern_key", patternKey)
    .maybeSingle();
  if (error) throw error;
  return (data as PatternRow | null) ?? null;
}

interface UpsertArgs {
  pattern_key: string;
  pattern_type: PatternType;
  title: string;
  summary?: string | null;
  related_pillar?: string | null;
  benchmark_band?: string | null;
  customer_stage?: string | null;
}

/**
 * Increment one of the three counters for a pattern. Inserts the row if
 * it does not exist yet. Counters are deliberately small ints so the
 * confidence ladder is conservative.
 */
async function bumpPatternCounter(
  args: UpsertArgs,
  field: "signal_count" | "approval_count" | "rejection_count",
): Promise<void> {
  const existing = await getPattern(args.pattern_key);
  if (existing) {
    const nextSignal = field === "signal_count" ? (existing.signal_count ?? 0) + 1 : (existing.signal_count ?? 0);
    const nextApproval = field === "approval_count" ? (existing.approval_count ?? 0) + 1 : (existing.approval_count ?? 0);
    const nextRejection = field === "rejection_count" ? (existing.rejection_count ?? 0) + 1 : (existing.rejection_count ?? 0);
    const newConfidence = deriveConfidence({
      signal_count: nextSignal,
      approval_count: nextApproval,
      rejection_count: nextRejection,
    });
    const { error } = await supabase
      .from("rgs_pattern_intelligence")
      .update({
        signal_count: nextSignal,
        approval_count: nextApproval,
        rejection_count: nextRejection,
        last_seen_at: new Date().toISOString(),
        confidence: newConfidence,
        status: "active",
      })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("rgs_pattern_intelligence").insert({
    pattern_key: args.pattern_key,
    pattern_type: args.pattern_type,
    title: args.title,
    summary: args.summary ?? null,
    related_pillar: args.related_pillar ?? null,
    benchmark_band: args.benchmark_band ?? null,
    customer_stage: args.customer_stage ?? null,
    signal_count: field === "signal_count" ? 1 : 0,
    approval_count: field === "approval_count" ? 1 : 0,
    rejection_count: field === "rejection_count" ? 1 : 0,
  });
  if (error) throw error;
}

export const recordPatternSignal = (args: UpsertArgs) =>
  bumpPatternCounter(args, "signal_count");
export const recordPatternApproval = (args: UpsertArgs) =>
  bumpPatternCounter(args, "approval_count");
export const recordPatternRejection = (args: UpsertArgs) =>
  bumpPatternCounter(args, "rejection_count");

/**
 * Derive a global confidence label from approval/rejection volume.
 * Conservative: needs ≥5 approvals AND a healthy approval ratio for "high".
 */
export function deriveConfidence(p: {
  signal_count?: number | null;
  approval_count?: number | null;
  rejection_count?: number | null;
}): PatternConfidence {
  const a = p.approval_count ?? 0;
  const r = p.rejection_count ?? 0;
  const total = a + r;
  if (total < 3) return "low";
  const ratio = a / Math.max(1, total);
  if (a >= 5 && ratio >= 0.7) return "high";
  if (a >= 3 && ratio >= 0.5) return "medium";
  if (r >= 5 && ratio < 0.3) return "low";
  return "medium";
}

/** Build a stable pattern key from a rule_key + optional band/stage context. */
export function patternKeyFor(args: {
  rule_key: string;
  benchmark_band?: string | null;
  customer_stage?: string | null;
}): string {
  const parts = [args.rule_key];
  if (args.benchmark_band) parts.push(`band:${args.benchmark_band}`);
  if (args.customer_stage) parts.push(`stage:${args.customer_stage}`);
  return parts.join("|");
}

/** Return a small lookup helper for the engine: pattern by rule_key prefix. */
export function indexPatternsByRule(
  rows: PatternRow[],
): Map<string, PatternRow> {
  const m = new Map<string, PatternRow>();
  for (const r of rows) {
    // Index by the leading rule key segment so the engine can find a pattern
    // even when band/stage qualifiers differ.
    const lead = r.pattern_key.split("|")[0];
    if (lead && !m.has(lead)) m.set(lead, r);
  }
  return m;
}