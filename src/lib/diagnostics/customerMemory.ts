/* P10.2b — Client-specific insight memory.
 *
 * Captures what RGS has learned about ONE customer account: recurring
 * patterns, admin-approved guidance, resolved issues, client strengths,
 * client risks, operating preferences, and tool engagement patterns.
 *
 * This module is the data layer. The insight engine reads from it (via
 * `loadCustomerMemory`) and the admin feedback loop writes to it via
 * `recordApprovedGuidance`, `markIssueResolved`, etc.
 *
 * Memory rows are admin-only by default. Setting `client_visible = true`
 * is the only way they ever surface to a client (via RLS).
 */

import { supabase } from "@/integrations/supabase/client";

export type MemoryType =
  | "recurring_pattern"
  | "approved_guidance"
  | "resolved_issue"
  | "client_strength"
  | "client_risk"
  | "operating_preference"
  | "tool_engagement_pattern";

export type MemoryStatus = "active" | "resolved" | "archived";
export type MemoryConfidence = "high" | "medium" | "low";

export interface CustomerMemoryRow {
  id: string;
  customer_id: string;
  memory_type: MemoryType;
  title: string;
  summary: string | null;
  related_pillar: string | null;
  confidence: MemoryConfidence;
  source_type: string;
  source_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
  times_seen: number;
  status: MemoryStatus;
  admin_visible: boolean;
  client_visible: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryUpsertInput {
  customer_id: string;
  memory_type: MemoryType;
  title: string;
  summary?: string | null;
  related_pillar?: string | null;
  confidence?: MemoryConfidence;
  source_type?: string;
  source_id?: string | null;
  client_visible?: boolean;
}

/** Load every active memory row for a customer. */
export async function loadCustomerMemory(
  customerId: string,
): Promise<CustomerMemoryRow[]> {
  const { data, error } = await supabase
    .from("customer_insight_memory")
    .select("*")
    .eq("customer_id", customerId)
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CustomerMemoryRow[];
}

/**
 * Increment `times_seen` and bump `last_seen_at` for an existing memory
 * row that matches (customer_id, memory_type, title). Inserts a new row
 * when no match exists. Used by the engine when it observes a recurring
 * signal so memory weight grows naturally.
 */
export async function touchOrInsertMemory(
  input: MemoryUpsertInput,
  actorId: string | null,
): Promise<void> {
  const { data: existing, error: selErr } = await supabase
    .from("customer_insight_memory")
    .select("id, times_seen")
    .eq("customer_id", input.customer_id)
    .eq("memory_type", input.memory_type)
    .eq("title", input.title)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing?.id) {
    const { error } = await supabase
      .from("customer_insight_memory")
      .update({
        times_seen: (existing.times_seen ?? 1) + 1,
        last_seen_at: new Date().toISOString(),
        summary: input.summary ?? undefined,
        confidence: input.confidence ?? undefined,
        related_pillar: input.related_pillar ?? undefined,
        status: "active",
        updated_by: actorId,
      })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("customer_insight_memory").insert({
    customer_id: input.customer_id,
    memory_type: input.memory_type,
    title: input.title,
    summary: input.summary ?? null,
    related_pillar: input.related_pillar ?? null,
    confidence: input.confidence ?? "medium",
    source_type: input.source_type ?? "engine",
    client_visible: input.client_visible ?? false,
    created_by: actorId,
    updated_by: actorId,
  });
  if (error) throw error;
}

/** Mark a memory row as resolved (e.g. when the underlying issue clears). */
export async function markMemoryResolved(
  id: string,
  actorId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("customer_insight_memory")
    .update({ status: "resolved", updated_by: actorId })
    .eq("id", id);
  if (error) throw error;
}

/** Convenience: record that an admin approved a piece of guidance. */
export async function recordApprovedGuidance(args: {
  customerId: string;
  title: string;
  summary?: string | null;
  related_pillar?: string | null;
  source_id?: string | null;
  actorId: string | null;
}): Promise<void> {
  await touchOrInsertMemory(
    {
      customer_id: args.customerId,
      memory_type: "approved_guidance",
      title: args.title,
      summary: args.summary ?? null,
      related_pillar: args.related_pillar ?? null,
      confidence: "high",
      source_type: "admin_approval",
      source_id: args.source_id ?? null,
    },
    args.actorId,
  );
}

/** True if the memory row should boost confidence/priority of a suggestion. */
export function isValidatedTheme(rows: CustomerMemoryRow[], normalizedTitle: string): boolean {
  return rows.some(
    (r) =>
      r.status === "active" &&
      (r.memory_type === "approved_guidance" ||
        r.memory_type === "recurring_pattern") &&
      r.title.toLowerCase().includes(normalizedTitle),
  );
}

/** True if the memory row marks this theme as already resolved. */
export function isResolvedTheme(rows: CustomerMemoryRow[], normalizedTitle: string): boolean {
  return rows.some(
    (r) =>
      r.status === "resolved" &&
      r.title.toLowerCase().includes(normalizedTitle),
  );
}