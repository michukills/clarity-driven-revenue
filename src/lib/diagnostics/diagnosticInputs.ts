/**
 * P11.8 — Integration-ready diagnostic inputs.
 *
 * Every diagnostic sub-tool eventually consumes a mix of:
 *   - manual admin/client entries
 *   - verified imported records from connected external accounts (P11.7)
 *   - pending imported records still awaiting client verification
 *   - inferred / system-generated values
 *
 * This module provides a single shape (`DiagnosticInput`) for those values
 * with provenance + confidence preserved, plus helpers that tag a payload
 * with input provenance so reruns, comparisons, signals, and memory-eligible
 * findings can reason about where the truth came from.
 *
 * Pending imported data is intentionally NOT treated as fully trusted
 * diagnostic truth — `verifiedOnly` filters keep unverified rows out of
 * the values that drive scoring.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ExternalRecordKind, ReconcileStatus } from "@/lib/integrations/integrations";

export type DiagnosticInputProvenance =
  | "manual"
  | "imported_verified"
  | "imported_pending"
  | "inferred";

export type DiagnosticInputConfidence = "low" | "medium" | "high";

export interface DiagnosticInput<T = unknown> {
  /** Stable key identifying what this value represents (e.g. "monthly_revenue"). */
  key: string;
  /** Optional human label for admin display. */
  label?: string;
  value: T;
  provenance: DiagnosticInputProvenance;
  confidence: DiagnosticInputConfidence;
  /** Where this value came from — provider name, "client_form", "admin_estimate", etc. */
  sourceLabel?: string;
  /** Stable reference (external_id, table:row id, etc.) so re-imports dedupe. */
  sourceRef?: string;
  /** Optional ISO timestamp of when the source value was captured externally. */
  capturedAt?: string;
}

/** Aggregate provenance summary for a diagnostic run payload. */
export interface DiagnosticInputProvenanceSummary {
  total: number;
  manual: number;
  imported_verified: number;
  imported_pending: number;
  inferred: number;
  /** True when at least one verified imported value contributed. */
  hasVerifiedImports: boolean;
  /** True when pending imports were excluded from the run. */
  excludedPending: boolean;
  /** Highest confidence tier present in the inputs. */
  topConfidence: DiagnosticInputConfidence;
  /** One-liner suitable for the result_summary band. */
  badge: string;
}

const CONF_RANK: Record<DiagnosticInputConfidence, number> = { low: 0, medium: 1, high: 2 };

export function summarizeProvenance(
  inputs: DiagnosticInput[],
): DiagnosticInputProvenanceSummary {
  const counts = { manual: 0, imported_verified: 0, imported_pending: 0, inferred: 0 };
  let topConf: DiagnosticInputConfidence = "low";
  for (const i of inputs) {
    counts[i.provenance] = (counts[i.provenance] ?? 0) + 1;
    if (CONF_RANK[i.confidence] > CONF_RANK[topConf]) topConf = i.confidence;
  }
  const total = inputs.length;
  const hasVerifiedImports = counts.imported_verified > 0;
  const excludedPending = counts.imported_pending > 0;
  const parts: string[] = [];
  if (counts.imported_verified) parts.push(`${counts.imported_verified} verified imported`);
  if (counts.manual) parts.push(`${counts.manual} manual`);
  if (counts.inferred) parts.push(`${counts.inferred} inferred`);
  if (counts.imported_pending) parts.push(`${counts.imported_pending} pending (excluded)`);
  const badge = total === 0 ? "No structured inputs" : parts.join(" · ");
  return {
    total,
    ...counts,
    hasVerifiedImports,
    excludedPending,
    topConfidence: topConf,
    badge,
  };
}

/**
 * Decorate a payload object with provenance metadata so the diagnostic run
 * persistence layer (and downstream signal emitters) can see what kind of
 * truth each input represents.
 *
 * The original payload is preserved untouched under `payload`.
 */
export function attachProvenance<P extends object>(
  payload: P,
  inputs: DiagnosticInput[],
): P & {
  __inputs: DiagnosticInput[];
  __provenance: DiagnosticInputProvenanceSummary;
} {
  return {
    ...payload,
    __inputs: inputs,
    __provenance: summarizeProvenance(inputs),
  };
}

/** Read provenance summary back from a stored payload. */
export function readProvenance(payload: any): DiagnosticInputProvenanceSummary | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload.__provenance ?? payload?.summary?.__provenance;
  return p && typeof p === "object" ? (p as DiagnosticInputProvenanceSummary) : null;
}

/** Read individual input rows back from a stored payload. */
export function readInputs(payload: any): DiagnosticInput[] {
  if (!payload || typeof payload !== "object") return [];
  const arr = payload.__inputs ?? payload?.summary?.__inputs;
  return Array.isArray(arr) ? (arr as DiagnosticInput[]) : [];
}

/* ─────────── Loaders for verified imported inputs ─────────── */

/**
 * Fetch verified imported rows of a given kind for use as diagnostic inputs.
 * Defaults to `verifiedOnly = true`, which restricts to records the client
 * has approved through the integrations reconciliation flow
 * (`reconcile_status = 'imported'`). Pending rows are returned only when
 * `verifiedOnly = false` and are flagged with `provenance: 'imported_pending'`
 * so the caller can present them as not-yet-trusted preview data.
 */
export async function loadImportedInputs(args: {
  customerId: string;
  recordKind: ExternalRecordKind;
  verifiedOnly?: boolean;
  limit?: number;
}): Promise<DiagnosticInput<Record<string, unknown>>[]> {
  const verifiedOnly = args.verifiedOnly ?? true;
  const allowed: ReconcileStatus[] = verifiedOnly
    ? ["imported"]
    : ["imported", "pending", "matched"];

  const { data, error } = await supabase
    .from("integration_external_records")
    .select("id, provider, record_kind, external_id, external_updated_at, payload, reconcile_status, linked_local_id, linked_local_table")
    .eq("customer_id", args.customerId)
    .eq("record_kind", args.recordKind)
    .in("reconcile_status", allowed as unknown as string[])
    .order("external_updated_at", { ascending: false })
    .limit(args.limit ?? 100);

  if (error || !Array.isArray(data)) return [];

  return data.map((r: any) => {
    const verified = r.reconcile_status === "imported";
    return {
      key: `${args.recordKind}:${r.external_id ?? r.id}`,
      label: r.external_id ?? `${r.provider} ${args.recordKind}`,
      value: (r.payload ?? {}) as Record<string, unknown>,
      provenance: verified ? "imported_verified" : "imported_pending",
      confidence: verified ? "high" : "low",
      sourceLabel: r.provider,
      sourceRef: r.external_id ?? r.id,
      capturedAt: r.external_updated_at ?? undefined,
    } satisfies DiagnosticInput<Record<string, unknown>>;
  });
}

/** Convenience: only the verified subset, even when caller forgot to set the flag. */
export async function loadVerifiedImportedInputs(
  customerId: string,
  recordKind: ExternalRecordKind,
  limit?: number,
): Promise<DiagnosticInput<Record<string, unknown>>[]> {
  return loadImportedInputs({ customerId, recordKind, verifiedOnly: true, limit });
}

/* ─────────── Helpers for tool authors ─────────── */

/** Wrap a manual value so it slots into the same DiagnosticInput shape. */
export function manualInput<T>(
  key: string,
  value: T,
  opts: { label?: string; confidence?: DiagnosticInputConfidence; sourceLabel?: string } = {},
): DiagnosticInput<T> {
  return {
    key,
    value,
    label: opts.label,
    provenance: "manual",
    confidence: opts.confidence ?? "medium",
    sourceLabel: opts.sourceLabel ?? "client_or_admin_form",
  };
}

/** Wrap an inferred / system-generated value (e.g. defaults, computed). */
export function inferredInput<T>(
  key: string,
  value: T,
  opts: { label?: string; confidence?: DiagnosticInputConfidence; sourceLabel?: string } = {},
): DiagnosticInput<T> {
  return {
    key,
    value,
    label: opts.label,
    provenance: "inferred",
    confidence: opts.confidence ?? "low",
    sourceLabel: opts.sourceLabel ?? "system_default",
  };
}
