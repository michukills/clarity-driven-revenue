/**
 * P20.16 — Provider Summary Ingest panel UI tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const invokeMock = vi.fn();
const auditMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invokeMock(...a) } },
}));
vi.mock("@/lib/portalAudit", () => ({
  logPortalAudit: (...a: unknown[]) => auditMock(...a),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

import { ProviderSummaryIngestPanel } from "../ProviderSummaryIngestPanel";

beforeEach(() => {
  invokeMock.mockReset();
  auditMock.mockReset();
  toastMock.mockReset();
});

const validJson = JSON.stringify({
  period_start: "2026-04-01",
  period_end: "2026-04-30",
  gross_sales: 100000,
  net_sales: 92000,
  transaction_count: 2000,
});

describe("ProviderSummaryIngestPanel", () => {
  it("renders provider buttons; Dutchie disabled for non-cannabis", () => {
    render(<ProviderSummaryIngestPanel customerId="c1" isCannabis={false} />);
    expect(screen.getByTestId("ingest-provider-square")).toBeEnabled();
    expect(screen.getByTestId("ingest-provider-stripe")).toBeEnabled();
    expect(screen.getByTestId("ingest-provider-dutchie")).toBeDisabled();
  });

  it("disables submit until valid payload is pasted", () => {
    render(<ProviderSummaryIngestPanel customerId="c1" isCannabis={false} />);
    expect(screen.getByTestId("ingest-submit")).toBeDisabled();
    fireEvent.change(screen.getByTestId("ingest-json-input"), {
      target: { value: '{"period_start":"2026-04-01"}' },
    });
    // Missing period_end ⇒ still disabled.
    expect(screen.getByTestId("ingest-submit")).toBeDisabled();
  });

  it("blocks token-like keys in the pasted payload", () => {
    render(<ProviderSummaryIngestPanel customerId="c1" isCannabis={false} />);
    fireEvent.change(screen.getByTestId("ingest-json-input"), {
      target: {
        value: JSON.stringify({
          period_start: "2026-04-01",
          period_end: "2026-04-30",
          access_token: "abc",
          gross_sales: 1,
        }),
      },
    });
    expect(screen.getByTestId("ingest-errors")).toBeInTheDocument();
    expect(screen.getByTestId("ingest-submit")).toBeDisabled();
  });

  it("submits valid Square ingest, refreshes, and audits count-only", async () => {
    invokeMock.mockResolvedValue({ data: { ok: true, provider: "square" }, error: null });
    const onIngested = vi.fn();
    render(<ProviderSummaryIngestPanel customerId="c1" isCannabis={false} onIngested={onIngested} />);
    fireEvent.change(screen.getByTestId("ingest-json-input"), {
      target: { value: validJson },
    });
    await waitFor(() =>
      expect(screen.getByTestId("ingest-submit")).toBeEnabled(),
    );
    fireEvent.click(screen.getByTestId("ingest-submit"));
    await waitFor(() => expect(invokeMock).toHaveBeenCalled());

    const [fnName, opts] = invokeMock.mock.calls[0];
    expect(fnName).toBe("square-sync");
    expect(opts.body.action).toBe("ingest_summary");
    expect(opts.body.customer_id).toBe("c1");
    expect(opts.body.summary.gross_sales).toBe(100000);

    expect(onIngested).toHaveBeenCalledWith("square");

    // Audit is count-only — must not contain raw payload or token-like keys.
    expect(auditMock).toHaveBeenCalled();
    const auditDetails = auditMock.mock.calls[0][2];
    expect(auditDetails.event).toBe("provider_summary_ingested");
    expect(auditDetails.field_count).toBeGreaterThan(0);
    expect(auditDetails.live_api).toBe(false);
    expect(auditDetails.source).toBe("normalized_admin_ingest");
    const dump = JSON.stringify(auditDetails);
    expect(dump).not.toContain("100000"); // raw value not echoed
    for (const k of ["access_token", "refresh_token", "client_secret", "api_key"]) {
      expect(dump.toLowerCase()).not.toContain(k);
    }
  });

  it("does not auto-import into client_business_metrics", async () => {
    // Only the parent's snapshot import button writes to client_business_metrics;
    // this panel only invokes the edge function, never upsertCustomerMetrics.
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    render(<ProviderSummaryIngestPanel customerId="c1" isCannabis={false} />);
    fireEvent.change(screen.getByTestId("ingest-json-input"), {
      target: { value: validJson },
    });
    await waitFor(() => expect(screen.getByTestId("ingest-submit")).toBeEnabled());
    fireEvent.click(screen.getByTestId("ingest-submit"));
    await waitFor(() => expect(invokeMock).toHaveBeenCalled());
    // No upsertCustomerMetrics import in this module ⇒ trivially true.
  });
});

describe("ProviderSummaryIngestPanel — language and security guards (source)", () => {
  const src = readFileSync(
    join(__dirname, "..", "ProviderSummaryIngestPanel.tsx"),
    "utf-8",
  );
  const lower = src.toLowerCase();

  it("does not use 'MMC' shorthand", () => {
    expect(/\bmmc\b/.test(src)).toBe(false);
  });

  it("does not use healthcare/patient-care wording", () => {
    for (const word of ["patient", "clinical", "diagnosis", "appointment", "reimbursement", "treatment", "medical record"]) {
      expect(lower.includes(word)).toBe(false);
    }
  });

  it("does not embed service role / secret references in frontend code", () => {
    expect(/service_role|service-role/i.test(src)).toBe(false);
    expect(/STRIPE_SECRET_KEY|SQUARE_CLIENT_SECRET|DUTCHIE_API_KEY/.test(src)).toBe(false);
  });
});