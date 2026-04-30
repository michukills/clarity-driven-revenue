// P7.3 — RGS Review Queue
// Single source of truth for syncing review requests from
// `weekly_checkins.request_rgs_review` into the lifecycle-tracking
// `rgs_review_requests` table, plus admin lifecycle actions and
// client-safe `customer_timeline` logging.
//
// Dedupe: we use a partial unique index on weekly_checkin_id so the
// upsert / ON CONFLICT path is safe across concurrent loads.
import { supabase } from "@/integrations/supabase/client";
import { isCustomerFlowAccount } from "@/lib/customers/accountKind";

export type RgsReviewStatus =
  | "open"
  | "reviewing"
  | "follow_up_needed"
  | "resolved"
  | "dismissed";

export type RgsReviewPriority = "normal" | "urgent";

export interface RgsReviewRequest {
  id: string;
  customer_id: string;
  weekly_checkin_id: string | null;
  source: string;
  status: RgsReviewStatus;
  priority: RgsReviewPriority;
  requested_at: string;
  reviewed_at: string | null;
  resolved_at: string | null;
  reviewed_by: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface RgsReviewQueueRow extends RgsReviewRequest {
  customer: {
    id: string;
    full_name: string;
    business_name: string | null;
  } | null;
  checkin: {
    id: string;
    week_start: string;
    week_end: string;
    cash_concern_level: string | null;
    process_blocker: string | null;
    people_blocker: string | null;
    sales_blocker: string | null;
    cash_blocker: string | null;
    owner_bottleneck: string | null;
    repeated_issue: boolean;
  } | null;
}

const STATUS_ORDER: RgsReviewStatus[] = [
  "open",
  "reviewing",
  "follow_up_needed",
  "resolved",
  "dismissed",
];

export const STATUS_LABEL: Record<RgsReviewStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  follow_up_needed: "Follow-up Needed",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const ACTIVE_STATUSES: RgsReviewStatus[] = [
  "open",
  "reviewing",
  "follow_up_needed",
];

/**
 * Sync rows for any `weekly_checkins` flagged with `request_rgs_review = true`
 * that don't yet have a queue entry. Idempotent — relies on the partial unique
 * index on `weekly_checkin_id` to prevent duplicates.
 */
export async function syncReviewRequestsFromCheckins(): Promise<number> {
  const { data: flagged, error } = await supabase
    .from("weekly_checkins")
    .select("id, customer_id, created_at, cash_concern_level")
    .eq("request_rgs_review", true);
  if (error || !flagged || flagged.length === 0) return 0;

  const ids = flagged.map((c) => c.id);
  const { data: existing } = await supabase
    .from("rgs_review_requests")
    .select("weekly_checkin_id")
    .in("weekly_checkin_id", ids);
  const known = new Set((existing || []).map((r) => r.weekly_checkin_id));

  const toInsert = flagged
    .filter((c) => !known.has(c.id))
    .map((c) => ({
      customer_id: c.customer_id,
      weekly_checkin_id: c.id,
      source: "weekly_checkin",
      status: "open" as RgsReviewStatus,
      priority:
        (c.cash_concern_level === "critical" ? "urgent" : "normal") as RgsReviewPriority,
      requested_at: c.created_at,
    }));
  if (toInsert.length === 0) return 0;

  // ON CONFLICT (weekly_checkin_id) — partial unique index handles dedupe.
  const { error: insErr } = await supabase
    .from("rgs_review_requests")
    .upsert(toInsert, { onConflict: "weekly_checkin_id", ignoreDuplicates: true });
  if (insErr) return 0;
  return toInsert.length;
}

export async function loadReviewQueue(): Promise<RgsReviewQueueRow[]> {
  await syncReviewRequestsFromCheckins().catch(() => 0);
  const { data, error } = await supabase
    .from("rgs_review_requests")
    .select(
      "id, customer_id, weekly_checkin_id, source, status, priority, requested_at, reviewed_at, resolved_at, reviewed_by, resolution_note, created_at, updated_at",
    )
    .order("requested_at", { ascending: false });
  if (error || !data) return [];

  const customerIds = Array.from(new Set(data.map((r) => r.customer_id)));
  const checkinIds = Array.from(
    new Set(data.map((r) => r.weekly_checkin_id).filter(Boolean) as string[]),
  );

  const [{ data: customers }, { data: checkins }] = await Promise.all([
    customerIds.length
      ? supabase
          .from("customers")
          .select("id, full_name, business_name, email, account_kind, status, is_demo_account")
          .in("id", customerIds)
      : Promise.resolve({ data: [] as any[] }),
    checkinIds.length
      ? supabase
          .from("weekly_checkins")
          .select(
            "id, week_start, week_end, cash_concern_level, process_blocker, people_blocker, sales_blocker, cash_blocker, owner_bottleneck, repeated_issue",
          )
          .in("id", checkinIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // Internal RGS / admin customer accounts must never appear in the client
  // review queue. The queue ranks client check-ins requiring RGS attention.
  const flowCustomers = ((customers as any[]) || []).filter(isCustomerFlowAccount);
  const flowIds = new Set(flowCustomers.map((c) => c.id));
  const cMap = new Map<string, any>(flowCustomers.map((c: any) => [c.id, c]));
  const ckMap = new Map<string, any>((checkins || []).map((c: any) => [c.id, c]));

  return (data as any[])
    .filter((r) => flowIds.has(r.customer_id))
    .map((r) => ({
    ...r,
    customer: cMap.get(r.customer_id) ?? null,
    checkin: r.weekly_checkin_id ? (ckMap.get(r.weekly_checkin_id) ?? null) : null,
  }));
}

/** Load active queue rows for a single customer (used by RCC admin page). */
export async function loadActiveReviewForCustomer(
  customerId: string,
): Promise<RgsReviewRequest | null> {
  const { data } = await supabase
    .from("rgs_review_requests")
    .select("*")
    .eq("customer_id", customerId)
    .in("status", ACTIVE_STATUSES as unknown as string[])
    .order("requested_at", { ascending: false })
    .limit(1);
  return ((data as any[]) || [])[0] ?? null;
}

/** Counts for dashboard panel. */
export async function loadReviewQueueCounts(): Promise<{
  open: number;
  reviewing: number;
  follow_up_needed: number;
  total_active: number;
}> {
  await syncReviewRequestsFromCheckins().catch(() => 0);
  const { data } = await supabase
    .from("rgs_review_requests")
    .select("status, customer_id")
    .in("status", ACTIVE_STATUSES as unknown as string[]);
  const counts = { open: 0, reviewing: 0, follow_up_needed: 0, total_active: 0 };
  const rows = ((data as any[]) || []);
  const ids = Array.from(new Set(rows.map((r) => r.customer_id)));
  let flowIds = new Set<string>(ids);
  if (ids.length) {
    const { data: cust } = await supabase
      .from("customers")
      .select("id, full_name, business_name, email, account_kind, status, is_demo_account")
      .in("id", ids);
    flowIds = new Set(((cust as any[]) || []).filter(isCustomerFlowAccount).map((c) => c.id));
  }
  for (const row of rows) {
    if (!flowIds.has(row.customer_id)) continue;
    if (row.status === "open") counts.open++;
    else if (row.status === "reviewing") counts.reviewing++;
    else if (row.status === "follow_up_needed") counts.follow_up_needed++;
    counts.total_active++;
  }
  return counts;
}

const TIMELINE_EVENT: Record<RgsReviewStatus, string | null> = {
  open: null,
  reviewing: "rgs_review_started",
  follow_up_needed: "rgs_review_follow_up_needed",
  resolved: "rgs_review_resolved",
  dismissed: "rgs_review_dismissed",
};

const TIMELINE_TITLE: Record<RgsReviewStatus, string> = {
  open: "RGS review requested",
  reviewing: "RGS review started",
  follow_up_needed: "RGS review needs follow-up",
  resolved: "RGS review completed",
  dismissed: "RGS review dismissed",
};

const TIMELINE_DETAIL: Record<RgsReviewStatus, string> = {
  open: "Client requested an RGS review of the latest Revenue Control Center™ submission.",
  reviewing: "RGS started reviewing the latest Revenue Control Center™ submission.",
  follow_up_needed: "RGS marked the review as needing follow-up.",
  resolved: "RGS completed review of the Revenue Control Center™ submission.",
  dismissed: "RGS dismissed the review request.",
};

/**
 * Update lifecycle status, set the right timestamps, and append a
 * client-safe timeline event. Idempotent: if the row is already in the
 * target status, no timeline event is written (prevents action spam).
 */
export async function updateReviewStatus(args: {
  requestId: string;
  customerId: string;
  nextStatus: Exclude<RgsReviewStatus, "open">;
  note?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { requestId, customerId, nextStatus, note } = args;

  // Check current status to keep this idempotent.
  const { data: current } = await supabase
    .from("rgs_review_requests")
    .select("status")
    .eq("id", requestId)
    .maybeSingle();
  if (!current) return { ok: false, error: "Request not found" };
  if ((current as any).status === nextStatus) return { ok: true };

  const { data: u } = await supabase.auth.getUser();
  const now = new Date().toISOString();

  const patch: {
    status: RgsReviewStatus;
    reviewed_at?: string;
    reviewed_by?: string | null;
    resolved_at?: string;
    resolution_note?: string | null;
  } = { status: nextStatus };
  if (nextStatus === "reviewing") {
    patch.reviewed_at = now;
    patch.reviewed_by = u.user?.id ?? null;
  }
  if (nextStatus === "resolved" || nextStatus === "dismissed") {
    patch.resolved_at = now;
    patch.reviewed_by = u.user?.id ?? null;
    if (note != null) patch.resolution_note = note;
  }
  if (nextStatus === "follow_up_needed" && note != null) {
    patch.resolution_note = note;
  }

  const { error: upErr } = await supabase
    .from("rgs_review_requests")
    .update(patch)
    .eq("id", requestId);
  if (upErr) return { ok: false, error: upErr.message };

  const evt = TIMELINE_EVENT[nextStatus];
  if (evt) {
    await supabase.from("customer_timeline").insert({
      customer_id: customerId,
      event_type: evt,
      title: TIMELINE_TITLE[nextStatus],
      detail: TIMELINE_DETAIL[nextStatus],
      actor_id: u.user?.id ?? null,
    });
  }

  // P10.2d — Emit insight signal for the lifecycle change (best-effort).
  try {
    const { emitReviewStatusSignal } = await import(
      "@/lib/diagnostics/signalEmitters"
    );
    await emitReviewStatusSignal({
      customerId,
      requestId,
      nextStatus,
      note: note ?? null,
    });
  } catch {
    /* swallow */
  }

  return { ok: true };
}

export function statusOrder(): RgsReviewStatus[] {
  return STATUS_ORDER.slice();
}

/** Short, client-safe one-line context derived from the check-in. */
export function summarizeCheckinContext(
  c: RgsReviewQueueRow["checkin"],
): string {
  if (!c) return "No check-in detail available.";
  const bits: string[] = [];
  if (c.cash_concern_level) bits.push(`Cash concern: ${c.cash_concern_level}`);
  if (c.repeated_issue) bits.push("Repeated issue");
  const blocker =
    c.cash_blocker ||
    c.process_blocker ||
    c.people_blocker ||
    c.sales_blocker ||
    c.owner_bottleneck;
  if (blocker) bits.push(blocker.length > 100 ? blocker.slice(0, 100) + "…" : blocker);
  return bits.length ? bits.join(" · ") : "No specific signal noted.";
}