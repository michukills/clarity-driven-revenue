import { describe, expect, it } from "vitest";
import { computeWarnings } from "@/components/admin/consistency/CustomerConsistencyBanner";

describe("CustomerConsistencyBanner computeWarnings — P32.2 fix actions", () => {
  it("offers a direct industry assignment fix when industry is missing", () => {
    const warnings = computeWarnings({
      id: "c1",
      stage: "lead",
      lifecycle_state: "lead",
      industry: null,
    });
    const w = warnings.find((x) => x.id === "missing-industry");
    expect(w?.fix).toEqual({
      kind: "scroll_to",
      anchor: "industry-assignment",
      label: "Assign industry",
    });
  });

  it("offers a direct verification fix when industry is unconfirmed", () => {
    const warnings = computeWarnings({
      id: "c1",
      stage: "lead",
      lifecycle_state: "lead",
      industry: "restaurant",
      industry_confirmed_by_admin: false,
    });
    const w = warnings.find((x) => x.id === "industry-unconfirmed");
    expect(w?.fix).toEqual({
      kind: "scroll_to",
      anchor: "industry-assignment",
      label: "Confirm industry",
    });
  });

  it("offers a direct mismatch fix when recorded data conflicts with assignment", () => {
    const warnings = computeWarnings({
      id: "c1",
      stage: "lead",
      lifecycle_state: "lead",
      industry: "retail",
      industry_confirmed_by_admin: true,
      hasIndustryMismatch: true,
    });
    const w = warnings.find((x) => x.id === "possible-industry-mismatch");
    expect(w?.fix).toEqual({
      kind: "scroll_to",
      anchor: "industry-assignment",
      label: "Resolve mismatch",
    });
  });

  it("offers a direct snapshot verification fix after industry is confirmed", () => {
    const warnings = computeWarnings({
      id: "c1",
      stage: "lead",
      lifecycle_state: "lead",
      industry: "general_service",
      industry_confirmed_by_admin: true,
      snapshot_status: "draft",
      snapshot_industry_verified: false,
    });
    const w = warnings.find((x) => x.id === "snapshot-unverified");
    expect(w?.fix).toEqual({
      kind: "scroll_to",
      anchor: "business-snapshot",
      label: "Verify snapshot",
    });
  });

  it("offers a direct package fix for implementation stage without implementation package", () => {
    const warnings = computeWarnings({
      id: "c1",
      stage: "implementation_active",
      lifecycle_state: "implementation",
      industry: "trade_field_service",
      industry_confirmed_by_admin: true,
      package_implementation: false,
      package_full_bundle: false,
    });
    const w = warnings.find((x) => x.id === "impl-stage-no-package");
    expect(w?.fix).toEqual({
      kind: "scroll_to",
      anchor: "package-lifecycle",
      label: "Fix package",
    });
  });
});
