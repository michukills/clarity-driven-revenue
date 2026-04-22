/* ============================================================================
   P7.1 — Long-Horizon Trend Intelligence

   Pure functions layered on top of intelligence.ts WeekRollup output.
   Calculates 4w / 13w / 26w / 52w horizons + YoY comparison + streaks +
   persistence patterns, and converts each into safe, plain-English language.

   No I/O. No UI. No new tables. Reuses existing rollups.
   ========================================================================= */

import type { WeekRollup, Confidence } from "./intelligence";
import type { WeeklyCheckin } from "./types";

export type HorizonKey = "4w" | "13w" | "26w" | "52w";

export interface HorizonStats {
  key: HorizonKey;
  label: string;
  weeksRequired: number;
  weeksAvailable: number;
  unlocked: boolean;
  /** Average per week across the horizon (when unlocked). */
  revenueAvg: number;
  expensesAvg: number;
  netCashAvg: number;
  /** Direction of the metric inside the horizon (early third → late third). */
  revenueDirection: TrendDirection;
  expensesDirection: TrendDirection;
  netCashDirection: TrendDirection;
  /** Pattern-level summary, e.g. "rising for 3 of 13 weeks". */
  narrative: string;
}

export type TrendDirection = "rising" | "falling" | "flat" | "insufficient";

export interface YoYComparison {
  available: boolean;
  /** Last 13 weeks ("recent") vs the same 13 weeks one year earlier ("prior_year"). */
  recentRevenueAvg: number;
  priorYearRevenueAvg: number;
  recentExpensesAvg: number;
  priorYearExpensesAvg: number;
  recentNetCashAvg: number;
  priorYearNetCashAvg: number;
  revenuePct: number | null;
  expensesPct: number | null;
  netCashPct: number | null;
  narrative: string;
}

export interface Streak {
  metric: "revenue_down" | "expenses_up" | "cash_negative";
  weeks: number;
  narrative: string;
}

export interface RepeatedBlockerStreak {
  type: "process" | "people" | "sales" | "cash" | "owner";
  label: string;
  weeksHit: number;
  windowWeeks: number;
  narrative: string;
}

export type PersistenceKey =
  | "cash_concern"
  | "revenue_decline"
  | "expense_pressure"
  | "labor_pressure"
  | "low_pipeline_confidence";

export interface PersistencePattern {
  key: PersistenceKey;
  active: boolean;
  weeksMatched: number;
  windowWeeks: number;
  narrative: string;
}

export interface LongHorizonAnalysis {
  /** Total weeks of rollup history available (capped to 104 for analysis). */
  weeksAvailable: number;
  /** Confidence inherited from data quality assessment. */
  confidence: Confidence;
  horizons: Record<HorizonKey, HorizonStats>;
  yoy: YoYComparison;
  streaks: Streak[];
  blockerStreaks: RepeatedBlockerStreak[];
  persistence: PersistencePattern[];
  /** What the next horizon unlocks ("Log 5 more weeks to unlock 13-week trend"). */
  nextUnlock: { weeksToGo: number; horizon: HorizonKey | "yoy" } | null;
  /** Plain-English "what to watch next" sentence. */
  watchNext: string;
}

const HORIZON_CONFIG: { key: HorizonKey; label: string; weeks: number }[] = [
  { key: "4w",  label: "4-week trend",   weeks: 4 },
  { key: "13w", label: "13-week trend",  weeks: 13 },
  { key: "26w", label: "26-week trend",  weeks: 26 },
  { key: "52w", label: "52-week trend",  weeks: 52 },
];

/* --------------------------- Public entry ------------------------------- */

export function buildLongHorizonAnalysis(
  weeks: WeekRollup[],
  confidence: Confidence,
): LongHorizonAnalysis {
  // weeks come in newest-first from buildWeekRollups; cap at 104 (~2 yrs)
  // to keep computation cheap and bounded regardless of dataset size.
  const w = weeks.slice(0, 104);

  const horizons: Record<HorizonKey, HorizonStats> = {
    "4w":  buildHorizon("4w",  "4-week trend",   4,  w),
    "13w": buildHorizon("13w", "13-week trend", 13,  w),
    "26w": buildHorizon("26w", "26-week trend", 26,  w),
    "52w": buildHorizon("52w", "52-week trend", 52,  w),
  };

  const yoy = buildYoY(w);
  const streaks = detectStreaks(w);
  const blockerStreaks = detectBlockerStreaks(w);
  const persistence = detectPersistence(w);
  const nextUnlock = pickNextUnlock(w.length, yoy.available);

  return {
    weeksAvailable: w.length,
    confidence,
    horizons,
    yoy,
    streaks,
    blockerStreaks,
    persistence,
    nextUnlock,
    watchNext: composeWatchNext(streaks, persistence, blockerStreaks, horizons, yoy),
  };
}

/* --------------------------- Horizon math ------------------------------- */

function buildHorizon(
  key: HorizonKey,
  label: string,
  required: number,
  weeks: WeekRollup[],
): HorizonStats {
  const slice = weeks.slice(0, required);
  const available = slice.length;
  const unlocked = available >= required;

  if (!unlocked) {
    return {
      key, label, weeksRequired: required, weeksAvailable: available, unlocked,
      revenueAvg: 0, expensesAvg: 0, netCashAvg: 0,
      revenueDirection: "insufficient",
      expensesDirection: "insufficient",
      netCashDirection: "insufficient",
      narrative: `Not enough history yet for the ${label.toLowerCase()} — log ${required - available} more week${required - available === 1 ? "" : "s"} to unlock.`,
    };
  }

  const revenueAvg  = avg(slice.map((w) => w.revenue));
  const expensesAvg = avg(slice.map((w) => w.expenses));
  const netCashAvg  = avg(slice.map((w) => w.netCash));

  const revenueDirection  = directionAcrossThirds(slice.map((w) => w.revenue));
  const expensesDirection = directionAcrossThirds(slice.map((w) => w.expenses));
  const netCashDirection  = directionAcrossThirds(slice.map((w) => w.netCash));

  return {
    key, label, weeksRequired: required, weeksAvailable: available, unlocked,
    revenueAvg, expensesAvg, netCashAvg,
    revenueDirection, expensesDirection, netCashDirection,
    narrative: composeHorizonNarrative(label, revenueDirection, expensesDirection, netCashDirection),
  };
}

function composeHorizonNarrative(
  label: string,
  rev: TrendDirection,
  exp: TrendDirection,
  cash: TrendDirection,
): string {
  const parts: string[] = [];
  if (rev === "rising")  parts.push("revenue is trending up");
  if (rev === "falling") parts.push("revenue is trending down");
  if (exp === "rising")  parts.push("expenses are climbing");
  if (exp === "falling") parts.push("expenses are easing");
  if (cash === "falling") parts.push("net cash is weakening");
  if (cash === "rising")  parts.push("net cash is improving");
  if (parts.length === 0) {
    return `Across the ${label.toLowerCase()}, no material direction change was detected.`;
  }
  return `Across the ${label.toLowerCase()}, ${joinHuman(parts)}.`;
}

/* ------------------------ Year-over-year math --------------------------- */

function buildYoY(weeks: WeekRollup[]): YoYComparison {
  // Need 13 recent weeks AND 13 weeks anchored ~52 weeks earlier.
  // Recent = weeks[0..13). Prior-year = weeks[52..65). Require 65 weeks of
  // history minimum so the prior-year window is fully populated.
  const empty: YoYComparison = {
    available: false,
    recentRevenueAvg: 0, priorYearRevenueAvg: 0,
    recentExpensesAvg: 0, priorYearExpensesAvg: 0,
    recentNetCashAvg: 0, priorYearNetCashAvg: 0,
    revenuePct: null, expensesPct: null, netCashPct: null,
    narrative: weeks.length >= 52
      ? `Year-over-year comparison unlocks at 104 weeks of history (currently ${weeks.length}).`
      : `Year-over-year comparison unlocks at 104 weeks of history (currently ${weeks.length}). Log weekly check-ins to build it.`,
  };
  if (weeks.length < 65) return empty;

  const recent = weeks.slice(0, 13);
  const prior  = weeks.slice(52, 65);
  if (prior.length < 13) return empty;

  const recentRev  = avg(recent.map((w) => w.revenue));
  const priorRev   = avg(prior.map((w) => w.revenue));
  const recentExp  = avg(recent.map((w) => w.expenses));
  const priorExp   = avg(prior.map((w) => w.expenses));
  const recentCash = avg(recent.map((w) => w.netCash));
  const priorCash  = avg(prior.map((w) => w.netCash));

  const revenuePct  = pctChange(recentRev,  priorRev);
  const expensesPct = pctChange(recentExp,  priorExp);
  const netCashPct  = pctChange(recentCash, priorCash);

  const bits: string[] = [];
  if (revenuePct !== null) bits.push(`revenue is ${signedPct(revenuePct)} vs the same period last year`);
  if (expensesPct !== null) bits.push(`expenses are ${signedPct(expensesPct)}`);
  if (netCashPct !== null) bits.push(`net cash is ${signedPct(netCashPct)}`);

  return {
    available: true,
    recentRevenueAvg: recentRev,  priorYearRevenueAvg: priorRev,
    recentExpensesAvg: recentExp, priorYearExpensesAvg: priorExp,
    recentNetCashAvg: recentCash, priorYearNetCashAvg: priorCash,
    revenuePct, expensesPct, netCashPct,
    narrative: bits.length
      ? `Compared to the same 13 weeks a year ago, ${joinHuman(bits)}.`
      : `Year-over-year comparison is available, but values are too small to draw a confident conclusion.`,
  };
}

/* ---------------------------- Streaks ----------------------------------- */

function detectStreaks(weeks: WeekRollup[]): Streak[] {
  const out: Streak[] = [];

  // Revenue down: each of the last N weeks is lower than the one before it.
  // Walk newest→older comparing pairs (weeks[i] vs weeks[i+1]).
  let revDown = 0;
  for (let i = 0; i + 1 < weeks.length; i++) {
    if (weeks[i].revenue < weeks[i + 1].revenue) revDown++;
    else break;
  }
  if (revDown >= 2) {
    out.push({
      metric: "revenue_down",
      weeks: revDown,
      narrative: `Revenue has declined for ${revDown} consecutive week${revDown === 1 ? "" : "s"}.`,
    });
  }

  let expUp = 0;
  for (let i = 0; i + 1 < weeks.length; i++) {
    if (weeks[i].expenses > weeks[i + 1].expenses) expUp++;
    else break;
  }
  if (expUp >= 2) {
    out.push({
      metric: "expenses_up",
      weeks: expUp,
      narrative: `Expenses have risen for ${expUp} consecutive week${expUp === 1 ? "" : "s"}.`,
    });
  }

  let cashNeg = 0;
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i].netCash < 0) cashNeg++;
    else break;
  }
  if (cashNeg >= 2) {
    out.push({
      metric: "cash_negative",
      weeks: cashNeg,
      narrative: `Net cash has been negative for ${cashNeg} consecutive week${cashNeg === 1 ? "" : "s"}.`,
    });
  }

  return out;
}

function detectBlockerStreaks(weeks: WeekRollup[]): RepeatedBlockerStreak[] {
  // Examine trailing 8 weeks of check-ins, count blocker hits per category.
  const window = weeks.slice(0, 8).map((w) => w.checkin).filter(Boolean) as WeeklyCheckin[];
  if (window.length < 2) return [];

  const buckets: { type: RepeatedBlockerStreak["type"]; label: string; pick: (c: WeeklyCheckin) => string | null }[] = [
    { type: "process", label: "Process bottleneck", pick: (c) => nz(c.process_blocker) },
    { type: "people",  label: "People bottleneck",  pick: (c) => nz(c.people_blocker) },
    { type: "sales",   label: "Sales bottleneck",   pick: (c) => nz(c.sales_blocker) },
    { type: "cash",    label: "Cash bottleneck",    pick: (c) => nz(c.cash_blocker) },
    { type: "owner",   label: "Owner overload",     pick: (c) => nz(c.owner_bottleneck) },
  ];

  const out: RepeatedBlockerStreak[] = [];
  for (const b of buckets) {
    const hits = window.filter((c) => !!b.pick(c)).length;
    if (hits >= 3) {
      out.push({
        type: b.type, label: b.label,
        weeksHit: hits, windowWeeks: window.length,
        narrative: `${b.label} has been reported in ${hits} of the last ${window.length} weekly check-ins. This appears to be a pattern, not a one-week event.`,
      });
    }
  }
  return out;
}

/* --------------------------- Persistence -------------------------------- */

function detectPersistence(weeks: WeekRollup[]): PersistencePattern[] {
  const out: PersistencePattern[] = [];

  // 1. Cash concern lasting 3+ of last 6 weeks
  const last6Checkins = weeks.slice(0, 6).map((w) => w.checkin).filter(Boolean) as WeeklyCheckin[];
  const concernHits = last6Checkins.filter(
    (c) => c.cash_concern_level === "watch" || c.cash_concern_level === "critical",
  ).length;
  out.push({
    key: "cash_concern",
    active: concernHits >= 3,
    weeksMatched: concernHits,
    windowWeeks: last6Checkins.length,
    narrative: concernHits >= 3
      ? `Cash pressure has persisted for ${concernHits} of the last ${last6Checkins.length} weeks.`
      : `Cash pressure has not formed a persistent pattern.`,
  });

  // 2. Revenue decline lasting 4+ of last 6 weeks (vs each prior week)
  const last7 = weeks.slice(0, 7);
  let revDeclineHits = 0;
  for (let i = 0; i + 1 < last7.length && i < 6; i++) {
    if (last7[i].revenue < last7[i + 1].revenue) revDeclineHits++;
  }
  const revWindow = Math.max(0, Math.min(6, last7.length - 1));
  out.push({
    key: "revenue_decline",
    active: revDeclineHits >= 4,
    weeksMatched: revDeclineHits,
    windowWeeks: revWindow,
    narrative: revDeclineHits >= 4
      ? `Revenue has declined in ${revDeclineHits} of the last ${revWindow} weeks — this looks like a sustained trend, not a one-off dip.`
      : `Revenue has not formed a sustained downward trend.`,
  });

  // 3. Expense pressure rising over 4+ of last 6 weeks
  let expRiseHits = 0;
  for (let i = 0; i + 1 < last7.length && i < 6; i++) {
    if (last7[i].expenses > last7[i + 1].expenses) expRiseHits++;
  }
  const expWindow = Math.max(0, Math.min(6, last7.length - 1));
  out.push({
    key: "expense_pressure",
    active: expRiseHits >= 4,
    weeksMatched: expRiseHits,
    windowWeeks: expWindow,
    narrative: expRiseHits >= 4
      ? `Expenses are rising over ${expRiseHits} of the last ${expWindow} weeks — review which categories are climbing fastest.`
      : `Expense pressure has not formed a sustained upward trend.`,
  });

  // 4. Labor pressure rising over 4+ weeks (use payroll component of rollup)
  let laborRiseHits = 0;
  for (let i = 0; i + 1 < last7.length && i < 6; i++) {
    if (last7[i].payroll > last7[i + 1].payroll) laborRiseHits++;
  }
  out.push({
    key: "labor_pressure",
    active: laborRiseHits >= 4,
    weeksMatched: laborRiseHits,
    windowWeeks: expWindow,
    narrative: laborRiseHits >= 4
      ? `Payroll/labor cost has risen in ${laborRiseHits} of the last ${expWindow} weeks.`
      : `Labor pressure has not formed a sustained upward trend.`,
  });

  // 5. Low pipeline confidence in 2+ recent check-ins
  const last4Checkins = weeks.slice(0, 4).map((w) => w.checkin).filter(Boolean) as WeeklyCheckin[];
  const lowConfHits = last4Checkins.filter((c) => c.pipeline_confidence === "low").length;
  out.push({
    key: "low_pipeline_confidence",
    active: lowConfHits >= 2,
    weeksMatched: lowConfHits,
    windowWeeks: last4Checkins.length,
    narrative: lowConfHits >= 2
      ? `Pipeline confidence has been reported as low in ${lowConfHits} of the last ${last4Checkins.length} check-ins.`
      : `Pipeline confidence has not been persistently low.`,
  });

  return out;
}

/* --------------------------- Watch-next text ---------------------------- */

function composeWatchNext(
  streaks: Streak[],
  persistence: PersistencePattern[],
  blockerStreaks: RepeatedBlockerStreak[],
  horizons: Record<HorizonKey, HorizonStats>,
  yoy: YoYComparison,
): string {
  const active = persistence.filter((p) => p.active);
  if (streaks.length || active.length || blockerStreaks.length) {
    const top =
      streaks[0]?.narrative ||
      active[0]?.narrative ||
      blockerStreaks[0]?.narrative;
    if (top) return `Watch this next: ${top}`;
  }
  if (horizons["13w"].unlocked && horizons["13w"].revenueDirection !== "flat") {
    return `Watch this next: ${horizons["13w"].narrative}`;
  }
  if (yoy.available) return `Watch this next: ${yoy.narrative}`;
  if (horizons["4w"].unlocked) return `Watch this next: ${horizons["4w"].narrative}`;
  return `Watch this next: keep logging weekly check-ins so longer-horizon patterns can form.`;
}

/* --------------------------- Unlock guidance ---------------------------- */

function pickNextUnlock(weeksAvailable: number, yoyReady: boolean): LongHorizonAnalysis["nextUnlock"] {
  if (weeksAvailable < 4)  return { weeksToGo: 4 - weeksAvailable,  horizon: "4w" };
  if (weeksAvailable < 13) return { weeksToGo: 13 - weeksAvailable, horizon: "13w" };
  if (weeksAvailable < 26) return { weeksToGo: 26 - weeksAvailable, horizon: "26w" };
  if (weeksAvailable < 52) return { weeksToGo: 52 - weeksAvailable, horizon: "52w" };
  if (!yoyReady && weeksAvailable < 104) return { weeksToGo: 104 - weeksAvailable, horizon: "yoy" };
  return null;
}

/* ----------------------------- Helpers ---------------------------------- */

function avg(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + (Number(b) || 0), 0) / xs.length;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function signedPct(p: number): string {
  const abs = Math.abs(p).toFixed(0);
  if (Math.abs(p) < 1) return "essentially flat";
  return `${p > 0 ? "up" : "down"} ${abs}%`;
}

function directionAcrossThirds(values: number[]): TrendDirection {
  // values are newest-first; "early" = oldest third, "late" = newest third
  if (values.length < 6) {
    // Fallback: simple newest vs oldest comparison
    if (values.length < 2) return "insufficient";
    const first = values[values.length - 1];
    const last = values[0];
    if (first === 0 && last === 0) return "flat";
    const denom = Math.max(Math.abs(first), 1);
    const change = (last - first) / denom;
    if (Math.abs(change) < 0.05) return "flat";
    return change > 0 ? "rising" : "falling";
  }
  const third = Math.floor(values.length / 3);
  const earlySlice = values.slice(values.length - third); // oldest
  const lateSlice  = values.slice(0, third);              // newest
  const early = avg(earlySlice);
  const late  = avg(lateSlice);
  if (early === 0 && late === 0) return "flat";
  const denom = Math.max(Math.abs(early), 1);
  const change = (late - early) / denom;
  if (Math.abs(change) < 0.05) return "flat";
  return change > 0 ? "rising" : "falling";
}

function joinHuman(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function nz(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  return t ? t : null;
}

/* --------------------------- Snapshot helper ---------------------------- */

/**
 * Compact summary of long-horizon analysis suitable for embedding into a
 * ReportSnapshot.meta block. Additive — does not change ReportSnapshot shape
 * for existing readers.
 */
export interface LongTrendSnapshot {
  weeksAvailable: number;
  unlocked: HorizonKey[];
  yoyAvailable: boolean;
  activeStreaks: { metric: Streak["metric"]; weeks: number }[];
  activePersistence: PersistenceKey[];
  blockerStreaks: { type: RepeatedBlockerStreak["type"]; weeksHit: number; windowWeeks: number }[];
  watchNext: string;
}

export function summarizeLongTrend(a: LongHorizonAnalysis): LongTrendSnapshot {
  const unlocked = (Object.keys(a.horizons) as HorizonKey[]).filter((k) => a.horizons[k].unlocked);
  return {
    weeksAvailable: a.weeksAvailable,
    unlocked,
    yoyAvailable: a.yoy.available,
    activeStreaks: a.streaks.map((s) => ({ metric: s.metric, weeks: s.weeks })),
    activePersistence: a.persistence.filter((p) => p.active).map((p) => p.key),
    blockerStreaks: a.blockerStreaks.map((b) => ({ type: b.type, weeksHit: b.weeksHit, windowWeeks: b.windowWeeks })),
    watchNext: a.watchNext,
  };
}
