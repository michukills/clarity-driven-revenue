import type { DiagnosticCategory, FactorRubric } from "@/lib/diagnostics/engine";
import { canonicalTitleFor } from "@/lib/scorecard/pillars";

/** Generic 0–5 rubric reused by most scorecard factors. Tools can override per-factor. */
const generic = (subject: string): FactorRubric => ({
  0: `${subject} is healthy and predictable.`,
  1: `Minor friction in ${subject.toLowerCase()}; rarely affects revenue.`,
  2: `Inconsistent ${subject.toLowerCase()}; outcomes vary by who's involved.`,
  3: `Recurring leak in ${subject.toLowerCase()}; costing time or revenue each month.`,
  4: `${subject} is significantly broken and constraining growth.`,
  5: `${subject} is severely broken or fully owner-dependent.`,
});

/**
 * RGS Stability Scorecard — the 5 locked pillars of the RGS Stability System™.
 * Mapped to the shared diagnostic engine so every tool uses one scoring contract.
 *
 * Internal pillar keys are preserved (`demand`, `conversion`, `operations`,
 * `financial`, `independence`) so any future tool_runs migrations and existing
 * resource_assignments stay valid.
 *
 * P13.Scorecard.Unification.H.1 — display labels now sourced from the
 * canonical pillar registry (`src/lib/scorecard/pillars.ts`) so the OS
 * scorecard, public scorecard, and reports all use the same titles.
 * Internal keys remain unchanged for DB compatibility.
 */
export const SCORECARD_CATEGORIES: DiagnosticCategory[] = [
  {
    key: "demand",
    label: canonicalTitleFor("demand"),
    short: "Demand reliability and lead source predictability",
    weight: 0.22,
    nextStep: "Diagnostic",
    rootCause: "Lead flow is unpredictable and not tied to a repeatable channel the team owns.",
    ifIgnored: "Revenue stays tied to founder hustle and any slow month becomes a cash crisis.",
    fixFirst: "Pick one channel, commit 30 days, and document what produces a qualified lead.",
    factors: [
      {
        key: "channel_predictability",
        label: "Channel predictability",
        lookFor: "A repeatable channel that produces leads without the owner pushing.",
        rubric: generic("Channel predictability"),
      },
      {
        key: "lead_volume_stability",
        label: "Lead volume stability",
        lookFor: "Lead count variance month over month.",
        rubric: generic("Lead volume stability"),
      },
      {
        key: "lead_quality_fit",
        label: "Lead quality fit",
        lookFor: "Share of leads that match the ideal client profile.",
        rubric: generic("Lead quality fit"),
      },
      {
        key: "demand_documentation",
        label: "Demand source documentation",
        lookFor: "A written record of where leads come from and what triggers them.",
        rubric: generic("Demand documentation"),
      },
      {
        key: "founder_dependency",
        label: "Founder-driven demand",
        lookFor: "How much new revenue depends on the owner's personal network or effort.",
        rubric: {
          0: "Demand is independent of the founder.",
          1: "Founder occasionally needed to unblock leads.",
          2: "Founder still drives a meaningful share of new pipeline.",
          3: "Most demand depends on founder relationships.",
          4: "Without the founder, lead flow stalls within weeks.",
          5: "There is no demand engine without the founder.",
        },
      },
    ],
  },
  {
    key: "conversion",
    label: canonicalTitleFor("conversion"),
    short: "Pipeline integrity from inquiry through close",
    weight: 0.22,
    nextStep: "Implementation",
    rootCause: "The sales motion is improvisational — outcomes depend on who shows up that day.",
    ifIgnored: "You will keep paying to fill a bucket that quietly empties itself.",
    fixFirst: "Define a 3-stage pipeline and log every lead this week.",
    factors: [
      { key: "pipeline_visibility", label: "Pipeline visibility", lookFor: "Owner can see every active deal and stage in under a minute.", rubric: generic("Pipeline visibility") },
      { key: "stage_dropoff", label: "Stage drop-off awareness", lookFor: "Knowing where leads stall and why.", rubric: generic("Stage drop-off awareness") },
      { key: "follow_up_discipline", label: "Follow-up discipline", lookFor: "Consistent, timed follow-up after every meaningful touch.", rubric: generic("Follow-up discipline") },
      { key: "close_conversation", label: "Close conversation structure", lookFor: "A repeatable structure for the close call.", rubric: generic("Close conversation structure") },
      { key: "win_rate_stability", label: "Win-rate stability", lookFor: "Win rate stays in a defined range month to month.", rubric: generic("Win-rate stability") },
    ],
  },
  {
    key: "operations",
    label: canonicalTitleFor("operations"),
    short: "Process clarity, documented hand-offs, repeatability",
    weight: 0.20,
    nextStep: "Implementation",
    rootCause: "Delivery runs on memory and heroics instead of a documented hand-off path.",
    ifIgnored: "Growth will create chaos faster than revenue.",
    fixFirst: "Document the top 3 recurring workflows this week — even rough drafts.",
    factors: [
      { key: "process_documentation", label: "Process documentation", lookFor: "Top recurring workflows are written down.", rubric: generic("Process documentation") },
      { key: "hand_offs", label: "Hand-off integrity", lookFor: "Work moves between people without dropped context.", rubric: generic("Hand-off integrity") },
      { key: "rework", label: "Rework frequency", lookFor: "How often the team fixes the same kind of error.", rubric: generic("Rework frequency") },
      { key: "scheduling", label: "Scheduling efficiency", lookFor: "Calendar reflects priorities, not just inbound requests.", rubric: generic("Scheduling efficiency") },
      { key: "capacity", label: "Capacity headroom", lookFor: "Room to absorb a 20% volume spike without breaking.", rubric: generic("Capacity headroom") },
    ],
  },
  {
    key: "financial",
    label: canonicalTitleFor("financial"),
    short: "Owner can see what makes money, what costs it, and what the runway is",
    weight: 0.18,
    nextStep: "Add-ons / Monitoring",
    rootCause: "The owner cannot see, in numbers, where revenue actually comes from or where it goes.",
    ifIgnored: "Profitable months hide unprofitable systems until cash runs short.",
    fixFirst: "Stand up a weekly cash + margin snapshot the owner can read in 60 seconds.",
    factors: [
      { key: "revenue_by_offer", label: "Revenue by offer / service", lookFor: "Owner can split revenue by offer in under 5 minutes.", rubric: generic("Revenue by offer") },
      { key: "profit_per_job", label: "Profit per job / client", lookFor: "Margin per job/client is known, not guessed.", rubric: generic("Profit per job") },
      { key: "cash_flow", label: "Cash flow visibility", lookFor: "A weekly cash snapshot the owner trusts.", rubric: generic("Cash flow visibility") },
      { key: "forecast", label: "Pipeline forecast", lookFor: "A 60–90 day revenue outlook tied to pipeline.", rubric: generic("Pipeline forecast") },
      { key: "attribution", label: "Revenue attribution", lookFor: "Each closed deal traces back to a known source.", rubric: generic("Revenue attribution") },
    ],
  },
  {
    key: "independence",
    label: canonicalTitleFor("independence"),
    short: "How much the business needs the founder to run, sell, and decide",
    weight: 0.18,
    nextStep: "Implementation",
    rootCause: "Critical revenue moves only happen when the owner is in the room.",
    ifIgnored: "Growth caps at the owner's calendar and burnout becomes the actual ceiling.",
    fixFirst: "Pick one owner-only task this week and document the hand-off path.",
    factors: [
      { key: "owner_in_sales", label: "Owner required for sales", lookFor: "Deals that close without the owner present.", rubric: generic("Owner-free sales") },
      { key: "owner_in_delivery", label: "Owner required for delivery", lookFor: "Delivery that runs without the owner approving each step.", rubric: generic("Owner-free delivery") },
      { key: "delegation", label: "Delegation maturity", lookFor: "Real ownership handed off, not just tasks.", rubric: generic("Delegation maturity") },
      { key: "documented_decisions", label: "Documented decisions", lookFor: "Key decisions written down so the team can repeat them.", rubric: generic("Documented decisions") },
      { key: "founder_capacity", label: "Founder capacity headroom", lookFor: "Founder has 20%+ weekly time for strategic work.", rubric: generic("Founder capacity headroom") },
    ],
  },
];