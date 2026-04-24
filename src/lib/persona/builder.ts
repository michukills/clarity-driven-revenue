/**
 * P13.3 — Buyer Persona maturity.
 *
 * Shared schema + helpers for the guided, evidence-first Buyer Persona
 * builder. The UI presents semantic fit levels and structured sections,
 * but the underlying record is a simple JSON shape that fits the existing
 * `tool_runs` storage used by all diagnostic sub-tools — so we do not
 * invent a fragile new persistence model.
 *
 * Boundaries:
 *   - Each section carries its own client-safe / admin-only flag where the
 *     section is allowed to be exposed (some sections, like Disqualifiers
 *     and Decision Authority, default to admin-only and cannot leak).
 *   - The "Build From Evidence" helper only uses data already in the OS
 *     (customer profile, diagnostic intake, connected sources, insight
 *     memory, pipeline notes). It produces cautious drafts; if evidence
 *     is thin every field is labelled `needsValidation: true`.
 */

import { supabase } from "@/integrations/supabase/client";

/* ───────────────────────── semantic levels ───────────────────────── */

export type FitLevel =
  | "unknown"
  | "low_fit"
  | "emerging_fit"
  | "strong_fit"
  | "ideal_fit";

export const FIT_LEVELS: { key: FitLevel; label: string; hint: string; tone: string }[] = [
  { key: "unknown",      label: "Unknown / insufficient evidence", hint: "We don’t yet have enough signal to call this.",      tone: "hsl(220 8% 60%)" },
  { key: "low_fit",      label: "Low fit",                          hint: "Pursuing this profile will compress close-rate or delivery margin.", tone: "hsl(0 70% 55%)"  },
  { key: "emerging_fit", label: "Emerging fit",                     hint: "Some signal of fit, but key dimensions are missing or weak.",       tone: "hsl(40 90% 55%)" },
  { key: "strong_fit",   label: "Strong fit",                       hint: "Multiple dimensions are strong; a clear path to close exists.",     tone: "hsl(95 50% 50%)" },
  { key: "ideal_fit",    label: "Ideal fit",                        hint: "High intent, ready to buy, will succeed in delivery, will refer.",  tone: "hsl(140 60% 45%)" },
];

/** Numeric weight (0..4) used to derive an internal-only score; never shown raw in UI. */
export function fitLevelWeight(level: FitLevel): number {
  switch (level) {
    case "ideal_fit": return 4;
    case "strong_fit": return 3;
    case "emerging_fit": return 2;
    case "low_fit": return 1;
    default: return 0; // unknown contributes nothing
  }
}

/* ───────────────────────── section schema ───────────────────────── */

export type ConfidenceLevel = "low" | "medium" | "high";

/** Section data captured per persona field. Every section uses this shape. */
export interface SectionState {
  /** Plain-language summary the admin (or draft generator) wrote. */
  value: string;
  /** Where the evidence came from (e.g. "Intake answer · best_fit_buyer"). */
  source: string;
  /** How much we trust this field today. */
  confidence: ConfidenceLevel;
  /** Mark this field as still requiring human validation. */
  needsValidation: boolean;
  /** When `true` the field can appear in the client-safe persona summary. */
  clientSafe: boolean;
  /** Free-text "what's missing" prompt — guides next admin question. */
  missingInfo: string;
  /** Optional fit level for sections that map to a buyer-fit dimension. */
  fit?: FitLevel;
}

export interface PersonaSectionDef {
  key: PersonaSectionKey;
  label: string;
  hint: string;
  /** Whether this section can ever leak to the client. Defaults to true. */
  clientSafeAllowed: boolean;
  /** Default initial client-safe flag. */
  clientSafeDefault: boolean;
  /** Whether the section participates in the buyer-fit shape. */
  hasFit: boolean;
  /** Long-form prompt shown above the editor to guide the admin. */
  prompt: string;
}

export type PersonaSectionKey =
  | "buyer_identity"
  | "company_segment_fit"
  | "pain_urgency"
  | "buying_trigger"
  | "budget_capacity"
  | "decision_authority"
  | "objections"
  | "desired_outcome"
  | "messaging_angle"
  | "acquisition_channels"
  | "follow_up_strategy"
  | "disqualifiers";

export const PERSONA_SECTIONS: PersonaSectionDef[] = [
  {
    key: "buyer_identity",
    label: "Buyer identity",
    hint: "Who is the human on the other side of the table?",
    clientSafeAllowed: true,
    clientSafeDefault: true,
    hasFit: false,
    prompt: "Describe the persona in one paragraph: role, archetype, what their day looks like, and how they describe themselves.",
  },
  {
    key: "company_segment_fit",
    label: "Company / segment fit",
    hint: "What kind of business and stage do they run?",
    clientSafeAllowed: true,
    clientSafeDefault: true,
    hasFit: true,
    prompt: "Industry, size, revenue band, geography, and the operating shape that makes them either a strong or weak fit.",
  },
  {
    key: "pain_urgency",
    label: "Pain urgency",
    hint: "How acute is the problem right now?",
    clientSafeAllowed: true,
    clientSafeDefault: true,
    hasFit: true,
    prompt: "Is the pain theoretical or bleeding today? What evidence makes you confident in either direction?",
  },
  {
    key: "buying_trigger",
    label: "Buying trigger",
    hint: "What makes them act now instead of later?",
    clientSafeAllowed: true,
    clientSafeDefault: true,
    hasFit: false,
    prompt: "Specific event, milestone, or threshold that flips them from 'thinking about it' to 'buying now'.",
  },
  {
    key: "budget_capacity",
    label: "Budget capacity",
    hint: "Can they fund the engagement without straining cash?",
    clientSafeAllowed: false,
    clientSafeDefault: false,
    hasFit: true,
    prompt: "Indication of budget posture, prior consultancy spend, financial pressure, willingness to pay for outcomes.",
  },
  {
    key: "decision_authority",
    label: "Decision authority",
    hint: "Can the contact say yes alone, or is a committee involved?",
    clientSafeAllowed: false,
    clientSafeDefault: false,
    hasFit: true,
    prompt: "Single decision-maker, partner sign-off, board, finance gatekeeper. Map the actual approval chain.",
  },
  {
    key: "objections",
    label: "Common objections",
    hint: "What slows or kills a deal with this persona?",
    clientSafeAllowed: true,
    clientSafeDefault: false,
    hasFit: false,
    prompt: "Predictable resistance points (time, prior bad consulting, fear of disruption) and how to disarm each.",
  },
  {
    key: "desired_outcome",
    label: "Desired outcome",
    hint: "What does success look like in their language?",
    clientSafeAllowed: true,
    clientSafeDefault: true,
    hasFit: false,
    prompt: "The change they actually want — usually about freedom, predictability, or stepping back from operations.",
  },
  {
    key: "messaging_angle",
    label: "Messaging angle",
    hint: "How RGS should speak to them.",
    clientSafeAllowed: true,
    clientSafeDefault: true,
    hasFit: false,
    prompt: "Lead with the message that reframes their situation in terms they already use about themselves.",
  },
  {
    key: "acquisition_channels",
    label: "Best acquisition channels",
    hint: "Where to find them and how they prefer to be reached.",
    clientSafeAllowed: true,
    clientSafeDefault: false,
    hasFit: false,
    prompt: "Concrete channels, peer groups, referrers — ranked by likely yield, not theory.",
  },
  {
    key: "follow_up_strategy",
    label: "Follow-up strategy",
    hint: "Cadence and angle that keeps the deal alive.",
    clientSafeAllowed: false,
    clientSafeDefault: false,
    hasFit: false,
    prompt: "What to send, when to nudge, how to re-open the conversation without feeling pushy.",
  },
  {
    key: "disqualifiers",
    label: "Disqualifiers / bad-fit signals",
    hint: "What should remove this lead from pipeline.",
    clientSafeAllowed: false,
    clientSafeDefault: false,
    hasFit: false,
    prompt: "Hard disqualifiers (revenue floor, no team, wrong intent) — write the list that protects pipeline quality.",
  },
];

/* ───────────────────────── persona record ───────────────────────── */

export type PersonaStatus =
  | "not_started"
  | "drafted"
  | "needs_evidence"
  | "ready_for_review"
  | "client_safe_approved";

export interface PersonaRecord {
  /** Schema version, bumped if section list ever changes. */
  schema: 1;
  /** Persona identity. */
  name: string;
  archetype: string;
  /** Per-section state. */
  sections: Record<PersonaSectionKey, SectionState>;
  /** Admin-only sales / strategy notes. Never client-visible. */
  adminNotes: string;
  /** Plain-language client-safe summary (admin-curated). */
  clientSafeSummary: string;
  /** Where the latest "Build from evidence" draft drew from. */
  evidenceTrail: EvidenceTrailEntry[];
  /** Admin's explicit status flag — UI exposes the same options. */
  status: PersonaStatus;
}

export interface EvidenceTrailEntry {
  source: string;
  detail: string;
  at: string;
}

export function emptySection(def: PersonaSectionDef): SectionState {
  return {
    value: "",
    source: "",
    confidence: "low",
    needsValidation: true,
    clientSafe: def.clientSafeDefault && def.clientSafeAllowed,
    missingInfo: "",
    fit: def.hasFit ? "unknown" : undefined,
  };
}

export function emptyPersona(): PersonaRecord {
  const sections = {} as Record<PersonaSectionKey, SectionState>;
  for (const def of PERSONA_SECTIONS) sections[def.key] = emptySection(def);
  return {
    schema: 1,
    name: "",
    archetype: "Operator-Owner",
    sections,
    adminNotes: "",
    clientSafeSummary: "",
    evidenceTrail: [],
    status: "not_started",
  };
}

/**
 * Forward-compatible loader: accepts either a current PersonaRecord or
 * loose JSON (including older PersonaBuilder shapes) and returns a clean
 * record. Anything unrecognised is dropped — never thrown.
 */
export function hydratePersona(raw: any): PersonaRecord {
  if (!raw || typeof raw !== "object") return emptyPersona();
  if (raw.schema === 1 && raw.sections) {
    const base = emptyPersona();
    const sections = { ...base.sections };
    for (const def of PERSONA_SECTIONS) {
      const incoming = raw.sections?.[def.key];
      if (incoming && typeof incoming === "object") {
        sections[def.key] = {
          ...emptySection(def),
          ...incoming,
          fit: def.hasFit ? (incoming.fit ?? "unknown") : undefined,
          confidence: (["low","medium","high"].includes(incoming.confidence) ? incoming.confidence : "low") as ConfidenceLevel,
          clientSafe: def.clientSafeAllowed ? !!incoming.clientSafe : false,
        };
      }
    }
    return {
      ...base,
      name: typeof raw.name === "string" ? raw.name : "",
      archetype: typeof raw.archetype === "string" ? raw.archetype : "Operator-Owner",
      sections,
      adminNotes: typeof raw.adminNotes === "string" ? raw.adminNotes : "",
      clientSafeSummary: typeof raw.clientSafeSummary === "string" ? raw.clientSafeSummary : "",
      evidenceTrail: Array.isArray(raw.evidenceTrail) ? raw.evidenceTrail.slice(0, 25) : [],
      status: VALID_STATUS.has(raw.status) ? raw.status : "not_started",
    };
  }
  // Legacy shape (P13.2 PersonaBuilder) — return blank but keep name if present.
  const out = emptyPersona();
  if (typeof raw.name === "string") out.name = raw.name;
  if (typeof raw.archetype === "string") out.archetype = raw.archetype;
  return out;
}

const VALID_STATUS = new Set<PersonaStatus>([
  "not_started",
  "drafted",
  "needs_evidence",
  "ready_for_review",
  "client_safe_approved",
]);

/* ───────────────────────── status + score derivation ───────────────────────── */

/**
 * Derive a status from the record's contents. The admin can still override
 * it manually — this is the suggested status shown alongside the override.
 */
export function deriveStatus(p: PersonaRecord): PersonaStatus {
  const filled = PERSONA_SECTIONS.filter((d) => p.sections[d.key].value.trim().length > 0);
  if (filled.length === 0) return "not_started";
  const fitSections = PERSONA_SECTIONS.filter((d) => d.hasFit);
  const unknownFits = fitSections.filter((d) => (p.sections[d.key].fit ?? "unknown") === "unknown");
  const validated = filled.filter((d) => !p.sections[d.key].needsValidation);
  if (filled.length < Math.ceil(PERSONA_SECTIONS.length / 2)) return "drafted";
  if (unknownFits.length >= 2) return "needs_evidence";
  if (validated.length >= Math.ceil(filled.length * 0.7)) {
    return p.clientSafeSummary.trim().length > 0 ? "client_safe_approved" : "ready_for_review";
  }
  return "needs_evidence";
}

/**
 * Internal-only fit score (0..100). Never shown raw — used only for sort
 * ordering, comparison summaries, and the `result_score` column.
 */
export function internalFitScore(p: PersonaRecord): number {
  const fitSections = PERSONA_SECTIONS.filter((d) => d.hasFit);
  if (fitSections.length === 0) return 0;
  let weight = 0;
  let total = 0;
  for (const d of fitSections) {
    const lvl = (p.sections[d.key].fit ?? "unknown") as FitLevel;
    if (lvl === "unknown") continue;
    weight += fitLevelWeight(lvl);
    total += 4; // max per dimension
  }
  if (total === 0) return 0;
  return Math.round((weight / total) * 100);
}

export function dominantLevel(p: PersonaRecord): FitLevel {
  const fitSections = PERSONA_SECTIONS.filter((d) => d.hasFit);
  const knowns = fitSections
    .map((d) => p.sections[d.key].fit ?? "unknown")
    .filter((l): l is FitLevel => l !== "unknown");
  if (knowns.length === 0) return "unknown";
  // Lowest level dominates — a single "low_fit" pulls the persona down.
  const order: FitLevel[] = ["low_fit","emerging_fit","strong_fit","ideal_fit"];
  return knowns.sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
}

/* ───────────────────────── status labels ───────────────────────── */

export const PERSONA_STATUS_LABELS: Record<PersonaStatus, string> = {
  not_started: "Not started",
  drafted: "Drafted",
  needs_evidence: "Needs evidence",
  ready_for_review: "Ready for review",
  client_safe_approved: "Client-safe approved",
};

/* ───────────────────────── build-from-evidence ───────────────────────── */

export interface BuildFromEvidenceResult {
  persona: PersonaRecord;
  trail: EvidenceTrailEntry[];
  /** Brief admin-facing rationale describing how thin or rich the evidence is. */
  rationale: string;
}

/**
 * Generate a cautious draft persona from data already in the OS for this
 * customer. We pull from a small, well-defined surface — no inference from
 * unrelated clients, no fabrication. If the evidence is thin every field
 * is left labelled `needsValidation: true` and the rationale says so.
 */
export async function buildPersonaFromEvidence(
  customerId: string,
  base: PersonaRecord,
): Promise<BuildFromEvidenceResult> {
  const trail: EvidenceTrailEntry[] = [];
  const draft: PersonaRecord = hydratePersona({ ...base });

  // 1. Customer profile
  const { data: customer } = await supabase
    .from("customers")
    .select(
      "full_name, business_name, business_description, service_type, monthly_revenue, goals, stage, lifecycle_state, package_diagnostic, package_implementation",
    )
    .eq("id", customerId)
    .maybeSingle();

  // 2. Diagnostic intake answers
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

  // 3. Connected source statuses
  const { data: integrations } = await supabase
    .from("customer_integrations")
    .select("provider, status")
    .eq("customer_id", customerId)
    .limit(50);

  // 4. Existing insight memory (admin-visible only — we don't leak from other clients)
  const { data: memory } = await supabase
    .from("customer_insight_memory")
    .select("title, summary, related_pillar, client_visible")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .limit(25);

  // 5. Pipeline notes (lightweight)
  const { data: deals } = await supabase
    .from("client_pipeline_deals")
    .select("title, notes, loss_reason")
    .eq("customer_id", customerId)
    .limit(10);

  /* ── Buyer identity ── */
  if (customer?.full_name || customer?.business_name) {
    const ident = [
      customer.full_name ? `${customer.full_name}` : null,
      customer.business_name ? `at ${customer.business_name}` : null,
      customer.service_type ? `(${customer.service_type})` : null,
    ].filter(Boolean).join(" ");
    setSection(draft, "buyer_identity", {
      value: `${ident}. ${customer.business_description ?? ""}`.trim(),
      source: "Customer profile",
      confidence: customer.business_description ? "medium" : "low",
      needsValidation: true,
    });
    trail.push({ source: "Customer profile", detail: "Identity drawn from customer record.", at: new Date().toISOString() });
    if (!draft.name) draft.name = customer.full_name ?? customer.business_name ?? "";
  }

  /* ── Company / segment fit ── */
  const segmentBits: string[] = [];
  if (customer?.service_type) segmentBits.push(`Service type: ${customer.service_type}`);
  if (customer?.monthly_revenue) segmentBits.push(`Reported monthly revenue: ${customer.monthly_revenue}`);
  if (segmentBits.length) {
    setSection(draft, "company_segment_fit", {
      value: segmentBits.join(" · "),
      source: "Customer profile",
      confidence: "medium",
      needsValidation: true,
      fit: "emerging_fit",
    });
    trail.push({ source: "Customer profile", detail: "Segment inferred from service type and revenue range.", at: new Date().toISOString() });
  }

  /* ── Pain urgency from intake ── */
  const painSeed =
    intakeMap.get("primary_pain") ??
    intakeMap.get("biggest_problem") ??
    intakeMap.get("pain_urgency");
  if (painSeed) {
    setSection(draft, "pain_urgency", {
      value: painSeed,
      source: "Diagnostic intake",
      confidence: "medium",
      needsValidation: true,
      fit: "emerging_fit",
    });
    trail.push({ source: "Diagnostic intake", detail: "Pain urgency drawn from intake answers.", at: new Date().toISOString() });
  }

  /* ── Buying trigger ── */
  const triggerSeed = intakeMap.get("buying_trigger") ?? intakeMap.get("why_now");
  if (triggerSeed) {
    setSection(draft, "buying_trigger", {
      value: triggerSeed,
      source: "Diagnostic intake",
      confidence: "medium",
      needsValidation: true,
    });
    trail.push({ source: "Diagnostic intake", detail: "Trigger drawn from 'why now' intake answer.", at: new Date().toISOString() });
  }

  /* ── Desired outcome (from goals) ── */
  if (customer?.goals) {
    setSection(draft, "desired_outcome", {
      value: customer.goals,
      source: "Customer profile · goals",
      confidence: "medium",
      needsValidation: true,
    });
    trail.push({ source: "Customer profile", detail: "Desired outcome seeded from stated goals.", at: new Date().toISOString() });
  }

  /* ── Acquisition channels (from intake lead_sources) ── */
  const channels = intakeMap.get("lead_sources") ?? intakeMap.get("acquisition_channels");
  if (channels) {
    setSection(draft, "acquisition_channels", {
      value: channels,
      source: "Diagnostic intake · lead sources",
      confidence: "low",
      needsValidation: true,
    });
    trail.push({ source: "Diagnostic intake", detail: "Channels drawn from declared lead sources.", at: new Date().toISOString() });
  }

  /* ── Objections (from pipeline loss reasons) ── */
  const lossReasons = (deals ?? [])
    .map((d) => d.loss_reason)
    .filter((s): s is string => !!s && s.trim().length > 0);
  if (lossReasons.length) {
    setSection(draft, "objections", {
      value: `Recurring loss reasons in this client's pipeline:\n• ${Array.from(new Set(lossReasons)).slice(0, 5).join("\n• ")}`,
      source: "Client pipeline · loss reasons",
      confidence: "low",
      needsValidation: true,
    });
    trail.push({ source: "Client pipeline", detail: `${lossReasons.length} loss reason(s) considered.`, at: new Date().toISOString() });
  }

  /* ── Messaging angle (admin-curated; if memory has a client-visible insight, seed it) ── */
  const insightSeed = (memory ?? []).find((m) => m.client_visible && m.summary);
  if (insightSeed?.summary) {
    setSection(draft, "messaging_angle", {
      value: `Lead with: "${insightSeed.title}". ${insightSeed.summary}`,
      source: "Insight memory",
      confidence: "low",
      needsValidation: true,
    });
    trail.push({ source: "Insight memory", detail: "Seeded from a client-safe insight memory entry.", at: new Date().toISOString() });
  }

  /* ── Connected sources note (informational only — not a section) ── */
  if (integrations && integrations.length) {
    trail.push({
      source: "Connected sources",
      detail: `${integrations.length} source(s) on file: ${Array.from(new Set(integrations.map((i) => i.provider))).slice(0, 6).join(", ")}.`,
      at: new Date().toISOString(),
    });
  }

  /* ── Client-safe summary stub (admin must approve before it becomes 'client_safe_approved') ── */
  const ident = draft.sections.buyer_identity.value;
  const pain = draft.sections.pain_urgency.value;
  const outcome = draft.sections.desired_outcome.value;
  if (ident || pain || outcome) {
    draft.clientSafeSummary =
      `${ident ? ident : "This buyer"}. ` +
      `${pain ? `What they’re feeling right now: ${pain}` : ""} ` +
      `${outcome ? `What they want from this engagement: ${outcome}` : ""}`.trim();
  }

  draft.evidenceTrail = [...trail];
  draft.status = deriveStatus(draft);

  const filled = PERSONA_SECTIONS.filter((d) => draft.sections[d.key].value.trim().length > 0).length;
  const rationale =
    filled === 0
      ? "No usable evidence found in the OS yet — start by capturing intake answers or customer goals."
      : filled < 4
      ? `Thin evidence: ${filled} of ${PERSONA_SECTIONS.length} sections seeded. Every field is flagged for validation.`
      : `Drafted ${filled} of ${PERSONA_SECTIONS.length} sections. Validate each before marking client-safe.`;

  return { persona: draft, trail, rationale };
}

function setSection(
  p: PersonaRecord,
  key: PersonaSectionKey,
  patch: Partial<SectionState>,
) {
  const def = PERSONA_SECTIONS.find((d) => d.key === key);
  if (!def) return;
  const prev = p.sections[key] ?? emptySection(def);
  p.sections[key] = {
    ...prev,
    ...patch,
    fit: def.hasFit ? (patch.fit ?? prev.fit ?? "unknown") : undefined,
    clientSafe: def.clientSafeAllowed ? (patch.clientSafe ?? prev.clientSafe ?? def.clientSafeDefault) : false,
    needsValidation: patch.needsValidation ?? true,
  };
}

/* ───────────────────────── client-safe export ───────────────────────── */

/**
 * Build the strict client-safe view of a persona. Sections marked
 * admin-only by the schema are dropped no matter what. Within allowed
 * sections, the per-field clientSafe toggle is honoured.
 */
export function clientSafeView(p: PersonaRecord): {
  summary: string;
  sections: { label: string; value: string }[];
} {
  const allowed = PERSONA_SECTIONS.filter((d) => d.clientSafeAllowed);
  const sections = allowed
    .filter((d) => p.sections[d.key].clientSafe && p.sections[d.key].value.trim().length > 0)
    .map((d) => ({ label: d.label, value: p.sections[d.key].value }));
  return {
    summary: p.clientSafeSummary.trim(),
    sections,
  };
}

/* ───────────────────────── tool_run summary ───────────────────────── */

/**
 * Compact summary stored on `tool_runs.summary` and forwarded to
 * `diagnostic_tool_runs` via the existing ToolRunnerShell pathway.
 */
export function buildPersonaSummary(p: PersonaRecord) {
  const status = deriveStatus(p);
  const score = internalFitScore(p);
  const dom = dominantLevel(p);
  const filled = PERSONA_SECTIONS.filter((d) => p.sections[d.key].value.trim().length > 0).length;
  return {
    status,
    headline: PERSONA_STATUS_LABELS[status],
    band: FIT_LEVELS.find((l) => l.key === dom)?.label ?? "Unknown",
    score,
    sections_filled: filled,
    sections_total: PERSONA_SECTIONS.length,
    has_client_safe_summary: p.clientSafeSummary.trim().length > 0,
    confidence:
      filled >= 8 && p.clientSafeSummary.trim().length > 0
        ? "high"
        : filled >= 5
        ? "medium"
        : "low",
  };
}
