import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  INDUSTRY_LANDING_CONTENT,
  INDUSTRY_LANDING_SLUGS,
} from "@/lib/industries/landingContent";
import { classifyIndustry, shouldApplyClassification } from "@/lib/industries/classifier";
import {
  getIndustryEmphasis,
  INDUSTRY_EMPHASIS_KEYS,
} from "@/lib/industries/interpretation";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("Industry Launch Expansion — landing content", () => {
  it("has all five industry slugs registered", () => {
    expect(INDUSTRY_LANDING_SLUGS).toEqual([
      "general-business",
      "trades-field-service",
      "restaurant-food-service",
      "retail",
      "cannabis-mmj-dispensary",
    ]);
  });

  it("each landing has SEO + scope blocks and no fake-proof phrases", () => {
    const banned = [
      /trusted by/i, /clients say/i, /guaranteed/i, /100% coverage/i,
      /unlimited support/i, /case study/i,
    ];
    for (const slug of INDUSTRY_LANDING_SLUGS) {
      const c = INDUSTRY_LANDING_CONTENT[slug];
      expect(c.seoTitle.length).toBeGreaterThan(10);
      expect(c.seoDescription.length).toBeGreaterThan(20);
      expect(c.slippingGears.length).toBeGreaterThan(2);
      expect(c.notWhatRgsDoes.join(" ")).toMatch(/Not a substitute for legal/i);
      const blob = JSON.stringify(c);
      for (const re of banned) expect(blob).not.toMatch(re);
    }
  });

  it("cannabis landing is dispensary scope only — no healthcare drift", () => {
    const c = INDUSTRY_LANDING_CONTENT["cannabis-mmj-dispensary"];
    const blob = JSON.stringify(c).toLowerCase();
    expect(blob).toContain("dispensary");
    expect(blob).toMatch(/not legal advice/);
    expect(blob).toMatch(/not a compliance guarantee/);
    // healthcare terms must only appear inside the explicit "not" guard list
    expect(c.notWhatRgsDoes.join(" ")).toMatch(/HIPAA/);
    // No positive use of healthcare framing in slipping/diagnostic blocks
    const positive = [
      ...c.slippingGears, ...c.diagnosticLooksFor,
      ...c.implementationInstalls, ...c.controlSystemMonitors,
    ].join(" ").toLowerCase();
    expect(positive).not.toContain("hipaa");
    expect(positive).not.toContain("patient");
    expect(positive).not.toContain("clinical");
    expect(positive).not.toContain("insurance claim");
  });
});

describe("Industry Launch Expansion — education page", () => {
  it("public industry-brain page exists", () => {
    expect(existsSync(join(root, "src/pages/IndustryBrainEducation.tsx"))).toBe(true);
  });

  it("education page explains deterministic scoring + AI is support", () => {
    const src = read("src/pages/IndustryBrainEducation.tsx");
    expect(src).toMatch(/deterministic/);
    expect(src).toMatch(/AI is support/i);
    expect(src).toMatch(/Not legal advice/);
    expect(src).toMatch(/Not a compliance guarantee/);
    expect(src).not.toMatch(/HIPAA[^,)]/); // HIPAA only inside the explicit not-list
  });
});

describe("Industry classifier", () => {
  it("classifies cannabis / MMJ / dispensary text", () => {
    const r = classifyIndustry({ business_description: "We run a cannabis dispensary." });
    expect(r.inferred_industry).toBe("mmj_cannabis");
  });
  it("medical marijuana maps to cannabis (not healthcare)", () => {
    const r = classifyIndustry({ business_description: "Medical marijuana retail store." });
    expect(r.inferred_industry).toBe("mmj_cannabis");
  });
  it("medical without cannabis -> general + needs review (no healthcare vertical)", () => {
    const r = classifyIndustry({ business_description: "We are a medical clinic with patients." });
    expect(r.inferred_industry).toBe("general_service");
    expect(r.needs_admin_review).toBe(true);
    expect(r.rationale).toMatch(/healthcare/);
  });
  it("restaurant text classifies as restaurant", () => {
    const r = classifyIndustry({ business_description: "A neighborhood pizzeria and cafe." });
    expect(r.inferred_industry).toBe("restaurant");
  });
  it("trades text classifies as trade_field_service", () => {
    const r = classifyIndustry({ business_description: "HVAC and plumbing field service with dispatch." });
    expect(r.inferred_industry).toBe("trade_field_service");
  });
  it("retail text classifies as retail", () => {
    const r = classifyIndustry({ business_description: "Apparel boutique and shopify store." });
    expect(r.inferred_industry).toBe("retail");
  });
  it("vague text is general + needs review", () => {
    const r = classifyIndustry({ business_description: "We do business things." });
    expect(r.inferred_industry).toBe("general_service");
    expect(r.needs_admin_review).toBe(true);
  });
  it("admin-confirmed industry is never overwritten", () => {
    const r = classifyIndustry({ business_description: "Apparel boutique." });
    const ok = shouldApplyClassification({
      current_industry: "restaurant",
      industry_confirmed_by_admin: true,
      result: r,
    });
    expect(ok).toBe(false);
  });
  it("does not overwrite a non-default existing industry", () => {
    const r = classifyIndustry({ business_description: "Apparel boutique." });
    const ok = shouldApplyClassification({
      current_industry: "restaurant",
      industry_confirmed_by_admin: false,
      result: r,
    });
    expect(ok).toBe(false);
  });
});

describe("Industry-adjusted interpretation", () => {
  it("provides emphasis for all five supported industries", () => {
    for (const k of INDUSTRY_EMPHASIS_KEYS) {
      const e = getIndustryEmphasis(k);
      expect(e.priority_gears.length).toBeGreaterThan(0);
      expect(e.priority_signals.length).toBeGreaterThan(2);
      expect(e.repair_priority_emphasis.length).toBeGreaterThan(0);
      expect(e.monitoring_emphasis.length).toBeGreaterThan(0);
    }
  });
  it("falls back to general_service for null/other", () => {
    expect(getIndustryEmphasis(null).industry).toBe("general_service");
    expect(getIndustryEmphasis("other").industry).toBe("general_service");
  });
  it("cannabis emphasis carries safety notes and no healthcare terminology", () => {
    const e = getIndustryEmphasis("mmj_cannabis");
    expect(e.safety_notes.join(" ")).toMatch(/Not legal advice/);
    const blob = JSON.stringify(e).toLowerCase();
    expect(blob).not.toContain("hipaa");
    expect(blob).not.toContain("patient");
    expect(blob).not.toContain("clinical");
    expect(blob).not.toContain("insurance claim");
  });
  it("restaurant emphasis weights prime cost / labor / ticket time", () => {
    const e = getIndustryEmphasis("restaurant");
    expect(e.priority_signals.join(" ")).toMatch(/prime cost/i);
    expect(e.priority_signals.join(" ")).toMatch(/labor cost/i);
  });
  it("trades emphasis weights estimate close rate / dispatch / AR", () => {
    const e = getIndustryEmphasis("trade_field_service");
    expect(e.priority_signals.join(" ")).toMatch(/estimate close/i);
    expect(e.priority_signals.join(" ")).toMatch(/AR aging/i);
  });
  it("retail emphasis weights inventory / shrink / category margin", () => {
    const e = getIndustryEmphasis("retail");
    expect(e.priority_signals.join(" ")).toMatch(/inventory/i);
    expect(e.priority_signals.join(" ")).toMatch(/shrink/i);
  });
});

describe("Routes wired in App.tsx", () => {
  it("registers /industries, /industries/:slug, and /industry-brain", () => {
    const src = read("src/App.tsx");
    expect(src).toMatch(/path="\/industries"/);
    expect(src).toMatch(/path="\/industries\/:slug"/);
    expect(src).toMatch(/path="\/industry-brain"/);
  });
});