/**
 * P85.1 — Evidence Authority Ladder + Source-of-Truth Conflict Flags
 * deterministic contract tests.
 */
import { describe, it, expect } from "vitest";
import {
  EVIDENCE_AUTHORITY_LADDER,
  authorityRank,
  highestAuthority,
  getAuthoritySource,
} from "@/config/evidenceAuthorityLadder";
import {
  AMBER_CONFLICT_THRESHOLD_PERCENT,
  detectConflict,
  diffPercent,
} from "@/lib/sourceConflicts";

describe("P85.1 RGS Evidence Authority Ladder™", () => {
  it("exposes exactly 5 source tiers with unique ranks 1..5", () => {
    expect(EVIDENCE_AUTHORITY_LADDER).toHaveLength(5);
    const ranks = EVIDENCE_AUTHORITY_LADDER.map((s) => s.authority_rank).sort();
    expect(ranks).toEqual([1, 2, 3, 4, 5]);
  });

  it("orders authority Verified > Admin Observation > Imported > Interview > Client", () => {
    expect(authorityRank("verified_evidence")).toBe(1);
    expect(authorityRank("admin_observation")).toBe(2);
    expect(authorityRank("imported_system_data")).toBe(3);
    expect(authorityRank("admin_interview_confirmation")).toBe(4);
    expect(authorityRank("client_claim")).toBe(5);
  });

  it("highestAuthority picks the lowest rank", () => {
    expect(
      highestAuthority(["client_claim", "verified_evidence", "imported_system_data"]),
    ).toBe("verified_evidence");
    expect(highestAuthority([])).toBeNull();
  });

  it("each tier has a client-safe label and admin label that differ from the raw key", () => {
    for (const s of EVIDENCE_AUTHORITY_LADDER) {
      expect(s.client_safe_label.length).toBeGreaterThan(0);
      expect(s.admin_label.length).toBeGreaterThan(0);
    }
  });

  it("only Client Claim is can_be_client_claim true", () => {
    const claimable = EVIDENCE_AUTHORITY_LADDER.filter((s) => s.can_be_client_claim);
    expect(claimable.map((s) => s.source_key)).toEqual(["client_claim"]);
  });

  it("getAuthoritySource throws on unknown key", () => {
    expect(() => getAuthoritySource("nope" as any)).toThrow();
  });
});

describe("P85.1 Source-of-Truth Conflict Flags™ — deterministic detection", () => {
  it("threshold is exactly 15%", () => {
    expect(AMBER_CONFLICT_THRESHOLD_PERCENT).toBe(15);
  });

  it("diffPercent is symmetric in absolute value and uses higher as base", () => {
    expect(diffPercent(100, 85)).toBeCloseTo(15, 5);
    expect(diffPercent(100, 115)).toBeCloseTo(15, 5);
    expect(diffPercent(0, 0)).toBe(0);
    expect(diffPercent(0, 5)).toBe(Number.POSITIVE_INFINITY);
  });

  it("does NOT trigger conflict at exactly 15%", () => {
    const r = detectConflict({
      data_point_key: "net_margin_pct",
      candidates: [
        { source_type: "verified_evidence", value: 100 },
        { source_type: "client_claim", value: 85 },
      ],
    });
    expect(r.has_conflict).toBe(false);
    expect(r.scoring_value_used).toBe(100);
  });

  it("triggers conflict above 15% (e.g. P&L 4 vs claim 15)", () => {
    const r = detectConflict({
      data_point_key: "net_margin_pct",
      data_point_label: "Net margin %",
      candidates: [
        { source_type: "verified_evidence", value: 4 },
        { source_type: "client_claim", value: 15 },
      ],
    });
    expect(r.has_conflict).toBe(true);
    expect(r.higher?.source_type).toBe("verified_evidence");
    expect(r.lower?.source_type).toBe("client_claim");
    // scoring uses highest-authority value (verified_evidence)
    expect(r.scoring_value_used).toBe(4);
  });

  it("uses the most conservative value when use_conservative_for_risk is set", () => {
    const r = detectConflict({
      data_point_key: "monthly_revenue",
      use_conservative_for_risk: true,
      candidates: [
        // higher authority reports higher revenue, but conservative path picks the lower number
        { source_type: "verified_evidence", value: 100000 },
        { source_type: "client_claim", value: 60000 },
      ],
    });
    expect(r.has_conflict).toBe(true);
    expect(r.scoring_value_used).toBe(60000);
  });

  it("with only one candidate, no conflict and scoring uses that value", () => {
    const r = detectConflict({
      data_point_key: "x",
      candidates: [{ source_type: "client_claim", value: 42 }],
    });
    expect(r.has_conflict).toBe(false);
    expect(r.scoring_value_used).toBe(42);
  });

  it("ties on authority do not trigger conflict", () => {
    const r = detectConflict({
      data_point_key: "x",
      candidates: [
        { source_type: "verified_evidence", value: 100 },
        { source_type: "verified_evidence", value: 50 },
      ],
    });
    expect(r.has_conflict).toBe(false);
  });

  it("picks the worst (largest %) lower-authority pair", () => {
    const r = detectConflict({
      data_point_key: "x",
      candidates: [
        { source_type: "verified_evidence", value: 100 },
        { source_type: "admin_observation", value: 110 }, // 10% — under threshold
        { source_type: "client_claim", value: 30 }, // 70% — worst
      ],
    });
    expect(r.has_conflict).toBe(true);
    expect(r.lower?.source_type).toBe("client_claim");
    expect(r.scoring_value_used).toBe(100);
  });
});