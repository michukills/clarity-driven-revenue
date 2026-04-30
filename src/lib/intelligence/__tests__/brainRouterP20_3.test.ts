// P20.3 — Brain Router + General/Industry Brain tests.
//
// Verifies:
//  1. General brain runs for every industry
//  2. Industry brain output changes by industry
//  3. Missing/unverified industry falls back to General / Mixed
//  4. Unverified industry does not unlock industry-specific tools
//  5. Trades estimates create trades-specific recommendations
//  6. Restaurants produce food/labor/margin recommendations
//  7. Retail produces inventory/margin recommendations
//  8. Medical/MMC produces billing/reimbursement recommendations
//  9. Confidence labels are preserved
// 10. Missing data becomes Needs Verification
// 11. No AI used in brain routing or scoring
// 12. Client output does not expose admin-only reasoning

import { describe, it, expect } from "vitest";
import {
  routeBrain,
  runGeneralBrain,
  toolsForIndustry,
  clientVisibleToolsForIndustry,
  dataMapFor,
} from "..";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ALL_INDUSTRIES: IndustryCategory[] = [
  "trade_field_service",
  "restaurant",
  "retail",
  "mmj_cannabis",
  "general_service",
  "other",
];

describe("P20.3 General brain", () => {
  it("runs for every industry and emits at least one leak when industry unconfirmed", () => {
    for (const industry of ALL_INDUSTRIES) {
      const r = runGeneralBrain({ industry, industryConfirmed: false });
      expect(r.brain).toBe("general");
      expect(r.leaks.length).toBeGreaterThan(0);
      // unconfirmed industry must produce a Needs Verification leak
      expect(r.leaks.some((l) => l.confidence === "Needs Verification")).toBe(true);
    }
  });

  it("preserves confidence labels from shared hints", () => {
    const r = runGeneralBrain({
      industry: "trade_field_service",
      industryConfirmed: true,
      industryData: { shared: { ownerIsBottleneck: true, hasWeeklyReview: false } },
    });
    expect(r.leaks.some((l) => l.type === "owner_dependent_process" && l.confidence === "Confirmed")).toBe(true);
    expect(r.leaks.some((l) => l.type === "inconsistent_review_rhythm" && l.confidence === "Confirmed")).toBe(true);
  });
});

describe("P20.3 Brain router fallback", () => {
  it("falls back to general_service when industry is unverified", () => {
    const out = routeBrain({
      industry: "trade_field_service",
      industryConfirmed: false,
      industryData: { trades: { jobsCompletedNotInvoiced: 5 } },
    });
    expect(out.fellBackToGeneralMixed).toBe(true);
    expect(out.industryUsed).toBe("general_service");
    // Industry-specific trades leak must NOT appear because we fell back.
    expect(out.industryLeaks.find((l) => l.type === "jobs_completed_not_invoiced_bulk")).toBeUndefined();
  });

  it("does not unlock industry-specific tools when unverified", () => {
    const out = routeBrain({
      industry: "retail",
      industryConfirmed: false,
    });
    // Tools resolved are for general_service, not retail.
    expect(out.tools.every((t) => t.industry === "general_service")).toBe(true);
  });

  it("uses the requested industry brain when confirmed", () => {
    const out = routeBrain({
      industry: "trade_field_service",
      industryConfirmed: true,
      industryData: { trades: { jobsCompletedNotInvoiced: 3, hasJobCosting: false } },
    });
    expect(out.fellBackToGeneralMixed).toBe(false);
    expect(out.industryBrain).toBe("trade_field_service");
    expect(out.industryLeaks.some((l) => l.type === "jobs_completed_not_invoiced_bulk")).toBe(true);
    expect(out.industryLeaks.some((l) => l.type === "no_job_costing")).toBe(true);
  });
});

describe("P20.3 Industry-specific outputs", () => {
  it("trades produces estimate / invoicing / margin recommendations", () => {
    const out = routeBrain({
      industry: "trade_field_service",
      industryConfirmed: true,
      industryData: {
        trades: {
          estimatesUnsent: 6,
          jobsCompletedNotInvoiced: 4,
          hasJobCosting: false,
          grossMarginPct: 0.18,
        },
      },
    });
    const types = out.industryLeaks.map((l) => l.type);
    expect(types).toContain("estimates_unsent_backlog");
    expect(types).toContain("jobs_completed_not_invoiced_bulk");
    expect(types).toContain("no_job_costing");
    expect(types).toContain("low_gross_margin");
  });

  it("restaurants produce food/labor/margin/waste recommendations", () => {
    const out = routeBrain({
      industry: "restaurant",
      industryConfirmed: true,
      industryData: {
        restaurant: {
          foodCostPct: 0.42,
          laborCostPct: 0.35,
          grossMarginPct: 0.5,
          tracksWaste: false,
          hasDailyReporting: false,
        },
      },
    });
    const types = out.industryLeaks.map((l) => l.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "food_cost_creep",
        "labor_out_of_control",
        "high_sales_weak_margin",
        "waste_not_tracked",
        "no_daily_reporting",
      ]),
    );
  });

  it("retail produces inventory/margin recommendations", () => {
    const out = routeBrain({
      industry: "retail",
      industryConfirmed: true,
      industryData: {
        retail: {
          deadStockValue: 12000,
          inventoryTurnover: 2,
          stockoutCount: 4,
          returnRatePct: 0.12,
          hasCategoryMargin: false,
        },
      },
    });
    const types = out.industryLeaks.map((l) => l.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "dead_inventory",
        "slow_inventory_turnover",
        "stockouts_on_profitable_items",
        "high_return_rate",
        "no_category_margin_visibility",
      ]),
    );
  });

  it("medical/MMC produces billing/reimbursement recommendations", () => {
    const out = routeBrain({
      industry: "mmj_cannabis",
      industryConfirmed: true,
      industryData: {
        medical: {
          unbilledServiceCount: 12,
          avgBillingDelayDays: 9,
          avgReimbursementDelayDays: 45,
          followUpBacklog: 7,
        },
      },
    });
    const types = out.industryLeaks.map((l) => l.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "services_not_billed",
        "delayed_claims_or_billing",
        "reimbursement_delays",
        "incomplete_follow_up",
      ]),
    );
  });
});

describe("P20.3 Confidence and missing-data behavior", () => {
  it("missing industry data still runs general but no industry leaks", () => {
    const out = routeBrain({
      industry: "retail",
      industryConfirmed: true,
      industryData: { shared: { hasWeeklyReview: false } },
    });
    expect(out.industryLeaks).toEqual([]);
    expect(out.generalLeaks.length).toBeGreaterThan(0);
  });

  it("flags incomplete data as Needs Verification when industry unconfirmed", () => {
    const out = routeBrain({ industry: "other", industryConfirmed: false });
    const flag = out.generalLeaks.find((l) => l.id.includes("industry_unconfirmed"));
    expect(flag?.confidence).toBe("Needs Verification");
  });
});

describe("P20.3 Tool coverage map", () => {
  it("maps tools per industry and exposes admin-only vs client-visible split", () => {
    const trades = toolsForIndustry("trade_field_service");
    expect(trades.length).toBeGreaterThan(0);
    expect(trades.some((t) => t.visibility === "admin_only")).toBe(true);
    const clientOnly = clientVisibleToolsForIndustry("trade_field_service");
    expect(clientOnly.every((t) => t.visibility === "client_visible")).toBe(true);
  });

  it("data map covers every supported industry", () => {
    for (const industry of ALL_INDUSTRIES) {
      expect(dataMapFor(industry).length).toBeGreaterThan(0);
    }
  });
});

describe("P20.3 Determinism + safety", () => {
  it("brain router is deterministic across repeated calls", () => {
    const input = {
      industry: "trade_field_service" as const,
      industryConfirmed: true,
      industryData: { trades: { estimatesUnsent: 3, jobsCompletedNotInvoiced: 2 } },
    };
    const a = routeBrain(input);
    const b = routeBrain(input);
    expect(a.combinedLeaks.map((l) => l.id)).toEqual(b.combinedLeaks.map((l) => l.id));
  });

  it("intelligence layer contains no AI / network calls", () => {
    const dir = "src/lib/intelligence";
    const files: string[] = [];
    function walk(p: string) {
      for (const e of readdirSync(p)) {
        const full = join(p, e);
        const s = statSync(full);
        if (s.isDirectory()) walk(full);
        else if (full.endsWith(".ts") && !full.includes("__tests__")) files.push(full);
      }
    }
    walk(dir);
    const forbidden = [/\bfetch\s*\(/, /openai/i, /lovable-ai/i, /gemini/i, /anthropic/i];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const pat of forbidden) {
        expect(pat.test(src), `${f} must not contain ${pat}`).toBe(false);
      }
    }
  });
});
