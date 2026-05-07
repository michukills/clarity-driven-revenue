/**
 * P86C — RGS Industry Operational Depth™ deterministic helpers + admin/
 * client data access.
 *
 * No AI. No legal/tax/accounting/payroll/OSHA/licensing/insurance/
 * fiduciary/valuation/lender/investor/audit determinations. Pure
 * arithmetic and boolean rules over admin-entered inputs. Connector
 * mentions describe MANUAL EXPORT / UPLOAD only.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  ECOM_FULFILLMENT_SLA_HOURS_THRESHOLD,
  ECOM_REPEAT_PURCHASE_PCT_THRESHOLD,
  ECOM_RETURN_RATE_PCT_THRESHOLD,
  PROF_AR_DAYS_THRESHOLD,
  PROF_SCOPE_CHANGE_RATE_THRESHOLD,
  PROF_UTILIZATION_PCT_THRESHOLD,
  DEPTH_EVIDENCE_EXAMPLES,
  DEPTH_METRICS_ALL,
  getDepthMetricsForIndustry,
  RESTAURANT_FOOD_COST_PCT_THRESHOLD,
  RESTAURANT_GROSS_MARGIN_PCT_THRESHOLD,
  RESTAURANT_LABOR_COST_PCT_THRESHOLD,
  RESTAURANT_VENDOR_COST_CHANGE_PCT_THRESHOLD,
  RETAIL_DEAD_STOCK_HIGH_THRESHOLD,
  RETAIL_INVENTORY_TURNOVER_THRESHOLD,
  RETAIL_RETURN_RATE_PCT_THRESHOLD,
  isDepthIndustryKey,
  resolveDepthIndustryKey,
  type DepthEvidenceSourceType,
  type DepthGearKey,
  type DepthMetricDefinition,
} from "@/config/industryOperationalDepth";
import {
  INDUSTRY_DEPTH_ADMIN_ANNOTATIONS,
  INDUSTRY_DEPTH_EXPANSION_METRICS,
  type DepthMetricAdminAnnotation,
} from "@/config/industryDepthExpansion";
import { getQuickStartTemplate, type QuickStartTemplateKey } from "@/config/stabilityQuickStartTemplates";

export type DepthStatus =
  | "current"
  | "needs_review"
  | "high_risk"
  | "severe_risk"
  | "invalid_input"
  | "source_conflict_possible"
  | "not_applicable";

export type DepthSeverity = "none" | "info" | "high" | "severe";

export interface DepthDetectionResult {
  metric_key: string;
  status: DepthStatus;
  severity: DepthSeverity;
  needs_reinspection: boolean;
  trigger_value: number | null;
  threshold_value: number | null;
  reason: string;
}

function notApplicable(metricKey: string, threshold: number | null): DepthDetectionResult {
  return {
    metric_key: metricKey,
    status: "not_applicable",
    severity: "none",
    needs_reinspection: false,
    trigger_value: null,
    threshold_value: threshold,
    reason: "not_applicable",
  };
}

function withinThreshold(metricKey: string, value: number, threshold: number | null): DepthDetectionResult {
  return {
    metric_key: metricKey,
    status: "current",
    severity: "none",
    needs_reinspection: false,
    trigger_value: value,
    threshold_value: threshold,
    reason: "within_threshold",
  };
}

function invalid(metricKey: string, threshold: number | null, reason: string): DepthDetectionResult {
  return {
    metric_key: metricKey,
    status: "invalid_input",
    severity: "info",
    needs_reinspection: false,
    trigger_value: null,
    threshold_value: threshold,
    reason,
  };
}

/* -------- General -------- */

export function detectGeneralWeeklyReview(input: {
  hasWeeklyReview: boolean | null | undefined;
  industryKey?: string | null;
}): DepthDetectionResult {
  const k = "general.no_weekly_review";
  if (input.industryKey !== undefined && resolveDepthIndustryKey(input.industryKey) !== "general_small_business") {
    return notApplicable(k, null);
  }
  if (input.hasWeeklyReview == null) return { metric_key: k, status: "needs_review", severity: "info", needs_reinspection: false, trigger_value: null, threshold_value: null, reason: "missing_evidence" };
  if (input.hasWeeklyReview === false) {
    return { metric_key: k, status: "high_risk", severity: "high", needs_reinspection: true, trigger_value: null, threshold_value: null, reason: "no_weekly_review" };
  }
  return { metric_key: k, status: "current", severity: "none", needs_reinspection: false, trigger_value: null, threshold_value: null, reason: "weekly_review_in_place" };
}

export function detectGeneralOwnerBottleneck(input: {
  ownerIsBottleneck: boolean | null | undefined;
  industryKey?: string | null;
}): DepthDetectionResult {
  const k = "general.owner_is_bottleneck";
  if (input.industryKey !== undefined && resolveDepthIndustryKey(input.industryKey) !== "general_small_business") {
    return notApplicable(k, null);
  }
  if (input.ownerIsBottleneck == null) return { metric_key: k, status: "needs_review", severity: "info", needs_reinspection: false, trigger_value: null, threshold_value: null, reason: "missing_evidence" };
  if (input.ownerIsBottleneck === true) {
    return { metric_key: k, status: "high_risk", severity: "high", needs_reinspection: true, trigger_value: null, threshold_value: null, reason: "owner_bottleneck" };
  }
  return { metric_key: k, status: "current", severity: "none", needs_reinspection: false, trigger_value: null, threshold_value: null, reason: "no_bottleneck" };
}

export function detectGeneralProfitVisibility(input: {
  profitVisibleMonthly: boolean | null | undefined;
  industryKey?: string | null;
}): DepthDetectionResult {
  const k = "general.no_profit_visibility";
  if (input.industryKey !== undefined && resolveDepthIndustryKey(input.industryKey) !== "general_small_business") {
    return notApplicable(k, null);
  }
  if (input.profitVisibleMonthly == null) return { metric_key: k, status: "needs_review", severity: "info", needs_reinspection: false, trigger_value: null, threshold_value: null, reason: "missing_evidence" };
  if (input.profitVisibleMonthly === false) {
    return { metric_key: k, status: "high_risk", severity: "high", needs_reinspection: true, trigger_value: null, threshold_value: null, reason: "no_monthly_profit_visibility" };
  }
  return { metric_key: k, status: "current", severity: "none", needs_reinspection: false, trigger_value: null, threshold_value: null, reason: "profit_visible" };
}

/* -------- Restaurant -------- */

function checkRestaurant(industryKey: string | null | undefined): boolean {
  return resolveDepthIndustryKey(industryKey) === "restaurant_food_service";
}

export function detectFoodCostCreep(input: { foodCostPct: number; industryKey?: string | null }): DepthDetectionResult {
  const k = "restaurant.food_cost_creep";
  const t = RESTAURANT_FOOD_COST_PCT_THRESHOLD;
  if (input.industryKey !== undefined && !checkRestaurant(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.foodCostPct) || input.foodCostPct < 0 || input.foodCostPct > 100) return invalid(k, t, "out_of_range");
  if (input.foodCostPct > t) {
    return { metric_key: k, status: "high_risk", severity: input.foodCostPct > 40 ? "severe" : "high", needs_reinspection: true, trigger_value: input.foodCostPct, threshold_value: t, reason: "above_threshold" };
  }
  return withinThreshold(k, input.foodCostPct, t);
}

export function detectLaborOutOfControl(input: { laborCostPct: number; industryKey?: string | null }): DepthDetectionResult {
  const k = "restaurant.labor_out_of_control";
  const t = RESTAURANT_LABOR_COST_PCT_THRESHOLD;
  if (input.industryKey !== undefined && !checkRestaurant(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.laborCostPct) || input.laborCostPct < 0 || input.laborCostPct > 100) return invalid(k, t, "out_of_range");
  if (input.laborCostPct > t) {
    return { metric_key: k, status: "high_risk", severity: input.laborCostPct > 40 ? "severe" : "high", needs_reinspection: true, trigger_value: input.laborCostPct, threshold_value: t, reason: "above_threshold" };
  }
  return withinThreshold(k, input.laborCostPct, t);
}

export function detectHighSalesWeakMargin(input: { grossMarginPct: number; industryKey?: string | null }): DepthDetectionResult {
  const k = "restaurant.high_sales_weak_margin";
  const t = RESTAURANT_GROSS_MARGIN_PCT_THRESHOLD;
  if (input.industryKey !== undefined && !checkRestaurant(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.grossMarginPct) || input.grossMarginPct < 0 || input.grossMarginPct > 100) return invalid(k, t, "out_of_range");
  if (input.grossMarginPct < t) {
    return { metric_key: k, status: "high_risk", severity: "high", needs_reinspection: true, trigger_value: input.grossMarginPct, threshold_value: t, reason: "below_threshold" };
  }
  return withinThreshold(k, input.grossMarginPct, t);
}

export function detectVendorCostChange(input: { vendorCostChangePct: number; pricingReviewed: boolean | null; industryKey?: string | null }): DepthDetectionResult {
  const k = "restaurant.vendor_cost_change_not_reviewed";
  const t = RESTAURANT_VENDOR_COST_CHANGE_PCT_THRESHOLD;
  if (input.industryKey !== undefined && !checkRestaurant(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.vendorCostChangePct)) return invalid(k, t, "out_of_range");
  if (input.vendorCostChangePct >= t && input.pricingReviewed !== true) {
    return { metric_key: k, status: "high_risk", severity: input.vendorCostChangePct >= 10 ? "severe" : "high", needs_reinspection: true, trigger_value: input.vendorCostChangePct, threshold_value: t, reason: "cost_change_unreviewed" };
  }
  return withinThreshold(k, input.vendorCostChangePct, t);
}

/* -------- Retail -------- */

function checkRetail(industryKey: string | null | undefined): boolean {
  return resolveDepthIndustryKey(industryKey) === "retail";
}

export function detectDeadInventory(input: { deadStockValue: number; industryKey?: string | null }): DepthDetectionResult {
  const k = "retail.dead_inventory";
  const t = RETAIL_DEAD_STOCK_HIGH_THRESHOLD;
  if (input.industryKey !== undefined && !checkRetail(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.deadStockValue) || input.deadStockValue < 0) return invalid(k, t, "out_of_range");
  if (input.deadStockValue > 0) {
    return { metric_key: k, status: "high_risk", severity: input.deadStockValue >= t ? "severe" : "high", needs_reinspection: true, trigger_value: input.deadStockValue, threshold_value: t, reason: "dead_stock_present" };
  }
  return withinThreshold(k, 0, t);
}

export function detectSlowTurnover(input: { inventoryTurnover: number; industryKey?: string | null }): DepthDetectionResult {
  const k = "retail.slow_inventory_turnover";
  const t = RETAIL_INVENTORY_TURNOVER_THRESHOLD;
  if (input.industryKey !== undefined && !checkRetail(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.inventoryTurnover) || input.inventoryTurnover < 0) return invalid(k, t, "out_of_range");
  if (input.inventoryTurnover < t) {
    return { metric_key: k, status: "high_risk", severity: "high", needs_reinspection: true, trigger_value: input.inventoryTurnover, threshold_value: t, reason: "below_threshold" };
  }
  return withinThreshold(k, input.inventoryTurnover, t);
}

export function detectRetailReturnRate(input: { returnRatePct: number; industryKey?: string | null }): DepthDetectionResult {
  const k = "retail.high_return_rate";
  const t = RETAIL_RETURN_RATE_PCT_THRESHOLD;
  if (input.industryKey !== undefined && !checkRetail(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.returnRatePct) || input.returnRatePct < 0 || input.returnRatePct > 100) return invalid(k, t, "out_of_range");
  if (input.returnRatePct > t) {
    return { metric_key: k, status: "high_risk", severity: input.returnRatePct > 15 ? "severe" : "high", needs_reinspection: true, trigger_value: input.returnRatePct, threshold_value: t, reason: "above_threshold" };
  }
  return withinThreshold(k, input.returnRatePct, t);
}

export function detectNoCategoryMargin(input: { hasCategoryMargin: boolean | null | undefined; industryKey?: string | null }): DepthDetectionResult {
  const k = "retail.no_category_margin";
  if (input.industryKey !== undefined && !checkRetail(input.industryKey)) return notApplicable(k, null);
  if (input.hasCategoryMargin == null) return { metric_key: k, status: "needs_review", severity: "info", needs_reinspection: false, trigger_value: null, threshold_value: null, reason: "missing_evidence" };
  if (input.hasCategoryMargin === false) {
    return { metric_key: k, status: "high_risk", severity: "high", needs_reinspection: true, trigger_value: null, threshold_value: null, reason: "no_category_margin" };
  }
  return { metric_key: k, status: "current", severity: "none", needs_reinspection: false, trigger_value: null, threshold_value: null, reason: "category_margin_visible" };
}

/* -------- Professional Services -------- */

function checkProfessional(industryKey: string | null | undefined): boolean {
  return resolveDepthIndustryKey(industryKey) === "professional_services";
}

export function detectLowUtilization(input: { utilizationPct: number; industryKey?: string | null }): DepthDetectionResult {
  const k = "professional.low_billable_utilization";
  const t = PROF_UTILIZATION_PCT_THRESHOLD;
  if (input.industryKey !== undefined && !checkProfessional(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.utilizationPct) || input.utilizationPct < 0 || input.utilizationPct > 100) return invalid(k, t, "out_of_range");
  if (input.utilizationPct < t) {
    return { metric_key: k, status: "high_risk", severity: input.utilizationPct < 40 ? "severe" : "high", needs_reinspection: true, trigger_value: input.utilizationPct, threshold_value: t, reason: "below_threshold" };
  }
  return withinThreshold(k, input.utilizationPct, t);
}

export function detectScopeCreep(input: { scopeChangeRatePct: number; signedChangeOrders: boolean | null; industryKey?: string | null }): DepthDetectionResult {
  const k = "professional.scope_creep_unmanaged";
  const t = PROF_SCOPE_CHANGE_RATE_THRESHOLD;
  if (input.industryKey !== undefined && !checkProfessional(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.scopeChangeRatePct) || input.scopeChangeRatePct < 0 || input.scopeChangeRatePct > 100) return invalid(k, t, "out_of_range");
  if (input.scopeChangeRatePct > t && input.signedChangeOrders !== true) {
    return { metric_key: k, status: "high_risk", severity: "high", needs_reinspection: true, trigger_value: input.scopeChangeRatePct, threshold_value: t, reason: "scope_creep_unmanaged" };
  }
  return withinThreshold(k, input.scopeChangeRatePct, t);
}

export function detectArAgingDrag(input: { avgArDays: number; industryKey?: string | null }): DepthDetectionResult {
  const k = "professional.ar_aging_drag";
  const t = PROF_AR_DAYS_THRESHOLD;
  if (input.industryKey !== undefined && !checkProfessional(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.avgArDays) || input.avgArDays < 0) return invalid(k, t, "out_of_range");
  if (input.avgArDays > t) {
    return { metric_key: k, status: "high_risk", severity: input.avgArDays > 90 ? "severe" : "high", needs_reinspection: true, trigger_value: input.avgArDays, threshold_value: t, reason: "above_threshold" };
  }
  return withinThreshold(k, input.avgArDays, t);
}

/* -------- E-commerce -------- */

function checkEcommerce(industryKey: string | null | undefined): boolean {
  return resolveDepthIndustryKey(industryKey) === "ecommerce_online_retail";
}

export function detectFulfillmentSlaDrift(input: { avgShipHours: number; industryKey?: string | null }): DepthDetectionResult {
  const k = "ecommerce.fulfillment_sla_drift";
  const t = ECOM_FULFILLMENT_SLA_HOURS_THRESHOLD;
  if (input.industryKey !== undefined && !checkEcommerce(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.avgShipHours) || input.avgShipHours < 0) return invalid(k, t, "out_of_range");
  if (input.avgShipHours > t) {
    return { metric_key: k, status: "high_risk", severity: input.avgShipHours > 96 ? "severe" : "high", needs_reinspection: true, trigger_value: input.avgShipHours, threshold_value: t, reason: "above_threshold" };
  }
  return withinThreshold(k, input.avgShipHours, t);
}

export function detectEcomReturnRate(input: { returnRatePct: number; industryKey?: string | null }): DepthDetectionResult {
  const k = "ecommerce.high_return_rate";
  const t = ECOM_RETURN_RATE_PCT_THRESHOLD;
  if (input.industryKey !== undefined && !checkEcommerce(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.returnRatePct) || input.returnRatePct < 0 || input.returnRatePct > 100) return invalid(k, t, "out_of_range");
  if (input.returnRatePct > t) {
    return { metric_key: k, status: "high_risk", severity: input.returnRatePct > 20 ? "severe" : "high", needs_reinspection: true, trigger_value: input.returnRatePct, threshold_value: t, reason: "above_threshold" };
  }
  return withinThreshold(k, input.returnRatePct, t);
}

export function detectWeakRepeatPurchase(input: { repeatPurchasePct: number; industryKey?: string | null }): DepthDetectionResult {
  const k = "ecommerce.weak_repeat_purchase";
  const t = ECOM_REPEAT_PURCHASE_PCT_THRESHOLD;
  if (input.industryKey !== undefined && !checkEcommerce(input.industryKey)) return notApplicable(k, t);
  if (!Number.isFinite(input.repeatPurchasePct) || input.repeatPurchasePct < 0 || input.repeatPurchasePct > 100) return invalid(k, t, "out_of_range");
  if (input.repeatPurchasePct < t) {
    return { metric_key: k, status: "high_risk", severity: input.repeatPurchasePct < 10 ? "severe" : "high", needs_reinspection: true, trigger_value: input.repeatPurchasePct, threshold_value: t, reason: "below_threshold" };
  }
  return withinThreshold(k, input.repeatPurchasePct, t);
}

/* -------- P89 catalog helpers -------- */

export interface ClientSafeDepthMetric {
  industry_key: string;
  label: string;
  gears: ReadonlyArray<DepthGearKey>;
  threshold_value: number | null;
  threshold_unit: DepthMetricDefinition["threshold_unit"];
  client_safe_explanation: string;
  evidence_examples: ReadonlyArray<string>;
  forward_risk: string;
  repair_map_recommendation: string;
  recommended_quick_start_templates: ReadonlyArray<string>;
}

const EVIDENCE_LABEL_BY_SOURCE = new Map(
  DEPTH_EVIDENCE_EXAMPLES.map((e) => [e.source_type, e.label]),
);

const ADMIN_ANNOTATION_BY_METRIC = new Map(
  INDUSTRY_DEPTH_ADMIN_ANNOTATIONS.map((a) => [a.metric_key, a]),
);

function quickStartTitle(key: string): string {
  try {
    return getQuickStartTemplate(key as QuickStartTemplateKey).title;
  } catch {
    return key.replace(/_/g, " ");
  }
}

export function getExpansionMetricsForIndustry(
  industry: string | null | undefined,
): DepthMetricDefinition[] {
  const resolved = resolveDepthIndustryKey(industry);
  if (!resolved) return [];
  return INDUSTRY_DEPTH_EXPANSION_METRICS.filter((m) => m.industry_key === resolved);
}

export function getAllDepthMetricsForIndustry(
  industry: string | null | undefined,
): DepthMetricDefinition[] {
  const base = getDepthMetricsForIndustry(industry);
  const expansion = getExpansionMetricsForIndustry(industry);
  return [...base, ...expansion];
}

export function getDepthMetricAdminAnnotation(
  metricKey: string,
): DepthMetricAdminAnnotation | null {
  return ADMIN_ANNOTATION_BY_METRIC.get(metricKey) ?? null;
}

export function getClientSafeDepthMetric(
  metric: DepthMetricDefinition,
): ClientSafeDepthMetric {
  return {
    industry_key: metric.industry_key,
    label: metric.label,
    gears: metric.gears,
    threshold_value: metric.threshold_value,
    threshold_unit: metric.threshold_unit,
    client_safe_explanation: metric.client_safe_explanation,
    evidence_examples: metric.evidence_examples.map((e) => EVIDENCE_LABEL_BY_SOURCE.get(e) ?? "Manual evidence"),
    forward_risk: metric.forward_risk,
    repair_map_recommendation: metric.repair_map_recommendation,
    recommended_quick_start_templates: metric.recommended_quick_start_templates.map(quickStartTitle),
  };
}

export function getClientSafeDepthMetricsForIndustry(
  industry: string | null | undefined,
): ClientSafeDepthMetric[] {
  return getAllDepthMetricsForIndustry(industry).map(getClientSafeDepthMetric);
}

export function isDepthMetricSourceOfTruthConflictCapable(metricKey: string): boolean {
  return getDepthMetricAdminAnnotation(metricKey)?.source_of_truth_conflict_capable === true;
}

export function getSourceOfTruthConflictCapableDepthMetrics(
  industry?: string | null,
): DepthMetricDefinition[] {
  const metrics = industry ? getAllDepthMetricsForIndustry(industry) : DEPTH_METRICS_ALL.concat(INDUSTRY_DEPTH_EXPANSION_METRICS);
  return metrics.filter((m) => isDepthMetricSourceOfTruthConflictCapable(m.metric_key));
}

export const SOURCE_OF_TRUTH_CONFLICT_REVIEW_HELPER_TEXT =
  "Conflict-capable P89 metrics are discoverable for admin review and should be routed to the existing Source-of-Truth Conflict Flags™ surface when evidence conflicts. They do not auto-create, auto-publish, or replace admin approval.";

/* -------- Data access -------- */

export interface AdminDepthRow {
  id: string;
  customer_id: string;
  industry_key: string;
  metric_key: string;
  metric_label: string;
  gear_key: DepthGearKey;
  trigger_value: number | null;
  threshold_value: number | null;
  status: DepthStatus;
  severity: DepthSeverity;
  needs_reinspection: boolean;
  scoring_impact_type: string;
  scoring_impact_value: number | null;
  evidence_source_type: DepthEvidenceSourceType | null;
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

export interface ClientDepthRow {
  id: string;
  metric_key: string;
  metric_label: string;
  gear_key: DepthGearKey;
  status: DepthStatus;
  severity: DepthSeverity;
  needs_reinspection: boolean;
  trigger_value: number | null;
  threshold_value: number | null;
  client_safe_explanation: string | null;
  reviewed_at: string | null;
}

export async function listAdminDepthReviews(customerId: string): Promise<AdminDepthRow[]> {
  const { data, error } = await (supabase as any)
    .from("industry_operational_depth_reviews")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminDepthRow[];
}

export async function getClientDepthReviews(customerId: string): Promise<ClientDepthRow[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_industry_operational_depth",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientDepthRow[];
}

export interface CreateDepthReviewInput {
  customer_id: string;
  industry_key: string;
  metric_key: string;
  metric_label: string;
  gear_key: DepthGearKey;
  trigger_value: number | null;
  threshold_value: number | null;
  status: DepthStatus;
  severity: DepthSeverity;
  needs_reinspection: boolean;
  evidence_source_type?: DepthEvidenceSourceType | null;
  evidence_label?: string | null;
  admin_notes?: string | null;
  client_safe_explanation?: string | null;
}

export async function createDepthReview(input: CreateDepthReviewInput): Promise<AdminDepthRow> {
  if (!isDepthIndustryKey(input.industry_key)) {
    throw new Error("Industry not supported by RGS Industry Operational Depth™");
  }
  const { data: { user } } = await (supabase as any).auth.getUser();
  const { data, error } = await (supabase as any)
    .from("industry_operational_depth_reviews")
    .insert({
      ...input,
      created_by: user?.id ?? null,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminDepthRow;
}

export async function approveDepthForClient(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("industry_operational_depth_reviews")
    .update({ approved_for_client: true, client_visible: true })
    .eq("id", id);
  if (error) throw error;
}

export async function unapproveDepth(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("industry_operational_depth_reviews")
    .update({ approved_for_client: false, client_visible: false })
    .eq("id", id);
  if (error) throw error;
}
