// P20.21 — Evidence Confidence Labels.
//
// Single source of truth for the four customer-facing evidence levels
// RGS uses across reports, the Stability Snapshot, exports, AI/report
// prompts, and portal helper text.
//
// Rule of thumb: RGS should not sound more certain than the evidence
// supports. "RGS can only diagnose what it can see."
//
// This file is pure / deterministic — no network, no schema changes.
// It only maps existing internal confidence values (High/Medium/Low or
// the absence of evidence) into the four plain-English labels.

import type { SnapshotConfidence } from "./stabilitySnapshot";

export type EvidenceLevel =
  | "Observed"
  | "Indicated"
  | "Possible"
  | "Insufficient Data";

export const EVIDENCE_LEVEL_DESCRIPTIONS: Record<EvidenceLevel, string> = {
  Observed: "Directly supported by the information provided.",
  Indicated:
    "Supported by multiple signals or patterns, but still worth validating.",
  Possible:
    "Worth reviewing, but not enough information yet to treat as confirmed.",
  "Insufficient Data":
    "Not enough information was available to draw a useful conclusion.",
};

/** Short helper line shown on customer-facing surfaces. */
export const EVIDENCE_LEVELS_HELPER_TEXT =
  "Evidence levels show how strongly each finding is supported by the " +
  "information available at the time of review. Observed means RGS saw " +
  "direct support. Indicated means multiple signals point in the same " +
  "direction. Possible means it is worth reviewing. Insufficient Data " +
  "means RGS cannot conclude yet.";

/** Same idea, slightly tighter for PDF/export. */
export const EVIDENCE_LEVELS_PDF_NOTE =
  "Evidence levels are meant to keep the report honest. They separate " +
  "what was directly supported from what should be validated before " +
  "major action. Observed = directly supported. Indicated = multiple " +
  "signals point the same direction. Possible = worth reviewing. " +
  "Insufficient Data = not enough information to conclude yet.";

/**
 * Map an internal SnapshotConfidence (or undefined) into a customer-
 * facing evidence level. Conservative on purpose: "High" -> Observed,
 * "Medium" -> Indicated, "Low" -> Possible, missing -> Insufficient Data.
 */
export function evidenceLevelFromConfidence(
  c: SnapshotConfidence | null | undefined,
): EvidenceLevel {
  if (c === "High") return "Observed";
  if (c === "Medium") return "Indicated";
  if (c === "Low") return "Possible";
  return "Insufficient Data";
}
