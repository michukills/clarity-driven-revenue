/**
 * Conversational Scorecard — deterministic rubric (v1)
 *
 * Scope: P13.Scorecard.AI.1
 * Free-safe: this module performs NO network calls. Public scorecard
 * submissions use these functions to generate a preliminary estimate
 * with no AI cost. Admin-triggered AI scoring is a separate, future
 * pathway behind authentication.
 */

export const RUBRIC_VERSION = "v1" as const;

export type PillarId =
  | "demand"
  | "conversion"
  | "operations"
  | "financial"
  | "owner";

export interface RubricQuestion {
  id: string;
  prompt: string;
  helper?: string;
  placeholder?: string;
}

export interface RubricPillar {
  id: PillarId;
  title: string;
  intro: string;
  questions: RubricQuestion[];
}

export const PILLARS: RubricPillar[] = [
  {
    id: "demand",
    title: "Demand Generation",
    intro:
      "How leads, attention, and inbound opportunities show up — and whether you can predict them.",
    questions: [
      {
        id: "demand_flow",
        prompt:
          "Tell me how new leads or opportunities currently come in. What sources, what cadence, and how predictable is it?",
        placeholder:
          "e.g. About 60% from referrals, the rest is word-of-mouth. Volume varies a lot week to week.",
      },
      {
        id: "demand_tracking",
        prompt:
          "What do you actually track about lead sources, and how often is it reviewed?",
        placeholder:
          "e.g. We don't track sources formally. We just know roughly where work comes from.",
      },
    ],
  },
  {
    id: "conversion",
    title: "Revenue Conversion",
    intro:
      "How a lead becomes paid revenue — your sales process, follow-up discipline, and close behavior.",
    questions: [
      {
        id: "conv_process",
        prompt:
          "Walk me through what happens after a lead reaches you. Who owns it, what steps run, and where does it usually stall?",
        placeholder:
          "e.g. I respond personally, send a quote, then follow up once or twice. Some go cold and we don't always notice.",
      },
      {
        id: "conv_followup",
        prompt:
          "What happens to a lead that doesn't respond? Is there a documented follow-up rhythm, or does it depend on memory?",
        placeholder:
          "e.g. Honestly it depends on whether I remember. No system reminds us.",
      },
    ],
  },
  {
    id: "operations",
    title: "Operational Efficiency",
    intro:
      "How the work actually gets delivered — process, ownership, and what happens when something breaks.",
    questions: [
      {
        id: "ops_process",
        prompt:
          "How is delivery run today? Are there documented processes, or does the team work from memory and habit?",
        placeholder:
          "e.g. Most steps are in people's heads. We have a few checklists but they're outdated.",
      },
      {
        id: "ops_breakage",
        prompt:
          "When something breaks in delivery, what usually happens? Who notices, who fixes it, and how often does the same problem return?",
        placeholder:
          "e.g. I usually notice and step in. The same issues come up every couple months.",
      },
    ],
  },
  {
    id: "financial",
    title: "Financial Visibility",
    intro:
      "How clearly you see revenue, margin, cash, and what's actually working — without guessing.",
    questions: [
      {
        id: "fin_visibility",
        prompt:
          "How do you currently know whether the business is making money week over week or month over month?",
        placeholder:
          "e.g. I look at the bank balance and feel it out. I get a P&L from my bookkeeper after the month closes.",
      },
      {
        id: "fin_review",
        prompt:
          "What do you review on a regular cadence — and what data do you trust when making decisions?",
        placeholder:
          "e.g. I don't have a real review rhythm. I make calls based on instinct and what's in the bank.",
      },
    ],
  },
  {
    id: "owner",
    title: "Owner Independence",
    intro:
      "How much of the business depends on you personally being available — for decisions, delivery, and fires.",
    questions: [
      {
        id: "owner_dep",
        prompt:
          "If you stepped out of the business for two weeks, what would actually break or stall?",
        placeholder:
          "e.g. New sales would stall. A few delivery decisions would wait on me. Cash would still come in.",
      },
      {
        id: "owner_decisions",
        prompt:
          "Which decisions only you can make today, and which ones have you successfully delegated?",
        placeholder:
          "e.g. Pricing, hiring, anything client-facing — me. Scheduling and basic operations — the team.",
      },
    ],
  },
];

export interface MaturityBand {
  band: 1 | 2 | 3 | 4 | 5;
  label: string;
  description: string;
}

export const MATURITY_BANDS: MaturityBand[] = [
  {
    band: 1,
    label: "Chaotic / not in place",
    description:
      "No structure here yet. Outcomes depend on effort, urgency, or the owner stepping in directly.",
  },
  {
    band: 2,
    label: "Inconsistent / reactive",
    description:
      "Some pieces exist but aren't reliable. Behavior changes when things get busy.",
  },
  {
    band: 3,
    label: "Functional but fragile",
    description:
      "Works most of the time, but depends on key people remembering steps. Breaks under pressure.",
  },
  {
    band: 4,
    label: "Mostly stable",
    description:
      "Documented and reviewed. Behavior holds together even when the owner steps back.",
  },
  {
    band: 5,
    label: "Strong, measured, owner-independent",
    description:
      "Owned, measured, and predictable. The system runs without the owner being the bottleneck.",
  },
];

const NEGATIVE_SIGNALS = [
  "no system", "no process", "no tracking", "no review", "no cadence",
  "manual", "by hand", "in my head", "in our heads", "from memory",
  "depends on me", "i do it", "only i ", "only me", "i'm the bottleneck",
  "ad hoc", "ad-hoc", "guess", "guessing", "instinct", "gut",
  "varies", "swings", "unpredictable", "inconsistent",
  "reactive", "fire", "fires", "firefight", "firefighting",
  "broken", "breaks", "stalls", "stall", "drops off", "dropping",
  "slip", "slips", "slipped", "forget", "forgot", "lost track",
  "outdated", "out of date", "missing", "don't track", "do not track",
  "don't measure", "do not measure", "don't review", "no owner",
  "no one owns", "nobody owns",
  "not sure", "not really sure", "no idea", "don't know", "do not know",
  "depends", "depends on", "depending",
];

const POSITIVE_SIGNALS = [
  "documented", "documentation", "sop", "sops", "playbook",
  "process", "checklist", "template", "templated",
  "weekly", "monthly", "quarterly", "cadence", "rhythm",
  "review", "reviewed", "we review", "i review",
  "tracked", "tracking", "measured", "metric", "metrics",
  "dashboard", "report", "reporting",
  "owns it", "delegated", "team handles", "team owns",
  "automated", "automation", "system",
  "predictable", "consistent", "stable", "reliable",
  "kanban", "crm", "pipeline",
  "owner assigned", "assigned owner", "owner is", "owned by",
  "kpi", "kpis", "scorecard", "score card",
  "quickbooks", "xero", "freshbooks", "wave", "netsuite",
  "hubspot", "salesforce", "pipedrive", "zoho",
  "gusto", "adp", "rippling", "paychex", "payroll system",
  "accounting system", "bookkeeper", "bookkeeping",
  "asana", "monday", "clickup", "notion", "trello",
  "every week", "every monday", "every month", "every quarter",
  "step 1", "step one", "first we", "then we", "finally we",
];

// Evidence terms specifically called out in the spec for confidence calibration.
// Hits here boost evidence beyond raw word count alone.
const EVIDENCE_TERMS = [
  "documented", "documentation", "reviewed", "review",
  "weekly", "monthly", "quarterly", "cadence", "rhythm",
  "owner assigned", "assigned owner", "owned by", "owner is",
  "delegated", "team owns", "team handles",
  "dashboard", "report", "reporting",
  "crm", "accounting", "payroll", "quickbooks", "xero", "hubspot",
  "salesforce", "pipedrive", "gusto", "adp", "rippling",
  "kpi", "kpis", "metric", "metrics", "scorecard",
  "step 1", "step one", "first we", "then we",
];

// Contradictory phrases: even with high detail, these should hold confidence
// at medium rather than high (e.g. detailed but owner-dependent or manual).
const CONTRADICTORY_TERMS = [
  "not sure", "depends on me", "manual", "no tracking",
  "guess", "guessing", "varies", "in my head", "in our heads",
  "from memory", "i'm the bottleneck", "only me", "only i ",
  "depends on", "no system", "no process", "ad hoc", "ad-hoc",
];

// Detect specific numbers (e.g. "60%", "$5,000", "12 leads") or
// concrete timeframes (e.g. "every Monday", "Q3", "last 6 months").
const NUMERIC_RE = /(\$?\d[\d,\.]*\s?(%|k|m|hours?|days?|weeks?|months?|years?|leads?|deals?|customers?|clients?)?|q[1-4]\b)/i;
const TIMEFRAME_RE = /\b(every (mon|tue|wed|thu|fri|sat|sun)\w*|every (week|month|quarter|year)|last \d+ (days?|weeks?|months?|years?)|past \d+ (days?|weeks?|months?|years?))\b/i;

function lower(s: string | null | undefined): string {
  return (s ?? "").toLowerCase();
}

function countMatches(text: string, terms: string[]): number {
  let n = 0;
  for (const t of terms) {
    if (text.includes(t)) n += 1;
  }
  return n;
}

function wordCount(text: string): number {
  const t = (text ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export interface AnswerSignal {
  question_id: string;
  prompt: string;
  answer: string;
  word_count: number;
  positive_hits: number;
  negative_hits: number;
  evidence_hits: number;
  contradictory_hits: number;
  has_numeric: boolean;
  has_timeframe: boolean;
  raw_maturity: number;
  evidence: "low" | "medium" | "high";
}

export function scoreAnswer(question: RubricQuestion, answer: string): AnswerSignal {
  const text = lower(answer);
  const wc = wordCount(answer);
  const pos = countMatches(text, POSITIVE_SIGNALS);
  const neg = countMatches(text, NEGATIVE_SIGNALS);
  const ev = countMatches(text, EVIDENCE_TERMS);
  const contra = countMatches(text, CONTRADICTORY_TERMS);
  const hasNum = NUMERIC_RE.test(text);
  const hasTime = TIMEFRAME_RE.test(text);

  // Evidence tier reflects how much usable signal is in the answer —
  // length matters, but evidence terms, specifics, and timeframes count too.
  // Strong contradictions (e.g. "depends on me", "no tracking") cap evidence.
  let evidence: AnswerSignal["evidence"] = "low";
  const specificityBonus = (hasNum ? 1 : 0) + (hasTime ? 1 : 0) + Math.min(ev, 3);
  if (wc >= 35 && specificityBonus >= 2 && contra <= 1) {
    evidence = "high";
  } else if (wc >= 60 && specificityBonus >= 1) {
    evidence = "high";
  } else if (wc >= 18 || (wc >= 12 && specificityBonus >= 1)) {
    evidence = "medium";
  }
  // Heavy contradictions strip a tier off evidence.
  if (contra >= 2 && evidence === "high") evidence = "medium";

  let raw = 2.5;

  if (wc === 0) {
    raw = 0;
  } else if (wc < 5) {
    raw = 1.0;
  } else {
    raw = 2.5 + Math.min(pos, 4) * 0.55 - Math.min(neg, 4) * 0.65;
    if (wc >= 60 && pos >= 2 && neg <= 1) raw += 0.4;
    if (neg >= 3 && pos <= 1) raw -= 0.3;
  }

  raw = Math.max(0, Math.min(5, raw));

  return {
    question_id: question.id,
    prompt: question.prompt,
    answer,
    word_count: wc,
    positive_hits: pos,
    negative_hits: neg,
    evidence_hits: ev,
    contradictory_hits: contra,
    has_numeric: hasNum,
    has_timeframe: hasTime,
    raw_maturity: Math.round(raw * 10) / 10,
    evidence,
  };
}

export interface PillarResult {
  pillar_id: PillarId;
  title: string;
  band: 1 | 2 | 3 | 4 | 5;
  band_label: string;
  score: number;
  score_low: number;
  score_high: number;
  confidence: "low" | "medium" | "high";
  rationale: string;
  missing_information: string[];
  signals: AnswerSignal[];
}

function bandFromMaturity(m: number): 1 | 2 | 3 | 4 | 5 {
  if (m < 0.8) return 1;
  if (m < 1.8) return 2;
  if (m < 2.8) return 3;
  if (m < 3.8) return 4;
  return 5;
}

function bandLabel(b: 1 | 2 | 3 | 4 | 5): string {
  return MATURITY_BANDS[b - 1].label;
}

function clampScore(n: number, lo = 0, hi = 200): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export function scorePillar(
  pillar: RubricPillar,
  answers: Record<string, string>,
): PillarResult {
  const signals = pillar.questions.map((q) =>
    scoreAnswer(q, answers[q.id] ?? ""),
  );

  const avgMaturity =
    signals.reduce((a, s) => a + s.raw_maturity, 0) /
    Math.max(1, signals.length);

  const band = bandFromMaturity(avgMaturity);
  const center = (avgMaturity / 5) * 200;

  // Pillar evidence tier:
  //  - high  → all answers are high evidence AND no heavy contradictions
  //  - medium → at least one answer high OR all at least medium, OR mixed
  //             with one low but the other clearly high (don't let one
  //             thin answer drag the whole pillar to low)
  //  - low   → all answers are low evidence
  const totalContra = signals.reduce((a, s) => a + s.contradictory_hits, 0);
  const allHigh = signals.every((s) => s.evidence === "high");
  const anyHigh = signals.some((s) => s.evidence === "high");
  const allAtLeastMedium = signals.every((s) => s.evidence !== "low");
  const allLow = signals.every((s) => s.evidence === "low");
  let evidenceTier: "low" | "medium" | "high";
  if (allHigh && totalContra <= 1) {
    evidenceTier = "high";
  } else if (allLow) {
    evidenceTier = "low";
  } else if (anyHigh || allAtLeastMedium) {
    evidenceTier = "medium";
  } else {
    // exactly one medium + rest low → still medium, not low
    evidenceTier = "medium";
  }
  const halfWidth =
    evidenceTier === "high" ? 12 : evidenceTier === "medium" ? 22 : 35;

  const score = clampScore(center);
  const score_low = clampScore(center - halfWidth);
  const score_high = clampScore(center + halfWidth);

  const missing_information: string[] = [];
  signals.forEach((s, i) => {
    if (s.evidence === "low") {
      missing_information.push(
        `More detail on: "${pillar.questions[i].prompt}"`,
      );
    }
  });

  const rationale = buildPillarRationale(pillar, signals, band);

  return {
    pillar_id: pillar.id,
    title: pillar.title,
    band,
    band_label: bandLabel(band),
    score,
    score_low,
    score_high,
    confidence: evidenceTier,
    rationale,
    missing_information,
    signals,
  };
}

function buildPillarRationale(
  _pillar: RubricPillar,
  signals: AnswerSignal[],
  band: 1 | 2 | 3 | 4 | 5,
): string {
  const totalPos = signals.reduce((a, s) => a + s.positive_hits, 0);
  const totalNeg = signals.reduce((a, s) => a + s.negative_hits, 0);
  const totalWords = signals.reduce((a, s) => a + s.word_count, 0);

  const headline = MATURITY_BANDS[band - 1].description;
  const parts: string[] = [headline];

  if (totalWords < 10) {
    parts.push("Answers were short, so this estimate is held wide on purpose.");
  } else if (totalNeg > totalPos && totalNeg >= 2) {
    parts.push(
      "Language pointed at manual, owner-dependent, or reactive behavior.",
    );
  } else if (totalPos > totalNeg && totalPos >= 2) {
    parts.push(
      "Answers referenced documentation, review cadence, or delegated ownership.",
    );
  } else {
    parts.push(
      "Mixed signals — some structure exists, but reliability isn't fully proven by the answers.",
    );
  }

  return parts.join(" ");
}

export interface ScorecardResult {
  rubric_version: typeof RUBRIC_VERSION;
  pillar_results: PillarResult[];
  overall_score_estimate: number;
  overall_score_low: number;
  overall_score_high: number;
  overall_band: 1 | 2 | 3 | 4 | 5;
  overall_band_label: string;
  overall_confidence: "low" | "medium" | "high";
  rationale: string;
  missing_information: string[];
  recommended_focus: string[];
  top_gaps: { pillar_id: PillarId; title: string; reason: string }[];
}

export function scoreScorecard(
  pillarAnswers: Record<PillarId, Record<string, string>>,
): ScorecardResult {
  const pillar_results = PILLARS.map((p) =>
    scorePillar(p, pillarAnswers[p.id] ?? {}),
  );

  const overall_score_estimate = clampScore(
    pillar_results.reduce((a, p) => a + p.score, 0),
    0,
    1000,
  );
  const overall_score_low = clampScore(
    pillar_results.reduce((a, p) => a + p.score_low, 0),
    0,
    1000,
  );
  const overall_score_high = clampScore(
    pillar_results.reduce((a, p) => a + p.score_high, 0),
    0,
    1000,
  );

  const avgBand =
    pillar_results.reduce((a, p) => a + p.band, 0) / pillar_results.length;
  const overall_band = (Math.round(avgBand) || 1) as 1 | 2 | 3 | 4 | 5;
  const overall_band_label = bandLabel(overall_band);

  const anyLow = pillar_results.some((p) => p.confidence === "low");
  const allHigh = pillar_results.every((p) => p.confidence === "high");
  const overall_confidence: "low" | "medium" | "high" = anyLow
    ? "low"
    : allHigh
    ? "high"
    : "medium";

  const ranked = [...pillar_results].sort((a, b) => a.score - b.score);
  const top_gaps = ranked.slice(0, 3).map((p) => ({
    pillar_id: p.pillar_id,
    title: p.title,
    reason: p.rationale,
  }));

  const recommended_focus = ranked.slice(0, 3).map((p) => {
    if (p.pillar_id === "owner") {
      return "Validate where the business actually depends on the owner — and what would have to change before that load can be removed.";
    }
    if (p.pillar_id === "financial") {
      return "Get to a real weekly read on revenue, margin, and cash so decisions stop being made on instinct.";
    }
    if (p.pillar_id === "operations") {
      return "Document the workflows that keep breaking, and put one owner on each — not the business owner.";
    }
    if (p.pillar_id === "conversion") {
      return "Define a real follow-up cadence and stop relying on memory to chase warm leads.";
    }
    return "Tighten the way demand is generated and tracked so volume stops swinging week to week.";
  });

  const missing_information = pillar_results.flatMap(
    (p) => p.missing_information,
  );

  const rationale = buildOverallRationale(
    pillar_results,
    overall_band,
    overall_confidence,
  );

  return {
    rubric_version: RUBRIC_VERSION,
    pillar_results,
    overall_score_estimate,
    overall_score_low,
    overall_score_high,
    overall_band,
    overall_band_label,
    overall_confidence,
    rationale,
    missing_information,
    recommended_focus,
    top_gaps,
  };
}

function buildOverallRationale(
  pillars: PillarResult[],
  band: 1 | 2 | 3 | 4 | 5,
  confidence: "low" | "medium" | "high",
): string {
  const headline = MATURITY_BANDS[band - 1].description;
  const weakest = [...pillars].sort((a, b) => a.score - b.score)[0];
  const strongest = [...pillars].sort((a, b) => b.score - a.score)[0];
  const conf =
    confidence === "high"
      ? "Confidence is relatively high because answers were detailed."
      : confidence === "medium"
      ? "Confidence is moderate — a few areas need more detail to tighten the estimate."
      : "Confidence is low — several answers were short, so the score range is held wide.";
  return `${headline} The weakest area looks like ${weakest.title.toLowerCase()}; the strongest looks like ${strongest.title.toLowerCase()}. ${conf} This is a preliminary estimate, not a final diagnosis.`;
}

export function emptyAnswers(): Record<PillarId, Record<string, string>> {
  const out = {} as Record<PillarId, Record<string, string>>;
  for (const p of PILLARS) {
    const inner: Record<string, string> = {};
    for (const q of p.questions) inner[q.id] = "";
    out[p.id] = inner;
  }
  return out;
}

export function flattenAnswers(
  pillarAnswers: Record<PillarId, Record<string, string>>,
): { pillar_id: PillarId; question_id: string; prompt: string; answer: string }[] {
  const rows: {
    pillar_id: PillarId;
    question_id: string;
    prompt: string;
    answer: string;
  }[] = [];
  for (const p of PILLARS) {
    for (const q of p.questions) {
      rows.push({
        pillar_id: p.id,
        question_id: q.id,
        prompt: q.prompt,
        answer: (pillarAnswers[p.id]?.[q.id] ?? "").trim(),
      });
    }
  }
  return rows;
}
