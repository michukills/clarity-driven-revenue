/**
 * P96 - Operational Friction Scan (public Toy App) deterministic engine.
 *
 * NOT a quiz. NOT a personality test. NOT a free Scorecard surrogate.
 *
 * The scan asks a small number of operationally-loaded questions and
 * maps the answer signals to:
 *   - per-gear pressure (5 RGS gears)
 *   - the likely upstream bottleneck (root cause, not symptom)
 *   - 1-3 "worn teeth" - specific operational friction points
 *   - 2-3 downstream consequences if untouched
 *
 * The mapping is pattern-based on real operational dynamics. No AI call
 * is required - the output feels intelligent because it is
 * causality-aware, not because it is generated. Confidence runs through
 * the Global AI Confidence Kernel for governance parity with the rest
 * of RGS.
 *
 * The scan is explicitly NOT a substitute for the deterministic 0-1000
 * Stability Scorecard. It is the curiosity entry; the Diagnostic-Grade
 * Assessment lives on /scorecard.
 */
import {
  classifyConfidence,
  decideNextBestAction,
  type ConfidenceDecision,
  type NextBestAction,
} from "@/lib/aiConfidence";

export const SCAN_ENGINE_VERSION = "p96-operational-scan-v1";

export type GearId =
  | "demand"
  | "conversion"
  | "operations"
  | "financial"
  | "owner";

export const GEARS: Array<{ id: GearId; title: string; short: string }> = [
  { id: "demand", title: "Demand Generation", short: "Demand" },
  { id: "conversion", title: "Revenue Conversion", short: "Conversion" },
  { id: "operations", title: "Operational Efficiency", short: "Operations" },
  { id: "financial", title: "Financial Visibility", short: "Visibility" },
  { id: "owner", title: "Owner Independence", short: "Owner" },
];

export type SignalCode =
  | "owner_dependency"
  | "conversion_leak"
  | "no_followup_system"
  | "systemized_followup"
  | "demand_owner_bottleneck"
  | "conversion_owner_bottleneck"
  | "ops_owner_bottleneck"
  | "decision_bottleneck"
  | "financial_visibility_good"
  | "financial_visibility_lag"
  | "financial_visibility_weak"
  | "financial_visibility_missing"
  | "handoff_friction"
  | "sales_to_ops_friction"
  | "capacity_drag"
  | "quoting_friction"
  | "owner_decision_load"
  | "conversion_owner_load"
  | "ops_fragility"
  | "cash_visibility_drag"
  | "systemic_drag"
  | "partial_systems"
  | "systems_holding"
  | "conversion_capacity"
  | "ops_capacity"
  | "cash_capacity"
  | "owner_capacity";

export interface ScanAnswerOption {
  id: string;
  label: string;
  signals: SignalCode[];
}

export interface ScanQuestion {
  id: string;
  prompt: string;
  helper?: string;
  options: ScanAnswerOption[];
}

export const SCAN_QUESTIONS: ScanQuestion[] = [
  {
    id: "q_followup",
    prompt: "A quote goes out and sits for five days with no reply. What usually happens next?",
    options: [
      { id: "a", label: "The owner eventually remembers and chases it.", signals: ["owner_dependency", "conversion_leak"] },
      { id: "b", label: "Nothing - it quietly falls through.", signals: ["conversion_leak", "no_followup_system"] },
      { id: "c", label: "Someone on the team picks it up on a set cadence.", signals: ["systemized_followup"] },
      { id: "d", label: "Honestly, I am not sure what happens to those.", signals: ["no_followup_system", "owner_dependency"] },
    ],
  },
  {
    id: "q_owner_out",
    prompt: "If you stepped away for two weeks tomorrow, what would break first?",
    options: [
      { id: "a", label: "New business - sales would stall.", signals: ["demand_owner_bottleneck", "owner_dependency"] },
      { id: "b", label: "Quoting and follow-up.", signals: ["conversion_owner_bottleneck", "owner_dependency"] },
      { id: "c", label: "Scheduling, dispatch, or the floor.", signals: ["ops_owner_bottleneck", "owner_dependency"] },
      { id: "d", label: "Pricing calls and approvals.", signals: ["decision_bottleneck", "owner_dependency"] },
    ],
  },
  {
    id: "q_revenue_visibility",
    prompt: "How do you actually know what your revenue was last week?",
    options: [
      { id: "a", label: "I check a report or dashboard I trust.", signals: ["financial_visibility_good"] },
      { id: "b", label: "My bookkeeper tells me at month-end.", signals: ["financial_visibility_lag"] },
      { id: "c", label: "I roughly know from memory or the bank balance.", signals: ["financial_visibility_weak"] },
      { id: "d", label: "Honestly, I am not sure week to week.", signals: ["financial_visibility_missing"] },
    ],
  },
  {
    id: "q_job_sideways",
    prompt: "When a job or order goes sideways, what is usually the real reason?",
    options: [
      { id: "a", label: "A handoff missed something between people.", signals: ["handoff_friction"] },
      { id: "b", label: "Customer expectations were not fully set up front.", signals: ["sales_to_ops_friction", "quoting_friction"] },
      { id: "c", label: "We were rushed or short-staffed.", signals: ["capacity_drag", "ops_fragility"] },
      { id: "d", label: "Pricing or scope was not clear before we started.", signals: ["quoting_friction", "sales_to_ops_friction"] },
    ],
  },
  {
    id: "q_day_derail",
    prompt: "Where does your day usually get pulled off-track?",
    options: [
      { id: "a", label: "Decisions only I can make.", signals: ["owner_decision_load", "decision_bottleneck"] },
      { id: "b", label: "Quoting or answering customers.", signals: ["conversion_owner_load"] },
      { id: "c", label: "Fires in the field, floor, or kitchen.", signals: ["ops_fragility"] },
      { id: "d", label: "Chasing money, AR, or paperwork.", signals: ["cash_visibility_drag"] },
    ],
  },
  {
    id: "q_repeat",
    prompt: "The same problems keep coming back - true?",
    helper: "If the same issue keeps returning, it may be a system issue, not a people issue.",
    options: [
      { id: "a", label: "Yes, often.", signals: ["systemic_drag"] },
      { id: "b", label: "Sometimes - depends on the area.", signals: ["partial_systems"] },
      { id: "c", label: "Rarely - most things stay fixed.", signals: ["systems_holding"] },
    ],
  },
  {
    id: "q_double_demand",
    prompt: "If demand doubled next month, what breaks first?",
    options: [
      { id: "a", label: "We could not quote and follow up fast enough.", signals: ["conversion_capacity"] },
      { id: "b", label: "Scheduling and fulfillment.", signals: ["ops_capacity"] },
      { id: "c", label: "Cash flow and receivables timing.", signals: ["cash_capacity"] },
      { id: "d", label: "My attention - I would be the ceiling.", signals: ["owner_capacity", "owner_dependency"] },
    ],
  },
];

export type GearPressure = "solid" | "strained" | "slipping";

export interface GearRead {
  id: GearId;
  title: string;
  pressure: GearPressure;
  load: number;
  note: string;
}

export interface WornTooth {
  id: string;
  finding: string;
  gear: GearId;
}

export interface BottleneckRead {
  headline: string;
  why: string;
  upstreamGear: GearId;
}

export interface ScanResult {
  engineVersion: string;
  gears: GearRead[];
  bottleneck: BottleneckRead;
  wornTeeth: WornTooth[];
  downstreamIfUntouched: string[];
  confidence: ConfidenceDecision;
  nextBestAction: NextBestAction;
  goDeeper: { label: string; href: string; rationale: string };
}

const SIGNAL_GEAR_LOAD: Record<SignalCode, Partial<Record<GearId, number>>> = {
  owner_dependency: { owner: 1 },
  conversion_leak: { conversion: 1 },
  no_followup_system: { conversion: 1, operations: 0.5 },
  systemized_followup: { conversion: -1 },
  demand_owner_bottleneck: { demand: 1, owner: 1 },
  conversion_owner_bottleneck: { conversion: 1, owner: 1 },
  ops_owner_bottleneck: { operations: 1, owner: 1 },
  decision_bottleneck: { owner: 1, operations: 0.5 },
  financial_visibility_good: { financial: -1 },
  financial_visibility_lag: { financial: 0.5 },
  financial_visibility_weak: { financial: 1 },
  financial_visibility_missing: { financial: 1.5 },
  handoff_friction: { operations: 1 },
  sales_to_ops_friction: { conversion: 0.5, operations: 0.5 },
  capacity_drag: { operations: 1 },
  quoting_friction: { conversion: 1 },
  owner_decision_load: { owner: 1 },
  conversion_owner_load: { conversion: 0.5, owner: 0.5 },
  ops_fragility: { operations: 1 },
  cash_visibility_drag: { financial: 1 },
  systemic_drag: { operations: 0.5, owner: 0.5, conversion: 0.5 },
  partial_systems: { operations: 0.25 },
  systems_holding: { operations: -0.5, owner: -0.5 },
  conversion_capacity: { conversion: 1 },
  ops_capacity: { operations: 1 },
  cash_capacity: { financial: 1 },
  owner_capacity: { owner: 1, demand: 0.5 },
};

function computeGearLoads(signals: SignalCode[]): Record<GearId, number> {
  const loads: Record<GearId, number> = {
    demand: 0,
    conversion: 0,
    operations: 0,
    financial: 0,
    owner: 0,
  };
  for (const s of signals) {
    const m = SIGNAL_GEAR_LOAD[s];
    if (!m) continue;
    for (const k of Object.keys(m) as GearId[]) {
      loads[k] += m[k] ?? 0;
    }
  }
  return loads;
}

function pressureFor(load: number): GearPressure {
  if (load >= 1.5) return "slipping";
  if (load >= 0.5) return "strained";
  return "solid";
}

const GEAR_NOTES: Record<GearPressure, Record<GearId, string>> = {
  slipping: {
    demand: "Lead flow is leaning on the owner or on chance, not on a system.",
    conversion: "Quotes and follow-up are leaking - good leads are slipping past.",
    operations: "Handoffs and execution are absorbing pressure they were not built for.",
    financial: "The owner is operating without a reliable weekly read of what is actually happening.",
    owner: "Too much of the business runs through one person right now.",
  },
  strained: {
    demand: "Demand mostly holds, but it is not yet predictable or owner-independent.",
    conversion: "Conversion works when the owner is on top of it - and bends when they are not.",
    operations: "Operations holds in normal weeks, but flexes under any real pressure.",
    financial: "Visibility is partial - the read is real, but delayed or rough.",
    owner: "The owner is still load-bearing in places the system should be carrying.",
  },
  solid: {
    demand: "Demand is holding up without unusual owner intervention right now.",
    conversion: "Conversion has structure - follow-up is not fully owner-dependent.",
    operations: "Operations is holding - handoffs and execution are not the weak point.",
    financial: "There is a real weekly read on revenue and cash flow.",
    owner: "The business is not fully gated by the owner's daily attention.",
  },
};

const WORN_TEETH: Array<{
  id: string;
  triggerAny: SignalCode[];
  finding: string;
  gear: GearId;
  priority: number;
}> = [
  {
    id: "wt_followup_drift",
    triggerAny: ["conversion_leak", "no_followup_system"],
    finding: "Follow-up after a quote is treated as a memory task, not a system. Good leads die quietly.",
    gear: "conversion",
    priority: 9,
  },
  {
    id: "wt_owner_choke_point",
    triggerAny: ["owner_dependency", "owner_decision_load", "owner_capacity"],
    finding: "Too many decisions still route through the owner - the business has a ceiling shaped like one person.",
    gear: "owner",
    priority: 9,
  },
  {
    id: "wt_decision_bottleneck",
    triggerAny: ["decision_bottleneck"],
    finding: "Pricing, approvals, and exceptions cannot move without the owner. That is a system gap, not a discipline gap.",
    gear: "owner",
    priority: 7,
  },
  {
    id: "wt_handoff_drop",
    triggerAny: ["handoff_friction", "sales_to_ops_friction"],
    finding: "When jobs go wrong, the failure is at the handoff - what sales sold is not what ops sees on day one.",
    gear: "operations",
    priority: 8,
  },
  {
    id: "wt_quote_clarity",
    triggerAny: ["quoting_friction"],
    finding: "Scope and pricing are not fully nailed before work starts - friction surfaces later as rework or margin loss.",
    gear: "conversion",
    priority: 6,
  },
  {
    id: "wt_financial_blind",
    triggerAny: ["financial_visibility_weak", "financial_visibility_missing", "cash_visibility_drag"],
    finding: "There is no trustworthy weekly read on revenue and cash. Decisions are being made on feel.",
    gear: "financial",
    priority: 9,
  },
  {
    id: "wt_financial_lag",
    triggerAny: ["financial_visibility_lag"],
    finding: "Financial visibility lags by weeks. Problems are visible by the time they are already expensive.",
    gear: "financial",
    priority: 5,
  },
  {
    id: "wt_ops_fragility",
    triggerAny: ["ops_fragility", "capacity_drag"],
    finding: "Operations holds in calm weeks and bends in busy ones - capacity, not skill, is the wall.",
    gear: "operations",
    priority: 6,
  },
  {
    id: "wt_systemic_repeat",
    triggerAny: ["systemic_drag"],
    finding: "The same problems keep returning. That is the classic sign of a worn tooth - not a people problem.",
    gear: "operations",
    priority: 7,
  },
  {
    id: "wt_demand_owner",
    triggerAny: ["demand_owner_bottleneck"],
    finding: "Pipeline depends on the owner being personally in the market - when attention shifts, demand softens.",
    gear: "demand",
    priority: 6,
  },
];

const UPSTREAM_PRIORITY: GearId[] = [
  "owner",
  "financial",
  "conversion",
  "operations",
  "demand",
];

function pickBottleneck(loads: Record<GearId, number>, signals: SignalCode[]): BottleneckRead {
  const meaningful = UPSTREAM_PRIORITY.filter((g) => loads[g] >= 1);
  const root: GearId = meaningful[0] ?? UPSTREAM_PRIORITY.find((g) => loads[g] > 0) ?? "owner";

  const hasOwnerLoad = loads.owner >= 1;
  const hasFinancialGap =
    signals.includes("financial_visibility_weak") ||
    signals.includes("financial_visibility_missing");

  const map: Record<GearId, { headline: string; why: string }> = {
    owner: {
      headline: "Owner is structurally load-bearing.",
      why:
        "Most of the friction shows up downstream - in conversion, ops, or visibility - but the upstream cause is the same: too many decisions, follow-ups, and approvals still require the owner. That is a system gap, not an effort gap. Until the owner stops being a required dependency, the other gears keep absorbing pressure they were not built for.",
    },
    financial: {
      headline: hasFinancialGap
        ? "Operating without a reliable weekly read."
        : "Financial visibility is too delayed to be useful.",
      why:
        "Without a trustworthy weekly read of revenue, AR, and cash, every other decision gets made on feel. The downstream symptoms - chasing money, late surprises, reactive staffing - look like execution problems, but they are visibility problems first.",
    },
    conversion: {
      headline: "Conversion is leaking because follow-up is not a system.",
      why:
        "Follow-up that depends on memory eventually fails. The quotes that quietly die are not a sales-skill issue - they are a cadence and ownership issue. That leak then puts pressure upstream on demand (you need more leads to compensate) and downstream on cash.",
    },
    operations: {
      headline: "Operations is carrying friction it should not have to.",
      why:
        "Handoffs and exceptions absorb time the system should handle. When jobs go sideways, the cause is almost always something that should have been resolved earlier - in sales, in quoting, or in a missing handoff step.",
    },
    demand: {
      headline: "Pipeline depends too much on the owner being in the market.",
      why:
        "Demand holds when the owner is personally driving it and softens when their attention shifts. That is not a marketing problem first - it is a structure problem.",
    },
  };

  const upstreamGear: GearId =
    hasOwnerLoad && root !== "owner" && loads.owner >= loads[root] * 0.6
      ? "owner"
      : root;

  return {
    headline: map[upstreamGear].headline,
    why: map[upstreamGear].why,
    upstreamGear,
  };
}

function projectDownstream(bottleneckGear: GearId, gears: GearRead[]): string[] {
  const slipping = gears.filter((g) => g.pressure === "slipping").map((g) => g.id);
  const out: string[] = [];

  const lib: Record<GearId, string[]> = {
    owner: [
      "Decision speed slows as the business gets busier - the owner becomes the queue.",
      "Good leads and quotes keep slipping because follow-up depends on owner memory.",
      "Time off becomes risky. The business runs because the owner is present, not because the system is.",
    ],
    financial: [
      "Cash decisions stay reactive - surprises show up on the statement, not in the plan.",
      "Margin erosion gets noticed weeks late, after it has already cost money.",
      "AR drift quietly compounds. The fix gets harder the longer it stays invisible.",
    ],
    conversion: [
      "Lead cost effectively rises - more leads are needed to make up for the ones leaking out.",
      "Revenue stays choppy week to week even when demand looks fine.",
      "Sales-to-ops handoffs keep creating friction the team blames on each other.",
    ],
    operations: [
      "Recurring fires keep returning under new names - the same worn tooth, different week.",
      "Capacity feels permanently 'almost there' - you scale effort, not throughput.",
      "Customer trust erodes slowly through small, fixable misses that keep repeating.",
    ],
    demand: [
      "Pipeline gets thin whenever the owner's attention moves elsewhere.",
      "Marketing spend underperforms because the system behind it is not ready to convert.",
    ],
  };

  out.push(...(lib[bottleneckGear] ?? []).slice(0, 2));

  for (const g of slipping) {
    if (g === bottleneckGear) continue;
    const extra = lib[g]?.[0];
    if (extra && !out.includes(extra)) {
      out.push(extra);
      break;
    }
  }

  return out.slice(0, 3);
}

export interface ScanAnswers {
  [questionId: string]: string | undefined;
}

export function collectSignals(answers: ScanAnswers): SignalCode[] {
  const out: SignalCode[] = [];
  for (const q of SCAN_QUESTIONS) {
    const optId = answers[q.id];
    if (!optId) continue;
    const opt = q.options.find((o) => o.id === optId);
    if (opt) out.push(...opt.signals);
  }
  return out;
}

export function runScan(answers: ScanAnswers): ScanResult {
  const signals = collectSignals(answers);
  const loads = computeGearLoads(signals);

  const gears: GearRead[] = GEARS.map((g) => {
    const load = loads[g.id];
    const pressure = pressureFor(load);
    return {
      id: g.id,
      title: g.title,
      load,
      pressure,
      note: GEAR_NOTES[pressure][g.id],
    };
  });

  const bottleneck = pickBottleneck(loads, signals);

  const teeth: WornTooth[] = [];
  const seen = new Set<string>();
  const ranked = [...WORN_TEETH].sort((a, b) => b.priority - a.priority);
  for (const wt of ranked) {
    if (seen.has(wt.id)) continue;
    const hit = wt.triggerAny.some((t) => signals.includes(t));
    if (!hit) continue;
    teeth.push({ id: wt.id, finding: wt.finding, gear: wt.gear });
    seen.add(wt.id);
    if (teeth.length >= 3) break;
  }

  const downstream = projectDownstream(bottleneck.upstreamGear, gears);

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const missingContext: string[] = [];
  if (answeredCount < SCAN_QUESTIONS.length) {
    missingContext.push("Some scan questions were skipped - direction is partial.");
  }

  const confidence = classifyConfidence({
    approvedSignalCount: Math.min(2, Math.floor(answeredCount / 3)),
    verifiedEvidenceCount: 0,
    coreRequiredSatisfied: answeredCount >= 5,
    missingContext,
    safetyStatus: "passed",
    allowMediumWithoutVerifiedProof: true,
  });

  const nextBestAction = decideNextBestAction({
    confidence: confidence.label,
    safetyStatus: "passed",
    missingQuestionsCount: SCAN_QUESTIONS.length - answeredCount,
  });

  return {
    engineVersion: SCAN_ENGINE_VERSION,
    gears,
    bottleneck,
    wornTeeth: teeth,
    downstreamIfUntouched: downstream,
    confidence,
    nextBestAction,
    goDeeper: {
      label: "Go deeper with the Diagnostic-Grade Stability Assessment",
      href: "/scorecard",
      rationale:
        "The Operational Friction Scan is directional. The Diagnostic-Grade Stability Assessment is a structured 0-1,000 systems read across all five gears - the serious next step when the friction above feels real.",
    },
  };
}
