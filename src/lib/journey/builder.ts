/**
 * P13.4 — Customer Journey Mapper maturity.
 *
 * Shared schema + helpers for the guided, evidence-first Customer Journey
 * Mapper. The UI presents stage cards with mindset / question / friction /
 * recommended-action prompts; the underlying record is plain JSON that
 * fits the existing `tool_runs` storage and the canonical
 * `customer_journey_mapper` diagnostic sub-tool key.
 *
 * Boundaries:
 *   - Each stage carries its own client-safe / admin-only flags. Internal
 *     strategy notes, friction diagnoses, and bad-fit signals stay in the
 *     admin-only side and never leak to the client view.
 *   - The "Build Journey From Evidence" helper only uses data already in
 *     the OS for THIS customer (profile, latest persona run, intake,
 *     pipeline deals, connected sources, insight memory). If evidence is
 *     thin every field is flagged `needsValidation: true`.
 */

import { supabase } from "@/integrations/supabase/client";
import type { TargetGear } from "@/lib/gears/targetGear";

/* ───────────────────────── stage schema ───────────────────────── */

export type JourneyStageKey =
  | "awareness"
  | "problem_recognition"
  | "consideration"
  | "trust_building"
  | "decision"
  | "onboarding"
  | "delivery"
  | "retention";

export type ConfidenceLevel = "low" | "medium" | "high";

export interface StageState {
  /** Client mindset at this stage (what are they thinking/feeling?). */
  buyerMindset: string;
  /** The question the buyer is privately asking themselves. */
  buyerQuestion: string;
  /** Where the journey breaks down here. */
  frictionPoint: string;
  /** Where the evidence came from. */
  evidenceSource: string;
  /** How much we trust this stage's content today. */
  confidence: ConfidenceLevel;
  /** Mark for human validation. */
  needsValidation: boolean;
  /** Admin-only — what RGS should do at this stage. */
  recommendedAction: string;
  /** Optional gear this stage maps to. */
  targetGear: TargetGear | null;
  /** Per-stage client-safe toggle (mindset / question are client-safe by default; friction & action are not). */
  clientSafe: boolean;
  /** Free-text "what's missing" prompt — guides next admin question. */
  missingInfo: string;
}

export interface JourneyStageDef {
  key: JourneyStageKey;
  label: string;
  hint: string;
  /** Long-form prompt above the editor. */
  prompt: string;
  /** Default initial client-safe flag (mindset/question generally OK; friction/action default admin-only). */
  clientSafeDefault: boolean;
  /** Suggested gear this stage typically lives in. */
  defaultGear: TargetGear | null;
}

export const JOURNEY_STAGES: JourneyStageDef[] = [
  {
    key: "awareness",
    label: "Awareness",
    hint: "How they first encounter the category or the brand.",
    prompt: "Where do they hear about this kind of solution? What surface (search, peer, ad, content) makes them aware?",
    clientSafeDefault: true,
    defaultGear: 1,
  },
  {
    key: "problem_recognition",
    label: "Problem Recognition",
    hint: "The moment they admit the problem is real and worth solving.",
    prompt: "What event, metric, or feeling forces them to stop normalising the problem?",
    clientSafeDefault: true,
    defaultGear: 1,
  },
  {
    key: "consideration",
    label: "Consideration",
    hint: "How they evaluate options — including doing nothing.",
    prompt: "Who else are they comparing? What shortcuts and biases are they using to filter?",
    clientSafeDefault: true,
    defaultGear: 2,
  },
  {
    key: "trust_building",
    label: "Trust Building",
    hint: "What evidence and signals move them from interest to trust.",
    prompt: "Proof points, references, content, or interactions that make them feel safe to proceed.",
    clientSafeDefault: true,
    defaultGear: 2,
  },
  {
    key: "decision",
    label: "Decision / Purchase",
    hint: "The actual moment of commitment — and the friction around it.",
    prompt: "Who signs off? What surfaces or steps cause hesitation, drop-off, or delay?",
    clientSafeDefault: false,
    defaultGear: 2,
  },
  {
    key: "onboarding",
    label: "Onboarding",
    hint: "First experience after purchase — sets retention expectations.",
    prompt: "First 7–30 days. Information they need, decisions they have to make, friction they hit.",
    clientSafeDefault: false,
    defaultGear: 3,
  },
  {
    key: "delivery",
    label: "Delivery / Experience",
    hint: "Recurring delivery of the value they bought.",
    prompt: "How value shows up over time. Where the experience flattens, breaks, or surprises them positively.",
    clientSafeDefault: false,
    defaultGear: 3,
  },
  {
    key: "retention",
    label: "Retention / Referral",
    hint: "Why they stay, expand, and refer — or quietly leave.",
    prompt: "Renewal triggers, expansion paths, referral motions, and silent-churn warning signs.",
    clientSafeDefault: true,
    defaultGear: 5,
  },
];

/* ───────────────────────── journey record ───────────────────────── */

export type JourneyStatus =
  | "not_started"
  | "drafted"
  | "needs_evidence"
  | "ready_for_review"
  | "client_safe_approved";

export interface JourneyEvidenceTrailEntry {
  source: string;
  detail: string;
  at: string;
}

export interface JourneyRecord {
  schema: 1;
  /** Per-stage state, keyed by JourneyStageKey. */
  stages: Record<JourneyStageKey, StageState>;
  /** Plain-language client-safe summary of the journey. */
  clientSafeSummary: string;
  /** Admin-only strategy notes (sequencing, internal levers). Never client-visible. */
  adminNotes: string;
  /** Where the latest draft drew from. */
  evidenceTrail: JourneyEvidenceTrailEntry[];
  /** Admin's explicit status flag — UI exposes the same options. */
  status: JourneyStatus;
}

const VALID_STATUS = new Set<JourneyStatus>([
  "not_started",
  "drafted",
  "needs_evidence",
  "ready_for_review",
  "client_safe_approved",
]);

export const JOURNEY_STATUS_LABELS: Record<JourneyStatus, string> = {
  not_started: "Not started",
  drafted: "Drafted",
  needs_evidence: "Needs evidence",
  ready_for_review: "Ready for review",
  client_safe_approved: "Client-safe approved",
};

export function emptyStage(def: JourneyStageDef): StageState {
  return {
    buyerMindset: "",
    buyerQuestion: "",
    frictionPoint: "",
    evidenceSource: "",
    confidence: "low",
    needsValidation: true,
    recommendedAction: "",
    targetGear: def.defaultGear,
    clientSafe: def.clientSafeDefault,
    missingInfo: "",
  };
}

export function emptyJourney(): JourneyRecord {
  const stages = {} as Record<JourneyStageKey, StageState>;
  for (const def of JOURNEY_STAGES) stages[def.key] = emptyStage(def);
  return {
    schema: 1,
    stages,
    clientSafeSummary: "",
    adminNotes: "",
    evidenceTrail: [],
    status: "not_started",
  };
}

/**
 * Forward-compatible loader: accepts a current JourneyRecord, the legacy
 * (P13-) `{ stages: [...] }` shape, or arbitrary JSON. Anything unrecognised
 * is dropped — never thrown.
 */
export function hydrateJourney(raw: any): JourneyRecord {
  if (!raw || typeof raw !== "object") return emptyJourney();
  // Current schema
  if (raw.schema === 1 && raw.stages && !Array.isArray(raw.stages)) {
    const base = emptyJourney();
    const stages = { ...base.stages };
    for (const def of JOURNEY_STAGES) {
      const incoming = raw.stages?.[def.key];
      if (incoming && typeof incoming === "object") {
        stages[def.key] = {
          ...emptyStage(def),
          ...incoming,
          confidence: (["low", "medium", "high"].includes(incoming.confidence) ? incoming.confidence : "low") as ConfidenceLevel,
          targetGear:
            incoming.targetGear === 1 ||
            incoming.targetGear === 2 ||
            incoming.targetGear === 3 ||
            incoming.targetGear === 4 ||
            incoming.targetGear === 5
              ? incoming.targetGear
              : null,
          clientSafe: !!incoming.clientSafe,
        };
      }
    }
    return {
      ...base,
      stages,
      clientSafeSummary: typeof raw.clientSafeSummary === "string" ? raw.clientSafeSummary : "",
      adminNotes: typeof raw.adminNotes === "string" ? raw.adminNotes : "",
      evidenceTrail: Array.isArray(raw.evidenceTrail) ? raw.evidenceTrail.slice(0, 25) : [],
      status: VALID_STATUS.has(raw.status) ? raw.status : "not_started",
    };
  }
  // Legacy P13- shape: { stages: [{ name, customer_action, touchpoint, emotion, pain, opportunity }] }
  if (Array.isArray(raw.stages)) {
    const base = emptyJourney();
    const byName = new Map<string, any>();
    for (const s of raw.stages) {
      const n = (s?.name ?? "").toString().toLowerCase().trim();
      if (n) byName.set(n, s);
    }
    const matchKey = (def: JourneyStageDef): any | undefined => {
      const candidates: Record<JourneyStageKey, string[]> = {
        awareness: ["awareness"],
        problem_recognition: ["problem", "problem recognition", "recognition"],
        consideration: ["consideration"],
        trust_building: ["trust", "trust building"],
        decision: ["decision", "purchase", "decision / purchase", "decision/purchase"],
        onboarding: ["onboarding"],
        delivery: ["delivery", "experience", "delivery / experience"],
        retention: ["retention", "referral", "retention / referral"],
      };
      for (const c of candidates[def.key]) {
        if (byName.has(c)) return byName.get(c);
      }
      return undefined;
    };
    const stages = { ...base.stages };
    for (const def of JOURNEY_STAGES) {
      const old = matchKey(def);
      if (old) {
        stages[def.key] = {
          ...emptyStage(def),
          buyerMindset: typeof old.emotion === "string" ? old.emotion : "",
          buyerQuestion: typeof old.customer_action === "string" ? old.customer_action : "",
          frictionPoint: typeof old.pain === "string" ? old.pain : "",
          recommendedAction: typeof old.opportunity === "string" ? old.opportunity : "",
          evidenceSource: typeof old.touchpoint === "string" ? `Legacy: ${old.touchpoint}` : "",
          needsValidation: true,
        };
      }
    }
    return { ...base, stages };
  }
  return emptyJourney();
}

/* ───────────────────────── status + summary derivation ───────────────────────── */

export function deriveStatus(j: JourneyRecord): JourneyStatus {
  const filled = JOURNEY_STAGES.filter((d) => stageHasContent(j.stages[d.key])).length;
  if (filled === 0) return "not_started";
  if (filled < Math.ceil(JOURNEY_STAGES.length / 2)) return "drafted";
  const validated = JOURNEY_STAGES.filter(
    (d) => stageHasContent(j.stages[d.key]) && !j.stages[d.key].needsValidation,
  ).length;
  if (validated >= Math.ceil(filled * 0.7)) {
    return j.clientSafeSummary.trim().length > 0 ? "client_safe_approved" : "ready_for_review";
  }
  return "needs_evidence";
}

function stageHasContent(s: StageState): boolean {
  return [s.buyerMindset, s.buyerQuestion, s.frictionPoint, s.recommendedAction]
    .some((v) => v.trim().length > 0);
}

export function buildJourneySummary(j: JourneyRecord) {
  const status = deriveStatus(j);
  const filled = JOURNEY_STAGES.filter((d) => stageHasContent(j.stages[d.key])).length;
  const frictionStages = JOURNEY_STAGES.filter((d) => j.stages[d.key].frictionPoint.trim().length > 0).length;
  return {
    status,
    headline: JOURNEY_STATUS_LABELS[status],
    stages_filled: filled,
    stages_total: JOURNEY_STAGES.length,
    friction_stages: frictionStages,
    has_client_safe_summary: j.clientSafeSummary.trim().length > 0,
    confidence:
      filled >= 6 && j.clientSafeSummary.trim().length > 0
        ? "high"
        : filled >= 4
        ? "medium"
        : "low",
  };
}

/* ───────────────────────── client-safe export ───────────────────────── */

export function clientSafeView(j: JourneyRecord): {
  summary: string;
  stages: { label: string; mindset: string; question: string }[];
} {
  const stages = JOURNEY_STAGES
    .filter((d) => j.stages[d.key].clientSafe)
    .filter((d) => j.stages[d.key].buyerMindset.trim() || j.stages[d.key].buyerQuestion.trim())
    .map((d) => ({
      label: d.label,
      mindset: j.stages[d.key].buyerMindset,
      question: j.stages[d.key].buyerQuestion,
    }));
  return { summary: j.clientSafeSummary.trim(), stages };
}

/* ───────────────────────── build-from-evidence ───────────────────────── */

export interface BuildFromEvidenceResult {
  journey: JourneyRecord;
  trail: JourneyEvidenceTrailEntry[];
  rationale: string;
}

function setStage(j: JourneyRecord, key: JourneyStageKey, patch: Partial<StageState>) {
  const def = JOURNEY_STAGES.find((d) => d.key === key);
  if (!def) return;
  const prev = j.stages[key] ?? emptyStage(def);
  j.stages[key] = {
    ...prev,
    ...patch,
    needsValidation: patch.needsValidation ?? true,
  };
}

/**
 * Generate a cautious draft journey from data already in the OS for this
 * customer. Pulls only from this customer's surface — no cross-client
 * inference. Thin evidence keeps every field flagged for validation.
 */
export async function buildJourneyFromEvidence(
  customerId: string,
  base: JourneyRecord,
): Promise<BuildFromEvidenceResult> {
  const trail: JourneyEvidenceTrailEntry[] = [];
  const draft: JourneyRecord = hydrateJourney({ ...base });
  const now = () => new Date().toISOString();

  // 1. Customer profile
  const { data: customer } = await supabase
    .from("customers")
    .select("full_name, business_name, business_description, service_type, monthly_revenue, goals, stage, lifecycle_state")
    .eq("id", customerId)
    .maybeSingle();

  // 2. Latest buyer persona run (if any)
  const { data: personaRuns } = await supabase
    .from("tool_runs")
    .select("data, summary, updated_at")
    .eq("tool_key", "buyer_persona_tool")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false })
    .limit(1);
  const latestPersona: any = (personaRuns ?? [])[0]?.data ?? null;

  // 3. Diagnostic intake answers
  const { data: intake } = await supabase
    .from("diagnostic_intake_answers")
    .select("section_key, answer")
    .eq("customer_id", customerId)
    .limit(200);
  const intakeMap = new Map<string, string>();
  for (const row of intake ?? []) {
    if (row.section_key && row.answer) {
      const prior = intakeMap.get(row.section_key);
      intakeMap.set(row.section_key, prior ? `${prior}\n\n${row.answer}` : row.answer);
    }
  }

  // 4. Pipeline deals (loss reasons inform decision-stage friction)
  const { data: deals } = await supabase
    .from("client_pipeline_deals")
    .select("title, notes, loss_reason")
    .eq("customer_id", customerId)
    .limit(20);

  // 5. Connected sources (informational)
  const { data: integrations } = await supabase
    .from("customer_integrations")
    .select("provider, status")
    .eq("customer_id", customerId)
    .limit(50);

  // 6. Insight memory
  const { data: memory } = await supabase
    .from("customer_insight_memory")
    .select("title, summary, related_pillar, client_visible")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .limit(25);

  /* ── Awareness ── */
  const channels = intakeMap.get("lead_sources") ?? intakeMap.get("acquisition_channels");
  if (channels) {
    setStage(draft, "awareness", {
      buyerMindset: `Encounters the category through: ${channels}.`,
      buyerQuestion: "Is this the kind of thing that could fix what I'm dealing with?",
      evidenceSource: "Diagnostic intake · lead sources",
      confidence: "medium",
    });
    trail.push({ source: "Diagnostic intake", detail: "Awareness seeded from declared lead sources.", at: now() });
  }

  /* ── Problem Recognition ── */
  const pain =
    intakeMap.get("primary_pain") ??
    intakeMap.get("biggest_problem") ??
    intakeMap.get("pain_urgency");
  if (pain) {
    setStage(draft, "problem_recognition", {
      buyerMindset: pain,
      buyerQuestion: "Has this finally crossed the line from annoying to costly?",
      frictionPoint: "Owner has likely normalised the problem for months.",
      evidenceSource: "Diagnostic intake · pain",
      confidence: "medium",
    });
    trail.push({ source: "Diagnostic intake", detail: "Problem-recognition seeded from stated primary pain.", at: now() });
  }

  /* ── Consideration (from persona objections, if available) ── */
  const personaObjections =
    latestPersona?.persona?.sections?.objections?.value ??
    latestPersona?.sections?.objections?.value;
  if (personaObjections) {
    setStage(draft, "consideration", {
      buyerMindset: "Comparing options against the cost of doing nothing.",
      buyerQuestion: "Why is this different from what I've already tried?",
      frictionPoint: personaObjections,
      evidenceSource: "Buyer Persona · objections",
      confidence: "medium",
    });
    trail.push({ source: "Buyer Persona", detail: "Consideration friction seeded from persona objections.", at: now() });
  }

  /* ── Trust Building (from persona messaging angle / insight memory) ── */
  const personaMessaging =
    latestPersona?.persona?.sections?.messaging_angle?.value ??
    latestPersona?.sections?.messaging_angle?.value;
  const insight = (memory ?? []).find((m) => m.client_visible && m.summary);
  if (personaMessaging || insight) {
    setStage(draft, "trust_building", {
      buyerMindset: "Looking for proof this isn't another generic consultancy.",
      buyerQuestion: "Do these people actually understand my business?",
      recommendedAction: personaMessaging
        ? `Lead with messaging angle: ${personaMessaging}`
        : insight
        ? `Surface insight memory: ${insight.title}.`
        : "",
      evidenceSource: personaMessaging ? "Buyer Persona · messaging" : "Insight memory",
      confidence: "low",
    });
    trail.push({ source: "Buyer Persona / Insight memory", detail: "Trust-building seeded from messaging angle or insight.", at: now() });
  }

  /* ── Decision / Purchase (from pipeline loss reasons) ── */
  const lossReasons = (deals ?? [])
    .map((d) => d.loss_reason)
    .filter((s): s is string => !!s && s.trim().length > 0);
  if (lossReasons.length) {
    setStage(draft, "decision", {
      buyerMindset: "Weighing the cost of action against the cost of inaction.",
      buyerQuestion: "Can I justify this spend right now?",
      frictionPoint: `Recurring loss reasons in this client's pipeline:\n• ${Array.from(new Set(lossReasons)).slice(0, 5).join("\n• ")}`,
      recommendedAction: "Pre-empt the top loss reason in the proposal stage.",
      evidenceSource: "Client pipeline · loss reasons",
      confidence: "low",
    });
    trail.push({ source: "Client pipeline", detail: `${lossReasons.length} loss reason(s) considered.`, at: now() });
  }

  /* ── Onboarding (from customer profile + integrations) ── */
  const onboardingBits: string[] = [];
  if (customer?.service_type) onboardingBits.push(`Service type: ${customer.service_type}`);
  if (integrations && integrations.length) {
    onboardingBits.push(`${integrations.length} connected source(s) on file.`);
  }
  if (onboardingBits.length) {
    setStage(draft, "onboarding", {
      buyerMindset: "Hopeful but anxious — wondering if this is going to be more work for them.",
      buyerQuestion: "What do I have to actually do in the next 7 days?",
      frictionPoint: "Owner is busy; onboarding tasks compete with daily fires.",
      recommendedAction: `Lock the first three asks. Context: ${onboardingBits.join(" · ")}`,
      evidenceSource: "Customer profile + connected sources",
      confidence: "low",
    });
    trail.push({ source: "Customer profile", detail: "Onboarding seeded from profile + integrations posture.", at: now() });
  }

  /* ── Delivery / Experience ── */
  const goals = customer?.goals ?? "";
  if (goals) {
    setStage(draft, "delivery", {
      buyerMindset: "Watching for early evidence the engagement is working.",
      buyerQuestion: "Am I seeing the change I was promised?",
      recommendedAction: `Tie weekly delivery moments back to stated goals: ${goals}`,
      evidenceSource: "Customer profile · goals",
      confidence: "low",
    });
    trail.push({ source: "Customer profile", detail: "Delivery-stage seeded from declared goals.", at: now() });
  }

  /* ── Retention / Referral ── */
  const referralSeed = intakeMap.get("retention_strategy") ?? intakeMap.get("referral_program");
  if (referralSeed) {
    setStage(draft, "retention", {
      buyerMindset: "Deciding whether to renew, expand, or quietly drift.",
      buyerQuestion: "Is this still earning its place in my P&L?",
      recommendedAction: referralSeed,
      evidenceSource: "Diagnostic intake · retention/referral",
      confidence: "low",
    });
    trail.push({ source: "Diagnostic intake", detail: "Retention seeded from declared retention/referral notes.", at: now() });
  }

  /* ── Client-safe summary stub (admin curates before approving) ── */
  const filled = JOURNEY_STAGES.filter((d) => stageHasContent(draft.stages[d.key]));
  if (filled.length > 0 && !draft.clientSafeSummary.trim()) {
    const focusStage = filled[0];
    draft.clientSafeSummary =
      `Draft journey for ${customer?.business_name ?? customer?.full_name ?? "this client"}. ` +
      `Strongest signal sits in the ${focusStage.label.toLowerCase()} stage; the rest needs validation.`;
  }

  draft.evidenceTrail = [...trail];
  draft.status = deriveStatus(draft);

  const filledCount = filled.length;
  const rationale =
    filledCount === 0
      ? "No usable evidence found in the OS yet — start by capturing intake answers, persona, or pipeline notes."
      : filledCount < 3
      ? `Thin evidence: ${filledCount} of ${JOURNEY_STAGES.length} stages seeded. Every field is flagged for validation.`
      : `Drafted ${filledCount} of ${JOURNEY_STAGES.length} stages. Validate each before marking client-safe.`;

  return { journey: draft, trail, rationale };
}

/* ───────────────────────── AI seed merge ───────────────────────── */

export interface AiSeedJourneyStage {
  key?: JourneyStageKey;
  buyer_mindset?: string;
  buyer_question?: string;
  friction_point?: string;
  recommended_action?: string;
  target_gear?: number | null;
  evidence_source?: string;
  client_safe_mindset?: boolean;
}

export interface AiSeedJourney {
  confidence?: ConfidenceLevel;
  rationale?: string;
  evidence_used?: string[];
  missing_validation?: string[];
  stages?: AiSeedJourneyStage[];
  client_safe_summary?: string;
  admin_strategy_notes?: string;
}

/**
 * Merge an AI seed payload into an existing journey record. Existing
 * non-empty stage content is preserved unless `overwrite` is true. Every
 * merged field is flagged `needsValidation: true` and labelled "AI hypothesis".
 */
export function mergeAiSeedIntoJourney(
  base: JourneyRecord,
  ai: AiSeedJourney,
  options: { overwrite?: boolean } = {},
): { journey: JourneyRecord; trail: JourneyEvidenceTrailEntry[] } {
  const overwrite = !!options.overwrite;
  const draft: JourneyRecord = hydrateJourney({ ...base });
  const now = new Date().toISOString();
  const trail: JourneyEvidenceTrailEntry[] = [];
  const conf: ConfidenceLevel = (ai.confidence as ConfidenceLevel) ?? "low";

  for (const incoming of ai.stages ?? []) {
    const def = JOURNEY_STAGES.find((d) => d.key === incoming.key);
    if (!def) continue;
    const prev = draft.stages[def.key];
    const mindset = (incoming.buyer_mindset ?? "").trim();
    const question = (incoming.buyer_question ?? "").trim();
    const friction = (incoming.friction_point ?? "").trim();
    const action = (incoming.recommended_action ?? "").trim();
    if (!mindset && !question && !friction && !action) continue;
    const next: StageState = {
      ...prev,
      buyerMindset: overwrite || !prev.buyerMindset.trim() ? mindset || prev.buyerMindset : prev.buyerMindset,
      buyerQuestion: overwrite || !prev.buyerQuestion.trim() ? question || prev.buyerQuestion : prev.buyerQuestion,
      frictionPoint: overwrite || !prev.frictionPoint.trim() ? friction || prev.frictionPoint : prev.frictionPoint,
      recommendedAction: overwrite || !prev.recommendedAction.trim() ? action || prev.recommendedAction : prev.recommendedAction,
      evidenceSource: incoming.evidence_source?.trim() || "AI hypothesis (seed)",
      confidence: conf,
      needsValidation: true,
      targetGear:
        incoming.target_gear === 1 ||
        incoming.target_gear === 2 ||
        incoming.target_gear === 3 ||
        incoming.target_gear === 4 ||
        incoming.target_gear === 5
          ? (incoming.target_gear as TargetGear)
          : prev.targetGear,
      // Friction & recommended action stay admin-only by default; mindset/question follow seed flag.
      clientSafe:
        typeof incoming.client_safe_mindset === "boolean"
          ? incoming.client_safe_mindset && def.clientSafeDefault
          : prev.clientSafe,
    };
    draft.stages[def.key] = next;
  }

  if (ai.client_safe_summary && (overwrite || !draft.clientSafeSummary.trim())) {
    draft.clientSafeSummary = `Hypothesis journey — pending validation.\n\n${ai.client_safe_summary.trim()}`;
  }

  if (ai.admin_strategy_notes) {
    const block = `AI strategy notes (${conf} confidence):\n${ai.admin_strategy_notes.trim()}`;
    draft.adminNotes = draft.adminNotes.trim()
      ? `${draft.adminNotes.trim()}\n\n---\n${block}`
      : block;
  }

  if (ai.missing_validation?.length) {
    const block = `Open validation questions:\n• ${ai.missing_validation.slice(0, 12).join("\n• ")}`;
    draft.adminNotes = draft.adminNotes.trim()
      ? `${draft.adminNotes.trim()}\n\n${block}`
      : block;
  }

  trail.push({
    source: "AI Persona Seed",
    detail: ai.rationale?.trim() || "Hypothesis journey generated from product/problem seed.",
    at: now,
  });
  draft.evidenceTrail = [...draft.evidenceTrail, ...trail].slice(-25);
  draft.status = deriveStatus(draft);

  return { journey: draft, trail };
}