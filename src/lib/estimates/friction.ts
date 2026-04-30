// P20.1 — Workflow-friction detection for estimates.
//
// Pure functions. Given a list of estimates (and optionally invoices),
// produce categorized friction signals that the priority engine and
// revenue-leak surfaces can consume.
//
// No network, no AI. Deterministic so it's safe to unit test.

import type { Estimate, EstimateStatus } from "./types";
import { NEVER_SENT_DAYS, STALE_SENT_DAYS } from "./types";

export type FrictionKind =
  | "estimate_never_sent"
  | "estimate_stale_sent"
  | "estimate_expired_unanswered"
  | "estimate_approved_not_invoiced"
  | "job_completed_not_invoiced"; // future-ready — only fires when caller passes job hints

export type FrictionSeverity = "low" | "medium" | "high";

export interface FrictionSignal {
  kind: FrictionKind;
  severity: FrictionSeverity;
  estimate_id: string | null;
  client_or_job: string | null;
  amount: number;
  message: string;
  /**
   * Confidence label per workspace data-integrity rules. Friction signals
   * derived purely from estimate/invoice state are "Confirmed". Signals
   * inferred from missing data should be "Estimated" or "Needs Verification".
   */
  confidence: "Confirmed" | "Estimated" | "Needs Verification";
}

export interface FrictionInput {
  estimates: Estimate[];
  /** Existing invoice rows used to detect approved-not-invoiced. */
  invoiceEstimateLinks?: { source_estimate_id: string | null }[];
  now?: Date;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

function severityForDays(days: number, mediumAt: number, highAt: number): FrictionSeverity {
  if (days >= highAt) return "high";
  if (days >= mediumAt) return "medium";
  return "low";
}

export function detectEstimateFriction(input: FrictionInput): FrictionSignal[] {
  const now = input.now ?? new Date();
  const out: FrictionSignal[] = [];

  const linkedEstimateIds = new Set(
    (input.invoiceEstimateLinks ?? [])
      .map((r) => r.source_estimate_id)
      .filter((v): v is string => !!v),
  );

  for (const e of input.estimates) {
    const created = new Date(e.created_at);
    const sent = e.sent_at ? new Date(e.sent_at) : null;
    const expires = e.expires_at ? new Date(e.expires_at) : null;

    // Drafts that have aged past NEVER_SENT_DAYS
    if (e.status === "draft") {
      const age = daysBetween(created, now);
      if (age >= NEVER_SENT_DAYS) {
        out.push({
          kind: "estimate_never_sent",
          severity: severityForDays(age, NEVER_SENT_DAYS, NEVER_SENT_DAYS * 3),
          estimate_id: e.id,
          client_or_job: e.client_or_job,
          amount: e.amount,
          message: `Draft estimate has not been sent in ${age} days.`,
          confidence: "Confirmed",
        });
      }
      continue;
    }

    // Sent but no answer past STALE_SENT_DAYS
    if (e.status === "sent" && sent) {
      const age = daysBetween(sent, now);
      if (age >= STALE_SENT_DAYS) {
        out.push({
          kind: "estimate_stale_sent",
          severity: severityForDays(age, STALE_SENT_DAYS, STALE_SENT_DAYS * 2),
          estimate_id: e.id,
          client_or_job: e.client_or_job,
          amount: e.amount,
          message: `Estimate sent ${age} days ago with no decision.`,
          confidence: "Confirmed",
        });
      }
      // Past expiration with no decision
      if (expires && expires < now) {
        out.push({
          kind: "estimate_expired_unanswered",
          severity: "medium",
          estimate_id: e.id,
          client_or_job: e.client_or_job,
          amount: e.amount,
          message: `Estimate expired on ${e.expires_at} with no decision.`,
          confidence: "Confirmed",
        });
      }
      continue;
    }

    // Approved but never converted to invoice
    if (e.status === "approved" && !e.converted_invoice_id && !linkedEstimateIds.has(e.id)) {
      const since = e.approved_at ? new Date(e.approved_at) : created;
      const age = daysBetween(since, now);
      out.push({
        kind: "estimate_approved_not_invoiced",
        severity: severityForDays(age, 3, 14),
        estimate_id: e.id,
        client_or_job: e.client_or_job,
        amount: e.amount,
        message:
          age > 0
            ? `Approved estimate has not been invoiced in ${age} days.`
            : `Approved estimate has not been invoiced yet.`,
        confidence: "Confirmed",
      });
    }
  }

  // High-severity first, then by dollar amount.
  const order: Record<FrictionSeverity, number> = { high: 3, medium: 2, low: 1 };
  out.sort((a, b) => {
    if (order[b.severity] !== order[a.severity]) return order[b.severity] - order[a.severity];
    return b.amount - a.amount;
  });
  return out;
}

/** Sum of dollars at risk across all friction signals. Used for the
 *  "estimated revenue at friction" line in the leak surface. */
export function frictionDollarsAtRisk(signals: FrictionSignal[]): number {
  return signals.reduce((s, x) => s + (x.amount || 0), 0);
}

export function frictionByKind(signals: FrictionSignal[]): Record<FrictionKind, FrictionSignal[]> {
  const empty: Record<FrictionKind, FrictionSignal[]> = {
    estimate_never_sent: [],
    estimate_stale_sent: [],
    estimate_expired_unanswered: [],
    estimate_approved_not_invoiced: [],
    job_completed_not_invoiced: [],
  };
  for (const s of signals) empty[s.kind].push(s);
  return empty;
}

/** Mark a status as terminal so admin/client UIs can hide closed-out estimates. */
export function isTerminalStatus(s: EstimateStatus): boolean {
  return s === "rejected" || s === "expired" || s === "converted" || s === "cancelled";
}