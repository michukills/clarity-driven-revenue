/**
 * P13.5 — Process Breakdown maturity.
 *
 * Shared schema + helpers for the guided, evidence-first Process Breakdown
 * builder. Replaces blank manual fields with 14 prompted sections that
 * surface bottlenecks, waste, customer/revenue impact, SOP candidates,
 * operating controls, target gear, and implementation task suggestions.
 *
 * Storage: plain JSON via the existing ToolRunnerShell pattern, under the
 * canonical diagnostic sub-tool key `process_breakdown_tool`. Diagnostic
 * Workspace already resolves status from `diagnostic_tool_runs` for that
 * key, so no schema changes are required.
 *
 * Trust boundaries:
 *   - Each section carries its own client-safe / admin-only flag.
 *   - Friction, waste, internal SOP candidates, and gear-linked task
 *     suggestions stay admin-only by default.
 *   - AI output is always flagged needsValidation = true and labelled
 *     "AI hypothesis (seed)" until a human confirms.
 */

import { supabase } from "@/integrations/supabase/client";
import type { TargetGear } from "@/lib/gears/targetGear";

/* ───────────────────────── section schema ───────────────────────── */

export type ProcessSectionKey =
  | "process_name"
  | "trigger"
  | "current_steps"
  | "owner"
  | "tools_used"
  | "handoffs"
  | "bottlenecks"
  | "waste"
  | "customer_impact"
  | "revenue_impact"
  | "sop_needed"
  | "operating_control"
  | "target_gear"
  | "implementation_tasks";

export type ConfidenceLevel = "low" | "medium" | "high";

export interface ProcessSectionState {
  /** Plain-language content for this section. */
  value: string;
  /** Where the answer came from (intake, journey, persona, AI hypothesis…). */
  evidenceSource: string;
  /** Confidence in this section. */
  confidence: ConfidenceLevel;
  /** Mark for human validation before sharing. */
  needsValidation: boolean;
  /** What's still missing — guides the next admin question. */
  missingInfo: string;
  /** Per-section client-safe toggle. Friction/waste/etc default admin-only. */
  clientSafe: boolean;
  /** Optional admin-only commentary, never client-visible. */
  adminNote: string;
}

export interface ProcessSectionDef {
  key: ProcessSectionKey;
  label: string;
  hint: string;
  prompt: string;
  /** Default initial client-safe flag. */
  clientSafeDefault: boolean;
  /** Suggested gear this section typically lives in. */
  defaultGear: TargetGear | null;
  /** Marks "scoring" sections that take a gear value, not free text. */
  isGearPicker?: boolean;
}

export const PROCESS_SECTIONS: ProcessSectionDef[] = [
  {
    key: "process_name",
    label: "Process name / area",
    hint: "What process are we breaking down?",
    prompt: "Name the process and the area of the business it sits in (delivery, sales, onboarding, billing…).",
    clientSafeDefault: true,
    defaultGear: 3,
  },
  {
    key: "trigger",
    label: "Trigger / starting event",
    hint: "What kicks the process off?",
    prompt: "The signal, message, or event that starts this process every time it runs.",
    clientSafeDefault: true,
    defaultGear: 3,
  },
  {
    key: "current_steps",
    label: "Current steps",
    hint: "How it actually runs today (not the ideal).",
    prompt: "Numbered or bulleted steps describing what currently happens, end-to-end.",
    clientSafeDefault: true,
    defaultGear: 3,
  },
  {
    key: "owner",
    label: "Owner / role responsible",
    hint: "Who currently owns the outcome.",
    prompt: "Role and (optionally) person. Note if the owner is the business owner — that's a Gear 5 risk signal.",
    clientSafeDefault: true,
    defaultGear: 5,
  },
  {
    key: "tools_used",
    label: "Tools used",
    hint: "Software, spreadsheets, channels, files.",
    prompt: "Every tool and surface this process touches today, including manual workarounds.",
    clientSafeDefault: true,
    defaultGear: 3,
  },
  {
    key: "handoffs",
    label: "Handoffs",
    hint: "Where it passes between people, tools, or teams.",
    prompt: "Each handoff is a leak risk. List them with the parties involved and the artifact that gets handed over.",
    clientSafeDefault: false,
    defaultGear: 3,
  },
  {
    key: "bottlenecks",
    label: "Bottlenecks / friction",
    hint: "Where the process slows, breaks, or relies on heroics.",
    prompt: "The recurring friction points — slow steps, dependencies, single points of failure, ambiguous ownership.",
    clientSafeDefault: false,
    defaultGear: 3,
  },
  {
    key: "waste",
    label: "Waste / rework",
    hint: "Time, money, or trust burned on non-value work.",
    prompt: "Estimate where waste happens (rework, duplicate entry, chasing approvals) and roughly how much.",
    clientSafeDefault: false,
    defaultGear: 3,
  },
  {
    key: "customer_impact",
    label: "Customer impact",
    hint: "What the customer experiences when this breaks.",
    prompt: "Specific moments the customer feels this — delays, surprises, repeat questions, broken promises.",
    clientSafeDefault: true,
    defaultGear: 2,
  },
  {
    key: "revenue_impact",
    label: "Revenue or margin impact",
    hint: "What this process leaks in dollars or margin.",
    prompt: "Connect the bottleneck to revenue at risk, margin compression, or rework cost. Even a rough $/month is useful.",
    clientSafeDefault: false,
    defaultGear: 4,
  },
  {
    key: "sop_needed",
    label: "SOP needed",
    hint: "What documented standard would stabilise this?",
    prompt: "Name the SOP candidate this process needs. One short title + the moment it would be triggered.",
    clientSafeDefault: false,
    defaultGear: 3,
  },
  {
    key: "operating_control",
    label: "Recommended operating control",
    hint: "Recurring control that keeps this process honest.",
    prompt: "Cadence + owner + signal (e.g. weekly handoff audit by ops lead, surfaced in BCC).",
    clientSafeDefault: false,
    defaultGear: 4,
  },
  {
    key: "target_gear",
    label: "Target Gear",
    hint: "Which RGS Stability Gear this process belongs to.",
    prompt: "Gear 1 Demand · Gear 2 Conversion · Gear 3 Operations · Gear 4 Financial Visibility · Gear 5 Owner Independence.",
    clientSafeDefault: false,
    defaultGear: 3,
    isGearPicker: true,
  },
  {
    key: "implementation_tasks",
    label: "Implementation task suggestions",
    hint: "Gear-linked tasks. Suggestions only — never auto-created.",
    prompt: "Concrete tasks you'd assign to fix this process. Keep them small and outcome-led.",
    clientSafeDefault: false,
    defaultGear: 3,
  },
];

/* ───────────────────────── process record ───────────────────────── */

export type ProcessStatus =
  | "not_started"
  | "drafted"
  | "needs_evidence"
  | "ready_for_review"
  | "client_safe_approved";

export interface ProcessEvidenceTrailEntry {
  source: string;
  detail: string;
  at: string;
}

export interface ProcessRecord {
  schema: 1;
  /** Per-section state, keyed by ProcessSectionKey. */
  sections: Record<ProcessSectionKey, ProcessSectionState>;
  /** The single Target Gear chosen for this process (mirrors target_gear section). */
  targetGear: TargetGear | null;
  /** Plain-language summary the client can see. */
  clientSafeSummary: string;
  /** Admin strategy notes — sequencing, levers, escalation. Never client-visible. */
  adminNotes: string;
  /** Where the latest draft drew from. */
  evidenceTrail: ProcessEvidenceTrailEntry[];
  /** Admin's explicit status flag. */
  status: ProcessStatus;
}

const VALID_STATUS = new Set<ProcessStatus>([
  "not_started",
  "drafted",
  "needs_evidence",
  "ready_for_review",
  "client_safe_approved",
]);

export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
  not_started: "Not started",
  drafted: "Drafted",
  needs_evidence: "Needs evidence",
  ready_for_review: "Ready for review",
  client_safe_approved: "Client-safe approved",
};

export function emptySection(def: ProcessSectionDef): ProcessSectionState {
  return {
    value: "",
    evidenceSource: "",
    confidence: "low",
    needsValidation: true,
    missingInfo: "",
    clientSafe: def.clientSafeDefault,
    adminNote: "",
  };
}

export function emptyProcess(): ProcessRecord {
  const sections = {} as Record<ProcessSectionKey, ProcessSectionState>;
  for (const def of PROCESS_SECTIONS) sections[def.key] = emptySection(def);
  return {
    schema: 1,
    sections,
    targetGear: null,
    clientSafeSummary: "",
    adminNotes: "",
    evidenceTrail: [],
    status: "not_started",
  };
}

/**
 * Forward-compatible loader. Accepts the current schema, the legacy
 * `{ process_name, goal, steps: [...] }` shape used by the old manual
 * builder, or any unrecognised JSON (returns an empty process).
 */
export function hydrateProcess(raw: any): ProcessRecord {
  if (!raw || typeof raw !== "object") return emptyProcess();

  // Current schema
  if (raw.schema === 1 && raw.sections && !Array.isArray(raw.sections)) {
    const base = emptyProcess();
    const sections = { ...base.sections };
    for (const def of PROCESS_SECTIONS) {
      const incoming = raw.sections?.[def.key];
      if (incoming && typeof incoming === "object") {
        sections[def.key] = {
          ...emptySection(def),
          ...incoming,
          confidence: (["low", "medium", "high"].includes(incoming.confidence) ? incoming.confidence : "low") as ConfidenceLevel,
          clientSafe: !!incoming.clientSafe,
          needsValidation: incoming.needsValidation !== false,
          value: typeof incoming.value === "string" ? incoming.value : "",
          evidenceSource: typeof incoming.evidenceSource === "string" ? incoming.evidenceSource : "",
          missingInfo: typeof incoming.missingInfo === "string" ? incoming.missingInfo : "",
          adminNote: typeof incoming.adminNote === "string" ? incoming.adminNote : "",
        };
      }
    }
    const tg = raw.targetGear;
    return {
      ...base,
      sections,
      targetGear: tg === 1 || tg === 2 || tg === 3 || tg === 4 || tg === 5 ? tg : null,
      clientSafeSummary: typeof raw.clientSafeSummary === "string" ? raw.clientSafeSummary : "",
      adminNotes: typeof raw.adminNotes === "string" ? raw.adminNotes : "",
      evidenceTrail: Array.isArray(raw.evidenceTrail) ? raw.evidenceTrail.slice(0, 25) : [],
      status: VALID_STATUS.has(raw.status) ? raw.status : "not_started",
    };
  }

  // Legacy shape: { process_name, goal, current_outcome, desired_outcome, steps: [...] }
  if (Array.isArray(raw.steps) || typeof raw.process_name === "string") {
    const base = emptyProcess();
    if (typeof raw.process_name === "string" && raw.process_name.trim()) {
      base.sections.process_name = {
        ...base.sections.process_name,
        value: raw.process_name.trim(),
        evidenceSource: "Legacy manual entry",
        needsValidation: true,
      };
    }
    const stepLines: string[] = [];
    const ownerLines = new Set<string>();
    const toolLines = new Set<string>();
    const bottleLines: string[] = [];
    const fixLines: string[] = [];
    for (const s of (raw.steps as any[]) ?? []) {
      if (!s) continue;
      if (s.name) stepLines.push(`• ${s.name}${s.duration_min ? ` (${s.duration_min} min)` : ""}`);
      if (s.owner) ownerLines.add(s.owner);
      if (s.tools) toolLines.add(s.tools);
      if (s.bottleneck) bottleLines.push(`• ${s.name || "Step"}: ${s.bottleneck}`);
      if (s.fix) fixLines.push(`• ${s.name || "Step"}: ${s.fix}`);
    }
    if (stepLines.length) {
      base.sections.current_steps = {
        ...base.sections.current_steps,
        value: stepLines.join("\n"),
        evidenceSource: "Legacy manual entry",
      };
    }
    if (ownerLines.size) {
      base.sections.owner = {
        ...base.sections.owner,
        value: Array.from(ownerLines).join(", "),
        evidenceSource: "Legacy manual entry",
      };
    }
    if (toolLines.size) {
      base.sections.tools_used = {
        ...base.sections.tools_used,
        value: Array.from(toolLines).join(", "),
        evidenceSource: "Legacy manual entry",
      };
    }
    if (bottleLines.length) {
      base.sections.bottlenecks = {
        ...base.sections.bottlenecks,
        value: bottleLines.join("\n"),
        evidenceSource: "Legacy manual entry",
      };
    }
    if (fixLines.length) {
      base.sections.implementation_tasks = {
        ...base.sections.implementation_tasks,
        value: fixLines.join("\n"),
        evidenceSource: "Legacy manual entry",
      };
    }
    if (typeof raw.goal === "string" && raw.goal.trim()) {
      base.sections.customer_impact = {
        ...base.sections.customer_impact,
        value: `Goal: ${raw.goal.trim()}`,
        evidenceSource: "Legacy manual entry",
      };
    }
    return base;
  }

  return emptyProcess();
}

/* ───────────────────────── status + summary derivation ───────────────────────── */

function sectionHasContent(s: ProcessSectionState): boolean {
  return s.value.trim().length > 0;
}

export function deriveStatus(p: ProcessRecord): ProcessStatus {
  const filled = PROCESS_SECTIONS.filter((d) => sectionHasContent(p.sections[d.key])).length;
  if (filled === 0) return "not_started";
  if (filled < Math.ceil(PROCESS_SECTIONS.length / 2)) return "drafted";
  const validated = PROCESS_SECTIONS.filter(
    (d) => sectionHasContent(p.sections[d.key]) && !p.sections[d.key].needsValidation,
  ).length;
  if (validated >= Math.ceil(filled * 0.7)) {
    return p.clientSafeSummary.trim().length > 0 ? "client_safe_approved" : "ready_for_review";
  }
  return "needs_evidence";
}

export function buildProcessSummary(p: ProcessRecord) {
  const status = deriveStatus(p);
  const filled = PROCESS_SECTIONS.filter((d) => sectionHasContent(p.sections[d.key])).length;
  const bottleneckFlagged = sectionHasContent(p.sections.bottlenecks) || sectionHasContent(p.sections.waste);
  return {
    status,
    headline: PROCESS_STATUS_LABELS[status],
    sections_filled: filled,
    sections_total: PROCESS_SECTIONS.length,
    has_client_safe_summary: p.clientSafeSummary.trim().length > 0,
    target_gear: p.targetGear,
    bottleneck_flagged: bottleneckFlagged,
    sop_candidate: p.sections.sop_needed.value.trim().length > 0,
    operating_control: p.sections.operating_control.value.trim().length > 0,
    confidence:
      filled >= 10 && p.clientSafeSummary.trim().length > 0
        ? "high"
        : filled >= 6
        ? "medium"
        : "low",
  };
}

/* ───────────────────────── client-safe export ───────────────────────── */

export function clientSafeView(p: ProcessRecord): {
  summary: string;
  sections: { label: string; value: string }[];
} {
  const sections = PROCESS_SECTIONS
    .filter((d) => p.sections[d.key].clientSafe && p.sections[d.key].value.trim())
    .filter((d) => d.key !== "target_gear") // gear stays admin-facing
    .map((d) => ({ label: d.label, value: p.sections[d.key].value }));
  return { summary: p.clientSafeSummary.trim(), sections };
}

/* ───────────────────────── build-from-evidence ───────────────────────── */

export interface BuildFromEvidenceResult {
  process: ProcessRecord;
  trail: ProcessEvidenceTrailEntry[];
  rationale: string;
}

function setSection(
  p: ProcessRecord,
  key: ProcessSectionKey,
  patch: Partial<ProcessSectionState>,
) {
  const def = PROCESS_SECTIONS.find((d) => d.key === key);
  if (!def) return;
  const prev = p.sections[key] ?? emptySection(def);
  // Don't overwrite a non-empty value the admin already wrote.
  if (patch.value && prev.value.trim() && patch.value !== prev.value) {
    return;
  }
  p.sections[key] = {
    ...prev,
    ...patch,
    needsValidation: patch.needsValidation ?? true,
  };
}

/**
 * Generate a cautious draft process from data already in the OS for this
 * customer. Pulls from this customer's surface only — profile, latest
 * persona, latest journey, intake, pipeline notes, integrations, insight
 * memory, recent tasks/checklist items. Thin evidence keeps every section
 * flagged for validation.
 */
export async function buildProcessFromEvidence(
  customerId: string,
  base: ProcessRecord,
): Promise<BuildFromEvidenceResult> {
  const trail: ProcessEvidenceTrailEntry[] = [];
  const draft: ProcessRecord = hydrateProcess({ ...base });
  const now = () => new Date().toISOString();

  // 1. Customer profile
  const { data: customer } = await supabase
    .from("customers")
    .select("full_name, business_name, business_description, service_type, monthly_revenue, goals, stage, lifecycle_state")
    .eq("id", customerId)
    .maybeSingle();

  // 2. Latest persona run
  const { data: personaRuns } = await supabase
    .from("tool_runs")
    .select("data, summary, updated_at")
    .eq("tool_key", "buyer_persona_tool")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false })
    .limit(1);
  const latestPersona: any = (personaRuns ?? [])[0]?.data ?? null;

  // 3. Latest journey run
  const { data: journeyRuns } = await supabase
    .from("tool_runs")
    .select("data, summary, updated_at")
    .eq("tool_key", "customer_journey_mapper")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false })
    .limit(1);
  const latestJourney: any = (journeyRuns ?? [])[0]?.data ?? null;

  // 4. Diagnostic intake answers
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

  // 5. Connected sources (tools the team uses)
  const { data: integrations } = await supabase
    .from("customer_integrations")
    .select("provider, status")
    .eq("customer_id", customerId)
    .limit(50);

  // 6. Insight memory (operational notes)
  const { data: memory } = await supabase
    .from("customer_insight_memory")
    .select("title, summary, related_pillar, client_visible, target_gear")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .limit(25);

  // 7. Recent tasks / checklist (existing implementation context)
  const { data: tasks } = await supabase
    .from("customer_tasks")
    .select("title, status, target_gear")
    .eq("customer_id", customerId)
    .limit(25);

  /* ── Process name / area ── */
  const focusProcess =
    intakeMap.get("process_focus") ??
    intakeMap.get("priority_process") ??
    intakeMap.get("biggest_operational_pain");
  if (focusProcess) {
    setSection(draft, "process_name", {
      value: focusProcess.split("\n")[0].slice(0, 120),
      evidenceSource: "Diagnostic intake · process focus",
      confidence: "medium",
    });
    trail.push({ source: "Diagnostic intake", detail: "Process name seeded from declared focus.", at: now() });
  } else if (customer?.service_type) {
    setSection(draft, "process_name", {
      value: `${customer.service_type} delivery`,
      evidenceSource: "Customer profile · service type",
      confidence: "low",
    });
    trail.push({ source: "Customer profile", detail: "Process name fallback from service type.", at: now() });
  }

  /* ── Trigger ── */
  const triggerHint = intakeMap.get("process_trigger") ?? intakeMap.get("intake_trigger");
  if (triggerHint) {
    setSection(draft, "trigger", {
      value: triggerHint,
      evidenceSource: "Diagnostic intake · trigger",
      confidence: "medium",
    });
    trail.push({ source: "Diagnostic intake", detail: "Trigger seeded from intake.", at: now() });
  }

  /* ── Owner ── */
  const ownerHint = intakeMap.get("process_owner") ?? intakeMap.get("operations_lead");
  if (ownerHint) {
    setSection(draft, "owner", {
      value: ownerHint,
      evidenceSource: "Diagnostic intake · owner",
      confidence: "medium",
    });
    trail.push({ source: "Diagnostic intake", detail: "Owner seeded from intake.", at: now() });
  } else if (customer?.full_name) {
    setSection(draft, "owner", {
      value: `${customer.full_name} (likely owner-operator — Gear 5 risk)`,
      evidenceSource: "Customer profile",
      confidence: "low",
    });
    trail.push({ source: "Customer profile", detail: "Owner fallback assumes owner-operator.", at: now() });
  }

  /* ── Tools used ── */
  const toolNames = (integrations ?? []).map((i) => i.provider).filter(Boolean);
  if (toolNames.length) {
    setSection(draft, "tools_used", {
      value: toolNames.join(", "),
      evidenceSource: "Connected sources",
      confidence: "medium",
    });
    trail.push({ source: "Connected sources", detail: `${toolNames.length} declared tool(s).`, at: now() });
  }

  /* ── Bottlenecks / friction (from intake or journey friction) ── */
  const intakeBottle =
    intakeMap.get("biggest_bottleneck") ??
    intakeMap.get("operational_bottleneck") ??
    intakeMap.get("biggest_problem");
  let journeyFriction = "";
  if (latestJourney?.stages && typeof latestJourney.stages === "object") {
    const lines: string[] = [];
    for (const [k, v] of Object.entries(latestJourney.stages as Record<string, any>)) {
      if (v?.frictionPoint && typeof v.frictionPoint === "string" && v.frictionPoint.trim()) {
        lines.push(`• ${k}: ${v.frictionPoint.trim()}`);
      }
    }
    journeyFriction = lines.slice(0, 5).join("\n");
  }
  const bottleValue = [intakeBottle, journeyFriction].filter(Boolean).join("\n\n").trim();
  if (bottleValue) {
    setSection(draft, "bottlenecks", {
      value: bottleValue,
      evidenceSource: journeyFriction ? "Journey · friction + Diagnostic intake" : "Diagnostic intake · bottleneck",
      confidence: "medium",
    });
    trail.push({ source: "Journey + intake", detail: "Bottlenecks seeded from journey friction and intake.", at: now() });
  }

  /* ── Customer impact (from journey customer-facing stages) ── */
  let customerImpact = "";
  const cjStages = latestJourney?.stages;
  if (cjStages) {
    const candidate = cjStages.delivery?.buyerMindset ?? cjStages.onboarding?.buyerMindset;
    if (typeof candidate === "string" && candidate.trim()) customerImpact = candidate.trim();
  }
  if (!customerImpact) {
    const personaPain =
      latestPersona?.persona?.sections?.pain?.value ??
      latestPersona?.sections?.pain?.value;
    if (typeof personaPain === "string" && personaPain.trim()) customerImpact = personaPain.trim();
  }
  if (customerImpact) {
    setSection(draft, "customer_impact", {
      value: customerImpact,
      evidenceSource: latestJourney ? "Journey · delivery / onboarding mindset" : "Buyer Persona · pain",
      confidence: "low",
    });
    trail.push({ source: "Journey / Persona", detail: "Customer impact seeded from journey or persona.", at: now() });
  }

  /* ── Revenue impact ── */
  const revenueHint = intakeMap.get("revenue_at_risk") ?? intakeMap.get("monthly_leakage_estimate");
  if (revenueHint) {
    setSection(draft, "revenue_impact", {
      value: revenueHint,
      evidenceSource: "Diagnostic intake · revenue risk",
      confidence: "low",
    });
    trail.push({ source: "Diagnostic intake", detail: "Revenue impact seeded from intake estimate.", at: now() });
  } else if (customer?.monthly_revenue) {
    setSection(draft, "revenue_impact", {
      value: `Baseline monthly revenue: $${Number(customer.monthly_revenue).toLocaleString()}. Quantify what % this process is putting at risk.`,
      evidenceSource: "Customer profile · monthly revenue",
      confidence: "low",
    });
    trail.push({ source: "Customer profile", detail: "Revenue impact stub from baseline revenue.", at: now() });
  }

  /* ── SOP needed (from insight memory titled like SOPs) ── */
  const sopMemory = (memory ?? []).find((m) =>
    /sop|standard|playbook|checklist/i.test(`${m.title ?? ""} ${m.summary ?? ""}`),
  );
  if (sopMemory) {
    setSection(draft, "sop_needed", {
      value: `${sopMemory.title}\n${sopMemory.summary ?? ""}`.trim(),
      evidenceSource: "Insight memory",
      confidence: "low",
    });
    trail.push({ source: "Insight memory", detail: "SOP candidate seeded from existing memory note.", at: now() });
  }

  /* ── Implementation task suggestions (from existing tasks) ── */
  if (tasks && tasks.length) {
    const open = tasks.filter((t: any) => t.status !== "done").slice(0, 5);
    if (open.length) {
      setSection(draft, "implementation_tasks", {
        value: open.map((t: any) => `• ${t.title}${t.target_gear ? ` (G${t.target_gear})` : ""}`).join("\n"),
        evidenceSource: "Customer tasks (existing)",
        confidence: "low",
      });
      trail.push({ source: "Customer tasks", detail: `${open.length} open task(s) considered as suggestions.`, at: now() });
    }
  }

  /* ── Target gear inference (most-cited gear from memory + tasks) ── */
  const gearVotes: Record<number, number> = {};
  for (const m of memory ?? []) if (m.target_gear) gearVotes[m.target_gear] = (gearVotes[m.target_gear] ?? 0) + 1;
  for (const t of tasks ?? []) if ((t as any).target_gear) gearVotes[(t as any).target_gear] = (gearVotes[(t as any).target_gear] ?? 0) + 1;
  const topGear = Object.entries(gearVotes).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (topGear) {
    const g = Number(topGear);
    if (g >= 1 && g <= 5) {
      draft.targetGear = g as TargetGear;
      setSection(draft, "target_gear", {
        value: `G${g}`,
        evidenceSource: "Insight memory + tasks",
        confidence: "low",
      });
      trail.push({ source: "Memory + tasks", detail: `Target gear inferred as G${g}.`, at: now() });
    }
  } else {
    draft.targetGear = draft.targetGear ?? 3;
  }

  /* ── Client-safe summary stub ── */
  const filled = PROCESS_SECTIONS.filter((d) => sectionHasContent(draft.sections[d.key]));
  if (filled.length > 0 && !draft.clientSafeSummary.trim()) {
    draft.clientSafeSummary =
      `Draft process breakdown for ${customer?.business_name ?? customer?.full_name ?? "this client"}. ` +
      `${filled.length} of ${PROCESS_SECTIONS.length} sections seeded — friction, waste, and operating controls still need validation.`;
  }

  draft.evidenceTrail = [...trail];
  draft.status = deriveStatus(draft);

  const filledCount = filled.length;
  const rationale =
    filledCount === 0
      ? "No usable evidence found in the OS yet — capture intake, persona, or journey first."
      : filledCount < 4
      ? `Thin evidence: ${filledCount} of ${PROCESS_SECTIONS.length} sections seeded. Every field is flagged for validation.`
      : `Drafted ${filledCount} of ${PROCESS_SECTIONS.length} sections. Validate each before marking client-safe.`;

  return { process: draft, trail, rationale };
}

/* ───────────────────────── AI seed merge ───────────────────────── */

export interface AiSeedProcessSection {
  key?: ProcessSectionKey;
  value?: string;
  evidence_source?: string;
  client_safe?: boolean;
}

export interface AiSeedProcess {
  confidence?: ConfidenceLevel;
  rationale?: string;
  evidence_used?: string[];
  missing_validation?: string[];
  sections?: AiSeedProcessSection[];
  target_gear?: number | null;
  client_safe_summary?: string;
  admin_strategy_notes?: string;
}

/**
 * Merge an AI seed payload into an existing process record. Existing
 * non-empty values are preserved unless `overwrite` is true. Every merged
 * field is flagged needsValidation = true and labelled as a hypothesis.
 * Friction / waste / SOP / control / tasks remain admin-only by default.
 */
export function mergeAiSeedIntoProcess(
  base: ProcessRecord,
  ai: AiSeedProcess,
  options: { overwrite?: boolean } = {},
): { process: ProcessRecord; trail: ProcessEvidenceTrailEntry[] } {
  const overwrite = !!options.overwrite;
  const draft: ProcessRecord = hydrateProcess({ ...base });
  const now = new Date().toISOString();
  const trail: ProcessEvidenceTrailEntry[] = [];
  const conf: ConfidenceLevel = (ai.confidence as ConfidenceLevel) ?? "low";

  for (const incoming of ai.sections ?? []) {
    const def = PROCESS_SECTIONS.find((d) => d.key === incoming.key);
    if (!def) continue;
    const value = (incoming.value ?? "").trim();
    if (!value) continue;
    const prev = draft.sections[def.key];
    const writable = overwrite || !prev.value.trim();
    if (!writable) continue;
    draft.sections[def.key] = {
      ...prev,
      value,
      evidenceSource: incoming.evidence_source?.trim() || "AI hypothesis (seed)",
      confidence: conf,
      needsValidation: true,
      // Friction / waste / SOP / control / tasks stay admin-only no matter what AI says.
      clientSafe:
        typeof incoming.client_safe === "boolean"
          ? incoming.client_safe && def.clientSafeDefault
          : prev.clientSafe,
    };
  }

  const tg = ai.target_gear;
  if (tg === 1 || tg === 2 || tg === 3 || tg === 4 || tg === 5) {
    if (overwrite || draft.targetGear === null) {
      draft.targetGear = tg as TargetGear;
      const prev = draft.sections.target_gear;
      if (overwrite || !prev.value.trim()) {
        draft.sections.target_gear = {
          ...prev,
          value: `G${tg}`,
          evidenceSource: "AI hypothesis (seed)",
          confidence: conf,
          needsValidation: true,
        };
      }
    }
  }

  if (ai.client_safe_summary && (overwrite || !draft.clientSafeSummary.trim())) {
    draft.clientSafeSummary = `Hypothesis process breakdown — pending validation.\n\n${ai.client_safe_summary.trim()}`;
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
    source: "AI Process Seed",
    detail: ai.rationale?.trim() || "Hypothesis process generated from admin seed.",
    at: now,
  });
  draft.evidenceTrail = [...draft.evidenceTrail, ...trail].slice(-25);
  draft.status = deriveStatus(draft);

  return { process: draft, trail };
}