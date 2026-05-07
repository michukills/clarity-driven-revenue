/**
 * P12.1 — Shared cadence / compliance layer.
 *
 * One module to compute "is this recurring input current, due-soon, overdue,
 * stale, or missing-baseline" for both weekly and monthly inputs. Used by
 * the revenue tracker, weekly check-in surfaces, and the portal Operating
 * Companion so that every place tells the same story.
 *
 * Design notes:
 *   - Pure functions over already-fetched data (an array of ISO date strings)
 *     so callers stay in control of their queries.
 *   - One small loader (`loadCadenceInputs`) is provided for the common case
 *     where you want both weekly and monthly state for a customer in one go.
 *   - Status vocabulary is deliberately small and shared across surfaces.
 */

import { supabase } from "@/integrations/supabase/client";

export type CadenceStatus =
  | "missing_baseline" // no entry has ever been made for this cadence
  | "current"          // most recent entry covers the current period
  | "due_soon"         // current period not yet covered, getting close
  | "overdue"          // current period not covered past the expected window
  | "stale";           // baseline exists but data is older than freshness window

export type CadenceTone = "good" | "info" | "warn" | "critical";

export interface CadenceState {
  cadence: "weekly" | "monthly";
  status: CadenceStatus;
  tone: CadenceTone;
  /** ISO date of the most recent entry, if any. */
  lastEntryAt: string | null;
  /** Days since the most recent entry (null when none). */
  daysSinceLast: number | null;
  /** Whether at least one entry has ever been recorded. */
  hasBaseline: boolean;
  /** Whether the current period (week / month) has any entry. */
  coversCurrentPeriod: boolean;
  /** 1..7 for weekly, 1..31 for monthly — useful for UI nuance. */
  positionInPeriod: number;
  /** Short, calm, action-oriented headline suitable for client UI. */
  headline: string;
  /** One-line supporting sentence. */
  detail: string;
  /** Optional CTA the surface can render. */
  actionLabel?: string;
}

const dayMs = 24 * 60 * 60 * 1000;

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay(); // 0..6 Sun..Sat
  const diff = (dow + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function dayOfWeekMonFirst(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
}
function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / dayMs);
}
function parseCadenceDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(value);
}
function toneFor(status: CadenceStatus): CadenceTone {
  switch (status) {
    case "current": return "good";
    case "due_soon": return "info";
    case "overdue": return "warn";
    case "stale": return "warn";
    case "missing_baseline": return "critical";
  }
}

/** Pick the most recent ISO date from a list. Invalid entries are ignored. */
function latestDate(dates: (string | null | undefined)[]): Date | null {
  let best: Date | null = null;
  for (const s of dates) {
    if (!s) continue;
    const d = parseCadenceDate(s);
    if (isNaN(d.getTime())) continue;
    if (!best || d > best) best = d;
  }
  return best;
}

/**
 * P12.1.H — Normalize raw entry dates from the database before they reach
 * the cadence engine. This protects the engine from legacy / partial data:
 *   - drops null / empty / unparseable strings
 *   - drops zero / sentinel dates (e.g. "0001-01-01", "1970-01-01")
 *   - drops far-future dates (anything more than 1 day ahead of `now`),
 *     which can otherwise make a brand-new client look "current" when a
 *     stray test/import row leaks in
 * Returns ISO date strings, sorted descending (newest first).
 */
export function normalizeEntryDates(
  raw: (string | null | undefined)[],
  now: Date = new Date(),
): string[] {
  const cutoffFuture = now.getTime() + dayMs; // tolerate +1d for tz skew
  const cleaned: { iso: string; t: number }[] = [];
  for (const s of raw) {
    if (!s) continue;
    const d = parseCadenceDate(s);
    const t = d.getTime();
    if (isNaN(t)) continue;
    if (t < new Date("1990-01-01").getTime()) continue; // sentinel
    if (t > cutoffFuture) continue; // future / bad
    cleaned.push({ iso: d.toISOString(), t });
  }
  cleaned.sort((a, b) => b.t - a.t);
  return cleaned.map((x) => x.iso);
}

/**
 * Weekly cadence:
 *   - day 1–4: neutral / info
 *   - day 5–6: due_soon
 *   - day 7+:  overdue
 * If no entry has ever been made → missing_baseline.
 * If entries exist but none in 14+ days → stale.
 */
export function computeWeeklyCadence(
  entryDates: (string | null | undefined)[],
  now: Date = new Date(),
): CadenceState {
  const last = latestDate(normalizeEntryDates(entryDates, now));
  const weekStart = startOfWeek(now);
  const dow = dayOfWeekMonFirst(now);
  const daysSince = last ? daysBetween(last, now) : null;
  const hasBaseline = !!last;
  const coversCurrent = !!last && last >= weekStart;

  let status: CadenceStatus;
  let headline: string;
  let detail: string;
  let actionLabel: string | undefined;

  if (!hasBaseline) {
    status = "missing_baseline";
    headline = "Start your weekly check-in";
    detail = "Your first weekly entry sets the rhythm for everything that follows.";
    actionLabel = "Start weekly entry";
  } else if (coversCurrent) {
    status = "current";
    headline = "You're current for this week";
    detail = "Weekly entry recorded. Nothing to do here.";
  } else if (dow >= 7) {
    status = "overdue";
    headline = "Weekly entry overdue";
    detail = "This week hasn't been recorded yet — a few minutes will close the gap.";
    actionLabel = "Complete weekly update";
  } else if (dow >= 5) {
    status = "due_soon";
    headline = "This week's entry is due soon";
    detail = "End of the week is close — log this week's numbers when you have a moment.";
    actionLabel = "Open weekly entry";
  } else if (daysSince !== null && daysSince >= 14) {
    status = "stale";
    headline = "Weekly data is going stale";
    detail = `Last weekly entry was ${daysSince} days ago.`;
    actionLabel = "Refresh weekly entry";
  } else {
    status = "current";
    headline = "On track this week";
    detail = "No entry needed yet — check back later in the week.";
  }

  return {
    cadence: "weekly",
    status,
    tone: toneFor(status),
    lastEntryAt: last?.toISOString() ?? null,
    daysSinceLast: daysSince,
    hasBaseline,
    coversCurrentPeriod: coversCurrent,
    positionInPeriod: dow,
    headline,
    detail,
    actionLabel,
  };
}

/**
 * Monthly cadence:
 *   - day 1–14: neutral / info if no current-month entry
 *   - day 15–24: due_soon if no current-month entry
 *   - day 25+:  overdue if no current-month entry
 *   - missing_baseline if no entry has ever been made
 *   - stale if last entry is older than 60 days
 */
export function computeMonthlyCadence(
  entryDates: (string | null | undefined)[],
  now: Date = new Date(),
): CadenceState {
  const last = latestDate(normalizeEntryDates(entryDates, now));
  const monthStart = startOfMonth(now);
  const dom = now.getDate();
  const daysSince = last ? daysBetween(last, now) : null;
  const hasBaseline = !!last;
  const coversCurrent = !!last && last >= monthStart;

  let status: CadenceStatus;
  let headline: string;
  let detail: string;
  let actionLabel: string | undefined;

  if (!hasBaseline) {
    status = "missing_baseline";
    headline = "Monthly baseline needed first";
    detail = "Add your first monthly entry so the system has a real picture to track from.";
    actionLabel = "Start monthly entry";
  } else if (coversCurrent) {
    status = "current";
    headline = "This month's update is in";
    detail = "Monthly numbers recorded. You're current.";
  } else if (dom >= 25) {
    status = "overdue";
    headline = "This month's update is missing";
    detail = "The month is almost over and no entry exists yet for it.";
    actionLabel = "Review this month's numbers";
  } else if (dom >= 15) {
    status = "due_soon";
    headline = "Monthly update due soon";
    detail = "Halfway through the month — a quick monthly entry keeps trends honest.";
    actionLabel = "Open monthly entry";
  } else if (daysSince !== null && daysSince >= 60) {
    status = "stale";
    headline = "Monthly data is going stale";
    detail = `Last monthly entry was ${daysSince} days ago.`;
    actionLabel = "Refresh monthly entry";
  } else {
    status = "current";
    headline = "Monthly cadence on track";
    detail = "No monthly action needed yet.";
  }

  return {
    cadence: "monthly",
    status,
    tone: toneFor(status),
    lastEntryAt: last?.toISOString() ?? null,
    daysSinceLast: daysSince,
    hasBaseline,
    coversCurrentPeriod: coversCurrent,
    positionInPeriod: dom,
    headline,
    detail,
    actionLabel,
  };
}

export interface CustomerCadenceSnapshot {
  weekly: CadenceState;
  monthly: CadenceState;
  /**
   * True when the monthly baseline does not yet exist. Surfaces should
   * gate weekly-only flows on this so first-time users are not dropped
   * into a confusing weekly-only experience.
   */
  needsMonthlyBaseline: boolean;
}

/**
 * Loads cadence state for a customer from `revenue_entries` (monthly truth)
 * and `weekly_checkins` (weekly truth). Both queries are read-only and use
 * existing client-RLS-safe tables.
 */
export async function loadCustomerCadence(
  customerId: string,
  now: Date = new Date(),
): Promise<CustomerCadenceSnapshot> {
  // Both queries are wrapped so a transient failure on one source does not
  // throw the whole snapshot away — the surface gracefully renders the
  // missing-baseline state instead of an error.
  const [revRes, checkinRes] = await Promise.all([
    supabase
      .from("revenue_entries")
      .select("entry_date")
      .eq("customer_id", customerId)
      .order("entry_date", { ascending: false })
      .limit(50),
    supabase
      .from("weekly_checkins")
      .select("week_end")
      .eq("customer_id", customerId)
      .order("week_end", { ascending: false })
      .limit(12),
  ]);

  const monthlyDates = normalizeEntryDates(
    ((revRes.data as any[]) || []).map((r) => r.entry_date as string),
    now,
  );
  const weeklyDates = normalizeEntryDates(
    ((checkinRes.data as any[]) || []).map((r) => r.week_end as string),
    now,
  );

  const monthly = computeMonthlyCadence(monthlyDates, now);
  const weekly = computeWeeklyCadence(weeklyDates, now);

  return {
    weekly,
    monthly,
    needsMonthlyBaseline: !monthly.hasBaseline,
  };
}

/** Compact label for chips/badges. */
export function cadenceBadgeLabel(s: CadenceState): string {
  switch (s.status) {
    case "current": return "Current";
    case "due_soon": return "Due soon";
    case "overdue": return "Overdue";
    case "stale": return "Stale";
    case "missing_baseline":
      return s.cadence === "monthly" ? "Baseline needed" : "Not started";
  }
}
