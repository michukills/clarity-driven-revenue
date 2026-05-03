// P13.DemoEvidence.H.1 — Multi-stage showcase seed (admin-only, idempotent).
//
// Creates / refreshes four named showcase customers that demonstrate how RGS
// OS gets sharper as evidence accumulates over time:
//
//   Atlas Home Services        — early stage, thin evidence
//   Northstar HVAC             — diagnostic stage, medium evidence
//   Summit Roofing & Restoration — implementation stage, strong evidence
//   Keystone Plumbing Co.      — RCC, learning-over-time (8-week timeline)
//
// Rules:
//   - Synthetic data only.
//   - is_demo_account = true on every row; clear lifecycle_notes.
//   - learning_enabled = false and contributes_to_global_learning = false
//     so showcase activity does not pollute global pattern intelligence.
//   - Idempotent: lookup by `*@showcase.rgs.local` email; safe to re-run.
//   - Never touches non-showcase customers.
//   - No AI calls; deterministic payloads only.

import { supabase } from "@/integrations/supabase/client";

const SHOWCASE_SUFFIX = "@showcase.rgs.local";
const SHOWCASE_NOTES = "Synthetic showcase data — RGS OS multi-stage demo (P13.DemoEvidence.H.1).";

/**
 * The `report_recommendations.category` column is constrained to
 * `'stop' | 'start' | 'scale'`. Showcase specs use richer domain tags
 * (evidence, operations, owner_dependence, cash, growth) for narrative
 * clarity; this helper maps any seed input to a constraint-safe value
 * so a future spec edit cannot break the seeder.
 */
const ALLOWED_RECOMMENDATION_CATEGORIES = ["stop", "start", "scale"] as const;
type AllowedRecommendationCategory =
  (typeof ALLOWED_RECOMMENDATION_CATEGORIES)[number];

export function normalizeRecommendationCategory(
  raw: string | null | undefined,
): AllowedRecommendationCategory {
  const v = (raw ?? "").toLowerCase().trim();
  if ((ALLOWED_RECOMMENDATION_CATEGORIES as readonly string[]).includes(v)) {
    return v as AllowedRecommendationCategory;
  }
  switch (v) {
    // Things to stop doing / remove load
    case "owner_dependence":
    case "owner_dependency":
    case "stop_doing":
    case "remove":
      return "stop";
    // Things to start / fix / introduce
    case "evidence":
    case "operations":
    case "cash":
    case "compliance":
    case "process":
    case "fix":
      return "start";
    // Things to scale / amplify / productize
    case "growth":
    case "scale_up":
    case "expand":
    case "productize":
      return "scale";
    default:
      return "start";
  }
}

/**
 * `report_recommendations.origin` is constrained to
 * `'auto_suggested' | 'admin_added' | 'admin_edited'`. The showcase seed
 * historically used "showcase_seed" which violates the check; map any
 * unknown origin to `admin_added` so seeded rows look like admin entries.
 */
const ALLOWED_RECOMMENDATION_ORIGINS = [
  "auto_suggested",
  "admin_added",
  "admin_edited",
] as const;
type AllowedRecommendationOrigin =
  (typeof ALLOWED_RECOMMENDATION_ORIGINS)[number];

export function normalizeRecommendationOrigin(
  raw: string | null | undefined,
): AllowedRecommendationOrigin {
  const v = (raw ?? "").toLowerCase().trim();
  if ((ALLOWED_RECOMMENDATION_ORIGINS as readonly string[]).includes(v)) {
    return v as AllowedRecommendationOrigin;
  }
  return "admin_added";
}

// ---------------- Instrumentation types ----------------

export interface SeedStepLog {
  account: string;            // spec.key or "global"
  business: string;           // business name (or "—")
  table: string;              // public table name
  operation: string;          // insert/update/upsert/delete/select
  ok: boolean;
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  ts: string;
}

export interface SeedFailure {
  account: string;
  business: string;
  table: string;
  operation: string;
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

export interface ShowcaseSeedResult {
  ok: boolean;
  message: string;
  customers: {
    label: string;
    email: string;
    id: string | null;
    stage: string;
  }[];
  counts: {
    scorecards: number;
    interviews: number;
    drafts: number;
    recommendations: number;
    learningEvents: number;
    weeklyCheckins: number;
    qbSummaries: number;
    invoices: number;
    pipelineDeals: number;
    integrations: number;
    tasks: number;
    checklist: number;
  };
  errors: string[];
  stepLog: SeedStepLog[];
  failedStep?: SeedFailure;
  firstError?: SeedFailure;
  partialCounts?: ShowcaseSeedResult["counts"];
  customerCreateResults: { account: string; business: string; id: string | null; error?: string }[];
}

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function isoTimestamp(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString();
}

function pickWeekRange(weeksAgo: number) {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const day = now.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diffToMonday - weeksAgo * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return {
    week_start: fmt(monday),
    week_end: fmt(sunday),
    label: `Week of ${fmt(monday)}`,
  };
}

// ---------------- Customer specs ----------------

interface ShowcaseSpec {
  key: "atlas" | "northstar" | "summit" | "keystone";
  email: string;
  full_name: string;
  business_name: string;
  service_type: string;
  monthly_revenue: string;
  lifecycle_state: string;
  stage: string;
  next_action: string;
  packages: {
    diagnostic?: boolean;
    implementation?: boolean;
    revenue_tracker?: boolean;
    ongoing_support?: boolean;
    addons?: boolean;
    full_bundle?: boolean;
  };
  rcc_subscription_status?: string;
  rcc_paid_through_days_from_now?: number | null;
  implementation_status?: string;
  implementation_started_days_ago?: number | null;
  implementation_ended_days_ago?: number | null;
  diagnostic_status?: string;
  portal_unlocked?: boolean;
  /**
   * P41 — Owner Diagnostic Interview gate. When set to a positive number,
   * the seed marks the interview complete that many days ago AND seeds a
   * diagnostic_tool_sequences row so the personalized tool order renders.
   * Leave null/undefined to keep the gate ACTIVE (atlas/northstar).
   */
  owner_interview_completed_days_ago?: number | null;
}

const SPECS: ShowcaseSpec[] = [
  {
    key: "atlas",
    email: `atlas${SHOWCASE_SUFFIX}`,
    full_name: "Marcus Webb (showcase)",
    business_name: "Atlas Home Services (showcase)",
    service_type: "Home services / handyman",
    monthly_revenue: "$25k–$50k",
    lifecycle_state: "lead",
    stage: "lead",
    next_action: "Collect stronger evidence before drafting recommendations.",
    packages: { diagnostic: true },
    diagnostic_status: "in_progress",
    portal_unlocked: false,
    owner_interview_completed_days_ago: null,
  },
  {
    key: "northstar",
    email: `northstar${SHOWCASE_SUFFIX}`,
    full_name: "Priya Sandoval (showcase)",
    business_name: "Northstar HVAC (showcase)",
    service_type: "HVAC / mechanical contractor",
    monthly_revenue: "$75k–$125k",
    lifecycle_state: "diagnostic",
    // Use enum-valid pipeline_stage value (was "diagnostic_active" — not in enum).
    stage: "diagnostic_in_progress",
    next_action: "Validate three top items in evidence map; chase pending source requests.",
    packages: { diagnostic: true },
    diagnostic_status: "in_progress",
    portal_unlocked: true,
    owner_interview_completed_days_ago: null,
  },
  {
    key: "summit",
    email: `summit${SHOWCASE_SUFFIX}`,
    full_name: "Daniel Okafor (showcase)",
    business_name: "Summit Roofing & Restoration (showcase)",
    service_type: "Roofing & restoration",
    monthly_revenue: "$150k–$250k",
    lifecycle_state: "implementation",
    stage: "implementation_active",
    next_action: "Execute SOP gaps; confirm owner-dependence handoffs.",
    packages: { diagnostic: true, implementation: true },
    implementation_status: "in_progress",
    implementation_started_days_ago: 30,
    diagnostic_status: "complete",
    portal_unlocked: true,
    owner_interview_completed_days_ago: 35,
  },
  {
    key: "keystone",
    email: `keystone${SHOWCASE_SUFFIX}`,
    full_name: "Helena Cruz (showcase)",
    business_name: "Keystone Plumbing Co. (showcase)",
    service_type: "Plumbing / service contractor",
    monthly_revenue: "$200k–$400k",
    lifecycle_state: "ongoing_support",
    stage: "implementation_complete",
    next_action: "Continue weekly RCC; re-evaluate two recommendations after week 8.",
    packages: { diagnostic: true, implementation: true, revenue_tracker: true, ongoing_support: true, full_bundle: true },
    implementation_status: "complete",
    implementation_started_days_ago: 120,
    implementation_ended_days_ago: 60,
    diagnostic_status: "complete",
    rcc_subscription_status: "active",
    rcc_paid_through_days_from_now: 30,
    portal_unlocked: true,
    owner_interview_completed_days_ago: 90,
  },
];

// ---------------- Helpers ----------------

/** Shared instrumentation context passed through every helper. */
interface SeedCtx {
  log: SeedStepLog[];
  firstError?: SeedFailure;
  partial: ShowcaseSeedResult["counts"];
  abortAccount: Set<string>; // accounts whose customer insert failed → skip child writes
}

function nowIso() {
  return new Date().toISOString();
}

function recordStep(
  ctx: SeedCtx,
  spec: ShowcaseSpec | null,
  table: string,
  operation: string,
  error: { code?: string; message?: string; details?: string; hint?: string } | null,
) {
  const entry: SeedStepLog = {
    account: spec?.key ?? "global",
    business: spec?.business_name ?? "—",
    table,
    operation,
    ok: !error,
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    ts: nowIso(),
  };
  ctx.log.push(entry);
  if (error && !ctx.firstError) {
    ctx.firstError = {
      account: entry.account,
      business: entry.business,
      table,
      operation,
      code: error.code,
      message: error.message ?? "Unknown Supabase error",
      details: error.details,
      hint: error.hint,
    };
  }
}

async function ensureCustomer(
  spec: ShowcaseSpec,
  ctx: SeedCtx,
): Promise<{ id: string | null; error?: string }> {
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("email", spec.email)
    .maybeSingle();

  const patch: any = {
    full_name: spec.full_name,
    business_name: spec.business_name,
    service_type: spec.service_type,
    monthly_revenue: spec.monthly_revenue,
    lifecycle_state: spec.lifecycle_state,
    stage: spec.stage,
    next_action: spec.next_action,
    status: "active",
    payment_status: "paid",
    portal_unlocked: spec.portal_unlocked ?? false,
    account_kind: "demo",
    account_kind_notes: "Synthetic showcase account.",
    is_demo_account: true,
    learning_enabled: false,
    contributes_to_global_learning: false,
    learning_exclusion_reason: "Showcase / synthetic demo account",
    lifecycle_notes: SHOWCASE_NOTES,
    package_diagnostic: !!spec.packages.diagnostic,
    package_implementation: !!spec.packages.implementation,
    package_revenue_tracker: !!spec.packages.revenue_tracker,
    package_ongoing_support: !!spec.packages.ongoing_support,
    package_addons: !!spec.packages.addons,
    package_full_bundle: !!spec.packages.full_bundle,
    diagnostic_status: spec.diagnostic_status ?? "not_started",
    implementation_status: spec.implementation_status ?? "none",
    implementation_started_at:
      spec.implementation_started_days_ago != null
        ? isoTimestamp(-spec.implementation_started_days_ago)
        : null,
    implementation_ended_at:
      spec.implementation_ended_days_ago != null
        ? isoDate(-spec.implementation_ended_days_ago)
        : null,
    rcc_subscription_status: spec.rcc_subscription_status ?? "none",
    rcc_paid_through:
      spec.rcc_paid_through_days_from_now != null
        ? isoDate(spec.rcc_paid_through_days_from_now)
        : null,
    owner_interview_completed_at:
      spec.owner_interview_completed_days_ago != null
        ? isoTimestamp(-spec.owner_interview_completed_days_ago)
        : null,
    diagnostic_tools_force_unlocked: false,
    last_activity_at: new Date().toISOString(),
    archived_at: null,
  };

  if (existing?.id) {
    const { error } = await (supabase.from("customers") as any).update(patch).eq("id", existing.id);
    recordStep(ctx, spec, "customers", "update", error ?? null);
    if (error) {
      ctx.abortAccount.add(spec.key);
      return { id: existing.id, error: error.message };
    }
    return { id: existing.id };
  }
  const { data: created, error } = await (supabase.from("customers") as any)
    .insert({ email: spec.email, ...patch })
    .select("id")
    .single();
  recordStep(ctx, spec, "customers", "insert", error ?? null);
  if (error || !created) {
    ctx.abortAccount.add(spec.key);
    return { id: null, error: error?.message || "insert failed (no row returned)" };
  }
  return { id: created.id as string };
}

// Wipe-and-reseed helper for a single table scoped to one customer.
async function resetCustomerTable(
  table: string,
  customerId: string,
  spec: ShowcaseSpec,
  ctx: SeedCtx,
) {
  const { error } = await ((supabase as any).from(table)).delete().eq("customer_id", customerId);
  recordStep(ctx, spec, table, "delete (reset)", error ?? null);
}

// ---------------- Scorecard ----------------

interface ScorecardSpec {
  overall_score_estimate: number;
  overall_band: number;
  overall_confidence: "low" | "medium" | "high";
  rationale: string;
  pillar_results: any[];
  missing_information: string[];
  recommended_focus: string[];
  top_gaps: string[];
}

function scorecardFor(spec: ShowcaseSpec): ScorecardSpec {
  switch (spec.key) {
    case "atlas":
      return {
        overall_score_estimate: 38,
        overall_band: 2,
        overall_confidence: "low",
        rationale: "Owner-reported snapshots only. Insufficient evidence to confidently score most pillars.",
        pillar_results: [
          { pillar: "revenue_clarity", score: 35, confidence: "low" },
          { pillar: "operations", score: 40, confidence: "low" },
          { pillar: "owner_dependence", score: 30, confidence: "low" },
        ],
        missing_information: [
          "No financial source connected.",
          "No invoice/AR data.",
          "No pipeline data.",
          "No SOP documentation provided.",
        ],
        recommended_focus: ["Connect or share accounting summary", "Submit current pipeline snapshot"],
        top_gaps: ["Owner is sole source of truth", "No documented process for quoting"],
      };
    case "northstar":
      return {
        overall_score_estimate: 58,
        overall_band: 3,
        overall_confidence: "medium",
        rationale: "Owner answers + partial QuickBooks summary + early CRM data. Mid-confidence picture.",
        pillar_results: [
          { pillar: "revenue_clarity", score: 62, confidence: "medium" },
          { pillar: "operations", score: 55, confidence: "medium" },
          { pillar: "owner_dependence", score: 50, confidence: "medium" },
          { pillar: "cash_visibility", score: 60, confidence: "medium" },
        ],
        missing_information: ["Payroll detail not provided", "AP aging incomplete"],
        recommended_focus: ["Quote-to-close cadence", "AR follow-up rhythm"],
        top_gaps: ["Inconsistent quote follow-up beyond 5 days", "Owner approves all jobs > $7.5k"],
      };
    case "summit":
      return {
        overall_score_estimate: 72,
        overall_band: 4,
        overall_confidence: "high",
        rationale: "Strong evidence base from accepted diagnostic. Implementation underway.",
        pillar_results: [
          { pillar: "revenue_clarity", score: 78, confidence: "high" },
          { pillar: "operations", score: 70, confidence: "high" },
          { pillar: "owner_dependence", score: 65, confidence: "high" },
          { pillar: "cash_visibility", score: 75, confidence: "high" },
          { pillar: "growth_capacity", score: 70, confidence: "medium" },
        ],
        missing_information: [],
        recommended_focus: ["SOP gap closure", "Owner handoff for estimating"],
        top_gaps: ["Estimating depends on owner", "Two recurring SOP gaps in field-to-billing handoff"],
      };
    case "keystone":
      return {
        overall_score_estimate: 81,
        overall_band: 4,
        overall_confidence: "high",
        rationale: "8 weeks of RCC evidence + QuickBooks summaries + accepted recommendations.",
        pillar_results: [
          { pillar: "revenue_clarity", score: 84, confidence: "high" },
          { pillar: "operations", score: 80, confidence: "high" },
          { pillar: "owner_dependence", score: 76, confidence: "high" },
          { pillar: "cash_visibility", score: 86, confidence: "high" },
          { pillar: "growth_capacity", score: 78, confidence: "high" },
        ],
        missing_information: [],
        recommended_focus: ["Maintain weekly cadence", "Re-evaluate Q4 capacity assumption"],
        top_gaps: ["Owner still primary on enterprise renewals"],
      };
  }
}

async function ensureScorecardRun(
  spec: ShowcaseSpec,
  ctx: SeedCtx,
): Promise<{ id: string | null; created: boolean }> {
  const { data: existing } = await (supabase.from("scorecard_runs") as any)
    .select("id")
    .eq("email", spec.email)
    .maybeSingle();
  const sc = scorecardFor(spec);
  const payload: any = {
    first_name: spec.full_name.split(" ")[0],
    last_name: spec.full_name.split(" ").slice(1).join(" ") || "Showcase",
    email: spec.email,
    business_name: spec.business_name,
    role: "Owner",
    answers: [{ qid: "synthetic", value: "showcase" }],
    rubric_version: "v1",
    pillar_results: sc.pillar_results,
    overall_score_estimate: sc.overall_score_estimate,
    overall_score_low: Math.max(0, sc.overall_score_estimate - 6),
    overall_score_high: Math.min(100, sc.overall_score_estimate + 6),
    overall_band: sc.overall_band,
    overall_confidence: sc.overall_confidence,
    rationale: sc.rationale,
    missing_information: sc.missing_information,
    recommended_focus: sc.recommended_focus,
    top_gaps: sc.top_gaps,
    ai_status: "not_run",
    status: "new",
    source_page: "/admin/settings (showcase seed)",
  };
  if (existing?.id) {
    const { error } = await (supabase.from("scorecard_runs") as any).update(payload).eq("id", existing.id);
    recordStep(ctx, spec, "scorecard_runs", "update", error ?? null);
    return { id: existing.id, created: false };
  }
  const { data, error } = await (supabase.from("scorecard_runs") as any)
    .insert(payload).select("id").single();
  recordStep(ctx, spec, "scorecard_runs", "insert", error ?? null);
  if (error || !data) return { id: null, created: false };
  return { id: data.id as string, created: true };
}

// ---------------- Diagnostic interview ----------------

function interviewFor(spec: ShowcaseSpec) {
  switch (spec.key) {
    case "atlas":
      return {
        confidence: "low",
        answers: { revenue_clarity: "I think we do okay.", owner_dependence: "I do most things." },
        evidence_map: [
          { claim: "Revenue is steady", evidence: "owner-statement-only", confidence: "low" },
        ],
        missing_information: [
          "No accounting summary",
          "No invoice or AR data",
          "No pipeline snapshot",
          "No SOP examples",
          "No payroll detail",
        ],
        validation_checklist: [
          { item: "Request accounting summary", status: "open" },
          { item: "Request CRM/pipeline export", status: "open" },
        ],
      };
    case "northstar":
      return {
        confidence: "medium",
        answers: {
          revenue_clarity: "Repeat clients drive ~55% of revenue based on QB summary.",
          owner_dependence: "Owner approves jobs > $7.5k, slows mid-week.",
          operations: "Field-to-billing handoff is manual.",
          cash: "AR aging > 60 days is climbing.",
        },
        evidence_map: [
          { claim: "Repeat-client revenue ~55%", evidence: "quickbooks_summary_q3", confidence: "medium" },
          { claim: "Quote follow-up slipping past 5 days", evidence: "crm_export", confidence: "medium" },
          { claim: "Owner is bottleneck on jobs > $7.5k", evidence: "owner-statement", confidence: "low" },
        ],
        missing_information: [
          "Payroll source not connected",
          "AP aging incomplete",
          "No documented quote SOP",
        ],
        validation_checklist: [
          { item: "Confirm 5-day quote follow-up gap", status: "in_progress" },
          { item: "Confirm owner-approval threshold against job ledger", status: "open" },
          { item: "Validate AR > 60 trend over 3 months", status: "in_progress" },
        ],
      };
    case "summit":
      return {
        confidence: "high",
        answers: {
          revenue_clarity: "Insurance work is 60% of revenue, restoration projects 25%.",
          owner_dependence: "Owner owns estimating; PMs can run jobs solo otherwise.",
          operations: "Two recurring handoff gaps documented.",
          cash: "AR aging healthy; weekly cash visible.",
        },
        evidence_map: [
          { claim: "Insurance work 60% of revenue", evidence: "qb_summary + invoice_detail", confidence: "high" },
          { claim: "Owner owns estimating", evidence: "interview + sop_audit", confidence: "high" },
          { claim: "Field-to-billing gap recurring", evidence: "incident_log + sop_audit", confidence: "high" },
        ],
        missing_information: [],
        validation_checklist: [
          { item: "Verify insurance-mix %", status: "complete" },
          { item: "Verify handoff gap frequency", status: "complete" },
        ],
      };
    case "keystone":
      return {
        confidence: "high",
        answers: {
          revenue_clarity: "Service contracts ~48%, project work ~38%, emergency ~14%.",
          owner_dependence: "Owner involved only on enterprise renewals now.",
          operations: "SOPs documented for top 6 service types.",
          cash: "Weekly cash visibility steady; AR > 60 cut by 22% over 8 weeks.",
        },
        evidence_map: [
          { claim: "Service contracts ~48% of revenue", evidence: "qb_period_summaries x3", confidence: "high" },
          { claim: "AR > 60 down 22%", evidence: "weekly_checkins x8 + qb_summaries", confidence: "high" },
          { claim: "Owner involvement reduced", evidence: "weekly_checkins + accepted recommendation", confidence: "high" },
        ],
        missing_information: [],
        validation_checklist: [
          { item: "Verify enterprise renewal owner-load", status: "complete" },
          { item: "Verify SOP coverage of top 6 service types", status: "complete" },
        ],
      };
  }
}

async function ensureInterview(
  spec: ShowcaseSpec,
  customerId: string,
  ctx: SeedCtx,
): Promise<{ id: string | null }> {
  const i = interviewFor(spec);
  const existing = await (supabase.from("diagnostic_interview_runs") as any)
    .select("id")
    .eq("customer_id", customerId)
    .maybeSingle();
  const payload: any = {
    customer_id: customerId,
    source: "admin",
    lead_name: spec.full_name,
    lead_email: spec.email,
    lead_business: spec.business_name,
    answers: i.answers,
    evidence_map: i.evidence_map,
    system_dependency_map: [],
    validation_checklist: i.validation_checklist,
    admin_brief: { summary: `${spec.business_name} showcase interview (${spec.key}).` },
    missing_information: i.missing_information,
    confidence: i.confidence,
    ai_status: "not_run",
    status: "reviewed",
  };
  if (existing.data?.id) {
    const { error } = await (supabase.from("diagnostic_interview_runs") as any).update(payload).eq("id", existing.data.id);
    recordStep(ctx, spec, "diagnostic_interview_runs", "update", error ?? null);
    return { id: existing.data.id };
  }
  const { data, error } = await (supabase.from("diagnostic_interview_runs") as any)
    .insert(payload).select("id").single();
  recordStep(ctx, spec, "diagnostic_interview_runs", "insert", error ?? null);
  if (error || !data) return { id: null };
  return { id: data.id as string };
}

// ---------------- Report drafts + recommendations + learning events ----------------

/**
 * Full DraftRecommendation shape expected by the truth-test rubric:
 *   id, title, detail, evidence_refs, inference, priority, client_safe.
 * `detail` follows Cause → Evidence → Impact → Action, with numeric hints
 * so the rubric's QUANT_HINT_REGEX + CEIA detector both register.
 * `evidence_refs` reference EvidenceItem.source values populated in the
 * draft's evidence_snapshot.items list.
 */
interface FullSeedRecommendation {
  id: string;
  title: string;
  detail: string;
  evidence_refs: string[];
  inference: boolean;
  priority: "low" | "medium" | "high";
  client_safe: boolean;
  // seed-only metadata (not persisted in jsonb, used to drive
  // report_recommendations table + learning events)
  category: string;
  explanation: string;
  included: boolean;
  rejected?: boolean;
}

/** Evidence_snapshot.items shape — mirrors EvidenceItem in @/lib/reports/types. */
interface SeedEvidenceItem {
  source: string;
  module: string;
  title: string;
  detail?: string;
  client_safe: boolean;
  is_demo?: boolean;
  is_synced?: boolean;
  is_imported?: boolean;
  is_admin_entered?: boolean;
}

interface SeedDraftSection {
  key: string;
  label: string;
  body: string;
  client_safe: boolean;
}

interface DraftSpec {
  title: string;
  status: "draft" | "needs_review" | "approved";
  confidence: "low" | "medium" | "high";
  client_safe: boolean;
  daysAgo: number;
  recommendations: FullSeedRecommendation[];
  /** Truth-test missing_information uses {area, what_is_missing, why_it_matters}. */
  missing_information: { area: string; what_is_missing: string; why_it_matters: string }[];
  risks: string[];
  draft_sections: SeedDraftSection[];
  evidence_items: SeedEvidenceItem[];
  evidence_notes: string[];
}

/**
 * NOTE on demo + client_safe:
 * The truth-test rubric penalizes (is_demo_account && client_safe) because
 * showcase content must never be presented as real client proof. Showcase
 * drafts therefore set client_safe=false. They are still useful demo
 * artifacts for admin grading and demo flows; the admin UI continues to
 * surface them via the demo badge on the customer record.
 */
function draftsFor(spec: ShowcaseSpec): DraftSpec[] {
  switch (spec.key) {
    case "atlas":
      return [{
        title: "Atlas Home Services — Initial Diagnostic Draft",
        status: "draft",
        confidence: "low",
        client_safe: false,
        daysAgo: 2,
        missing_information: [
          { area: "Accounting", what_is_missing: "No accounting summary provided", why_it_matters: "Cannot validate revenue, margin or AR claims without a tracked source." },
          { area: "Invoicing / AR", what_is_missing: "No invoice or AR aging data", why_it_matters: "Cash visibility and collection risk cannot be assessed." },
          { area: "Pipeline", what_is_missing: "No pipeline snapshot", why_it_matters: "Quote-to-close behavior is unknown." },
          { area: "Operations", what_is_missing: "No SOP examples", why_it_matters: "Owner-dependence cannot be quantified beyond owner self-report." },
        ],
        risks: ["High owner-dependence inferred from interview only", "Revenue claims cannot be validated against tracked source"],
        recommendations: [
          {
            id: "atlas-rec-1",
            category: "evidence", priority: "high", inference: false, client_safe: false, included: true,
            title: "Connect or share accounting summary (QuickBooks export acceptable)",
            explanation: "Required before any reliable revenue or margin finding.",
            detail:
              "Cause: Revenue and margin findings are blocked because Atlas has shared owner-statement answers only — no tracked financial source. " +
              "Evidence: 0 of 3 expected accounting artifacts provided per intake checklist (interview answer 'I think we do okay'). " +
              "Impact: Cannot be quantified yet — revenue and margin findings are blocked until 1 month of QuickBooks summary or P&L export is in hand. " +
              "Action: Owner uploads last 90 days of P&L or connects QuickBooks within 7 days; RGS reviews on day 8.",
            evidence_refs: ["interview", "intake_checklist"],
          },
          {
            id: "atlas-rec-2",
            category: "evidence", priority: "medium", inference: false, client_safe: false, included: true,
            title: "Submit current pipeline snapshot (CSV or screenshot acceptable)",
            explanation: "Needed to evaluate quote-to-close behavior.",
            detail:
              "Cause: Quote-to-close behavior cannot be measured because no pipeline data is on file — it is owner-asserted only. " +
              "Evidence: Intake question 'pipeline snapshot' returned blank in interview run. " +
              "Impact: Not yet quantified — without 20+ open deals visible, follow-up cadence cannot be measured. " +
              "Action: Owner exports current open deals (CSV) within 5 days; RGS computes baseline follow-up gap.",
            evidence_refs: ["interview"],
          },
        ],
        draft_sections: [
          { key: "executive_summary", label: "Executive summary", client_safe: false,
            body: "Atlas Home Services is at the start of the diagnostic. Evidence is owner-statement only. RGS will not draft strategic findings until a tracked source is connected. Confidence is low by design." },
          { key: "key_findings", label: "Key findings", client_safe: false,
            body: "No findings can be confirmed yet. The interview surfaces possible owner-dependence and possible quote follow-up gaps but neither is supported by tracked data." },
          { key: "evidence_and_missing", label: "Evidence and missing data", client_safe: false,
            body: "Sources reviewed: 1 owner interview. Sources missing: accounting summary, invoice / AR data, pipeline snapshot, SOP examples. Until at least one tracked source is in hand, the rubric correctly holds Atlas at not-ready." },
          { key: "next_steps", label: "Recommended next steps", client_safe: false,
            body: "1) Connect or share accounting summary within 7 days. 2) Submit pipeline snapshot within 5 days. 3) Re-score after both arrive." },
        ],
        evidence_items: [
          { source: "interview", module: "Diagnostic interview", title: "Owner intake interview", detail: "Owner-reported answers only; no tracked source attached.", client_safe: false, is_demo: true, is_admin_entered: true },
          { source: "intake_checklist", module: "Intake checklist", title: "Source-readiness checklist", detail: "0/4 tracked sources provided.", client_safe: false, is_demo: true, is_admin_entered: true },
        ],
        evidence_notes: ["No tracked financial source connected — confidence held at low.", "No pipeline export — quote-to-close cannot be measured yet."],
      }];

    case "northstar":
      return [{
        title: "Northstar HVAC — Diagnostic Draft (medium confidence)",
        status: "needs_review",
        confidence: "medium",
        client_safe: false,
        daysAgo: 5,
        missing_information: [
          { area: "Payroll", what_is_missing: "Payroll source not connected", why_it_matters: "Labor margin and overtime exposure cannot be measured." },
          { area: "AP", what_is_missing: "AP aging incomplete", why_it_matters: "Cash obligations next 30 days cannot be triangulated." },
        ],
        risks: [
          "Owner-approval bottleneck on jobs > $7.5k is owner-stated; needs ledger validation",
          "AR > 60 days trending up across last 2 QuickBooks summaries — risk of cash strain in 30–60 days",
        ],
        recommendations: [
          {
            id: "ns-rec-1",
            category: "operations", priority: "high", inference: false, client_safe: false, included: true,
            title: "Tighten quote follow-up to ≤ 3 business days",
            explanation: "Pipeline shows quote-to-close slipping past 5 days.",
            detail:
              "Cause: Quote follow-up is slipping because CRM stage history shows 42% of quoted deals have no logged follow-up after day 5. " +
              "Evidence: HubSpot pipeline export (24 deals quoted in last 90 days) + interview confirmation. " +
              "Impact: Estimated $8,000–$12,000/month in delayed or lost revenue at current close rate. " +
              "Action: Office manager owns a 3-business-day follow-up cadence; review weekly with the owner for 4 weeks.",
            evidence_refs: ["quickbooks_summary_q3", "crm_export", "interview"],
          },
          {
            id: "ns-rec-2",
            category: "owner_dependence", priority: "medium", inference: true, client_safe: false, included: true,
            title: "Raise owner-approval threshold from $7,500 to $15,000",
            explanation: "Interview + invoice ledger suggest high frequency of small approvals consuming owner time.",
            detail:
              "Cause: Owner is consumed by small approvals because every job over $7,500 requires owner sign-off; invoice ledger shows roughly 18 such approvals per month. " +
              "Evidence: Interview answer + QuickBooks invoice list filtered $7.5k–$15k. " +
              "Impact: Roughly 6–9 owner hours per week consumed in approvals that PMs could handle. " +
              "Action: Pilot a $15,000 threshold for 4 weeks; PMs sign off below; review variance weekly.",
            evidence_refs: ["quickbooks_summary_q3", "interview"],
          },
          {
            id: "ns-rec-3",
            category: "cash", priority: "high", inference: false, client_safe: false, included: true,
            title: "Open weekly AR-aging review with PM",
            explanation: "AR > 60 days trending up across recent QuickBooks summaries.",
            detail:
              "Cause: AR > 60 days has climbed from 9% to 13% of receivables because no one owns weekly AR follow-up, per the last 2 QuickBooks period summaries. " +
              "Evidence: QuickBooks period summaries (Q3 + early Q4). " +
              "Impact: At current trajectory, exposure could exceed $22,000 in 30 days if untouched. " +
              "Action: PM runs a weekly 20-minute AR review with the office manager; escalate any invoice over 45 days.",
            evidence_refs: ["quickbooks_summary_q3"],
          },
        ],
        draft_sections: [
          { key: "executive_summary", label: "Executive summary", client_safe: false,
            body: "Northstar HVAC has partial tracked evidence (QuickBooks summary + CRM export) plus a structured interview. The picture is medium confidence: a quote-follow-up gap, an owner-approval bottleneck, and an AR > 60 trend are visible. Two are tracked-data backed; one is owner-stated and pending validation." },
          { key: "key_findings", label: "Key findings", client_safe: false,
            body: "1) 42% of quoted deals have no follow-up after day 5 (CRM). 2) AR > 60 days has risen from 9% to 13% in 60 days (QuickBooks). 3) Owner approves jobs > $7,500 roughly 18 times per month (owner-stated, partially confirmed by invoice list)." },
          { key: "evidence_and_missing", label: "Evidence and missing data", client_safe: false,
            body: "Evidence: QuickBooks period summaries, HubSpot CRM export, structured interview. Missing: payroll source (labor margin), AP aging (30-day cash). Confidence is held at medium until payroll and AP arrive." },
          { key: "next_steps", label: "Recommended next steps", client_safe: false,
            body: "Validate the 5-day follow-up gap with PM, pilot a $15,000 owner-approval threshold for 4 weeks, and start a weekly AR review with the PM. Re-score after payroll and AP are connected." },
        ],
        evidence_items: [
          { source: "quickbooks_summary_q3", module: "QuickBooks", title: "Q3 period summary", detail: "Revenue, AR aging buckets, and invoice list — last 60 days.", client_safe: false, is_demo: true, is_synced: true },
          { source: "crm_export", module: "HubSpot", title: "Pipeline export (24 quoted deals)", detail: "Stage history shows follow-up gaps past day 5.", client_safe: false, is_demo: true, is_imported: true },
          { source: "interview", module: "Diagnostic interview", title: "Owner interview", detail: "Owner answers on quote, approval, and AR.", client_safe: false, is_demo: true, is_admin_entered: true },
        ],
        evidence_notes: ["Payroll source not connected — labor margin held back.", "AP aging incomplete — 30-day cash picture is partial."],
      }];

    case "summit":
      return [{
        title: "Summit Roofing & Restoration — Diagnostic Report",
        status: "approved",
        confidence: "high",
        client_safe: false,
        daysAgo: 28,
        missing_information: [
          { area: "Subcontractor payments", what_is_missing: "Subcontractor 1099 payment cadence not yet pulled", why_it_matters: "Helps confirm seasonal cash exposure." },
        ],
        risks: [
          "Estimating remains owner-dependent until SOP is signed off",
          "Insurance restoration intake is ad-hoc — risk of margin variance per claim",
        ],
        recommendations: [
          {
            id: "su-rec-1",
            category: "operations", priority: "high", inference: false, client_safe: false, included: true,
            title: "Close two recurring field-to-billing handoff gaps",
            explanation: "Documented in SOP audit and incident log.",
            detail:
              "Cause: Field-to-billing handoff is breaking on 22% of jobs because change-orders are captured on paper, not in the job ticket. " +
              "Evidence: SOP audit (12 jobs reviewed) + incident log (28 logged handoff incidents in 90 days) + QuickBooks invoice variance. " +
              "Impact: Estimated $14,000/month in delayed billing and roughly 11 hours/week of admin rework. " +
              "Action: Adopt a single change-order field in the job ticket; PM trains crew leads in 2 weeks; admin runs a 5-minute close-out check daily.",
            evidence_refs: ["qb_summary", "invoice_detail", "sop_audit", "incident_log"],
          },
          {
            id: "su-rec-2",
            category: "owner_dependence", priority: "high", inference: false, client_safe: false, included: true,
            title: "Document estimating SOP and pilot with senior PM",
            explanation: "Owner currently owns estimating end-to-end.",
            detail:
              "Cause: Estimating is bottlenecked because the owner is the only estimator; senior PMs report blocking on 6+ estimates per week waiting for owner availability. " +
              "Evidence: SOP audit, owner calendar review, interview. " +
              "Impact: Roughly 8–10 hours/week of owner time and 3–5 day estimate turnaround. " +
              "Action: Document the estimating playbook in 14 days; pilot with senior PM on 5 jobs over 30 days; review variance with owner weekly.",
            evidence_refs: ["sop_audit", "interview"],
          },
          {
            id: "su-rec-3",
            category: "growth", priority: "medium", inference: true, client_safe: false, included: true,
            title: "Productize insurance restoration intake (single-page intake form + SLA)",
            explanation: "Insurance work is 60% of revenue; intake is ad-hoc.",
            detail:
              "Cause: Insurance restoration margin varies widely because, although it is 60% of revenue (QuickBooks invoice detail), each adjuster onboards differently — intake is ad-hoc. " +
              "Evidence: QuickBooks invoice detail + SOP audit (no documented intake). " +
              "Impact: Margin variance per claim is roughly 8 percentage points wider than non-insurance work; consistent intake should narrow the gap. " +
              "Action: Build a one-page intake form + 48-hour adjuster SLA; pilot with the top 3 carriers for 60 days.",
            evidence_refs: ["qb_summary", "invoice_detail", "sop_audit"],
          },
        ],
        draft_sections: [
          { key: "executive_summary", label: "Executive summary", client_safe: false,
            body: "Summit Roofing has a strong evidence base — QuickBooks period summaries, invoice detail, SOP audit, and a 90-day incident log. Three high-leverage moves are identified, prioritized, and tied to specific systems and people. Confidence is high and the implementation work-stream is active." },
          { key: "key_findings", label: "Key findings", client_safe: false,
            body: "1) Field-to-billing handoff breaking on 22% of jobs (28 incidents / 90 days). 2) Estimating is fully owner-dependent — 8–10 owner hours/week. 3) Insurance restoration is 60% of revenue with 8-point margin variance per claim because intake is ad-hoc." },
          { key: "evidence_and_missing", label: "Evidence and missing data", client_safe: false,
            body: "Evidence: QuickBooks summary, invoice detail, SOP audit, incident log, owner interview. Missing: subcontractor 1099 payment cadence (would refine seasonal cash exposure)." },
          { key: "next_steps", label: "Recommended next steps", client_safe: false,
            body: "Priority order: (1) close field-to-billing gap with the change-order field, (2) document estimating SOP and pilot with senior PM, (3) productize insurance intake with the top 3 carriers. Each finding has an owner, a 14–60 day window, and a measurable variance to track." },
        ],
        evidence_items: [
          { source: "qb_summary", module: "QuickBooks", title: "Period summary (Q3 + early Q4)", detail: "Revenue mix, invoice variance, AR aging.", client_safe: false, is_demo: true, is_synced: true },
          { source: "invoice_detail", module: "QuickBooks", title: "Invoice detail (line items)", detail: "Used to compute insurance vs non-insurance margin variance.", client_safe: false, is_demo: true, is_synced: true },
          { source: "sop_audit", module: "Operations", title: "SOP audit (12 jobs)", detail: "Documented two recurring handoff gaps.", client_safe: false, is_demo: true, is_admin_entered: true },
          { source: "incident_log", module: "Operations", title: "Incident log (90 days)", detail: "28 field-to-billing handoff incidents.", client_safe: false, is_demo: true, is_imported: true },
          { source: "interview", module: "Diagnostic interview", title: "Owner interview", detail: "Owner answers on estimating workload.", client_safe: false, is_demo: true, is_admin_entered: true },
        ],
        evidence_notes: ["Subcontractor 1099 payment cadence not yet pulled — would sharpen the seasonal cash picture but does not block findings."],
      }];

    case "keystone":
      return [
        {
          title: "Keystone Plumbing — Week 1 Snapshot",
          status: "approved",
          confidence: "medium",
          client_safe: false,
          daysAgo: 56,
          missing_information: [
            { area: "AP", what_is_missing: "AP aging not yet imported", why_it_matters: "Improves 30-day cash obligation accuracy." },
          ],
          risks: [
            "Owner involved on every enterprise renewal — single point of failure",
            "AR > 60 days at 14% of receivables — collection risk",
          ],
          recommendations: [
            {
              id: "ks-w1-rec-1",
              category: "owner_dependence", priority: "high", inference: false, client_safe: false, included: true,
              title: "Delegate enterprise renewals to senior account lead (4-week pilot)",
              explanation: "Owner currently single point on every enterprise renewal.",
              detail:
                "Cause: Owner runs every enterprise renewal because no other staff has been formally authorized. " +
                "Evidence: Week-1 check-in (62 owner hours, 'owner approves all enterprise renewals') + QuickBooks customer list (12 enterprise accounts). " +
                "Impact: Roughly 14 owner hours/week consumed; renewals slow if the owner is unavailable. " +
                "Action: Authorize senior account lead to own renewals under $50,000 for 4 weeks; weekly review with owner; track owner-hours delta.",
              evidence_refs: ["weekly_checkin_w1", "qb_summary_q3"],
            },
            {
              id: "ks-w1-rec-2",
              category: "cash", priority: "high", inference: false, client_safe: false, included: true,
              title: "Open weekly AR review with billing lead",
              explanation: "AR > 60 days at 14% of receivables and creeping.",
              detail:
                "Cause: AR > 60 days sits at 14% of receivables — above the 8% target — because no one owns weekly AR follow-up. " +
                "Evidence: QuickBooks Q3 summary + week-1 AR aging snapshot. " +
                "Impact: Roughly $24,000 currently aged past 60 days; trajectory worsens without weekly cadence. " +
                "Action: Billing lead runs a weekly 20-minute AR review; escalate any invoice past 45 days; target AR > 60 below 10% by week 8.",
              evidence_refs: ["weekly_checkin_w1", "qb_summary_q3"],
            },
            {
              id: "ks-w1-rec-3",
              category: "operations", priority: "medium", inference: true, client_safe: false, included: false,
              title: "Productize emergency dispatch SOP",
              explanation: "Emergency mix is 14% of revenue but procedurally undocumented.",
              detail:
                "Cause: Emergency dispatch lacks an SOP — quality varies by tech on-call. " +
                "Evidence: Owner interview + week-1 mix (14% emergency revenue). " +
                "Impact: Cannot be quantified yet — would need 30 days of dispatch logs to size. " +
                "Action: Defer until renewal-delegation pilot is reviewed at week 4.",
              evidence_refs: ["weekly_checkin_w1"],
            },
          ],
          draft_sections: [
            { key: "executive_summary", label: "Executive summary", client_safe: false,
              body: "Week 1 baseline. AR > 60 days at 14% of receivables (~$24,000); owner consumed by every enterprise renewal (62 owner hours)." },
            { key: "key_findings", label: "Key findings", client_safe: false,
              body: "1) AR > 60 days = 14% (target 8%). 2) Owner runs every renewal across 12 enterprise accounts. 3) Emergency mix 14% but undocumented." },
            { key: "evidence_and_missing", label: "Evidence and missing data", client_safe: false,
              body: "Evidence: weekly_checkin_w1 + QuickBooks Q3 summary. Missing: AP aging." },
            { key: "next_steps", label: "Recommended next steps", client_safe: false,
              body: "Start renewal-delegation pilot and weekly AR review; defer emergency-dispatch SOP to week 4." },
          ],
          evidence_items: [
            { source: "weekly_checkin_w1", module: "Weekly check-in", title: "Week 1 baseline", detail: "62 owner hours; AR > 60 = 14%.", client_safe: false, is_demo: true, is_admin_entered: true },
            { source: "qb_summary_q3", module: "QuickBooks", title: "Q3 period summary", detail: "Revenue, AR aging buckets.", client_safe: false, is_demo: true, is_synced: true },
          ],
          evidence_notes: ["AP aging not yet imported — 30-day cash picture is partial."],
        },
        {
          title: "Keystone Plumbing — Week 4 Update",
          status: "approved",
          confidence: "high",
          client_safe: false,
          daysAgo: 28,
          missing_information: [],
          risks: [
            "Renewal delegation pilot mid-stream — outcome still pending at week 4",
          ],
          recommendations: [
            {
              id: "ks-w4-rec-1",
              category: "owner_dependence", priority: "high", inference: false, client_safe: false, included: true,
              title: "Continue enterprise renewal delegation through week 8",
              explanation: "Pilot showing reduced owner load; continue and measure.",
              detail:
                "Cause: Owner load on renewals is dropping because the delegation pilot is working — the owner is no longer the single point on under-$50,000 renewals. " +
                "Evidence: Weekly check-ins W1–W4 (owner hours dropped from 62 to 56) + QuickBooks renewal log. " +
                "Impact: Roughly 6 owner hours/week recovered so far; 14% reduction in owner renewal load. " +
                "Action: Continue pilot through week 8; measure renewal cycle time and owner hours each week.",
              evidence_refs: ["weekly_checkin_w1", "weekly_checkin_w4", "qb_summary_q3"],
            },
            {
              id: "ks-w4-rec-2",
              category: "cash", priority: "high", inference: false, client_safe: false, included: true,
              title: "Maintain weekly AR review — early signal is positive",
              explanation: "AR > 60 days dropped 11% in 4 weeks.",
              detail:
                "Cause: AR > 60 days has dropped from 14% to 12.5% of receivables in 4 weeks (an 11% relative reduction) because the weekly AR review cadence is taking hold. " +
                "Evidence: Weekly check-ins W1–W4 + QuickBooks summaries. " +
                "Impact: Roughly $3,000 of receivables moved out of the > 60 bucket; trajectory consistent with the 8% target by week 8. " +
                "Action: Continue the weekly 20-minute AR review; tighten the 45-day escalation rule.",
              evidence_refs: ["weekly_checkin_w4", "qb_summary_q3"],
            },
            {
              id: "ks-w4-rec-3",
              category: "operations", priority: "low", inference: true, client_safe: false, included: false, rejected: true,
              title: "Drop emergency-dispatch SOP from this cycle",
              explanation: "Lower priority than renewal delegation; revisit later.",
              detail:
                "Cause: Emergency-dispatch SOP is being deprioritized because the renewal-delegation pilot is generating more measurable owner-hours impact for this cycle. " +
                "Evidence: Weeks 1–4 owner-hours delta (62 → 56) vs. zero measured impact for unfinished SOP. " +
                "Impact: Estimated 0–2 hours/week opportunity if pursued now versus 6+ hours from continuing delegation. " +
                "Action: Reject for this cycle; revisit at week 12 if emergency mix grows above 18%.",
              evidence_refs: ["weekly_checkin_w1", "weekly_checkin_w4"],
            },
          ],
          draft_sections: [
            { key: "executive_summary", label: "Executive summary", client_safe: false,
              body: "Week 4 update. Renewal-delegation pilot is working — owner hours down from 62 to 56. AR > 60 days dropped 11% (14% → 12.5%). One earlier recommendation (emergency-dispatch SOP) rejected because evidence reprioritized it." },
            { key: "key_findings", label: "Key findings", client_safe: false,
              body: "Owner hours: 62 → 56 (10% drop). AR > 60: 14% → 12.5% (11% drop). Renewal cycle time improving. No new risks surfaced." },
            { key: "evidence_and_missing", label: "Evidence and missing data", client_safe: false,
              body: "Evidence: weekly_checkin W1–W4 + QuickBooks Q3 summary. Nothing critical missing for this snapshot." },
            { key: "next_steps", label: "Recommended next steps", client_safe: false,
              body: "Continue both pilots through week 8. Re-evaluate at week 8 outcome report." },
          ],
          evidence_items: [
            { source: "weekly_checkin_w1", module: "Weekly check-in", title: "Week 1 baseline", client_safe: false, is_demo: true, is_admin_entered: true },
            { source: "weekly_checkin_w4", module: "Weekly check-in", title: "Week 4 update", detail: "Owner hours 56; AR > 60 = 12.5%.", client_safe: false, is_demo: true, is_admin_entered: true },
            { source: "qb_summary_q3", module: "QuickBooks", title: "Q3 period summary", client_safe: false, is_demo: true, is_synced: true },
          ],
          evidence_notes: ["Emergency-dispatch SOP rejected for this cycle based on week-4 evidence comparison."],
        },
        {
          title: "Keystone Plumbing — Week 8 Outcome Report",
          status: "approved",
          confidence: "high",
          client_safe: false,
          daysAgo: 1,
          missing_information: [],
          risks: [
            "Owner belief 'no slack at 90% utilization' contradicted by data showing 72% — risks both under-investment and over-hire if not reviewed",
          ],
          recommendations: [
            {
              id: "ks-w8-rec-1",
              category: "owner_dependence", priority: "high", inference: false, client_safe: false, included: true,
              title: "Codify renewal-delegation SOP — pilot succeeded",
              explanation: "Owner load on renewals reduced ~60%; codify the pattern.",
              detail:
                "Cause: Owner renewal load dropped roughly 60% (from 62 to 48 owner hours) without losing any of the 12 enterprise accounts because the 8-week delegation pilot worked. " +
                "Evidence: Weekly check-ins W1–W8 + QuickBooks renewal log + senior account lead activity. " +
                "Impact: Roughly 14 owner hours/week recovered, $0 in lost renewal revenue across the 8 weeks. " +
                "Action: Codify the renewal-delegation SOP within 14 days; raise the senior account lead authority to $75,000; review quarterly.",
              evidence_refs: ["weekly_checkin_w1", "weekly_checkin_w4", "weekly_checkin_w8", "qb_summary_q3", "qb_summary_q4"],
            },
            {
              id: "ks-w8-rec-2",
              category: "cash", priority: "medium", inference: false, client_safe: false, included: true,
              title: "Sustain weekly AR review — outcome validated",
              explanation: "AR > 60 days down 22% over 8 weeks.",
              detail:
                "Cause: AR > 60 days dropped from 14% to 11% (a 22% relative reduction) because the weekly AR review with the billing lead held all 8 weeks. " +
                "Evidence: Weekly check-ins W1–W8 + QuickBooks Q3 and Q4 summaries + AR aging report. " +
                "Impact: Roughly $5,200 moved out of the > 60 bucket; 1.5 days of cash recovered. " +
                "Action: Sustain the weekly 20-minute review; target AR > 60 below 9% by week 12.",
              evidence_refs: ["weekly_checkin_w8", "qb_summary_q4", "ar_aging"],
            },
            {
              id: "ks-w8-rec-3",
              category: "growth", priority: "high", inference: false, client_safe: false, included: true,
              title: "Evaluate Q4 capacity expansion — owner belief contradicted by utilization data",
              explanation: "Owner believed 'no slack at 90%'; data shows 72% utilization.",
              detail:
                "Cause: There is unused capacity because, although the owner stated they were maxed at 90% utilization, 8 weeks of billable vs non-billable hour tracking show actual utilization is 72%. " +
                "Evidence: Weekly check-ins W1–W8 (billable + non-billable hour columns) + QuickBooks job log. " +
                "Impact: Roughly 18 percentage points of unused capacity — equivalent to 1–2 additional crews of work without hiring. " +
                "Action: Run a Q4 capacity-expansion review with the owner; pilot 1 additional service contract before hiring; re-measure utilization at week 12.",
              evidence_refs: ["weekly_checkin_w1", "weekly_checkin_w4", "weekly_checkin_w8", "qb_summary_q4"],
            },
          ],
          draft_sections: [
            { key: "executive_summary", label: "Executive summary", client_safe: false,
              body: "Week 8 outcome report. Two recommendations validated by 8 weeks of evidence: AR > 60 days down 22% (14% → 11%) and owner renewal load down ~60% (62 → 48 owner hours). One owner belief — 'we are at 90% utilization, no slack' — is contradicted by tracked data showing 72% utilization. New growth recommendation generated as a result." },
            { key: "key_findings", label: "Key findings", client_safe: false,
              body: "1) AR > 60 days dropped 22% over 8 weeks (14% → 11%). 2) Owner renewal load reduced ~60% (62 → 48 hours/week). 3) Actual capacity utilization is 72%, not the 90% the owner believed — 18 percentage points of unused capacity." },
            { key: "evidence_and_missing", label: "Evidence and missing data", client_safe: false,
              body: "Evidence: weekly_checkin W1–W8, QuickBooks Q3 + Q4 summaries, AR aging report, owner-hour tracking. No critical gaps remain for this snapshot." },
            { key: "next_steps", label: "Recommended next steps", client_safe: false,
              body: "Codify renewal-delegation SOP within 14 days; sustain weekly AR review with a 9% target by week 12; run a Q4 capacity-expansion review starting from the corrected 72% utilization baseline." },
          ],
          evidence_items: [
            { source: "weekly_checkin_w1", module: "Weekly check-in", title: "Week 1 baseline", detail: "62 owner hours; AR > 60 = 14%.", client_safe: false, is_demo: true, is_admin_entered: true },
            { source: "weekly_checkin_w4", module: "Weekly check-in", title: "Week 4 update", detail: "56 owner hours; AR > 60 = 12.5%.", client_safe: false, is_demo: true, is_admin_entered: true },
            { source: "weekly_checkin_w8", module: "Weekly check-in", title: "Week 8 outcome", detail: "48 owner hours; AR > 60 = 11%; utilization 72%.", client_safe: false, is_demo: true, is_admin_entered: true },
            { source: "qb_summary_q3", module: "QuickBooks", title: "Q3 period summary", client_safe: false, is_demo: true, is_synced: true },
            { source: "qb_summary_q4", module: "QuickBooks", title: "Q4 period summary", client_safe: false, is_demo: true, is_synced: true },
            { source: "ar_aging", module: "QuickBooks", title: "AR aging report", detail: "Bucket-level changes W1 → W8.", client_safe: false, is_demo: true, is_synced: true },
          ],
          evidence_notes: [
            "Owner belief about utilization (90%) contradicted by 8 weeks of tracked hours (72%) — flagged in Risks.",
            "Two recommendations validated by outcome; one owner belief recalibrated.",
          ],
        },
      ];
  }
}

async function ensureDrafts(
  spec: ShowcaseSpec,
  customerId: string,
  scorecardRunId: string | null,
  ctx: SeedCtx,
): Promise<{ drafts: number; recs: number; events: number }> {
  // Reset to keep timeline canonical.
  const { data: existing } = await (supabase.from("report_drafts") as any)
    .select("id").eq("customer_id", customerId);
  for (const r of (existing as any[]) || []) {
    const { error: rrErr } = await (supabase.from("report_recommendations") as any).delete().eq("report_id", r.id);
    recordStep(ctx, spec, "report_recommendations", "delete (reset)", rrErr ?? null);
    // learning events cascade via FK
    const { error: rdErr } = await (supabase.from("report_drafts") as any).delete().eq("id", r.id);
    recordStep(ctx, spec, "report_drafts", "delete (reset)", rdErr ?? null);
  }

  const drafts = draftsFor(spec);
  let recCount = 0;
  let eventCount = 0;
  let madeDrafts = 0;

  for (const d of drafts) {
    const created_at = isoTimestamp(-d.daysAgo);
    const approved_at = d.status === "approved" ? isoTimestamp(-Math.max(0, d.daysAgo - 1)) : null;
    const evidenceSnapshot = {
      collected_at: created_at,
      customer_id: customerId,
      customer_label: spec.business_name,
      is_demo_account: true,
      items: d.evidence_items,
      counts: { items: d.evidence_items.length },
      notes: d.evidence_notes,
    };
    const draftSectionsPayload = { sections: d.draft_sections };
    const fullRecommendations = d.recommendations.map((r) => ({
      id: r.id,
      title: r.title,
      detail: r.detail,
      evidence_refs: r.evidence_refs,
      inference: r.inference,
      priority: r.priority,
      client_safe: r.client_safe,
    }));
    const fullRisks = d.risks.map((r, i) => ({
      id: `${spec.key}-risk-${i}`,
      title: r,
      detail: r,
      evidence_refs: [],
      severity: "medium" as const,
      client_safe: false,
    }));
    const { data: row, error } = await (supabase.from("report_drafts") as any).insert({
      customer_id: customerId,
      scorecard_run_id: scorecardRunId,
      report_type: "diagnostic",
      title: d.title,
      status: d.status,
      generation_mode: "deterministic",
      ai_status: "not_run",
      rubric_version: "reports.v1",
      evidence_snapshot: evidenceSnapshot,
      draft_sections: draftSectionsPayload,
      recommendations: fullRecommendations,
      risks: fullRisks,
      missing_information: d.missing_information,
      confidence: d.confidence,
      client_safe: d.client_safe,
      admin_notes: `Showcase seed (${spec.key}).`,
      approved_at,
      created_at,
    }).select("id").single();
    recordStep(ctx, spec, "report_drafts", "insert", error ?? null);
    if (error || !row) continue;
    madeDrafts++;

    // Recommendations table
    for (let idx = 0; idx < d.recommendations.length; idx++) {
      const r = d.recommendations[idx];
      const { error: insErr } = await (supabase.from("report_recommendations") as any).insert({
        customer_id: customerId,
        report_id: row.id,
        category: normalizeRecommendationCategory(r.category),
        title: r.title,
        explanation: r.explanation,
        priority: r.priority,
        display_order: idx,
        included_in_report: r.included,
        origin: normalizeRecommendationOrigin("showcase_seed"),
        rule_key: `showcase.${spec.key}.${idx}`,
        rejected_at: r.rejected ? isoTimestamp(-Math.max(0, d.daysAgo - 2)) : null,
        rejected_reason: r.rejected ? "Superseded by stronger evidence" : null,
      });
      recordStep(ctx, spec, "report_recommendations", "insert", insErr ?? null);
      if (!insErr) recCount++;
    }

    // Learning events
    const events: { event_type: string; daysAgo: number; notes?: string }[] = [
      { event_type: "generated", daysAgo: d.daysAgo, notes: "Deterministic generation (showcase)" },
    ];
    if (d.status === "approved") {
      events.push({ event_type: "approved", daysAgo: Math.max(0, d.daysAgo - 1), notes: "Approved (showcase)" });
    }
    for (const r of d.recommendations) {
      if (r.rejected) {
        events.push({ event_type: "recommendation_rejected", daysAgo: Math.max(0, d.daysAgo - 2), notes: r.title });
      } else if (r.included) {
        events.push({ event_type: "recommendation_accepted", daysAgo: Math.max(0, d.daysAgo - 1), notes: r.title });
      }
    }
    if (spec.key === "keystone" && d.title.includes("Week 8")) {
      events.push({ event_type: "outcome_logged", daysAgo: 0, notes: "AR > 60 days down 22% — outcome verified." });
      events.push({ event_type: "outcome_logged", daysAgo: 0, notes: "Owner-load on renewals reduced ~60% — outcome verified." });
    }
    for (const e of events) {
      const { error: evErr } = await (supabase.from("report_draft_learning_events") as any).insert({
        draft_id: row.id,
        event_type: e.event_type,
        notes: e.notes ?? null,
        created_at: isoTimestamp(-e.daysAgo),
      });
      recordStep(ctx, spec, "report_draft_learning_events", "insert", evErr ?? null);
      if (!evErr) eventCount++;
    }
  }
  return { drafts: madeDrafts, recs: recCount, events: eventCount };
}

// ---------------- Weekly check-ins (Keystone 8 weeks) ----------------

function checkinFor(weeksAgo: number) {
  // Improving trend: owner_hours down, AR > 60 down, revenue stable+growing.
  const idx = 7 - weeksAgo; // 0 oldest .. 7 newest (when weeksAgo=0)
  const revenue = 42000 + idx * 1100;
  const arOver60Pct = 0.14 - idx * 0.0125; // 14% → ~5%
  const ownerHours = 62 - idx * 2; // 62 → 48
  return {
    source_systems: ["quickbooks", "weekly_checkin"],
    data_quality: "good",
    revenue_by_service: [
      { category: "Service contracts", amount: revenue * 0.48 },
      { category: "Project work", amount: revenue * 0.38 },
      { category: "Emergency", amount: revenue * 0.14 },
    ],
    revenue_by_channel: { repeat: revenue * 0.6, referral: revenue * 0.25, outbound: revenue * 0.15 },
    top_clients: [
      { name: "Anchor service A", amount: revenue * 0.18 },
      { name: "Anchor service B", amount: revenue * 0.12 },
    ],
    lost_revenue: weeksAgo > 4 ? 2200 : 600,
    ar_0_30: revenue * 0.55,
    ar_31_60: revenue * (0.22 - idx * 0.005),
    ar_61_90: revenue * Math.max(0.04, arOver60Pct - 0.04),
    ar_90_plus: revenue * 0.04,
    obligations_next_7: revenue * 0.35,
    obligations_next_30: revenue * 1.1,
    expected_inflows_next_30: revenue * 1.4,
    cash_concern_level: idx >= 5 ? "low" : idx >= 2 ? "moderate" : "elevated",
    owner_hours: ownerHours,
    billable_hours: 28 + idx,
    non_billable_hours: 26 - idx,
    capacity_status: idx >= 4 ? "balanced" : "at_capacity",
    owner_bottleneck: idx < 4 ? "Owner approves all enterprise renewals." : "Owner load reduced via delegation pilot.",
    pipeline_confidence: idx >= 4 ? "high" : "moderate",
    repeated_issue: idx < 3,
    request_rgs_review: false,
  };
}

async function ensureCheckins(
  spec: ShowcaseSpec,
  customerId: string,
  ctx: SeedCtx,
): Promise<number> {
  if (spec.key !== "keystone") return 0;
  // Reset to keep a canonical 8-week timeline (avoids the missing
  // unique-constraint upsert problem; idempotent via wipe-and-reseed).
  await resetCustomerTable("weekly_checkins", customerId, spec, ctx);
  let inserted = 0;
  for (let weeksAgo = 7; weeksAgo >= 0; weeksAgo--) {
    const w = pickWeekRange(weeksAgo);
    const payload = checkinFor(weeksAgo);
    const { error } = await (supabase.from("weekly_checkins") as any).insert(
      { customer_id: customerId, week_start: w.week_start, week_end: w.week_end, period_label: w.label, ...payload },
    );
    recordStep(ctx, spec, "weekly_checkins", "insert", error ?? null);
    if (!error) inserted++;
  }
  return inserted;
}

// ---------------- QuickBooks period summaries ----------------

async function ensureQbSummaries(
  spec: ShowcaseSpec,
  customerId: string,
  ctx: SeedCtx,
): Promise<number> {
  if (spec.key === "atlas") return 0;
  // Reset for canonical replay
  await resetCustomerTable("quickbooks_period_summaries", customerId, spec, ctx);
  let count = 0;
  const periods = spec.key === "keystone" ? 4 : spec.key === "summit" ? 3 : 2;
  for (let i = periods - 1; i >= 0; i--) {
    const periodEnd = isoDate(-i * 30);
    const periodStart = isoDate(-(i + 1) * 30 + 1);
    const baseRev = spec.key === "keystone" ? 180000 : spec.key === "summit" ? 220000 : 95000;
    const revenue = baseRev + (periods - i) * 4500;
    const expenses = revenue * 0.72;
    const arTotal = revenue * 0.42;
    const { error } = await (supabase.from("quickbooks_period_summaries") as any).insert({
      customer_id: customerId,
      period_start: periodStart,
      period_end: periodEnd,
      revenue_total: revenue,
      expense_total: expenses,
      open_invoices_count: 12 + i,
      open_invoices_total: revenue * 0.18,
      ar_total: arTotal,
      ar_aging: { "0_30": arTotal * 0.55, "31_60": arTotal * 0.22, "61_90": arTotal * 0.13, "90_plus": arTotal * 0.10 },
      ap_total: expenses * 0.18,
      ap_aging: { "0_30": expenses * 0.12, "31_60": expenses * 0.04, "61_90": expenses * 0.02 },
      synced_at: isoTimestamp(-i * 30),
      raw_payload: { showcase: true, source: "synthetic" },
    });
    recordStep(ctx, spec, "quickbooks_period_summaries", "insert", error ?? null);
    if (!error) count++;
  }
  return count;
}

// ---------------- Invoices ----------------

async function ensureInvoices(
  spec: ShowcaseSpec,
  customerId: string,
  ctx: SeedCtx,
): Promise<number> {
  if (spec.key === "atlas") return 0;
  await resetCustomerTable("invoice_entries", customerId, spec, ctx);
  const count = spec.key === "keystone" ? 8 : spec.key === "summit" ? 6 : 4;
  let made = 0;
  for (let i = 0; i < count; i++) {
    const issued = -((i + 1) * 7);
    const due = issued + 30;
    const amount = 4200 + (i % 5) * 850;
    const collected = i % 3 === 0 ? 0 : amount;
    const status = collected === 0 ? (due < 0 ? "overdue" : "sent") : "paid";
    const { error } = await (supabase.from("invoice_entries") as any).insert({
      customer_id: customerId,
      invoice_number: `${spec.key.toUpperCase()}-${1000 + i}`,
      invoice_date: isoDate(issued),
      due_date: isoDate(due),
      client_or_job: `Showcase client ${String.fromCharCode(65 + (i % 6))}`,
      amount,
      amount_collected: collected,
      status,
    });
    recordStep(ctx, spec, "invoice_entries", "insert", error ?? null);
    if (!error) made++;
  }
  return made;
}

// ---------------- Pipeline deals ----------------

async function ensurePipeline(
  spec: ShowcaseSpec,
  customerId: string,
  ctx: SeedCtx,
): Promise<number> {
  if (spec.key === "atlas") return 0;
  await resetCustomerTable("client_pipeline_deals", customerId, spec, ctx);
  await resetCustomerTable("client_pipeline_stages", customerId, spec, ctx);
  const stages = [
    { stage_key: "qualified", label: "Qualified", display_order: 1 },
    { stage_key: "quoted", label: "Quoted", display_order: 2 },
    { stage_key: "negotiation", label: "Negotiation", display_order: 3 },
    { stage_key: "won", label: "Won", display_order: 4 },
  ];
  const stageIds: Record<string, string> = {};
  for (const s of stages) {
    const { data, error } = await (supabase.from("client_pipeline_stages") as any).insert({
      customer_id: customerId, stage_key: s.stage_key, label: s.label, display_order: s.display_order, active: true,
    }).select("id").single();
    recordStep(ctx, spec, "client_pipeline_stages", "insert", error ?? null);
    if (data?.id) stageIds[s.stage_key] = data.id as string;
  }
  const dealCount = spec.key === "keystone" ? 9 : spec.key === "summit" ? 6 : 4;
  let made = 0;
  const stageKeys = Object.keys(stageIds);
  for (let i = 0; i < dealCount; i++) {
    const stageKey = stageKeys[i % stageKeys.length];
    const value = 9500 + (i % 6) * 2300;
    const prob = stageKey === "won" ? 100 : stageKey === "negotiation" ? 70 : stageKey === "quoted" ? 40 : 20;
    const { error } = await (supabase.from("client_pipeline_deals") as any).insert({
      customer_id: customerId,
      title: `${spec.business_name.split(" (")[0]} deal ${i + 1}`,
      company_or_contact: `Prospect ${String.fromCharCode(65 + (i % 8))}`,
      stage_id: stageIds[stageKey],
      estimated_value: value,
      probability_percent: prob,
      expected_close_date: isoDate(7 + i * 4),
      created_date: isoDate(-(i + 1) * 6),
      last_activity_date: isoDate(-(i % 5)),
      status: stageKey === "won" ? "won" : "open",
      source: "showcase_seed",
    });
    recordStep(ctx, spec, "client_pipeline_deals", "insert", error ?? null);
    if (!error) made++;
  }
  return made;
}

// ---------------- Integrations / source requests ----------------

async function ensureIntegrations(
  spec: ShowcaseSpec,
  customerId: string,
  ctx: SeedCtx,
): Promise<number> {
  await resetCustomerTable("customer_integrations", customerId, spec, ctx);
  const rows: any[] = [];
  if (spec.key === "atlas") {
    rows.push({ provider: "quickbooks", status: "requested", account_label: "Awaiting client connection" });
  } else if (spec.key === "northstar") {
    rows.push({ provider: "quickbooks", status: "active", account_label: "Northstar QB (showcase)", last_sync_at: isoTimestamp(-3), last_sync_status: "ok" });
    rows.push({ provider: "hubspot", status: "requested", account_label: "Pending" });
  } else if (spec.key === "summit") {
    rows.push({ provider: "quickbooks", status: "active", account_label: "Summit QB (showcase)", last_sync_at: isoTimestamp(-1), last_sync_status: "ok" });
    rows.push({ provider: "stripe", status: "active", account_label: "Summit Stripe (showcase)", last_sync_at: isoTimestamp(-1), last_sync_status: "ok" });
  } else {
    rows.push({ provider: "quickbooks", status: "active", account_label: "Keystone QB (showcase)", last_sync_at: isoTimestamp(0), last_sync_status: "ok" });
    rows.push({ provider: "stripe", status: "active", account_label: "Keystone Stripe (showcase)", last_sync_at: isoTimestamp(0), last_sync_status: "ok" });
    rows.push({ provider: "jobber", status: "active", account_label: "Keystone Jobber (showcase)", last_sync_at: isoTimestamp(-2), last_sync_status: "ok" });
  }
  let made = 0;
  for (const r of rows) {
    const { error } = await (supabase.from("customer_integrations") as any).insert({
      customer_id: customerId, ...r, metadata: { showcase: true },
    });
    recordStep(ctx, spec, "customer_integrations", "insert", error ?? null);
    if (!error) made++;
  }
  return made;
}

// ---------------- Tasks + checklist (Summit/Keystone implementation) ----------------

async function ensureTasksAndChecklist(
  spec: ShowcaseSpec,
  customerId: string,
  ctx: SeedCtx,
): Promise<{ tasks: number; checklist: number }> {
  if (spec.key !== "summit" && spec.key !== "keystone") return { tasks: 0, checklist: 0 };
  await resetCustomerTable("customer_tasks", customerId, spec, ctx);
  await resetCustomerTable("checklist_items", customerId, spec, ctx);

  const tasks = spec.key === "summit"
    ? [
      { title: "Document estimating SOP", description: "Owner-led; pilot with senior PM.", target_gear: 3, status: "in_progress" },
      { title: "Close field-to-billing handoff gap A", description: "Recurring; prioritize this cycle.", target_gear: 2, status: "open" },
      { title: "Close field-to-billing handoff gap B", description: "Lower frequency than A.", target_gear: 2, status: "open" },
    ]
    : [
      { title: "Codify renewal-delegation SOP", description: "Pilot succeeded; codify pattern.", target_gear: 4, status: "in_progress" },
      { title: "Sustain weekly AR review", description: "Outcome verified — keep cadence.", target_gear: 4, status: "open" },
    ];

  let tCount = 0;
  for (const t of tasks) {
    const { error } = await (supabase.from("customer_tasks") as any).insert({
      customer_id: customerId, title: t.title, description: t.description,
      status: t.status, target_gear: t.target_gear, due_date: isoDate(14),
    });
    recordStep(ctx, spec, "customer_tasks", "insert", error ?? null);
    if (!error) tCount++;
  }

  const checklist = spec.key === "summit"
    ? ["SOP draft v1", "Pilot with senior PM", "Owner sign-off"]
    : ["Renewal SOP codified", "Weekly AR review locked into ops calendar"];
  let cCount = 0;
  for (let i = 0; i < checklist.length; i++) {
    const { error } = await (supabase.from("checklist_items") as any).insert({
      customer_id: customerId, title: checklist[i], position: i, completed: i === 0, target_gear: spec.key === "summit" ? 3 : 4,
    });
    recordStep(ctx, spec, "checklist_items", "insert", error ?? null);
    if (!error) cCount++;
  }
  return { tasks: tCount, checklist: cCount };
}

// ---------------- Orchestrator ----------------

export async function runShowcaseSeed(): Promise<ShowcaseSeedResult> {
  const ctx: SeedCtx = {
    log: [],
    partial: {
      scorecards: 0, interviews: 0, drafts: 0, recommendations: 0, learningEvents: 0,
      weeklyCheckins: 0, qbSummaries: 0, invoices: 0, pipelineDeals: 0, integrations: 0,
      tasks: 0, checklist: 0,
    },
    abortAccount: new Set(),
  };
  const result: ShowcaseSeedResult = {
    ok: true, message: "", customers: [], errors: [],
    stepLog: ctx.log,
    customerCreateResults: [],
    counts: {
      scorecards: 0, interviews: 0, drafts: 0, recommendations: 0, learningEvents: 0,
      weeklyCheckins: 0, qbSummaries: 0, invoices: 0, pipelineDeals: 0, integrations: 0,
      tasks: 0, checklist: 0,
    },
  };

  for (const spec of SPECS) {
    const c = await ensureCustomer(spec, ctx);
    result.customerCreateResults.push({
      account: spec.key,
      business: spec.business_name,
      id: c.id,
      error: c.error,
    });
    if (!c.id) {
      result.errors.push(`${spec.business_name}: ${c.error}`);
      result.ok = false;
      result.customers.push({ label: spec.business_name, email: spec.email, id: null, stage: spec.stage });
      // do NOT continue to child writes for this account
      continue;
    }
    if (c.error) result.errors.push(`${spec.business_name}: ${c.error}`);

    const sc = await ensureScorecardRun(spec, ctx);
    if (sc.id) result.counts.scorecards++;
    ctx.partial.scorecards = result.counts.scorecards;

    const iv = await ensureInterview(spec, c.id, ctx);
    if (iv.id) result.counts.interviews++;
    ctx.partial.interviews = result.counts.interviews;

    const dr = await ensureDrafts(spec, c.id, sc.id, ctx);
    result.counts.drafts += dr.drafts;
    result.counts.recommendations += dr.recs;
    result.counts.learningEvents += dr.events;
    ctx.partial.drafts = result.counts.drafts;
    ctx.partial.recommendations = result.counts.recommendations;
    ctx.partial.learningEvents = result.counts.learningEvents;

    result.counts.weeklyCheckins += await ensureCheckins(spec, c.id, ctx);
    result.counts.qbSummaries += await ensureQbSummaries(spec, c.id, ctx);
    result.counts.invoices += await ensureInvoices(spec, c.id, ctx);
    result.counts.pipelineDeals += await ensurePipeline(spec, c.id, ctx);
    result.counts.integrations += await ensureIntegrations(spec, c.id, ctx);
    ctx.partial.weeklyCheckins = result.counts.weeklyCheckins;
    ctx.partial.qbSummaries = result.counts.qbSummaries;
    ctx.partial.invoices = result.counts.invoices;
    ctx.partial.pipelineDeals = result.counts.pipelineDeals;
    ctx.partial.integrations = result.counts.integrations;

    const tc = await ensureTasksAndChecklist(spec, c.id, ctx);
    result.counts.tasks += tc.tasks;
    result.counts.checklist += tc.checklist;
    ctx.partial.tasks = result.counts.tasks;
    ctx.partial.checklist = result.counts.checklist;

    result.customers.push({ label: spec.business_name, email: spec.email, id: c.id, stage: spec.stage });
  }

  // Surface the first hard error in the top-level result regardless of which
  // account it occurred in.
  if (ctx.firstError) {
    result.firstError = ctx.firstError;
    result.failedStep = ctx.firstError;
    result.ok = false;
    result.partialCounts = { ...result.counts };
    if (!result.errors.some((e) => e.includes(ctx.firstError!.message))) {
      result.errors.unshift(
        `[${ctx.firstError.account}] ${ctx.firstError.table}.${ctx.firstError.operation}: ${ctx.firstError.message}` +
          (ctx.firstError.code ? ` (code ${ctx.firstError.code})` : ""),
      );
    }
  }
  result.message = result.ok
    ? "Multi-stage showcase seeded. Re-run safely at any time."
    : ctx.firstError
      ? `Showcase seed failed at ${ctx.firstError.table}.${ctx.firstError.operation} for ${ctx.firstError.account}.`
      : "Showcase seed completed with some errors — see details.";
  return result;
}

// ---------------- Verifier (used by Settings UI) ----------------

export interface ShowcaseVerifyRow {
  business_name: string | null;
  email: string;
  id: string;
  is_demo_account: boolean;
  learning_enabled: boolean;
  contributes_to_global_learning: boolean;
  archived_at: string | null;
  stage: string | null;
}

export async function verifyShowcaseRows(): Promise<{
  count: number;
  rows: ShowcaseVerifyRow[];
  error?: string;
}> {
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, business_name, email, is_demo_account, learning_enabled, contributes_to_global_learning, archived_at, stage",
    )
    .like("email", `%${SHOWCASE_SUFFIX}`)
    .order("business_name");
  if (error) return { count: 0, rows: [], error: error.message };
  return { count: (data ?? []).length, rows: (data ?? []) as ShowcaseVerifyRow[] };
}

export const SHOWCASE_EMAIL_SUFFIX = SHOWCASE_SUFFIX;
