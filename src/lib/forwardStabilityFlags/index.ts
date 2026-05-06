/**
 * P85.3 — Forward Stability Flags™ data access.
 *
 * Admin-side reads/writes use the table directly.
 * Client-side reads use SECURITY DEFINER RPC `get_client_forward_stability_flags`
 * which strips admin notes and unapproved/dismissed flags.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  getForwardFlagDefinition,
  type ForwardFlagSeverity,
  type ForwardFlagScoringImpact,
  type ForwardFlagTriggerType,
  type ForwardFlagGearKey,
} from "@/config/forwardStabilityFlags";

export type ForwardStabilityFlagStatus =
  | "active"
  | "admin_review"
  | "client_visible"
  | "resolved"
  | "dismissed";

export interface AdminForwardStabilityFlagRow {
  id: string;
  customer_id: string;
  flag_key: string;
  flag_label: string;
  gear_key: ForwardFlagGearKey;
  category: string;
  trigger_type: ForwardFlagTriggerType;
  trigger_value: number | null;
  threshold_value: number | null;
  severity: ForwardFlagSeverity;
  status: ForwardStabilityFlagStatus;
  scoring_impact_type: ForwardFlagScoringImpact | null;
  scoring_impact_value: number | null;
  needs_reinspection: boolean;
  reinspection_reason: string | null;
  client_visible: boolean;
  approved_for_client: boolean;
  admin_notes: string | null;
  client_safe_explanation: string | null;
  source_period_start: string | null;
  source_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientForwardStabilityFlagRow {
  id: string;
  flag_key: string;
  flag_label: string;
  gear_key: ForwardFlagGearKey;
  category: string;
  severity: ForwardFlagSeverity;
  needs_reinspection: boolean;
  reinspection_reason: string | null;
  client_safe_explanation: string | null;
  source_period_start: string | null;
  source_period_end: string | null;
  created_at: string;
}

export async function listAdminForwardStabilityFlags(
  customerId: string,
): Promise<AdminForwardStabilityFlagRow[]> {
  const { data, error } = await (supabase as any)
    .from("forward_stability_flags")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminForwardStabilityFlagRow[];
}

export async function getClientForwardStabilityFlags(
  customerId: string,
): Promise<ClientForwardStabilityFlagRow[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_forward_stability_flags",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientForwardStabilityFlagRow[];
}

export interface CreateForwardFlagInput {
  customer_id: string;
  flag_key: string;
  trigger_type: ForwardFlagTriggerType;
  trigger_value?: number | null;
  threshold_value?: number | null;
  severity?: ForwardFlagSeverity;
  scoring_impact_type?: ForwardFlagScoringImpact;
  scoring_impact_value?: number | null;
  needs_reinspection?: boolean;
  reinspection_reason?: string | null;
  admin_notes?: string | null;
  client_safe_explanation?: string | null;
  source_period_start?: string | null;
  source_period_end?: string | null;
  source_record_ids?: string[];
}

export async function createForwardStabilityFlag(input: CreateForwardFlagInput) {
  const def = getForwardFlagDefinition(input.flag_key);
  if (!def) throw new Error(`Unknown forward stability flag: ${input.flag_key}`);
  // Manual external-risk triggers REQUIRE admin note.
  if (
    input.trigger_type === "manual_admin" &&
    !(input.admin_notes && input.admin_notes.trim().length > 0)
  ) {
    throw new Error("Manual external-risk trigger requires an admin note / source description.");
  }
  const row = {
    customer_id: input.customer_id,
    flag_key: def.flag_key,
    flag_label: def.label,
    gear_key: def.gear_key,
    category: def.category,
    trigger_type: input.trigger_type,
    trigger_value: input.trigger_value ?? null,
    threshold_value: input.threshold_value ?? null,
    severity: input.severity ?? def.severity,
    status: "admin_review" as const,
    scoring_impact_type: input.scoring_impact_type ?? def.scoring_impact_type,
    scoring_impact_value: input.scoring_impact_value ?? null,
    needs_reinspection: input.needs_reinspection ?? def.needs_reinspection,
    reinspection_reason: input.reinspection_reason ?? null,
    client_visible: false,
    approved_for_client: false,
    admin_notes: input.admin_notes ?? null,
    client_safe_explanation:
      input.client_safe_explanation ?? def.client_safe_explanation,
    source_record_ids: input.source_record_ids ?? [],
    source_period_start: input.source_period_start ?? null,
    source_period_end: input.source_period_end ?? null,
  };
  const { data, error } = await (supabase as any)
    .from("forward_stability_flags")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminForwardStabilityFlagRow;
}

export async function approveForwardFlagForClient(
  id: string,
  client_safe_explanation?: string,
) {
  const update: Record<string, unknown> = {
    approved_for_client: true,
    client_visible: true,
    status: "client_visible",
  };
  if (client_safe_explanation && client_safe_explanation.trim().length > 0) {
    update.client_safe_explanation = client_safe_explanation;
  }
  const { error } = await (supabase as any)
    .from("forward_stability_flags")
    .update(update)
    .eq("id", id);
  if (error) throw error;
}

export async function resolveForwardFlag(
  id: string,
  resolution_note: string,
  action: "resolved" | "dismissed" = "resolved",
) {
  if (!resolution_note || !resolution_note.trim()) {
    throw new Error("Resolution note required.");
  }
  const { error } = await (supabase as any)
    .from("forward_stability_flags")
    .update({
      status: action,
      resolved_at: new Date().toISOString(),
      admin_notes: resolution_note,
      client_visible: false,
      approved_for_client: false,
    })
    .eq("id", id);
  if (error) throw error;
}
