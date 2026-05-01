/**
 * P20.17 — Connector Readiness & Import History panel UI tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const fromMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));

import { ConnectorReadinessHistoryPanel } from "../ConnectorReadinessHistoryPanel";
import type { ReadinessInputs } from "@/lib/customerMetrics/connectorReadiness";

function chain(rows: unknown[], error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const ret = () => builder;
  builder.select = vi.fn(ret);
  builder.eq = vi.fn(ret);
  builder.in = vi.fn(ret);
  builder.order = vi.fn(ret);
  builder.limit = vi.fn(() => Promise.resolve({ data: rows, error }));
  return builder;
}

beforeEach(() => {
  fromMock.mockReset();
});

const baseInputs: ReadinessInputs = {
  industry: "trade_field_service",
  currentMetricsSource: null,
  quickbooks: { summary: null },
  square: { summary: null },
  stripe: { summary: null },
  dutchie: { summary: null },
};

describe("ConnectorReadinessHistoryPanel", () => {
  it("renders all four provider rows with safe statuses", async () => {
    fromMock.mockReturnValue(chain([]));
    render(
      <ConnectorReadinessHistoryPanel customerId="c1" inputs={baseInputs} />,
    );
    expect(await screen.findByTestId("readiness-row-quickbooks")).toBeTruthy();
    expect(screen.getByTestId("readiness-row-square")).toBeTruthy();
    expect(screen.getByTestId("readiness-row-stripe")).toBeTruthy();
    expect(screen.getByTestId("readiness-row-dutchie")).toBeTruthy();
    expect(
      screen.getByTestId("readiness-status-square").textContent,
    ).toMatch(/Normalized ingest available/);
    expect(
      screen.getByTestId("readiness-status-dutchie").textContent,
    ).toMatch(/Not applicable/);
  });

  it("shows cannabis/MMJ-applicable status for Dutchie when industry matches", async () => {
    fromMock.mockReturnValue(chain([]));
    render(
      <ConnectorReadinessHistoryPanel
        customerId="c1"
        inputs={{ ...baseInputs, industry: "mmj_cannabis" }}
      />,
    );
    await waitFor(() => screen.getByTestId("readiness-status-dutchie"));
    expect(
      screen.getByTestId("readiness-status-dutchie").textContent,
    ).toMatch(/Normalized ingest available/);
  });

  it("renders empty state when there are no audit events", async () => {
    fromMock.mockReturnValue(chain([]));
    render(
      <ConnectorReadinessHistoryPanel customerId="c1" inputs={baseInputs} />,
    );
    expect(await screen.findByTestId("history-empty")).toBeTruthy();
  });

  it("renders only safe whitelisted audit fields", async () => {
    fromMock.mockReturnValue(
      chain([
        {
          id: "a1",
          action: "data_import_completed",
          created_at: "2026-04-30T12:00:00Z",
          details: {
            source: "metrics_stripe",
            field_count: 7,
            confidence: "Confirmed",
            access_token: "sk_live_should_not_render",
            account_id: "acct_secret",
          },
        },
        {
          id: "a2",
          action: "data_import_started",
          created_at: "2026-04-30T11:00:00Z",
          details: {
            event: "provider_summary_ingested",
            provider: "square",
            period_start: "2026-04-01",
            period_end: "2026-04-30",
            field_count: 4,
          },
        },
      ]),
    );
    render(
      <ConnectorReadinessHistoryPanel customerId="c1" inputs={baseInputs} />,
    );
    const list = await screen.findByTestId("history-list");
    expect(list.textContent ?? "").not.toContain("sk_live_should_not_render");
    expect(list.textContent ?? "").not.toContain("acct_secret");
    expect(list.textContent ?? "").toContain("Imported into metrics");
    expect(list.textContent ?? "").toContain("Summary ingested");
    expect(list.textContent ?? "").toContain("stripe");
    expect(list.textContent ?? "").toContain("square");
  });

  it("contains no MMC wording or healthcare language", async () => {
    fromMock.mockReturnValue(chain([]));
    const { container } = render(
      <ConnectorReadinessHistoryPanel
        customerId="c1"
        inputs={{ ...baseInputs, industry: "mmj_cannabis" }}
      />,
    );
    await screen.findByTestId("readiness-row-dutchie");
    const text = (container.textContent ?? "").toLowerCase();
    for (const word of [
      "patient",
      "clinical",
      "diagnosis",
      "insurance claim",
      "appointment",
      "reimbursement",
      "treatment",
      "medical record",
      "mmc",
    ]) {
      expect(text).not.toContain(word);
    }
  });
});