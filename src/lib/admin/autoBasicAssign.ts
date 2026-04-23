// P7.4.2 — Idempotent seeding of "auto-basic" client resources.
// Looks up the resources rows for tool keys flagged as `auto_basic` in
// TOOL_POLICY and inserts assignments for the given customer when missing.
//
// Safety:
//  - Only operates on customers who are in implementation-track stages
//    (anyone past `implementation_added`). Diagnostic-only customers are
//    skipped so we don't pollute their portal.
//  - Uses upsert with onConflict('customer_id,resource_id') to be a no-op
//    if the assignment already exists. Never overwrites visibility_override.
//  - Never touches RCC entitlement, payment_status, or tool_key values.
//  - Never creates resources — only assignments to existing resources.

import { supabase } from "@/integrations/supabase/client";
import { TOOL_POLICY, policyForResource } from "@/lib/toolPolicy";

const IMPLEMENTATION_STAGES = new Set([
  "implementation_added",
  "implementation_onboarding",
  "tools_assigned",
  "client_training_setup",
  "implementation_active",
  "waiting_on_client",
  "review_revision_window",
  "implementation",
  "work_in_progress",
  "implementation_complete",
  "work_completed",
]);

const AUTO_BASIC_KEYS = new Set(
  TOOL_POLICY.filter((p) => p.assignmentPolicy === "auto_basic").map((p) => p.key),
);

export type AutoBasicResult = {
  inserted: number;
  skippedExisting: number;
  skippedNoResource: number;
  reason?: string;
};

/**
 * Seed auto-basic assignments for `customerId`. Safe to call repeatedly.
 * Returns counts so callers can log/toast if desired (we currently call this
 * silently from CustomerDetail load, so no UI noise).
 */
export async function seedAutoBasicAssignments(
  customerId: string,
  stage?: string | null,
): Promise<AutoBasicResult> {
  if (!customerId) return { inserted: 0, skippedExisting: 0, skippedNoResource: 0, reason: "no customer" };
  if (!stage || !IMPLEMENTATION_STAGES.has(stage)) {
    return { inserted: 0, skippedExisting: 0, skippedNoResource: 0, reason: "stage not eligible" };
  }
  if (AUTO_BASIC_KEYS.size === 0) {
    return { inserted: 0, skippedExisting: 0, skippedNoResource: 0, reason: "no auto-basic policies" };
  }

  // Pull all candidate resources (client-facing only) once and resolve which
  // ones map to an auto-basic tool_key.
  const { data: resources, error: rErr } = await supabase
    .from("resources")
    .select("id, title, url, tool_audience, visibility");
  if (rErr || !resources) {
    return { inserted: 0, skippedExisting: 0, skippedNoResource: 0, reason: rErr?.message };
  }

  const candidates = (resources as any[]).filter((r) => {
    if (r.tool_audience === "internal") return false;
    if (r.visibility === "internal") return false;
    const p = policyForResource(r);
    return !!p && AUTO_BASIC_KEYS.has(p.key);
  });
  if (candidates.length === 0) {
    return { inserted: 0, skippedExisting: 0, skippedNoResource: 0, reason: "no matching resources" };
  }

  // Existing assignments for this customer to skip duplicates.
  const { data: existing } = await supabase
    .from("resource_assignments")
    .select("resource_id")
    .eq("customer_id", customerId)
    .in(
      "resource_id",
      candidates.map((c) => c.id),
    );
  const existingIds = new Set((existing || []).map((e: any) => e.resource_id));

  const toInsert = candidates
    .filter((c) => !existingIds.has(c.id))
    .map((c) => ({
      customer_id: customerId,
      resource_id: c.id,
      assignment_source: "auto_basic" as any,
    }));

  if (toInsert.length === 0) {
    return { inserted: 0, skippedExisting: existingIds.size, skippedNoResource: 0 };
  }

  // upsert with onConflict to keep this idempotent even on race conditions.
  const { error: insErr } = await supabase
    .from("resource_assignments")
    .upsert(toInsert as any, { onConflict: "customer_id,resource_id", ignoreDuplicates: true });

  if (insErr) {
    return {
      inserted: 0,
      skippedExisting: existingIds.size,
      skippedNoResource: 0,
      reason: insErr.message,
    };
  }

  return {
    inserted: toInsert.length,
    skippedExisting: existingIds.size,
    skippedNoResource: 0,
  };
}