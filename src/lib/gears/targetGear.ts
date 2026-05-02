/**
 * P13.ValueLayer.1 — RGS Stability System™ Target Gear metadata.
 *
 * Additive value-facing layer. Internal/admin language is preserved
 * everywhere; the gear layer only adds tagging, filtering, grouping,
 * and a value-facing translation surface (preview/value mode).
 *
 * Gear values are stored as smallint 1..5 in operational tables
 * (customer_tasks, checklist_items, resources, resource_assignments,
 * customer_insight_memory). NULL means "ungeared" — never shown as
 * a failure.
 */

export type TargetGear = 1 | 2 | 3 | 4 | 5;

export interface GearMeta {
  gear: TargetGear;
  name: string;
  metaphor: string;
  purpose: string;
  /** Value-facing restoration label for client/value mode. */
  restorationLabel: string;
  /** Short admin chip label. */
  short: string;
  tags: readonly string[];
  /** Tailwind classes for the gear chip in admin/value layers. */
  chipClass: string;
  /** Tailwind ring/border class for grouped sections. */
  accentClass: string;
}

export const TARGET_GEARS: readonly GearMeta[] = [
  {
    gear: 1,
    name: "Demand Generation",
    metaphor: "Fuel Intake",
    purpose: "Lead volume and consistency",
    restorationLabel: "Demand Generation Restoration",
    short: "G1 · Demand",
    tags: ["GEAR-1", "DEMAND", "TRAFFIC"],
    chipClass: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    accentClass: "border-amber-500/30",
  },
  {
    gear: 2,
    name: "Revenue Conversion",
    metaphor: "The Spark",
    purpose: "Turning leads into cash",
    restorationLabel: "Revenue Conversion Restoration",
    short: "G2 · Conversion",
    tags: ["GEAR-2", "CONVERSION", "SALES"],
    chipClass: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    accentClass: "border-rose-500/30",
  },
  {
    gear: 3,
    name: "Operational Efficiency",
    metaphor: "Engine Timing",
    purpose: "Reducing friction and waste",
    restorationLabel: "Operational Efficiency Restoration",
    short: "G3 · Ops",
    tags: ["GEAR-3", "OPS", "EFFICIENCY"],
    chipClass: "bg-sky-500/15 text-sky-300 border-sky-500/40",
    accentClass: "border-sky-500/30",
  },
  {
    gear: 4,
    name: "Financial Visibility",
    metaphor: "The Dashboard",
    purpose: "Profit protection and cash flow",
    restorationLabel: "Financial Visibility Restoration",
    short: "G4 · Finance",
    tags: ["GEAR-4", "FINANCE", "RCS", "LEAK-PROTECTION"],
    chipClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    accentClass: "border-emerald-500/30",
  },
  {
    gear: 5,
    name: "Owner Independence",
    metaphor: "Autopilot",
    purpose: "Reducing how much the business depends on the owner",
    restorationLabel: "Owner Independence Restoration",
    short: "G5 · Autopilot",
    tags: ["GEAR-5", "AUTOPILOT", "EXIT-READY"],
    chipClass: "bg-violet-500/15 text-violet-300 border-violet-500/40",
    accentClass: "border-violet-500/30",
  },
] as const;

export const GEAR_BY_NUMBER: Record<TargetGear, GearMeta> = TARGET_GEARS.reduce(
  (acc, g) => {
    acc[g.gear] = g;
    return acc;
  },
  {} as Record<TargetGear, GearMeta>,
);

export function gearMeta(gear: number | null | undefined): GearMeta | null {
  if (!gear) return null;
  if (gear < 1 || gear > 5) return null;
  return GEAR_BY_NUMBER[gear as TargetGear] ?? null;
}

export function gearShort(gear: number | null | undefined): string {
  return gearMeta(gear)?.short ?? "Ungeared";
}

/**
 * Value-facing translation map.
 *
 * Used in client/value preview mode only. Internal admin surfaces keep
 * their existing language (Tasks, SOPs, Templates, Tool Assignments).
 */
export const VALUE_LANGUAGE = {
  task: "Gear Improvement",
  tasks: "Gear Improvements",
  missing: "Stability Gap",
  missingPlural: "Stability Gaps",
  completed: "System Restored",
  completedPlural: "Systems Restored",
  blocked: "Friction Point",
  blockedPlural: "Friction Points",
  sop: "Operating Control",
  sops: "Operating Controls",
  template: "System Asset",
  templates: "System Assets",
  toolAssignment: "Client Control Tool",
  toolAssignments: "Client Control Tools",
} as const;

/**
 * Suggested typical items per gear. Surfaced as inspiration only —
 * never auto-created unless an admin explicitly triggers seeding.
 */
export const GEAR_SUGGESTIONS: Record<TargetGear, readonly string[]> = {
  1: [
    "Define ideal customer profile and stop noise traffic",
    "Stand up one repeatable lead-generation channel",
    "Capture inbound leads into a single tracked pipeline",
    "Set weekly lead-volume target and review cadence",
  ],
  2: [
    "Document the current sales conversation step-by-step",
    "Add follow-up sequence for unresponsive leads",
    "Track win/loss reasons per opportunity",
    "Set price/proposal template to remove friction",
  ],
  3: [
    "Map the highest-friction client-delivery process",
    "Write SOP for the most repeated operational task",
    "Eliminate one duplicate or manual handoff",
    "Define owner-of-record for each operational area",
  ],
  4: [
    "Establish weekly cash-in / cash-out review",
    "Tag every expense to a category for margin visibility",
    "Identify top 3 revenue leaks and assign owners",
    "Set a 30/60/90 day cash-runway visibility report",
  ],
  5: [
    "List every decision the owner is currently the bottleneck on",
    "Delegate one recurring decision with a written rule",
    "Document one process the owner currently runs solo",
    "Define the role that replaces the owner in this gear",
  ],
} as const;

/** Group an array of items with a `target_gear` field by gear number. */
export function groupByGear<T extends { target_gear?: number | null }>(
  items: T[],
): Record<TargetGear | "ungeared", T[]> {
  const out: Record<TargetGear | "ungeared", T[]> = {
    1: [], 2: [], 3: [], 4: [], 5: [], ungeared: [],
  };
  for (const it of items) {
    const g = it.target_gear;
    if (g && g >= 1 && g <= 5) out[g as TargetGear].push(it);
    else out.ungeared.push(it);
  }
  return out;
}

/**
 * P20.22 — Canonical customer-facing definition set for the five RGS
 * Stability System™ gears. Single source of truth used by reports,
 * Stability Snapshot, exports, AI/report prompts, and any helper text
 * that needs to explain the gears in plain English.
 *
 * Naming rules:
 *   - Use the exact gear name. Do not shorten to "Demand", "Sales",
 *     "Operations", "Finance", or "Owner Freedom" in customer-facing
 *     copy. Short admin chip labels (`short`) are allowed when space
 *     is tight.
 *   - Financial Visibility is not accounting advice.
 *   - Owner Independence is not removing or replacing the owner.
 *   - Demand Generation is not generic marketing.
 *   - Revenue Conversion is not sales hype or "conversion hacks".
 *   - Operational Efficiency is not productivity jargon.
 */
export const OFFICIAL_GEAR_DEFINITIONS: Record<
  TargetGear,
  { name: string; question: string; explanation: string }
> = {
  1: {
    name: "Demand Generation",
    question:
      "Can the business consistently attract the right kind of attention?",
    explanation:
      "Demand Generation looks at whether the business has reliable ways " +
      "to create awareness, interest, and qualified opportunities. If " +
      "demand is weak or inconsistent, the business may not have enough " +
      "of the right people entering the system.",
  },
  2: {
    name: "Revenue Conversion",
    question:
      "Can the business turn interest into paying customers through a clear sales process?",
    explanation:
      "Revenue Conversion looks at what happens after someone shows " +
      "interest. If follow-up, sales steps, pricing clarity, offer " +
      "explanation, or closing process is inconsistent, revenue can slip " +
      "after demand has already been created.",
  },
  3: {
    name: "Operational Efficiency",
    question:
      "Can the business deliver without constant friction, confusion, or owner intervention?",
    explanation:
      "Operational Efficiency looks at how work gets delivered after the " +
      "sale. If scheduling, handoffs, staffing, fulfillment, service " +
      "delivery, inventory, or process standards are unclear, the owner " +
      "may end up carrying pressure the system should be carrying.",
  },
  4: {
    name: "Financial Visibility",
    question:
      "Can the owner see what is happening financially soon enough to make useful decisions?",
    explanation:
      "Financial Visibility looks at whether the owner can see revenue, " +
      "cash, margin, cost pressure, and financial patterns early enough " +
      "to respond. It is not about replacing an accountant. It is about " +
      "whether the business gives the owner a clear enough picture to " +
      "make decisions before pressure turns into an emergency.",
  },
  5: {
    name: "Owner Independence",
    question:
      "Can the business keep moving without the owner being the only person who knows what to do?",
    explanation:
      "Owner Independence looks at whether decisions, standards, " +
      "follow-up, delivery, and problem-solving depend too heavily on " +
      "the owner. If every answer lives in the owner's head, the " +
      "business may only be stable while the owner is available.",
  },
} as const;

/** Plain-English short description sentence per gear, for compact UIs. */
export function gearOfficialQuestion(gear: TargetGear): string {
  return OFFICIAL_GEAR_DEFINITIONS[gear].question;
}