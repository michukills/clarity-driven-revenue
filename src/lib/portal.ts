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
  // Internal
  { key: "diagnostic_templates", label: "Diagnostic Templates", visibility: "internal" },
  { key: "internal_revenue_worksheets", label: "Internal Revenue Worksheets", visibility: "internal" },
  { key: "internal_scorecards", label: "Internal Scorecards", visibility: "internal" },
  { key: "financial_visibility", label: "Financial Visibility Tools", visibility: "internal" },
  { key: "internal_client_workbooks", label: "Internal Client Workbooks", visibility: "internal" },
  // Customer-facing
  { key: "client_revenue_worksheets", label: "Client Revenue Worksheets", visibility: "customer" },
  { key: "client_implementation_trackers", label: "Client Implementation Trackers", visibility: "customer" },
  { key: "client_scorecard_sheets", label: "Client Scorecard Sheets", visibility: "customer" },
  { key: "customer_financial_worksheets", label: "Customer Financial Worksheets", visibility: "customer" },
  { key: "shared_implementation_tools", label: "Shared Implementation Tools", visibility: "customer" },
  { key: "client_specific", label: "Client-Specific Worksheets", visibility: "customer" },
  // Legacy fallback
  { key: "revenue_worksheets", label: "Revenue Worksheets", visibility: "internal" },
  { key: "scorecards", label: "Scorecards", visibility: "internal" },
] as const;

export const INTERNAL_CATEGORIES = CATEGORIES.filter((c) => c.visibility === "internal");
export const CUSTOMER_CATEGORIES = CATEGORIES.filter((c) => c.visibility === "customer");

export const categoryLabel = (k: string) =>
  CATEGORIES.find((c) => c.key === k)?.label ?? k;

export const TOOL_TYPES = [
  { key: "spreadsheet", label: "Spreadsheet" },
  { key: "worksheet", label: "Worksheet" },
  { key: "pdf", label: "PDF" },
  { key: "image", label: "Image" },
  { key: "link", label: "Link" },
  // legacy
  { key: "sheet", label: "Spreadsheet" },
  { key: "file", label: "File" },
] as const;

export const toolTypeLabel = (k: string) =>
  TOOL_TYPES.find((t) => t.key === k)?.label ?? k;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });