// Shared engine for the Revenue Leak Engine (admin + client views).

export const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const fmtPct = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

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
};

export type LeakData = typeof defaultLeakData;

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
