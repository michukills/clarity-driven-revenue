/**
 * P93E-E2 — Scorecard rubric v3 (deterministic gears).
 *
 * Lives ALONGSIDE rubric.ts (v2_natural_language_evidence). v2 stays
 * available for reading historical scorecard_runs; v3 is what new
 * public scorecard runs use.
 *
 * Scoring contract:
 *   • 5 RGS gears (canonical pillar ids: demand, conversion, operations,
 *     financial, owner) — each scores 0–200.
 *   • ~6 deterministic radio questions per gear → ~30 total.
 *   • Each option has a fixed `weight` in [0,1]. Gear score =
 *     round( (sum(weight) / questionCount) * 200 ).
 *   • Total = sum of gear scores → 0–1000.
 *   • "Not sure" / "Not at all" never receive full credit.
 *   • Worn-tooth signals = any answered question whose option weight ≤
 *     0.2; surfaced as plain-English risk strings on the results page.
 *
 * Output is shape-compatible with v2's ScorecardResult (same field
 * names, same pillar_id keys) so existing scorecard_runs writes,
 * admin reads, and follow-up dispatch keep working unchanged.
 */

import { CANONICAL_PILLARS, getCanonicalPillar } from "./pillars";

export const RUBRIC_VERSION_V3 = "v3_deterministic_gears" as const;

export type GearId =
  | "demand"
  | "conversion"
  | "operations"
  | "financial"
  | "owner";

export interface V3Option {
  id: string;
  label: string;
  /** 0..1 — share of full credit this answer earns for its question. */
  weight: number;
  /** Optional plain-English worn-tooth signal if this option is chosen. */
  wornTooth?: string;
}

export interface V3Question {
  id: string;
  prompt: string;
  helper?: string;
  options: V3Option[];
}

export interface V3Gear {
  id: GearId;
  title: string;
  intro: string;
  questions: V3Question[];
}

const opt = (
  id: string,
  label: string,
  weight: number,
  wornTooth?: string,
): V3Option => ({ id, label, weight, ...(wornTooth ? { wornTooth } : {}) });

function gear(id: GearId, intro: string, questions: V3Question[]): V3Gear {
  const c = getCanonicalPillar(id);
  if (!c) throw new Error(`Unknown canonical gear id: ${id}`);
  return { id, title: c.title, intro, questions };
}

/* ---------- Standard answer scales (deterministic) ---------- */

/** Yes / Partially / No / Not sure */
const yesPartialNoUnsure = (qid: string, wornNo?: string): V3Option[] => [
  opt(`${qid}_yes`, "Yes", 1.0),
  opt(`${qid}_partial`, "Partially", 0.5),
  opt(`${qid}_no`, "No", 0.1, wornNo),
  opt(`${qid}_unsure`, "Not sure", 0.0, wornNo),
];

/** Cadence: Weekly / Monthly / Occasionally / Not at all */
const cadenceScale = (qid: string, wornLow?: string): V3Option[] => [
  opt(`${qid}_weekly`, "We track this weekly", 1.0),
  opt(`${qid}_monthly`, "We track this monthly", 0.7),
  opt(`${qid}_occasionally`, "We track this occasionally", 0.3, wornLow),
  opt(`${qid}_never`, "We don't track this", 0.0, wornLow),
];

/** Documented and followed / Documented but inconsistent / Informal only / Not present */
const docScale = (qid: string, wornLow?: string): V3Option[] => [
  opt(`${qid}_doc_followed`, "Documented and followed", 1.0),
  opt(`${qid}_doc_incon`, "Documented but inconsistent", 0.6),
  opt(`${qid}_informal`, "Informal only", 0.3, wornLow),
  opt(`${qid}_none`, "Not present", 0.0, wornLow),
];

/** In one place / Across multiple places / In someone's head / Not tracked */
const locationScale = (qid: string, wornLow?: string): V3Option[] => [
  opt(`${qid}_one_place`, "In one place", 1.0),
  opt(`${qid}_multi`, "Across multiple places", 0.55),
  opt(`${qid}_head`, "Mostly in someone's head", 0.2, wornLow),
  opt(`${qid}_untracked`, "Not tracked", 0.0, wornLow),
];

/** <24h / 1–3 days / >3 days / Not consistently */
const responseScale = (qid: string, wornLow?: string): V3Option[] => [
  opt(`${qid}_lt24`, "Less than 24 hours", 1.0),
  opt(`${qid}_1to3`, "1–3 days", 0.6),
  opt(`${qid}_gt3`, "More than 3 days", 0.2, wornLow),
  opt(`${qid}_inconsistent`, "Not consistently followed up", 0.0, wornLow),
];

/** <10% / 10–25% / >25% / Unknown — used for failure-rate style questions */
const failureRateScale = (qid: string, wornHigh?: string): V3Option[] => [
  opt(`${qid}_lt10`, "Less than 10%", 1.0),
  opt(`${qid}_10to25`, "10–25%", 0.5),
  opt(`${qid}_gt25`, "More than 25%", 0.1, wornHigh),
  opt(`${qid}_unknown`, "Unknown", 0.0, wornHigh),
];

/* ---------- Gears ---------- */

export const GEARS_V3: V3Gear[] = [
  gear(
    "demand",
    "How reliably new opportunities reach the business — without leaning on hope, the owner's network, or a single referral source.",
    [
      {
        id: "d_source_tracking",
        prompt: "Do you track where each new lead came from?",
        options: yesPartialNoUnsure(
          "d_source_tracking",
          "Lead sources are not consistently tracked.",
        ),
      },
      {
        id: "d_volume_consistency",
        prompt: "How predictable is your lead volume month to month?",
        options: [
          opt("d_vol_predictable", "Predictable within a known range", 1.0),
          opt("d_vol_mostly", "Mostly predictable with occasional swings", 0.6),
          opt("d_vol_swingy", "Swings significantly", 0.2, "Lead volume swings unpredictably."),
          opt("d_vol_unknown", "Not tracked / unknown", 0.0, "Lead volume is not measured."),
        ],
      },
      {
        id: "d_channel_concentration",
        prompt: "If your top lead source slowed for 30 days, would the business still get enough leads?",
        options: [
          opt("d_chan_yes", "Yes — multiple sources cover demand", 1.0),
          opt("d_chan_partial", "Partially — there'd be a noticeable dip", 0.5),
          opt("d_chan_no", "No — demand would stall", 0.1, "Demand depends on a single channel."),
          opt("d_chan_unsure", "Not sure", 0.0, "Channel dependency has not been tested."),
        ],
      },
      {
        id: "d_inquiry_capture",
        prompt: "Are inbound inquiries captured in one consistent place?",
        options: locationScale(
          "d_capture",
          "Inbound inquiries are not captured in one place.",
        ),
      },
      {
        id: "d_offer_clarity",
        prompt: "Can a stranger read your offer and immediately know what you do, who it's for, and what to do next?",
        options: yesPartialNoUnsure(
          "d_offer",
          "Offer clarity is weak; prospects struggle to self-qualify.",
        ),
      },
      {
        id: "d_referral_dependency",
        prompt: "Roughly what share of new revenue comes from referrals or the owner's network?",
        options: [
          opt("d_ref_lt25", "Less than 25%", 1.0),
          opt("d_ref_25to50", "25–50%", 0.6),
          opt("d_ref_50to75", "50–75%", 0.25, "Most demand depends on referrals or the owner."),
          opt("d_ref_gt75", "More than 75%", 0.1, "Demand is almost entirely referral / owner-driven."),
        ],
      },
    ],
  ),
  gear(
    "conversion",
    "Whether leads turn into customers through a clear, tracked, repeatable sales process — not improvisation.",
    [
      {
        id: "c_response_speed",
        prompt: "How quickly does a new lead typically get a real human response?",
        options: responseScale(
          "c_resp",
          "Lead response time is slow or inconsistent.",
        ),
      },
      {
        id: "c_followup_process",
        prompt: "Do you have a defined follow-up sequence after a lead doesn't respond?",
        options: docScale(
          "c_followup",
          "Follow-up depends on memory, not a defined sequence.",
        ),
      },
      {
        id: "c_quote_tracking",
        prompt: "Are open quotes / proposals tracked in one place with status?",
        options: locationScale(
          "c_quotes",
          "Open quotes are not tracked in one place.",
        ),
      },
      {
        id: "c_close_rate_visibility",
        prompt: "Do you know your current close rate (% of qualified leads that buy)?",
        options: [
          opt("c_close_known", "Yes — I can give a number", 1.0),
          opt("c_close_rough", "Roughly", 0.5),
          opt("c_close_no", "No", 0.1, "Close rate is not measured."),
          opt("c_close_unsure", "Not sure what counts as qualified", 0.0, "Close rate is not measured."),
        ],
      },
      {
        id: "c_lost_deal_tracking",
        prompt: "Are lost deals, no-shows, and cancellations logged with a reason?",
        options: docScale(
          "c_lost",
          "Lost deals are not logged with a reason.",
        ),
      },
      {
        id: "c_pricing_consistency",
        prompt: "Is pricing applied consistently without case-by-case approvals?",
        options: yesPartialNoUnsure(
          "c_price",
          "Pricing requires owner approval case-by-case.",
        ),
      },
      {
        id: "c_handoff",
        prompt: "When a deal closes, is the handoff to delivery clean and documented?",
        options: docScale(
          "c_handoff",
          "Sales-to-delivery handoff is informal or breaks down.",
        ),
      },
    ],
  ),
  gear(
    "operations",
    "Whether delivery runs reliably without rework, bottlenecks, or owner heroics.",
    [
      {
        id: "o_process_doc",
        prompt: "Are your top 3 recurring workflows documented?",
        options: docScale(
          "o_proc",
          "Core workflows live in someone's head, not on paper.",
        ),
      },
      {
        id: "o_rework_rate",
        prompt: "How often does work need to be redone, refunded, or fixed after the fact?",
        options: failureRateScale(
          "o_rework",
          "Rework / callbacks happen frequently.",
        ),
      },
      {
        id: "o_capacity_visibility",
        prompt: "Do you know your current weekly capacity vs. workload?",
        options: yesPartialNoUnsure(
          "o_cap",
          "Capacity vs. workload is not visible.",
        ),
      },
      {
        id: "o_task_ownership",
        prompt: "Does every recurring task have a single named owner?",
        options: yesPartialNoUnsure(
          "o_owner",
          "Recurring tasks lack a clear single owner.",
        ),
      },
      {
        id: "o_handoff_quality",
        prompt: "When work moves between people, does context move with it?",
        options: yesPartialNoUnsure(
          "o_handoff",
          "Hand-offs lose context between people.",
        ),
      },
      {
        id: "o_tool_consistency",
        prompt: "Does the team work from the same tools / system, or does each person have their own setup?",
        options: [
          opt("o_tools_one", "One shared system", 1.0),
          opt("o_tools_partial", "Mostly shared, with some side tools", 0.55),
          opt("o_tools_personal", "Each person has their own setup", 0.2, "Team tooling is fragmented."),
          opt("o_tools_none", "No shared system", 0.0, "There is no shared operating system."),
        ],
      },
      {
        id: "o_firefighting",
        prompt: "How often does the team spend the day firefighting unplanned issues?",
        options: [
          opt("o_fire_rare", "Rarely", 1.0),
          opt("o_fire_some", "A few days a month", 0.6),
          opt("o_fire_weekly", "Most weeks", 0.2, "Firefighting is a weekly pattern."),
          opt("o_fire_daily", "Most days", 0.0, "The team operates in daily firefight mode."),
        ],
      },
    ],
  ),
  gear(
    "financial",
    "Whether the owner can see enough financial reality to make stable decisions — not run on bank balance and instinct.",
    [
      {
        id: "f_pl_visibility",
        prompt: "Do you review a current P&L on a regular cadence?",
        options: cadenceScale(
          "f_pl",
          "P&L is not reviewed on a reliable cadence.",
        ),
      },
      {
        id: "f_cash_position",
        prompt: "Do you know your cash runway (how many weeks/months of operating cash you have)?",
        options: [
          opt("f_cash_known", "Yes — I can name a number", 1.0),
          opt("f_cash_rough", "Roughly", 0.5),
          opt("f_cash_no", "No", 0.1, "Cash runway is unknown."),
          opt("f_cash_unsure", "Not sure how to calculate it", 0.0, "Cash runway is unknown."),
        ],
      },
      {
        id: "f_margin_visibility",
        prompt: "Do you know your margin per service / job / product?",
        options: yesPartialNoUnsure(
          "f_margin",
          "Margin per offer is not known.",
        ),
      },
      {
        id: "f_ar_visibility",
        prompt: "Are unpaid invoices / accounts receivable reviewed regularly?",
        options: cadenceScale(
          "f_ar",
          "Unpaid invoices are not reviewed regularly.",
        ),
      },
      {
        id: "f_expense_review",
        prompt: "Do you review expenses for creep (subscriptions, vendors, recurring spend)?",
        options: cadenceScale(
          "f_exp",
          "Recurring expenses are not reviewed for creep.",
        ),
      },
      {
        id: "f_breakeven",
        prompt: "Do you know your monthly break-even number?",
        options: yesPartialNoUnsure(
          "f_be",
          "Break-even is not known.",
        ),
      },
      {
        id: "f_decision_rhythm",
        prompt: "Are financial numbers reviewed in a recurring decision meeting (vs. only when there's a problem)?",
        options: cadenceScale(
          "f_dec",
          "Financial review only happens when there is a problem.",
        ),
      },
    ],
  ),
  gear(
    "owner",
    "Whether the business can operate without everything depending on the owner.",
    [
      {
        id: "ow_vacation",
        prompt: "Could the owner take 2 consecutive weeks off without the business slowing down?",
        options: yesPartialNoUnsure(
          "ow_vac",
          "The business cannot run without the owner present.",
        ),
      },
      {
        id: "ow_decision_bottleneck",
        prompt: "How many recurring decisions still require the owner?",
        options: [
          opt("ow_dec_few", "Only strategic decisions", 1.0),
          opt("ow_dec_some", "Strategic + a few operational", 0.6),
          opt("ow_dec_many", "Most meaningful decisions", 0.2, "Most decisions still route to the owner."),
          opt("ow_dec_all", "Almost everything", 0.0, "Almost every decision routes to the owner."),
        ],
      },
      {
        id: "ow_knowledge",
        prompt: "Is critical operating knowledge written down somewhere outside the owner's head?",
        options: docScale(
          "ow_know",
          "Operating knowledge is concentrated in the owner.",
        ),
      },
      {
        id: "ow_team_accountability",
        prompt: "Do team members own outcomes (not just tasks) without owner check-in?",
        options: yesPartialNoUnsure(
          "ow_team",
          "Team owns tasks but not outcomes.",
        ),
      },
      {
        id: "ow_escalation",
        prompt: "Are there clear escalation rules so the team knows when to involve the owner?",
        options: docScale(
          "ow_esc",
          "Escalation defaults to 'ask the owner'.",
        ),
      },
      {
        id: "ow_access",
        prompt: "If the owner were unreachable for a week, could the team still access systems, accounts, and tools?",
        options: yesPartialNoUnsure(
          "ow_access",
          "Critical access is concentrated in the owner.",
        ),
      },
      {
        id: "ow_owner_time",
        prompt: "Roughly what share of the owner's week is spent on operational work the team should own?",
        options: [
          opt("ow_time_lt25", "Less than 25%", 1.0),
          opt("ow_time_25to50", "25–50%", 0.55),
          opt("ow_time_50to75", "50–75%", 0.2, "Owner is heavily pulled into operational work."),
          opt("ow_time_gt75", "More than 75%", 0.0, "Owner spends almost all week on operational work."),
        ],
      },
    ],
  ),
];

/* ---------- Sanity guard ---------- */
if (
  GEARS_V3.length !== CANONICAL_PILLARS.length ||
  GEARS_V3.some((g, i) => g.id !== CANONICAL_PILLARS[i].id)
) {
  // eslint-disable-next-line no-console
  console.warn("[scorecard v3] GEARS_V3 order drifted from CANONICAL_PILLARS — investigate.");
}

/* ---------- Types & scoring ---------- */

export type V3Answers = Record<GearId, Record<string, string | null>>;

export function emptyAnswersV3(): V3Answers {
  const out = {} as V3Answers;
  for (const g of GEARS_V3) {
    const inner: Record<string, string | null> = {};
    for (const q of g.questions) inner[q.id] = null;
    out[g.id] = inner;
  }
  return out;
}

export interface V3GearResult {
  pillar_id: GearId;
  title: string;
  /** 0–200 deterministic gear score. */
  score: number;
  /** 0–200 — same as `score` (kept for shape parity with v2 PillarResult). */
  score_low: number;
  score_high: number;
  band: 1 | 2 | 3 | 4 | 5;
  band_label: string;
  confidence: "low" | "medium" | "high";
  rationale: string;
  /** Question IDs the user did not answer in this gear. */
  unanswered_question_ids: string[];
  /** All worn-tooth signal strings flagged in this gear. */
  worn_tooth_signals: string[];
  missing_information: string[];
  /** Selected option weights, one per question (null = unanswered). */
  signals: { question_id: string; option_id: string | null; weight: number }[];
}

export interface V3InterpretationBand {
  min: number;
  label: string;
  description: string;
}

export const V3_BANDS: V3InterpretationBand[] = [
  {
    min: 850,
    label: "Stable / scalable foundation",
    description:
      "The system looks stable enough to scale, but it is still worth checking for hidden dependencies before adding pressure.",
  },
  {
    min: 700,
    label: "Functional with visible weak spots",
    description:
      "The business runs, but specific gears are showing wear. Targeted fixes can prevent these from becoming stability problems.",
  },
  {
    min: 550,
    label: "Inconsistent system",
    description:
      "The business may be carrying pressure as owner stress, revenue swings, or operational drag. Several gears need attention.",
  },
  {
    min: 400,
    label: "Slipping system",
    description:
      "The business is likely running on owner heroics and informal workarounds. The system is not yet built to absorb growth.",
  },
  {
    min: 0,
    label: "High instability",
    description:
      "The business may be operating without enough visibility or repeatable control. This does not mean the business is bad — it means the system is carrying pressure it was not built to carry.",
  },
];

function bandFor(score: number): V3InterpretationBand {
  for (const b of V3_BANDS) if (score >= b.min) return b;
  return V3_BANDS[V3_BANDS.length - 1];
}

function maturityBand(gearScore: number): 1 | 2 | 3 | 4 | 5 {
  if (gearScore >= 170) return 5;
  if (gearScore >= 140) return 4;
  if (gearScore >= 100) return 3;
  if (gearScore >= 60) return 2;
  return 1;
}

const MATURITY_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Chaotic / not in place",
  2: "Inconsistent / reactive",
  3: "Functional but fragile",
  4: "Mostly stable",
  5: "Strong, measured, owner-independent",
};

export interface V3ScorecardResult {
  rubric_version: typeof RUBRIC_VERSION_V3;
  pillar_results: V3GearResult[];
  /** 0–1000 total. */
  overall_score_estimate: number;
  overall_score_low: number;
  overall_score_high: number;
  overall_band: 1 | 2 | 3 | 4 | 5;
  overall_band_label: string;
  overall_confidence: "low" | "medium" | "high";
  rationale: string;
  missing_information: string[];
  recommended_focus: string[];
  top_gaps: { pillar_id: GearId; title: string; reason: string }[];
  /** v3-specific premium fields */
  strongest_gear: { pillar_id: GearId; title: string; score: number };
  most_slipping_gear: { pillar_id: GearId; title: string; score: number };
  worn_tooth_signals: string[];
  interpretation_band: V3InterpretationBand;
}

function findOption(q: V3Question, optionId: string | null): V3Option | null {
  if (!optionId) return null;
  return q.options.find((o) => o.id === optionId) ?? null;
}

function scoreGear(g: V3Gear, answers: Record<string, string | null>): V3GearResult {
  const signals = g.questions.map((q) => {
    const optionId = answers[q.id] ?? null;
    const option = findOption(q, optionId);
    return {
      question_id: q.id,
      option_id: option?.id ?? null,
      weight: option ? option.weight : 0,
      wornTooth: option?.wornTooth ?? null,
    };
  });
  const answered = signals.filter((s) => s.option_id !== null);
  const unanswered = signals.filter((s) => s.option_id === null);
  const total = signals.length;
  // Unanswered questions count as 0 — "not sure" never gets full credit,
  // and skipping the question shouldn't either.
  const sumWeight = signals.reduce((a, s) => a + s.weight, 0);
  const score = Math.round((sumWeight / Math.max(1, total)) * 200);
  const band = maturityBand(score);

  // Confidence: how complete + how decisive the answers are.
  const answeredShare = answered.length / Math.max(1, total);
  const decisive = answered.filter((s) => s.weight === 1.0 || s.weight <= 0.1).length;
  let confidence: "low" | "medium" | "high" = "low";
  if (answeredShare >= 0.85 && decisive >= Math.ceil(total * 0.4)) confidence = "high";
  else if (answeredShare >= 0.6) confidence = "medium";

  const wornSignals = signals
    .map((s) => s.wornTooth)
    .filter((w): w is string => !!w);

  const rationale =
    band >= 4
      ? `${g.title} looks mostly stable based on your answers. A few worn-tooth signals may still be worth checking.`
      : band === 3
      ? `${g.title} is functional but fragile. Specific gears show wear that can compound under pressure.`
      : band === 2
      ? `${g.title} is inconsistent. The system here may be running on memory, owner involvement, or workarounds.`
      : `${g.title} shows high instability. This gear may be carrying pressure it was not built to carry.`;

  const missing_information = unanswered.map(
    (s) => `Unanswered question in ${g.title}: ${g.questions.find((q) => q.id === s.question_id)?.prompt ?? s.question_id}`,
  );

  return {
    pillar_id: g.id,
    title: g.title,
    score,
    score_low: score,
    score_high: score,
    band,
    band_label: MATURITY_LABELS[band],
    confidence,
    rationale,
    unanswered_question_ids: unanswered.map((s) => s.question_id),
    worn_tooth_signals: wornSignals,
    missing_information,
    signals: signals.map(({ question_id, option_id, weight }) => ({
      question_id,
      option_id,
      weight,
    })),
  };
}

export function scoreScorecardV3(answers: V3Answers): V3ScorecardResult {
  const pillar_results = GEARS_V3.map((g) =>
    scoreGear(g, answers[g.id] ?? {}),
  );

  const overall_score_estimate = pillar_results.reduce((a, p) => a + p.score, 0);
  const interpretation_band = bandFor(overall_score_estimate);
  const overall_band = (Math.round(
    pillar_results.reduce((a, p) => a + p.band, 0) / pillar_results.length,
  ) || 1) as 1 | 2 | 3 | 4 | 5;

  const sorted = [...pillar_results].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const slipping = sorted[sorted.length - 1];

  // Worn-tooth signals: dedupe + cap at 5.
  const allWorn = pillar_results.flatMap((p) => p.worn_tooth_signals);
  const worn_tooth_signals = Array.from(new Set(allWorn)).slice(0, 5);

  const top_gaps = [...pillar_results]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((p) => ({
      pillar_id: p.pillar_id,
      title: p.title,
      reason: p.rationale,
    }));

  const recommended_focus = top_gaps.map((g) => {
    switch (g.pillar_id) {
      case "owner":
        return "Map where the business actually depends on the owner and start handing off one operational decision per week.";
      case "financial":
        return "Stand up a weekly cash + margin read so financial decisions stop being made on instinct.";
      case "operations":
        return "Document the top 3 recurring workflows and assign one named owner to each — not the business owner.";
      case "conversion":
        return "Define a written follow-up sequence and track open quotes in one place so warm leads stop slipping.";
      case "demand":
      default:
        return "Track lead source on every inquiry and reduce dependency on a single channel or referral source.";
    }
  });

  const answeredCounts = pillar_results.map(
    (p) => p.signals.filter((s) => s.option_id !== null).length,
  );
  const totalAnswered = answeredCounts.reduce((a, b) => a + b, 0);
  const totalQuestions = pillar_results.reduce((a, p) => a + p.signals.length, 0);
  const answeredShare = totalAnswered / Math.max(1, totalQuestions);

  let overall_confidence: "low" | "medium" | "high" = "low";
  if (
    pillar_results.every((p) => p.confidence !== "low") &&
    answeredShare >= 0.9
  )
    overall_confidence = "high";
  else if (answeredShare >= 0.6) overall_confidence = "medium";

  const rationale = `${interpretation_band.description} Your strongest gear looks like ${strongest.title.toLowerCase()}; the most slipping looks like ${slipping.title.toLowerCase()}. This is a self-reported, first-pass read — not a final diagnosis.`;

  const missing_information = pillar_results.flatMap((p) => p.missing_information);

  return {
    rubric_version: RUBRIC_VERSION_V3,
    pillar_results,
    overall_score_estimate,
    overall_score_low: overall_score_estimate,
    overall_score_high: overall_score_estimate,
    overall_band,
    overall_band_label: MATURITY_LABELS[overall_band],
    overall_confidence,
    rationale,
    missing_information,
    recommended_focus,
    top_gaps,
    strongest_gear: {
      pillar_id: strongest.pillar_id,
      title: strongest.title,
      score: strongest.score,
    },
    most_slipping_gear: {
      pillar_id: slipping.pillar_id,
      title: slipping.title,
      score: slipping.score,
    },
    worn_tooth_signals,
    interpretation_band,
  };
}

/** Flatten v3 answers into the same row shape v2 uses for scorecard_runs.answers. */
export function flattenAnswersV3(answers: V3Answers): {
  pillar_id: GearId;
  question_id: string;
  prompt: string;
  answer: string;
}[] {
  const rows: {
    pillar_id: GearId;
    question_id: string;
    prompt: string;
    answer: string;
  }[] = [];
  for (const g of GEARS_V3) {
    for (const q of g.questions) {
      const optionId = answers[g.id]?.[q.id] ?? null;
      const option = findOption(q, optionId);
      rows.push({
        pillar_id: g.id,
        question_id: q.id,
        prompt: q.prompt,
        answer: option ? `${option.label} [${option.id}]` : "",
      });
    }
  }
  return rows;
}

/** Total v3 question count across all gears. */
export function totalQuestionsV3(): number {
  return GEARS_V3.reduce((a, g) => a + g.questions.length, 0);
}