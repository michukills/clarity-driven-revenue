import { describe, it, expect } from "vitest";
import { mapIntakeToIndustry, detectIndustryMismatch } from "../industryIntake";

describe("mapIntakeToIndustry", () => {
  it("maps appointments/jobs to trade_field_service confidently", () => {
    const r = mapIntakeToIndustry({ business_model: "appointments_jobs" });
    expect(r.industry).toBe("trade_field_service");
    expect(r.confident).toBe(true);
    expect(r.needs_review).toBe(false);
  });

  it("maps in_store_orders to retail", () => {
    const r = mapIntakeToIndustry({ business_model: "in_store_orders" });
    expect(r.industry).toBe("retail");
    expect(r.confident).toBe(true);
  });

  it("maps restaurant_orders to restaurant", () => {
    const r = mapIntakeToIndustry({ business_model: "restaurant_orders" });
    expect(r.industry).toBe("restaurant");
  });

  it("flags MMJ as confident but still needs admin review (regulated)", () => {
    const r = mapIntakeToIndustry({ is_regulated_mmj: true });
    expect(r.industry).toBe("mmj_cannabis");
    expect(r.confident).toBe(true);
    expect(r.needs_review).toBe(true);
    expect(r.reason).toMatch(/regulated/i);
  });

  it("MMJ wins even when business_model is something else", () => {
    const r = mapIntakeToIndustry({
      business_model: "in_store_orders",
      is_regulated_mmj: true,
    });
    expect(r.industry).toBe("mmj_cannabis");
  });

  it("unclear intake defaults to other + needs_review", () => {
    const r = mapIntakeToIndustry({ business_model: "other_unsure" });
    expect(r.industry).toBe("other");
    expect(r.confident).toBe(false);
    expect(r.needs_review).toBe(true);
  });

  it("missing answers default to other + needs_review", () => {
    const r = mapIntakeToIndustry({});
    expect(r.confident).toBe(false);
    expect(r.needs_review).toBe(true);
  });

  it("never uses business name (no name input accepted)", () => {
    const r = mapIntakeToIndustry({ describe_what_you_sell: "Acme Plumbing Pros" });
    // Free-text alone should not confidently classify
    expect(r.confident).toBe(false);
  });
});

describe("detectIndustryMismatch", () => {
  it("returns no mismatch when there's no recorded text", () => {
    const r = detectIndustryMismatch({ industry: "retail" });
    expect(r.mismatch).toBe(false);
  });

  it("flags MMJ wording with non-MMJ industry", () => {
    const r = detectIndustryMismatch({
      industry: "retail",
      what_business_does: "Licensed cannabis dispensary serving adults",
    });
    expect(r.mismatch).toBe(true);
    expect(r.suggested_industries).toContain("mmj_cannabis");
  });

  it("flags restaurant-like data with retail industry", () => {
    const r = detectIndustryMismatch({
      industry: "retail",
      what_business_does: "Family diner with full menu and kitchen staff",
    });
    expect(r.mismatch).toBe(true);
    expect(r.message).toMatch(/Possible industry mismatch/i);
    expect(r.suggested_industries).toContain("restaurant");
  });

  it("flags legal/professional wording with restaurant industry", () => {
    const r = detectIndustryMismatch({
      industry: "restaurant",
      what_business_does: "Boutique law firm advising small businesses",
    });
    expect(r.mismatch).toBe(true);
    expect(r.suggested_industries).toContain("general_service");
  });

  it("does not flag when recorded data matches the assigned industry", () => {
    const r = detectIndustryMismatch({
      industry: "trade_field_service",
      what_business_does: "HVAC service trucks dispatched daily",
    });
    expect(r.mismatch).toBe(false);
  });

  it("does not flag when industry is null or other", () => {
    expect(
      detectIndustryMismatch({ industry: null, what_business_does: "Diner with menu" }).mismatch,
    ).toBe(false);
    expect(
      detectIndustryMismatch({ industry: "other", what_business_does: "Diner with menu" }).mismatch,
    ).toBe(false);
  });
});