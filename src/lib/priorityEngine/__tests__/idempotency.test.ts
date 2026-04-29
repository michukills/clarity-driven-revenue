import { describe, it, expect } from "vitest";
import { rankIssues } from "../scoring";
import { deriveFactors, type RecommendationLike } from "../factorHeuristics";

// These tests assert the determinism that backs idempotent regeneration:
// given the same recommendations, ranking output (issue_keys + ranks + bands)
// must be identical across runs. DB-level idempotency is additionally enforced
// by UNIQUE (report_draft_id) on execution_roadmaps and
// UNIQUE (roadmap_id, rank) on client_tasks (see P16.1 migration).

const sampleRecs: RecommendationLike[] = [
  {
    id: "r1",
    title: "Tighten cash collection rhythm",
    category: "cash",
    priority: "high",
    explanation: "AR aging is climbing and follow-up is inconsistent.",
    related_pillar: "cash",
    origin: "rule",
    rule_key: "cash_ar_followup",
  },
  {
    id: "r2",
    title: "Document the lead intake process",
    category: "operations",
    priority: "medium",
    explanation: "Process map missing for new lead handoff.",
    related_pillar: "operations",
    origin: "rule",
    rule_key: "ops_lead_intake_doc",
  },
  {
    id: "r3",
    title: "Restructure pricing tiers",
    category: "pricing",
    priority: "low",
    explanation: "Replace system used for proposal generation.",
    related_pillar: "revenue",
    origin: "ai",
    rule_key: null,
  },
];

function rankFromRecs(recs: RecommendationLike[]) {
  return rankIssues(
    recs.map((r) => ({
      issue_key: r.rule_key ?? r.id,
      issue_title: r.title,
      source_recommendation_id: r.id,
      ...deriveFactors(r),
    }))
  );
}

describe("priority engine — regeneration determinism", () => {
  it("produces identical ranking on repeated runs (idempotent regeneration)", () => {
    const a = rankFromRecs(sampleRecs);
    const b = rankFromRecs(sampleRecs);
    expect(b.map((x) => [x.issue_key, x.rank, x.priority_band, x.priority_score])).toEqual(
      a.map((x) => [x.issue_key, x.rank, x.priority_band, x.priority_score])
    );
  });

  it("reordering input does not change ranking", () => {
    const a = rankFromRecs(sampleRecs);
    const b = rankFromRecs([sampleRecs[2], sampleRecs[0], sampleRecs[1]]);
    expect(b.map((x) => x.issue_key)).toEqual(a.map((x) => x.issue_key));
  });

  it("top-3 set is stable across runs", () => {
    const a = rankFromRecs(sampleRecs).slice(0, 3).map((x) => x.issue_key);
    const b = rankFromRecs(sampleRecs).slice(0, 3).map((x) => x.issue_key);
    expect(b).toEqual(a);
  });

  it("high priority + cash hint outranks low priority + complex fix", () => {
    const ranked = rankFromRecs(sampleRecs);
    const cashIdx = ranked.findIndex((r) => r.issue_key === "cash_ar_followup");
    const pricingIdx = ranked.findIndex((r) => r.source_recommendation_id === "r3");
    expect(cashIdx).toBeLessThan(pricingIdx);
  });
});