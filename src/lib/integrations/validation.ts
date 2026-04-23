/**
 * P12.2.H — Mapping completeness validation.
 *
 * Walks the planning artifacts and surfaces inconsistencies, missing
 * fields, and mismatches between truth role / verification / priority.
 */

import {
  CONNECTOR_PLANS,
  FIELD_MAPPINGS,
  NOISE_EXCLUSIONS,
  VERIFICATION_POLICIES,
  mappingsForConnector,
  truthRoleCounts,
  type ConnectorId,
  type FieldMapping,
  type ConnectorPlan,
} from "./planning";

export type ValidationSeverity = "info" | "warning" | "error";

export interface ValidationIssue {
  connector: ConnectorId | "any";
  severity: ValidationSeverity;
  code: string;
  message: string;
}

function tierExpectsSourceOfTruth(plan: ConnectorPlan): boolean {
  return plan.priority === "tier_1";
}

function hasNoiseExclusion(connector: ConnectorId): boolean {
  return NOISE_EXCLUSIONS.some((n) => n.connector === connector);
}

function hasVerificationPolicyCoverage(connector: ConnectorId): boolean {
  return VERIFICATION_POLICIES.some((v) => v.appliesTo.includes(connector));
}

function fieldIsWellFormed(m: FieldMapping): string[] {
  const problems: string[] = [];
  if (!m.sourceField?.trim()) problems.push("missing sourceField");
  if (!m.destinationModule?.trim()) problems.push("missing destinationModule");
  if (!m.destinationEntity?.trim()) problems.push("missing destinationEntity");
  if (!m.destinationField?.trim()) problems.push("missing destinationField");
  if (!m.truthRole) problems.push("missing truthRole");
  if (!m.verification) problems.push("missing verification");
  if (!m.confidence) problems.push("missing confidence");
  if (m.truthRole === "source_of_truth" && m.verification === "do_not_import") {
    problems.push("source_of_truth cannot be do_not_import");
  }
  if (m.truthRole === "advisory_only" && m.verification === "auto_trust") {
    problems.push("advisory_only should not be auto_trust");
  }
  return problems;
}

export function validatePlanning(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const plan of CONNECTOR_PLANS) {
    const mappings = mappingsForConnector(plan.id);
    const counts = truthRoleCounts(plan.id);

    if (mappings.length === 0) {
      issues.push({
        connector: plan.id,
        severity: "error",
        code: "no_mappings",
        message: `${plan.label} has no field mappings defined.`,
      });
    } else if (mappings.length < 2) {
      issues.push({
        connector: plan.id,
        severity: "warning",
        code: "thin_mapping_coverage",
        message: `${plan.label} has only ${mappings.length} mapped field — coverage looks thin.`,
      });
    }

    if (tierExpectsSourceOfTruth(plan) && counts.source_of_truth === 0) {
      issues.push({
        connector: plan.id,
        severity: "error",
        code: "tier1_no_source_of_truth",
        message: `${plan.label} is Tier 1 but owns no source-of-truth fields.`,
      });
    }

    if (!hasNoiseExclusion(plan.id)) {
      issues.push({
        connector: plan.id,
        severity: "warning",
        code: "missing_noise_exclusions",
        message: `${plan.label} has no explicit do-not-ingest rules — default-deny still applies, but explicit rules document intent.`,
      });
    }

    if (!hasVerificationPolicyCoverage(plan.id)) {
      issues.push({
        connector: plan.id,
        severity: "warning",
        code: "no_verification_policy_class",
        message: `${plan.label} is not referenced by any data-class verification policy.`,
      });
    }

    for (const m of mappings) {
      const problems = fieldIsWellFormed(m);
      if (problems.length > 0) {
        issues.push({
          connector: plan.id,
          severity: "error",
          code: "malformed_field_mapping",
          message: `${plan.label} · ${m.sourceField}: ${problems.join("; ")}`,
        });
      }
    }
  }

  const knownIds = new Set(CONNECTOR_PLANS.map((c) => c.id));
  for (const m of FIELD_MAPPINGS) {
    if (!knownIds.has(m.connector)) {
      issues.push({
        connector: m.connector,
        severity: "error",
        code: "orphan_mapping",
        message: `Mapping for unknown connector "${m.connector}".`,
      });
    }
  }

  return issues;
}

export interface ValidationSummary {
  total: number;
  errors: number;
  warnings: number;
  info: number;
  byConnector: Record<string, number>;
}

export function summarize(issues: ValidationIssue[]): ValidationSummary {
  const byConnector: Record<string, number> = {};
  let errors = 0;
  let warnings = 0;
  let info = 0;
  for (const i of issues) {
    byConnector[i.connector] = (byConnector[i.connector] ?? 0) + 1;
    if (i.severity === "error") errors++;
    else if (i.severity === "warning") warnings++;
    else info++;
  }
  return { total: issues.length, errors, warnings, info, byConnector };
}

export function issuesForConnector(
  issues: ValidationIssue[],
  id: ConnectorId
): ValidationIssue[] {
  return issues.filter((i) => i.connector === id);
}
