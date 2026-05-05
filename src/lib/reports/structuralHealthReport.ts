/**
 * P68 — RGS Structural Health Report™ + 30/60/90 RGS Repair Map™ helpers.
 *
 * Pure helpers (no I/O) used by the deterministic draft engine, the
 * admin PDF export, and the P68 contract test. They consume the
 * existing EvidenceSnapshot (from the report draft engine) and the
 * existing implementation_roadmap_items shape (from
 * `src/lib/implementationRoadmap.ts`) so we do NOT introduce a parallel
 * report system, repair-map table, or storage bucket.
 *
 * Safety rules baked in:
 *   - Client-facing section names use the canonical RGS_NAMES registry.
 *   - Admin-only roadmap fields (`internal_notes`) are never rendered
 *     in client-safe sections.
 *   - Forbidden client-facing phrases (compliance certified, etc.) are
 *     centralised here so the contract test can pin them.
 *   - AI may DRAFT narrative, but the deterministic structure here
 *     never lets AI override score, evidence, or repair-map items.
 */

import { RGS_NAMES } from "@/config/rgsNaming";
import { CLIENT_FORBIDDEN_EVIDENCE_PHRASES } from "@/config/evidenceVault";
import {
  OPERATIONAL_READINESS_PRINCIPLE_LABEL,
  OPERATIONAL_READINESS_PRINCIPLE_BODY,
} from "@/config/architectsShield";
import type {
  DraftSection,
  EvidenceItem,
  EvidenceSnapshot,
} from "./types";

/* ------------------------------------------------------------------ */
/* Canonical section keys/labels                                      */
/* ------------------------------------------------------------------ */

export const STRUCTURAL_HEALTH_REPORT_NAME = RGS_NAMES.diagnosticReport; // "RGS Structural Health Report™"
export const REPAIR_MAP_NAME = RGS_NAMES.repairMap;                       // "RGS Repair Map™"

export const SECTION_KEY_WHAT_IS_WORKING = "what_is_working";
export const SECTION_KEY_WHAT_IS_SLIPPING = "what_is_slipping";
export const SECTION_KEY_REALITY_CHECK_FLAGS = "reality_check_flags";
export const SECTION_KEY_REPAIR_MAP_30 = "repair_map_first_30_days";
export const SECTION_KEY_REPAIR_MAP_60 = "repair_map_days_31_60";
export const SECTION_KEY_REPAIR_MAP_90 = "repair_map_days_61_90";
export const SECTION_KEY_OPERATIONAL_READINESS =
  "operational_readiness_not_regulatory_assurance";
export const SECTION_KEY_NEXT_STEP_OPTIONS = "next_step_options";
export const SECTION_KEY_SCOPE_SAFE = "scope_safe_disclaimer";

/* ------------------------------------------------------------------ */
/* Forbidden client-facing language (P68 §13)                         */
/* ------------------------------------------------------------------ */

export const STRUCTURAL_HEALTH_REPORT_FORBIDDEN_PHRASES = [
  ...CLIENT_FORBIDDEN_EVIDENCE_PHRASES,
  "guaranteed compliance",
  "guaranteed revenue",
  "legal determination",
  "compliance determination",
  "certified valuation",
  "guaranteed business value",
] as const;

/* ------------------------------------------------------------------ */
/* Operational Readiness, Not Regulatory Assurance (client-facing)    */
/* ------------------------------------------------------------------ */

/**
 * Canonical client-facing scope body for RGS Structural Health
 * Reports™. Replaces the prior "Mirror, Not the Map" wording so that
 * approved client-delivered reports use the registry-locked ORNRA
 * language. Reuses the Architect's Shield™ ORNRA body so there is one
 * source of truth.
 */
export const OPERATIONAL_READINESS_REPORT_BODY =
  OPERATIONAL_READINESS_PRINCIPLE_BODY;

export const STRUCTURAL_HEALTH_SCOPE_SAFE_BODY =
  `${RGS_NAMES.parentBrand} is a Business Systems Architect, not an ` +
  "operator. RGS diagnoses, designs, maps, and teaches. The client " +
  "remains responsible for implementation decisions and business " +
  "outcomes. RGS does not provide legal, tax, accounting, compliance, " +
  "fiduciary, lending, valuation, or professional certification advice. " +
  "AI-assisted drafts are reviewed by an RGS reviewer before client " +
  "delivery.";

export const REALITY_CHECK_FLAGS_PLACEHOLDER_BODY =
  "No Reality Check Flags have been reviewed for this report yet. " +
  "Reality Check Flags will appear here after admin review of " +
  "contradictions between owner answers, hard metrics, and evidence.";

export const NEXT_STEP_OPTIONS_BODY =
  `Diagnostic complete — review the ${REPAIR_MAP_NAME} above.\n` +
  `• Optional ${RGS_NAMES.os} project to install the systems flagged in the Repair Map.\n` +
  `• Optional ${RGS_NAMES.monthlyPlatform} for ongoing structural visibility.\n` +
  "• Client-owned implementation work for the items marked as owner action.\n" +
  "• Professional review (legal, CPA, compliance) where flagged.";

/* ------------------------------------------------------------------ */
/* "What Is Working" / "What Is Slipping" derivation                  */
/* ------------------------------------------------------------------ */

function pillarBand(p: EvidenceItem): string | null {
  const v = p.value as { band?: string } | undefined;
  return v?.band ?? null;
}

/** Items the report should highlight as strengths (deterministic). */
export function deriveWhatIsWorking(snap: EvidenceSnapshot): string[] {
  const out: string[] = [];
  const pillars = snap.items.filter(
    (i) => i.source === "scorecard_runs.pillar_results",
  );
  for (const p of pillars) {
    const band = pillarBand(p);
    if (band && /4|5/.test(band)) {
      out.push(
        `Strongest gear signal — ${p.module.replace("Pillar: ", "")}: ${p.detail ?? "stable on current evidence"}.`,
      );
    }
  }
  if ((snap.counts.integrations ?? 0) > 0) {
    out.push(
      "At least one source of truth is connected, which strengthens evidence quality.",
    );
  }
  if ((snap.counts.weekly_checkins ?? 0) >= 3) {
    out.push(
      "Weekly check-in cadence is being maintained — protect this rhythm while fixing other areas.",
    );
  }
  if (!out.length) {
    out.push(
      "No clearly stable structural strengths are evidenced yet. This is a starting point, not a final read.",
    );
  }
  return out;
}

/** Items the report should call out as slipping (deterministic). */
export function deriveWhatIsSlipping(snap: EvidenceSnapshot): string[] {
  const out: string[] = [];
  const pillars = snap.items.filter(
    (i) => i.source === "scorecard_runs.pillar_results",
  );
  for (const p of pillars) {
    const band = pillarBand(p);
    if (band && /1|2/.test(band)) {
      out.push(
        `Weak gear signal — ${p.module.replace("Pillar: ", "")}: ${p.detail ?? "below stability threshold"}.`,
      );
    }
  }
  if (!(snap.counts.integrations ?? 0)) {
    out.push(
      "No accounting, payments, CRM, or payroll source is connected — financial visibility relies on self-reported answers.",
    );
  }
  const ar = snap.items.find((i) => i.source === "invoice_entries");
  const arVal = ar?.value as { count?: number } | undefined;
  if (arVal && (arVal.count ?? 0) > 0) {
    out.push(
      `${arVal.count} overdue invoices on file — receivables are leaking working capital.`,
    );
  }
  const owner = snap.items.filter((i) => i.source === "owner_dependence_items");
  if (owner.length) {
    out.push(
      "Owner-only tasks identified — owner independence layer needs reinforcement before any clean handoff.",
    );
  }
  if (!out.length) {
    out.push(
      "No clear slipping indicators detected from current evidence. Capture more source data to sharpen this read.",
    );
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* RGS Repair Map™ — 30/60/90 grouping                                */
/* ------------------------------------------------------------------ */

/**
 * Minimal shape we need from `implementation_roadmap_items` so this
 * module stays decoupled from supabase. The admin layer maps real rows
 * into this shape before calling renderers.
 */
export interface RepairMapItemForRender {
  id: string;
  title: string;
  client_summary: string | null;
  /** Admin-only — must NEVER appear in client-facing renders. */
  internal_notes: string | null;
  gear: string | null;
  phase: "stabilize" | "install" | "train" | "handoff" | "ongoing_visibility";
  priority: "low" | "medium" | "high" | "critical";
  client_visible: boolean;
  /**
   * Approved + client-safe evidence references to render with the item.
   * Only populate this with rows that have already passed admin approval
   * AND are client-visible AND included in the client report. Anything
   * else must NOT appear here, otherwise "evidence-backed" labels would
   * be misleading.
   */
  client_safe_evidence?: ClientSafeRepairEvidence[];
}

/** Client-safe evidence reference rendered inside a Repair Map item. */
export interface ClientSafeRepairEvidence {
  evidence_id: string;
  title: string | null;
  related_gear: string | null;
  status: string;
  client_visible_note: string | null;
  reviewed_at: string | null;
}

/**
 * Bucket roadmap items into the canonical 30/60/90 RGS Repair Map™ slots.
 * Stabilize → first 30 days. Install → days 31–60. Train/handoff/
 * ongoing_visibility → days 61–90.
 */
export function bucketRepairMap(items: RepairMapItemForRender[]): {
  first30: RepairMapItemForRender[];
  days31to60: RepairMapItemForRender[];
  days61to90: RepairMapItemForRender[];
} {
  const first30: RepairMapItemForRender[] = [];
  const days31to60: RepairMapItemForRender[] = [];
  const days61to90: RepairMapItemForRender[] = [];
  for (const it of items) {
    if (it.phase === "stabilize") first30.push(it);
    else if (it.phase === "install") days31to60.push(it);
    else days61to90.push(it);
  }
  return { first30, days31to60, days61to90 };
}

/**
 * Render a Repair Map slot to a client-safe text block.
 * Strips admin-only fields. If a client_summary is missing we fall back
 * to the title only — never to internal_notes.
 */
export function renderRepairMapSlotClientSafe(
  label: string,
  items: RepairMapItemForRender[],
): string {
  if (!items.length) return `${label}\nNo Repair Map items in this window yet.`;
  const lines = items
    .filter((it) => it.client_visible)
    .map((it) => {
      const summary = it.client_summary?.trim() || it.title;
      const gear = it.gear ? ` · ${it.gear}` : "";
      const safeEv = (it.client_safe_evidence ?? []).filter(Boolean);
      const evidenceLabel = safeEv.length ? ` · evidence-backed` : "";
      const evidenceLines = safeEv.length
        ? "\n" +
          safeEv
            .map((e) => {
              const note = e.client_visible_note
                ? ` — ${e.client_visible_note}`
                : "";
              const status =
                e.status && e.status !== "accepted"
                  ? ` (${e.status.replace(/_/g, " ")})`
                  : "";
              return `   Supported by: ${e.title ?? "Evidence"}${status}${note}`;
            })
            .join("\n")
        : "";
      return `• [${it.priority}] ${it.title}${gear}${evidenceLabel}\n   ${summary}${evidenceLines}`;
    });
  return `${label}\n${lines.join("\n") || "No client-visible items yet."}`;
}

/* ------------------------------------------------------------------ */
/* P68 sections injected into the deterministic draft                 */
/* ------------------------------------------------------------------ */

/**
 * Build the P68-specific sections (What Is Working, What Is Slipping,
 * Reality Check Flags placeholder, Mirror-Not-Map, Scope-Safe
 * disclaimer, Next-Step Options). The deterministic draft engine
 * splices these into the section list for the diagnostic family.
 *
 * Repair Map sections are NOT included here because Repair Map content
 * lives in `implementation_roadmap_items` and is appended at PDF/render
 * time — not at draft generation time — so the report always shows the
 * latest admin-curated 30/60/90 plan.
 */
export function buildStructuralHealthReportSections(
  snap: EvidenceSnapshot,
): DraftSection[] {
  const working = deriveWhatIsWorking(snap);
  const slipping = deriveWhatIsSlipping(snap);
  return [
    {
      key: SECTION_KEY_WHAT_IS_WORKING,
      label: "What Is Working",
      body: working.map((l) => `• ${l}`).join("\n"),
      client_safe: true,
    },
    {
      key: SECTION_KEY_WHAT_IS_SLIPPING,
      label: "What Is Slipping",
      body: slipping.map((l) => `• ${l}`).join("\n"),
      client_safe: true,
    },
    {
      key: SECTION_KEY_REALITY_CHECK_FLAGS,
      // Reality Check Flags™ — placeholder until P70 ships full
      // contradiction detection. Honest "not reviewed yet" copy.
      label: "Reality Check Flags",
      body: REALITY_CHECK_FLAGS_PLACEHOLDER_BODY,
      client_safe: true,
    },
    {
      key: SECTION_KEY_OPERATIONAL_READINESS,
      label: OPERATIONAL_READINESS_PRINCIPLE_LABEL,
      body: OPERATIONAL_READINESS_REPORT_BODY,
      client_safe: true,
    },
    {
      key: SECTION_KEY_NEXT_STEP_OPTIONS,
      label: "Next-Step Options",
      body: NEXT_STEP_OPTIONS_BODY,
      client_safe: true,
    },
    {
      key: SECTION_KEY_SCOPE_SAFE,
      label: "Scope-Safe Disclaimer",
      body: STRUCTURAL_HEALTH_SCOPE_SAFE_BODY,
      client_safe: true,
    },
  ];
}

/**
 * True if the given report draft type is part of the RGS Structural
 * Health Report™ family (i.e. should receive the P68 sections + the
 * RGS Structural Health Report™ branding in the PDF).
 */
export function isStructuralHealthReportType(type: string): boolean {
  return (
    type === "diagnostic" ||
    type === "scorecard" ||
    type === "full_rgs_diagnostic" ||
    type === "fiverr_premium_diagnostic"
  );
}

/**
 * Lightweight scanner used by the contract test and by report-draft
 * publish gating. Returns the offending phrase, if any, found in a
 * piece of client-facing text.
 */
export function findForbiddenClientPhrase(text: string): string | null {
  const lower = text.toLowerCase();
  for (const p of STRUCTURAL_HEALTH_REPORT_FORBIDDEN_PHRASES) {
    if (lower.includes(p.toLowerCase())) return p;
  }
  return null;
}
