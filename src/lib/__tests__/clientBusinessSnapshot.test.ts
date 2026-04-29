import { describe, it, expect } from "vitest";
import {
  buildSnapshotDraft,
  buildPersistedSources,
  industrySupportAssessment,
} from "../clientBusinessSnapshot";

describe("buildSnapshotDraft — never fabricates", () => {
  it("returns Unknown for every field when nothing is recorded", () => {
    const draft = buildSnapshotDraft({ business_name: "Meridian Legal Partners" });
    expect(draft.what_business_does.value).toBeNull();
    expect(draft.products_services.value).toBeNull();
    expect(draft.customer_type.value).toBeNull();
    expect(draft.revenue_model.value).toBeNull();
    expect(draft.operating_model.value).toBeNull();
    expect(draft.service_area.value).toBeNull();
    expect(draft.evidence_strength).toBe("none");
    expect(draft.missing_for_industry.length).toBeGreaterThanOrEqual(5);
  });

  it("does NOT use business name to infer what the business does", () => {
    const draft = buildSnapshotDraft({ business_name: "Acme Plumbing Pros" });
    // No description recorded, so what_business_does must remain Unknown.
    expect(draft.what_business_does.value).toBeNull();
    expect(draft.industry_evidence.value).toBeNull();
  });

  it("uses customer record description when present, with proper source label", () => {
    const draft = buildSnapshotDraft({
      business_description: "Residential HVAC repair and maintenance",
    });
    expect(draft.what_business_does.value).toBe("Residential HVAC repair and maintenance");
    expect(draft.what_business_does.sources[0].label).toBe("customer record");
  });

  it("aggregates evidence from operational profile and admin notes", () => {
    const draft = buildSnapshotDraft({
      business_description: "Boutique retail clothing store",
      service_type: "In-store + online sales",
      operationalProfile: { biggest_constraint: "Slow inventory turnover", team_size: 4 } as any,
      adminNotes: ["Confirmed retail in kickoff call"],
    });
    expect(draft.evidence_strength).not.toBe("none");
    expect(draft.industry_evidence.value).toContain("Operational profile");
    expect(draft.industry_evidence.value).toContain("Admin notes recorded");
  });
});

describe("industrySupportAssessment", () => {
  const emptyDraft = buildSnapshotDraft({});
  const richDraft = buildSnapshotDraft({
    business_description: "Field service plumbing for residential clients",
    service_type: "Emergency repair, scheduled service",
    diagnosticAnswers: {
      customer_type: "Homeowners",
      revenue_model: "Per-job billing",
      operating_model: "2 crews dispatched daily",
      service_area: "Phoenix metro",
    },
  });

  it("warns when no industry is assigned", () => {
    const r = industrySupportAssessment(null, false, emptyDraft);
    expect(r.ok).toBe(false);
    expect(r.warning).toMatch(/no industry assigned/i);
  });

  it("warns when industry is `other`", () => {
    const r = industrySupportAssessment("other", true, richDraft);
    expect(r.ok).toBe(false);
    expect(r.warning).toMatch(/restricted/i);
  });

  it("warns when industry is unconfirmed even with strong evidence", () => {
    const r = industrySupportAssessment("retail", false, richDraft);
    expect(r.ok).toBe(false);
    expect(r.warning).toMatch(/unconfirmed/i);
  });

  it("warns when assignment lacks supporting recorded data (only business name)", () => {
    const r = industrySupportAssessment("retail", true, emptyDraft);
    expect(r.ok).toBe(false);
    expect(r.warning).toMatch(/needs verification/i);
    expect(r.warning).toMatch(/business name/i);
  });

  it("passes when industry is confirmed and recorded evidence is strong", () => {
    const r = industrySupportAssessment("trade_field_service", true, richDraft);
    expect(r.ok).toBe(true);
    expect(r.warning).toBeNull();
  });
});

describe("buildPersistedSources — P32.1 source evidence persistence", () => {
  it("returns an empty array when there is no evidence", () => {
    const draft = buildSnapshotDraft({});
    expect(buildPersistedSources(draft)).toEqual([]);
  });

  it("captures source label and source_field for every backed field", () => {
    const draft = buildSnapshotDraft({
      business_description: "Field service plumbing",
      service_type: "Repairs",
      diagnosticAnswers: { customer_type: "Homeowners" },
    });
    const sources = buildPersistedSources(draft);
    expect(sources.length).toBeGreaterThanOrEqual(3);
    const fields = new Set(sources.map((s) => s.source_field));
    expect(fields.has("what_business_does")).toBe(true);
    expect(fields.has("products_services")).toBe(true);
    expect(fields.has("customer_type")).toBe(true);
    // Every entry has a captured_at ISO timestamp and a non-empty label.
    for (const s of sources) {
      expect(typeof s.captured_at).toBe("string");
      expect(s.captured_at.length).toBeGreaterThan(0);
      expect(s.source_label.length).toBeGreaterThan(0);
    }
  });

  it("never includes raw uploaded file content — metadata/labels only", () => {
    const draft = buildSnapshotDraft({
      business_description: "Some business",
      adminNotes: ["Confidential admin memo: do not leak"],
    });
    const sources = buildPersistedSources(draft);
    for (const s of sources) {
      // Source labels are short generic strings — never the raw content.
      expect(s.source_label).not.toContain("Confidential");
      expect(s.source_label).not.toContain("memo");
    }
  });
});