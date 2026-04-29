import { describe, it, expect } from "vitest";
import { hasPendingDeactivation, type ServiceRequestRow } from "@/lib/serviceRequests";

const row = (overrides: Partial<ServiceRequestRow>): ServiceRequestRow => ({
  id: "x",
  customer_id: "c1",
  requested_by: "u1",
  request_type: "account_deactivation",
  addon_key: null,
  reason: null,
  status: "pending",
  admin_notes: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe("hasPendingDeactivation", () => {
  it("returns true when a pending deactivation exists", () => {
    expect(hasPendingDeactivation([row({})])).toBe(true);
  });
  it("returns false when only an addon cancellation is pending", () => {
    expect(hasPendingDeactivation([row({ request_type: "addon_cancellation" })])).toBe(false);
  });
  it("returns false when the deactivation is completed", () => {
    expect(hasPendingDeactivation([row({ status: "completed" })])).toBe(false);
  });
  it("returns false on empty list", () => {
    expect(hasPendingDeactivation([])).toBe(false);
  });
});
