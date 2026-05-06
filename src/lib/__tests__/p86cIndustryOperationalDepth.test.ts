/**
 * P86C — RGS Industry Operational Depth™ tests.
 * Pure deterministic-logic + config tests. No network. No AI.
 */
import { describe, it, expect } from "vitest";
import {
  DEPTH_INDUSTRY_KEYS,
  DEPTH_METRICS_ALL,
  DEPTH_METRICS_BY_INDUSTRY,
  DEPTH_FORBIDDEN_CLAIMS,
  DEPTH_CLIENT_SAFE_EXPLANATION,
  DEPTH_REPORT_SAFE_LANGUAGE,
  DEPTH_ADMIN_INTERPRETATION,
  DEPTH_EVIDENCE_EXAMPLES,
  ECOM_FULFILLMENT_SLA_HOURS_THRESHOLD,
  ECOM_REPEAT_PURCHASE_PCT_THRESHOLD,
  ECOM_RETURN_RATE_PCT_THRESHOLD,
  PROF_AR_DAYS_THRESHOLD,
  PROF_SCOPE_CHANGE_RATE_THRESHOLD,
  PROF_UTILIZATION_PCT_THRESHOLD,
  RESTAURANT_FOOD_COST_PCT_THRESHOLD,
  RESTAURANT_GROSS_MARGIN_PCT_THRESHOLD,
  RESTAURANT_LABOR_COST_PCT_THRESHOLD,
  RESTAURANT_VENDOR_COST_CHANGE_PCT_THRESHOLD,
  RETAIL_DEAD_STOCK_HIGH_THRESHOLD,
  RETAIL_INVENTORY_TURNOVER_THRESHOLD,
  RETAIL_RETURN_RATE_PCT_THRESHOLD,
  findDepthForbiddenPhrase,
  getDepthMetricDefinition,
  getDepthMetricsForIndustry,
  isDepthIndustryKey,
  resolveDepthIndustryKey,
} from "@/config/industryOperationalDepth";
import {
  detectArAgingDrag,
  detectDeadInventory,
  detectEcomReturnRate,
  detectFoodCostCreep,
  detectFulfillmentSlaDrift,
  detectGeneralOwnerBottleneck,
  detectGeneralProfitVisibility,
  detectGeneralWeeklyReview,
  detectHighSalesWeakMargin,
  detectLaborOutOfControl,
  detectLowUtilization,
  detectNoCategoryMargin,
  detectRetailReturnRate,
  detectScopeCreep,
  detectSlowTurnover,
  detectVendorCostChange,
  detectWeakRepeatPurchase,
} from "@/lib/industryOperationalDepth";

describe("P86C — Industry Operational Depth config", () => {
  it("covers the five hardened industries", () => {
    expect(DEPTH_INDUSTRY_KEYS).toEqual([
      "general_small_business",
      "restaurant_food_service",
      "retail",
      "professional_services",
      "ecommerce_online_retail",
    ]);
  });

  it("resolves common aliases", () => {
    expect(resolveDepthIndustryKey("general")).toBe("general_small_business");
    expect(resolveDepthIndustryKey("restaurant")).toBe("restaurant_food_service");
    expect(resolveDepthIndustryKey("ecommerce")).toBe("ecommerce_online_retail");
    expect(resolveDepthIndustryKey("e_commerce")).toBe("ecommerce_online_retail");
    expect(resolveDepthIndustryKey("consulting")).toBe("professional_services");
    expect(resolveDepthIndustryKey("retail")).toBe("retail");
    expect(isDepthIndustryKey("trades_services")).toBe(false);
    expect(isDepthIndustryKey("mmj_cannabis")).toBe(false);
    expect(isDepthIndustryKey(null)).toBe(false);
    expect(isDepthIndustryKey(undefined)).toBe(false);
  });

  it("each industry has at least three deterministic metrics", () => {
    for (const k of DEPTH_INDUSTRY_KEYS) {
      expect(DEPTH_METRICS_BY_INDUSTRY[k].length).toBeGreaterThanOrEqual(3);
    }
    expect(DEPTH_METRICS_ALL.length).toBe(
      Object.values(DEPTH_METRICS_BY_INDUSTRY).reduce((a, b) => a + b.length, 0),
    );
  });

  it("every metric has a deterministic trigger rule, evidence, repair recommendation, and gear", () => {
    for (const m of DEPTH_METRICS_ALL) {
      expect(m.metric_key).toMatch(/^[a-z_]+\.[a-z_]+$/);
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.gears.length).toBeGreaterThan(0);
      expect(m.trigger_rule.length).toBeGreaterThan(20);
      expect(m.client_safe_explanation.length).toBeGreaterThan(20);
      expect(m.evidence_examples.length).toBeGreaterThan(0);
      expect(m.repair_map_recommendation.length).toBeGreaterThan(10);
      expect(m.recommended_quick_start_templates.length).toBeGreaterThan(0);
    }
  });

  it("forbidden claims block legal/tax/audit/lender/investor/compliance language in every metric copy", () => {
    for (const m of DEPTH_METRICS_ALL) {
      expect(findDepthForbiddenPhrase(m.client_safe_explanation)).toBeNull();
      expect(findDepthForbiddenPhrase(m.forward_risk)).toBeNull();
      expect(findDepthForbiddenPhrase(m.repair_map_recommendation)).toBeNull();
      expect(findDepthForbiddenPhrase(m.trigger_rule)).toBeNull();
    }
    expect(findDepthForbiddenPhrase(DEPTH_CLIENT_SAFE_EXPLANATION)).toBeNull();
    expect(findDepthForbiddenPhrase(DEPTH_REPORT_SAFE_LANGUAGE)).toBeNull();
  });

  it("forbidden phrase matcher catches representative banned terms", () => {
    expect(findDepthForbiddenPhrase("This guarantees compliance certification.")).not.toBeNull();
    expect(findDepthForbiddenPhrase("audit-ready report")).not.toBeNull();
    expect(findDepthForbiddenPhrase("lender-ready package")).not.toBeNull();
    expect(findDepthForbiddenPhrase("investor-ready disclosure")).not.toBeNull();
    expect(findDepthForbiddenPhrase("hipaa workflow")).not.toBeNull();
    expect(findDepthForbiddenPhrase("operational readiness signal")).toBeNull();
  });

  it("admin interpretation labels every third-party system as manual export / upload", () => {
    for (const e of DEPTH_EVIDENCE_EXAMPLES) {
      expect(e.live_connector).toBe(false);
    }
    expect(DEPTH_ADMIN_INTERPRETATION.toLowerCase()).toContain("does not maintain live syncs");
  });

  it("getDepthMetricsForIndustry returns industry-specific metrics", () => {
    expect(getDepthMetricsForIndustry("retail").every((m) => m.industry_key === "retail")).toBe(true);
    expect(getDepthMetricsForIndustry("trades_services")).toEqual([]);
    expect(getDepthMetricDefinition("retail.dead_inventory").industry_key).toBe("retail");
  });
});

describe("P86C — General Small Business detectors", () => {
  it("flags missing weekly review", () => {
    expect(detectGeneralWeeklyReview({ hasWeeklyReview: false, industryKey: "general" }).status).toBe("high_risk");
    expect(detectGeneralWeeklyReview({ hasWeeklyReview: true, industryKey: "general" }).status).toBe("current");
    expect(detectGeneralWeeklyReview({ hasWeeklyReview: null, industryKey: "general" }).status).toBe("needs_review");
    expect(detectGeneralWeeklyReview({ hasWeeklyReview: false, industryKey: "retail" }).status).toBe("not_applicable");
  });
  it("flags owner bottleneck and missing profit visibility", () => {
    expect(detectGeneralOwnerBottleneck({ ownerIsBottleneck: true, industryKey: "general" }).severity).toBe("high");
    expect(detectGeneralProfitVisibility({ profitVisibleMonthly: false, industryKey: "general" }).needs_reinspection).toBe(true);
  });
});

describe("P86C — Restaurant detectors", () => {
  it("food cost creep triggers above 33%", () => {
    expect(detectFoodCostCreep({ foodCostPct: 33, industryKey: "restaurant" }).status).toBe("current");
    expect(detectFoodCostCreep({ foodCostPct: 33.1, industryKey: "restaurant" }).status).toBe("high_risk");
    expect(detectFoodCostCreep({ foodCostPct: 41, industryKey: "restaurant" }).severity).toBe("severe");
    expect(detectFoodCostCreep({ foodCostPct: 30, industryKey: "trades_services" }).status).toBe("not_applicable");
    expect(detectFoodCostCreep({ foodCostPct: 200, industryKey: "restaurant" }).status).toBe("invalid_input");
    expect(RESTAURANT_FOOD_COST_PCT_THRESHOLD).toBe(33);
  });
  it("labor / margin / vendor detectors honour deterministic thresholds", () => {
    expect(detectLaborOutOfControl({ laborCostPct: 32.5, industryKey: "restaurant" }).status).toBe("high_risk");
    expect(detectHighSalesWeakMargin({ grossMarginPct: 59, industryKey: "restaurant" }).status).toBe("high_risk");
    expect(detectVendorCostChange({ vendorCostChangePct: 5, pricingReviewed: false, industryKey: "restaurant" }).status).toBe("high_risk");
    expect(detectVendorCostChange({ vendorCostChangePct: 6, pricingReviewed: true, industryKey: "restaurant" }).status).toBe("current");
    expect(RESTAURANT_LABOR_COST_PCT_THRESHOLD).toBe(32);
    expect(RESTAURANT_GROSS_MARGIN_PCT_THRESHOLD).toBe(60);
    expect(RESTAURANT_VENDOR_COST_CHANGE_PCT_THRESHOLD).toBe(5);
  });
});

describe("P86C — Retail detectors", () => {
  it("dead inventory escalates above $10k", () => {
    expect(detectDeadInventory({ deadStockValue: 0, industryKey: "retail" }).status).toBe("current");
    expect(detectDeadInventory({ deadStockValue: 500, industryKey: "retail" }).severity).toBe("high");
    expect(detectDeadInventory({ deadStockValue: 15000, industryKey: "retail" }).severity).toBe("severe");
    expect(RETAIL_DEAD_STOCK_HIGH_THRESHOLD).toBe(10000);
  });
  it("turnover / return / category detectors fire correctly", () => {
    expect(detectSlowTurnover({ inventoryTurnover: 3.5, industryKey: "retail" }).status).toBe("high_risk");
    expect(detectSlowTurnover({ inventoryTurnover: 4, industryKey: "retail" }).status).toBe("current");
    expect(detectRetailReturnRate({ returnRatePct: 9, industryKey: "retail" }).status).toBe("high_risk");
    expect(detectRetailReturnRate({ returnRatePct: 16, industryKey: "retail" }).severity).toBe("severe");
    expect(detectNoCategoryMargin({ hasCategoryMargin: false, industryKey: "retail" }).needs_reinspection).toBe(true);
    expect(detectNoCategoryMargin({ hasCategoryMargin: null, industryKey: "retail" }).status).toBe("needs_review");
    expect(RETAIL_INVENTORY_TURNOVER_THRESHOLD).toBe(4);
    expect(RETAIL_RETURN_RATE_PCT_THRESHOLD).toBe(8);
  });
});

describe("P86C — Professional Services detectors", () => {
  it("utilization, scope creep, A/R aging detect correctly", () => {
    expect(detectLowUtilization({ utilizationPct: 59, industryKey: "professional_services" }).status).toBe("high_risk");
    expect(detectLowUtilization({ utilizationPct: 35, industryKey: "professional_services" }).severity).toBe("severe");
    expect(detectScopeCreep({ scopeChangeRatePct: 30, signedChangeOrders: false, industryKey: "professional_services" }).status).toBe("high_risk");
    expect(detectScopeCreep({ scopeChangeRatePct: 30, signedChangeOrders: true, industryKey: "professional_services" }).status).toBe("current");
    expect(detectArAgingDrag({ avgArDays: 50, industryKey: "professional_services" }).status).toBe("high_risk");
    expect(detectArAgingDrag({ avgArDays: 100, industryKey: "professional_services" }).severity).toBe("severe");
    expect(PROF_UTILIZATION_PCT_THRESHOLD).toBe(60);
    expect(PROF_AR_DAYS_THRESHOLD).toBe(45);
    expect(PROF_SCOPE_CHANGE_RATE_THRESHOLD).toBe(25);
  });
});

describe("P86C — E-commerce detectors", () => {
  it("fulfillment / return / repeat-purchase detectors honour thresholds", () => {
    expect(detectFulfillmentSlaDrift({ avgShipHours: 49, industryKey: "ecommerce" }).status).toBe("high_risk");
    expect(detectFulfillmentSlaDrift({ avgShipHours: 100, industryKey: "ecommerce" }).severity).toBe("severe");
    expect(detectEcomReturnRate({ returnRatePct: 11, industryKey: "ecommerce" }).status).toBe("high_risk");
    expect(detectEcomReturnRate({ returnRatePct: 22, industryKey: "ecommerce" }).severity).toBe("severe");
    expect(detectWeakRepeatPurchase({ repeatPurchasePct: 19, industryKey: "ecommerce" }).status).toBe("high_risk");
    expect(detectWeakRepeatPurchase({ repeatPurchasePct: 8, industryKey: "ecommerce" }).severity).toBe("severe");
    expect(ECOM_FULFILLMENT_SLA_HOURS_THRESHOLD).toBe(48);
    expect(ECOM_RETURN_RATE_PCT_THRESHOLD).toBe(10);
    expect(ECOM_REPEAT_PURCHASE_PCT_THRESHOLD).toBe(20);
  });
  it("non-ecommerce industries are not_applicable", () => {
    expect(detectFulfillmentSlaDrift({ avgShipHours: 999, industryKey: "retail" }).status).toBe("not_applicable");
    expect(detectEcomReturnRate({ returnRatePct: 50, industryKey: "trades_services" }).status).toBe("not_applicable");
  });
});

describe("P86C — Preserves earlier phases", () => {
  it("does not pollute trades / cannabis industry keys", () => {
    expect(isDepthIndustryKey("trades_services")).toBe(false);
    expect(isDepthIndustryKey("mmj_cannabis")).toBe(false);
    expect(isDepthIndustryKey("cannabis_mmj_mmc")).toBe(false);
    expect(DEPTH_FORBIDDEN_CLAIMS).toContain("legal compliance");
    expect(DEPTH_FORBIDDEN_CLAIMS).toContain("audit readiness");
    expect(DEPTH_FORBIDDEN_CLAIMS).toContain("lender-ready");
    expect(DEPTH_FORBIDDEN_CLAIMS).toContain("investor-ready");
  });
});