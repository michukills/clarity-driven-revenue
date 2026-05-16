/**
 * P101 — Tool report section catalog invariants.
 */
import { describe, it, expect } from "vitest";
import {
  PRIORITY_TOOL_KEYS,
  TOOL_REPORT_SECTION_CATALOG,
  FULL_RGS_ONLY_SECTION_KEYS,
  getAllowedSectionsForTier,
  getFullRgsSectionsForTool,
  getToolReportSectionSet,
} from "@/lib/reports/toolReportSectionCatalog";

const FORBIDDEN = [
  "guaranteed",
  "guarantee ",
  "unlimited",
  "explosive growth",
  "10x",
  "dominate",
  "certified compliance",
  "valuation guarantee",
  "full os access",
];

describe("P101 tool report section catalog", () => {
  it("defines all four section sets for every priority tool", () => {
    for (const key of PRIORITY_TOOL_KEYS) {
      const set = getToolReportSectionSet(key);
      expect(set, `missing catalog for ${key}`).toBeTruthy();
      expect(set!.basic.length).toBeGreaterThan(0);
      expect(set!.standard.length).toBeGreaterThan(0);
      expect(set!.premium.length).toBeGreaterThan(0);
      expect(set!.full_rgs.length).toBeGreaterThan(0);
    }
  });

  it("Basic ⊆ Standard ⊆ Premium for every priority tool", () => {
    for (const key of PRIORITY_TOOL_KEYS) {
      const set = getToolReportSectionSet(key)!;
      const standardKeys = new Set(set.standard.map((s) => s.key));
      const premiumKeys = new Set(set.premium.map((s) => s.key));
      for (const b of set.basic) {
        expect(standardKeys.has(b.key), `${key}: basic ${b.key} missing from standard`).toBe(true);
      }
      for (const s of set.standard) {
        expect(premiumKeys.has(s.key), `${key}: standard ${s.key} missing from premium`).toBe(true);
      }
    }
  });

  it("full_rgs-only section keys never appear in gig tier sets", () => {
    for (const key of PRIORITY_TOOL_KEYS) {
      const set = getToolReportSectionSet(key)!;
      const gigKeys = new Set(
        [...set.basic, ...set.standard, ...set.premium].map((s) => s.key),
      );
      for (const forbidden of FULL_RGS_ONLY_SECTION_KEYS) {
        expect(gigKeys.has(forbidden), `${key}: gig set leaks ${forbidden}`).toBe(false);
      }
    }
  });

  it("no section label contains forbidden guarantee/compliance copy", () => {
    for (const [key, set] of Object.entries(TOOL_REPORT_SECTION_CATALOG)) {
      const all = [...set.basic, ...set.standard, ...set.premium, ...set.full_rgs];
      for (const sec of all) {
        const text = sec.label.toLowerCase();
        for (const phrase of FORBIDDEN) {
          expect(text.includes(phrase), `${key}: label "${sec.label}" contains "${phrase}"`).toBe(
            false,
          );
        }
      }
    }
  });

  it("getAllowedSectionsForTier returns basic when tier is null", () => {
    const result = getAllowedSectionsForTier("sop_training_bible", null);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toEqual(TOOL_REPORT_SECTION_CATALOG.sop_training_bible.basic);
  });

  it("getFullRgsSectionsForTool returns the full_rgs set", () => {
    const result = getFullRgsSectionsForTool("swot_strategic_matrix");
    expect(result).toEqual(TOOL_REPORT_SECTION_CATALOG.swot_strategic_matrix.full_rgs);
  });

  it("returns empty/null for unknown tool keys", () => {
    expect(getToolReportSectionSet("not_a_real_tool")).toBeNull();
    expect(getAllowedSectionsForTier("not_a_real_tool", "basic")).toEqual([]);
    expect(getFullRgsSectionsForTool("not_a_real_tool")).toEqual([]);
  });
});