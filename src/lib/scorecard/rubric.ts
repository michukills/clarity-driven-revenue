/**
 * Conversational Scorecard — deterministic rubric (v1)
 *
 * Scope: P13.Scorecard.AI.1
 * Free-safe: this module performs NO network calls. Public scorecard
 * submissions use these functions to generate a preliminary estimate
 * with no AI cost. Admin-triggered AI scoring is a separate, future
 * pathway behind authentication.
 *
 * P13.Scorecard.Unification.H.1 — pillar identity now sourced from the
 * canonical `src/lib/scorecard/pillars.ts` module so the public scorecard
 * and the OS / admin scorecard share one pillar model.
 */

import { CANONICAL_PILLARS, getCanonicalPillar } from "./pillars";
import {
  EVIDENCE_INTAKE_VERSION,
  PUBLIC_SCORECARD_TRUST_COPY,
  clarificationPromptsFor,
} from "@/lib/evidenceIntake/prompts";

export const RUBRIC_VERSION = "v2_natural_language_evidence" as const;

/**
 * P13.EvidenceIntake.H.1 — re-export hardened trust copy + clarification
 * helper so every public-scorecard surface uses one source of truth for
 * "Preliminary / Self-reported / Not a final diagnosis" framing.
 */
export const SCORECARD_TRUST_COPY = PUBLIC_SCORECARD_TRUST_COPY;
export const SCORECARD_INTAKE_VERSION = EVIDENCE_INTAKE_VERSION;

/** Returns clarification prompts to surface when an answer is vague. */
export function clarifyForAnswer(answer: string | null | undefined): string[] {
  return clarificationPromptsFor(answer);
}

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
  options?: RubricOption[];
}

export interface RubricOption {
  id: string;
  label: string;
  description: string;
  maturity: number;
  evidence: "low" | "medium" | "high";
}

export interface RubricPillar {
  id: PillarId;
  title: string;
  intro: string;
  questions: RubricQuestion[];
}

/** Helper: build a RubricPillar by pulling canonical title + description. */
function pillar(
  id: PillarId,
  questions: RubricQuestion[],
): RubricPillar {
  const c = getCanonicalPillar(id);
  if (!c) {
    throw new Error(`Unknown canonical pillar id: ${id}`);
  }
  return { id, title: c.title, intro: c.description, questions };
}

const opt = (
  id: string,
  label: string,
  description: string,
  maturity: number,
  evidence: RubricOption["evidence"] = "medium",
): RubricOption => ({ id, label, description, maturity, evidence });

export const PILLARS: RubricPillar[] = [
  pillar("demand", [
      {
        id: "demand_flow",
        prompt:
          "In your own words, how do new leads or opportunities come in today? Include sources, rough volume, cadence, and how predictable it feels.",
        placeholder:
          "e.g. About 60% from referrals, the rest is word-of-mouth. We average 18-25 inquiries/month but it swings by season.",
        options: [
          opt("demand_unknown", "Not sure", "We do not know the lead sources or how predictable they are.", 1.1, "low"),
          opt("demand_untracked", "Mostly untracked", "Leads come in, but source and volume are not tracked reliably.", 1.4),
          opt("demand_referral_irregular", "Referral-driven and irregular", "Most demand comes from referrals, word-of-mouth, or repeat work; volume swings.", 2.2),
          opt("demand_some_repeatable", "Some repeatable channels", "A few channels produce work, but targets, ownership, or review cadence are incomplete.", 3.1),
          opt("demand_tracked_monthly", "Tracked channels", "Lead sources, ownership, and targets are reviewed at least monthly.", 4.0),
          opt("demand_managed_weekly", "Managed weekly", "Demand is measured by source, quality, volume, and capacity with weekly review.", 4.8, "high"),
        ],
      },
      {
        id: "demand_tracking",
        prompt:
          "What do you actually track about lead sources, and how often is it reviewed? Name the system, report, or person who owns it if one exists.",
        placeholder:
          "e.g. We tag source in HubSpot and review it monthly, or we do not track sources formally and mostly guess.",
        options: [
          opt("tracking_unknown", "Not sure", "We could not quickly prove where leads come from.", 1.1, "low"),
          opt("tracking_none", "No formal tracking", "Lead sources are remembered or guessed, not recorded consistently.", 1.3),
          opt("tracking_rough", "Rough notes only", "Some sources are noted, but review is irregular or incomplete.", 2.2),
          opt("tracking_partial_system", "Partial CRM/sheet", "Lead source is captured in a CRM or sheet, but reporting is not consistently used.", 3.1),
          opt("tracking_monthly", "Monthly review", "Source, volume, and quality are reviewed at least monthly.", 4.0),
          opt("tracking_weekly_roi", "Weekly source ROI", "Source, conversion, cost, capacity, and next actions are reviewed weekly.", 4.8, "high"),
        ],
      },
  ]),
  pillar("conversion", [
      {
        id: "conv_process",
        prompt:
          "Walk through what happens after a lead reaches you. Who owns each step, what tool tracks it, and where does it usually stall?",
        placeholder:
          "e.g. Calls go to the office manager, quotes go out within 48 hours, then follow-up depends on memory.",
        options: [
          opt("conversion_unknown", "Not sure", "We cannot quickly describe or prove the lead-to-sale path.", 1.1, "low"),
          opt("conversion_owner_manual", "Owner/manual response", "The owner or one person responds from memory; steps are not documented.", 1.5),
          opt("conversion_basic_inconsistent", "Basic but inconsistent", "Leads are quoted or followed up, but cadence and ownership vary.", 2.3),
          opt("conversion_stages_partial", "Stages exist", "A CRM, board, or stages exist, but usage or follow-up is inconsistent.", 3.2),
          opt("conversion_owned_cadence", "Owned cadence", "Stages, owner, quote process, and follow-up cadence are defined and reviewed.", 4.1),
          opt("conversion_measured_optimized", "Measured and optimized", "Speed, close rate, loss reason, and follow-up performance are measured and improved.", 4.8, "high"),
        ],
      },
      {
        id: "conv_followup",
        prompt:
          "What happens when a lead does not respond? Describe the follow-up rhythm, reminders, number of touches, and who owns it.",
        placeholder:
          "e.g. We follow up twice through Jobber reminders, or honestly it depends on whether I remember.",
        options: [
          opt("followup_unknown", "Not sure", "We do not know what reliably happens to non-responsive leads.", 1.1, "low"),
          opt("followup_memory", "Depends on memory", "Follow-up happens only if someone remembers.", 1.4),
          opt("followup_one_off", "One-off follow-up", "There may be one follow-up, but no documented rhythm.", 2.2),
          opt("followup_partial_cadence", "Partial cadence", "A follow-up cadence exists but is not always followed or reviewed.", 3.1),
          opt("followup_documented", "Documented cadence", "Follow-up steps, timing, owner, and stop conditions are defined.", 4.1),
          opt("followup_measured", "Measured cadence", "Follow-up completion, conversion impact, and lost reasons are tracked and reviewed.", 4.8, "high"),
        ],
      },
  ]),
  pillar("operations", [
      {
        id: "ops_process",
        prompt:
          "How is delivery run today? Describe the workflow, checklist, SOP, job system, or handoff process the team actually uses.",
        placeholder:
          "e.g. Most steps are in people's heads. We have job checklists in Housecall Pro but they are outdated.",
        options: [
          opt("ops_unknown", "Not sure", "We cannot quickly show how delivery is supposed to run.", 1.1, "low"),
          opt("ops_in_heads", "Mostly in people's heads", "The team works from memory, habit, or owner direction.", 1.4),
          opt("ops_some_checklists", "Some checklists", "A few checklists or templates exist, but they are incomplete or outdated.", 2.3),
          opt("ops_workflow_partial", "Working workflow", "A workflow exists and is usually followed, but gaps remain under pressure.", 3.2),
          opt("ops_sops_owned", "Owned SOPs", "Core SOPs, owners, and handoffs are documented and reviewed.", 4.1),
          opt("ops_controlled_improving", "Controlled improvement", "Delivery quality, rework, handoffs, and improvements are tracked and acted on.", 4.8, "high"),
        ],
      },
      {
        id: "ops_breakage",
        prompt:
          "When delivery breaks, what usually happens? Who notices, who fixes it, whether repeats are tracked, and how often the same issue returns?",
        placeholder:
          "e.g. I usually notice and step in. The same scheduling issue returns every month and is not logged.",
        options: [
          opt("breakage_unknown", "Not sure", "We do not consistently know where delivery breaks or why.", 1.1, "low"),
          opt("breakage_firefight", "Firefighting", "Problems are fixed urgently when someone notices; repeats are common.", 1.4),
          opt("breakage_owner_steps_in", "Owner steps in", "The owner or key person usually notices and fixes the issue.", 2.1),
          opt("breakage_logged_partial", "Logged sometimes", "Issues are sometimes logged, but root-cause fixes are inconsistent.", 3.1),
          opt("breakage_reviewed", "Reviewed and owned", "Issues have an owner, review cadence, and repeat-problem follow-up.", 4.1),
          opt("breakage_prevented", "Prevented with controls", "Controls, QA, and trend review prevent repeated delivery breakdowns.", 4.8, "high"),
        ],
      },
  ]),
  pillar("financial", [
      {
        id: "fin_visibility",
        prompt:
          "How do you currently know whether the business is making money week over week or month over month? Name the report/system and what numbers you trust.",
        placeholder:
          "e.g. I check bank balance daily and get a monthly P&L from QuickBooks, but job margin is not reviewed weekly.",
        options: [
          opt("finance_unknown", "Not sure", "We cannot quickly prove whether the business is making money.", 1.1, "low"),
          opt("finance_bank_balance", "Bank balance / gut feel", "Decisions rely mainly on bank balance, instinct, or delayed cleanup.", 1.3),
          opt("finance_monthly_late", "Monthly but late", "A P&L or bookkeeping view exists, but it arrives too late for control.", 2.2),
          opt("finance_basic_monthly", "Basic monthly view", "Revenue, expenses, and cash are reviewed monthly, but margin/forecasting is limited.", 3.1),
          opt("finance_weekly_dashboard", "Weekly dashboard", "Revenue, margin, cash, and receivables are reviewed weekly.", 4.1),
          opt("finance_forecast_control", "Forecast and control", "Cash, margin, pipeline, and forecast signals drive decisions before problems hit.", 4.8, "high"),
        ],
      },
      {
        id: "fin_review",
        prompt:
          "What financial data do you review on a regular cadence? Include who reviews it, how often, and what decisions it drives.",
        placeholder:
          "e.g. Every Monday I review cash, AR, booked revenue, and labor cost with the ops lead.",
        options: [
          opt("review_unknown", "Not sure", "We do not have a clear review cadence or trusted source.", 1.1, "low"),
          opt("review_none", "No cadence", "Financial review happens only when there is urgency or a question.", 1.3),
          opt("review_occasional", "Occasional review", "Numbers are reviewed sometimes, but not on a reliable rhythm.", 2.2),
          opt("review_monthly_bookkeeper", "Monthly review", "Financials are reviewed monthly with bookkeeping/accounting data.", 3.1),
          opt("review_weekly_kpis", "Weekly KPI review", "Key financial signals are reviewed weekly with named owners.", 4.1),
          opt("review_alerts_decisions", "Decision rhythm", "Financial review produces alerts, decisions, and follow-up actions before issues compound.", 4.8, "high"),
        ],
      },
  ]),
  pillar("owner", [
      {
        id: "owner_dep",
        prompt:
          "If the owner stepped away for two weeks, what would actually break or stall? Be specific about sales, delivery, money, and decisions.",
        placeholder:
          "e.g. New sales would stall. Scheduling would continue. Pricing and hiring decisions would wait on me.",
        options: [
          opt("owner_unknown", "Not sure", "We have not tested or clearly mapped owner dependence.", 1.1, "low"),
          opt("owner_everything_stalls", "Most things stall", "Sales, delivery, money, or decisions would quickly wait on the owner.", 1.3),
          opt("owner_key_decisions_stall", "Key decisions stall", "The team can do basics, but important decisions wait on the owner.", 2.2),
          opt("owner_some_delegation", "Some delegation", "Routine work continues, but escalation and accountability still depend on the owner.", 3.1),
          opt("owner_can_step_away", "Owner can step away", "Owners, decision rights, and escalation paths are documented enough for short absences.", 4.1),
          opt("owner_leadership_system", "Leadership system", "The business has backup owners, cadence, dashboards, and authority to operate without owner bottlenecks.", 4.8, "high"),
        ],
      },
      {
        id: "owner_decisions",
        prompt:
          "Which decisions only the owner can make today, and which decisions are already delegated with clear authority?",
        placeholder:
          "e.g. Pricing, hiring, and client escalations are mine. Scheduling and routine job decisions are delegated.",
        options: [
          opt("decisions_unknown", "Not sure", "Decision rights are not clearly mapped.", 1.1, "low"),
          opt("decisions_owner_all", "Owner decides almost everything", "Pricing, hiring, delivery, escalation, or client calls rely on the owner.", 1.3),
          opt("decisions_basic_delegated", "Basics delegated", "Some routine decisions are delegated, but high-impact calls still route to the owner.", 2.2),
          opt("decisions_roles_partial", "Role-based decisions", "Some roles have decision authority, but boundaries or escalation rules are incomplete.", 3.1),
          opt("decisions_authority_clear", "Authority is clear", "Decision rights, escalation rules, and review cadence are documented.", 4.1),
          opt("decisions_operating_leaders", "Operating leaders own it", "Leaders make decisions using agreed rules, KPIs, and review cadence without owner bottlenecks.", 4.8, "high"),
        ],
      },
  ]),
];

const STRUCTURED_CHOICE_RE = /^\[rgs_scorecard_choice:([a-z0-9_:-]+)\]\n?/i;
const CHOICE_LINE_RE = /^Closest reality:.*\n?/i;
const CONTEXT_LINE_RE = /^Context:\s*/i;

export function parseScorecardAnswer(
  question: RubricQuestion,
  answer: string | null | undefined,
): { optionId: string | null; option: RubricOption | null; detail: string } {
  const raw = answer ?? "";
  const match = raw.match(STRUCTURED_CHOICE_RE);
  const optionId = match?.[1] ?? null;
  const option = optionId
    ? question.options?.find((o) => o.id === optionId) ?? null
    : null;
  const detail = raw
    .replace(STRUCTURED_CHOICE_RE, "")
    .replace(CHOICE_LINE_RE, "")
    .replace(CONTEXT_LINE_RE, "")
    .trim();
  return { optionId, option, detail };
}

export function buildScorecardAnswer(
  question: RubricQuestion,
  optionId: string | null,
  detail: string,
): string {
  const clean = detail.trim();
  if (!optionId) return clean;
  const option = question.options?.find((o) => o.id === optionId);
  if (!option) return clean;
  return [
    `[rgs_scorecard_choice:${option.id}]`,
    `Closest reality: ${option.label} - ${option.description}`,
    clean ? `Context: ${clean}` : "Context:",
  ].join("\n");
}

// Sanity guard at module load: PILLARS order must mirror CANONICAL_PILLARS.
if (
  PILLARS.length !== CANONICAL_PILLARS.length ||
  PILLARS.some((p, i) => p.id !== CANONICAL_PILLARS[i].id)
) {
  // Soft warning — don't throw in prod render path; rubric still works.
  // eslint-disable-next-line no-console
  console.warn(
    "[scorecard] PILLARS order drifted from CANONICAL_PILLARS — investigate.",
  );
}

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
  const parsed = parseScorecardAnswer(question, answer);
  const structuredText = parsed.option
    ? `${parsed.option.label}. ${parsed.option.description}. ${parsed.detail}`
    : answer;
  const text = lower(structuredText);
  const wc = wordCount(parsed.option ? parsed.detail : answer);
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

  let raw = parsed.option ? parsed.option.maturity : 2.5;

  if (parsed.option) {
    if (parsed.option.id.includes("unknown")) {
      evidence = "low";
    } else if (wc >= 20 && specificityBonus >= 2 && contra <= 1) {
      evidence = "high";
    } else if (wc >= 12 || specificityBonus >= 1) {
      evidence = parsed.option.evidence === "low" ? "medium" : parsed.option.evidence;
    } else {
      // A selected concrete reality is useful, but without supporting detail
      // we keep confidence below high.
      evidence = parsed.option.evidence === "low" ? "low" : "medium";
    }

    // If a high-maturity choice is contradicted by the written context, do
    // not let the choice alone inflate the score.
    if (parsed.option.maturity >= 4 && (contra >= 2 || neg >= pos + 2)) {
      raw = Math.min(raw, 2.8);
      if (evidence === "high") evidence = "medium";
    }
  } else if (wc === 0) {
    raw = 0;
  } else if (wc < 5) {
    raw = 1.0;
  } else {
    // When negative signals or contradictions outweigh positives, treat
    // many positive mentions as likely negated context (e.g. "no dashboard",
    // "no KPIs", "I don't have a real review cadence") and suppress their
    // contribution. Keeps the score honest even when answers are long.
    let effectivePos = pos;
    if (neg >= pos && (contra >= 2 || neg >= pos + 2)) {
      effectivePos = Math.max(0, pos - neg);
    }
    raw = 2.5 + Math.min(effectivePos, 4) * 0.55 - Math.min(neg, 4) * 0.65;
    if (wc >= 60 && effectivePos >= 2 && neg <= 1) raw += 0.4;
    if (neg >= 3 && effectivePos <= 1) raw -= 0.5;
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

  // Overall confidence:
  //  - high   → most pillars high AND no pillar low/missing AND total
  //             contradictions across the whole submission is small
  //  - low    → many pillars are low OR many answers are missing/very thin
  //  - medium → everything else (mixed evidence, one weak pillar, etc.)
  const highCount = pillar_results.filter((p) => p.confidence === "high").length;
  const mediumCount = pillar_results.filter((p) => p.confidence === "medium").length;
  const lowCount = pillar_results.filter((p) => p.confidence === "low").length;
  const totalContra = pillar_results.reduce(
    (a, p) => a + p.signals.reduce((b, s) => b + s.contradictory_hits, 0),
    0,
  );
  const totalAnswered = pillar_results.reduce(
    (a, p) => a + p.signals.filter((s) => s.word_count > 0).length,
    0,
  );
  const totalQuestions = pillar_results.reduce(
    (a, p) => a + p.signals.length,
    0,
  );
  const missingShare = 1 - totalAnswered / Math.max(1, totalQuestions);

  let overall_confidence: "low" | "medium" | "high";
  if (
    highCount >= Math.ceil(pillar_results.length * 0.6) &&
    lowCount === 0 &&
    totalContra <= 2 &&
    missingShare === 0
  ) {
    overall_confidence = "high";
  } else if (
    lowCount >= Math.ceil(pillar_results.length / 2) ||
    missingShare >= 0.4
  ) {
    overall_confidence = "low";
  } else {
    overall_confidence = "medium";
  }
  // Touch unused vars to keep readers oriented; no behavior change.
  void mediumCount;

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
