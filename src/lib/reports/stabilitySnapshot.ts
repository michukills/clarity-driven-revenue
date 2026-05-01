// P20.18 — RGS Stability Snapshot.
//
// SWOT-style diagnostic interpretation layer, branded as the
// "RGS Stability Snapshot". Pure / deterministic. No AI. No network.
// Reads from an EvidenceSnapshot (already collected by evidenceCollector)
// and produces four labeled sections with confidence + status.
//
// Client-facing label: "RGS Stability Snapshot".
// Internal/admin description: SWOT-style diagnostic layer.
//
// Hard rules:
// - Never invent precise numbers, margins, staffing, or compliance issues.
// - Cannabis/MMJ businesses are framed as regulated retail/POS, never
//   healthcare. No patient/clinical/diagnosis/insurance/treatment wording.
// - Snapshots default to "Draft" or "Needs Review" — admin must approve
//   before any client-facing delivery.

import type { EvidenceItem, EvidenceSnapshot } from "./types";
import type { TargetGear } from "@/lib/gears/targetGear";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

export type StabilityGearKey =
  | "demand_generation"
  | "revenue_conversion"
  | "operational_efficiency"
  | "financial_visibility"
  | "owner_independence";

export type SnapshotConfidence = "High" | "Medium" | "Low";
export type SnapshotStatus = "Draft" | "Needs Review" | "Approved";

export interface StabilitySnapshotItem {
  text: string;
  evidence_summary?: string;
  gears?: StabilityGearKey[];
  source_tags?: string[];
  confidence?: SnapshotConfidence;
}

export type StabilitySectionKey =
  | "current_strengths_to_preserve"
  | "system_weaknesses_creating_instability"
  | "opportunities_after_stabilization"
  | "threats_to_revenue_control";

export interface StabilitySnapshotSection {
  key: StabilitySectionKey;
  title: string;
  items: StabilitySnapshotItem[];
  status: SnapshotStatus;
}

export interface StabilitySnapshot {
  current_strengths_to_preserve: StabilitySnapshotSection;
  system_weaknesses_creating_instability: StabilitySnapshotSection;
  opportunities_after_stabilization: StabilitySnapshotSection;
  threats_to_revenue_control: StabilitySnapshotSection;
  overall_status: SnapshotStatus;
  generated_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  industry?: IndustryCategory | null;
  /** Internal description; never used as a client-facing title. */
  internal_description: "SWOT-style diagnostic layer";
  /** Client-facing title constant. */
  client_title: "RGS Stability Snapshot";
}

/** Map a StabilityGearKey → numeric TargetGear (1..5) for the OS. */
export const GEAR_KEY_TO_NUMBER: Record<StabilityGearKey, TargetGear> = {
  demand_generation: 1,
  revenue_conversion: 2,
  operational_efficiency: 3,
  financial_visibility: 4,
  owner_independence: 5,
};

const SECTION_TITLES: Record<StabilitySectionKey, string> = {
  current_strengths_to_preserve: "Current Strengths to Preserve",
  system_weaknesses_creating_instability: "System Weaknesses Creating Instability",
  opportunities_after_stabilization: "Opportunities After Stabilization",
  threats_to_revenue_control: "Threats to Revenue / Control",
};

function findItems(snap: EvidenceSnapshot, source: string): EvidenceItem[] {
  return snap.items.filter(
    (i) => i.source === source || i.source.startsWith(`${source}.`),
  );
}

function deriveIndustry(snap: EvidenceSnapshot): IndustryCategory | null {
  const cust = snap.items.find((i) => i.source === "customers");
  const v = cust?.value as { industry?: string | null } | undefined;
  const ind = (v?.industry ?? null) as IndustryCategory | null;
  if (!ind) return null;
  const allowed: IndustryCategory[] = [
    "trade_field_service",
    "retail",
    "restaurant",
    "mmj_cannabis",
    "general_service",
    "other",
  ];
  return allowed.includes(ind) ? ind : null;
}

function statusFromItems(items: StabilitySnapshotItem[]): SnapshotStatus {
  if (items.length === 0) return "Needs Review";
  const lows = items.filter((i) => i.confidence === "Low").length;
  // A section dominated by low confidence cannot ship as Draft-clean.
  if (lows >= Math.ceil(items.length / 2)) return "Needs Review";
  return "Draft";
}

function buildStrengths(snap: EvidenceSnapshot): StabilitySnapshotItem[] {
  const out: StabilitySnapshotItem[] = [];

  // Connected source-of-truth = financial visibility strength.
  const integrations = findItems(snap, "customer_integrations");
  const synced = integrations.filter((i) => i.is_synced);
  if (synced.length >= 1) {
    out.push({
      text: "Reliable connected source data is already flowing into the system.",
      evidence_summary: `${synced.length} connected source${synced.length > 1 ? "s" : ""} syncing successfully.`,
      gears: ["financial_visibility"],
      source_tags: ["customer_integrations"],
      confidence: synced.length >= 2 ? "High" : "Medium",
    });
  }

  // Recent RCC weekly check-ins = operational discipline strength.
  if ((snap.counts.weekly_checkins ?? 0) >= 2) {
    out.push({
      text: "Weekly review cadence is established and producing recent entries.",
      evidence_summary: `${snap.counts.weekly_checkins} recent weekly check-ins on file.`,
      gears: ["operational_efficiency", "owner_independence"],
      source_tags: ["weekly_checkins"],
      confidence: (snap.counts.weekly_checkins ?? 0) >= 3 ? "High" : "Medium",
    });
  }

  // Scorecard run on file at all = the customer has measurable visibility.
  const sc = findItems(snap, "scorecard_runs")[0];
  if (sc) {
    const conf = (sc.value as any)?.confidence ?? sc.confidence;
    if (conf === "high" || conf === "medium") {
      out.push({
        text: "Stability is measurable today — there is a usable diagnostic baseline.",
        evidence_summary: "Most recent scorecard read produced a usable baseline.",
        gears: ["financial_visibility"],
        source_tags: ["scorecard_runs"],
        confidence: conf === "high" ? "High" : "Medium",
      });
    }
  }

  // Stated revenue / clear core offer (from customer profile).
  const cust = snap.items.find((i) => i.source === "customers");
  if (cust && cust.detail && /Stated monthly revenue|About:/i.test(cust.detail)) {
    out.push({
      text: "Owner can articulate the core offer and a stated revenue baseline.",
      evidence_summary: "Customer profile includes a self-reported revenue or business description.",
      gears: ["revenue_conversion"],
      source_tags: ["customers"],
      confidence: "Medium",
    });
  }

  return out.slice(0, 5);
}

function buildWeaknesses(snap: EvidenceSnapshot): StabilitySnapshotItem[] {
  const out: StabilitySnapshotItem[] = [];

  // No connected source = financial visibility weakness.
  if (!(snap.counts.integrations ?? 0)) {
    out.push({
      text: "No connected accounting / payments / CRM source — financial visibility is self-reported.",
      evidence_summary: "Customer integrations table has no rows.",
      gears: ["financial_visibility"],
      source_tags: ["customer_integrations"],
      confidence: "High",
    });
  }

  // Owner-only / owner dependency.
  const owner = findItems(snap, "owner_dependence_items");
  if (owner.length) {
    const high = owner.find((o) => (o.value as any)?.high > 0);
    out.push({
      text: high
        ? "Multiple owner-only tasks are tracked at high risk — the business depends on the owner to run."
        : "Owner involvement is concentrated across recurring tasks.",
      evidence_summary: `${owner.length} owner-dependence record${owner.length > 1 ? "s" : ""} on file.`,
      gears: ["owner_independence", "operational_efficiency"],
      source_tags: ["owner_dependence_items"],
      confidence: high ? "High" : "Medium",
    });
  }

  // Undocumented SOPs.
  const sops = findItems(snap, "operational_sops");
  for (const s of sops) {
    const v = s.value as any;
    if (v && v.undocumented >= 3) {
      out.push({
        text: "Core operating procedures are undocumented or informal.",
        evidence_summary: `${v.undocumented} of ${v.total} SOPs are undocumented.`,
        gears: ["operational_efficiency", "owner_independence"],
        source_tags: ["operational_sops"],
        confidence: "High",
      });
      break;
    }
  }

  // Operational bottlenecks.
  const bn = findItems(snap, "operational_bottlenecks");
  if (bn.length >= 3) {
    out.push({
      text: "Repeat operational bottlenecks are slowing throughput and pulling the owner into delivery.",
      evidence_summary: `${bn.length} active bottlenecks tracked.`,
      gears: ["operational_efficiency"],
      source_tags: ["operational_bottlenecks"],
      confidence: "Medium",
    });
  }

  // Receivables / cash conversion weakness.
  const ar = findItems(snap, "invoice_entries");
  for (const a of ar) {
    const v = a.value as any;
    if (v && v.count > 0) {
      out.push({
        text: "Cash conversion is leaking — invoices are sitting past due.",
        evidence_summary: `${v.count} overdue invoices currently tracked.`,
        gears: ["revenue_conversion", "financial_visibility"],
        source_tags: ["invoice_entries"],
        confidence: "High",
      });
      break;
    }
  }

  // Low-confidence scorecard.
  const sc = findItems(snap, "scorecard_runs")[0];
  if (sc && (((sc.value as any)?.confidence ?? sc.confidence) === "low")) {
    out.push({
      text: "Diagnostic baseline is thin — the latest scorecard ran at low confidence.",
      evidence_summary: "Latest scorecard run flagged low overall confidence.",
      gears: ["financial_visibility"],
      source_tags: ["scorecard_runs"],
      confidence: "Medium",
    });
  }

  return out.slice(0, 5);
}

function buildOpportunities(
  snap: EvidenceSnapshot,
  weaknesses: StabilitySnapshotItem[],
): StabilitySnapshotItem[] {
  const out: StabilitySnapshotItem[] = [];

  // Always frame opportunities as "after stabilization".
  const hasFinancialWeak = weaknesses.some((w) =>
    w.gears?.includes("financial_visibility"),
  );
  const hasConversionWeak = weaknesses.some((w) =>
    w.gears?.includes("revenue_conversion"),
  );
  const hasOwnerWeak = weaknesses.some((w) =>
    w.gears?.includes("owner_independence"),
  );

  if (hasFinancialWeak || (snap.counts.integrations ?? 0) === 0) {
    out.push({
      text: "Once a primary source-of-truth is connected, weekly profit and cash visibility becomes possible.",
      evidence_summary: "Opportunity unlocks after financial visibility is stabilized.",
      gears: ["financial_visibility"],
      confidence: "Medium",
    });
  }

  if (hasConversionWeak) {
    out.push({
      text: "After the conversion process is standardized, follow-up and repeat revenue can be improved without adding lead spend.",
      evidence_summary: "Opportunity unlocks after revenue conversion is stabilized.",
      gears: ["revenue_conversion", "demand_generation"],
      confidence: "Medium",
    });
  }

  if ((snap.counts.weekly_checkins ?? 0) >= 1) {
    out.push({
      text: "Existing review cadence can carry deeper operating decisions once the data behind it is reliable.",
      evidence_summary: "Weekly check-ins already occur — extend their use after data flow is stabilized.",
      gears: ["operational_efficiency"],
      confidence: "Medium",
    });
  }

  if (hasOwnerWeak) {
    out.push({
      text: "After core SOPs are documented, the owner can step out of recurring delivery decisions.",
      evidence_summary: "Opportunity unlocks after owner-independence weaknesses are addressed.",
      gears: ["owner_independence"],
      confidence: "Medium",
    });
  }

  return out.slice(0, 5);
}

function buildThreats(
  snap: EvidenceSnapshot,
  industry: IndustryCategory | null,
): StabilitySnapshotItem[] {
  const out: StabilitySnapshotItem[] = [];

  if (!(snap.counts.integrations ?? 0)) {
    out.push({
      text: "Without a connected source of truth, financial decisions risk being made on stale or incomplete data.",
      evidence_summary: "No connected sources on file.",
      gears: ["financial_visibility"],
      source_tags: ["customer_integrations"],
      confidence: "High",
    });
  }

  const owner = findItems(snap, "owner_dependence_items");
  if (owner.length) {
    out.push({
      text: "Owner-dependent operations create continuity risk if the owner is unavailable.",
      evidence_summary: "Owner-dependence records on file.",
      gears: ["owner_independence"],
      source_tags: ["owner_dependence_items"],
      confidence: "Medium",
    });
  }

  const ar = findItems(snap, "invoice_entries");
  if (ar.some((a) => (a.value as any)?.count > 0)) {
    out.push({
      text: "Cash flow is exposed to overdue receivables compounding week over week.",
      evidence_summary: "Overdue invoices tracked.",
      gears: ["financial_visibility", "revenue_conversion"],
      source_tags: ["invoice_entries"],
      confidence: "High",
    });
  }

  // Industry-flavored, but only when minimum data exists. Avoids invention.
  if (industry === "restaurant" && (snap.counts.weekly_checkins ?? 0) === 0) {
    out.push({
      text: "Without daily/weekly sales visibility, food and labor cost movement may go unnoticed until margin is already compressed.",
      evidence_summary: "No weekly check-ins on file for a restaurant.",
      gears: ["operational_efficiency", "financial_visibility"],
      confidence: "Medium",
    });
  } else if (industry === "retail" && (snap.counts.integrations ?? 0) === 0) {
    out.push({
      text: "Without inventory/POS data flowing in, dead stock and stockouts can quietly drag margin.",
      evidence_summary: "No connected POS / inventory source.",
      gears: ["financial_visibility", "operational_efficiency"],
      confidence: "Medium",
    });
  } else if (industry === "trade_field_service" && (snap.counts.integrations ?? 0) === 0) {
    out.push({
      text: "Without job costing data flowing in, service-line profitability stays invisible.",
      evidence_summary: "No connected accounting / field service source.",
      gears: ["financial_visibility", "revenue_conversion"],
      confidence: "Medium",
    });
  } else if (industry === "mmj_cannabis" && (snap.counts.integrations ?? 0) === 0) {
    // Cannabis/MMJ → regulated retail/POS framing only. NEVER healthcare.
    out.push({
      text: "Without cannabis retail POS and inventory data flowing in, product/category margin and discounts/promotions impact stay invisible.",
      evidence_summary: "No connected cannabis retail POS / inventory source.",
      gears: ["financial_visibility", "operational_efficiency"],
      confidence: "Medium",
    });
  }

  return out.slice(0, 5);
}

/**
 * Generate the RGS Stability Snapshot from an EvidenceSnapshot.
 * Pure function — safe to call from anywhere, no DB writes.
 */
export function generateStabilitySnapshot(
  snap: EvidenceSnapshot,
): StabilitySnapshot {
  const industry = deriveIndustry(snap);

  const strengths = buildStrengths(snap);
  const weaknesses = buildWeaknesses(snap);
  const opportunities = buildOpportunities(snap, weaknesses);
  const threats = buildThreats(snap, industry);

  const sectionsArr: StabilitySnapshotSection[] = [
    {
      key: "current_strengths_to_preserve",
      title: SECTION_TITLES.current_strengths_to_preserve,
      items: strengths,
      status: statusFromItems(strengths),
    },
    {
      key: "system_weaknesses_creating_instability",
      title: SECTION_TITLES.system_weaknesses_creating_instability,
      items: weaknesses,
      status: statusFromItems(weaknesses),
    },
    {
      key: "opportunities_after_stabilization",
      title: SECTION_TITLES.opportunities_after_stabilization,
      items: opportunities,
      status: statusFromItems(opportunities),
    },
    {
      key: "threats_to_revenue_control",
      title: SECTION_TITLES.threats_to_revenue_control,
      items: threats,
      status: statusFromItems(threats),
    },
  ];

  // Conflict / low-evidence rule: if any section is Needs Review, the
  // overall snapshot must require admin review before delivery.
  const overall: SnapshotStatus = sectionsArr.some(
    (s) => s.status === "Needs Review",
  )
    ? "Needs Review"
    : "Draft";

  return {
    current_strengths_to_preserve: sectionsArr[0],
    system_weaknesses_creating_instability: sectionsArr[1],
    opportunities_after_stabilization: sectionsArr[2],
    threats_to_revenue_control: sectionsArr[3],
    overall_status: overall,
    generated_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    industry,
    internal_description: "SWOT-style diagnostic layer",
    client_title: "RGS Stability Snapshot",
  };
}

/** Render the snapshot as a readable markdown-ish body for inclusion in a report section. */
export function renderStabilitySnapshotBody(snap: StabilitySnapshot): string {
  const lines: string[] = [];
  lines.push(`Status: ${snap.overall_status}`);
  lines.push("");

  const sections: StabilitySnapshotSection[] = [
    snap.current_strengths_to_preserve,
    snap.system_weaknesses_creating_instability,
    snap.opportunities_after_stabilization,
    snap.threats_to_revenue_control,
  ];

  for (const sec of sections) {
    lines.push(`${sec.title} (${sec.status})`);
    if (sec.items.length === 0) {
      lines.push("• Insufficient evidence — admin review required before client delivery.");
    } else {
      for (const it of sec.items) {
        const gearTxt = it.gears?.length ? ` [gears: ${it.gears.join(", ")}]` : "";
        const confTxt = it.confidence ? ` (confidence: ${it.confidence})` : "";
        lines.push(`• ${it.text}${gearTxt}${confTxt}`);
        if (it.evidence_summary) lines.push(`    ↳ ${it.evidence_summary}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// P20.19 — Admin review helpers.
//
// These pure helpers let the admin Stability Snapshot review panel edit the
// structured snapshot in-place and recompute derived state without
// re-running the deterministic generator (which would discard edits).
// ─────────────────────────────────────────────────────────────────────────────

export const STABILITY_SECTION_ORDER: StabilitySectionKey[] = [
  "current_strengths_to_preserve",
  "system_weaknesses_creating_instability",
  "opportunities_after_stabilization",
  "threats_to_revenue_control",
];

export const STABILITY_GEAR_KEYS: StabilityGearKey[] = [
  "demand_generation",
  "revenue_conversion",
  "operational_efficiency",
  "financial_visibility",
  "owner_independence",
];

/**
 * Derive overall status from per-section statuses. Mirrors the rule in
 * `generateStabilitySnapshot`: any Needs Review forces overall Needs Review.
 * If the admin marks every section Approved, the snapshot is Approved.
 */
export function deriveOverallStatus(
  sections: StabilitySnapshotSection[],
): SnapshotStatus {
  if (sections.some((s) => s.status === "Needs Review")) return "Needs Review";
  if (sections.length > 0 && sections.every((s) => s.status === "Approved")) {
    return "Approved";
  }
  return "Draft";
}

/**
 * Returns true when the snapshot is admin-approved end-to-end and therefore
 * safe to mark client-visible inside the report draft.
 */
export function isSnapshotClientReady(snap: StabilitySnapshot): boolean {
  return (
    snap.overall_status === "Approved" &&
    [
      snap.current_strengths_to_preserve,
      snap.system_weaknesses_creating_instability,
      snap.opportunities_after_stabilization,
      snap.threats_to_revenue_control,
    ].every((s) => s.status === "Approved")
  );
}
