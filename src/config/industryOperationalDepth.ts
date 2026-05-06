/**
 * P86C — RGS Industry Operational Depth™ registry.
 *
 * Deterministic operational-readiness signals for the industries that
 * were not already covered by P85.5 (Cannabis) and P85.6 (Trades / Home
 * Services). Brings General, Restaurants, Retail, Professional Services,
 * and E-commerce to comparable deterministic depth.
 *
 * RGS speaks operational-readiness only here. Nothing in this file is a
 * legal, tax, accounting, payroll, OSHA, licensing, insurance,
 * fiduciary, valuation, lender-readiness, investor-readiness, audit-
 * readiness, or compliance-certification determination. Connector
 * mentions describe MANUAL EXPORT / UPLOAD only — RGS does not currently
 * maintain live syncs for any of the third-party systems referenced here.
 */

export type DepthIndustryKey =
  | "general_small_business"
  | "restaurant_food_service"
  | "retail"
  | "professional_services"
  | "ecommerce_online_retail";

export const DEPTH_INDUSTRY_KEYS: ReadonlyArray<DepthIndustryKey> = [
  "general_small_business",
  "restaurant_food_service",
  "retail",
  "professional_services",
  "ecommerce_online_retail",
];

/**
 * Aliases mapped to canonical depth keys. Lower-cased exact match.
 */
const INDUSTRY_ALIASES: Record<string, DepthIndustryKey> = {
  general_small_business: "general_small_business",
  general: "general_small_business",
  general_service: "general_small_business",
  other: "general_small_business",
  restaurant: "restaurant_food_service",
  restaurant_food_service: "restaurant_food_service",
  food_service: "restaurant_food_service",
  cafe: "restaurant_food_service",
  retail: "retail",
  brick_and_mortar_retail: "retail",
  professional_services: "professional_services",
  consulting: "professional_services",
  agency: "professional_services",
  law_firm_business_operations: "professional_services",
  accounting_firm_business_operations: "professional_services",
  ecommerce_online_retail: "ecommerce_online_retail",
  ecommerce: "ecommerce_online_retail",
  e_commerce: "ecommerce_online_retail",
  online_retail: "ecommerce_online_retail",
};

export function resolveDepthIndustryKey(
  key: string | null | undefined,
): DepthIndustryKey | null {
  if (!key) return null;
  const k = String(key).toLowerCase().trim();
  return INDUSTRY_ALIASES[k] ?? null;
}

export function isDepthIndustryKey(key: string | null | undefined): boolean {
  return resolveDepthIndustryKey(key) !== null;
}

export type DepthGearKey =
  | "demand_generation"
  | "revenue_conversion"
  | "operational_efficiency"
  | "financial_visibility"
  | "owner_independence";

export type DepthEvidenceSourceType =
  | "quickbooks_manual_export"
  | "xero_manual_export"
  | "freshbooks_manual_export"
  | "stripe_manual_export"
  | "square_manual_export"
  | "paypal_manual_export"
  | "hubspot_manual_export"
  | "salesforce_manual_export"
  | "pipedrive_manual_export"
  | "google_analytics_manual_export"
  | "google_search_console_manual_export"
  | "meta_ads_manual_export"
  | "pos_manual_export"
  | "manual_spreadsheet"
  | "owner_interview"
  | "weekly_review_log"
  | "sop_document"
  | "menu_engineering_sheet"
  | "daily_sales_log"
  | "inventory_count_sheet"
  | "category_margin_report"
  | "engagement_letter"
  | "scope_change_log"
  | "utilization_log"
  | "ar_aging_report"
  | "fulfillment_log"
  | "return_log"
  | "shipping_carrier_export"
  | "shopify_manual_export"
  | "woocommerce_manual_export"
  | "amazon_seller_manual_export"
  | "other_manual_upload";

export interface DepthEvidenceExample {
  source_type: DepthEvidenceSourceType;
  label: string;
  /** True only when a real live integration exists. None do in P86C. */
  live_connector: false;
}

export const DEPTH_EVIDENCE_EXAMPLES: ReadonlyArray<DepthEvidenceExample> = [
  { source_type: "quickbooks_manual_export", label: "QuickBooks export (manual upload)", live_connector: false },
  { source_type: "xero_manual_export", label: "Xero export (manual upload)", live_connector: false },
  { source_type: "freshbooks_manual_export", label: "FreshBooks export (manual upload)", live_connector: false },
  { source_type: "stripe_manual_export", label: "Stripe export (manual upload)", live_connector: false },
  { source_type: "square_manual_export", label: "Square export (manual upload)", live_connector: false },
  { source_type: "paypal_manual_export", label: "PayPal export (manual upload)", live_connector: false },
  { source_type: "hubspot_manual_export", label: "HubSpot export (manual upload)", live_connector: false },
  { source_type: "salesforce_manual_export", label: "Salesforce export (manual upload)", live_connector: false },
  { source_type: "pipedrive_manual_export", label: "Pipedrive export (manual upload)", live_connector: false },
  { source_type: "google_analytics_manual_export", label: "Google Analytics export (manual upload)", live_connector: false },
  { source_type: "google_search_console_manual_export", label: "Google Search Console export (manual upload)", live_connector: false },
  { source_type: "meta_ads_manual_export", label: "Meta Ads export (manual upload)", live_connector: false },
  { source_type: "pos_manual_export", label: "POS export (manual upload)", live_connector: false },
  { source_type: "manual_spreadsheet", label: "Manual spreadsheet", live_connector: false },
  { source_type: "owner_interview", label: "Owner interview", live_connector: false },
  { source_type: "weekly_review_log", label: "Weekly review log", live_connector: false },
  { source_type: "sop_document", label: "SOP document", live_connector: false },
  { source_type: "menu_engineering_sheet", label: "Menu engineering sheet", live_connector: false },
  { source_type: "daily_sales_log", label: "Daily sales log", live_connector: false },
  { source_type: "inventory_count_sheet", label: "Inventory count sheet", live_connector: false },
  { source_type: "category_margin_report", label: "Category margin report", live_connector: false },
  { source_type: "engagement_letter", label: "Engagement letter", live_connector: false },
  { source_type: "scope_change_log", label: "Scope change log", live_connector: false },
  { source_type: "utilization_log", label: "Utilization log", live_connector: false },
  { source_type: "ar_aging_report", label: "A/R aging report (manual upload)", live_connector: false },
  { source_type: "fulfillment_log", label: "Fulfillment log", live_connector: false },
  { source_type: "return_log", label: "Return log", live_connector: false },
  { source_type: "shipping_carrier_export", label: "Shipping carrier export (manual upload)", live_connector: false },
  { source_type: "shopify_manual_export", label: "Shopify export (manual upload)", live_connector: false },
  { source_type: "woocommerce_manual_export", label: "WooCommerce export (manual upload)", live_connector: false },
  { source_type: "amazon_seller_manual_export", label: "Amazon Seller export (manual upload)", live_connector: false },
  { source_type: "other_manual_upload", label: "Other manual upload", live_connector: false },
];

/**
 * Forbidden client-facing claims. RGS Industry Operational Depth™ never
 * speaks in legal, tax, accounting, payroll, OSHA, licensing, insurance,
 * fiduciary, valuation, lender, investor, audit-readiness, or compliance
 * certification language. Matched case-insensitively as substrings.
 */
export const DEPTH_FORBIDDEN_CLAIMS: ReadonlyArray<string> = [
  "legal compliance",
  "tax compliance",
  "accounting compliance",
  "regulatory assurance",
  "audit readiness",
  "audit-ready",
  "lender-ready",
  "investor-ready",
  "fiduciary",
  "valuation opinion",
  "appraisal opinion",
  "osha compliance",
  "labor law",
  "labor-law",
  "wage violation",
  "license violation",
  "licensing compliance",
  "insurance compliance",
  "guaranteed savings",
  "guaranteed profit",
  "guaranteed revenue",
  "guaranteed results",
  "enforcement protection",
  "compliance certification",
  "compliance certified",
  "hipaa",
  "patient care",
  "medical claims",
];

export function findDepthForbiddenPhrase(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const lc = text.toLowerCase();
  for (const phrase of DEPTH_FORBIDDEN_CLAIMS) {
    if (lc.includes(phrase.toLowerCase())) return phrase;
  }
  return null;
}

export const DEPTH_CLIENT_SAFE_EXPLANATION =
  "RGS Industry Operational Depth™ signals are operational-readiness and " +
  "business-stability indicators. They do not determine legal, tax, accounting, " +
  "payroll, licensing, insurance, audit, lender, or investor matters, and they " +
  "are not a substitute for qualified professional advice in those areas.";

export const DEPTH_REPORT_SAFE_LANGUAGE = DEPTH_CLIENT_SAFE_EXPLANATION;

export const DEPTH_ADMIN_INTERPRETATION =
  "Use to surface deterministic operational-readiness gaps that are evidence-" +
  "based and industry-aware. Treat as operational-readiness signals only. " +
  "Request manual evidence (export / upload) before approving for client " +
  "visibility. RGS does not maintain live syncs for the third-party systems " +
  "referenced (QuickBooks, Xero, FreshBooks, Stripe, Square, PayPal, HubSpot, " +
  "Salesforce, Pipedrive, Google Analytics, Google Search Console, Meta Ads, " +
  "Shopify, WooCommerce, Amazon Seller).";

export interface DepthMetricDefinition {
  metric_key: string;
  industry_key: DepthIndustryKey;
  label: string;
  gears: ReadonlyArray<DepthGearKey>;
  trigger_rule: string;
  threshold_value: number | null;
  threshold_unit: "percent" | "count" | "ratio" | "boolean" | "days" | null;
  client_safe_explanation: string;
  evidence_examples: ReadonlyArray<DepthEvidenceSourceType>;
  forward_risk: string;
  repair_map_recommendation: string;
  recommended_quick_start_templates: ReadonlyArray<string>;
}

/* ============================================================
 * General Small Business
 * ============================================================ */

const GENERAL_METRICS: DepthMetricDefinition[] = [
  {
    metric_key: "general.no_weekly_review",
    industry_key: "general_small_business",
    label: "Missing Weekly Review Rhythm",
    gears: ["owner_independence", "operational_efficiency"],
    trigger_rule:
      "If the business reports no weekly review rhythm, RGS triggers Missing Weekly Review Rhythm.",
    threshold_value: null,
    threshold_unit: "boolean",
    client_safe_explanation:
      "Without a weekly review rhythm, problems compound before anyone sees them. RGS flags this as an operational-readiness gap.",
    evidence_examples: ["weekly_review_log", "owner_interview", "manual_spreadsheet"],
    forward_risk:
      "Without weekly review, slipping metrics, missed follow-ups, and cash surprises accumulate quietly.",
    repair_map_recommendation:
      "Install Weekly Scoreboard™ and 30-minute weekly review block.",
    recommended_quick_start_templates: ["weekly_scoreboard"],
  },
  {
    metric_key: "general.owner_is_bottleneck",
    industry_key: "general_small_business",
    label: "Owner Bottleneck",
    gears: ["owner_independence"],
    trigger_rule:
      "If owner is reported as the sole decision-maker for daily operations, RGS triggers Owner Bottleneck.",
    threshold_value: null,
    threshold_unit: "boolean",
    client_safe_explanation:
      "When the owner is the only person who can make daily operating decisions, the business cannot run without them. This is an owner-independence risk.",
    evidence_examples: ["owner_interview", "sop_document"],
    forward_risk:
      "Owner bottleneck caps growth and creates risk if the owner is unavailable.",
    repair_map_recommendation:
      "Install Role Clarity Sheet™ and decision-rights worksheet.",
    recommended_quick_start_templates: ["role_clarity_sheet"],
  },
  {
    metric_key: "general.no_profit_visibility",
    industry_key: "general_small_business",
    label: "No Profit Visibility",
    gears: ["financial_visibility"],
    trigger_rule:
      "If owner cannot see profit at least monthly, RGS triggers No Profit Visibility.",
    threshold_value: null,
    threshold_unit: "boolean",
    client_safe_explanation:
      "When profit is not visible at least monthly, pricing and spending decisions are made without information.",
    evidence_examples: ["quickbooks_manual_export", "xero_manual_export", "manual_spreadsheet"],
    forward_risk:
      "Without monthly profit visibility, margin erosion is invisible until cash runs short.",
    repair_map_recommendation:
      "Install monthly profit review and Daily Cash Count™.",
    recommended_quick_start_templates: ["daily_cash_count", "weekly_scoreboard"],
  },
];

/* ============================================================
 * Restaurants / Food Service
 * ============================================================ */

export const RESTAURANT_FOOD_COST_PCT_THRESHOLD = 33; // > 33%
export const RESTAURANT_LABOR_COST_PCT_THRESHOLD = 32; // > 32%
export const RESTAURANT_GROSS_MARGIN_PCT_THRESHOLD = 60; // < 60%
export const RESTAURANT_VENDOR_COST_CHANGE_PCT_THRESHOLD = 5; // >= 5%

const RESTAURANT_METRICS: DepthMetricDefinition[] = [
  {
    metric_key: "restaurant.food_cost_creep",
    industry_key: "restaurant_food_service",
    label: "Food Cost Creep",
    gears: ["financial_visibility", "operational_efficiency"],
    trigger_rule:
      "If food cost % is greater than 33%, RGS triggers Food Cost Creep. Exactly 33% does not trigger.",
    threshold_value: RESTAURANT_FOOD_COST_PCT_THRESHOLD,
    threshold_unit: "percent",
    client_safe_explanation:
      "Food cost above 33% of sales erodes margin even when sales look healthy. RGS flags this as a financial-visibility signal.",
    evidence_examples: ["pos_manual_export", "quickbooks_manual_export", "menu_engineering_sheet", "manual_spreadsheet"],
    forward_risk:
      "Sustained food cost creep quietly cuts contribution margin per cover.",
    repair_map_recommendation:
      "Install menu-mix margin review and vendor cost-line audit.",
    recommended_quick_start_templates: ["menu_margin_tracker"],
  },
  {
    metric_key: "restaurant.labor_out_of_control",
    industry_key: "restaurant_food_service",
    label: "Labor Out of Control",
    gears: ["operational_efficiency", "financial_visibility"],
    trigger_rule:
      "If labor cost % is greater than 32%, RGS triggers Labor Out of Control. Exactly 32% does not trigger.",
    threshold_value: RESTAURANT_LABOR_COST_PCT_THRESHOLD,
    threshold_unit: "percent",
    client_safe_explanation:
      "Labor above 32% of sales typically signals scheduling drift or daypart over-staffing. This is an operational-readiness signal only.",
    evidence_examples: ["pos_manual_export", "quickbooks_manual_export", "manual_spreadsheet"],
    forward_risk:
      "Persistent labor drift consumes margin and hides daypart inefficiency.",
    repair_map_recommendation:
      "Install daily labor cap by daypart and weekly schedule review.",
    recommended_quick_start_templates: ["daily_sales_and_labor_log"],
  },
  {
    metric_key: "restaurant.high_sales_weak_margin",
    industry_key: "restaurant_food_service",
    label: "High Sales / Weak Margin",
    gears: ["financial_visibility"],
    trigger_rule:
      "If gross margin % is less than 60%, RGS triggers High Sales / Weak Margin.",
    threshold_value: RESTAURANT_GROSS_MARGIN_PCT_THRESHOLD,
    threshold_unit: "percent",
    client_safe_explanation:
      "Strong sales with weak margin usually means menu mix or pricing is not aligned with cost structure.",
    evidence_examples: ["menu_engineering_sheet", "category_margin_report", "pos_manual_export"],
    forward_risk:
      "Without menu/category margin visibility, top-line growth can mask shrinking profit.",
    repair_map_recommendation:
      "Run menu-mix analysis and reprice or remove bottom-margin items.",
    recommended_quick_start_templates: ["menu_margin_tracker"],
  },
  {
    metric_key: "restaurant.vendor_cost_change_not_reviewed",
    industry_key: "restaurant_food_service",
    label: "Vendor Cost Change Not Reviewed",
    gears: ["financial_visibility"],
    trigger_rule:
      "If vendor cost change is at or above 5% and pricing has not been reviewed, RGS triggers Vendor Cost Change Not Reviewed.",
    threshold_value: RESTAURANT_VENDOR_COST_CHANGE_PCT_THRESHOLD,
    threshold_unit: "percent",
    client_safe_explanation:
      "Vendor cost moves of 5% or more can quietly erase per-item profit if menu pricing is not reviewed.",
    evidence_examples: ["menu_engineering_sheet", "manual_spreadsheet", "pos_manual_export"],
    forward_risk:
      "Unreviewed vendor cost changes silently move pricing out of alignment.",
    repair_map_recommendation:
      "Review vendor cost changes against menu pricing before reorder decisions.",
    recommended_quick_start_templates: ["menu_margin_tracker"],
  },
];

/* ============================================================
 * Retail
 * ============================================================ */

export const RETAIL_INVENTORY_TURNOVER_THRESHOLD = 4; // < 4
export const RETAIL_DEAD_STOCK_HIGH_THRESHOLD = 10000; // >= 10000
export const RETAIL_RETURN_RATE_PCT_THRESHOLD = 8; // > 8%

const RETAIL_METRICS: DepthMetricDefinition[] = [
  {
    metric_key: "retail.dead_inventory",
    industry_key: "retail",
    label: "Dead Inventory",
    gears: ["operational_efficiency", "financial_visibility"],
    trigger_rule:
      "If reported dead-stock value is greater than 0, RGS triggers Dead Inventory. Severity escalates at $10,000 or more.",
    threshold_value: RETAIL_DEAD_STOCK_HIGH_THRESHOLD,
    threshold_unit: "count",
    client_safe_explanation:
      "Non-moving inventory ties up working capital and shelf space without producing revenue.",
    evidence_examples: ["inventory_count_sheet", "pos_manual_export", "manual_spreadsheet"],
    forward_risk:
      "Dead inventory grows quietly and absorbs cash that could fund top sellers.",
    repair_map_recommendation:
      "Mark down or liquidate non-moving SKUs and tighten reorder rules.",
    recommended_quick_start_templates: ["dead_stock_liquidation_plan"],
  },
  {
    metric_key: "retail.slow_inventory_turnover",
    industry_key: "retail",
    label: "Slow Inventory Turnover",
    gears: ["operational_efficiency"],
    trigger_rule:
      "If inventory turnover is less than 4x, RGS triggers Slow Inventory Turnover.",
    threshold_value: RETAIL_INVENTORY_TURNOVER_THRESHOLD,
    threshold_unit: "ratio",
    client_safe_explanation:
      "Inventory turning fewer than 4 times per year usually means buying patterns are out of step with sales velocity.",
    evidence_examples: ["pos_manual_export", "inventory_count_sheet", "manual_spreadsheet"],
    forward_risk:
      "Slow turnover ages inventory and increases markdown risk.",
    repair_map_recommendation:
      "Cut reorder quantities on slow SKUs and double down on top sellers.",
    recommended_quick_start_templates: ["dead_stock_liquidation_plan"],
  },
  {
    metric_key: "retail.high_return_rate",
    industry_key: "retail",
    label: "High Return Rate",
    gears: ["operational_efficiency", "revenue_conversion"],
    trigger_rule:
      "If return rate % is greater than 8%, RGS triggers High Return Rate.",
    threshold_value: RETAIL_RETURN_RATE_PCT_THRESHOLD,
    threshold_unit: "percent",
    client_safe_explanation:
      "A return rate above 8% suggests product, sizing, or expectation gaps that quietly erode realized revenue.",
    evidence_examples: ["pos_manual_export", "return_log", "manual_spreadsheet"],
    forward_risk:
      "High return rates inflate revenue figures while quietly draining margin and operating capacity.",
    repair_map_recommendation:
      "Install Return Reason Log™ and weekly category review.",
    recommended_quick_start_templates: ["category_margin_review"],
  },
  {
    metric_key: "retail.no_category_margin",
    industry_key: "retail",
    label: "No Category Margin Visibility",
    gears: ["financial_visibility"],
    trigger_rule:
      "If the business cannot report margin by category, RGS triggers No Category Margin Visibility.",
    threshold_value: null,
    threshold_unit: "boolean",
    client_safe_explanation:
      "Without category margin visibility, high-revenue categories can hide low-profit ones.",
    evidence_examples: ["category_margin_report", "pos_manual_export", "manual_spreadsheet"],
    forward_risk:
      "Pricing and buying decisions made without category margin tend to drift toward lower profit over time.",
    repair_map_recommendation:
      "Install Category Margin Review™ and quarterly assortment review.",
    recommended_quick_start_templates: ["category_margin_review"],
  },
];

/* ============================================================
 * Professional Services
 * ============================================================ */

export const PROF_UTILIZATION_PCT_THRESHOLD = 60; // < 60%
export const PROF_AR_DAYS_THRESHOLD = 45; // > 45 days
export const PROF_SCOPE_CHANGE_RATE_THRESHOLD = 25; // > 25%

const PROFESSIONAL_METRICS: DepthMetricDefinition[] = [
  {
    metric_key: "professional.low_billable_utilization",
    industry_key: "professional_services",
    label: "Low Billable Utilization",
    gears: ["financial_visibility", "operational_efficiency"],
    trigger_rule:
      "If average billable utilization is less than 60%, RGS triggers Low Billable Utilization.",
    threshold_value: PROF_UTILIZATION_PCT_THRESHOLD,
    threshold_unit: "percent",
    client_safe_explanation:
      "When billable utilization runs below 60%, the team is busy but not converting paid hours into revenue.",
    evidence_examples: ["utilization_log", "manual_spreadsheet", "quickbooks_manual_export"],
    forward_risk:
      "Sustained low utilization quietly erodes margin and obscures real capacity for new work.",
    repair_map_recommendation:
      "Install Weekly Utilization Review™ and project-load rebalance.",
    recommended_quick_start_templates: ["utilization_tracker"],
  },
  {
    metric_key: "professional.scope_creep_unmanaged",
    industry_key: "professional_services",
    label: "Unmanaged Scope Creep",
    gears: ["revenue_conversion", "financial_visibility"],
    trigger_rule:
      "If projects with scope changes have a scope-change rate greater than 25% and no signed change orders, RGS triggers Unmanaged Scope Creep.",
    threshold_value: PROF_SCOPE_CHANGE_RATE_THRESHOLD,
    threshold_unit: "percent",
    client_safe_explanation:
      "Unmanaged scope changes deliver work that is rarely billed at full value.",
    evidence_examples: ["scope_change_log", "engagement_letter", "manual_spreadsheet"],
    forward_risk:
      "Without change-order discipline, project margin erodes one small request at a time.",
    repair_map_recommendation:
      "Install Scope Change Log™ and change-order template.",
    recommended_quick_start_templates: ["scope_change_log"],
  },
  {
    metric_key: "professional.ar_aging_drag",
    industry_key: "professional_services",
    label: "A/R Aging Drag",
    gears: ["financial_visibility", "operational_efficiency"],
    trigger_rule:
      "If average A/R days is greater than 45, RGS triggers A/R Aging Drag.",
    threshold_value: PROF_AR_DAYS_THRESHOLD,
    threshold_unit: "days",
    client_safe_explanation:
      "Receivables aging past 45 days strain cash flow and signal a follow-up gap, not a client problem.",
    evidence_examples: ["ar_aging_report", "quickbooks_manual_export", "xero_manual_export"],
    forward_risk:
      "A/R drag hides revenue that has already been earned but cannot be deployed.",
    repair_map_recommendation:
      "Install weekly A/R review and dunning cadence.",
    recommended_quick_start_templates: ["ar_aging_review"],
  },
];

/* ============================================================
 * E-commerce / Online Retail
 * ============================================================ */

export const ECOM_FULFILLMENT_SLA_HOURS_THRESHOLD = 48; // > 48h
export const ECOM_RETURN_RATE_PCT_THRESHOLD = 10; // > 10%
export const ECOM_REPEAT_PURCHASE_PCT_THRESHOLD = 20; // < 20%

const ECOMMERCE_METRICS: DepthMetricDefinition[] = [
  {
    metric_key: "ecommerce.fulfillment_sla_drift",
    industry_key: "ecommerce_online_retail",
    label: "Fulfillment SLA Drift",
    gears: ["operational_efficiency", "revenue_conversion"],
    trigger_rule:
      "If average ship-time exceeds 48 hours, RGS triggers Fulfillment SLA Drift.",
    threshold_value: ECOM_FULFILLMENT_SLA_HOURS_THRESHOLD,
    threshold_unit: "days",
    client_safe_explanation:
      "Average ship-time over 48 hours typically increases support tickets and chargebacks. This is an operational-readiness signal only.",
    evidence_examples: ["fulfillment_log", "shopify_manual_export", "woocommerce_manual_export", "amazon_seller_manual_export", "shipping_carrier_export"],
    forward_risk:
      "Fulfillment drift compounds into refund risk and review damage.",
    repair_map_recommendation:
      "Install Fulfillment SLA Tracker™ and daily ship-floor review.",
    recommended_quick_start_templates: ["fulfillment_sla_tracker"],
  },
  {
    metric_key: "ecommerce.high_return_rate",
    industry_key: "ecommerce_online_retail",
    label: "High Return Rate (E-commerce)",
    gears: ["operational_efficiency", "revenue_conversion"],
    trigger_rule:
      "If e-commerce return rate exceeds 10%, RGS triggers High Return Rate (E-commerce).",
    threshold_value: ECOM_RETURN_RATE_PCT_THRESHOLD,
    threshold_unit: "percent",
    client_safe_explanation:
      "Online return rates above 10% usually point to listing, sizing, or fulfillment quality gaps.",
    evidence_examples: ["return_log", "shopify_manual_export", "woocommerce_manual_export", "amazon_seller_manual_export"],
    forward_risk:
      "Sustained return drag inflates top-line revenue while quietly cutting net contribution.",
    repair_map_recommendation:
      "Install Return Reason Log™ and listing/quality review per top SKU.",
    recommended_quick_start_templates: ["return_reason_log"],
  },
  {
    metric_key: "ecommerce.weak_repeat_purchase",
    industry_key: "ecommerce_online_retail",
    label: "Weak Repeat Purchase Rate",
    gears: ["demand_generation", "revenue_conversion"],
    trigger_rule:
      "If repeat-purchase rate is below 20%, RGS triggers Weak Repeat Purchase Rate.",
    threshold_value: ECOM_REPEAT_PURCHASE_PCT_THRESHOLD,
    threshold_unit: "percent",
    client_safe_explanation:
      "Repeat-purchase below 20% usually means the business is renting customers from ad platforms instead of building a base.",
    evidence_examples: ["shopify_manual_export", "woocommerce_manual_export", "amazon_seller_manual_export", "manual_spreadsheet"],
    forward_risk:
      "Without repeat purchase, customer-acquisition cost dominates and stability depends on paid traffic.",
    repair_map_recommendation:
      "Install Repeat-Purchase Tracker™ and post-purchase email/SMS sequence audit.",
    recommended_quick_start_templates: ["repeat_purchase_tracker"],
  },
];

export const DEPTH_METRICS_BY_INDUSTRY: Record<DepthIndustryKey, DepthMetricDefinition[]> = {
  general_small_business: GENERAL_METRICS,
  restaurant_food_service: RESTAURANT_METRICS,
  retail: RETAIL_METRICS,
  professional_services: PROFESSIONAL_METRICS,
  ecommerce_online_retail: ECOMMERCE_METRICS,
};

export const DEPTH_METRICS_ALL: DepthMetricDefinition[] = [
  ...GENERAL_METRICS,
  ...RESTAURANT_METRICS,
  ...RETAIL_METRICS,
  ...PROFESSIONAL_METRICS,
  ...ECOMMERCE_METRICS,
];

export function getDepthMetricsForIndustry(
  key: string | null | undefined,
): DepthMetricDefinition[] {
  const k = resolveDepthIndustryKey(key);
  if (!k) return [];
  return DEPTH_METRICS_BY_INDUSTRY[k];
}

export function getDepthMetricDefinition(
  metricKey: string,
): DepthMetricDefinition {
  const m = DEPTH_METRICS_ALL.find((x) => x.metric_key === metricKey);
  if (!m) throw new Error(`Unknown depth metric: ${metricKey}`);
  return m;
}

export const INDUSTRY_OPERATIONAL_DEPTH_CONFIG = {
  industry_keys: DEPTH_INDUSTRY_KEYS,
  metrics_by_industry: DEPTH_METRICS_BY_INDUSTRY,
  metrics_all: DEPTH_METRICS_ALL,
  client_safe_explanation: DEPTH_CLIENT_SAFE_EXPLANATION,
  report_safe_language: DEPTH_REPORT_SAFE_LANGUAGE,
  admin_interpretation: DEPTH_ADMIN_INTERPRETATION,
  forbidden_claims: DEPTH_FORBIDDEN_CLAIMS,
  allowed_evidence_examples: DEPTH_EVIDENCE_EXAMPLES,
} as const;