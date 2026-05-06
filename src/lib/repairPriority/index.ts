/**
 * P85.2 — Repair Priority Matrix + Stability Quick-Start client lib.
 *
 * Admin-side reads/writes use the priority/quick-start tables directly.
 * Client-side reads use the SECURITY DEFINER RPCs that strip admin fields.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  computePriorityLane,
  type ImpactScore,
  type EffortScore,
  type PriorityLane,
} from "@/config/repairPriorityMatrix";
import type { QuickStartTemplateKey } from "@/config/stabilityQuickStartTemplates";

export interface AdminRepairPriorityMetadata {
  id: string;
  customer_id: string;
  repair_map_item_id: string;
  impact_score: ImpactScore;
  effort_score: EffortScore;
  priority_lane: PriorityLane;
  lane_overridden: boolean;
  override_note: string | null;
  recommended_week: number | null;
  quick_start_eligible: boolean;
  owner_capacity_note: string | null;
  dependency_note: string | null;
  admin_priority_note: string | null;
  client_safe_priority_explanation: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientRepairPriorityRow {
  repair_map_item_id: string;
  priority_lane: PriorityLane;
  impact_score: ImpactScore;
  effort_score: EffortScore;
  recommended_week: number | null;
  quick_start_eligible: boolean;
  client_safe_priority_explanation: string | null;
  updated_at: string;
}

export interface AdminQuickStartAssignment {
  id: string;
  customer_id: string;
  repair_map_item_id: string;
  template_key: QuickStartTemplateKey;
  status: "assigned" | "in_use" | "completed" | "dropped" | "archived";
  recommend_week_one: boolean;
  admin_note: string | null;
  client_safe_note: string | null;
  client_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientQuickStartAssignmentRow {
  assignment_id: string;
  repair_map_item_id: string;
  template_key: QuickStartTemplateKey;
  status: AdminQuickStartAssignment["status"];
  recommend_week_one: boolean;
  client_safe_note: string | null;
  updated_at: string;
}

export interface UpsertRepairPriorityInput {
  customer_id: string;
  repair_map_item_id: string;
  impact_score: ImpactScore;
  effort_score: EffortScore;
  recommended_week?: number | null;
  quick_start_eligible?: boolean;
  owner_capacity_note?: string | null;
  dependency_note?: string | null;
  admin_priority_note?: string | null;
  client_safe_priority_explanation?: string | null;
  override_lane?: PriorityLane | null;
  override_note?: string | null;
}

export async function adminUpsertRepairPriority(
  input: UpsertRepairPriorityInput,
): Promise<AdminRepairPriorityMetadata> {
  const computed = computePriorityLane(input.impact_score, input.effort_score);
  const lane = input.override_lane ?? computed;
  const overridden = !!input.override_lane && input.override_lane !== computed;
  if (overridden && !input.override_note?.trim()) {
    throw new Error("Override note required when overriding the computed priority lane.");
  }
  const row = {
    customer_id: input.customer_id,
    repair_map_item_id: input.repair_map_item_id,
    impact_score: input.impact_score,
    effort_score: input.effort_score,
    priority_lane: lane,
    lane_overridden: overridden,
    override_note: overridden ? (input.override_note ?? null) : null,
    recommended_week: input.recommended_week ?? null,
    quick_start_eligible: !!input.quick_start_eligible,
    owner_capacity_note: input.owner_capacity_note ?? null,
    dependency_note: input.dependency_note ?? null,
    admin_priority_note: input.admin_priority_note ?? null,
    client_safe_priority_explanation:
      input.client_safe_priority_explanation ?? null,
  };
  const { data, error } = await (supabase as any)
    .from("repair_priority_metadata")
    .upsert(row, { onConflict: "repair_map_item_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminRepairPriorityMetadata;
}

export async function adminListRepairPriority(
  customerId: string,
): Promise<AdminRepairPriorityMetadata[]> {
  const { data, error } = await (supabase as any)
    .from("repair_priority_metadata")
    .select("*")
    .eq("customer_id", customerId);
  if (error) throw error;
  return (data ?? []) as AdminRepairPriorityMetadata[];
}

export async function getClientRepairPriority(
  customerId: string,
): Promise<ClientRepairPriorityRow[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_repair_priority",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientRepairPriorityRow[];
}

export async function adminListQuickStartAssignments(
  customerId: string,
): Promise<AdminQuickStartAssignment[]> {
  const { data, error } = await (supabase as any)
    .from("repair_quick_start_assignments")
    .select("*")
    .eq("customer_id", customerId);
  if (error) throw error;
  return (data ?? []) as AdminQuickStartAssignment[];
}

export async function adminAssignQuickStartTemplate(input: {
  customer_id: string;
  repair_map_item_id: string;
  template_key: QuickStartTemplateKey;
  recommend_week_one?: boolean;
  admin_note?: string | null;
  client_safe_note?: string | null;
  client_visible?: boolean;
}): Promise<AdminQuickStartAssignment> {
  const { data, error } = await (supabase as any)
    .from("repair_quick_start_assignments")
    .upsert(
      {
        customer_id: input.customer_id,
        repair_map_item_id: input.repair_map_item_id,
        template_key: input.template_key,
        recommend_week_one: !!input.recommend_week_one,
        admin_note: input.admin_note ?? null,
        client_safe_note: input.client_safe_note ?? null,
        client_visible: input.client_visible ?? true,
      },
      { onConflict: "repair_map_item_id,template_key" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminQuickStartAssignment;
}

export async function adminRemoveQuickStartAssignment(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("repair_quick_start_assignments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getClientRepairQuickStart(
  customerId: string,
): Promise<ClientQuickStartAssignmentRow[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_repair_quick_start",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientQuickStartAssignmentRow[];
}