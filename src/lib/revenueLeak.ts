// Shared engine for Revenue Leak Detection (admin + client views).
import type { DiagnosticCategory, EvidenceMap, FactorRubric } from "@/lib/diagnostics/engine";

export const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const fmtPct = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM LEAK CATEGORIES — full revenue chain (not just marketing)
// ─────────────────────────────────────────────────────────────────────────────

export type SystemCategoryKey =
  | "market"
  | "lead_capture"
  | "sales_conversion"
  | "pricing_margin"
  | "operations_delivery"
  | "retention"
  | "financial_visibility"
  | "owner_dependency";

/** 0 = no leak, 5 = severe leak (admin estimates per sub-factor) */
export type Severity = 0 | 1 | 2 | 3 | 4 | 5;

export interface SystemCategoryDef {
  key: SystemCategoryKey;
  label: string;
  short: string;
  factors: { key: string; label: string; lookFor?: string; rubric?: FactorRubric }[];
  /** Share of total revenue typically at risk if this category is fully leaking (0..1). */
  weight: number;
  /** Suggested next RGS step when this category is the worst. */
  nextStep: "Diagnostic" | "Implementation" | "Add-ons / Monitoring";
  rootCause: string;
  ifIgnored: string;
  fixFirst: string;
}

/** Generic 0–5 rubric reused by most revenue-system factors. */
const leakRubric = (subject: string): FactorRubric => ({
  0: `${subject} is healthy and not causing leakage.`,
  1: `Minor friction in ${subject.toLowerCase()}; rarely costs revenue.`,
  2: `Inconsistent ${subject.toLowerCase()}; outcomes vary case-to-case.`,
  3: `Recurring leak in ${subject.toLowerCase()}; costing revenue each month.`,
  4: `${subject} is significantly broken and constraining revenue.`,
  5: `${subject} is severely broken — major revenue loss.`,
});

export const SYSTEM_CATEGORIES: SystemCategoryDef[] = [
  {
    key: "market",
    label: "Market / Demand",
    short: "Positioning, audience fit, offer clarity, trust, lead source quality",
    factors: [
      { key: "positioning_clarity", label: "Positioning clarity" },
      { key: "audience_fit", label: "Audience fit" },
      { key: "offer_clarity", label: "Offer clarity" },
      { key: "trust_signals", label: "Trust signals" },
      { key: "lead_source_quality", label: "Lead source quality" },
    ],
    weight: 0.18,
    nextStep: "Diagnostic",
    rootCause: "The business has not been positioned with enough clarity for the right buyer to self-identify.",
    ifIgnored: "Lead cost climbs, conversion stays flat, and the team blames sales for a market problem.",
    fixFirst: "Tighten positioning and offer language before spending another dollar on demand.",
  },
  {
    key: "lead_capture",
    label: "Lead Capture",
    short: "Missed inquiries, response speed, intake, follow-up, lead tracking",
    factors: [
      { key: "missed_inquiries", label: "Missed inquiries" },
      { key: "response_speed", label: "Response speed" },
      { key: "intake_process", label: "Intake process" },
      { key: "follow_up_process", label: "Follow-up process" },
      { key: "lead_tracking", label: "Lead tracking" },
    ],
    weight: 0.16,
    nextStep: "Implementation",
    rootCause: "Inbound demand is real, but the system catching it is leaking at the door.",
    ifIgnored: "You keep paying for leads you never actually work.",
    fixFirst: "Install a single owned intake + same-day response standard.",
  },
  {
    key: "sales_conversion",
    label: "Sales / Conversion",
    short: "Close rate, proposals, quote follow-up, objections, value communication",
    factors: [
      { key: "close_rate", label: "Close rate" },
      { key: "proposal_process", label: "Proposal process" },
      { key: "quote_follow_up", label: "Quote follow-up" },
      { key: "objection_handling", label: "Objection handling" },
      { key: "value_communication", label: "Value communication" },
    ],
    weight: 0.16,
    nextStep: "Implementation",
    rootCause: "The sales conversation is not consistently surfacing decision criteria or anchoring value.",
    ifIgnored: "Win-rate drift, longer cycles, more discounting to force closes.",
    fixFirst: "Standardize the close conversation: discovery → frame → offer → objection.",
  },
  {
    key: "pricing_margin",
    label: "Pricing / Margin",
    short: "Underpricing, discounting, low-margin services, package structure",
    factors: [
      { key: "underpricing", label: "Underpricing" },
      { key: "discounting", label: "Discounting" },
      { key: "low_margin_services", label: "Low-margin services" },
      { key: "package_structure", label: "Package structure" },
      { key: "complexity_charged", label: "Complexity not being charged for" },
    ],
    weight: 0.14,
    nextStep: "Diagnostic",
    rootCause: "Pricing was set by feel and never re-anchored to the actual value or cost-to-serve.",
    ifIgnored: "Revenue grows but profit doesn't — the business gets busier and poorer.",
    fixFirst: "Re-price the next 3 deals using a documented value frame, not a gut number.",
  },
  {
    key: "operations_delivery",
    label: "Operations / Delivery",
    short: "Rework, missed deadlines, scheduling, handoffs, capacity",
    factors: [
      { key: "rework", label: "Rework" },
      { key: "missed_deadlines", label: "Missed deadlines" },
      { key: "scheduling", label: "Scheduling efficiency" },
      { key: "handoffs", label: "Handoff breakdowns" },
      { key: "capacity_bottlenecks", label: "Capacity bottlenecks" },
    ],
    weight: 0.12,
    nextStep: "Implementation",
    rootCause: "Delivery runs on memory and heroics instead of a documented hand-off path.",
    ifIgnored: "Margin erodes invisibly and referrals slow because the experience is uneven.",
    fixFirst: "Document one critical hand-off and make it the system of record.",
  },
  {
    key: "retention",
    label: "Customer Retention",
    short: "Repeat purchase, check-in cadence, post-sale, referrals, lifecycle",
    factors: [
      { key: "repeat_system", label: "Repeat purchase system" },
      { key: "check_in_cadence", label: "Maintenance / check-in cadence" },
      { key: "post_sale_comms", label: "Post-sale communication" },
      { key: "referral_process", label: "Referral process" },
      { key: "lifecycle_visibility", label: "Customer lifecycle visibility" },
    ],
    weight: 0.10,
    nextStep: "Add-ons / Monitoring",
    rootCause: "There is no deliberate system to re-engage customers you already earned.",
    ifIgnored: "Every dollar has to be re-earned from cold demand. No compounding.",
    fixFirst: "Launch a quarterly re-engagement touch to past clients.",
  },
  {
    key: "financial_visibility",
    label: "Financial Visibility",
    short: "Revenue by offer, profit per job, cash flow, forecast, attribution",
    factors: [
      { key: "revenue_by_offer", label: "Revenue by service / offer" },
      { key: "profit_per_job", label: "Profit per job / client" },
      { key: "cash_flow", label: "Cash flow visibility" },
      { key: "pipeline_forecast", label: "Pipeline forecast" },
      { key: "attribution", label: "Revenue attribution" },
    ],
    weight: 0.08,
    nextStep: "Add-ons / Monitoring",
    rootCause: "The owner cannot see, in numbers, where revenue actually comes from or where it goes.",
    ifIgnored: "Decisions get made on vibes; the wrong offers get scaled.",
    fixFirst: "Stand up a weekly revenue + profit-by-offer view the owner can read in 60 seconds.",
  },
  {
    key: "owner_dependency",
    label: "Owner Dependency",
    short: "Owner-required sales, decisions, delegation, documented process",
    factors: [
      { key: "owner_sales", label: "Owner required for sales" },
      { key: "owner_delivery", label: "Owner required for delivery decisions" },
      { key: "delegation", label: "Lack of delegation" },
      { key: "documented_process", label: "Lack of documented processes" },
      { key: "founder_capacity", label: "Founder capacity bottleneck" },
    ],
    weight: 0.06,
    nextStep: "Implementation",
    rootCause: "Critical revenue moves only happen when the owner is in the room.",
    ifIgnored: "Growth caps at the owner's calendar and burnout becomes the actual ceiling.",
    fixFirst: "Pick one owner-only task this week and document the hand-off path.",
  },
];

/** Default severity map: every factor starts at 0 (no leak) and admin raises it. */
function defaultSystemSeverities(): Record<string, Severity> {
  const out: Record<string, Severity> = {};
  for (const cat of SYSTEM_CATEGORIES) {
    for (const f of cat.factors) out[`${cat.key}.${f.key}`] = 0;
  }
  return out;
}

// Backfill rubric/lookFor on every system factor so the shared FactorScorer
// always has tooltip + scoring guide content, without rewriting the registry.
for (const cat of SYSTEM_CATEGORIES) {
  for (const f of cat.factors) {
    if (!f.lookFor) f.lookFor = `Look for documented evidence of how ${f.label.toLowerCase()} actually operates today — examples, artifacts, owner, cadence.`;
    if (!f.rubric) f.rubric = leakRubric(f.label);
  }
}

/**
 * Adapter exposing the 8 revenue-system categories in the shared
 * DiagnosticCategory shape so DiagnosticAdminPanel / DiagnosticReport /
 * DiagnosticClientView can render them directly.
 */
export const REVENUE_SYSTEM_CATEGORIES: DiagnosticCategory[] = SYSTEM_CATEGORIES.map((c) => ({
  key: c.key,
  label: c.label,
  short: c.short,
  weight: c.weight,
  nextStep: c.nextStep,
  rootCause: c.rootCause,
  ifIgnored: c.ifIgnored,
  fixFirst: c.fixFirst,
  factors: c.factors.map((f) => ({
    key: f.key,
    label: f.label,
    lookFor: f.lookFor,
    rubric: f.rubric,
  })),
}));

export const defaultLeakData = {
  monthly_leads: 100,
  response_rate: 70,
  response_speed_minutes: 240,
  show_rate: 60,
  close_rate: 25,
  avg_ticket: 5000,
  repeat_rate: 15,
  follow_up_attempts: 2,
  missed_follow_ups: 35,

  target_response_rate: 95,
  target_response_speed: 5,
  target_show_rate: 80,
  target_close_rate: 35,
  target_repeat_rate: 30,
  target_follow_ups: 6,
  target_missed_follow_ups: 10,

  notes: "",         // internal only
  client_notes: "",  // client visible

  // ─── System-wide assessment (8 categories × 5 factors). 0 = no leak, 5 = severe.
  // Stored as a flat dict keyed by `${categoryKey}.${factorKey}` for forward-compat.
  system_severities: defaultSystemSeverities() as Record<string, Severity>,
  /** Optional per-factor evidence map (notes, confidence, internal). */
  system_evidence: {} as EvidenceMap,
  /** Optional monthly revenue baseline used to estimate $ leakage from severity. */
  system_baseline_monthly: 50000,
};

export type LeakData = typeof defaultLeakData;

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM LEAK COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemCategoryResult {
  key: SystemCategoryKey;
  label: string;
  /** Average severity 0..5 across factors. */
  severity: number;
  /** 0..100 leak score for this category. */
  score: number;
  /** Estimated monthly $ leakage from this category. */
  monthly: number;
  annual: number;
  /** Severity bucket for UI. */
  band: "healthy" | "watch" | "leaking" | "critical";
  nextStep: SystemCategoryDef["nextStep"];
  rootCause: string;
  ifIgnored: string;
  fixFirst: string;
  short: string;
}

export interface SystemLeakResult {
  /** 0..100, higher = healthier system, lower = more leakage. */
  score: number;
  band: "healthy" | "watch" | "leaking" | "critical";
  monthly: number;
  annual: number;
  categories: SystemCategoryResult[];
  topThree: SystemCategoryResult[];
  worst: SystemCategoryResult | null;
  nextStep: SystemCategoryDef["nextStep"];
}

function bandFor(severity: number): SystemCategoryResult["band"] {
  if (severity < 1) return "healthy";
  if (severity < 2.5) return "watch";
  if (severity < 4) return "leaking";
  return "critical";
}

export function computeSystemLeak(d: LeakData): SystemLeakResult {
  const severities = d.system_severities ?? {};
  const baseline = Math.max(0, Number(d.system_baseline_monthly) || 0);

  const categories: SystemCategoryResult[] = SYSTEM_CATEGORIES.map((cat) => {
    const vals = cat.factors.map((f) => Number(severities[`${cat.key}.${f.key}`] ?? 0));
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const norm = avg / 5; // 0..1
    const monthly = Math.round(baseline * cat.weight * norm);
    return {
      key: cat.key,
      label: cat.label,
      severity: avg,
      score: Math.round(norm * 100),
      monthly,
      annual: monthly * 12,
      band: bandFor(avg),
      nextStep: cat.nextStep,
      rootCause: cat.rootCause,
      ifIgnored: cat.ifIgnored,
      fixFirst: cat.fixFirst,
      short: cat.short,
    };
  });

  const monthly = categories.reduce((s, c) => s + c.monthly, 0);
  const totalWeighted = categories.reduce((s, c) => s + c.severity * SYSTEM_CATEGORIES.find((x) => x.key === c.key)!.weight, 0);
  const totalWeight = SYSTEM_CATEGORIES.reduce((s, c) => s + c.weight, 0);
  const avgSeverity = totalWeight > 0 ? totalWeighted / totalWeight : 0;
  // Score: 100 = no leak, 0 = full leak.
  const score = Math.round(100 - (avgSeverity / 5) * 100);
  const sorted = [...categories].sort((a, b) => b.severity - a.severity);
  const worst = sorted[0]?.severity > 0 ? sorted[0] : null;

  return {
    score,
    band: bandFor(avgSeverity),
    monthly,
    annual: monthly * 12,
    categories,
    topThree: sorted.slice(0, 3).filter((c) => c.severity > 0),
    worst,
    nextStep: worst?.nextStep ?? "Diagnostic",
  };
}

export interface LeakItem {
  key: string;
  label: string;
  category: "lead" | "conversion" | "retention";
  monthly: number;
  annual: number;
  why: string;
  rootCause: string;
  nextAction: string;
  leverage: string;
}

export interface LeakComputation {
  currentRev: number;
  bestRev: number;
  improvedMonthly: number;
  improvedAnnual: number;
  totalMonthly: number;
  totalAnnual: number;
  breakdown: LeakItem[];
  biggest: LeakItem;
  byCategory: { lead: number; conversion: number; retention: number };
  currentSales: number;
  bestSales: number;
}

const MICRO: Record<string, { rootCause: string; nextAction: string; leverage: string }> = {
  response: {
    rootCause: "Leads coming in faster than the team replies — no clear ownership of inbound.",
    nextAction: "Assign one owner for first response and a same-day reply standard.",
    leverage: "Every other funnel stage compounds off first contact. Fix this and close-rate math improves automatically.",
  },
  speed: {
    rootCause: "First reply is happening hours after the lead is hottest.",
    nextAction: "Move first response under 5 minutes during business hours.",
    leverage: "Speed alone can multiply conversion without spending a dollar more on leads.",
  },
  show: {
    rootCause: "Booked calls are not being reinforced before they happen.",
    nextAction: "Add a confirmation sequence + value reminder 24h and 1h before the call.",
    leverage: "Recovers revenue already paid for in lead spend.",
  },
  close: {
    rootCause: "Sales conversation is not consistently surfacing the real decision criteria.",
    nextAction: "Standardize the close conversation: discovery → frame → offer → objection.",
    leverage: "Higher close rate raises every downstream metric (LTV, repeat, referral).",
  },
  followup: {
    rootCause: "Leads drop out of the pipeline before reaching a decision point.",
    nextAction: "Build a 6-touch follow-up sequence with clear cadence.",
    leverage: "Pipeline density rises without adding traffic.",
  },
  repeat: {
    rootCause: "No deliberate system for re-engaging existing customers.",
    nextAction: "Launch a quarterly re-engagement offer to past clients.",
    leverage: "Repeat revenue is the cheapest revenue you will ever earn.",
  },
};

export function computeLeaks(d: LeakData): LeakComputation {
  const leads = Math.max(0, d.monthly_leads);
  const r = d.response_rate / 100;
  const s = d.show_rate / 100;
  const c = d.close_rate / 100;
  const ticket = Math.max(0, d.avg_ticket);

  const tR = d.target_response_rate / 100;
  const tS = d.target_show_rate / 100;
  const tC = d.target_close_rate / 100;

  const currentSales = leads * r * s * c;
  const currentRev = currentSales * ticket;

  const bestSales = leads * tR * tS * tC;
  const bestRev = bestSales * ticket;

  const responseLeak = Math.max(0, leads * tR * s * c * ticket - currentRev);
  const showLeak = Math.max(0, leads * r * tS * c * ticket - currentRev);
  const closeLeak = Math.max(0, leads * r * s * tC * ticket - currentRev);

  const speedPenalty = Math.min(0.6, Math.max(0, (d.response_speed_minutes - d.target_response_speed) / 30) * 0.05);
  const speedLeak = speedPenalty > 0 ? currentRev / (1 - speedPenalty) - currentRev : 0;

  const missedDelta = Math.max(0, (d.missed_follow_ups - d.target_missed_follow_ups) / 100);
  const missedLeads = leads * missedDelta;
  const followUpLeak = missedLeads * s * c * ticket;

  const customersPerMonth = currentSales;
  const repeatDelta = Math.max(0, (d.target_repeat_rate - d.repeat_rate) / 100);
  const repeatLeakAnnual = customersPerMonth * 12 * repeatDelta * ticket;
  const repeatLeak = repeatLeakAnnual / 12;

  const raw: Array<Omit<LeakItem, "annual">> = [
    { key: "response", label: "Lead response", category: "lead", monthly: responseLeak, why: "Leads not contacted at all.", ...MICRO.response },
    { key: "speed", label: "Response speed", category: "lead", monthly: speedLeak, why: "Slow first contact tanks conversion.", ...MICRO.speed },
    { key: "followup", label: "Missed follow-ups", category: "lead", monthly: followUpLeak, why: "Leads dropped before reaching close stage.", ...MICRO.followup },
    { key: "show", label: "Show rate", category: "conversion", monthly: showLeak, why: "Booked calls that don't show up.", ...MICRO.show },
    { key: "close", label: "Close rate", category: "conversion", monthly: closeLeak, why: "Calls that show but don't close.", ...MICRO.close },
    { key: "repeat", label: "Repeat / retention", category: "retention", monthly: repeatLeak, why: "Existing customers never bought again.", ...MICRO.repeat },
  ];

  const breakdown: LeakItem[] = raw.map((l) => ({
    ...l,
    monthly: Math.round(l.monthly),
    annual: Math.round(l.monthly * 12),
  }));

  const totalMonthly = breakdown.reduce((sum, l) => sum + l.monthly, 0);
  const totalAnnual = totalMonthly * 12;
  const biggest = [...breakdown].sort((a, b) => b.monthly - a.monthly)[0];

  const improvedMonthly = currentRev + totalMonthly * 0.5;
  const improvedAnnual = improvedMonthly * 12;

  const byCategory = breakdown.reduce(
    (acc, l) => {
      acc[l.category] += l.monthly;
      return acc;
    },
    { lead: 0, conversion: 0, retention: 0 },
  );

  return {
    currentRev,
    bestRev,
    improvedMonthly,
    improvedAnnual,
    totalMonthly,
    totalAnnual,
    breakdown,
    biggest,
    byCategory,
    currentSales,
    bestSales,
  };
}

export function generateLeakInsights(d: LeakData, c: LeakComputation) {
  const risks: string[] = [];
  const opportunities: string[] = [];

  if (c.biggest.monthly > 0) {
    risks.push(
      `Biggest single leak is ${c.biggest.label.toLowerCase()} — ${fmtMoney(c.biggest.monthly)}/mo (${fmtMoney(c.biggest.annual)}/yr). ${c.biggest.why}`,
    );
  }
  if (d.response_speed_minutes > d.target_response_speed * 6) {
    risks.push(
      `Response time of ${d.response_speed_minutes} min is ${Math.round(d.response_speed_minutes / d.target_response_speed)}× slower than target — conversion is silently dropping.`,
    );
  }
  if (d.missed_follow_ups > 25) {
    risks.push(`${d.missed_follow_ups}% of leads never get worked properly — pure dead-weight in the pipeline.`);
  }
  if (d.repeat_rate < 15) {
    risks.push(`Repeat rate of ${d.repeat_rate}% means almost every dollar has to be re-earned. No compounding.`);
  }
  if (d.close_rate > d.target_close_rate * 0.9) {
    opportunities.push(`Close rate (${d.close_rate}%) is already near benchmark — the bottleneck is upstream, not in the sales conversation.`);
  }
  if (c.improvedMonthly > c.currentRev * 1.4) {
    opportunities.push(`Closing just 50% of these leaks would add ${fmtMoney(c.improvedMonthly - c.currentRev)}/mo (${fmtMoney((c.improvedMonthly - c.currentRev) * 12)}/yr) without a single new lead.`);
  } else if (c.totalMonthly > 0) {
    opportunities.push(`Recovering half of the identified leaks would add ${fmtMoney(c.improvedMonthly - c.currentRev)}/mo — system fixes outperform new lead spend here.`);
  }

  return { risks, opportunities };
}
