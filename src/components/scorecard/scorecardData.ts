// Legacy shim — kept only so existing benchmark records (PillarAnswers
// keyed by these ids) continue to load. The public /scorecard now uses
// src/lib/scorecard/rubric.ts (conversational, deterministic).
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
  { id: "owner", title: "Owner Independence", questions: Array(5).fill({ text: "" }) },
];
