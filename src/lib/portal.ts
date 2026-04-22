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
  // Brand Architecture Pass — display titles use the proprietary RGS naming.
  // `key` values are stable (used in tool_runs.tool_key, routes, RLS, etc.)
  // and MUST NOT change. Only `title` / `description` are user-facing.
  { key: "rgs_stability_scorecard", title: "Business Stability Index™", description: "Score a business across the 5 RGS pillars to surface foundational risk and stability gaps." },
  { key: "revenue_leak_finder", title: "Revenue Leak Detection Engine™", description: "Diagnose where money is leaking across demand, capture, conversion, pricing, delivery, retention, financial visibility, and owner dependency." },
  { key: "buyer_persona_tool", title: "Buyer Intelligence Engine™", description: "Build precise buyer profiles tied to revenue motion." },
  { key: "customer_journey_mapper", title: "Customer Journey Mapping System™", description: "Map the full lifecycle from awareness to retention." },
  { key: "process_breakdown_tool", title: "Process Clarity Engine™", description: "Break a delivery process into steps, owners, and bottlenecks." },
] as const;

// Canonical aliases — legacy DB resource titles that represent the same RGS
// concept as a built-in core tool. These DB rows are hidden from Tool
// Distribution to prevent duplicate cards, but their data (and any
// resource_assignments / tool_runs referencing them) is preserved.
export const CORE_TOOL_TITLE_ALIASES: Record<string, string[]> = {
  rgs_stability_scorecard: [
    "rgs stability scorecard",
    "stability scorecard",
    "business stability index",
    "business stability index™",
  ],
  revenue_leak_finder: [
    "revenue leak detection system",
    "revenue leak detection",
    "revenue leak finder",
    "revenue leak detection (client view)",
    "revenue leak detection engine",
    "revenue leak detection engine™",
  ],
  buyer_persona_tool: [
    "buyer persona tool",
    "buyer persona",
    "buyer intelligence engine",
    "buyer intelligence engine™",
  ],
  customer_journey_mapper: [
    "customer journey mapper",
    "customer journey",
    "customer journey mapping system",
    "customer journey mapping system™",
  ],
  process_breakdown_tool: [
    "process breakdown tool",
    "process breakdown",
    "process clarity engine",
    "process clarity engine™",
  ],
};

const ALIAS_TITLE_TO_CORE_KEY: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [k, list] of Object.entries(CORE_TOOL_TITLE_ALIASES)) {
    for (const t of list) m[t.toLowerCase().trim()] = k;
  }
  return m;
})();

/** Returns the core tool key if this title matches a built-in RGS tool, else null. */
export const coreKeyForTitle = (title: string | null | undefined): string | null => {
  if (!title) return null;
  return ALIAS_TITLE_TO_CORE_KEY[title.toLowerCase().trim().replace(/\s+/g, " ")] || null;
};

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

// Tool audience — who the tool is intended for.
// Stored on resources.tool_audience.
export type ToolAudience = "internal" | "diagnostic_client" | "addon_client";

export const TOOL_AUDIENCES: { value: ToolAudience; label: string; short: string; description: string }[] = [
  {
    value: "internal",
    label: "Internal",
    short: "INTERNAL",
    description: "Used by RGS admins. Never visible to clients.",
  },
  {
    value: "diagnostic_client",
    label: "Client · Diagnostic",
    short: "CLIENT · DIAGNOSTIC",
    description: "Available to diagnostic-only clients. Simpler, guided, limited scope.",
  },
  {
    value: "addon_client",
    label: "Client · Add-On",
    short: "CLIENT · ADD-ON",
    description: "For clients who purchased implementation / add-ons. Full depth.",
  },
];

export const toolAudienceLabel = (k?: string | null) =>
  TOOL_AUDIENCES.find((a) => a.value === k)?.label ?? "Internal";

export const toolAudienceShort = (k?: string | null) =>
  TOOL_AUDIENCES.find((a) => a.value === k)?.short ?? "INTERNAL";

// Tool category — drives stage-based auto-assignment and client portal grouping.
export type ToolCategory = "diagnostic" | "implementation" | "addon";

export const TOOL_CATEGORIES: { value: ToolCategory; label: string; short: string; description: string }[] = [
  {
    value: "diagnostic",
    label: "Diagnostic",
    short: "DIAGNOSTIC",
    description: "Auto-assigned when client enters a diagnostic stage.",
  },
  {
    value: "implementation",
    label: "Implementation",
    short: "IMPLEMENTATION",
    description: "Auto-assigned when client enters an implementation stage (in addition to diagnostic tools).",
  },
  {
    value: "addon",
    label: "Add-On",
    short: "ADD-ON",
    description: "Never auto-assigned. Assigned manually by admin after an add-on purchase.",
  },
];

export const toolCategoryLabel = (k?: string | null) =>
  TOOL_CATEGORIES.find((c) => c.value === k)?.label ?? "Diagnostic";

export const toolCategoryShort = (k?: string | null) =>
  TOOL_CATEGORIES.find((c) => c.value === k)?.short ?? "DIAGNOSTIC";

// Assignment source — how a tool ended up assigned to a customer.
export type AssignmentSource = "stage" | "addon" | "manual";

export const assignmentSourceLabel = (k?: string | null) => {
  switch (k) {
    case "stage": return "Auto · Stage";
    case "addon": return "Add-On";
    case "manual": return "Manual";
    default: return "Manual";
  }
};

// Relative time formatting for "last used" indicators.
export const formatRelativeTime = (iso?: string | null) => {
  if (!iso) return "Never used";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = 60 * 1000, hr = 60 * min, day = 24 * hr;
  if (diff < hr) return `${Math.max(1, Math.round(diff / min))}m ago`;
  if (diff < day) return `${Math.round(diff / hr)}h ago`;
  if (diff < 30 * day) return `${Math.round(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Compute usage status from assignment & last-used info.
export type UsageStatus = "active" | "idle" | "stale" | "unused";
export const usageStatus = (assigned: number, lastUsedIso?: string | null): UsageStatus => {
  if (assigned === 0) return "unused";
  if (!lastUsedIso) return "stale";
  const days = (Date.now() - new Date(lastUsedIso).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 14) return "active";
  if (days <= 60) return "idle";
  return "stale";
};