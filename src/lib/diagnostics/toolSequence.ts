// P41 — Diagnostic tool sequence: load, render labels, admin override.
import { supabase } from "@/integrations/supabase/client";

export type DiagnosticToolSequenceRow = {
  customer_id: string;
  ranked_tool_keys: string[];
  rationale: { tool_key: string; reason: string }[];
  admin_override_keys: string[] | null;
  admin_override_by: string | null;
  admin_override_at: string | null;
  generated_at: string;
  updated_at: string;
};

export async function loadToolSequence(customerId: string): Promise<DiagnosticToolSequenceRow | null> {
  const { data, error } = await supabase
    .from("diagnostic_tool_sequences")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return (data as any) ?? null;
}

/** Effective order = admin override if set, otherwise the auto-ranked list. */
export function effectiveSequence(row: DiagnosticToolSequenceRow | null): string[] {
  if (!row) return [];
  if (row.admin_override_keys && row.admin_override_keys.length > 0) {
    return row.admin_override_keys;
  }
  return row.ranked_tool_keys ?? [];
}

/** Reason text for a single tool from the rationale jsonb. */
export function reasonFor(row: DiagnosticToolSequenceRow | null, toolKey: string): string | null {
  if (!row) return null;
  const r = (row.rationale ?? []).find((x) => x.tool_key === toolKey);
  return r?.reason ?? null;
}

/** Admin-only — push a new sequence override. */
export async function setSequenceOverride(customerId: string, rankedToolKeys: string[]) {
  const { data, error } = await supabase.rpc("set_diagnostic_tool_sequence_override", {
    _customer_id: customerId,
    _ranked_tool_keys: rankedToolKeys,
  });
  if (error) throw error;
  return data;
}