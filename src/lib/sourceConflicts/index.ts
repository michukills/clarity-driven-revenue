/**
 * P85.1 — Source-of-Truth Conflict Flags™ / Amber Evidence Conflict™
 *
 * Deterministic conflict detection between two sources for the same data
 * point. If the lower-authority value differs from the higher-authority
 * value by more than 15%, an Amber Evidence Conflict is created. Scoring
 * always uses the highest-authority value (or the most conservative
 * verified value when financial/risk semantics call for it).
 *
 * No AI is involved. No client can resolve a conflict.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  authorityRank,
  type EvidenceAuthoritySourceKey,
} from "@/config/evidenceAuthorityLadder";

export const AMBER_CONFLICT_THRESHOLD_PERCENT = 15;

export type ConflictStatus = "amber" | "open" | "resolved" | "dismissed";

export interface SourceCandidate {
  source_type: EvidenceAuthoritySourceKey;
  value: number;
  evidence_id?: string | null;
}

export interface ConflictDetectionInput {
  data_point_key: string;
  data_point_label?: string;
  gear_key?: string | null;
  /** When true, scoring uses min(higher, lower) verified value (conservative). */
  use_conservative_for_risk?: boolean;
  candidates: SourceCandidate[];
}

export interface ConflictDetectionResult {
  has_conflict: boolean;
  difference_percent: number | null;
  higher: SourceCandidate | null;
  lower: SourceCandidate | null;
  scoring_value_used: number | null;
}

/**
 * Compute % difference of `lower` relative to `higher`. Always returns an
 * absolute, non-negative percent. Returns Infinity if higher === 0 and
 * lower !== 0 (treated as conflict). Returns 0 when both are 0.
 */
export function diffPercent(higher: number, lower: number): number {
  if (higher === lower) return 0;
  if (higher === 0) return Number.POSITIVE_INFINITY;
  return Math.abs((lower - higher) / higher) * 100;
}

/**
 * Detects conflicts between any pair of candidates and returns the worst
 * (largest %) pair where authority differs. Uses the higher-authority
 * value for scoring by default; switches to min() when
 * use_conservative_for_risk is true and both are positive.
 */
export function detectConflict(
  input: ConflictDetectionInput,
): ConflictDetectionResult {
  const cands = (input.candidates ?? []).filter(
    (c) => Number.isFinite(c.value),
  );
  if (cands.length < 2) {
    const only = cands[0] ?? null;
    return {
      has_conflict: false,
      difference_percent: null,
      higher: only,
      lower: null,
      scoring_value_used: only?.value ?? null,
    };
  }

  // Sort by authority rank ascending (1 strongest).
  const sorted = [...cands].sort(
    (a, b) => authorityRank(a.source_type) - authorityRank(b.source_type),
  );
  const higher = sorted[0];

  let worstLower: SourceCandidate | null = null;
  let worstPct = 0;

  for (let i = 1; i < sorted.length; i++) {
    const lower = sorted[i];
    if (authorityRank(lower.source_type) === authorityRank(higher.source_type)) {
      continue; // ties don't trigger
    }
    const pct = diffPercent(higher.value, lower.value);
    if (pct > worstPct) {
      worstPct = pct;
      worstLower = lower;
    }
  }

  const has_conflict =
    worstLower !== null && worstPct > AMBER_CONFLICT_THRESHOLD_PERCENT;

  let scoring = higher.value;
  if (
    input.use_conservative_for_risk &&
    has_conflict &&
    worstLower &&
    Number.isFinite(worstLower.value)
  ) {
    scoring = Math.min(higher.value, worstLower.value);
  }

  return {
    has_conflict,
    difference_percent: worstLower ? worstPct : null,
    higher,
    lower: worstLower,
    scoring_value_used: scoring,
  };
}

/* ─────────────── Persistence (admin-only via RLS) ─────────────── */

export interface PersistConflictInput extends ConflictDetectionInput {
  customer_id: string;
}

export interface SourceConflictFlagRow {
  id: string;
  customer_id: string;
  data_point_key: string;
  data_point_label: string | null;
  gear_key: string | null;
  higher_authority_source_type: string;
  lower_authority_source_type: string;
  higher_authority_value: number | null;
  lower_authority_value: number | null;
  difference_percent: number | null;
  conflict_status: ConflictStatus;
  scoring_value_used: number | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  client_safe_explanation: string | null;
  client_visible: boolean;
  source_evidence_ids: unknown;
  created_at: string;
  updated_at: string;
}

/**
 * Detects and (if a conflict exists) persists an Amber Evidence Conflict.
 * Returns the detection result plus the persisted row (when created).
 * Caller must be admin (enforced by RLS).
 */
export async function detectAndPersistConflict(
  input: PersistConflictInput,
): Promise<{
  detection: ConflictDetectionResult;
  flag: SourceConflictFlagRow | null;
  error: string | null;
}> {
  const detection = detectConflict(input);
  if (!detection.has_conflict || !detection.higher || !detection.lower) {
    return { detection, flag: null, error: null };
  }

  const evidenceIds = (input.candidates ?? [])
    .map((c) => c.evidence_id)
    .filter((v): v is string => !!v);

  const { data, error } = await supabase
    .from("source_conflict_flags" as any)
    .insert({
      customer_id: input.customer_id,
      data_point_key: input.data_point_key,
      data_point_label: input.data_point_label ?? null,
      gear_key: input.gear_key ?? null,
      higher_authority_source_type: detection.higher.source_type,
      lower_authority_source_type: detection.lower.source_type,
      higher_authority_value: detection.higher.value,
      lower_authority_value: detection.lower.value,
      difference_percent: detection.difference_percent,
      scoring_value_used: detection.scoring_value_used,
      conflict_status: "amber",
      client_visible: false,
      source_evidence_ids: evidenceIds,
      client_safe_explanation:
        "This item needs clarification because the available evidence does not match the original response.",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return { detection, flag: null, error: error.message };
  }
  return {
    detection,
    flag: (data as SourceConflictFlagRow) ?? null,
    error: null,
  };
}

/** List open Amber Evidence Conflicts for a customer (admin view). */
export async function listOpenConflicts(
  customerId: string,
): Promise<SourceConflictFlagRow[]> {
  const { data } = await supabase
    .from("source_conflict_flags" as any)
    .select("*")
    .eq("customer_id", customerId)
    .in("conflict_status", ["amber", "open"])
    .order("created_at", { ascending: false });
  return (data as SourceConflictFlagRow[] | null) ?? [];
}

/** List ALL conflicts (admin review). */
export async function listAllConflicts(
  customerId: string,
): Promise<SourceConflictFlagRow[]> {
  const { data } = await supabase
    .from("source_conflict_flags" as any)
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return (data as SourceConflictFlagRow[] | null) ?? [];
}

/** Admin-only via RPC; requires a non-empty resolution note. */
export async function resolveConflict(args: {
  flagId: string;
  note: string;
  action: "resolved" | "dismissed";
}): Promise<{ ok: boolean; error: string | null }> {
  const note = (args.note ?? "").trim();
  if (!note) return { ok: false, error: "Resolution note required." };
  const { error } = await supabase.rpc("resolve_source_conflict" as any, {
    _flag_id: args.flagId,
    _resolution_note: note,
    _action: args.action,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

/** Diagnostic completion gate. Returns true if any open conflict exists. */
export async function hasOpenConflicts(customerId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_open_source_conflicts" as any, {
    _customer_id: customerId,
  });
  return Boolean(data);
}