/**
 * P85.4 — RGS Complexity Scale™ data access.
 *
 * Admin reads/writes table directly. Clients read via SECURITY DEFINER RPC
 * `get_client_complexity_assessment` which strips override note and admin-only fields.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  detectComplexityTier,
  type ComplexityTierKey,
  type ComplexityConfirmationStatus,
  type ComplexityDetectionInput,
} from "@/config/rgsComplexityScale";

export interface AdminComplexityAssessmentRow {
  id: string;
  customer_id: string;
  detected_tier: ComplexityTierKey;
  selected_tier: ComplexityTierKey;
  input_annual_revenue: number | null;
  input_headcount: number | null;
  input_locations: number | null;
  input_role_count: number | null;
  detection_basis: string | null;
  confirmation_status: ComplexityConfirmationStatus;
  override_note: string | null;
  selected_by: string | null;
  selected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientComplexityAssessmentRow {
  selected_tier: ComplexityTierKey;
  confirmation_status: ComplexityConfirmationStatus;
  selected_at: string | null;
}

export async function loadAdminComplexityAssessment(
  customerId: string,
): Promise<AdminComplexityAssessmentRow | null> {
  const { data, error } = await (supabase as any)
    .from("rgs_complexity_assessments")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as AdminComplexityAssessmentRow | null;
}

export async function getClientComplexityAssessment(
  customerId: string,
): Promise<ClientComplexityAssessmentRow | null> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_complexity_assessment",
    { _customer_id: customerId },
  );
  if (error) throw error;
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] ?? null) as ClientComplexityAssessmentRow | null;
  return data as ClientComplexityAssessmentRow;
}

export interface UpsertComplexityDetectionInput extends ComplexityDetectionInput {
  customer_id: string;
  input_locations?: number | null;
  input_role_count?: number | null;
}

/**
 * Detects + upserts the assessment as `detected` confirmation status.
 * Does not change selected_tier if admin already overrode/confirmed.
 */
export async function upsertDetectedComplexityAssessment(
  input: UpsertComplexityDetectionInput,
): Promise<AdminComplexityAssessmentRow> {
  const detection = detectComplexityTier(input);
  const existing = await loadAdminComplexityAssessment(input.customer_id);

  const row: Record<string, unknown> = {
    customer_id: input.customer_id,
    detected_tier: detection.detected_tier,
    input_annual_revenue: detection.input_annual_revenue,
    input_headcount: detection.input_headcount,
    input_locations: input.input_locations ?? null,
    input_role_count: input.input_role_count ?? null,
    detection_basis: detection.detection_basis,
  };
  if (
    !existing ||
    existing.confirmation_status === "detected" ||
    existing.confirmation_status === "client_needs_confirmation"
  ) {
    row.selected_tier = detection.detected_tier;
    row.confirmation_status = detection.needs_confirmation
      ? "client_needs_confirmation"
      : "detected";
  }

  const { data, error } = await (supabase as any)
    .from("rgs_complexity_assessments")
    .upsert(row, { onConflict: "customer_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminComplexityAssessmentRow;
}

export async function adminConfirmComplexityTier(
  id: string,
  selected_tier: ComplexityTierKey,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("rgs_complexity_assessments")
    .update({
      selected_tier,
      confirmation_status: "admin_confirmed",
      selected_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function adminOverrideComplexityTier(
  id: string,
  selected_tier: ComplexityTierKey,
  override_note: string,
): Promise<void> {
  if (!override_note || !override_note.trim()) {
    throw new Error("Override note required.");
  }
  const { error } = await (supabase as any)
    .from("rgs_complexity_assessments")
    .update({
      selected_tier,
      override_note: override_note.trim(),
      confirmation_status: "admin_overridden",
      selected_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}