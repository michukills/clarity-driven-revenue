/* P10.0 — Customer Stability Score data layer (0–1000). */

import { supabase } from "@/integrations/supabase/client";

export interface StabilityScoreRow {
  id: string;
  customer_id: string;
  score: number;
  source: string;
  source_ref: string | null;
  admin_note: string | null;
  client_note: string | null;
  recorded_at: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function loadCustomerStabilityScore(
  customerId: string,
): Promise<StabilityScoreRow | null> {
  const { data, error } = await supabase
    .from("customer_stability_scores")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return (data as StabilityScoreRow | null) ?? null;
}

export interface StabilityScoreInput {
  score: number;
  source?: string;
  source_ref?: string | null;
  admin_note?: string | null;
  client_note?: string | null;
}

export async function upsertCustomerStabilityScore(
  customerId: string,
  input: StabilityScoreInput,
  actorId: string | null,
): Promise<void> {
  const clamped = Math.max(0, Math.min(1000, Math.round(input.score)));
  const { data: existing } = await supabase
    .from("customer_stability_scores")
    .select("id")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("customer_stability_scores")
      .update({
        score: clamped,
        source: input.source ?? "manual",
        source_ref: input.source_ref ?? null,
        admin_note: input.admin_note ?? null,
        client_note: input.client_note ?? null,
        recorded_at: new Date().toISOString(),
        updated_by: actorId,
      })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("customer_stability_scores")
    .insert({
      customer_id: customerId,
      score: clamped,
      source: input.source ?? "manual",
      source_ref: input.source_ref ?? null,
      admin_note: input.admin_note ?? null,
      client_note: input.client_note ?? null,
      created_by: actorId,
      updated_by: actorId,
    });
  if (error) throw error;
}