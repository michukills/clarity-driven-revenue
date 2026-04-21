export const STAGES = [
  { key: "lead", label: "Lead" },
  { key: "discovery_scheduled", label: "Discovery Scheduled" },
  { key: "diagnostic_in_progress", label: "Diagnostic In Progress" },
  { key: "diagnostic_delivered", label: "Diagnostic Delivered" },
  { key: "awaiting_decision", label: "Awaiting Decision" },
  { key: "implementation", label: "Implementation" },
  { key: "work_in_progress", label: "Work In Progress" },
  { key: "work_completed", label: "Work Completed" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

export const stageLabel = (k: string) =>
  STAGES.find((s) => s.key === k)?.label ?? k;

export const CATEGORIES = [
  { key: "diagnostic_templates", label: "Diagnostic Templates" },
  { key: "revenue_worksheets", label: "Revenue Worksheets" },
  { key: "financial_visibility", label: "Financial Visibility Tools" },
  { key: "scorecards", label: "Scorecards" },
  { key: "client_specific", label: "Client-Specific Worksheets" },
] as const;

export const categoryLabel = (k: string) =>
  CATEGORIES.find((c) => c.key === k)?.label ?? k;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });