import type { DiagnosticCategory } from "@/lib/diagnostics/engine";

/**
 * RGS Stability Scorecard — the 5 locked pillars of the RGS Stability System™.
 * Mapped to the shared diagnostic engine so every tool uses one scoring contract.
 *
 * Internal pillar keys are preserved (`demand`, `conversion`, `operations`,
 * `financial`, `independence`) so any future tool_runs migrations and existing
 * resource_assignments stay valid.
 */
export const SCORECARD_CATEGORIES: DiagnosticCategory[] = [
  {
    key: "demand",
    label: "Revenue Control",
    short: "Demand reliability and lead source predictability",
    weight: 0.22,
    nextStep: "Diagnostic",
    rootCause: "Lead flow is unpredictable and not tied to a repeatable channel the team owns.",
    ifIgnored: "Revenue stays tied to founder hustle and any slow month becomes a cash crisis.",
    fixFirst: "Pick one channel, commit 30 days, and document what produces a qualified lead.",
    factors: [
      { key: "channel_predictability", label: "Channel predictability" },
      { key: "lead_volume_stability", label: "Lead volume stability" },
      { key: "lead_quality_fit", label: "Lead quality fit" },
      { key: "demand_documentation", label: "Demand source documentation" },
      { key: "founder_dependency", label: "Founder-driven demand" },
    ],
  },
  {
    key: "conversion",
    label: "Conversion Control",
    short: "Pipeline integrity from inquiry through close",
    weight: 0.22,
    nextStep: "Implementation",
    rootCause: "The sales motion is improvisational — outcomes depend on who shows up that day.",
    ifIgnored: "You will keep paying to fill a bucket that quietly empties itself.",
    fixFirst: "Define a 3-stage pipeline and log every lead this week.",
    factors: [
      { key: "pipeline_visibility", label: "Pipeline visibility" },
      { key: "stage_dropoff", label: "Stage drop-off awareness" },
      { key: "follow_up_discipline", label: "Follow-up discipline" },
      { key: "close_conversation", label: "Close conversation structure" },
      { key: "win_rate_stability", label: "Win-rate stability" },
    ],
  },
  {
    key: "operations",
    label: "Delivery / Operations Control",
    short: "Process clarity, documented hand-offs, repeatability",
    weight: 0.20,
    nextStep: "Implementation",
    rootCause: "Delivery runs on memory and heroics instead of a documented hand-off path.",
    ifIgnored: "Growth will create chaos faster than revenue.",
    fixFirst: "Document the top 3 recurring workflows this week — even rough drafts.",
    factors: [
      { key: "process_documentation", label: "Process documentation" },
      { key: "hand_offs", label: "Hand-off integrity" },
      { key: "rework", label: "Rework frequency" },
      { key: "scheduling", label: "Scheduling efficiency" },
      { key: "capacity", label: "Capacity headroom" },
    ],
  },
  {
    key: "financial",
    label: "Financial Visibility",
    short: "Owner can see what makes money, what costs it, and what the runway is",
    weight: 0.18,
    nextStep: "Add-ons / Monitoring",
    rootCause: "The owner cannot see, in numbers, where revenue actually comes from or where it goes.",
    ifIgnored: "Profitable months hide unprofitable systems until cash runs short.",
    fixFirst: "Stand up a weekly cash + margin snapshot the owner can read in 60 seconds.",
    factors: [
      { key: "revenue_by_offer", label: "Revenue by offer / service" },
      { key: "profit_per_job", label: "Profit per job / client" },
      { key: "cash_flow", label: "Cash flow visibility" },
      { key: "forecast", label: "Pipeline forecast" },
      { key: "attribution", label: "Revenue attribution" },
    ],
  },
  {
    key: "independence",
    label: "Owner Dependency",
    short: "How much the business needs the founder to run, sell, and decide",
    weight: 0.18,
    nextStep: "Implementation",
    rootCause: "Critical revenue moves only happen when the owner is in the room.",
    ifIgnored: "Growth caps at the owner's calendar and burnout becomes the actual ceiling.",
    fixFirst: "Pick one owner-only task this week and document the hand-off path.",
    factors: [
      { key: "owner_in_sales", label: "Owner required for sales" },
      { key: "owner_in_delivery", label: "Owner required for delivery" },
      { key: "delegation", label: "Delegation maturity" },
      { key: "documented_decisions", label: "Documented decisions" },
      { key: "founder_capacity", label: "Founder capacity headroom" },
    ],
  },
];