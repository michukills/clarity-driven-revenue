// Legacy shim — kept only so existing benchmark records (PillarAnswers
// keyed by these ids) continue to load. The public /scorecard now uses
// src/lib/scorecard/rubric.ts (conversational, deterministic). Pillar
// titles below use the canonical RGS pillar names from
// src/lib/scorecard/pillars.ts so any historical UI that still imports
// this shim shows the correct labels.
export type PillarAnswers = Record<string, number[]>;

export interface LegacyPillar {
  id: string;
  title: string;
  questions: { text: string }[];
}

export const pillars: LegacyPillar[] = [
  { id: "demand", title: "Demand Generation", questions: Array(5).fill({ text: "" }) },
  { id: "conversion", title: "Revenue Conversion", questions: Array(5).fill({ text: "" }) },
  { id: "operations", title: "Operational Efficiency", questions: Array(5).fill({ text: "" }) },
  { id: "financial", title: "Financial Visibility", questions: Array(5).fill({ text: "" }) },
  // Internal id "owner" matches the public rubric and the canonical pillar id.
  // OS / admin scorecard stores severity records under the alias "independence",
  // which resolves to this same canonical pillar via canonicalIdFor().
  { id: "owner", title: "Owner Independence", questions: Array(5).fill({ text: "" }) },
];
