/**
 * P93E-E2G-P2.7B — Client-safe workflow snapshot tests.
 *
 * Locks the contract that the client portal stage summary uses no
 * admin-only language and never invents completion.
 */
import { describe, it, expect } from "vitest";
import { getClientWorkSnapshot } from "@/lib/workflow/clientWorkSnapshot";

const ADMIN_ONLY_PHRASES = [
  /admin[-_ ]only/i,
  /admin[-_ ]interpretation/i,
  /admin[-_ ]observation/i,
  /calibration/i,
  /repair[-_ ]map/i,
  /risk signal/i,
  /draft report/i,
  /unapproved/i,
  /raw owner/i,
  /full_depth/i,
  /starter[_ ]bank/i,
  /live[_ ]verified/i,
  /diagnostic_status/i,
];

function asserSafe(text: string) {
  for (const re of ADMIN_ONLY_PHRASES) expect(text).not.toMatch(re);
}

describe("getClientWorkSnapshot", () => {
  it("evidence stage → asks the client to upload", () => {
    const s = getClientWorkSnapshot({ lifecycle_state: "evidence_pending" });
    expect(s.stageKey).toBe("diagnostic");
    expect(s.waitingOn).toBe("you");
    expect(s.yourNextStep).toMatch(/upload/i);
    [s.currentWork, s.yourNextStep].forEach(asserSafe);
  });

  it("report stage → waiting on RGS, no client action", () => {
    const s = getClientWorkSnapshot({ lifecycle_state: "report_in_review" });
    expect(s.waitingOn).toBe("rgs");
    expect(s.yourNextStep).toMatch(/no action needed/i);
    [s.currentWork, s.yourNextStep].forEach(asserSafe);
  });

  it("inactive → blocked reason is plain English", () => {
    const s = getClientWorkSnapshot({ status: "archived" });
    expect(s.stageKey).toBe("inactive");
    expect(s.blockedReason).toMatch(/reactivate/i);
    asserSafe(s.blockedReason ?? "");
  });

  it("control system → ongoing, no required action", () => {
    const s = getClientWorkSnapshot({ lifecycle_state: "ongoing_support" });
    expect(s.stageKey).toBe("control_system");
    expect(s.waitingOn).toBe("no_one");
  });

  it("unknown lifecycle does not pretend completion", () => {
    const s = getClientWorkSnapshot({});
    expect(["lead", "unknown"]).toContain(s.stageKey);
    [s.currentWork, s.yourNextStep].forEach(asserSafe);
  });
});