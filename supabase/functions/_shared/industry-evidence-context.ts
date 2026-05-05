/**
 * IB-H5 — Server-side Industry Evidence Context Builder.
 *
 * Edge-only helper that turns IB-H4 evidence signals (passed in from
 * the admin caller) into a compact, safety-bounded prompt block used
 * by `report-ai-assist` and `diagnostic-ai-followup`.
 *
 * Hard rules enforced by this builder:
 *  - Backend / edge only. Never import from `src/`. Never imported by
 *    frontend code. Never referenced by deterministic scoring code.
 *  - Treats AI strictly as draft assist. The block tells the model the
 *    deterministic 0–1000 score is fixed and cannot be changed.
 *  - Admin-only notes are kept on a clearly labelled section and the
 *    builder never returns them collapsed into client-safe summaries.
 *  - Cannabis / MMJ context is dispensary / cannabis-retail operations
 *    only; HIPAA / clinical / patient framing is forbidden.
 *  - Synthetic / training case studies must never be surfaced as real
 *    proof. This builder accepts no case-study input at all.
 *  - All AI output downstream of this context must remain
 *    `client_visible=false`, `review_required=true`, `ai_assisted=true`,
 *    `score_change_requested=false`.
 */

export type IbH5SignalType =
  | "stable"
  | "visibility_weakness"
  | "slipping"
  | "critical_gap";

export type IbH5Severity = "low" | "medium" | "high" | "critical";

export interface IbH5EvidenceSignal {
  gear: string;
  metricKey: string;
  questionKey: string;
  industryKey?: string | null;
  answerState: "verified" | "incomplete" | "unknown" | "no";
  signalType: IbH5SignalType;
  severity: IbH5Severity;
  clientSafeSummary?: string;
  reportFindingSeed?: string;
  clarificationQuestion?: string;
  adminOnlyNotes?: string;
  relatedFailurePatterns?: string[];
  relatedBenchmarkAnchors?: string[];
}

export interface IbH5RepairCandidate {
  gear: string;
  metricKey: string;
  title: string;
  severity: IbH5Severity;
  belongsTo:
    | "diagnostic_clarification"
    | "implementation"
    | "rgs_control_system";
  clientSafeAction?: string;
  adminOnlyNotes?: string;
}

export interface IbH5BenchmarkAnchor {
  industryKey: string;
  gear: string;
  metricKey: string;
  label: string;
  /** When true the anchor must be presented as interpretive only. */
  needsExternalVerification?: boolean;
}

export interface IbH5GlossaryTerm {
  term: string;
  definition: string;
}

export interface IbH5ContextInput {
  customerId: string;
  reportDraftId?: string | null;
  industryKey?: string | null;
  industryLabel?: string | null;
  signals?: IbH5EvidenceSignal[];
  repairCandidates?: IbH5RepairCandidate[];
  benchmarkAnchors?: IbH5BenchmarkAnchor[];
  glossaryTerms?: IbH5GlossaryTerm[];
}

export interface IbH5ContextResult {
  promptBlock: string;
  /** Structured shape useful for logging / audit. */
  structured: {
    industryKey: string | null;
    industryLabel: string | null;
    signalCount: number;
    repairCandidateCount: number;
    safetyFlags: string[];
  };
}

const BANNED_AI_CLAIMS = [
  "Do not change, estimate, replace, or override the deterministic 0–1000 RGS Stability Score.",
  "Do not invent client revenue, cost, customer count, percentage, name, source, or integration.",
  "Do not present synthetic / training case studies as real customer proof.",
  "Do not produce legal, tax, accounting, HR, healthcare, payroll, insurance, or compliance certification conclusions.",
  "Do not say the business is legally compliant or non-compliant.",
  "Do not certify cannabis / MMJ / MMC compliance.",
  "Do not frame cannabis / MMJ / MMC as healthcare, HIPAA, patient care, clinical workflow, medical billing, or insurance claims.",
  "Frame cannabis / MMJ / MMC strictly as operational visibility and documentation readiness.",
  "Keep admin-only notes admin-only. Do not merge them into client-safe summaries.",
  "Treat unknown / not tracked answers as visibility weakness, never as a pass.",
  "Treat incomplete answers as a slipping system, never as a pass.",
  "All AI output is admin-review-only and must remain client_visible=false until an admin approves.",
];

function isCannabisIndustry(industryKey?: string | null): boolean {
  if (!industryKey) return false;
  const k = industryKey.toLowerCase();
  return (
    k.includes("mmj") ||
    k.includes("cannabis") ||
    k.includes("mmc") ||
    k.includes("dispensary")
  );
}

function joinList(items: string[], max = 8): string {
  if (items.length === 0) return "  (none)";
  return items
    .slice(0, max)
    .map((s) => `  - ${s}`)
    .join("\n");
}

/**
 * Build the admin-only IB-H5 evidence context prompt block plus a
 * structured summary for audit.
 */
export function buildIndustryEvidenceContext(
  input: IbH5ContextInput,
): IbH5ContextResult {
  const signals = (input.signals ?? []).slice(0, 60);
  const candidates = (input.repairCandidates ?? []).slice(0, 30);
  const anchors = (input.benchmarkAnchors ?? []).slice(0, 30);
  const glossary = (input.glossaryTerms ?? []).slice(0, 20);
  const safetyFlags: string[] = [];

  const cannabis = isCannabisIndustry(input.industryKey);
  if (cannabis) safetyFlags.push("cannabis_operational_visibility_only");
  if (anchors.some((a) => a.needsExternalVerification)) {
    safetyFlags.push("benchmarks_interpretive_only");
  }
  if (signals.some((s) => s.signalType === "critical_gap")) {
    safetyFlags.push("critical_gap_present");
  }

  const stable = signals.filter((s) => s.signalType === "stable");
  const slipping = signals.filter((s) => s.signalType === "slipping");
  const visibility = signals.filter(
    (s) => s.signalType === "visibility_weakness",
  );
  const critical = signals.filter((s) => s.signalType === "critical_gap");

  const lines: string[] = [
    "=== IB-H5 Industry Evidence Context (admin-only, AI-assist DRAFT) ===",
    `Customer ID: ${input.customerId}`,
    input.reportDraftId ? `Report draft ID: ${input.reportDraftId}` : "",
    `Industry: ${input.industryLabel ?? input.industryKey ?? "(not confirmed — General fallback)"}`,
    "",
    "Deterministic scoring guarantee (NON-NEGOTIABLE):",
    "  - The 0–1000 RGS Stability Score is fixed by the deterministic scorecard.",
    "  - AI must NOT change, weight, estimate, or recompute it.",
    "  - AI is drafting interpretation only. Admin approves before client sees anything.",
    "",
    "Banned claims:",
    joinList(BANNED_AI_CLAIMS, BANNED_AI_CLAIMS.length),
    "",
    `Stable strengths (verified, ${stable.length}):`,
    joinList(
      stable.map(
        (s) =>
          s.reportFindingSeed ??
          s.clientSafeSummary ??
          `${s.gear} · ${s.metricKey}`,
      ),
    ),
    "",
    `Slipping signals (${slipping.length}):`,
    joinList(
      slipping.map(
        (s) =>
          `${s.gear}/${s.metricKey} (${s.severity}) — ${s.reportFindingSeed ?? s.clientSafeSummary ?? ""}`,
      ),
    ),
    "",
    `Visibility weaknesses (unknown / not tracked, ${visibility.length}):`,
    joinList(
      visibility.map(
        (s) =>
          `${s.gear}/${s.metricKey} — ${s.clarificationQuestion ?? s.clientSafeSummary ?? ""}`,
      ),
    ),
    "",
    `Critical gaps (${critical.length}):`,
    joinList(
      critical.map(
        (s) =>
          `${s.gear}/${s.metricKey} — ${s.reportFindingSeed ?? s.clientSafeSummary ?? ""}`,
      ),
    ),
    "",
    `Repair-map candidates (admin-review draft, ${candidates.length}):`,
    joinList(
      candidates.map(
        (c) =>
          `${c.gear}/${c.metricKey} · ${c.severity} · ${c.belongsTo} — ${c.title}`,
      ),
    ),
    "",
    `Benchmark anchors (interpretive, ${anchors.length}):`,
    joinList(
      anchors.map(
        (a) =>
          `${a.industryKey}/${a.gear}/${a.metricKey} · ${a.label}${a.needsExternalVerification ? " · NEEDS_EXTERNAL_VERIFICATION (interpretive only)" : ""}`,
      ),
    ),
    "",
    `Glossary cues (${glossary.length}):`,
    joinList(glossary.map((g) => `${g.term}: ${g.definition}`)),
  ];

  if (cannabis) {
    lines.push(
      "",
      "Cannabis / MMJ / MMC framing (REQUIRED):",
      "  - Operational visibility and documentation readiness only.",
      "  - NOT healthcare. NOT HIPAA. NOT patient care. NOT clinical workflows.",
      "  - NOT medical billing. NOT insurance claims.",
      "  - Use phrases: 'compliance-sensitive', 'state-specific rules may apply',",
      "    'professional review may be required', 'not legal advice',",
      "    'not a compliance guarantee'.",
    );
  }

  lines.push(
    "",
    "Output expectations:",
    "  - ai_assisted = true",
    "  - review_required = true",
    "  - client_visible = false",
    "  - admin_review_status = 'pending'",
    "  - score_change_requested = false",
    "  - admin_only_notes MUST stay on the admin_only_notes field — never merged into client_safe_draft.",
  );

  return {
    promptBlock: lines.filter(Boolean).join("\n"),
    structured: {
      industryKey: input.industryKey ?? null,
      industryLabel: input.industryLabel ?? null,
      signalCount: signals.length,
      repairCandidateCount: candidates.length,
      safetyFlags,
    },
  };
}

/**
 * Convenience: returns true when the supplied AI output respects the
 * IB-H5 admin-only / score-safety guarantees. Used by tests.
 */
export function isAdminOnlyAiOutput(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.ai_assisted === true &&
    v.review_required === true &&
    v.client_visible === false &&
    v.score_change_requested === false
  );
}
