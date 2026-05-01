/**
 * P20.17 — Connector readiness helper tests.
 */

import { describe, it, expect } from "vitest";
import {
  computeConnectorReadiness,
  safeAuditFromRow,
  STATUS_LABELS,
  type ReadinessInputs,
} from "../connectorReadiness";

const baseInputs: ReadinessInputs = {
  industry: "trade_field_service",
  currentMetricsSource: null,
  quickbooks: { summary: null },
  square: { summary: null },
  stripe: { summary: null },
  dutchie: { summary: null },
};

describe("computeConnectorReadiness", () => {
  it("returns no_summary for QB when nothing is on file and not connected", () => {
    const out = computeConnectorReadiness(baseInputs);
    const qb = out.find((r) => r.provider === "quickbooks")!;
    expect(qb.status).toBe("no_summary");
    expect(qb.applicable).toBe(true);
  });

  it("marks Square/Stripe normalized_ingest_available when no summary", () => {
    const out = computeConnectorReadiness(baseInputs);
    expect(out.find((r) => r.provider === "square")!.status).toBe(
      "normalized_ingest_available",
    );
    expect(out.find((r) => r.provider === "stripe")!.status).toBe(
      "normalized_ingest_available",
    );
  });

  it("flips to summary_available when a summary row exists", () => {
    const out = computeConnectorReadiness({
      ...baseInputs,
      stripe: {
        summary: { period_start: "2026-04-01", period_end: "2026-04-30" },
      },
    });
    expect(out.find((r) => r.provider === "stripe")!.status).toBe(
      "summary_available",
    );
  });

  it("marks imported_to_metrics when current metrics source matches", () => {
    const out = computeConnectorReadiness({
      ...baseInputs,
      currentMetricsSource: "square",
      square: {
        summary: { period_start: "2026-04-01", period_end: "2026-04-30" },
      },
    });
    const sq = out.find((r) => r.provider === "square")!;
    expect(sq.importedToMetrics).toBe(true);
    expect(sq.status).toBe("imported_to_metrics");
  });

  it("marks Dutchie not_applicable for non-cannabis customers", () => {
    const out = computeConnectorReadiness(baseInputs);
    const du = out.find((r) => r.provider === "dutchie")!;
    expect(du.status).toBe("not_applicable");
    expect(du.applicable).toBe(false);
  });

  it("marks Dutchie normalized_ingest_available for cannabis customers", () => {
    const out = computeConnectorReadiness({
      ...baseInputs,
      industry: "mmj_cannabis",
    });
    const du = out.find((r) => r.provider === "dutchie")!;
    expect(du.status).toBe("normalized_ingest_available");
    expect(du.applicable).toBe(true);
  });

  it("never marks Square/Stripe/Dutchie as connected without live config", () => {
    const out = computeConnectorReadiness({
      ...baseInputs,
      industry: "mmj_cannabis",
      square: {
        summary: { period_start: "2026-04-01", period_end: "2026-04-30" },
      },
      stripe: {
        summary: { period_start: "2026-04-01", period_end: "2026-04-30" },
      },
      dutchie: {
        summary: { period_start: "2026-04-01", period_end: "2026-04-30" },
      },
    });
    for (const p of ["square", "stripe", "dutchie"] as const) {
      const row = out.find((r) => r.provider === p)!;
      expect(row.status).not.toBe("connected");
      expect(row.liveSyncConfigured).toBe(false);
    }
  });

  it("marks QuickBooks connected only when liveConnected is true and no summary yet", () => {
    const out = computeConnectorReadiness({
      ...baseInputs,
      quickbooks: { summary: null, liveConnected: true },
    });
    expect(out.find((r) => r.provider === "quickbooks")!.status).toBe(
      "connected",
    );
  });

  it("propagates error status when provider read failed", () => {
    const out = computeConnectorReadiness({
      ...baseInputs,
      square: { summary: null, error: "boom" },
    });
    expect(out.find((r) => r.provider === "square")!.status).toBe("error");
  });

  it("status labels do not contain healthcare/MMC wording", () => {
    const joined = Object.values(STATUS_LABELS).join(" ").toLowerCase();
    for (const word of [
      "patient",
      "clinical",
      "diagnosis",
      "insurance",
      "claim",
      "appointment",
      "reimbursement",
      "treatment",
      "medical record",
      "mmc",
    ]) {
      expect(joined).not.toContain(word);
    }
  });
});

describe("safeAuditFromRow", () => {
  it("whitelists only safe keys and infers provider from source", () => {
    const safe = safeAuditFromRow({
      id: "1",
      action: "data_import_completed",
      created_at: "2026-04-30T00:00:00Z",
      details: {
        source: "metrics_square",
        field_count: 5,
        confidence: "Confirmed",
        access_token: "should_be_dropped",
        raw_rows: [{ secret: "x" }],
        account_id: "acct_123",
      },
    });
    expect(safe.source).toBe("metrics_square");
    expect(safe.provider).toBe("square");
    expect(safe.field_count).toBe(5);
    expect(safe.confidence).toBe("Confirmed");
    expect(safe).not.toHaveProperty("access_token");
    expect(safe).not.toHaveProperty("raw_rows");
    expect(safe).not.toHaveProperty("account_id");
  });

  it("handles non-object details gracefully", () => {
    const safe = safeAuditFromRow({
      id: "2",
      action: "data_import_started",
      created_at: "2026-04-30T00:00:00Z",
      details: null,
    });
    expect(safe.action).toBe("data_import_started");
    expect(safe.provider).toBeNull();
  });
});