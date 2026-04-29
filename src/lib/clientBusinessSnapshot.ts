// P32 — Client Business Snapshot helpers (admin-only).
//
// Core principle: NEVER fabricate. All synthesized fields must come from
// recorded data. If a field has no source-backed evidence, return null
// (rendered as "Unknown" / "No recorded evidence yet"). The business name
// alone is NOT evidence of what a business does.

import type { IndustryCategory } from "@/lib/priorityEngine/types";

export type IndustryConfidence = "unverified" | "low" | "medium" | "high" | "verified";

export interface SnapshotSource {
  label: string; // e.g. "scorecard", "diagnostic application", "operational profile", "admin note", "customer record"
}

export interface SnapshotField {
  value: string | null;
  sources: SnapshotSource[]; // empty = no evidence
}

export interface ClientBusinessSnapshotDraft {
  what_business_does: SnapshotField;
  products_services: SnapshotField;
  customer_type: SnapshotField;
  revenue_model: SnapshotField;
  operating_model: SnapshotField;
  service_area: SnapshotField;
  industry_evidence: SnapshotField; // what supports the current industry
  missing_for_industry: string[];   // what's still needed to confirm industry
  evidence_strength: "none" | "weak" | "moderate" | "strong";
}

export interface CustomerSnapshotInputs {
  business_name?: string | null;
  business_description?: string | null;
  service_type?: string | null;
  monthly_revenue?: string | null;
  goals?: string | null;
  industry?: IndustryCategory | null;
  industry_confirmed_by_admin?: boolean;
  // Operational profile (admin-curated) fields
  operationalProfile?: {
    biggest_constraint?: string | null;
    accountable_owner_role?: string | null;
    crew_or_job_capacity?: string | null;
    monthly_revenue_usd?: number | null;
    average_ticket_usd?: number | null;
    team_size?: number | null;
    admin_notes?: string | null;
  } | null;
  // Diagnostic intake answers keyed by section_key
  diagnosticAnswers?: Record<string, string | null | undefined>;
  // Latest scorecard run for this customer (joined by email externally)
  latestScorecard?: {
    answers?: unknown;
    rationale?: string | null;
    role?: string | null;
  } | null;
  // Most recent admin notes (top 1-3)
  adminNotes?: string[];
}

function field(value: string | null | undefined, sources: SnapshotSource[]): SnapshotField {
  const v = (value ?? "").trim();
  return { value: v.length > 0 ? v : null, sources: v.length > 0 ? sources : [] };
}

function pickFirst(...candidates: Array<{ value?: string | null; source: string }>): SnapshotField {
  for (const c of candidates) {
    const v = (c.value ?? "").toString().trim();
    if (v.length > 0) return { value: v, sources: [{ label: c.source }] };
  }
  return { value: null, sources: [] };
}

/**
 * Build a snapshot draft strictly from recorded data.
 * Business name is intentionally NOT used to infer what the business does.
 */
export function buildSnapshotDraft(input: CustomerSnapshotInputs): ClientBusinessSnapshotDraft {
  const da = input.diagnosticAnswers ?? {};
  const op = input.operationalProfile ?? null;

  const what_business_does = pickFirst(
    { value: input.business_description, source: "customer record" },
    { value: da.what_we_do ?? da.business_overview ?? da.about, source: "diagnostic application" },
  );

  const products_services = pickFirst(
    { value: input.service_type, source: "customer record" },
    { value: da.products_services ?? da.offerings, source: "diagnostic application" },
  );

  const customer_type = pickFirst(
    { value: da.customer_type ?? da.who_we_serve ?? da.target_customer, source: "diagnostic application" },
  );

  const revenue_model = pickFirst(
    { value: da.revenue_model ?? da.how_we_charge ?? da.pricing_model, source: "diagnostic application" },
    { value: op?.average_ticket_usd ? `Average ticket ~$${op.average_ticket_usd}` : null, source: "operational profile" },
  );

  const operating_model = pickFirst(
    { value: da.operating_model ?? da.delivery_model, source: "diagnostic application" },
    {
      value: op?.crew_or_job_capacity || (op?.team_size ? `Team size: ${op.team_size}` : null),
      source: "operational profile",
    },
  );

  const service_area = pickFirst(
    { value: da.service_area ?? da.locations ?? da.where_we_operate, source: "diagnostic application" },
  );

  // Industry evidence: collect any field that materially supports the assigned industry.
  const evidenceParts: string[] = [];
  const evidenceSources: SnapshotSource[] = [];
  if (what_business_does.value) {
    evidenceParts.push(`Business description recorded`);
    evidenceSources.push(...what_business_does.sources);
  }
  if (products_services.value) {
    evidenceParts.push(`Products/services recorded`);
    evidenceSources.push(...products_services.sources);
  }
  if (op?.biggest_constraint) {
    evidenceParts.push(`Operational profile: "${op.biggest_constraint}"`);
    evidenceSources.push({ label: "operational profile" });
  }
  if (input.adminNotes && input.adminNotes.length > 0) {
    evidenceParts.push(`Admin notes recorded`);
    evidenceSources.push({ label: "admin note" });
  }
  const industry_evidence: SnapshotField = {
    value: evidenceParts.length > 0 ? evidenceParts.join(" • ") : null,
    sources: evidenceSources,
  };

  // Missing-for-industry checklist
  const missing: string[] = [];
  if (!what_business_does.value) missing.push("What the business does");
  if (!products_services.value) missing.push("Products / services offered");
  if (!customer_type.value) missing.push("Customer type served");
  if (!revenue_model.value) missing.push("Revenue model / job or order type");
  if (!operating_model.value) missing.push("Operating model");

  // Evidence strength scoring (independent of business name)
  const recordedCount = [
    what_business_does.value,
    products_services.value,
    customer_type.value,
    revenue_model.value,
    operating_model.value,
    service_area.value,
  ].filter(Boolean).length;

  let strength: ClientBusinessSnapshotDraft["evidence_strength"] = "none";
  if (recordedCount >= 5) strength = "strong";
  else if (recordedCount >= 3) strength = "moderate";
  else if (recordedCount >= 1) strength = "weak";

  return {
    what_business_does,
    products_services,
    customer_type,
    revenue_model,
    operating_model,
    service_area,
    industry_evidence,
    missing_for_industry: missing,
    evidence_strength: strength,
  };
}

/**
 * Decide if the assigned industry is supported by recorded evidence.
 * Returns a warning when assignment lacks supporting data — never claims
 * an industry based on the business name alone.
 */
export function industrySupportAssessment(
  industry: IndustryCategory | null | undefined,
  industryConfirmed: boolean,
  draft: ClientBusinessSnapshotDraft,
): { ok: boolean; warning: string | null } {
  if (!industry) {
    return { ok: false, warning: "No industry assigned. Assignment needs verification before industry-specific tools unlock." };
  }
  if (industry === "other") {
    return { ok: false, warning: 'Industry is "Other". Industry-specific tools and learning are restricted until a real industry is confirmed.' };
  }
  if (!industryConfirmed) {
    return { ok: false, warning: "Industry assignment is unconfirmed. Verify with recorded client data before treating it as fact." };
  }
  if (draft.evidence_strength === "none" || draft.evidence_strength === "weak") {
    return {
      ok: false,
      warning:
        "Industry assignment needs verification. Current assignment is not strongly supported by recorded client data. Business name may suggest a different category; confirm with recorded evidence.",
    };
  }
  return { ok: true, warning: null };
}

export const INDUSTRY_CONFIDENCE_LABELS: Record<IndustryConfidence, string> = {
  unverified: "Unverified",
  low: "Low",
  medium: "Medium",
  high: "High",
  verified: "Verified",
};