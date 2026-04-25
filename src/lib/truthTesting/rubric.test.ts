import { describe, it, expect } from "vitest";
import {
  detectGenericLanguage,
  checkCauseEvidenceImpactAction,
  gradeRecommendation,
  gradeReportDraft,
  evaluateCommercialReadiness,
  CATEGORY_WEIGHTS,
} from "./rubric";
import type { DraftRecommendation, EvidenceSnapshot } from "@/lib/reports/types";

const baseEvidence = (overrides: Partial<EvidenceSnapshot> = {}): EvidenceSnapshot => ({
  collected_at: new Date().toISOString(),
  customer_id: null,
  customer_label: "Test Co",
  is_demo_account: false,
  items: [],
  counts: {},
  notes: [],
  ...overrides,
});

const rec = (over: Partial<DraftRecommendation> = {}): DraftRecommendation => ({
  id: over.id ?? "r1",
  title: over.title ?? "Tighten weekly close cadence",
  detail:
    over.detail ??
    "Close the books every Friday because the QuickBooks ledger shows a 14-day lag, costing roughly $4,200/mo in late invoices. Implement a Friday close SOP.",
  evidence_refs: over.evidence_refs ?? ["quickbooks", "weekly_checkin"],
  inference: over.inference ?? false,
  priority: over.priority ?? "high",
  client_safe: over.client_safe ?? false,
});

describe("truthTesting/rubric", () => {
  it("weights sum to 100", () => {
    const sum = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("penalizes generic output", () => {
    const g = detectGenericLanguage(
      "We will improve marketing and streamline operations to drive value.",
    );
    expect(g.hits.length).toBeGreaterThanOrEqual(2);
  });

  it("checkCauseEvidenceImpactAction: complete CEIA passes", () => {
    const c = checkCauseEvidenceImpactAction(
      "Late invoices because QuickBooks shows a 14-day lag, costing $4,200/mo. Implement a Friday close SOP.",
      { requireAction: true },
    );
    expect(c.cause).toBe(true);
    expect(c.evidence).toBe(true);
    expect(c.impact).toBe(true);
    expect(c.impact_explained_when_unquantified).toBe(true);
    expect(c.action).toBe(true);
  });

  it("recommendation without evidence loses evidence support", () => {
    const g = gradeRecommendation(rec({ evidence_refs: [] }));
    expect(g.has_evidence).toBe(false);
    expect(g.score).toBeLessThan(10);
  });

  it("high confidence with owner-reported-only evidence is penalized", () => {
    const r = gradeReportDraft({
      recommendations: [rec({ evidence_refs: ["interview"] })],
      missing_information: [],
      evidence_snapshot: baseEvidence({
        items: [
          {
            source: "interview",
            module: "Diagnostic interview",
            title: "Owner statement",
            client_safe: false,
          },
        ],
      }),
      confidence: "high",
    });
    const calib = r.categories.find((c) => c.category === "confidence_calibration")!;
    expect(calib.pass).toBe(false);
  });

  it("demo account marked client-safe with proof language fails trust safety", () => {
    const r = gradeReportDraft({
      recommendations: [
        rec({ detail: "Real client case study with proven results — guaranteed lift." }),
      ],
      evidence_snapshot: baseEvidence({ is_demo_account: true }),
      confidence: "low",
      is_demo_account: true,
      client_safe: true,
    });
    const demo = r.categories.find((c) => c.category === "demo_trust_safety")!;
    expect(demo.pass).toBe(false);
  });

  it("complete CEIA recommendation grades highly", () => {
    const g = gradeRecommendation(rec());
    expect(g.score).toBeGreaterThanOrEqual(9);
  });

  it("$3k diagnostic readiness requires evidence and specificity", () => {
    // Strong, evidenced recs but only owner-reported -> evidence_support too low
    const ownerOnly = gradeReportDraft({
      recommendations: [rec({ evidence_refs: ["interview"] })],
      missing_information: [
        { area: "QB", what_is_missing: "Not connected", why_it_matters: "Cannot verify" },
      ],
      evidence_snapshot: baseEvidence({
        items: [
          { source: "interview", module: "Interview", title: "Owner", client_safe: false },
        ],
      }),
      confidence: "medium",
    });
    expect(ownerOnly.readiness.diagnostic_ready).toBe(false);

    // System-tracked + acknowledged gaps → can pass
    const strong = gradeReportDraft({
      recommendations: [rec(), rec({ id: "r2", title: "Stop discount stacking", detail: "Stripe data shows 23% of orders apply 2+ discounts because checkout has no guard. Implement a one-discount rule. Estimated impact: $3,800/mo." })],
      missing_information: [
        { area: "Payroll", what_is_missing: "ADP not connected", why_it_matters: "Labor margin unknown" },
      ],
      evidence_snapshot: baseEvidence({
        items: [
          { source: "quickbooks", module: "QB", title: "Ledger", client_safe: false, is_synced: true },
          { source: "stripe", module: "Stripe", title: "Orders", client_safe: false, is_synced: true },
        ],
      }),
      confidence: "medium",
    });
    expect(strong.readiness.diagnostic_ready).toBe(true);
  });

  it("$10k implementation readiness requires action path and priority clarity", () => {
    const noPriority = gradeReportDraft({
      recommendations: [rec({ priority: "low" }), rec({ id: "r2", priority: "low", title: "Track win rate", detail: "HubSpot shows win rate dropped from 32% to 19% because no triage on inbound. Add a triage SOP. Impact: ~$6,000/mo." })],
      missing_information: [
        { area: "ADP", what_is_missing: "Not connected", why_it_matters: "Labor unknown" },
      ],
      evidence_snapshot: baseEvidence({
        items: [
          { source: "quickbooks", module: "QB", title: "Ledger", client_safe: false, is_synced: true },
          { source: "hubspot", module: "HubSpot", title: "Pipeline", client_safe: false, is_synced: true },
        ],
        notes: ["Owner says revenue is up but ledger shows flat — needs review."],
      }),
      risks: [{ evidence_refs: ["quickbooks"], detail: "Owner / ledger disagreement" }],
      confidence: "medium",
    });
    expect(noPriority.readiness.implementation_ready).toBe(false);
    expect(
      noPriority.readiness.blockers.some((b) => /priority/i.test(b)) ||
        noPriority.readiness.diagnostic_ready === false,
    ).toBe(true);
  });

  it("evaluateCommercialReadiness labels not_ready when total < 85", () => {
    const r = evaluateCommercialReadiness({
      total: 70,
      categories: [],
      is_demo_safety_failed: false,
      has_priority_order: true,
      contradiction_reviewed: true,
    });
    expect(r.label).toBe("not_ready");
    expect(r.diagnostic_ready).toBe(false);
  });
});