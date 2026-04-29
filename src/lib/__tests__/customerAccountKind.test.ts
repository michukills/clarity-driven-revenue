import { describe, expect, it } from "vitest";
import { getCustomerAccountKind, isCustomerFlowAccount } from "@/lib/customers/accountKind";

describe("customer account kind", () => {
  it("uses explicit account_kind when present", () => {
    expect(getCustomerAccountKind({ account_kind: "test", email: "owner@example.com" })).toBe("test");
  });

  it("classifies showcase and demo seed accounts as demo", () => {
    expect(getCustomerAccountKind({ email: "demo-a@demo.rgs.local" })).toBe("demo");
    expect(getCustomerAccountKind({ email: "atlas@showcase.rgs.local" })).toBe("demo");
    expect(getCustomerAccountKind({ business_name: "Northstar HVAC (showcase)" })).toBe("demo");
  });

  it("classifies obvious test accounts as test", () => {
    expect(getCustomerAccountKind({ email: "owner+test@example.com" })).toBe("test");
    expect(getCustomerAccountKind({ email: "test@rgs-test.local" })).toBe("test");
    expect(getCustomerAccountKind({ business_name: "Test Account LLC" })).toBe("test");
  });

  it("classifies the RGS operating record as internal admin", () => {
    const c = {
      email: "internal@rgs.local",
      full_name: "RGS Internal Operations",
      business_name: "Revenue & Growth Systems LLC",
      status: "internal",
    };
    expect(getCustomerAccountKind(c)).toBe("internal_admin");
    expect(isCustomerFlowAccount(c)).toBe(false);
  });

  it("leaves ordinary customer records in client flow", () => {
    const c = { email: "owner@beltwayfitness.com", business_name: "Beltway Fitness Group" };
    expect(getCustomerAccountKind(c)).toBe("client");
    expect(isCustomerFlowAccount(c)).toBe(true);
  });
});
