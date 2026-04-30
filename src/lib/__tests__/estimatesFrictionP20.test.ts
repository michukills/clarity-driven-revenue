import { describe, it, expect } from "vitest";
import {
  detectEstimateFriction,
  frictionByKind,
  frictionDollarsAtRisk,
  isTerminalStatus,
} from "@/lib/estimates/friction";
import type { Estimate } from "@/lib/estimates/types";
import { NEVER_SENT_DAYS, STALE_SENT_DAYS } from "@/lib/estimates/types";

const NOW = new Date("2026-04-30T12:00:00Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString();
const dateDaysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString().slice(0, 10);

function est(over: Partial<Estimate> = {}): Estimate {
  return {
    id: over.id ?? "e1",
    customer_id: "cust-1",
    period_id: null,
    estimate_number: null,
    estimate_date: dateDaysAgo(0),
    expires_at: null,
    client_or_job: "Acme",
    service_category: "install",
    amount: 1000,
    status: "draft",
    sent_at: null,
    approved_at: null,
    rejected_at: null,
    converted_invoice_id: null,
    source: "manual",
    notes: null,
    created_by: null,
    created_at: daysAgo(0),
    updated_at: daysAgo(0),
    ...over,
  };
}

describe("P20.1 estimate friction detection", () => {
  it("ignores fresh drafts", () => {
    const sigs = detectEstimateFriction({
      estimates: [est({ status: "draft", created_at: daysAgo(1) })],
      now: NOW,
    });
    expect(sigs).toHaveLength(0);
  });

  it("flags drafts older than NEVER_SENT_DAYS", () => {
    const sigs = detectEstimateFriction({
      estimates: [est({ status: "draft", created_at: daysAgo(NEVER_SENT_DAYS + 1) })],
      now: NOW,
    });
    expect(sigs).toHaveLength(1);
    expect(sigs[0].kind).toBe("estimate_never_sent");
    expect(sigs[0].confidence).toBe("Confirmed");
  });

  it("does not flag sent estimates within the stale window", () => {
    const sigs = detectEstimateFriction({
      estimates: [est({ status: "sent", sent_at: daysAgo(STALE_SENT_DAYS - 1) })],
      now: NOW,
    });
    expect(sigs).toHaveLength(0);
  });

  it("flags stale sent estimates", () => {
    const sigs = detectEstimateFriction({
      estimates: [est({ status: "sent", sent_at: daysAgo(STALE_SENT_DAYS + 5) })],
      now: NOW,
    });
    expect(sigs.some((s) => s.kind === "estimate_stale_sent")).toBe(true);
  });

  it("flags expired estimates with no decision", () => {
    const sigs = detectEstimateFriction({
      estimates: [
        est({
          status: "sent",
          sent_at: daysAgo(2),
          expires_at: dateDaysAgo(1),
        }),
      ],
      now: NOW,
    });
    expect(sigs.some((s) => s.kind === "estimate_expired_unanswered")).toBe(true);
  });

  it("flags approved estimates that were never invoiced", () => {
    const sigs = detectEstimateFriction({
      estimates: [
        est({ id: "e-approved", status: "approved", approved_at: daysAgo(20) }),
      ],
      now: NOW,
    });
    const a = sigs.find((s) => s.kind === "estimate_approved_not_invoiced");
    expect(a?.severity).toBe("high");
  });

  it("does NOT flag approved estimates that have a linked invoice", () => {
    const sigs = detectEstimateFriction({
      estimates: [est({ id: "e-linked", status: "approved", approved_at: daysAgo(30) })],
      invoiceEstimateLinks: [{ source_estimate_id: "e-linked" }],
      now: NOW,
    });
    expect(sigs.some((s) => s.kind === "estimate_approved_not_invoiced")).toBe(false);
  });

  it("does NOT flag terminal-status estimates", () => {
    const terminal: Estimate["status"][] = ["rejected", "expired", "converted", "cancelled"];
    for (const status of terminal) {
      const sigs = detectEstimateFriction({
        estimates: [est({ status, created_at: daysAgo(60) })],
        now: NOW,
      });
      expect(sigs).toHaveLength(0);
      expect(isTerminalStatus(status)).toBe(true);
    }
  });

  it("sorts high-severity signals before low-severity", () => {
    const sigs = detectEstimateFriction({
      estimates: [
        est({ id: "low", status: "draft", created_at: daysAgo(NEVER_SENT_DAYS + 1), amount: 100 }),
        est({
          id: "high",
          status: "approved",
          approved_at: daysAgo(30),
          amount: 5000,
        }),
      ],
      now: NOW,
    });
    expect(sigs[0].estimate_id).toBe("high");
  });

  it("sums dollars at risk and groups by kind", () => {
    const sigs = detectEstimateFriction({
      estimates: [
        est({ id: "a", status: "draft", created_at: daysAgo(NEVER_SENT_DAYS + 1), amount: 250 }),
        est({ id: "b", status: "sent", sent_at: daysAgo(STALE_SENT_DAYS + 1), amount: 750 }),
      ],
      now: NOW,
    });
    expect(frictionDollarsAtRisk(sigs)).toBe(1000);
    const grouped = frictionByKind(sigs);
    expect(grouped.estimate_never_sent).toHaveLength(1);
    expect(grouped.estimate_stale_sent).toHaveLength(1);
  });

  it("only emits Confirmed-confidence signals (no fake precision)", () => {
    const sigs = detectEstimateFriction({
      estimates: [
        est({ status: "draft", created_at: daysAgo(NEVER_SENT_DAYS + 1) }),
        est({ id: "x", status: "approved", approved_at: daysAgo(30) }),
      ],
      now: NOW,
    });
    expect(sigs.every((s) => s.confidence === "Confirmed")).toBe(true);
  });
});