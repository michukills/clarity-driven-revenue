/**
 * P18 — Admin-only AI report/diagnostic assist.
 *
 * Public scorecard and diagnostic intake never call AI. This function is
 * admin-triggered from an existing deterministic report draft. It uses the
 * Lovable AI Gateway backend-side, logs token usage, and keeps the draft in
 * review. Nothing is client-facing until an admin approves it.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";
import {
  buildIndustryEvidenceContext,
  type IbH5EvidenceSignal,
  type IbH5RepairCandidate,
  type IbH5BenchmarkAnchor,
  type IbH5GlossaryTerm,
} from "../_shared/industry-evidence-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_VERSION = "ib-h5.report-ai-assist.v3-industry-evidence-context";

// Industry Brain Launch Integration — minimal duplicated mapping (edge
// functions cannot import from src/). Mirrors
// `src/lib/industryBrainContext.ts`. Cannabis = dispensary / regulated
// retail operations only — never healthcare/HIPAA/clinical/patient.
const INDUSTRY_BRAIN_LABEL: Record<string, string> = {
  trade_field_service: "Trades / Services",
  restaurant: "Restaurant / Food Service",
  retail: "Retail",
  mmj_cannabis: "Cannabis / MMJ / MMC",
  general_service: "General Small Business",
  other: "General Small Business",
};
function buildIndustryBrainPromptBlock(industry: string | null | undefined): string {
  const key = industry ?? "general_service";
  const label = INDUSTRY_BRAIN_LABEL[key] ?? "General Small Business";
  const isCannabis = key === "mmj_cannabis";
  const fellBack = !industry || industry === "other" || industry === "general_service";
  const lines = [
    "Industry Brain context (admin review support, NOT final authority):",
    `- Industry: ${label}`,
    fellBack ? "- Industry not confirmed — General fallback is in use." : "",
    "- Use Industry Brain only as background context. Do NOT override deterministic scorecard scoring.",
    "- Do NOT auto-publish. AI output must remain admin-review-only with client_safe = false.",
    isCannabis
      ? "- Cannabis / MMJ / MMC / Rec context is dispensary and regulated retail operations only. NOT healthcare, NOT patient care, NOT HIPAA, NOT insurance claims, NOT medical billing, NOT clinical workflows. Use 'compliance-sensitive', 'state-specific rules may apply', 'professional review may be required', 'not legal advice', 'not a compliance guarantee'."
      : "",
  ];
  return lines.filter(Boolean).join("\n");
}

// AI Assist Wiring Pass — P65 report tier constraints.
// Mirrors src/lib/reports/reportTypeTemplates.ts (edge functions cannot
// import from src/). If the templates change, update both.
type TierAiRules = {
  label: string;
  publicOfferName: string | null;
  isFullRgsDiagnostic: boolean;
  includesFullScorecard: boolean;
  includesFullFiveGearAnalysis: boolean;
  includesRgsStabilitySnapshot: boolean;
  includesPriorityRepairMap: "full" | "lite" | "none";
  includesThirtySixtyNinetyRoadmap: boolean;
  includesImplementationReadinessNotes: boolean;
  scopeBoundary: string;
  approxPageLength: string;
  exclusions: string[];
};

const REPORT_TIER_AI_RULES: Record<string, TierAiRules> = {
  full_rgs_diagnostic: {
    label: "Full RGS Business Stability Diagnostic Report",
    publicOfferName: "Full RGS Business Stability Diagnostic Report",
    isFullRgsDiagnostic: true,
    includesFullScorecard: true,
    includesFullFiveGearAnalysis: true,
    includesRgsStabilitySnapshot: true,
    includesPriorityRepairMap: "full",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: true,
    scopeBoundary:
      "Full RGS Business Stability Diagnostic Report — flagship paid-client diagnostic only. Not implementation, not RGS operating the business.",
    approxPageLength: "20–40+ pages",
    exclusions: [
      "Implementation, custom builds, ongoing advisory are separate.",
      "Not legal, tax, accounting, HR, payroll, insurance, or compliance advice.",
    ],
  },
  fiverr_basic_diagnostic: {
    label: "Business Health Check Report",
    publicOfferName: "Business Health Check",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: true,
    includesPriorityRepairMap: "none",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: false,
    scopeBoundary:
      "Business Health Check Report — high-level Fiverr / standalone stability review.",
    approxPageLength: "3–5 pages",
    exclusions: [
      "No deep repair roadmap.",
      "No full implementation plan.",
      "No implementation, SOPs, dashboards, or software setup.",
      "No ongoing advisory.",
    ],
  },
  fiverr_standard_diagnostic: {
    label: "Business Systems Diagnostic Report",
    publicOfferName: "Business Systems Diagnostic Report",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: true,
    includesPriorityRepairMap: "lite",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: false,
    scopeBoundary:
      "Business Systems Diagnostic Report — systems audit and priority breakdown. Not the Full RGS Business Stability Diagnostic Report.",
    approxPageLength: "6–10 pages",
    exclusions: [
      "No flagship-only source-of-truth sections unless explicitly approved.",
      "No full implementation roadmap, no SOP build.",
      "No custom dashboard or software build.",
      "No ongoing advisory.",
    ],
  },
  fiverr_premium_diagnostic: {
    label: "Priority Repair Roadmap Report",
    publicOfferName: "Priority Repair Roadmap Report",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: true,
    includesPriorityRepairMap: "full",
    includesThirtySixtyNinetyRoadmap: true,
    includesImplementationReadinessNotes: false,
    scopeBoundary:
      "Priority Repair Roadmap Report — premium Fiverr / standalone diagnostic with root-cause notes and repair sequence, intentionally NOT the Full RGS Business Stability Diagnostic Report.",
    approxPageLength: "12–18 pages",
    exclusions: [
      "Not the Full RGS Business Stability Diagnostic Report.",
      "No flagship-only sections unless specifically approved.",
      "No implementation, custom SOPs, dashboards, or software build.",
      "No ongoing advisory.",
    ],
  },
  implementation_report: {
    label: "Implementation Report / Roadmap",
    publicOfferName: "Implementation Report / Roadmap",
    isFullRgsDiagnostic: false,
    includesFullScorecard: false,
    includesFullFiveGearAnalysis: false,
    includesRgsStabilitySnapshot: false,
    includesPriorityRepairMap: "full",
    includesThirtySixtyNinetyRoadmap: false,
    includesImplementationReadinessNotes: true,
    scopeBoundary:
      "Implementation Report / Roadmap — project-based system installation planning. Not unlimited support, not RGS operating the business.",
    approxPageLength: "Variable; typically 8–20 pages",
    exclusions: [
      "Not indefinite or unlimited support.",
      "Not emergency support; activities follow agreed plan.",
      "Not legal, tax, accounting, HR, or compliance advice.",
    ],
  },
};

function buildTierConstraintsBlock(reportType: string): string {
  const tier = REPORT_TIER_AI_RULES[reportType];
  if (!tier) {
    return [
      `Report tier: ${reportType} (legacy / unspecified).`,
      "Treat as bounded. Do NOT add the full 0–1000 Business Stability Scorecard,",
      "do NOT add a full implementation roadmap, and do NOT relabel any SWOT-style",
      "section as 'SWOT Analysis' in client-facing output. Use 'RGS Stability Snapshot'.",
    ].join("\n");
  }
  const lines = [
    `Report tier: ${tier.label}`,
    tier.publicOfferName ? `Public offer name: ${tier.publicOfferName}` : "",
    `Approximate length: ${tier.approxPageLength}`,
    `Scope boundary: ${tier.scopeBoundary}`,
    "",
    "TIER CONSTRAINTS — ENFORCE STRICTLY:",
    `- Full 0–1000 Business Stability Scorecard allowed: ${tier.includesFullScorecard ? "YES" : "NO — do NOT add it"}`,
    `- Full flagship five-gear analysis allowed: ${tier.includesFullFiveGearAnalysis ? "YES" : "NO — do NOT produce it"}`,
    `- RGS Stability Snapshot section allowed: ${tier.includesRgsStabilitySnapshot ? "YES (label MUST be 'RGS Stability Snapshot' — never 'SWOT Analysis')" : "NO — do NOT add it"}`,
    `- Priority Repair Map: ${tier.includesPriorityRepairMap}`,
    `- 30 / 60 / 90 day roadmap allowed: ${tier.includesThirtySixtyNinetyRoadmap ? "YES" : "NO"}`,
    `- Implementation readiness notes allowed: ${tier.includesImplementationReadinessNotes ? "YES" : "NO"}`,
    "",
    "EXCLUSIONS for this tier:",
    ...tier.exclusions.map((e) => `- ${e}`),
    "",
    !tier.isFullRgsDiagnostic
      ? "This is NOT the Full RGS Business Stability Diagnostic Report. Do not write it as if it is. Do not promote it to flagship depth."
      : "",
    "Always preserve the client-facing label 'RGS Stability Snapshot'. Never use 'SWOT Analysis' in client-facing output.",
    "AI output remains an admin draft only. Do not mark anything client_safe = true.",
  ];
  return lines.filter(Boolean).join("\n");
}

const SCOPE_WARNING_RULES = `
AI Assist Wiring Pass — scope warnings:
- AI is admin review assist only. It does NOT replace deterministic scoring, owner judgment, or professional review.
- AI does NOT change access gates, payment status, client visibility, or report approval.
- AI does NOT certify legal, tax, accounting, HR, payroll, insurance, healthcare, or compliance status.
- For cannabis / MMJ / MMC clients: treat as compliance-sensitive business operations only. Not healthcare, not patient care, not HIPAA. Use phrasing like "compliance-sensitive", "state-specific rules may apply", "review with qualified counsel where required", "not a compliance guarantee".
- If data is incomplete, add it to missing_information instead of inventing content.`;

type DraftRow = {
  id: string;
  customer_id: string | null;
  scorecard_run_id: string | null;
  report_type: string;
  title: string | null;
  status: string;
  rubric_version: string;
  evidence_snapshot: unknown;
  draft_sections: { sections?: unknown[] } | null;
  recommendations: unknown[];
  risks: unknown[];
  missing_information: unknown[];
  confidence: string;
  admin_notes: string | null;
  customer_industry?: string | null;
};

type Usage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) throw new Error("Supabase admin environment not configured");
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

function safeJson(value: unknown, max = 22000): string {
  const raw = JSON.stringify(value ?? null);
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max)}\n...[truncated for AI prompt safety]`;
}

async function logRun(
  admin: ReturnType<typeof adminClient>,
  input: {
    feature: string;
    model: string | null;
    status: "succeeded" | "failed" | "disabled";
    draftId: string | null;
    userId: string;
    usage?: Usage | null;
    error?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await admin.from("ai_run_logs").insert({
    feature: input.feature,
    provider: "lovable_ai_gateway",
    model: input.model,
    status: input.status,
    object_table: "report_drafts",
    object_id: input.draftId,
    prompt_tokens: input.usage?.prompt_tokens ?? null,
    completion_tokens: input.usage?.completion_tokens ?? null,
    total_tokens: input.usage?.total_tokens ?? null,
    estimated_cost_usd: null,
    error_message: input.error ?? null,
    metadata: {
      billing_note: "Lovable AI Gateway usage is billed through Lovable Cloud & AI balance.",
      ai_version: AI_VERSION,
      ...(input.metadata ?? {}),
    },
    run_by: input.userId,
  } as any);
}

const REPORT_ASSIST_TOOL = {
  type: "function",
  function: {
    name: "emit_report_assist",
    description:
      "Return an evidence-grounded report draft assist payload. All output remains admin-review-only.",
    parameters: {
      type: "object",
      properties: {
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        rationale: { type: "string" },
        review_notes: { type: "array", items: { type: "string" } },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              label: { type: "string" },
              body: { type: "string" },
              client_safe: { type: "boolean" },
            },
            required: ["key", "label", "body", "client_safe"],
            additionalProperties: false,
          },
        },
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              detail: { type: "string" },
              evidence_refs: { type: "array", items: { type: "string" } },
              inference: { type: "boolean" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              client_safe: { type: "boolean" },
            },
            required: ["id", "title", "detail", "evidence_refs", "inference", "priority", "client_safe"],
            additionalProperties: false,
          },
        },
        risks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              detail: { type: "string" },
              evidence_refs: { type: "array", items: { type: "string" } },
              severity: { type: "string", enum: ["low", "medium", "high"] },
              client_safe: { type: "boolean" },
            },
            required: ["id", "title", "detail", "evidence_refs", "severity", "client_safe"],
            additionalProperties: false,
          },
        },
        missing_information: {
          type: "array",
          items: {
            type: "object",
            properties: {
              area: { type: "string" },
              what_is_missing: { type: "string" },
              why_it_matters: { type: "string" },
            },
            required: ["area", "what_is_missing", "why_it_matters"],
            additionalProperties: false,
          },
        },
      },
      required: ["confidence", "rationale", "review_notes", "sections", "recommendations", "risks", "missing_information"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `You are an admin-only RGS report drafting assistant.

Voice (RGS / Matt voice):
- Calm, plain-English, owner-respecting. Sounds like a friend being honest with a small business owner — not a coach, consultant, agency, or AI.
- Diagnostic, not motivational. No hype. No "unlock", "empower", "optimize", "actionable insights", "next level", "powerful", "transform", "scalable", "leverage", "maximize", "robust", or similar filler.
- Practical and direct. Short sentences. No corporate consulting tone. No flattery. No shaming the owner.
- Where useful, frame findings as: what appears unstable, why it matters, what system area it connects to, and what the next practical step would be — without claiming certainty the evidence does not support.

Rules:
- Use ONLY the provided deterministic draft and evidence snapshot.
- Do not invent revenue, costs, percentages, customer facts, names, sources, or integrations.
- If evidence is missing, say what is missing instead of filling the gap.
- No guaranteed outcomes, no case-study claims, no "fully secure", no "bank-level security", no overpromises.
- Do not provide legal, tax, accounting, HR, or compliance advice.
- Keep all client_safe flags false. A human admin must review before anything is client-facing.
- Preserve section keys when possible.
- Return structured tool output only.

Service boundary (must be reflected in tone, never as a long disclaimer):
- RGS provides diagnosis, structure, visibility, and decision support. RGS does not run the business, manage employees, enforce adoption, replace legal/tax/accounting/HR/payroll/insurance/compliance professionals, or guarantee revenue, stabilization, or business outcomes.
- The owner keeps final decision authority and remains responsible for execution, staffing, compliance, and business outcomes.
- Frame recommendations as suggested next steps, decision points, or areas to review — not directives or guarantees.
- Distinguish likely patterns from proven facts. Prefer phrasing like "based on the information provided, this appears to be a system area worth reviewing" or "this finding should be treated as a starting point until validated against business records or owner review" when certainty is limited.
- If the evidence is incomplete, say so plainly and note that incomplete or inaccurate information may limit the usefulness of the finding.`;

const SCOPE_AND_EVIDENCE_RULES = `
Scope rules:
- A standard Diagnostic covers one primary business, one primary operating unit or location, and one primary product, service, or revenue line. If the evidence suggests multiple locations, brands, major service lines, or revenue models, note that RGS may recommend reviewing them separately or phasing the review so one weak area does not blur the rest of the system. Do not silently combine them.

Evidence + certainty rules:
- When information is incomplete, say so plainly. Do not make the business sound more certain than the evidence supports.
- Prefer "appears", "suggests", "may indicate", "based on the information provided", "this may be worth reviewing", or "there is not enough information to conclude" when evidence is limited.
- Use "observed" only when directly supported by submitted data.
- Do not recommend major action based on weak evidence without saying it should be validated first.
- Do not fill gaps with generic consulting assumptions. Add the missing area to missing_information instead.
- Avoid: "this proves", "this guarantees", "the business will", "the cause is definitely", "this will fix".`;

const DECISION_RIGHTS_RULES = `
Decision rights + execution ownership rules:
- Every recommendation must separate the FINDING from the DECISION the owner needs to make. RGS suggests the likely next step. The owner keeps final decision authority and remains responsible for execution, staffing, compliance, and business outcomes.
- Where it improves clarity (especially in recommendations and risks), structure each item around: (1) what RGS found, (2) why it matters, (3) what system area / gear it connects to, (4) the owner decision needed, (5) the suggested next step, (6) the likely execution owner. Do not force this into every short line if it would crowd the output, but use it for substantive recommendations.
- Name the decision type plainly: approve, assign, decide, review, validate, provide information, choose a priority, involve a licensed professional, execute internally, or request RGS implementation guidance.
- Name the likely execution owner plainly: owner, internal team member, manager, outside professional (accountant / attorney / HR / insurance / IT), or RGS — but only assign execution to RGS if the engagement explicitly contracts that work. Default to the owner or internal team.
- Avoid vague action verbs: "fix this", "improve this", "optimize this", "take action", "implement changes", "drive improvement", "leverage insights".
- Use direct, owner-respecting action language: "decide who owns this", "review this against business records", "assign one person to own follow-up", "choose the standard the team will follow", "validate this finding before making a major change", "use this as the next decision point", "bring this to your accountant / attorney / HR professional if it affects compliance, taxes, payroll, employment, or legal obligations".
- Do not blame or shame the owner. Prefer "if every decision has to come back to the owner, the business may be stable only while the owner is available" over "the owner is the bottleneck".
- Do not say "RGS will fix", "automatically resolved", "system will handle", "guaranteed improvement", or "done for you" unless the feature truly is done for the user.
- Tools, the Revenue Control System, and reports are decision support, not automatic fixes. Frame them that way.`;

const EVIDENCE_LEVEL_RULES = `
Evidence level rules:
- Every major finding, risk, or recommendation should carry one of four evidence levels: Observed, Indicated, Possible, or Insufficient Data. Use these exact labels.
  - Observed: directly supported by submitted information, connected records, scorecard answers, report data, or specific owner-provided evidence.
  - Indicated: supported by multiple answers, patterns, or signals, but not fully proven. Recommend validation before major action.
  - Possible: a plausible concern with weak support. Frame as something to investigate, not act on.
  - Insufficient Data: not enough information to conclude. Name what is missing. Do NOT generate a recommendation as if the issue were known.
- Never invent evidence and never upgrade a weak signal to Observed. Do not use statistical confidence percentages, "the AI is confident", "model confidence", or "probability" language.
- If the structured output cannot carry an explicit label yet, the generated language must still clearly signal evidence strength using phrases like "directly supported", "multiple signals suggest", "may be worth reviewing", or "not enough information to conclude".
- Do not say "this proves", "this confirms", "the business will", "the cause is definitely", "this will fix", or "the data guarantees".
- Evidence levels do not replace the decision-rights structure (finding, why it matters, owner decision needed, suggested next step, execution owner). They sit alongside it to clarify how strongly the finding is supported.
- RGS can only diagnose what it can see. If information is incomplete, the finding should be treated as directional until validated.`;

const FIVE_GEARS_RULES = `
RGS Stability System™ — five gears (use these names exactly):
- Demand Generation: Can the business consistently attract the right kind of attention?
- Revenue Conversion: Can the business turn interest into paying customers through a clear sales process?
- Operational Efficiency: Can the business deliver without constant friction, confusion, or owner intervention?
- Financial Visibility: Can the owner see what is happening financially soon enough to make useful decisions?
- Owner Independence: Can the business keep moving without the owner being the only person who knows what to do?

Gear naming rules:
- When connecting a finding to the RGS Stability System™, use the official five gear names exactly: Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, Owner Independence. Do not rename, shorten, collapse, or invent gears in customer-facing copy. Do not use "Owner Freedom", "Founder Independence", "Owner Leverage", "Cash Visibility", "Marketing", "Sales", "Operations", "Finance", or "Delivery" as a gear name.
- Connect each finding to the most relevant gear or gears. When a finding crosses multiple gears, name the connection clearly rather than choosing a vague catch-all.
- Financial Visibility is not accounting advice. Do not give tax, bookkeeping, or audit guidance under this gear — frame it as whether the owner can see what is happening early enough to make useful decisions.
- Owner Independence is not removing or replacing the owner. Frame it as reducing how much the business depends on the owner having the answer in their head. Avoid "remove the owner", "automate leadership", "hands-off business", "passive business", or "founder freedom".
- Demand Generation is not generic marketing. Avoid "lead gen machine", "growth engine", "traffic optimization", "awareness ecosystem", "unlock demand". Prefer attention, interest, qualified opportunities, right-fit prospects, steady demand.
- Revenue Conversion is not sales hype. Avoid "sales optimization", "conversion hacks", "funnel domination", "close more deals fast", "supercharge sales". Prefer follow-up, sales steps, pricing clarity, offer clarity, close process, turning interest into payment.
- Operational Efficiency is not productivity jargon. Avoid "streamline everything", "operational optimization", "workflow transformation", "seamless execution", "productivity hacks". Prefer delivery, handoffs, scheduling, fulfillment, process standards, friction, work getting stuck, owner intervention.
- The "what this connects to" line in any decision-rights structure must use the official gear names.`;

const SCORE_BAND_RULES = `
0–1000 Business Stability Score — official band names (use these exact labels, do not invent new ones):
- 0–250: Critical Instability
- 251–500: High Risk / Reactive
- 501–700: Functional but Fragile
- 701–850: Stable with Repair Areas
- 851–1000: Strong Operating Stability

Score interpretation rules:
- The Scorecard is a self-reported starting read, not a final diagnosis. The Diagnostic goes deeper by reviewing the information behind the score.
- A low score does not mean the business is hopeless. A high score does not mean the business is perfect or risk-free. Never tell the owner the business is "safe", "stable forever", "guaranteed stable", "doomed", "failing", "broken", or "in immediate emergency" because of a score.
- Use evidence-aware language when explaining a score: "based on your answers", "this score suggests", "appears to", "may indicate", "should be validated".
- Always connect score interpretation back to the five official gears (Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, Owner Independence). When useful, identify which gear areas most likely need attention first.
- Do not imply guaranteed outcomes from a score. Do not promise revenue increases, stabilization, or growth based on the score alone.
- For higher scores, do not make the Diagnostic feel unnecessary. Position the Revenue Control System™ as ongoing visibility that helps monitor slipping gears — it does not replace owner judgment or professional advice.
- Do not invent additional score bands, sub-bands, or alternate label names. Do not output numeric "confidence percentages" alongside the band.`;

function buildPrompt(draft: DraftRow): string {
  return [
    `Report type: ${draft.report_type}`,
    `Title: ${draft.title ?? "Untitled"}`,
    `Rubric version: ${draft.rubric_version}`,
    `Current confidence: ${draft.confidence}`,
    "",
    "Deterministic draft sections:",
    safeJson(draft.draft_sections),
    "",
    "Current recommendations:",
    safeJson(draft.recommendations),
    "",
    "Current risks:",
    safeJson(draft.risks),
    "",
    "Current missing information:",
    safeJson(draft.missing_information),
    "",
    "Evidence snapshot:",
    safeJson(draft.evidence_snapshot),
    "",
    "Task: improve clarity, sequencing, and diagnostic usefulness while staying grounded in the evidence. Return only the structured report assist payload.",
  ].join("\n");
}

function forceAdminOnly(parsed: any) {
  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];
  const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  const risks = Array.isArray(parsed.risks) ? parsed.risks : [];
  const missing = Array.isArray(parsed.missing_information) ? parsed.missing_information : [];

  return {
    confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "low",
    rationale: String(parsed.rationale ?? "AI assist completed; admin review required."),
    review_notes: Array.isArray(parsed.review_notes)
      ? parsed.review_notes.map((n: unknown) => String(n)).slice(0, 8)
      : [],
    sections: sections.slice(0, 8).map((s: any, i: number) => ({
      key: String(s.key ?? `section_${i + 1}`),
      label: String(s.label ?? `Section ${i + 1}`),
      body: String(s.body ?? ""),
      client_safe: false,
    })),
    recommendations: recommendations.slice(0, 8).map((r: any, i: number) => ({
      id: String(r.id ?? `ai_rec_${i + 1}`),
      title: String(r.title ?? "Recommendation"),
      detail: String(r.detail ?? ""),
      evidence_refs: Array.isArray(r.evidence_refs) ? r.evidence_refs.map((x: unknown) => String(x)).slice(0, 8) : [],
      inference: Boolean(r.inference ?? true),
      priority: ["low", "medium", "high"].includes(r.priority) ? r.priority : "medium",
      client_safe: false,
    })),
    risks: risks.slice(0, 8).map((r: any, i: number) => ({
      id: String(r.id ?? `ai_risk_${i + 1}`),
      title: String(r.title ?? "Risk"),
      detail: String(r.detail ?? ""),
      evidence_refs: Array.isArray(r.evidence_refs) ? r.evidence_refs.map((x: unknown) => String(x)).slice(0, 8) : [],
      severity: ["low", "medium", "high"].includes(r.severity) ? r.severity : "medium",
      client_safe: false,
    })),
    missing_information: missing.slice(0, 10).map((m: any) => ({
      area: String(m.area ?? "Missing information"),
      what_is_missing: String(m.what_is_missing ?? ""),
      why_it_matters: String(m.why_it_matters ?? ""),
    })),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let draftId: string | null = null;
  let userId = "unknown";
  const model = Deno.env.get("RGS_AI_MODEL") ?? "google/gemini-2.5-flash";

  try {
    const adminAuth = await requireAdmin(req, corsHeaders);
    if (!adminAuth.ok) return adminAuth.response;
    userId = adminAuth.userId;

    const admin = adminClient();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const body = await req.json().catch(() => ({}));
    draftId = typeof body?.draft_id === "string" ? body.draft_id : null;
    if (!draftId) return json({ error: "draft_id is required" }, 400);

    // IB-H5 — optional admin-supplied evidence context. Already produced
    // server-side or by an admin review surface; AI consumes as DRAFT
    // input only and never auto-publishes.
    const ibSignals: IbH5EvidenceSignal[] = Array.isArray(body?.ib_h5_signals)
      ? (body.ib_h5_signals as IbH5EvidenceSignal[])
      : [];
    const ibCandidates: IbH5RepairCandidate[] = Array.isArray(
      body?.ib_h5_repair_candidates,
    )
      ? (body.ib_h5_repair_candidates as IbH5RepairCandidate[])
      : [];
    const ibAnchors: IbH5BenchmarkAnchor[] = Array.isArray(
      body?.ib_h5_benchmark_anchors,
    )
      ? (body.ib_h5_benchmark_anchors as IbH5BenchmarkAnchor[])
      : [];
    const ibGlossary: IbH5GlossaryTerm[] = Array.isArray(body?.ib_h5_glossary)
      ? (body.ib_h5_glossary as IbH5GlossaryTerm[])
      : [];

    const { data: draft, error: draftError } = await admin
      .from("report_drafts")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();
    if (draftError) return json({ error: draftError.message }, 500);
    if (!draft) return json({ error: "Draft not found" }, 404);

    // Industry Brain Launch Integration — fetch the customer's industry so
    // the AI receives admin-only Industry Brain context. Never overrides
    // deterministic scoring; output stays admin-review-only.
    let customerIndustry: string | null = null;
    if ((draft as DraftRow).customer_id) {
      const { data: cust } = await admin
        .from("customers")
        .select("industry")
        .eq("id", (draft as DraftRow).customer_id as string)
        .maybeSingle();
      customerIndustry = ((cust as { industry?: string | null } | null)?.industry) ?? null;
    }
    (draft as DraftRow).customer_industry = customerIndustry;

    const ibContext = buildIndustryEvidenceContext({
      customerId: ((draft as DraftRow).customer_id as string | null) ?? "",
      reportDraftId: draftId,
      industryKey: customerIndustry,
      industryLabel: customerIndustry
        ? INDUSTRY_BRAIN_LABEL[customerIndustry] ?? null
        : null,
      signals: ibSignals,
      repairCandidates: ibCandidates,
      benchmarkAnchors: ibAnchors,
      glossaryTerms: ibGlossary,
    });

    if (!LOVABLE_API_KEY) {
      await admin
        .from("report_drafts")
        .update({ ai_status: "disabled" } as any)
        .eq("id", draftId);
      await logRun(admin, {
        feature: "report_ai_assist",
        model,
        status: "disabled",
        draftId,
        userId,
        error: "LOVABLE_API_KEY missing",
      });
      return json({
        error: "AI gateway not configured. Deterministic draft remains available.",
        fallback: "deterministic",
      }, 503);
    }

    await admin
      .from("report_drafts")
      .update({ ai_status: "queued" } as any)
      .eq("id", draftId);

    const aiResponse = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\n" + SCOPE_AND_EVIDENCE_RULES + "\n" + DECISION_RIGHTS_RULES + "\n" + EVIDENCE_LEVEL_RULES + "\n" + FIVE_GEARS_RULES + "\n" + SCORE_BAND_RULES + "\n" + SCOPE_WARNING_RULES },
          {
            role: "user",
            content:
              buildTierConstraintsBlock((draft as DraftRow).report_type) +
              "\n\n" +
              buildIndustryBrainPromptBlock(customerIndustry) +
              "\n\n" +
              ibContext.promptBlock +
              "\n\n" +
              buildPrompt(draft as DraftRow),
          },
        ],
        tools: [REPORT_ASSIST_TOOL],
        tool_choice: { type: "function", function: { name: "emit_report_assist" } },
      }),
    });

    if (aiResponse.status === 429) {
      await admin.from("report_drafts").update({ ai_status: "failed" } as any).eq("id", draftId);
      await logRun(admin, { feature: "report_ai_assist", model, status: "failed", draftId, userId, error: "rate_limited" });
      return json({ error: "AI rate limit reached. Deterministic draft remains available." }, 429);
    }
    if (aiResponse.status === 402) {
      await admin.from("report_drafts").update({ ai_status: "failed" } as any).eq("id", draftId);
      await logRun(admin, { feature: "report_ai_assist", model, status: "failed", draftId, userId, error: "workspace_credits_exhausted" });
      return json({ error: "AI workspace credits exhausted. Add Lovable Cloud & AI balance." }, 402);
    }
    if (!aiResponse.ok) {
      const text = await aiResponse.text().catch(() => "");
      await admin.from("report_drafts").update({ ai_status: "failed" } as any).eq("id", draftId);
      await logRun(admin, { feature: "report_ai_assist", model, status: "failed", draftId, userId, error: text.slice(0, 500) });
      return json({ error: "AI assist unavailable. Deterministic draft remains available." }, 502);
    }

    const payload = await aiResponse.json();
    const realUsage = (payload?.usage ?? null) as Usage | null;
    const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      await admin.from("report_drafts").update({ ai_status: "failed" } as any).eq("id", draftId);
      await logRun(admin, { feature: "report_ai_assist", model, status: "failed", draftId, userId, usage: realUsage, error: "missing_tool_args" });
      return json({ error: "AI returned no structured draft assist." }, 502);
    }

    let parsed: unknown;
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      await admin.from("report_drafts").update({ ai_status: "failed" } as any).eq("id", draftId);
      await logRun(admin, { feature: "report_ai_assist", model, status: "failed", draftId, userId, usage: realUsage, error: `malformed_tool_args: ${String(e)}` });
      return json({ error: "AI returned malformed draft assist." }, 502);
    }

    const cleaned = forceAdminOnly(parsed as any);
    const existingNotes = (draft as DraftRow).admin_notes?.trim();
    const aiNotes = [
      `AI assist (${AI_VERSION}) — admin review required.`,
      cleaned.rationale,
      ...cleaned.review_notes.map((n: string) => `- ${n}`),
    ].join("\n");

    const { error: updateError } = await admin
      .from("report_drafts")
      .update({
        generation_mode: "ai_assisted",
        ai_status: "complete",
        ai_model: model,
        ai_version: AI_VERSION,
        draft_sections: { sections: cleaned.sections },
        recommendations: cleaned.recommendations,
        risks: cleaned.risks,
        missing_information: cleaned.missing_information,
        confidence: cleaned.confidence,
        status: "needs_review",
        client_safe: false,
        admin_notes: existingNotes ? `${existingNotes}\n\n---\n${aiNotes}` : aiNotes,
      } as any)
      .eq("id", draftId);
    if (updateError) {
      await logRun(admin, { feature: "report_ai_assist", model, status: "failed", draftId, userId, usage: realUsage, error: updateError.message });
      return json({ error: updateError.message }, 500);
    }

    await admin.from("report_draft_learning_events").insert({
      draft_id: draftId,
      event_type: "section_rewritten",
      before_value: {
        generation_mode: "deterministic",
        status: (draft as DraftRow).status,
      } as any,
      after_value: {
        generation_mode: "ai_assisted",
        model,
        ai_version: AI_VERSION,
        confidence: cleaned.confidence,
      } as any,
      notes: "AI-assisted draft generated. Admin review required before client use.",
      actor_id: userId,
    } as any);

    await logRun(admin, {
      feature: "report_ai_assist",
      model,
      status: "succeeded",
      draftId,
      userId,
      usage: realUsage,
      metadata: { report_type: (draft as DraftRow).report_type },
    });

    return json({
      ok: true,
      draft_id: draftId,
      ai_status: "complete",
      model,
      usage: realUsage,
      review_required: true,
    });
  } catch (e) {
    try {
      const admin = adminClient();
      if (draftId) await admin.from("report_drafts").update({ ai_status: "failed" } as any).eq("id", draftId);
      await logRun(admin, {
        feature: "report_ai_assist",
        model,
        status: "failed",
        draftId,
        userId,
        error: e instanceof Error ? e.message : String(e),
      });
    } catch {
      // Avoid masking the original failure.
    }
    return json({ error: e instanceof Error ? e.message : "AI assist failed" }, 500);
  }
});
