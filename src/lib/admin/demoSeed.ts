// P7.4 — Demo seed (admin-only, opt-in, idempotent).
//
// Creates / refreshes three named demo customers that exercise the full
// RGS OS demo story:
//
//   Demo A — Mid Implementation        → reason: implementation_included
//   Demo B — Post-Implementation Grace → reason: post_implementation_grace
//                                        + open RGS review queue entry
//   Demo C — Active RCC Subscription   → reason: subscription_active
//                                        + history + a resolved review + a draft report
//
// Idempotency rules:
//   - lookup customers by deterministic email (`*@demo.rgs.local`)
//   - never create duplicate weekly_checkins for the same (customer_id, week_end)
//   - never create duplicate rgs_review_requests for the same weekly_checkin_id
//   - skip timeline writes that already exist for the same event_type
//   - never alter real customers — we only touch rows whose email ends with the demo suffix

import { supabase } from "@/integrations/supabase/client";

const DEMO_SUFFIX = "@demo.rgs.local";

// Canonical client-facing Revenue Control Center™ resource (the only thing that
// unlocks RCC for non-admin users). Confirmed via `resources` table query.
const RCC_RESOURCE_ID = "4fb560ed-b715-4207-b48b-bb9732369501";

export interface DemoSeedResult {
  ok: boolean;
  message: string;
  customers: { label: string; email: string; id: string | null; reasonHint: string }[];
  countsCreated: { checkins: number; reviewRequests: number; reports: number };
  errors: string[];
}

interface DemoSpec {
  label: string;
  email: string;
  full_name: string;
  business_name: string;
  stage: string;
  implementation_status: string;
  rcc_subscription_status: string;
  reasonHint: string;
  rcc_paid_through_days_from_now?: number | null;
  implementation_ended_days_ago?: number | null;
  weekly_checkin_count: number;
  flag_review_on_latest: boolean;
  resolved_review_count: number;
  include_report?: boolean;
}

const DEMOS: DemoSpec[] = [
  {
    label: "Demo A — Mid Implementation",
    email: `demo-a${DEMO_SUFFIX}`,
    full_name: "Alex Rivera",
    business_name: "Demo A — Northpoint Builders",
    stage: "implementation_active",
    implementation_status: "in_progress",
    rcc_subscription_status: "none",
    reasonHint: "implementation_included",
    implementation_ended_days_ago: null,
    weekly_checkin_count: 4,
    flag_review_on_latest: false,
    resolved_review_count: 0,
  },
  {
    label: "Demo B — Post-Implementation Grace",
    email: `demo-b${DEMO_SUFFIX}`,
    full_name: "Jamie Park",
    business_name: "Demo B — Park Mechanical Services",
    stage: "implementation_complete",
    implementation_status: "complete",
    rcc_subscription_status: "none",
    reasonHint: "post_implementation_grace",
    implementation_ended_days_ago: 12,
    weekly_checkin_count: 3,
    flag_review_on_latest: true,
    resolved_review_count: 0,
  },
  {
    label: "Demo C — Active RCC Subscription",
    email: `demo-c${DEMO_SUFFIX}`,
    full_name: "Morgan Lee",
    business_name: "Demo C — Lee & Co. Consulting",
    stage: "implementation_complete",
    implementation_status: "complete",
    rcc_subscription_status: "active",
    reasonHint: "subscription_active",
    rcc_paid_through_days_from_now: 30,
    implementation_ended_days_ago: 75,
    weekly_checkin_count: 6,
    flag_review_on_latest: false,
    resolved_review_count: 1,
    include_report: true,
  },
];

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function pickWeekRange(weeksAgo: number): { week_start: string; week_end: string; label: string } {
  // Mondays anchor; week_end = following Sunday.
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diffToMonday - weeksAgo * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return {
    week_start: fmt(monday),
    week_end: fmt(sunday),
    label: `Week of ${fmt(monday)}`,
  };
}

/**
 * Generate plausibly varied check-in payloads so Long-Term Trends has
 * something to show. Older weeks have lower revenue / higher cash concern.
 */
function checkinPayload(weeksAgo: number, flagReview = false) {
  const base = 18000;
  const trendBoost = (6 - Math.min(weeksAgo, 6)) * 1200;
  const noise = ((weeksAgo * 31) % 1500) - 750;
  const revenue = Math.max(8000, base + trendBoost + noise);
  const concernLevels = ["low", "low", "moderate", "moderate", "elevated", "critical"];
  const concern = concernLevels[Math.min(weeksAgo, concernLevels.length - 1)];
  return {
    revenue_by_service: [{ category: "Recurring services", amount: revenue * 0.65 }, { category: "One-time projects", amount: revenue * 0.35 }],
    revenue_by_channel: { referral: revenue * 0.45, repeat: revenue * 0.35, outbound: revenue * 0.2 },
    top_clients: [{ name: "Anchor client A", amount: revenue * 0.3 }, { name: "Anchor client B", amount: revenue * 0.18 }],
    lost_revenue: weeksAgo === 0 ? 1200 : weeksAgo >= 3 ? 3500 : 0,
    lost_revenue_notes: weeksAgo >= 3 ? "Two missed renewals — owner unavailable to follow up." : null,
    ar_0_30: revenue * 0.4,
    ar_31_60: revenue * 0.18,
    ar_61_90: revenue * 0.07,
    ar_90_plus: revenue * 0.02,
    obligations_next_7: revenue * 0.35,
    obligations_next_30: revenue * 1.2,
    expected_inflows_next_30: revenue * 1.4,
    cash_concern_level: concern,
    process_blocker: weeksAgo === 0 ? "Hand-off between sales and ops still manual." : null,
    people_blocker: weeksAgo === 1 ? "Project manager out — owner backfilling." : null,
    sales_blocker: weeksAgo >= 2 ? "Quote follow-ups slipping past 5 days." : null,
    cash_blocker: concern === "critical" ? "AR aging — two enterprise invoices past 60 days." : null,
    owner_bottleneck: "Owner still approves every deliverable above $5k.",
    repeated_issue: weeksAgo >= 4,
    request_rgs_review: flagReview && weeksAgo === 0,
    capacity_status: weeksAgo % 2 === 0 ? "at_capacity" : "balanced",
    owner_hours: 55 + (weeksAgo % 3) * 4,
    billable_hours: 22 + (weeksAgo % 4),
    non_billable_hours: 33 - (weeksAgo % 4),
    pipeline_confidence: ["high", "moderate", "moderate", "low", "low", "low"][Math.min(weeksAgo, 5)],
  };
}

async function ensureCustomer(spec: DemoSpec): Promise<{ id: string | null; error?: string }> {
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("email", spec.email)
    .maybeSingle();

  const patch = {
    full_name: spec.full_name,
    business_name: spec.business_name,
    stage: spec.stage,
    status: "active",
    payment_status: "paid",
    portal_unlocked: true,
    implementation_status: spec.implementation_status,
    rcc_subscription_status: spec.rcc_subscription_status,
    rcc_paid_through:
      spec.rcc_paid_through_days_from_now != null
        ? isoDate(spec.rcc_paid_through_days_from_now)
        : null,
    implementation_ended_at:
      spec.implementation_ended_days_ago != null
        ? isoDate(-spec.implementation_ended_days_ago)
        : null,
    last_activity_at: new Date().toISOString(),
  } as any;

  if (existing?.id) {
    const { error } = await (supabase.from("customers") as any).update(patch).eq("id", existing.id);
    if (error) return { id: existing.id, error: error.message };
    return { id: existing.id };
  }

  const { data: created, error } = await (supabase.from("customers") as any)
    .insert({ email: spec.email, ...patch })
    .select("id")
    .single();
  if (error || !created) return { id: null, error: error?.message || "insert failed" };
  return { id: created.id as string };
}

async function ensureRccAssignment(customerId: string): Promise<void> {
  const { data: existing } = await supabase
    .from("resource_assignments")
    .select("id")
    .eq("customer_id", customerId)
    .eq("resource_id", RCC_RESOURCE_ID)
    .maybeSingle();
  if (existing) return;
  await supabase.from("resource_assignments").insert({
    customer_id: customerId,
    resource_id: RCC_RESOURCE_ID,
    assignment_source: "manual",
  });
}

async function ensureCheckins(spec: DemoSpec, customerId: string): Promise<{ inserted: number; reviewRequested: boolean }> {
  let inserted = 0;
  let reviewRequested = false;
  for (let i = spec.weekly_checkin_count - 1; i >= 0; i--) {
    const week = pickWeekRange(i);
    const flag = spec.flag_review_on_latest && i === 0;
    const payload = checkinPayload(i, flag);
    if (flag) reviewRequested = true;
    const { error } = await supabase
      .from("weekly_checkins")
      .upsert(
        { customer_id: customerId, week_start: week.week_start, week_end: week.week_end, period_label: week.label, ...payload },
        { onConflict: "customer_id,week_end" },
      );
    if (!error) inserted++;
  }
  return { inserted, reviewRequested };
}

async function ensureResolvedReviewRequests(customerId: string, count: number): Promise<number> {
  if (count <= 0) return 0;
  const { data: checkins } = await supabase
    .from("weekly_checkins")
    .select("id, created_at")
    .eq("customer_id", customerId)
    .order("week_end", { ascending: true })
    .limit(count);
  let made = 0;
  for (const ck of checkins || []) {
    const { data: existing } = await supabase
      .from("rgs_review_requests")
      .select("id, status")
      .eq("weekly_checkin_id", ck.id)
      .maybeSingle();
    if (existing) {
      if (existing.status !== "resolved") {
        await supabase
          .from("rgs_review_requests")
          .update({ status: "resolved", resolved_at: new Date().toISOString(), resolution_note: "Resolved during demo seed." })
          .eq("id", existing.id);
      }
      continue;
    }
    const { error } = await supabase.from("rgs_review_requests").insert({
      customer_id: customerId,
      weekly_checkin_id: ck.id,
      source: "weekly_checkin",
      status: "resolved",
      priority: "normal",
      requested_at: ck.created_at,
      resolved_at: new Date().toISOString(),
      resolution_note: "Resolved during demo seed.",
    });
    if (!error) made++;
  }
  return made;
}

async function ensureDraftReport(customerId: string): Promise<number> {
  // Dedupe by a marker inside report_data, since report_type is constrained
  // to 'monthly' | 'quarterly' by a CHECK constraint and we can't reuse a
  // demo-only enum value. The marker keeps re-runs idempotent.
  const { data: existing } = await supabase
    .from("business_control_reports")
    .select("id, report_data")
    .eq("customer_id", customerId);
  const alreadySeeded = (existing || []).some(
    (r: any) => r?.report_data?.demo_seed === true,
  );
  if (alreadySeeded) return 0;
  const periodEnd = isoDate(0);
  const periodStart = isoDate(-90);
  const { error } = await supabase.from("business_control_reports").insert({
    customer_id: customerId,
    report_type: "quarterly",
    period_start: periodStart,
    period_end: periodEnd,
    status: "draft",
    health_score: 78,
    recommended_next_step:
      "Tighten quote-to-close cadence and address two aging AR balances over 60 days.",
    report_data: {
      demo_seed: true,
      highlights: ["Revenue trending up 14% QoQ", "AR > 60 days down 22%"],
    },
    internal_notes: "Generated by demo seed.",
  });
  return error ? 0 : 1;
}

export async function runDemoSeed(): Promise<DemoSeedResult> {
  const result: DemoSeedResult = {
    ok: true,
    message: "",
    customers: [],
    countsCreated: { checkins: 0, reviewRequests: 0, reports: 0 },
    errors: [],
  };

  for (const spec of DEMOS) {
    const c = await ensureCustomer(spec);
    if (!c.id) {
      result.errors.push(`${spec.label}: ${c.error}`);
      result.ok = false;
      result.customers.push({ label: spec.label, email: spec.email, id: null, reasonHint: spec.reasonHint });
      continue;
    }
    if (c.error) result.errors.push(`${spec.label}: ${c.error}`);
    await ensureRccAssignment(c.id);
    const ck = await ensureCheckins(spec, c.id);
    result.countsCreated.checkins += ck.inserted;
    if (spec.resolved_review_count > 0) {
      result.countsCreated.reviewRequests += await ensureResolvedReviewRequests(c.id, spec.resolved_review_count);
    }
    if (spec.include_report) {
      result.countsCreated.reports += await ensureDraftReport(c.id);
    }
    result.customers.push({ label: spec.label, email: spec.email, id: c.id, reasonHint: spec.reasonHint });
  }

  // Demo B's flagged check-in needs to surface in the queue. The RGS Review
  // Queue panel already syncs from `weekly_checkins.request_rgs_review = true`
  // via `syncReviewRequestsFromCheckins()` on next load — no additional work.
  result.message = result.ok
    ? "Demo data seeded. Re-run safely at any time."
    : "Demo seed completed with some errors — see details.";
  return result;
}

export const DEMO_EMAIL_SUFFIX = DEMO_SUFFIX;