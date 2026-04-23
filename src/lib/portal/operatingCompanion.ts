// P11.12 — Portal Operating Companion data layer
//
// Aggregates client-safe signals/data from the existing OS into four buckets:
//   - thisWeek       : weekly cadence + near-due actions
//   - thisMonth      : monthly close / monthly review prompts
//   - whatChanged    : recent meaningful shifts (score, signals, resolved)
//   - attentionNeeded: overdue + pending verification + critical risks
//
// All sources are read-only; nothing here writes back. Only client-safe
// rows are surfaced (signals require client_safe = true; admin-only
// evidence is never read).

import { supabase } from "@/integrations/supabase/client";
import {
  computeMonthlyCadence,
  computeWeeklyCadence,
  normalizeEntryDates,
} from "@/lib/cadence/cadence";

export type CompanionUrgency = "overdue" | "due_soon" | "info" | "good";

export type CompanionItem = {
  id: string;
  title: string;
  detail?: string;
  urgency: CompanionUrgency;
  actionLabel?: string;
  actionTo?: string;
  occurredAt?: string | null;
};

export type CompanionData = {
  thisWeek: CompanionItem[];
  thisMonth: CompanionItem[];
  whatChanged: CompanionItem[];
  attentionNeeded: CompanionItem[];
};

const dayMs = 24 * 60 * 60 * 1000;
const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const dow = x.getDay(); // 0..6 Sun..Sat
  const diff = (dow + 6) % 7; // make Mon=0
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
};
const startOfMonth = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
};
const formatScoreDelta = (delta: number) =>
    delta > 0 ? `+${Math.round(delta)}` : `${Math.round(delta)}`;

export async function loadCompanionData(customerId: string): Promise<CompanionData> {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const sinceIso = new Date(now.getTime() - 30 * dayMs).toISOString();

  const [
    { data: weeklyRows },
    { data: monthlyCloses },
    { data: revPoints },
    { data: scoreRows },
    { data: signals },
    { data: tasks },
    { data: obligations },
    { data: reports },
    { data: revEntryRows },
  ] = await Promise.all([
    supabase
      .from("weekly_checkins")
      .select("id, week_start, week_end, updated_at")
      .eq("customer_id", customerId)
      .order("week_end", { ascending: false })
      .limit(3),
    supabase
      .from("monthly_closes")
      .select("id, period_start, period_end, status, closed_at, updated_at")
      .eq("customer_id", customerId)
      .order("period_end", { ascending: false })
      .limit(3),
    supabase
      .from("revenue_review_monthly_points")
      .select("id, month_date, source, is_verified, updated_at")
      .eq("customer_id", customerId)
      .eq("is_verified", false)
      .order("month_date", { ascending: false })
      .limit(10),
    supabase
      .from("stability_score_history")
      .select("id, score_total, prior_score, delta_from_prior, score_summary, recorded_at")
      .eq("customer_id", customerId)
      .order("recorded_at", { ascending: false })
      .limit(2),
    supabase
      .from("customer_insight_signals")
      .select("id, signal_type, strength, evidence_label, evidence_summary, occurred_at, related_pillar")
      .eq("customer_id", customerId)
      .eq("client_safe", true)
      .gte("occurred_at", sinceIso)
      .order("occurred_at", { ascending: false })
      .limit(20),
    supabase
      .from("customer_tasks")
      .select("id, title, description, due_date, status")
      .eq("customer_id", customerId)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(10),
    supabase
      .from("financial_obligations")
      .select("id, label, due_date, priority, status")
      .eq("customer_id", customerId)
      .neq("status", "paid")
      .order("due_date", { ascending: true })
      .limit(10),
    supabase
      .from("business_control_reports")
      .select("id, report_type, period_end, published_at, recommended_next_step")
      .eq("customer_id", customerId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1),
    supabase
      .from("revenue_entries")
      .select("entry_date")
      .eq("customer_id", customerId)
      .order("entry_date", { ascending: false })
      .limit(50),
  ]);

  const thisWeek: CompanionItem[] = [];
  const thisMonth: CompanionItem[] = [];
  const whatChanged: CompanionItem[] = [];
  const attentionNeeded: CompanionItem[] = [];

  // ── Weekly + monthly cadence (P12.1 shared layer) ──────────────────────
  // Use the same cadence helpers the revenue tracker uses so the portal and
  // the tool tell the same story about freshness and overdue states.
  const weeklyDates = normalizeEntryDates(
    (weeklyRows || []).map((r: any) => r.week_end as string),
    now,
  );
  const revDates = normalizeEntryDates(
    (revEntryRows || []).map((r: any) => r.entry_date as string),
    now,
  );
  const weeklyState = computeWeeklyCadence(weeklyDates, now);
  const monthlyEntryState = computeMonthlyCadence(revDates, now);

  const urgencyFromTone = (s: typeof weeklyState): CompanionUrgency =>
    s.tone === "good" ? "good" : s.tone === "info" ? "info" : s.tone === "warn" ? "due_soon" : "overdue";

  // First-time monthly baseline takes priority — surface in This Month and
  // also in Attention Needed so the client cannot miss it.
  if (monthlyEntryState.status === "missing_baseline") {
    const item: CompanionItem = {
      id: "monthly-baseline-needed",
      title: monthlyEntryState.headline,
      detail: monthlyEntryState.detail,
      urgency: "overdue",
      actionLabel: monthlyEntryState.actionLabel ?? "Start monthly entry",
      actionTo: "/portal/business-control-center",
    };
    thisMonth.push(item);
    attentionNeeded.push({ ...item, id: "monthly-baseline-attn" });
  } else if (monthlyEntryState.status === "overdue") {
    attentionNeeded.push({
      id: "monthly-entry-overdue",
      title: monthlyEntryState.headline,
      detail: monthlyEntryState.detail,
      urgency: "overdue",
      actionLabel: monthlyEntryState.actionLabel ?? "Review this month",
      actionTo: "/portal/business-control-center",
    });
  } else if (monthlyEntryState.status === "due_soon") {
    thisMonth.push({
      id: "monthly-entry-due",
      title: monthlyEntryState.headline,
      detail: monthlyEntryState.detail,
      urgency: "due_soon",
      actionLabel: monthlyEntryState.actionLabel ?? "Open monthly entry",
      actionTo: "/portal/business-control-center",
    });
  }

  // Weekly cadence (driven by weekly_checkins). Only emit a baseline-needed
  // item if the monthly baseline is also missing, so we don't overwhelm a
  // brand-new client with two simultaneous "start here" cards.
  // P12.1.H — When the monthly baseline is missing, suppress weekly
  // prompts entirely so the client sees a single, clear "start here" path
  // (the monthly-baseline card already added above).
  if (!monthlyEntryState.hasBaseline) {
    // intentionally no weekly card — avoid contradictory "start here" rows
  } else if (weeklyState.status === "overdue") {
    attentionNeeded.push({
      id: "weekly-overdue",
      title: weeklyState.headline,
      detail: weeklyState.detail,
      urgency: "overdue",
      actionLabel: weeklyState.actionLabel ?? "Start weekly entry",
      actionTo: "/portal/business-control-center",
    });
  } else if (weeklyState.status === "due_soon") {
    thisWeek.push({
      id: "weekly-due",
      title: weeklyState.headline,
      detail: weeklyState.detail,
      urgency: "due_soon",
      actionLabel: weeklyState.actionLabel ?? "Open weekly entry",
      actionTo: "/portal/business-control-center",
    });
  } else if (weeklyState.status === "current" && weeklyState.coversCurrentPeriod) {
    thisWeek.push({
      id: "weekly-done",
      title: weeklyState.headline,
      detail: weeklyState.detail,
      urgency: "good",
    });
  } else if (weeklyState.status === "missing_baseline") {
    thisWeek.push({
      id: "weekly-baseline",
      title: weeklyState.headline,
      detail: weeklyState.detail,
      urgency: urgencyFromTone(weeklyState),
      actionLabel: weeklyState.actionLabel ?? "Start weekly entry",
      actionTo: "/portal/business-control-center",
    });
  } else if (weeklyState.status === "stale") {
    attentionNeeded.push({
      id: "weekly-stale",
      title: weeklyState.headline,
      detail: weeklyState.detail,
      urgency: "due_soon",
      actionLabel: weeklyState.actionLabel ?? "Refresh weekly entry",
      actionTo: "/portal/business-control-center",
    });
  } else {
    // upcoming this week, no pressure yet
    thisWeek.push({
      id: "weekly-upcoming",
      title: "Weekly check-in due this week",
      urgency: "info",
      actionLabel: "Open weekly entry",
      actionTo: "/portal/business-control-center",
    });
  }

  // ── Monthly close / review ──────────────────────────────────────────────
  const latestClose = (monthlyCloses || [])[0];
  const monthCovered =
    latestClose && new Date(latestClose.period_end) >= monthStart;
  if (!monthCovered) {
    thisMonth.push({
      id: "monthly-review-due",
      title: "Monthly review pending",
      detail: "This month's close hasn't been finalized yet.",
      urgency: now.getDate() >= 25 ? "due_soon" : "info",
      actionLabel: "View latest report",
      actionTo: "/portal/reports",
    });
  } else if (latestClose?.status === "closed") {
    thisMonth.push({
      id: "monthly-closed",
      title: "Monthly close finalized",
      urgency: "good",
    });
  }

  // ── Pending revenue review verifications ────────────────────────────────
  const pendingRev = (revPoints || []).filter((p: any) => p.source !== "manual");
  if (pendingRev.length > 0) {
    attentionNeeded.push({
      id: "rev-verify",
      title: `${pendingRev.length} imported revenue ${
        pendingRev.length === 1 ? "month" : "months"
      } need verification`,
      detail: "Confirm imported numbers so they can be used in your review.",
      urgency: "due_soon",
      actionLabel: "Open Revenue Review",
      actionTo: "/portal/tools/revenue-review",
    });
  }

  // ── Stability score movement ────────────────────────────────────────────
  const score0 = (scoreRows || [])[0];
  if (score0 && score0.delta_from_prior !== null && score0.delta_from_prior !== undefined) {
    const delta = Number(score0.delta_from_prior) || 0;
    if (Math.abs(delta) >= 20) {
      whatChanged.push({
        id: `score-${score0.id}`,
        title:
          delta > 0
            ? `Your stability score improved (${formatScoreDelta(delta)})`
            : `Your stability score declined (${formatScoreDelta(delta)})`,
        detail:
          score0.score_summary ||
          (delta > 0
            ? "Recent activity moved your score up."
            : "Recent activity moved your score down."),
        urgency: delta > 0 ? "good" : "info",
        occurredAt: score0.recorded_at,
      });
    }
  }

  // ── Client-safe signals (recent) ────────────────────────────────────────
  const sigItems = (signals || []) as any[];
  for (const s of sigItems.slice(0, 8)) {
    const isResolved = s.signal_type === "resolved_issue";
    const isRisk =
      s.signal_type === "benchmark_risk" ||
      s.signal_type === "revenue_leak" ||
      s.signal_type === "operational_bottleneck";
    if (isResolved) {
      whatChanged.push({
        id: `sig-${s.id}`,
        title: s.evidence_label || "An issue was resolved",
        detail: s.evidence_summary || undefined,
        urgency: "good",
        occurredAt: s.occurred_at,
      });
    } else if (isRisk && s.strength === "high") {
      attentionNeeded.push({
        id: `sig-${s.id}`,
        title: s.evidence_label || "Risk identified",
        detail: s.evidence_summary || undefined,
        urgency: "due_soon",
        occurredAt: s.occurred_at,
      });
    } else if (isRisk) {
      whatChanged.push({
        id: `sig-${s.id}`,
        title: s.evidence_label || "New signal",
        detail: s.evidence_summary || undefined,
        urgency: "info",
        occurredAt: s.occurred_at,
      });
    } else if (s.signal_type === "validated_strength") {
      whatChanged.push({
        id: `sig-${s.id}`,
        title: s.evidence_label || "Strength validated",
        detail: s.evidence_summary || undefined,
        urgency: "good",
        occurredAt: s.occurred_at,
      });
    }
  }

  // ── Tasks (client-visible) ──────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekFromNow = new Date(today.getTime() + 7 * dayMs);
  for (const t of (tasks || []) as any[]) {
    if (!t.due_date) continue;
    const due = new Date(t.due_date);
    if (due < today) {
      attentionNeeded.push({
        id: `task-${t.id}`,
        title: t.title,
        detail: t.description || "Task is past due.",
        urgency: "overdue",
      });
    } else if (due <= weekFromNow) {
      thisWeek.push({
        id: `task-${t.id}`,
        title: t.title,
        detail: t.description || undefined,
        urgency: "due_soon",
      });
    }
  }

  // ── Critical / overdue obligations ──────────────────────────────────────
  for (const o of (obligations || []) as any[]) {
    if (!o.due_date) continue;
    const due = new Date(o.due_date);
    if (due < today && o.priority !== "low") {
      attentionNeeded.push({
        id: `obl-${o.id}`,
        title: `${o.label} is overdue`,
        urgency: "overdue",
      });
    }
  }

  // ── Latest published report context ─────────────────────────────────────
  const latestReport = (reports || [])[0];
  if (latestReport && latestReport.published_at) {
    const ageDays = (now.getTime() - new Date(latestReport.published_at).getTime()) / dayMs;
    if (ageDays <= 30) {
      thisMonth.push({
        id: `report-${latestReport.id}`,
        title: "Review your latest report",
        detail: latestReport.recommended_next_step || "A new report is available.",
        urgency: "info",
        actionLabel: "Open report",
        actionTo: "/portal/reports",
      });
    }
  }

  // De-dup + cap each section
  const dedupe = (arr: CompanionItem[]) => {
    const seen = new Set<string>();
    return arr.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  };

  const urgencyRank: Record<CompanionUrgency, number> = {
    overdue: 0,
    due_soon: 1,
    info: 2,
    good: 3,
  };
  const sortByUrgency = (a: CompanionItem, b: CompanionItem) =>
    urgencyRank[a.urgency] - urgencyRank[b.urgency];

  return {
    thisWeek: dedupe(thisWeek).sort(sortByUrgency).slice(0, 5),
    thisMonth: dedupe(thisMonth).sort(sortByUrgency).slice(0, 5),
    whatChanged: dedupe(whatChanged).slice(0, 6),
    attentionNeeded: dedupe(attentionNeeded).sort(sortByUrgency).slice(0, 6),
  };
}