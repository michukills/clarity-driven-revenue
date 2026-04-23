/* P11.9 — Operations module data layer.
 *
 * Thin CRUD + derived metrics over the four operations tables:
 *   - operational_sops
 *   - operational_bottlenecks
 *   - operational_capacity_snapshots
 *   - owner_dependence_items
 *
 * Stays admin-first; RLS enforces customer isolation.
 */

import { supabase } from "@/integrations/supabase/client";

export type SopStatus = "not_started" | "draft" | "documented" | "active" | "needs_review";
export type SopDocumentedLevel = "none" | "partial" | "usable" | "fully_systemized";

export interface OperationalSop {
  id: string;
  customer_id: string;
  title: string;
  category: string | null;
  status: SopStatus;
  owner_role: string | null;
  step_count: number | null;
  documented_level: SopDocumentedLevel;
  last_reviewed_at: string | null;
  tooling_used: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type BottleneckType =
  | "handoff_failure"
  | "follow_up_gap"
  | "capacity_limit"
  | "approval_delay"
  | "owner_dependency"
  | "tooling_gap"
  | "process_unclear"
  | "reporting_gap"
  | "scheduling_breakdown"
  | "other";
export type BottleneckSeverity = "low" | "medium" | "high";
export type BottleneckFrequency = "one_time" | "occasional" | "recurring" | "constant";
export type BottleneckStatus = "open" | "monitoring" | "resolved" | "archived";

export interface OperationalBottleneck {
  id: string;
  customer_id: string;
  bottleneck_type: BottleneckType;
  title: string;
  description: string | null;
  area: string | null;
  severity: BottleneckSeverity;
  frequency: BottleneckFrequency;
  owner_only: boolean;
  status: BottleneckStatus;
  first_observed_at: string | null;
  last_observed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperationalCapacitySnapshot {
  id: string;
  customer_id: string;
  snapshot_date: string;
  team_size: number | null;
  owner_hours_per_week: number | null;
  delivery_hours_available: number | null;
  delivery_hours_committed: number | null;
  admin_hours_available: number | null;
  admin_hours_committed: number | null;
  sales_hours_available: number | null;
  sales_hours_committed: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DelegationStatus = "owner_only" | "training" | "partially_delegated" | "delegated";
export type ReplacementReady = "no" | "partial" | "yes";
export type RiskLevel = "low" | "medium" | "high";

export interface OwnerDependenceItem {
  id: string;
  customer_id: string;
  function_area: string | null;
  task_name: string;
  why_owner_only: string | null;
  delegation_status: DelegationStatus;
  replacement_ready: ReplacementReady;
  frequency: BottleneckFrequency;
  risk_level: RiskLevel;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/* ---------- SOPs ---------- */
export async function listSops(customerId: string): Promise<OperationalSop[]> {
  const { data, error } = await supabase
    .from("operational_sops")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OperationalSop[];
}

export async function upsertSop(row: Partial<OperationalSop> & { customer_id: string; title: string }) {
  const payload = { ...row };
  const { data, error } = await supabase
    .from("operational_sops")
    .upsert(payload as never)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as OperationalSop;
}

export async function deleteSop(id: string) {
  const { error } = await supabase.from("operational_sops").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Bottlenecks ---------- */
export async function listBottlenecks(customerId: string): Promise<OperationalBottleneck[]> {
  const { data, error } = await supabase
    .from("operational_bottlenecks")
    .select("*")
    .eq("customer_id", customerId)
    .order("last_observed_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as OperationalBottleneck[];
}

export async function upsertBottleneck(
  row: Partial<OperationalBottleneck> & { customer_id: string; title: string },
) {
  const { data, error } = await supabase
    .from("operational_bottlenecks")
    .upsert(row as never)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as OperationalBottleneck;
}

export async function deleteBottleneck(id: string) {
  const { error } = await supabase.from("operational_bottlenecks").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Capacity ---------- */
export async function listCapacitySnapshots(
  customerId: string,
): Promise<OperationalCapacitySnapshot[]> {
  const { data, error } = await supabase
    .from("operational_capacity_snapshots")
    .select("*")
    .eq("customer_id", customerId)
    .order("snapshot_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OperationalCapacitySnapshot[];
}

export async function upsertCapacitySnapshot(
  row: Partial<OperationalCapacitySnapshot> & { customer_id: string; snapshot_date: string },
) {
  const { data, error } = await supabase
    .from("operational_capacity_snapshots")
    .upsert(row as never)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as OperationalCapacitySnapshot;
}

export async function deleteCapacitySnapshot(id: string) {
  const { error } = await supabase
    .from("operational_capacity_snapshots")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/* ---------- Owner dependence ---------- */
export async function listOwnerDependence(customerId: string): Promise<OwnerDependenceItem[]> {
  const { data, error } = await supabase
    .from("owner_dependence_items")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OwnerDependenceItem[];
}

export async function upsertOwnerDependence(
  row: Partial<OwnerDependenceItem> & { customer_id: string; task_name: string },
) {
  const { data, error } = await supabase
    .from("owner_dependence_items")
    .upsert(row as never)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as OwnerDependenceItem;
}

export async function deleteOwnerDependence(id: string) {
  const { error } = await supabase.from("owner_dependence_items").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Derived metrics ---------- */
export interface CapacityDerived {
  delivery_load_ratio: number | null;
  admin_load_ratio: number | null;
  sales_load_ratio: number | null;
  owner_load_ratio: number | null; // owner_hours / 40
  over_capacity: boolean;
}

function ratio(committed: number | null, available: number | null): number | null {
  if (committed == null || available == null || available <= 0) return null;
  return committed / available;
}

export function deriveCapacity(snap: OperationalCapacitySnapshot | null): CapacityDerived {
  if (!snap) {
    return {
      delivery_load_ratio: null,
      admin_load_ratio: null,
      sales_load_ratio: null,
      owner_load_ratio: null,
      over_capacity: false,
    };
  }
  const d = ratio(snap.delivery_hours_committed, snap.delivery_hours_available);
  const a = ratio(snap.admin_hours_committed, snap.admin_hours_available);
  const s = ratio(snap.sales_hours_committed, snap.sales_hours_available);
  const owner = snap.owner_hours_per_week != null ? snap.owner_hours_per_week / 40 : null;
  const over = [d, a, s, owner].some((r) => r != null && r > 1);
  return {
    delivery_load_ratio: d,
    admin_load_ratio: a,
    sales_load_ratio: s,
    owner_load_ratio: owner,
    over_capacity: over,
  };
}

export interface OperationsRollup {
  sops: OperationalSop[];
  bottlenecks: OperationalBottleneck[];
  capacity_latest: OperationalCapacitySnapshot | null;
  capacity_history: OperationalCapacitySnapshot[];
  owner_items: OwnerDependenceItem[];
  derived: CapacityDerived;
  // headlines
  undocumented_sops: number;
  needs_review_sops: number;
  open_high_severity: number;
  recurring_or_constant_open: number;
  owner_only_open: number;
  high_risk_owner_items: number;
}

export async function buildOperationsRollup(customerId: string): Promise<OperationsRollup> {
  const [sops, bottlenecks, capacity, owner_items] = await Promise.all([
    listSops(customerId),
    listBottlenecks(customerId),
    listCapacitySnapshots(customerId),
    listOwnerDependence(customerId),
  ]);
  const latest = capacity[0] ?? null;
  const derived = deriveCapacity(latest);
  return {
    sops,
    bottlenecks,
    capacity_latest: latest,
    capacity_history: capacity,
    owner_items,
    derived,
    undocumented_sops: sops.filter(
      (s) => s.documented_level === "none" || s.documented_level === "partial",
    ).length,
    needs_review_sops: sops.filter((s) => s.status === "needs_review").length,
    open_high_severity: bottlenecks.filter(
      (b) => b.severity === "high" && (b.status === "open" || b.status === "monitoring"),
    ).length,
    recurring_or_constant_open: bottlenecks.filter(
      (b) =>
        (b.frequency === "recurring" || b.frequency === "constant") &&
        (b.status === "open" || b.status === "monitoring"),
    ).length,
    owner_only_open: bottlenecks.filter(
      (b) => b.owner_only && (b.status === "open" || b.status === "monitoring"),
    ).length,
    high_risk_owner_items: owner_items.filter(
      (i) => i.risk_level === "high" && i.delegation_status !== "delegated",
    ).length,
  };
}