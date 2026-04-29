import { describe, it, expect } from "vitest";
import { sortOutcomeQueue, OUTCOME_STATUS_LABEL } from "@/lib/clientTaskOutcomes";

describe("sortOutcomeQueue", () => {
  it("puts pending_review before validated, rejected, follow-up", () => {
    const rows = [
      { outcome_status: "outcome_validated", completed_at: "2025-01-01", created_at: "2025-01-01" },
      { outcome_status: "pending_review", completed_at: "2024-12-01", created_at: "2024-12-01" },
      { outcome_status: "needs_follow_up", completed_at: "2025-02-01", created_at: "2025-02-01" },
      { outcome_status: "outcome_rejected", completed_at: "2025-03-01", created_at: "2025-03-01" },
    ] as any[];
    const sorted = sortOutcomeQueue(rows);
    expect(sorted.map((r) => r.outcome_status)).toEqual([
      "pending_review",
      "needs_follow_up",
      "outcome_validated",
      "outcome_rejected",
    ]);
  });

  it("within same status, sorts newest completed_at first", () => {
    const rows = [
      { outcome_status: "pending_review", completed_at: "2025-01-01", created_at: "2025-01-01" },
      { outcome_status: "pending_review", completed_at: "2025-03-01", created_at: "2025-01-01" },
      { outcome_status: "pending_review", completed_at: null, created_at: "2024-06-01" },
    ] as any[];
    const sorted = sortOutcomeQueue(rows);
    expect(sorted[0].completed_at).toBe("2025-03-01");
    expect(sorted[1].completed_at).toBe("2025-01-01");
    expect(sorted[2].completed_at).toBeNull();
  });

  it("exposes a label for every outcome status", () => {
    expect(OUTCOME_STATUS_LABEL.pending_review).toBeTruthy();
    expect(OUTCOME_STATUS_LABEL.outcome_validated).toBeTruthy();
    expect(OUTCOME_STATUS_LABEL.outcome_rejected).toBeTruthy();
    expect(OUTCOME_STATUS_LABEL.needs_follow_up).toBeTruthy();
  });
});