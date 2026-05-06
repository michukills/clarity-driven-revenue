/**
 * P85.5 — Cannabis Documentation Velocity™ deterministic helpers + data access.
 *
 * No AI. No compliance/legal/regulatory determinations. Pure date logic
 * over a manually-entered last-audit timestamp. Cannabis industries only.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  CANNABIS_DOC_VELOCITY_THRESHOLD_DAYS,
  isCannabisIndustryKey,
  type CannabisDocVelocityStatus,
  type CannabisEvidenceSourceType,
} from "@/config/cannabisDocumentationVelocity";

export interface CannabisDocVelocityResult {
  status: CannabisDocVelocityStatus;
  severity: "none" | "info" | "high";
  needs_reinspection: boolean;
  days_since_manual_audit: number | null;
  reason:
    | "current"
    | "high_risk_stale"
    | "missing_evidence"
    | "invalid_date"
    | "not_applicable";
}

/**
 * Calendar-day difference (UTC, floor) between `now` and `lastAuditDate`.
 * Returns null for missing or invalid input. Returns a negative number
 * when the audit date is in the future.
 */
export function calculateDaysSinceManualCannabisAudit(
  lastAuditDate: Date | string | null | undefined,
  nowDate: Date = new Date(),
): number | null {
  if (!lastAuditDate) return null;
  const last =
    lastAuditDate instanceof Date ? lastAuditDate : new Date(lastAuditDate);
  if (Number.isNaN(last.getTime())) return null;
  if (Number.isNaN(nowDate.getTime())) return null;
  const MS_PER_DAY = 86_400_000;
  // Normalize to UTC midnight for stable calendar-day math.
  const lastUtc = Date.UTC(
    last.getUTCFullYear(),
    last.getUTCMonth(),
    last.getUTCDate(),
  );
  const nowUtc = Date.UTC(
    nowDate.getUTCFullYear(),
    nowDate.getUTCMonth(),
    nowDate.getUTCDate(),
  );
  return Math.floor((nowUtc - lastUtc) / MS_PER_DAY);
}

export interface DetectCannabisDocVelocityInput {
  lastManualAuditAt: Date | string | null | undefined;
  industryKey: string | null | undefined;
  nowDate?: Date;
}

export function detectCannabisDocumentationVelocity(
  input: DetectCannabisDocVelocityInput,
): CannabisDocVelocityResult {
  if (!isCannabisIndustryKey(input.industryKey)) {
    return {
      status: "not_applicable",
      severity: "none",
      needs_reinspection: false,
      days_since_manual_audit: null,
      reason: "not_applicable",
    };
  }
  const now = input.nowDate ?? new Date();
  const days = calculateDaysSinceManualCannabisAudit(
    input.lastManualAuditAt,
    now,
  );
  if (days === null) {
    return {
      status: "needs_review",
      severity: "info",
      needs_reinspection: false,
      days_since_manual_audit: null,
      reason: "missing_evidence",
    };
  }
  if (days < 0) {
    return {
      status: "invalid_date",
      severity: "info",
      needs_reinspection: false,
      days_since_manual_audit: days,
      reason: "invalid_date",
    };
  }
  if (days > CANNABIS_DOC_VELOCITY_THRESHOLD_DAYS) {
    return {
      status: "high_risk",
      severity: "high",
      needs_reinspection: true,
      days_since_manual_audit: days,
      reason: "high_risk_stale",
    };
  }
  return {
    status: "current",
    severity: "none",
    needs_reinspection: false,
    days_since_manual_audit: days,
    reason: "current",
  };
}

export function getCannabisDocumentationVelocityStatus(
  input: DetectCannabisDocVelocityInput,
): CannabisDocVelocityStatus {
  return detectCannabisDocumentationVelocity(input).status;
}

export function explainCannabisDocumentationVelocityStatus(
  result: CannabisDocVelocityResult,
): string {
  switch (result.reason) {
    case "not_applicable":
      return "Cannabis Documentation Velocity™ does not apply to this industry.";
    case "missing_evidence":
      return "No dated manual seed-to-sale / inventory audit was provided. RGS is requesting evidence before this can be marked Current.";
    case "invalid_date":
      return "The last-audit date is in the future and cannot be accepted. Admin review required.";
    case "high_risk_stale":
      return `The last manual seed-to-sale / inventory audit is ${result.days_since_manual_audit} days old, which is more than 7 days. RGS is flagging this as an operational documentation-readiness risk and marking Needs Re-Inspection.`;
    case "current":
      return `The last manual seed-to-sale / inventory audit is ${result.days_since_manual_audit} days old, within the 7-day operational documentation-readiness window.`;
  }
}

// ---------- Data access ----------

export interface AdminCannabisDocVelocityRow {
  id: string;
  customer_id: string;
  industry_key: string;
  last_manual_audit_at: string | null;
  days_since_manual_audit: number | null;
  velocity_status: CannabisDocVelocityStatus;
  severity: "none" | "info" | "high";
  gear_key: string;
  needs_reinspection: boolean;
  evidence_source_type: CannabisEvidenceSourceType | null;
  evidence_label: string | null;
  evidence_id: string | null;
  client_visible: boolean;
  approved_for_client: boolean;
  admin_notes: string | null;
  client_safe_explanation: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientCannabisDocVelocityRow {
  id: string;
  velocity_status: CannabisDocVelocityStatus;
  severity: "none" | "info" | "high";
  needs_reinspection: boolean;
  last_manual_audit_at: string | null;
  days_since_manual_audit: number | null;
  gear_key: string;
  client_safe_explanation: string | null;
  reviewed_at: string | null;
}

export async function listAdminCannabisDocVelocity(
  customerId: string,
): Promise<AdminCannabisDocVelocityRow[]> {
  const { data, error } = await (supabase as any)
    .from("cannabis_documentation_velocity_reviews")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminCannabisDocVelocityRow[];
}

export async function getClientCannabisDocVelocity(
  customerId: string,
): Promise<ClientCannabisDocVelocityRow[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_cannabis_documentation_velocity",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientCannabisDocVelocityRow[];
}

export interface UpsertCannabisDocVelocityInput {
  customer_id: string;
  industry_key: string;
  last_manual_audit_at: string | null;
  evidence_source_type?: CannabisEvidenceSourceType | null;
  evidence_label?: string | null;
  evidence_id?: string | null;
  admin_notes?: string | null;
  client_safe_explanation?: string | null;
  now?: Date;
}

/**
 * Compute deterministic status from input and insert a fresh review row.
 * (Append-only history — admins create new entries to update.)
 */
export async function createCannabisDocVelocityReview(
  input: UpsertCannabisDocVelocityInput,
) {
  const result = detectCannabisDocumentationVelocity({
    lastManualAuditAt: input.last_manual_audit_at,
    industryKey: input.industry_key,
    nowDate: input.now,
  });
  const row = {
    customer_id: input.customer_id,
    industry_key: input.industry_key,
    last_manual_audit_at: input.last_manual_audit_at,
    days_since_manual_audit: result.days_since_manual_audit,
    velocity_status: result.status,
    severity: result.severity,
    gear_key: "operational_efficiency",
    needs_reinspection: result.needs_reinspection,
    evidence_source_type: input.evidence_source_type ?? null,
    evidence_label: input.evidence_label ?? null,
    evidence_id: input.evidence_id ?? null,
    client_visible: false,
    approved_for_client: false,
    admin_notes: input.admin_notes ?? null,
    client_safe_explanation: input.client_safe_explanation ?? null,
    reviewed_at: new Date().toISOString(),
  };
  const { data, error } = await (supabase as any)
    .from("cannabis_documentation_velocity_reviews")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminCannabisDocVelocityRow;
}

export async function approveCannabisDocVelocityForClient(
  id: string,
  client_safe_explanation?: string,
) {
  const update: Record<string, unknown> = {
    approved_for_client: true,
    client_visible: true,
  };
  if (client_safe_explanation && client_safe_explanation.trim().length > 0) {
    update.client_safe_explanation = client_safe_explanation;
  }
  const { error } = await (supabase as any)
    .from("cannabis_documentation_velocity_reviews")
    .update(update)
    .eq("id", id);
  if (error) throw error;
}

export async function unapproveCannabisDocVelocity(id: string) {
  const { error } = await (supabase as any)
    .from("cannabis_documentation_velocity_reviews")
    .update({ approved_for_client: false, client_visible: false })
    .eq("id", id);
  if (error) throw error;
}
