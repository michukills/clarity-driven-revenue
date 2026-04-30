// P20.3 — General RGS Brain.
//
// Universal small-business instability patterns. Runs for EVERY industry
// (including missing/unverified). Pure / deterministic. No AI. No network.
//
// Reads BrainInput.signals + BrainInput.industryData?.shared and emits
// canonical Leak objects. Each output preserves a confidence label and
// never pretends missing data is confirmed.

import type { Leak } from "@/lib/leakEngine/leakObject";
import type { BrainInput, BrainResult, UniversalIssueKey } from "./types";
import { profileFor } from "@/lib/leakEngine/industry";

interface UniversalRule {
  key: UniversalIssueKey;
  category: Leak["category"];
  gear: Leak["gear"];
  message: string;
  recommended_fix: string;
}

const RULES: Record<UniversalIssueKey, UniversalRule> = {
  unclear_revenue_source: {
    key: "unclear_revenue_source",
    category: "demand",
    gear: 1,
    message: "Revenue sources are not clearly attributed.",
    recommended_fix: "Add a single source-of-record for where every dollar comes from.",
  },
  poor_follow_up: {
    key: "poor_follow_up",
    category: "conversion",
    gear: 2,
    message: "Leads or estimates are not consistently followed up.",
    recommended_fix: "Install a 3-touch follow-up cadence on every open opportunity.",
  },
  delayed_invoicing: {
    key: "delayed_invoicing",
    category: "financial_visibility",
    gear: 4,
    message: "Invoicing or billing is delayed after work or approval.",
    recommended_fix: "Move invoicing to within 24 hours of approval or completion.",
  },
  weak_profitability_visibility: {
    key: "weak_profitability_visibility",
    category: "financial_visibility",
    gear: 4,
    message: "Profitability is not visible at the job, product, or service level.",
    recommended_fix: "Tag every cost line so margin can be reviewed weekly.",
  },
  owner_dependent_process: {
    key: "owner_dependent_process",
    category: "operations",
    gear: 5,
    message: "Critical process is dependent on the owner.",
    recommended_fix: "Document the process and assign a non-owner owner-of-record.",
  },
  inconsistent_review_rhythm: {
    key: "inconsistent_review_rhythm",
    category: "operations",
    gear: 4,
    message: "No consistent weekly business review rhythm.",
    recommended_fix: "Establish a 30-minute weekly numbers-and-leaks review.",
  },
  manual_workaround_dependency: {
    key: "manual_workaround_dependency",
    category: "operations",
    gear: 3,
    message: "Core operations rely on manual spreadsheets or workarounds.",
    recommended_fix: "Replace the highest-friction spreadsheet with a tracked source.",
  },
  no_clear_task_ownership: {
    key: "no_clear_task_ownership",
    category: "operations",
    gear: 5,
    message: "Open tasks do not have a clear owner.",
    recommended_fix: "Assign a single accountable owner to every open task.",
  },
  missing_source_attribution: {
    key: "missing_source_attribution",
    category: "demand",
    gear: 1,
    message: "Lead and revenue source attribution is missing.",
    recommended_fix: "Capture source on every lead and invoice from now forward.",
  },
  incomplete_or_unverified_data: {
    key: "incomplete_or_unverified_data",
    category: "financial_visibility",
    gear: 4,
    message: "Operating data is incomplete or unverified.",
    recommended_fix: "List the missing inputs and request them from the client this week.",
  },
};

function makeLeak(
  rule: UniversalRule,
  input: BrainInput,
  overrides?: Partial<Leak> & { idSuffix?: string },
): Leak {
  const id = `general:${rule.key}${overrides?.idSuffix ? `:${overrides.idSuffix}` : ""}`;
  return {
    id,
    type: rule.key,
    category: rule.category,
    gear: rule.gear,
    severity: overrides?.severity ?? "medium",
    estimated_revenue_impact: overrides?.estimated_revenue_impact ?? 0,
    confidence: overrides?.confidence ?? "Needs Verification",
    source: overrides?.source ?? "manual",
    message: overrides?.message ?? rule.message,
    recommended_fix: overrides?.recommended_fix ?? rule.recommended_fix,
    industry_context: input.industry,
    source_ref: overrides?.source_ref ?? null,
    client_or_job: overrides?.client_or_job ?? null,
  };
}

/**
 * Run the General RGS Brain. Returns universal leaks derived from generic
 * signals + shared hints. Always includes the brand label so every analysis
 * is traceable.
 */
export function runGeneralBrain(input: BrainInput): BrainResult {
  const leaks: Leak[] = [];
  const shared = input.industryData?.shared ?? {};
  const signals = input.signals ?? [];

  // ----- Shared hints -----
  if (shared.hasWeeklyReview === false) {
    leaks.push(
      makeLeak(RULES.inconsistent_review_rhythm, input, {
        confidence: "Confirmed",
        severity: "medium",
      }),
    );
  }
  if (shared.ownerIsBottleneck === true) {
    leaks.push(
      makeLeak(RULES.owner_dependent_process, input, {
        confidence: "Confirmed",
        severity: "high",
      }),
    );
  }
  if (shared.usesManualSpreadsheet === true) {
    leaks.push(makeLeak(RULES.manual_workaround_dependency, input, { confidence: "Confirmed" }));
  }
  if (shared.hasAssignedOwners === false) {
    leaks.push(makeLeak(RULES.no_clear_task_ownership, input, { confidence: "Confirmed" }));
  }
  if (shared.hasSourceAttribution === false) {
    leaks.push(makeLeak(RULES.missing_source_attribution, input, { confidence: "Confirmed" }));
    leaks.push(makeLeak(RULES.unclear_revenue_source, input, { confidence: "Estimated" }));
  }
  if (shared.profitVisible === false) {
    leaks.push(
      makeLeak(RULES.weak_profitability_visibility, input, {
        confidence: "Confirmed",
        severity: "high",
      }),
    );
  }

  // ----- Generic signals → universal mapping -----
  for (const sig of signals) {
    // Map signal keys to universal rules where the meaning is unambiguous.
    if (sig.key.includes("invoice") && sig.key.includes("delay")) {
      leaks.push(
        makeLeak(RULES.delayed_invoicing, input, {
          idSuffix: sig.key,
          severity: sig.severity ?? "medium",
          estimated_revenue_impact: sig.estimated_revenue_impact ?? 0,
          confidence: sig.confidence ?? "Estimated",
          message: sig.observation,
          source: "manual",
          source_ref: sig.source_ref ?? null,
          client_or_job: sig.client_or_job ?? null,
        }),
      );
    } else if (sig.key.includes("follow_up") || sig.key.includes("followup")) {
      leaks.push(
        makeLeak(RULES.poor_follow_up, input, {
          idSuffix: sig.key,
          severity: sig.severity ?? "medium",
          estimated_revenue_impact: sig.estimated_revenue_impact ?? 0,
          confidence: sig.confidence ?? "Estimated",
          message: sig.observation,
          source: "manual",
          source_ref: sig.source_ref ?? null,
          client_or_job: sig.client_or_job ?? null,
        }),
      );
    } else if (sig.key.includes("missing_data") || sig.key.includes("unverified")) {
      leaks.push(
        makeLeak(RULES.incomplete_or_unverified_data, input, {
          idSuffix: sig.key,
          severity: sig.severity ?? "low",
          confidence: "Needs Verification",
          message: sig.observation,
        }),
      );
    }
  }

  // If the industry is unconfirmed, flag the data gap so the system is
  // honest about why industry-specific tools and brains are restricted.
  if (!input.industryConfirmed) {
    leaks.push(
      makeLeak(RULES.incomplete_or_unverified_data, input, {
        idSuffix: "industry_unconfirmed",
        message: "Customer industry is not confirmed — industry-specific signals are limited.",
        confidence: "Needs Verification",
        severity: "low",
      }),
    );
  }

  // Suppress duplicates by id.
  const seen = new Set<string>();
  const unique = leaks.filter((l) => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });

  // Touch profileFor so industry label resolution stays consistent if a caller
  // wants to surface the brand label later.
  void profileFor(input.industry);

  return { brain: "general", leaks: unique };
}
