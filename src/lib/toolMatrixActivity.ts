// P6.2 — Per-tool activity loader.
// Resolves "last activity" for each tool in TOOL_MATRIX across one or many
// customers using each tool's declared activity source. No schema changes.
import { supabase } from "@/integrations/supabase/client";
import {
  TOOL_MATRIX,
  computeOverdueState,
  type OverdueState,
  type ToolMatrixEntry,
} from "@/lib/toolMatrix";

export type ToolActivity = {
  toolKey: string;
  customerId: string;
  lastActivityAt: string | null;
  overdue: OverdueState;
};

/** Map: customerId -> toolKey -> ToolActivity */
export type ActivityIndex = Map<string, Map<string, ToolActivity>>;

const setActivity = (
  index: ActivityIndex,
  customerId: string,
  toolKey: string,
  iso: string | null,
  rule: ToolMatrixEntry["frequency"],
) => {
  let perCustomer = index.get(customerId);
  if (!perCustomer) {
    perCustomer = new Map();
    index.set(customerId, perCustomer);
  }
  const prev = perCustomer.get(toolKey);
  // Keep latest if multiple sources (defensive — shouldn't happen in P6.2a).
  if (!prev?.lastActivityAt || (iso && new Date(iso) > new Date(prev.lastActivityAt))) {
    perCustomer.set(toolKey, {
      toolKey,
      customerId,
      lastActivityAt: iso,
      overdue: computeOverdueState(rule, iso),
    });
  }
};

/**
 * Loads tool activity for the given customers. If `customerIds` is empty,
 * loads across all customers (admin matrix view).
 */
export async function loadToolActivity(customerIds?: string[]): Promise<ActivityIndex> {
  const index: ActivityIndex = new Map();
  const filterCustomers = (q: any) =>
    customerIds && customerIds.length > 0 ? q.in("customer_id", customerIds) : q;

  // 1) tool_runs — bulk fetch latest run per (customer, tool_key)
  const toolRunKeys = TOOL_MATRIX.filter((t) => t.activity.kind === "tool_runs").map(
    (t) => (t.activity as any).tool_key,
  );
  if (toolRunKeys.length) {
    const runsQuery = supabase
      .from("tool_runs")
      .select("customer_id, tool_key, updated_at")
      .in("tool_key", toolRunKeys)
      .order("updated_at", { ascending: false });
    const { data: runs } = await filterCustomers(runsQuery);
    const seen = new Set<string>(); // dedupe — first row per pair is latest
    for (const r of (runs as any[]) || []) {
      if (!r.customer_id || !r.tool_key) continue;
      const sig = r.customer_id + "::" + r.tool_key;
      if (seen.has(sig)) continue;
      seen.add(sig);
      const tool = TOOL_MATRIX.find(
        (t) => t.activity.kind === "tool_runs" && (t.activity as any).tool_key === r.tool_key,
      );
      if (!tool) continue;
      setActivity(index, r.customer_id, tool.key, r.updated_at, tool.frequency);
    }
  }

  // 2) weekly_checkins — for Revenue Control Center™
  const rcc = TOOL_MATRIX.find((t) => t.activity.kind === "weekly_checkins");
  if (rcc) {
    const checkinsQuery = supabase
      .from("weekly_checkins")
      .select("customer_id, week_end, updated_at")
      .order("week_end", { ascending: false });
    const { data: rows } = await filterCustomers(checkinsQuery);
    const seen = new Set<string>();
    for (const r of (rows as any[]) || []) {
      if (!r.customer_id || seen.has(r.customer_id)) continue;
      seen.add(r.customer_id);
      // week_end is the canonical "completed for period" timestamp.
      const iso = r.week_end ? new Date(r.week_end).toISOString() : r.updated_at;
      setActivity(index, r.customer_id, rcc.key, iso, rcc.frequency);
    }
  }

  // 3) business_control_reports — for Reports & Reviews™
  const reports = TOOL_MATRIX.find((t) => t.activity.kind === "business_control_reports");
  if (reports) {
    const reportsQuery = supabase
      .from("business_control_reports")
      .select("customer_id, status, published_at, updated_at")
      .order("updated_at", { ascending: false });
    const { data: rows } = await filterCustomers(reportsQuery);
    const seen = new Set<string>();
    for (const r of (rows as any[]) || []) {
      if (!r.customer_id || seen.has(r.customer_id)) continue;
      // Prefer published reports; fall back to latest activity (draft work).
      if (r.status !== "published" && !r.published_at) continue;
      seen.add(r.customer_id);
      setActivity(
        index,
        r.customer_id,
        reports.key,
        r.published_at || r.updated_at,
        reports.frequency,
      );
    }
  }

  return index;
}

/** Convenience: get a single customer's activity map (toolKey -> ToolActivity). */
export function activityForCustomer(
  index: ActivityIndex,
  customerId: string,
): Map<string, ToolActivity> {
  return index.get(customerId) || new Map();
}

/** Aggregate: assigned customer count per tool_key from resource_assignments + matching titles. */
export async function loadAssignedCountsByMatrixKey(): Promise<Record<string, number>> {
  // Match resource rows to matrix tools by canonical title or core key.
  // For built-in core tools, count distinct customers with ANY assignment of
  // a resource whose title matches one of the canonical aliases.
  const { data: resources } = await supabase
    .from("resources")
    .select("id, title");
  const { data: assignments } = await supabase
    .from("resource_assignments")
    .select("resource_id, customer_id");
  if (!resources || !assignments) return {};

  // Lazy import to avoid cycles.
  const { coreKeyForTitle, canonicalToolDisplayTitle } = await import("@/lib/portal");

  const resourceIdToToolKey = new Map<string, string>();
  for (const r of resources as any[]) {
    const ck = coreKeyForTitle(r.title);
    if (ck) {
      resourceIdToToolKey.set(r.id, ck);
      continue;
    }
    const display = canonicalToolDisplayTitle(r.title);
    const match = TOOL_MATRIX.find((t) => t.name === display);
    if (match) resourceIdToToolKey.set(r.id, match.key);
  }

  const counts: Record<string, Set<string>> = {};
  for (const a of assignments as any[]) {
    const k = resourceIdToToolKey.get(a.resource_id);
    if (!k) continue;
    if (!counts[k]) counts[k] = new Set();
    counts[k].add(a.customer_id);
  }
  const out: Record<string, number> = {};
  for (const [k, set] of Object.entries(counts)) out[k] = set.size;
  return out;
}
