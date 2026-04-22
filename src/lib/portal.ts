// Stage groups
// shared: every customer flows through these first
// diagnostic: split for diagnostic-only clients
// implementation: split for clients who add the implementation engagement
export type StageGroup = "shared" | "diagnostic" | "implementation";

export const STAGES = [
  // Shared funnel
  { key: "lead", label: "Lead", group: "shared" as StageGroup },
  { key: "discovery_scheduled", label: "Discovery Scheduled", group: "shared" as StageGroup },
  { key: "discovery_completed", label: "Discovery Completed", group: "shared" as StageGroup },
  { key: "proposal_sent", label: "Proposal Sent", group: "shared" as StageGroup },
  { key: "diagnostic_paid", label: "Diagnostic Paid", group: "shared" as StageGroup },
  { key: "diagnostic_in_progress", label: "Diagnostic In Progress", group: "shared" as StageGroup },
  { key: "diagnostic_delivered", label: "Diagnostic Delivered", group: "shared" as StageGroup },
  { key: "decision_pending", label: "Decision Pending", group: "shared" as StageGroup },
  // Diagnostic-only track
  { key: "diagnostic_complete", label: "Diagnostic Complete", group: "diagnostic" as StageGroup },
  { key: "follow_up_nurture", label: "Follow-Up / Nurture", group: "diagnostic" as StageGroup },
  { key: "closed", label: "Closed", group: "diagnostic" as StageGroup },
  // Implementation track
  { key: "implementation_added", label: "Implementation Added", group: "implementation" as StageGroup },
  { key: "implementation_onboarding", label: "Implementation Onboarding", group: "implementation" as StageGroup },
  { key: "tools_assigned", label: "Tools Assigned", group: "implementation" as StageGroup },
  { key: "client_training_setup", label: "Client Training / Setup", group: "implementation" as StageGroup },
  { key: "implementation_active", label: "Implementation Active", group: "implementation" as StageGroup },
  { key: "waiting_on_client", label: "Waiting on Client", group: "implementation" as StageGroup },
  { key: "review_revision_window", label: "Review / Revision Window", group: "implementation" as StageGroup },
  { key: "implementation_complete", label: "Implementation Complete", group: "implementation" as StageGroup },
  // Legacy compatibility (older records may still reference these)
  { key: "awaiting_decision", label: "Awaiting Decision", group: "shared" as StageGroup },
  { key: "implementation", label: "Implementation", group: "implementation" as StageGroup },
  { key: "work_in_progress", label: "Work In Progress", group: "implementation" as StageGroup },
  { key: "work_completed", label: "Work Completed", group: "implementation" as StageGroup },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

export const stageLabel = (k: string) =>
  STAGES.find((s) => s.key === k)?.label ?? k;

export const SHARED_STAGES = STAGES.filter((s) => s.group === "shared" && s.key !== "awaiting_decision");
export const DIAGNOSTIC_STAGES = STAGES.filter((s) => s.group === "diagnostic");
export const IMPLEMENTATION_STAGES = STAGES.filter(
  (s) => s.group === "implementation" && !["implementation", "work_in_progress", "work_completed"].includes(s.key),
);

export const IMPLEMENTATION_STAGE_KEYS = new Set(IMPLEMENTATION_STAGES.map((s) => s.key));

export const isImplementationStage = (k?: string | null) =>
  !!k && IMPLEMENTATION_STAGE_KEYS.has(k as any);

// Status helpers
export const DIAGNOSTIC_STATUS = [
  { key: "not_started", label: "Not Started" },
  { key: "in_progress", label: "In Progress" },
  { key: "delivered", label: "Delivered" },
  { key: "complete", label: "Complete" },
] as const;

export const IMPLEMENTATION_STATUS = [
  { key: "none", label: "Not Added" },
  { key: "onboarding", label: "Onboarding" },
  { key: "active", label: "Active" },
  { key: "waiting_client", label: "Waiting on Client" },
  { key: "complete", label: "Complete" },
] as const;

export const PAYMENT_STATUS = [
  { key: "unpaid", label: "Unpaid" },
  { key: "diagnostic_paid", label: "Diagnostic Paid" },
  { key: "implementation_paid", label: "Implementation Paid" },
  { key: "refunded", label: "Refunded" },
] as const;

export const labelOf = (list: readonly { key: string; label: string }[], k?: string | null) =>
  list.find((s) => s.key === k)?.label ?? k ?? "—";

// Built-in internal RGS tools (placeholders until admin adds real assets)
export const INTERNAL_TOOL_PLACEHOLDERS = [
  { key: "rgs_stability_scorecard", title: "RGS Stability Scorecard", description: "Score a business across the 5 RGS pillars to surface foundational risk." },
  { key: "revenue_leak_finder", title: "Revenue Leak Detection", description: "Diagnose where money is leaking between offer, sales, and delivery." },
  { key: "buyer_persona_tool", title: "Buyer Persona Tool", description: "Build precise buyer profiles tied to revenue motion." },
  { key: "customer_journey_mapper", title: "Customer Journey Mapper", description: "Map the full lifecycle from awareness to retention." },
  { key: "process_breakdown_tool", title: "Process Breakdown Tool", description: "Break a delivery process into steps, owners, and bottlenecks." },
] as const;

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