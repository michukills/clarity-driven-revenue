// P13.Reports.AI.1 — Deterministic report draft engine.
//
// Builds a useful first draft from an EvidenceSnapshot using rule-based
// reasoning. Free-safe: no AI calls. The output is a structured DraftPayload
// the admin can review, edit, and approve.
//
// P13.EvidenceIntake.H.1 — system prompt + finding-shape contract are
// sourced from `src/lib/evidenceIntake/prompts.ts` so report drafts,
// the diagnostic interview, and the public scorecard share one trust
// contract: every finding has issue + cause + evidence + confidence +
// missing data; recommendations tie to a cause; admin review is required
// before any client-facing publish.

import type {
  DraftPayload,
  DraftRecommendation,
  DraftRisk,
  DraftSection,
  EvidenceItem,
  EvidenceSnapshot,
  MissingInfoItem,
  ReportConfidence,
  ReportDraftType,
} from "./types";
import { REPORT_GENERATION_SYSTEM_PROMPT } from "@/lib/evidenceIntake/prompts";
import {
  generateStabilitySnapshot,
  renderStabilitySnapshotBody,
} from "./stabilitySnapshot";
import {
  buildStructuralHealthReportSections,
  isStructuralHealthReportType,
} from "./structuralHealthReport";

const RUBRIC_VERSION = "reports.v1";

/**
 * Re-exported so any future admin-triggered AI generation pathway uses
 * the hardened system prompt verbatim. Today the deterministic engine
 * below already enforces the same shape structurally.
 */
export const REPORT_SYSTEM_PROMPT = REPORT_GENERATION_SYSTEM_PROMPT;

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function findItems(snap: EvidenceSnapshot, source: string): EvidenceItem[] {
  return snap.items.filter((i) => i.source === source || i.source.startsWith(`${source}.`));
}

function sourceRefs(items: EvidenceItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.source)));
}

function joinList(parts: string[], sep = " · "): string {
  return parts.filter(Boolean).join(sep);
}

/** Confidence rule: based on breadth of evidence and source readiness. */
function deriveConfidence(snap: EvidenceSnapshot): ReportConfidence {
  const c = snap.counts;
  const sources = Object.keys(c).filter((k) => (c[k] ?? 0) > 0).length;
  const hasIntegrations = (c.integrations ?? 0) > 0;
  const hasQB = (c.quickbooks_periods ?? 0) > 0;
  const hasScorecard = (c.scorecard_runs ?? 0) > 0;
  const hasDiagnostics = (c.diagnostic_tool_runs ?? 0) > 0;

  if (sources >= 6 && (hasQB || hasIntegrations) && (hasScorecard || hasDiagnostics)) {
    return "high";
  }
  if (sources >= 3) return "medium";
  return "low";
}

function detectMissing(snap: EvidenceSnapshot): MissingInfoItem[] {
  const missing: MissingInfoItem[] = [];
  const c = snap.counts;
  if (!(c.integrations ?? 0)) {
    missing.push({
      area: "Connected sources",
      what_is_missing: "No accounting, payments, CRM, or payroll source is connected.",
      why_it_matters:
        "Without source data the report leans on self-reported answers and admin notes; confidence stays lower.",
    });
  }
  if (!(c.quickbooks_periods ?? 0)) {
    missing.push({
      area: "Financial periods",
      what_is_missing: "No QuickBooks period summaries are available.",
      why_it_matters:
        "Revenue, expenses, and net income statements would tighten the financial read materially.",
    });
  }
  if (!(c.weekly_checkins ?? 0)) {
    missing.push({
      area: "RCC weekly check-ins",
      what_is_missing: "No weekly check-ins on file.",
      why_it_matters:
        "Weekly cadence is the primary source for blockers, momentum, and operating risk signals.",
    });
  }
  if (!(c.scorecard_runs ?? 0)) {
    missing.push({
      area: "Conversational scorecard",
      what_is_missing: "No scorecard run linked to this customer.",
      why_it_matters:
        "The scorecard provides per-pillar evidence and confidence used to anchor the diagnostic read.",
    });
  }
  if (!(c.diagnostic_tool_runs ?? 0)) {
    missing.push({
      area: "Diagnostic tools",
      what_is_missing: "No saved diagnostic tool runs (Persona, Journey, Process, Stability, Revenue Leak).",
      why_it_matters:
        "Tool runs translate raw evidence into structured findings the report can cite directly.",
    });
  }
  return missing;
}

function detectRisks(snap: EvidenceSnapshot): DraftRisk[] {
  const risks: DraftRisk[] = [];

  // Owner dependency
  const owner = findItems(snap, "owner_dependence_items");
  if (owner.length) {
    const high = owner.find((o) => (o.value as any)?.high > 0);
    if (high) {
      risks.push({
        id: uid("risk"),
        title: "Owner-dependency risk",
        detail: `${(high.value as any).high} owner-only tasks tracked as high risk. Operating capacity and continuity are exposed.`,
        evidence_refs: sourceRefs(owner),
        severity: "high",
        client_safe: false,
      });
    } else {
      risks.push({
        id: uid("risk"),
        title: "Owner involvement is concentrated",
        detail: "Multiple owner-only tasks are tracked. Worth confirming which can be delegated.",
        evidence_refs: sourceRefs(owner),
        severity: "medium",
        client_safe: false,
      });
    }
  }

  // Receivables
  const ar = findItems(snap, "invoice_entries");
  for (const a of ar) {
    const v = a.value as any;
    if (v && v.count > 0) {
      risks.push({
        id: uid("risk"),
        title: "Cash collection risk",
        detail: `${v.count} overdue invoices totaling ~${Number(v.amount ?? 0).toFixed(2)}.`,
        evidence_refs: sourceRefs(ar),
        severity: v.amount > 10000 ? "high" : "medium",
        client_safe: true,
      });
    }
  }

  // Bottlenecks
  const bn = findItems(snap, "operational_bottlenecks");
  if (bn.length >= 3) {
    risks.push({
      id: uid("risk"),
      title: "Operational drag",
      detail: `${bn.length} active bottlenecks reduce throughput and pull the owner into delivery.`,
      evidence_refs: sourceRefs(bn),
      severity: "medium",
      client_safe: false,
    });
  }

  // SOPs
  const sops = findItems(snap, "operational_sops");
  for (const s of sops) {
    const v = s.value as any;
    if (v && v.undocumented >= 3) {
      risks.push({
        id: uid("risk"),
        title: "Undocumented SOPs",
        detail: `${v.undocumented} of ${v.total} SOPs are undocumented or informal.`,
        evidence_refs: sourceRefs(sops),
        severity: "medium",
        client_safe: false,
      });
    }
  }

  // Source readiness
  if (!(snap.counts.integrations ?? 0)) {
    risks.push({
      id: uid("risk"),
      title: "Source confidence risk",
      detail:
        "No connected accounting, payments, or CRM sources. The report leans on self-reported data.",
      evidence_refs: ["customer_integrations"],
      severity: "medium",
      client_safe: false,
    });
  }

  // Scorecard low confidence
  const sc = findItems(snap, "scorecard_runs");
  for (const s of sc) {
    if (s.confidence === "low") {
      risks.push({
        id: uid("risk"),
        title: "Low-evidence scorecard",
        detail:
          "Latest scorecard run had low overall confidence. Recommendations from it should be validated before client delivery.",
        evidence_refs: sourceRefs(sc),
        severity: "low",
        client_safe: false,
      });
      break;
    }
  }
  return risks;
}

function detectRecommendations(
  snap: EvidenceSnapshot,
  type: ReportDraftType,
): DraftRecommendation[] {
  const recs: DraftRecommendation[] = [];

  // From scorecard pillars (low band)
  const pillars = findItems(snap, "scorecard_runs.pillar_results");
  for (const p of pillars) {
    const detail = (p.detail || "").toLowerCase();
    if (/band 1|band 2/.test(`band ${(p.title || "").toLowerCase()}`) || /low|missing/.test(detail)) {
      recs.push({
        id: uid("rec"),
        title: `Strengthen ${p.module.replace("Pillar: ", "")}`,
        detail: `Scorecard flagged this pillar as a focus area. ${p.detail ?? ""}`.trim(),
        evidence_refs: ["scorecard_runs"],
        inference: false,
        priority: "medium",
        client_safe: true,
      });
    }
  }

  // Owner dependency → delegate plan
  const owner = findItems(snap, "owner_dependence_items");
  if (owner.length) {
    recs.push({
      id: uid("rec"),
      title: "Build a one-page delegation plan",
      detail:
        "Pick the two owner-only tasks with highest risk and lowest replacement readiness. Define an interim owner, the SOP that needs to exist, and the cadence for handoff.",
      evidence_refs: sourceRefs(owner),
      inference: false,
      priority: "high",
      client_safe: true,
    });
  }

  // Receivables
  const ar = findItems(snap, "invoice_entries");
  for (const a of ar) {
    const v = a.value as any;
    if (v && v.count > 0) {
      recs.push({
        id: uid("rec"),
        title: "Run a receivables sweep",
        detail: `Work the ${v.count} overdue invoices in oldest-first order. Confirm payment terms and add a follow-up cadence.`,
        evidence_refs: sourceRefs(ar),
        inference: false,
        priority: "high",
        client_safe: true,
      });
    }
  }

  // No connected sources
  if (!(snap.counts.integrations ?? 0)) {
    recs.push({
      id: uid("rec"),
      title: "Connect at least one source of truth",
      detail:
        "QuickBooks (accounting), Stripe (payments), or HubSpot (CRM) — pick the one closest to the next decision and connect it. Source data sharply improves recommendation quality.",
      evidence_refs: ["customer_integrations"],
      inference: false,
      priority: "high",
      client_safe: true,
    });
  }

  // RCC blockers from weekly check-ins
  const checkins = findItems(snap, "weekly_checkins");
  if (checkins.some((w) => /blocker|stuck|behind|missed/i.test(w.detail ?? ""))) {
    recs.push({
      id: uid("rec"),
      title: "Resolve repeat blockers from weekly check-ins",
      detail:
        "Recurring blockers in RCC suggest a process or capacity issue that compounds week over week. Pick the top one and assign a clear owner.",
      evidence_refs: ["weekly_checkins"],
      inference: true,
      priority: "medium",
      client_safe: true,
    });
  }

  // Implementation specific
  if (type === "implementation_update") {
    const tasks = findItems(snap, "customer_tasks");
    if (tasks.length) {
      const v = (tasks[0].value as any) ?? {};
      if (v.open && v.done && v.open > v.done) {
        recs.push({
          id: uid("rec"),
          title: "Re-prioritize the implementation backlog",
          detail: `${v.open} open vs ${v.done} done — sequence the next 2–3 tasks tied to the highest-impact pillar.`,
          evidence_refs: ["customer_tasks"],
          inference: false,
          priority: "medium",
          client_safe: false,
        });
      }
    }
  }

  if (!recs.length) {
    recs.push({
      id: uid("rec"),
      title: "Capture more evidence before final recommendations",
      detail:
        "Available evidence is too thin to make confident recommendations. Use the missing-information section to schedule the next data step.",
      evidence_refs: ["missing_information"],
      inference: true,
      priority: "medium",
      client_safe: false,
    });
  }

  return recs;
}

function buildSections(
  snap: EvidenceSnapshot,
  type: ReportDraftType,
  confidence: ReportConfidence,
  recs: DraftRecommendation[],
  risks: DraftRisk[],
  missing: MissingInfoItem[],
): DraftSection[] {
  const sections: DraftSection[] = [];

  const summaryParts: string[] = [];
  summaryParts.push(`Draft for ${snap.customer_label}.`);
  if (snap.is_demo_account) {
    summaryParts.push("This account is flagged as a demo/test account.");
  }
  const sc = findItems(snap, "scorecard_runs")[0];
  if (sc) {
    summaryParts.push(
      `Most recent scorecard read indicates band ${(sc.value as any)?.band ?? "—"} with ${(sc.value as any)?.confidence ?? "—"} confidence.`,
    );
  }
  if (snap.counts.weekly_checkins) {
    summaryParts.push(`${snap.counts.weekly_checkins} recent RCC check-ins on file.`);
  }
  summaryParts.push(
    `Overall draft confidence: ${confidence}. ${
      confidence === "high"
        ? "Evidence breadth supports a tight first draft."
        : confidence === "medium"
          ? "Some gaps remain — flagged in missing information."
          : "Evidence is thin — treat findings as preliminary."
    }`,
  );

  sections.push({
    key: "executive_summary",
    label: "Executive Summary",
    body: joinList(summaryParts, " "),
    client_safe: true,
  });

  sections.push({
    key: "current_system_read",
    label: "Current System Read",
    body: snap.items
      .filter((i) => i.client_safe)
      .slice(0, 12)
      .map((i) => `• ${i.module} — ${i.title}${i.detail ? `: ${i.detail}` : ""}`)
      .join("\n") || "No client-safe evidence captured yet.",
    client_safe: true,
  });

  sections.push({
    key: "evidence_used",
    label: "Evidence Used",
    body: Object.entries(snap.counts)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `• ${k}: ${n}`)
      .join("\n") || "No structured evidence collected.",
    client_safe: false,
  });

  if (type === "rcc_summary" || type === "diagnostic" || type === "scorecard") {
    const ar = findItems(snap, "invoice_entries")[0];
    const cash = findItems(snap, "cash_position_snapshots")[0];
    const qb = findItems(snap, "quickbooks_period_summaries");
    const lines: string[] = [];
    if (cash) lines.push(`Cash: ${cash.detail}`);
    if (qb.length) lines.push(`QuickBooks (${qb.length} period(s)): ${qb[0].detail}`);
    if (ar) lines.push(`Receivables: ${ar.detail}`);
    if (lines.length) {
      sections.push({
        key: "financial_findings",
        label: "Revenue / Cash / Pipeline Findings",
        body: lines.join("\n"),
        client_safe: true,
      });
    }
  }

  sections.push({
    key: "primary_risks",
    label: "Primary Risks",
    body:
      risks.map((r) => `• [${r.severity}] ${r.title} — ${r.detail}`).join("\n") ||
      "No structural risks detected from current evidence.",
    client_safe: false,
  });

  sections.push({
    key: "recommended_next_actions",
    label: "Recommended Next Actions",
    body:
      recs
        .map(
          (r) =>
            `• [${r.priority}${r.inference ? ", inference" : ""}] ${r.title} — ${r.detail}`,
        )
        .join("\n") || "No recommendations yet — capture more evidence first.",
    client_safe: true,
  });

  sections.push({
    key: "missing_information",
    label: "Missing Information / Validation Needed",
    body:
      missing.map((m) => `• ${m.area}: ${m.what_is_missing} (${m.why_it_matters})`).join("\n") ||
      "No critical gaps detected.",
    client_safe: false,
  });

  sections.push({
    key: "confidence_notes",
    label: "Confidence Notes",
    body: `Confidence: ${confidence}. Evidence sources used: ${
      Object.keys(snap.counts).filter((k) => (snap.counts[k] ?? 0) > 0).length
    }. ${snap.notes.join(" ")}`.trim(),
    client_safe: false,
  });

  sections.push({
    key: "admin_review_notes",
    label: "Admin Review Notes",
    body:
      "Draft — requires RGS review. Edit any section, mark client-safe items, and approve before promoting to a client-facing report.",
    client_safe: false,
  });

  return sections;
}

export function buildDeterministicDraft(
  snap: EvidenceSnapshot,
  type: ReportDraftType,
): DraftPayload {
  const confidence = deriveConfidence(snap);
  const missing = detectMissing(snap);
  const risks = detectRisks(snap);
  const recommendations = detectRecommendations(snap, type);
  const sections = buildSections(snap, type, confidence, recommendations, risks, missing);

  // P20.18 — RGS Stability Snapshot: SWOT-style diagnostic interpretation.
  // Always generated for diagnostic/scorecard reports. Inserted after the
  // score/system-read context and before the primary risks / recommendations.
  const includeSnapshot =
    type === "diagnostic" || type === "scorecard" || type === "rcc_summary";
  let stabilitySnapshot: ReturnType<typeof generateStabilitySnapshot> | undefined;
  if (includeSnapshot) {
    stabilitySnapshot = generateStabilitySnapshot(snap);
    const insertIdx = Math.max(
      0,
      sections.findIndex((s) => s.key === "primary_risks"),
    );
    const snapshotSection: DraftSection = {
      key: "rgs_stability_snapshot",
      // Client-facing title is exactly "RGS Stability Snapshot" — never "SWOT".
      label: "RGS Stability Snapshot",
      body: renderStabilitySnapshotBody(stabilitySnapshot),
      // Draft snapshots are admin-only until reviewed; only Approved snapshots
      // should be promoted to client-safe by the admin during review.
      client_safe: false,
    };
    if (insertIdx > 0) {
      sections.splice(insertIdx, 0, snapshotSection);
    } else {
      sections.push(snapshotSection);
    }
  }

  // P68 — RGS Structural Health Report™: inject the canonical
  // What Is Working / What Is Slipping / Reality Check Flags placeholder /
  // Mirror, Not the Map / Next-Step Options / Scope-Safe Disclaimer
  // sections into the diagnostic family. Repair Map content is appended
  // at PDF/render time from `implementation_roadmap_items` so the report
  // always reflects the latest admin-curated 30/60/90 plan.
  if (isStructuralHealthReportType(type)) {
    const p68Sections = buildStructuralHealthReportSections(snap);
    // Insert before "missing_information" so client-safe content surfaces
    // before the admin-only gaps section.
    const insertAt = sections.findIndex((s) => s.key === "missing_information");
    if (insertAt >= 0) sections.splice(insertAt, 0, ...p68Sections);
    else sections.push(...p68Sections);
  }

  return {
    sections,
    recommendations,
    risks,
    missing_information: missing,
    confidence,
    rubric_version: RUBRIC_VERSION,
    stability_snapshot: stabilitySnapshot,
  };
}

export const REPORT_RUBRIC_VERSION = RUBRIC_VERSION;