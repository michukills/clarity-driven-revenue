// P20.15b — Square / Stripe admin importer UI tests.
//
// Verifies (parallel to the P20.15 Dutchie tests):
//   - "No summary on file" states render for Square and Stripe.
//   - With a real summary row, preview + import button render.
//   - Importing calls upsertCustomerMetrics with source=square / stripe
//     and only mapper-payload fields (no raw summary fields).
//   - Stripe derived indicators render under an admin-only section and
//     are NOT included in the upsert payload.
//   - Audit logging is count-only (no raw summary, tokens, or IDs).
//   - No "MMC" wording leaks into the rendered Square/Stripe surfaces.
//   - No healthcare/patient-care wording in the rendered surfaces.
//   - No frontend Square/Stripe token/secret references in the panel.

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

let squareRow: Record<string, unknown> | null = null;
let stripeRow: Record<string, unknown> | null = null;

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
        if (table === "square_period_summaries") return { data: squareRow, error: null };
        if (table === "stripe_period_summaries") return { data: stripeRow, error: null };
        return { data: null, error: null };
      },
    };
    return chain;
  }
  return { supabase: { from: (table: string) => makeChain(table) } };
});

import { AdminMetricsImporterPanel } from "../AdminMetricsImporterPanel";

const cannabisCustomer = {
  id: "cust-cann-1",
  industry: "mmj_cannabis",
  account_kind: "client",
  email: "ops@dispo.test",
  full_name: "Test Dispensary",
};

const restaurantCustomer = {
  id: "cust-rest-1",
  industry: "restaurant",
  account_kind: "client",
  email: "ops@rest.test",
  full_name: "Test Restaurant",
};

const fullSquareRow = {
  gross_sales: 100000,
  net_sales: 92000,
  discounts_total: 8000,
  refunds_total: 1000,
  tips_total: 2500,
  tax_total: 7000,
  transaction_count: 2000,
  day_count: 30,
  has_recurring_period_reporting: true,
  period_start: "2025-09-01",
  period_end: "2025-09-30",
};

const fullStripeRow = {
  gross_volume: 50000,
  net_volume: 48000,
  fees_total: 1500,
  refunds_total: 1000,
  disputes_total: 200,
  successful_payment_count: 1000,
  failed_payment_count: 25,
  period_start: "2025-09-01",
  period_end: "2025-09-30",
};

beforeEach(() => {
  upsertMock.mockClear();
  auditMock.mockClear();
  squareRow = null;
  stripeRow = null;
});

describe("P20.15b Square admin importer", () => {
  it("shows no-summary state when no Square row exists", async () => {
    squareRow = null;
    render(<AdminMetricsImporterPanel customer={restaurantCustomer as any} industry="restaurant" />);
    await waitFor(() => {
      expect(screen.getByTestId("square-no-summary")).toBeInTheDocument();
    });
  });

  it("imports only mapper payload fields with source=square and count-only audit", async () => {
    squareRow = fullSquareRow;
    render(<AdminMetricsImporterPanel customer={cannabisCustomer as any} industry="mmj_cannabis" />);
    const btn = await screen.findByTestId("square-snapshot-import");
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);
    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1));
    const [, payload] = upsertMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.source).toBe("square");
    expect(payload.primary_data_source).toBe("Square");
    // Mapper-only fields — never raw summary cells:
    expect(payload).not.toHaveProperty("gross_sales");
    expect(payload).not.toHaveProperty("refunds_total");
    expect(payload).not.toHaveProperty("tips_total");
    expect(payload).not.toHaveProperty("tax_total");
    // Audit metadata is count-only.
    expect(auditMock).toHaveBeenCalledTimes(1);
    const auditDetails = auditMock.mock.calls[0][2] as Record<string, unknown>;
    expect(auditDetails.source).toBe("metrics_square");
    expect(auditDetails.import_type).toBe("client_business_metrics");
    expect(auditDetails).not.toHaveProperty("gross_sales");
    expect(auditDetails).not.toHaveProperty("rows");
    expect(typeof auditDetails.field_count).toBe("number");
  });
});

describe("P20.15b Stripe admin importer", () => {
  it("shows no-summary state when no Stripe row exists", async () => {
    stripeRow = null;
    render(<AdminMetricsImporterPanel customer={restaurantCustomer as any} industry="restaurant" />);
    await waitFor(() => {
      expect(screen.getByTestId("stripe-no-summary")).toBeInTheDocument();
    });
  });

  it("imports only mapper payload fields with source=stripe; derived indicators are NOT saved", async () => {
    stripeRow = fullStripeRow;
    render(<AdminMetricsImporterPanel customer={restaurantCustomer as any} industry="restaurant" />);
    const btn = await screen.findByTestId("stripe-snapshot-import");
    await waitFor(() => expect(btn).not.toBeDisabled());

    // Derived indicators rendered admin-only.
    expect(screen.getByTestId("stripe-derived-indicators")).toBeInTheDocument();
    expect(screen.getByText("payment_failure_rate_pct")).toBeInTheDocument();
    expect(screen.getByText("refund_rate_pct")).toBeInTheDocument();

    fireEvent.click(btn);
    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1));
    const [, payload] = upsertMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.source).toBe("stripe");
    expect(payload.primary_data_source).toBe("Stripe");
    // Derived indicators must NOT be persisted.
    expect(payload).not.toHaveProperty("payment_failure_rate_pct");
    expect(payload).not.toHaveProperty("refund_rate_pct");
    // Raw summary cells must not leak.
    expect(payload).not.toHaveProperty("gross_volume");
    expect(payload).not.toHaveProperty("disputes_total");
    expect(payload).not.toHaveProperty("failed_payment_count");

    expect(auditMock).toHaveBeenCalledTimes(1);
    const auditDetails = auditMock.mock.calls[0][2] as Record<string, unknown>;
    expect(auditDetails.source).toBe("metrics_stripe");
    expect(auditDetails).not.toHaveProperty("gross_volume");
    expect(auditDetails).not.toHaveProperty("payment_failure_rate_pct");
  });
});

describe("P20.15b panel source-level guards", () => {
  const panelSrc = readFileSync(
    join(process.cwd(), "src/components/intelligence/AdminMetricsImporterPanel.tsx"),
    "utf8",
  );

  it("does not contain Square or Stripe API key/token references", () => {
    expect(panelSrc).not.toMatch(/SQUARE_(?:API_)?(?:KEY|TOKEN|SECRET)/i);
    expect(panelSrc).not.toMatch(/STRIPE_(?:API_)?(?:KEY|TOKEN|SECRET)/i);
    expect(panelSrc).not.toMatch(/access_token|refresh_token|client_secret/i);
  });

  it("uses MMJ wording (no MMC) in cannabis-facing copy", () => {
    // Heritage industry key `mmj_cannabis` is allowed; we only forbid the
    // shorthand "MMC" appearing as user-facing copy.
    expect(panelSrc).not.toMatch(/\bMMC\b/);
  });

  it("contains no healthcare/patient-care wording", () => {
    const banned = [
      "patient",
      "clinical",
      "diagnosis",
      "insurance",
      "claim",
      "appointment",
      "reimbursement",
      "treatment",
      "medical record",
      "healthcare provider",
    ];
    for (const word of banned) {
      expect(panelSrc.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});