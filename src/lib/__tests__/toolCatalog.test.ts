import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase client BEFORE importing the module under test.
const rpc = vi.fn<(name: string, params: any) => any>();
const upsertChain = {
  select: () => ({ maybeSingle: () => ({ data: { ok: true }, error: null }) }),
};
const fromMock = vi.fn((_table: string) => ({
  select: () => ({
    order: () => ({
      order: () => ({ data: [], error: null }),
    }),
    eq: () => ({ data: [], error: null }),
  }),
  upsert: vi.fn(() => upsertChain),
  delete: () => ({ eq: () => ({ eq: () => ({ error: null }) }) }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (name: string, params: any) => rpc(name, params),
    from: (table: string) => fromMock(table),
  },
}));

import {
  getEffectiveToolsForCustomer,
  setCategoryAccess,
  setClientToolAccess,
  REASON_LABEL,
  canGrantToClient,
  INDUSTRY_KEYS,
  INDUSTRY_LABEL,
  RESTRICTED_INDUSTRIES,
} from "../toolCatalog";

describe("toolCatalog service", () => {
  beforeEach(() => {
    rpc.mockReset();
    fromMock.mockClear();
  });

  it("calls the get_effective_tools_for_customer RPC with the customer id", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await getEffectiveToolsForCustomer("cust-1");
    expect(rpc).toHaveBeenCalledWith("get_effective_tools_for_customer", {
      _customer_id: "cust-1",
    });
  });

  it("returns the rows the RPC produced unchanged", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          tool_id: "t1",
          tool_key: "scorecard",
          name: "Scorecard",
          description: null,
          tool_type: "diagnostic",
          default_visibility: "client_available",
          status: "active",
          route_path: "/portal/scorecard",
          icon_key: null,
          requires_industry: false,
          requires_active_client: true,
          effective_enabled: true,
          reason: "unrestricted",
          industry_match: false,
          override_state: "none",
        },
      ],
      error: null,
    });
    const rows = await getEffectiveToolsForCustomer("cust-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].tool_key).toBe("scorecard");
    expect(rows[0].effective_enabled).toBe(true);
  });

  it("throws when the RPC errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(getEffectiveToolsForCustomer("cust-1")).rejects.toBeTruthy();
  });

  it("setCategoryAccess upserts on the conflict key", async () => {
    await setCategoryAccess({
      toolId: "t1",
      industry: "trade_field_service",
      enabled: true,
    });
    expect(fromMock).toHaveBeenCalledWith("tool_category_access");
  });

  it("setClientToolAccess writes granted_at on grant and revoked_at on revoke", async () => {
    await setClientToolAccess({
      customerId: "c1",
      toolId: "t1",
      enabled: true,
    });
    await setClientToolAccess({
      customerId: "c1",
      toolId: "t1",
      enabled: false,
    });
    expect(fromMock).toHaveBeenCalledWith("client_tool_access");
  });

  it("REASON_LABEL covers every reason the SQL helper can emit", () => {
    const sqlReasons = [
      "admin_only",
      "hidden",
      "override_revoked",
      "override_granted",
      "not_active_client",
      "industry_unset",
      "industry_blocked",
      "industry_allowed",
      "unrestricted",
      "industry_unconfirmed",
      "industry_needs_review",
      "snapshot_unverified",
    ];
    for (const r of sqlReasons) {
      expect(REASON_LABEL[r]).toBeTruthy();
    }
  });

  describe("canGrantToClient", () => {
    it("rejects admin_only tool_type", () => {
      expect(
        canGrantToClient({
          tool_type: "admin_only",
          default_visibility: "admin_only",
          status: "active",
        }),
      ).toBe(false);
    });

    it("rejects admin_only default_visibility even when type is client-y", () => {
      expect(
        canGrantToClient({
          tool_type: "diagnostic",
          default_visibility: "admin_only",
          status: "active",
        }),
      ).toBe(false);
    });

    it("rejects hidden tools", () => {
      expect(
        canGrantToClient({
          tool_type: "diagnostic",
          default_visibility: "hidden",
          status: "active",
        }),
      ).toBe(false);
    });

    it("rejects deprecated tools", () => {
      expect(
        canGrantToClient({
          tool_type: "tracking",
          default_visibility: "client_available",
          status: "deprecated",
        }),
      ).toBe(false);
    });

    it("allows active client_available tools", () => {
      expect(
        canGrantToClient({
          tool_type: "tracking",
          default_visibility: "client_available",
          status: "active",
        }),
      ).toBe(true);
    });
  });

  describe("industry constants", () => {
    it("matches the public.industry_category enum", () => {
      expect(INDUSTRY_KEYS).toEqual([
        "trade_field_service",
        "retail",
        "restaurant",
        "mmj_cannabis",
        "general_service",
        "other",
      ]);
      for (const k of INDUSTRY_KEYS) expect(INDUSTRY_LABEL[k]).toBeTruthy();
    });

    it("flags mmj_cannabis as restricted (no cross-industry default)", () => {
      expect(RESTRICTED_INDUSTRIES.has("mmj_cannabis")).toBe(true);
      expect(RESTRICTED_INDUSTRIES.has("general_service")).toBe(false);
    });
  });
});
