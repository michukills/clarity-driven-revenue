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
  const { error } = await supabase
    .from("customers")
    .update({
      learning_enabled: next.learning_enabled,
      contributes_to_global_learning: next.contributes_to_global_learning,
      learning_exclusion_reason:
        next.learning_exclusion_reason?.trim() || null,
    })
    .eq("id", customerId);
  if (error) throw error;
}