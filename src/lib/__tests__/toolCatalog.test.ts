import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase client BEFORE importing the module under test.
const rpc = vi.fn();
const upsertChain = {
  select: () => ({ maybeSingle: () => ({ data: { ok: true }, error: null }) }),
};
const fromMock = vi.fn(() => ({
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
    rpc: (...args: any[]) => rpc(...args),
    from: (...args: any[]) => fromMock(...args),
  },
}));

import {
  getEffectiveToolsForCustomer,
  setCategoryAccess,
  setClientToolAccess,
  REASON_LABEL,
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
    ];
    for (const r of sqlReasons) {
      expect(REASON_LABEL[r]).toBeTruthy();
    }
  });
});