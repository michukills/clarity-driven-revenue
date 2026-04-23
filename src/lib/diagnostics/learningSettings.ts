/* P10.2c-Guardrail — Per-customer learning controls.
 *
 * Centralizes the rules that decide whether admin feedback on the
 * Suggested Guidance panel should:
 *   1. update this customer's `customer_insight_memory`
 *   2. update the global `rgs_pattern_intelligence`
 *
 * The flags live on `customers` (`learning_enabled`,
 * `contributes_to_global_learning`, `learning_exclusion_reason`).
 * Demo / training / sandbox accounts should be excluded from global
 * learning so unrealistic data doesn't pollute RGS pattern intelligence.
 */

import { supabase } from "@/integrations/supabase/client";

export interface LearningSettings {
  learning_enabled: boolean;
  contributes_to_global_learning: boolean;
  learning_exclusion_reason: string | null;
}

export interface LearningAuditRow {
  id: string;
  customer_id: string;
  changed_by: string | null;
  previous_learning_enabled: boolean | null;
  new_learning_enabled: boolean | null;
  previous_contributes_to_global_learning: boolean | null;
  new_contributes_to_global_learning: boolean | null;
  previous_reason: string | null;
  new_reason: string | null;
  created_at: string;
}

export type LearningStatus =
  | "active" // memory + global
  | "local_only" // memory only
  | "paused"; // neither

export const DEFAULT_LEARNING: LearningSettings = {
  learning_enabled: true,
  contributes_to_global_learning: true,
  learning_exclusion_reason: null,
};

export function deriveStatus(s: LearningSettings): LearningStatus {
  if (!s.learning_enabled) return "paused";
  if (!s.contributes_to_global_learning) return "local_only";
  return "active";
}

export function statusLabel(status: LearningStatus): string {
  switch (status) {
    case "active":
      return "Learning active";
    case "local_only":
      return "Local learning only";
    case "paused":
      return "Learning paused";
  }
}

export function statusNote(status: LearningStatus): string | null {
  switch (status) {
    case "active":
      return null;
    case "local_only":
      return "This client is excluded from global pattern learning.";
    case "paused":
      return "Learning is paused for this client.";
  }
}

/** True when admin feedback should write to `customer_insight_memory`. */
export function shouldWriteMemory(s: LearningSettings): boolean {
  return s.learning_enabled;
}

/** True when admin feedback should write to `rgs_pattern_intelligence`. */
export function shouldWriteGlobal(s: LearningSettings): boolean {
  return s.learning_enabled && s.contributes_to_global_learning;
}

export async function loadLearningSettings(
  customerId: string,
): Promise<LearningSettings> {
  const { data, error } = await supabase
    .from("customers")
    .select(
      "learning_enabled, contributes_to_global_learning, learning_exclusion_reason",
    )
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw error;
  return {
    learning_enabled: data?.learning_enabled ?? true,
    contributes_to_global_learning:
      data?.contributes_to_global_learning ?? true,
    learning_exclusion_reason: data?.learning_exclusion_reason ?? null,
  };
}

export async function saveLearningSettings(
  customerId: string,
  next: LearningSettings,
): Promise<void> {
  // Load previous settings so we can write an audit row only when something
  // actually changed. Never insert a no-op audit row.
  const previous = await loadLearningSettings(customerId);
  const normalizedReason = next.learning_exclusion_reason?.trim() || null;

  const { error } = await supabase
    .from("customers")
    .update({
      learning_enabled: next.learning_enabled,
      contributes_to_global_learning: next.contributes_to_global_learning,
      learning_exclusion_reason: normalizedReason,
    })
    .eq("id", customerId);
  if (error) throw error;

  const changed =
    previous.learning_enabled !== next.learning_enabled ||
    previous.contributes_to_global_learning !==
      next.contributes_to_global_learning ||
    (previous.learning_exclusion_reason ?? null) !== normalizedReason;

  if (!changed) return;

  const { data: auth } = await supabase.auth.getUser();
  await supabase.from("customer_learning_audit").insert({
    customer_id: customerId,
    changed_by: auth.user?.id ?? null,
    previous_learning_enabled: previous.learning_enabled,
    new_learning_enabled: next.learning_enabled,
    previous_contributes_to_global_learning:
      previous.contributes_to_global_learning,
    new_contributes_to_global_learning: next.contributes_to_global_learning,
    previous_reason: previous.learning_exclusion_reason,
    new_reason: normalizedReason,
  });
}

/** Most recent audit row for this customer, if any. */
export async function loadLatestLearningAudit(
  customerId: string,
): Promise<LearningAuditRow | null> {
  const { data, error } = await supabase
    .from("customer_learning_audit")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as LearningAuditRow | null) ?? null;
}