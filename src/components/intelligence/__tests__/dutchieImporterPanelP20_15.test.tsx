// P20.15 — Dutchie admin importer UI tests.
//
// Verifies:
//   - Non-cannabis customers see "Not applicable" and cannot import.
//   - Cannabis customers with no Dutchie summary see "No summary on file".
//   - Cannabis customers with a Dutchie summary see preview + enabled import.
//   - Importing calls upsertCustomerMetrics with source=dutchie and only
//     mapper-payload fields.
//   - Audit logging is count-only (no raw summary, no tokens, no IDs).
//   - No healthcare/patient-care wording in the rendered Dutchie surface.
//   - No Dutchie token/secret references in the panel source.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const upsertMock = vi.fn().mockResolvedValue(undefined);
const auditMock = vi.fn();

vi.mock("@/lib/customerMetrics/service", () => ({
  upsertCustomerMetrics: (...args: unknown[]) => upsertMock(...args),
  getLatestCustomerMetrics: async () => null,
}));
vi.mock("@/lib/portalAudit", () => ({
  logPortalAudit: (...args: unknown[]) => auditMock(...args),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: () => {} }),
}));

let dutchieRow: Record<string, unknown> | null = null;

vi.mock("@/integrations/supabase/client", () => {
  function makeChain(table: string) {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => {
        if (table === "portal_audit_log") {
          return Promise.resolve({ data: [], error: null });
        }
        return chain;
      },
      maybeSingle: async () => {
        if (table === "dutchie_period_summaries") {
          return { data: dutchieRow, error: null };
        }
        return { data: null, error: null };
      },
    };
    return chain;
  }
  return {
    supabase: { from: (table: string) => makeChain(table) },
  };
});

import { AdminMetricsImporterPanel } from "../AdminMetricsImporterPanel";

const cannabisCustomer = {
  id: "cust-cann-1",
  industry: "mmj_cannabis",
  account_kind: "client",
  email: "ops@dispo.test",
  full_name: "Test Dispensary",
};
const tradesCustomer = {
  id: "cust-trade-1",
  industry: "trade_field_service",
  account_kind: "client",
  email: "ops@trade.test",
  full_name: "Test Trades",
};

const fullDutchieRow = {
  gross_sales: 100000,
  net_sales: 92000,
  discounts_total: 8000,
  promotions_total: 4000,
  transaction_count: 2000,
  day_count: 30,
  average_ticket: 46,
  product_sales_total: 70000,
  category_sales_total: 22000,
  inventory_value: 250000,
  dead_stock_value: 12000,
  stockout_count: 5,
  inventory_turnover: 4.25,
  shrinkage_pct: 1.8,
  payment_reconciliation_gap: false,
  has_recurring_period_reporting: true,
  product_margin_visible: true,
  category_margin_visible: true,
  period_start: "2026-04-01",
  period_end: "2026-04-30",
  synced_at: "2026-05-01T12:00:00Z",
};

const HEALTHCARE = /\b(patient|patients|clinical|diagnosis|insurance|reimbursement|appointment|treatment|medical record|healthcare provider)\b/i;

beforeEach(() => {
  upsertMock.mockClear();
  auditMock.mockClear();
  dutchieRow = null;
});

describe("P20.15 Dutchie admin importer panel", () => {
  it("shows industry-mismatch alert and disables import for non-cannabis customers", async () => {
    dutchieRow = fullDutchieRow;
    render(
      <AdminMetricsImporterPanel customer={tradesCustomer as any} industry={"trade_field_service" as any} />,
    );
    const section = await screen.findByTestId("dutchie-snapshot-section");
    expect(section).toBeInTheDocument();
    expect(screen.getByTestId("dutchie-industry-mismatch")).toBeInTheDocument();
    expect(screen.queryByTestId("dutchie-snapshot-import")).not.toBeInTheDocument();
    // No healthcare wording leaks into the rendered Dutchie surface.
    expect(section.textContent ?? "").not.toMatch(HEALTHCARE);
  });

  it("shows no-summary state for cannabis customer with no Dutchie data", async () => {
    dutchieRow = null;
    render(
      <AdminMetricsImporterPanel customer={cannabisCustomer as any} industry={"mmj_cannabis" as any} />,
    );
    expect(await screen.findByTestId("dutchie-no-summary")).toBeInTheDocument();
    expect(screen.queryByTestId("dutchie-snapshot-import")).not.toBeInTheDocument();
  });

  it("renders a populated preview and enables import when summary is supported", async () => {
    dutchieRow = fullDutchieRow;
    render(
      <AdminMetricsImporterPanel customer={cannabisCustomer as any} industry={"mmj_cannabis" as any} />,
    );
    const btn = await screen.findByTestId("dutchie-snapshot-import");
    expect(btn).toBeEnabled();
    const section = screen.getByTestId("dutchie-snapshot-section");
    expect(section.textContent).toContain("primary_data_source");
    expect(section.textContent).toContain("cannabis_inventory_value");
    expect(section.textContent).toContain("cannabis_shrinkage_pct");
    // No healthcare wording.
    expect(section.textContent ?? "").not.toMatch(HEALTHCARE);
  });

  it("imports with source=dutchie and logs count-only audit metadata", async () => {
    dutchieRow = fullDutchieRow;
    render(
      <AdminMetricsImporterPanel customer={cannabisCustomer as any} industry={"mmj_cannabis" as any} />,
    );
    const btn = await screen.findByTestId("dutchie-snapshot-import");
    fireEvent.click(btn);
    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1));

    const [customerId, payload] = upsertMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(customerId).toBe("cust-cann-1");
    expect(payload.source).toBe("dutchie");
    expect(payload.industry).toBe("mmj_cannabis");
    expect(payload.primary_data_source).toBe("Dutchie");
    // Mapper-only fields — no raw Dutchie summary fields like gross_sales.
    expect(payload).not.toHaveProperty("gross_sales");
    expect(payload).not.toHaveProperty("net_sales");
    expect(payload).not.toHaveProperty("transaction_count");
    // Forbidden derived fields are not written.
    expect(payload.cannabis_gross_margin_pct).toBeUndefined();
    expect(payload.cannabis_vendor_cost_increase_pct).toBeUndefined();
    expect(payload.cannabis_uses_manual_pos_workaround).toBeUndefined();

    await waitFor(() => expect(auditMock).toHaveBeenCalled());
    const [evt, auditCustomerId, meta] = auditMock.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(evt).toBe("data_import_completed");
    expect(auditCustomerId).toBe("cust-cann-1");
    expect(meta.source).toBe("metrics_dutchie");
    expect(meta.import_type).toBe("client_business_metrics");
    expect(meta.industry).toBe("mmj_cannabis");
    expect(typeof meta.field_count).toBe("number");
    expect(meta.confidence).toBeDefined();
    expect(meta.readiness).toBe("supported");
    // Audit must not contain raw summary, tokens, or account IDs.
    const blob = JSON.stringify(meta).toLowerCase();
    expect(blob).not.toContain("gross_sales");
    expect(blob).not.toContain("token");
    expect(blob).not.toContain("api_key");
    expect(blob).not.toContain("secret");
  });
});

describe("P20.15 Dutchie panel source — security guards", () => {
  it("AdminMetricsImporterPanel.tsx contains no Dutchie token/secret references", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/intelligence/AdminMetricsImporterPanel.tsx"),
      "utf8",
    ).toLowerCase();
    for (const banned of [
      "dutchie_api_key",
      "dutchie_client_secret",
      "dutchie_access_token",
      "dutchie_refresh_token",
    ]) {
      expect(src).not.toContain(banned);
    }
  });

  it("docs/metrics-importers.md Dutchie section contains no healthcare/patient wording", () => {
    const md = readFileSync(join(process.cwd(), "docs/metrics-importers.md"), "utf8");
    const idx = md.indexOf("Dutchie cannabis/MMJ connector");
    expect(idx).toBeGreaterThan(-1);
    const dutchieSection = md.slice(idx);
    expect(dutchieSection).not.toMatch(HEALTHCARE);
  });
});