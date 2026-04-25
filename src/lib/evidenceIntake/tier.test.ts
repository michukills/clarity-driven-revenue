import { describe, it, expect } from "vitest";
import { deriveEvidenceTier } from "./tier";

describe("deriveEvidenceTier", () => {
  it("respects an explicit tier override", () => {
    expect(deriveEvidenceTier({ evidence_tier: "admin_validated" })).toBe("admin_validated");
    expect(deriveEvidenceTier({ tier: "system_tracked" })).toBe("system_tracked");
  });

  it("treats approved_at / admin_validated / status='approved' as admin_validated", () => {
    expect(deriveEvidenceTier({ approved_at: "2025-01-01" })).toBe("admin_validated");
    expect(deriveEvidenceTier({ admin_validated: true })).toBe("admin_validated");
    expect(deriveEvidenceTier({ status: "approved" })).toBe("admin_validated");
  });

  it("treats integration/sync/import sources as system_tracked", () => {
    expect(deriveEvidenceTier({ source: "quickbooks" })).toBe("system_tracked");
    expect(deriveEvidenceTier({ is_synced: true })).toBe("system_tracked");
    expect(deriveEvidenceTier({ source_table: "weekly_checkins" })).toBe("system_tracked");
  });

  it("treats interview/answers/scorecard sources as owner_reported", () => {
    expect(deriveEvidenceTier({ source: "interview" })).toBe("owner_reported");
    expect(deriveEvidenceTier({ source_type: "scorecard_runs" })).toBe("owner_reported");
  });

  it("flags missing when supporting evidence is empty and missing_evidence is described", () => {
    expect(
      deriveEvidenceTier({
        supporting_evidence: "",
        missing_evidence: "No P&L on file",
      }),
    ).toBe("missing");
  });

  it("defaults to owner_reported, never silently promotes to validated", () => {
    expect(deriveEvidenceTier({})).toBe("owner_reported");
    expect(deriveEvidenceTier({ supporting_evidence: "owner said so" })).toBe("owner_reported");
  });
});