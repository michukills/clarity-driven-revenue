import { describe, expect, it } from "vitest";
import {
  applyEligibilityFilters,
  classifyCustomerForSelector,
  eligibleSelectorEmptyState,
} from "@/lib/admin/eligibleCustomerSelector";

const baseRows: Record<string, any>[] = [
  // 1. Real, active full client.
  {
    id: "c-real-1",
    full_name: "Owner Smith",
    business_name: "Beltway Fitness Group",
    email: "owner@beltwayfitness.com",
    account_kind: "client",
    lifecycle_state: "diagnostic",
    last_activity_at: "2026-05-13T12:00:00Z",
  },
  // 2. Stale seeded demo (legacy synthetic training row).
  {
    id: "c-stale-demo",
    full_name: "Atlas Demo Owner",
    business_name: "Northstar HVAC (showcase)",
    email: "atlas@showcase.rgs.local",
    is_demo_account: true,
    account_kind: "demo",
    lifecycle_state: "lead",
  },
  // 3. New, active demo account created through the app.
  {
    id: "c-new-demo",
    full_name: "Real Demo User",
    business_name: "Demo Active LLC",
    email: "founder@activedemo.example",
    is_demo_account: true,
    account_kind: "demo",
    lifecycle_state: "diagnostic",
  },
  // 4. Archived real client.
  {
    id: "c-archived",
    full_name: "Old Client",
    business_name: "Sunset Co",
    email: "old@example.com",
    account_kind: "client",
    archived_at: "2026-04-01T00:00:00Z",
    lifecycle_state: "inactive",
  },
  // 5. Internal admin (RGS).
  {
    id: "c-internal",
    full_name: "RGS Internal Operations",
    business_name: "Revenue & Growth Systems LLC",
    email: "internal@rgs.local",
    account_kind: "internal_admin",
    status: "internal",
    lifecycle_state: "lead",
  },
  // 6. Standalone gig customer.
  {
    id: "c-gig",
    full_name: "Gig Buyer",
    business_name: "One-Off Co",
    email: "buyer@oneoff.example",
    account_kind: "client",
    service_type: "Standalone Deliverable",
    is_gig: true,
    lifecycle_state: "lead",
  },
  // 7. Pending signup.
  {
    id: "c-pending",
    full_name: "Pending Person",
    business_name: "Pending Co",
    email: "p@pending.example",
    signup_request_status: "pending_review",
  },
];

describe("P93E-E2H — eligible customer selector", () => {
  it("hides stale seeded demo accounts by default", () => {
    const out = applyEligibilityFilters(baseRows, { includeDemo: true });
    expect(out.find((o) => o.id === "c-stale-demo")).toBeUndefined();
  });

  it("hides archived rows by default but exposes them with includeArchived", () => {
    const def = applyEligibilityFilters(baseRows);
    expect(def.find((o) => o.id === "c-archived")).toBeUndefined();
    const withArchived = applyEligibilityFilters(baseRows, { includeArchived: true });
    expect(withArchived.find((o) => o.id === "c-archived")?.isArchived).toBe(true);
  });

  it("hides internal admin rows by default", () => {
    const out = applyEligibilityFilters(baseRows);
    expect(out.find((o) => o.id === "c-internal")).toBeUndefined();
  });

  it("hides demo rows by default and exposes them with includeDemo", () => {
    const def = applyEligibilityFilters(baseRows);
    expect(def.find((o) => o.id === "c-new-demo")).toBeUndefined();
    const withDemo = applyEligibilityFilters(baseRows, { includeDemo: true });
    const newDemo = withDemo.find((o) => o.id === "c-new-demo");
    expect(newDemo).toBeDefined();
    expect(newDemo?.badges).toContain("Demo Active");
  });

  it("hides pending / needs-review accounts everywhere", () => {
    const out = applyEligibilityFilters(baseRows, {
      includeDemo: true,
      includeArchived: true,
    });
    expect(out.find((o) => o.id === "c-pending")).toBeUndefined();
  });

  it("standalone_gig run mode includes both real client and gig rows", () => {
    const out = applyEligibilityFilters(baseRows, { runMode: "standalone_gig" });
    expect(out.map((o) => o.id).sort()).toEqual(["c-gig", "c-real-1"]);
  });

  it("full_client run mode excludes the gig-only row", () => {
    const out = applyEligibilityFilters(baseRows, { runMode: "full_client" });
    expect(out.find((o) => o.id === "c-gig")).toBeUndefined();
    expect(out.find((o) => o.id === "c-real-1")).toBeDefined();
  });

  it("emits human-readable badges for the option label", () => {
    const opt = classifyCustomerForSelector(baseRows[0]);
    expect(opt.primaryLabel).toBe("Beltway Fitness Group");
    expect(opt.badges[0]).toBe("Real Client");
    expect(opt.lifecycleLabel).toBe("In Diagnostic");
  });

  it("provides a non-empty empty-state message per run mode", () => {
    expect(eligibleSelectorEmptyState("standalone_gig")).toMatch(/standalone/i);
    expect(eligibleSelectorEmptyState("full_client")).toMatch(/full client/i);
    expect(eligibleSelectorEmptyState("any_eligible")).toMatch(/eligible/i);
  });
});
