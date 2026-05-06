/**
 * P85.1 — RGS Evidence Authority Ladder™
 *
 * Deterministic source hierarchy used by the diagnostic engine, conflict
 * detection, and reports. Highest-authority source determines scoring
 * value when multiple sources exist for the same data point.
 *
 * Lower numeric `authority_rank` = higher authority (1 is the strongest).
 */

export type EvidenceAuthoritySourceKey =
  | "verified_evidence"
  | "admin_observation"
  | "imported_system_data"
  | "admin_interview_confirmation"
  | "client_claim";

export interface EvidenceAuthoritySource {
  source_key: EvidenceAuthoritySourceKey;
  authority_rank: 1 | 2 | 3 | 4 | 5;
  source_label: string;
  client_safe_label: string;
  admin_label: string;
  examples: string[];
  score_usage_rule: string;
  requires_admin_verification: boolean;
  can_be_client_claim: boolean;
  can_trigger_conflict: boolean;
}

export const EVIDENCE_AUTHORITY_LADDER: EvidenceAuthoritySource[] = [
  {
    source_key: "verified_evidence",
    authority_rank: 1,
    source_label: "Verified Evidence",
    client_safe_label: "Verified evidence",
    admin_label: "Verified Evidence (highest authority)",
    examples: [
      "P&L",
      "METRC export",
      "signed contract",
      "uploaded Evidence Vault document",
      "official export",
      "approved source document",
    ],
    score_usage_rule:
      "Used directly for scoring. Overrides all lower-authority sources.",
    requires_admin_verification: true,
    can_be_client_claim: false,
    can_trigger_conflict: true,
  },
  {
    source_key: "admin_observation",
    authority_rank: 2,
    source_label: "Admin Observation",
    client_safe_label: "RGS-observed",
    admin_label: "Admin Observation",
    examples: [
      "direct visual proof during walkthrough",
      "screen share",
      "admin-reviewed screenshot",
      "admin-reviewed system view",
    ],
    score_usage_rule:
      "Used for scoring when no Verified Evidence exists for the same data point.",
    requires_admin_verification: true,
    can_be_client_claim: false,
    can_trigger_conflict: true,
  },
  {
    source_key: "imported_system_data",
    authority_rank: 3,
    source_label: "Imported System Data",
    client_safe_label: "Imported from connected source",
    admin_label: "Imported System Data (live/synced)",
    examples: [
      "live API feed from POS",
      "CRM sync",
      "accounting sync",
      "seed-to-sale feed",
      "scheduling feed",
      "e-commerce feed",
    ],
    score_usage_rule:
      "Used only when actually live/synced/imported. Manual exports are not Imported System Data.",
    requires_admin_verification: false,
    can_be_client_claim: false,
    can_trigger_conflict: true,
  },
  {
    source_key: "admin_interview_confirmation",
    authority_rank: 4,
    source_label: "Admin Interview Confirmation",
    client_safe_label: "Confirmed during RGS interview",
    admin_label: "Admin Interview Confirmation",
    examples: [
      "verbal confirmation during interview",
      "admin assist mode confirmation",
    ],
    score_usage_rule:
      "Used when no higher-authority source exists. Subject to conflict checks.",
    requires_admin_verification: false,
    can_be_client_claim: false,
    can_trigger_conflict: true,
  },
  {
    source_key: "client_claim",
    authority_rank: 5,
    source_label: "Client Claim",
    client_safe_label: "Owner-reported",
    admin_label: "Client Claim (lowest authority)",
    examples: [
      "self-reported portal answer",
      "owner-written claim",
      "unverified narrative response",
    ],
    score_usage_rule:
      "Used only when no higher-authority source is available. Triggers conflict when contradicted.",
    requires_admin_verification: false,
    can_be_client_claim: true,
    can_trigger_conflict: true,
  },
];

const BY_KEY = new Map<EvidenceAuthoritySourceKey, EvidenceAuthoritySource>(
  EVIDENCE_AUTHORITY_LADDER.map((s) => [s.source_key, s]),
);

export function getAuthoritySource(
  key: EvidenceAuthoritySourceKey,
): EvidenceAuthoritySource {
  const s = BY_KEY.get(key);
  if (!s) throw new Error(`Unknown evidence source key: ${key}`);
  return s;
}

export function authorityRank(key: EvidenceAuthoritySourceKey): number {
  return getAuthoritySource(key).authority_rank;
}

/**
 * Returns the source key with the strongest authority (lowest numeric rank).
 * On ties, the first key passed in wins (callers should pre-sort if needed).
 */
export function highestAuthority(
  keys: EvidenceAuthoritySourceKey[],
): EvidenceAuthoritySourceKey | null {
  if (keys.length === 0) return null;
  return keys.reduce((best, k) =>
    authorityRank(k) < authorityRank(best) ? k : best,
  );
}

export const EVIDENCE_AUTHORITY_LADDER_VERSION = "1.0.0" as const;