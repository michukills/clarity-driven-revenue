/**
 * P13.EvidenceTiers.UI.1 — conservative derivation of an EvidenceTier
 * from the loose shapes we render across admin surfaces.
 *
 * Free-safe: pure functions, no I/O.
 *
 * Rules (in priority order, first match wins):
 *   1. Explicit hints — `evidence_tier`, `tier`, or `is_admin_validated`
 *      on the input override everything.
 *   2. Approved / admin-reviewed status (e.g. `approved_at`,
 *      `admin_reviewed`, `admin_validated === true`) → "admin_validated".
 *   3. Source coming from a tracked system / integration / sync (e.g.
 *      `source: "quickbooks"`, `is_synced: true`, `source_type:
 *      "integration"`, `source_table: "weekly_checkins"`,
 *      `signal_source: "qb"`) → "system_tracked".
 *   4. Source coming from interview / answers / scorecard / owner-
 *      reported → "owner_reported".
 *   5. Empty supporting evidence + something signals it's missing →
 *      "missing".
 *   6. Default → "owner_reported" — we never silently promote unknown
 *      claims to validated.
 */

import type { EvidenceTier } from "./prompts";

const SYSTEM_SOURCES = new Set([
  "quickbooks",
  "qb",
  "xero",
  "stripe",
  "square",
  "paypal",
  "hubspot",
  "salesforce",
  "pipedrive",
  "ga4",
  "google_analytics",
  "google_search_console",
  "meta_ads",
  "paycom",
  "adp",
  "gusto",
  "jobber",
  "housecall_pro",
  "servicetitan",
  "integration",
  "sync",
  "import",
  "weekly_checkin",
  "weekly_checkins",
  "csv_import",
  "spreadsheet_import",
]);

const OWNER_SOURCES = new Set([
  "interview",
  "answers",
  "scorecard",
  "scorecard_runs",
  "diagnostic_interview_runs",
  "diagnostic_intake_answers",
  "owner",
  "owner_reported",
  "self_reported",
  "manual",
  "lead",
  "anonymous",
  "client",
]);

export interface DeriveEvidenceTierInput {
  /** Direct override, highest priority. */
  evidence_tier?: EvidenceTier | string | null;
  tier?: EvidenceTier | string | null;
  /** Marks of admin review / approval. */
  approved_at?: string | null;
  admin_validated?: boolean | null;
  admin_reviewed?: boolean | null;
  status?: string | null;
  /** Source / provenance hints. */
  source?: string | null;
  source_type?: string | null;
  source_table?: string | null;
  signal_source?: string | null;
  is_synced?: boolean | null;
  is_imported?: boolean | null;
  is_admin_entered?: boolean | null;
  /** Body / supporting text — used to detect "missing" when empty. */
  supporting_evidence?: string | null;
  missing_evidence?: string | null;
  evidence_refs?: readonly string[] | null;
}

function normalize(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function isExplicitTier(v: unknown): v is EvidenceTier {
  return (
    v === "owner_reported" ||
    v === "system_tracked" ||
    v === "admin_validated" ||
    v === "missing"
  );
}

/**
 * Conservative tier derivation. Never promotes owner-reported answers to
 * validated without explicit admin/source signal.
 */
export function deriveEvidenceTier(input: DeriveEvidenceTierInput): EvidenceTier {
  // 1. Explicit override
  if (isExplicitTier(input.evidence_tier)) return input.evidence_tier;
  if (isExplicitTier(input.tier)) return input.tier;

  // 2. Admin-validated signals
  if (input.admin_validated === true) return "admin_validated";
  if (input.admin_reviewed === true) return "admin_validated";
  if (input.approved_at && String(input.approved_at).trim().length > 0) {
    return "admin_validated";
  }
  if (normalize(input.status) === "approved") return "admin_validated";

  // 3. System-tracked signals
  if (input.is_synced === true || input.is_imported === true) return "system_tracked";
  for (const k of [input.source, input.source_type, input.source_table, input.signal_source]) {
    const n = normalize(k);
    if (n && SYSTEM_SOURCES.has(n)) return "system_tracked";
  }

  // 4. Owner-reported signals
  for (const k of [input.source, input.source_type, input.source_table, input.signal_source]) {
    const n = normalize(k);
    if (n && OWNER_SOURCES.has(n)) return "owner_reported";
  }

  // 5. Missing — only when caller indicates absence of supporting
  // evidence AND is not an admin-entered claim.
  const supporting = (input.supporting_evidence ?? "").trim();
  const refs = input.evidence_refs ?? [];
  if (
    supporting.length === 0 &&
    refs.length === 0 &&
    input.is_admin_entered !== true &&
    (input.missing_evidence ?? "").trim().length > 0
  ) {
    return "missing";
  }

  // 6. Conservative default
  return "owner_reported";
}