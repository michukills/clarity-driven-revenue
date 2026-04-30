// P20.2 — Revenue Leak Engine + Priority + Industry tests.

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import type { Estimate } from "@/lib/estimates/types";
import {
  analyzeLeaks,
  applyIndustryRecommendation,
  impactFromDollars,
  leaksFromEstimates,
  leakToScoredIssue,
  prioritizeLeaks,
  signalToLeak,
} from "@/lib/leakEngine";
import type { Leak } from "@/lib/leakEngine";

function makeEstimate(over: Partial<Estimate> = {}): Estimate {
  const now = new Date("2026-04-30T00:00:00Z");
  const base: Estimate = {
    id: over.id ?? `est-${Math.random().toString(36).slice(2, 8)}`,
    customer_id: "cust-1",
    period_id: null,
    estimate_number: null,
    estimate_date: now.toISOString().slice(0, 10),
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
    created_at: new Date(now.getTime() - 30 * 86400000).toISOString(),
    updated_at: now.toISOString(),
  };
  return { ...base, ...over };
}

const NOW = new Date("2026-04-30T00:00:00Z");

describe("P20.2 — leak engine: estimate friction → leak objects", () => {
  it("converts each friction signal into a Leak object with required fields", () => {
    const leaks = leaksFromEstimates({
      industry: "trade_field_service",
      estimates: [
        makeEstimate({ id: "e1", status: "draft", amount: 5000 }),
        makeEstimate({
          id: "e2",
          status: "sent",
          amount: 12000,
          sent_at: new Date(NOW.getTime() - 30 * 86400000).toISOString(),
        }),
      ],
      now: NOW,
    });

    expect(leaks.length).toBeGreaterThanOrEqual(2);
    for (const l of leaks) {
      expect(l).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        category: expect.any(String),
        gear: expect.any(Number),
        severity: expect.stringMatching(/^(low|medium|high)$/),
        estimated_revenue_impact: expect.any(Number),
        confidence: expect.stringMatching(/^(Confirmed|Estimated|Needs Verification)$/),
        source: "estimates",
        message: expect.any(String),
        recommended_fix: expect.any(String),
        industry_context: "trade_field_service",
      });
    }
  });

  it("maps leak types to the correct gear and category", () => {
    const cases = [
      { kind: "estimate_never_sent",            cat: "conversion",           gear: 2 },
      { kind: "estimate_stale_sent",            cat: "conversion",           gear: 2 },
      { kind: "estimate_expired_unanswered",    cat: "conversion",           gear: 2 },
      { kind: "estimate_approved_not_invoiced", cat: "financial_visibility", gear: 4 },
      { kind: "job_completed_not_invoiced",     cat: "financial_visibility", gear: 4 },
    ] as const;
    for (const c of cases) {
      const leak = signalToLeak(
        {
          kind: c.kind,
          severity: "medium",
          estimate_id: "e",
          client_or_job: null,
          amount: 1000,
          message: "msg",
          confidence: "Confirmed",
        },
        "general_service",
      );
      expect(leak.category).toBe(c.cat);
      expect(leak.gear).toBe(c.gear);
    }
  });

  it("preserves friction confidence labels onto the leak", () => {
    const leak = signalToLeak(
      {
        kind: "estimate_stale_sent",
        severity: "high",
        estimate_id: "e",
        client_or_job: null,
        amount: 1000,
        message: "stale",
        confidence: "Confirmed",
      },
      "trade_field_service",
    );
    expect(leak.confidence).toBe("Confirmed");
  });
});

describe("P20.2 — priority scoring", () => {
  it("uses the canonical formula impact*2 + visibility + ease + dependency", () => {
    const leak: Leak = {
      id: "x",
      type: "estimate_stale_sent",
      category: "conversion",
      gear: 2,
      severity: "medium",
      estimated_revenue_impact: 3000,
      confidence: "Confirmed",
      source: "estimates",
      message: "x",
      recommended_fix: "x",
      industry_context: "general_service",
    };
    const s = leakToScoredIssue(leak);
    expect(s.priority_score).toBe(s.impact * 2 + s.visibility + s.ease_of_fix + s.dependency);
    expect(s.priority_score).toBeGreaterThanOrEqual(5);
    expect(s.priority_score).toBeLessThanOrEqual(25);
  });

  it("higher dollar impact outranks lower dollar impact for the same kind", () => {
    const big: Leak = {
      id: "big",
      type: "estimate_approved_not_invoiced",
      category: "financial_visibility",
      gear: 4,
      severity: "high",
      estimated_revenue_impact: 50_000,
      confidence: "Confirmed",
      source: "estimates",
      message: "big approved not invoiced",
      recommended_fix: "x",
      industry_context: "trade_field_service",
    };
    const small: Leak = { ...big, id: "small", estimated_revenue_impact: 200, severity: "low", message: "small" };
    const { ranked } = prioritizeLeaks([small, big]);
    expect(ranked[0].leak.id).toBe("big");
    expect(ranked[1].leak.id).toBe("small");
  });

  it("impactFromDollars maps dollars to a 1..5 scale", () => {
    expect(impactFromDollars(0)).toBe(1);
    expect(impactFromDollars(500)).toBe(2);
    expect(impactFromDollars(2_500)).toBe(3);
    expect(impactFromDollars(10_000)).toBe(4);
    expect(impactFromDollars(25_000)).toBe(5);
    expect(impactFromDollars(99_999)).toBe(5);
  });

  it("always returns a top3 slice (≤ 3 items)", () => {
    const leaks: Leak[] = Array.from({ length: 7 }, (_, i): Leak => ({
      id: `l${i}`,
      type: "estimate_stale_sent",
      category: "conversion",
      gear: 2,
      severity: "medium",
      estimated_revenue_impact: (i + 1) * 1000,
      confidence: "Confirmed",
      source: "estimates",
      message: `m${i}`,
      recommended_fix: "x",
      industry_context: "general_service",
    }));
    const { top3, ranked } = prioritizeLeaks(leaks);
    expect(top3.length).toBe(3);
    expect(ranked.length).toBe(7);
  });
});

describe("P20.2 — industry-aware recommendations", () => {
  it("changes recommendation based on industry for the same leak type", () => {
    const base: Leak = {
      id: "x",
      type: "estimate_approved_not_invoiced",
      category: "financial_visibility",
      gear: 4,
      severity: "high",
      estimated_revenue_impact: 5000,
      confidence: "Confirmed",
      source: "estimates",
      message: "x",
      recommended_fix: "DEFAULT",
      industry_context: "trade_field_service",
    };
    const trades = applyIndustryRecommendation(base);
    const medical = applyIndustryRecommendation({ ...base, industry_context: "mmj_cannabis" });
    const general = applyIndustryRecommendation({ ...base, industry_context: "general_service" });

    expect(trades.recommended_fix).not.toBe(base.recommended_fix);
    expect(medical.recommended_fix).not.toBe(trades.recommended_fix);
    // General has no override → keeps default.
    expect(general.recommended_fix).toBe(base.recommended_fix);
  });
});

describe("P20.2 — full analyzeLeaks pipeline", () => {
  it("produces ranked, top3, admin, client and task seeds for a trades business", () => {
    const result = analyzeLeaks({
      industry: "trade_field_service",
      estimates: [
        makeEstimate({ id: "a", status: "draft", amount: 4000 }),
        makeEstimate({
          id: "b",
          status: "sent",
          amount: 12000,
          sent_at: new Date(NOW.getTime() - 40 * 86400000).toISOString(),
        }),
        makeEstimate({
          id: "c",
          status: "approved",
          amount: 30000,
          approved_at: new Date(NOW.getTime() - 20 * 86400000).toISOString(),
        }),
      ],
      now: NOW,
    });

    expect(result.admin.ranked.length).toBeGreaterThan(0);
    expect(result.admin.top3.length).toBeLessThanOrEqual(3);
    expect(result.admin.industryLabel).toBe("Trades / Field Service");
    // Largest dollar item should win.
    expect(result.admin.top3[0].leak.id).toContain("c");
    // Client view must not leak internal scoring.
    for (const item of result.client.topIssues) {
      expect(item).not.toHaveProperty("priority_score");
      expect(item).not.toHaveProperty("rationale");
    }
    // Task seeds align with top3.
    expect(result.taskSeeds.length).toBe(result.admin.top3.length);
    expect(result.taskSeeds[0].next_step.length).toBeGreaterThan(0);
  });

  it("returns empty top3 and zero dollars at risk when there are no signals", () => {
    const result = analyzeLeaks({ industry: "restaurant", estimates: [], now: NOW });
    expect(result.admin.ranked).toEqual([]);
    expect(result.admin.top3).toEqual([]);
    expect(result.admin.totalDollarsAtRisk).toBe(0);
    expect(result.client.topIssues).toEqual([]);
    expect(result.taskSeeds).toEqual([]);
  });

  it("retail and restaurant industries swap recommendation language", () => {
    const estimates = [
      makeEstimate({
        id: "approved",
        status: "approved",
        amount: 8000,
        approved_at: new Date(NOW.getTime() - 10 * 86400000).toISOString(),
      }),
    ];
    const retail = analyzeLeaks({ industry: "retail", estimates, now: NOW });
    const restaurant = analyzeLeaks({ industry: "restaurant", estimates, now: NOW });
    expect(retail.client.industryLabel).toBe("Retail");
    expect(restaurant.client.industryLabel).toBe("Restaurant");
    // Industry override applied
    expect(retail.client.topIssues[0].recommendation).not.toBe(
      restaurant.client.topIssues[0].recommendation,
    );
  });
});

describe("P20.2 — no AI in detection or scoring", () => {
  const files = [
    "src/lib/leakEngine/leakObject.ts",
    "src/lib/leakEngine/fromEstimates.ts",
    "src/lib/leakEngine/industry.ts",
    "src/lib/leakEngine/prioritize.ts",
    "src/lib/leakEngine/index.ts",
  ];
  it("contains no AI SDK imports, fetch calls, or supabase invocations", () => {
    const banned = [/from\s+["']@?ai/i, /openai/i, /anthropic/i, /lovable-?ai/i, /\bfetch\(/, /supabase\./];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const re of banned) {
        expect(src, `${f} must not contain ${re}`).not.toMatch(re);
      }
    }
  });
});