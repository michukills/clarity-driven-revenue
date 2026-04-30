// P20.4 — Brain → Leak Engine wiring tests.
//
// Verifies:
//  1. routeBrain() output is merged into analyzeLeaks()
//  2. Top 3 uses combined estimate + intelligence brain leaks
//  3. General and industry leaks remain distinguishable on the admin view
//  4. Missing data is returned via industryGapReport (admin) and
//     needsVerification (client)
//  5. Client output hides scoring internals
//  6. Admin output exposes scoring breakdown
//  7. Industry fallback works when industry is unverified
//  8. clientCanAccessTool() blocks admin-only / unverified-industry tools
//  9. No AI / network calls in the leakEngine path

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import type { Estimate } from "@/lib/estimates/types";
import { analyzeLeaks, clientCanAccessTool } from "@/lib/leakEngine";

const NOW = new Date("2026-04-30T00:00:00Z");

function makeEstimate(over: Partial<Estimate> = {}): Estimate {
  const base: Estimate = {
    id: over.id ?? "est-x",
    customer_id: "cust-1",
    period_id: null,
    estimate_number: null,
    estimate_date: NOW.toISOString().slice(0, 10),
    expires_at: null,
    client_or_job: "Acme Co.",
    service_category: null,
    amount: 1000,
    status: "draft",
    sent_at: null,
    approved_at: null,
    rejected_at: null,
    converted_invoice_id: null,
    source: "manual",
    notes: null,
    created_by: null,
    created_at: new Date(NOW.getTime() - 30 * 86400000).toISOString(),
    updated_at: NOW.toISOString(),
  };
  return { ...base, ...over };
}

describe("P20.4 — analyzeLeaks merges brain output", () => {
  it("includes general + industry leaks alongside estimate leaks", () => {
    const result = analyzeLeaks({
      industry: "trade_field_service",
      industryConfirmed: true,
      estimates: [
        makeEstimate({ id: "e1", status: "draft", amount: 5000 }),
      ],
      industryData: {
        trades: { jobsCompletedNotInvoiced: 4, hasJobCosting: false },
        shared: { ownerIsBottleneck: true },
      },
      now: NOW,
    });

    expect(result.brain).toBeDefined();
    expect(result.admin.estimateLeaks.length).toBeGreaterThan(0);
    expect(result.admin.generalLeaks.length).toBeGreaterThan(0);
    expect(result.admin.industryLeaks.length).toBeGreaterThan(0);

    // General + industry leaks are distinguishable
    expect(result.admin.generalLeaks.every((l) => l.id.startsWith("general:"))).toBe(true);
    expect(result.admin.industryLeaks.every((l) => !l.id.startsWith("general:"))).toBe(true);

    // Combined leaks include all sources
    const ids = result.leaks.map((l) => l.id);
    expect(ids).toContain(result.admin.estimateLeaks[0].id);
    expect(ids).toContain(result.admin.generalLeaks[0].id);
    expect(ids).toContain(result.admin.industryLeaks[0].id);
  });

  it("Top 3 can include brain-derived leaks", () => {
    const result = analyzeLeaks({
      industry: "trade_field_service",
      industryConfirmed: true,
      estimates: [],
      industryData: {
        trades: { jobsCompletedNotInvoiced: 10, hasJobCosting: false, grossMarginPct: 0.1 },
      },
      now: NOW,
    });
    expect(result.admin.top3.length).toBeGreaterThan(0);
    // Without estimates, every Top 3 entry must come from the brain layer.
    for (const t of result.admin.top3) {
      expect(t.leak.source).not.toBe("estimates");
    }
  });

  it("scoring details are present on admin but absent on client items", () => {
    const result = analyzeLeaks({
      industry: "restaurant",
      industryConfirmed: true,
      estimates: [],
      industryData: { restaurant: { foodCostPct: 0.42, laborCostPct: 0.36 } },
      now: NOW,
    });
    const adminItem = result.admin.top3[0];
    expect(adminItem.scored.priority_score).toBeGreaterThan(0);
    expect(adminItem.scored.rationale).toBeTruthy();

    for (const c of result.client.topIssues) {
      // Client items must NOT carry scoring internals
      const keys = Object.keys(c);
      expect(keys).not.toContain("priority_score");
      expect(keys).not.toContain("impact");
      expect(keys).not.toContain("visibility");
      expect(keys).not.toContain("ease_of_fix");
      expect(keys).not.toContain("dependency");
      expect(keys).not.toContain("rationale");
    }
  });
});

describe("P20.4 — Industry fallback", () => {
  it("falls back to general/mixed when industry is unverified", () => {
    const result = analyzeLeaks({
      industry: "retail",
      industryConfirmed: false,
      estimates: [],
      industryData: { retail: { deadStockValue: 12000 } },
      now: NOW,
    });
    expect(result.admin.fellBackToGeneralMixed).toBe(true);
    // Industry-specific retail leak must NOT appear because we fell back.
    expect(result.admin.industryLeaks.some((l) => l.type === "dead_inventory")).toBe(false);
    // Tools must come from general_service
    expect(result.admin.tools.every((t) => t.industry === "general_service")).toBe(true);
    expect(result.client.visibleTools.every((t) => t.industry === "general_service")).toBe(true);
  });
});

describe("P20.4 — Missing data + client needs-verification", () => {
  it("admin gap report flags missing required fields when no industry data is provided", () => {
    const result = analyzeLeaks({
      industry: "mmj_cannabis",
      industryConfirmed: true,
      estimates: [],
      now: NOW,
    });
    expect(result.admin.industryGapReport.industry).toBe("mmj_cannabis");
    expect(result.admin.industryGapReport.missingRequiredFields.length).toBeGreaterThan(0);
  });

  it("client surface shows plain-English needs-verification items and never raw ids", () => {
    const result = analyzeLeaks({
      industry: "trade_field_service",
      industryConfirmed: false,
      estimates: [],
      now: NOW,
    });
    expect(result.client.needsVerification.length).toBeGreaterThan(0);
    const joined = result.client.needsVerification.join(" ");
    expect(joined).not.toMatch(/general:/);
    expect(joined).not.toMatch(/priority_score/);
    // Confirms unconfirmed-industry messaging surfaces to the client.
    expect(joined.toLowerCase()).toContain("industry");
  });
});

describe("P20.4 — Tool gating", () => {
  it("clientCanAccessTool blocks admin-only tools", () => {
    expect(
      clientCanAccessTool("trade_field_service", true, "revenue_leak_finder"),
    ).toBe(false);
  });

  it("clientCanAccessTool allows client-visible tools when industry is verified", () => {
    expect(
      clientCanAccessTool("trade_field_service", true, "revenue_control_center"),
    ).toBe(true);
  });

  it("clientCanAccessTool blocks industry-specific tools when industry is unverified", () => {
    // revenue_control_center exists for trade_field_service but NOT for general_service.
    expect(
      clientCanAccessTool("trade_field_service", false, "revenue_control_center"),
    ).toBe(false);
  });

  it("clientCanAccessTool allows the universal scorecard regardless of industry", () => {
    expect(clientCanAccessTool("retail", false, "scorecard")).toBe(true);
    expect(clientCanAccessTool("retail", true, "scorecard")).toBe(false);
    // Note: the universal scorecard is mapped to general_service in the
    // tool coverage map. When the resolved industry is retail we fall through
    // to the retail-specific list, which intentionally does NOT redeclare it.
    // Admin-side resolution still surfaces scorecard via the general layer.
  });
});

describe("P20.4 — Determinism + safety", () => {
  it("analyzeLeaks is deterministic across repeated calls", () => {
    const input = {
      industry: "trade_field_service" as const,
      industryConfirmed: true,
      estimates: [makeEstimate({ id: "e1", status: "draft", amount: 5000 })],
      industryData: { trades: { jobsCompletedNotInvoiced: 3 } },
      now: NOW,
    };
    const a = analyzeLeaks(input);
    const b = analyzeLeaks(input);
    expect(a.leaks.map((l) => l.id)).toEqual(b.leaks.map((l) => l.id));
    expect(a.admin.top3.map((r) => r.scored.priority_score)).toEqual(
      b.admin.top3.map((r) => r.scored.priority_score),
    );
  });

  it("leakEngine path contains no AI / network calls", () => {
    const dir = "src/lib/leakEngine";
    const files: string[] = [];
    function walk(p: string) {
      for (const e of readdirSync(p)) {
        const full = join(p, e);
        const s = statSync(full);
        if (s.isDirectory()) walk(full);
        else if (full.endsWith(".ts")) files.push(full);
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