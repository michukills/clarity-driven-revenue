/**
 * P12.2 — Connected Source Strategy & Field-Mapped Integration Planning.
 *
 * This module is *planning architecture*, not execution. It defines, in
 * code, the discipline future connector implementations must respect:
 *
 *   1. Connector priority ladder
 *   2. Owned-truth matrix (what each source owns best)
 *   3. Field mapping registry (source → RGS OS destination)
 *   4. Verification policy matrix (per data class)
 *   5. Sync strategy matrix (how each domain is kept fresh)
 *   6. Do-not-ingest rules (explicit noise prevention)
 *
 * These artifacts are typed, query-able, and rendered into a compact
 * admin surface so the planning layer is real product structure — not a
 * doc that drifts. Future connector code is expected to read from this
 * registry to decide trust handling, sync cadence, and what to ignore.
 */
 
// ─────────────────────────────────────────────────────────────────────────────
// Core types
// ─────────────────────────────────────────────────────────────────────────────
 
export type ConnectorId =
  | "quickbooks"
  | "hubspot"
  | "ga4"
  | "paycom"
  | "stripe"
  | "jobber"
  | "housecall_pro"
  // P12.4.C.2 — expanded request-only catalog (no live sync yet).
  | "xero"
  | "freshbooks"
  | "square"
  | "paypal"
  | "salesforce"
  | "pipedrive"
  | "google_search_console"
  | "meta_ads"
  | "adp"
  | "gusto"
  | "servicetitan";
 
export type ConnectorPriority = "tier_1" | "tier_2" | "tier_3";
 
export type IndustryRelevance =
  | "horizontal" // applies broadly
  | "trades_home_services"
  | "digital_acquisition_heavy"
  | "labor_cost_material"
  | "subscription_or_recurring";
 
export type TruthRole =
  | "source_of_truth"      // this connector authoritatively owns the field
  | "imported_supporting"  // useful, but not authoritative; supports modeling
  | "advisory_only";       // observed, never used to overwrite RGS state
 
export type VerificationPolicy =
  | "auto_trust"            // import directly into active state
  | "client_verify"         // staged until client confirms
  | "admin_review"          // staged until RGS reviews
  | "local_only_until_confirmed" // store but do not influence anything yet
  | "do_not_import";        // explicit noise rule — see noiseExclusions
 
export type SyncMode =
  | "one_time_import"
  | "manual"
  | "recurring"
  | "on_demand_refresh"
  | "immutable_snapshot";
 
export type WriteSemantics = "append_only" | "update_in_place" | "no_writeback";
 
export type ConflictHandling =
  | "rgs_wins"              // OS state always wins on conflict
  | "source_wins"           // remote system wins
  | "stage_for_review"      // do not auto-resolve
  | "not_applicable";
 
export type MappingConfidence = "high" | "medium" | "low";
 
// ─────────────────────────────────────────────────────────────────────────────
// 1. Connector priority ladder
// ─────────────────────────────────────────────────────────────────────────────
 
export interface ConnectorPlan {
  id: ConnectorId;
  label: string;
  priority: ConnectorPriority;
  /** What this source owns best — short prose for admin scanning. */
  ownedTruthSummary: string;
  /** Which RGS OS modules will consume this source. */
  consumingModules: string[];
  industry: IndustryRelevance[];
  /** One-line strategic note: when is this connector worth turning on? */
  whenToActivate: string;
  /**
   * P12.4.C.2 — true when this connector is in the client-facing catalog
   * but does not yet have field mappings / sync strategy. Validation,
   * mapping completeness checks, and sync planners must skip these.
   */
  requestOnly?: boolean;
}
 
export const CONNECTOR_PLANS: ConnectorPlan[] = [
  {
    id: "quickbooks",
    label: "QuickBooks",
    priority: "tier_1",
    ownedTruthSummary:
      "Authoritative accounting truth: revenue, expenses, AR, AP, invoices, GL.",
    consumingModules: [
      "Business Control Center",
      "Cash Position & Obligations",
      "Monthly Close",
      "Revenue Review",
      "Profitability",
    ],
    industry: ["horizontal"],
    whenToActivate:
      "Activate first for any client whose accounting lives in QuickBooks — it grounds nearly every financial signal in the OS.",
  },
  {
    id: "stripe",
    label: "Stripe",
    priority: "tier_1",
    ownedTruthSummary:
      "Payment-level truth: charges, refunds, subscription state, recurring revenue cadence.",
    consumingModules: [
      "Cash Position & Obligations",
      "Revenue Review",
      "Acquisition / Recurring Revenue",
    ],
    industry: ["subscription_or_recurring", "digital_acquisition_heavy"],
    whenToActivate:
      "Activate when the client takes online payments or runs subscriptions — Stripe is more authoritative than QuickBooks for payment timing.",
  },
  {
    id: "hubspot",
    label: "HubSpot",
    priority: "tier_1",
    ownedTruthSummary:
      "Lead, deal, and pipeline movement truth — including stage transitions and source attribution.",
    consumingModules: ["Acquisition", "Client Sales Pipeline", "Insight Signals"],
    industry: ["horizontal", "digital_acquisition_heavy"],
    whenToActivate:
      "Activate when the client manages sales/marketing in HubSpot — replaces manual pipeline entry.",
  },
  {
    id: "ga4",
    label: "Google Analytics (GA4)",
    priority: "tier_2",
    ownedTruthSummary:
      "Traffic, source/medium, and conversion event truth — top-of-funnel visibility only.",
    consumingModules: ["Acquisition"],
    industry: ["digital_acquisition_heavy"],
    whenToActivate:
      "Activate only when digital acquisition is material. Otherwise it's noise.",
  },
  {
    id: "paycom",
    label: "Paycom",
    priority: "tier_2",
    ownedTruthSummary:
      "Payroll cost, headcount, and labor-cost-of-revenue truth.",
    consumingModules: ["Profitability", "Operations", "Business Control Center"],
    industry: ["labor_cost_material"],
    whenToActivate:
      "Activate when labor cost is a meaningful share of revenue (services, trades, ops-heavy businesses).",
  },
  {
    id: "jobber",
    label: "Jobber",
    priority: "tier_3",
    ownedTruthSummary:
      "Field-ops truth: jobs, estimates, scheduling, dispatch, completion.",
    consumingModules: ["Operations", "Acquisition", "Revenue Review"],
    industry: ["trades_home_services"],
    whenToActivate:
      "Activate for trades / home-services clients running their ops in Jobber.",
  },
  {
    id: "housecall_pro",
    label: "Housecall Pro",
    priority: "tier_3",
    ownedTruthSummary:
      "Field-ops truth equivalent to Jobber for Housecall-Pro shops.",
    consumingModules: ["Operations", "Acquisition", "Revenue Review"],
    industry: ["trades_home_services"],
    whenToActivate:
      "Activate when the client uses Housecall Pro instead of Jobber — do not enable both.",
  },
  // ── P12.4.C.2 — expanded client-facing catalog (request-only) ──────────────
  {
    id: "xero",
    label: "Xero",
    priority: "tier_1",
    ownedTruthSummary:
      "Accounting truth: invoices, expenses, revenue history when books live in Xero.",
    consumingModules: ["Business Control Center", "Revenue Review", "Profitability"],
    industry: ["horizontal"],
    whenToActivate: "Activate when the client's books live in Xero instead of QuickBooks.",
    requestOnly: true,
  },
  {
    id: "freshbooks",
    label: "FreshBooks",
    priority: "tier_2",
    ownedTruthSummary:
      "Service-business accounting: invoices, expenses, time-billed revenue.",
    consumingModules: ["Business Control Center", "Revenue Review"],
    industry: ["horizontal"],
    whenToActivate: "Activate for service-led shops invoicing in FreshBooks.",
    requestOnly: true,
  },
  {
    id: "square",
    label: "Square",
    priority: "tier_1",
    ownedTruthSummary:
      "Payments, transactions, refunds, payout timing for in-person and online sales.",
    consumingModules: ["Cash Position & Obligations", "Revenue Review"],
    industry: ["horizontal"],
    whenToActivate: "Activate when the client takes Square payments in-person or online.",
    requestOnly: true,
  },
  {
    id: "paypal",
    label: "PayPal",
    priority: "tier_2",
    ownedTruthSummary:
      "PayPal payments, refunds, and payout timing for online sales.",
    consumingModules: ["Cash Position & Obligations", "Revenue Review"],
    industry: ["horizontal"],
    whenToActivate: "Activate when material revenue flows through PayPal.",
    requestOnly: true,
  },
  {
    id: "salesforce",
    label: "Salesforce",
    priority: "tier_1",
    ownedTruthSummary:
      "Pipeline, deals, stages, and sales activity when the team runs on Salesforce.",
    consumingModules: ["Acquisition", "Client Sales Pipeline", "Insight Signals"],
    industry: ["horizontal", "digital_acquisition_heavy"],
    whenToActivate: "Activate when sales operations live in Salesforce.",
    requestOnly: true,
  },
  {
    id: "pipedrive",
    label: "Pipedrive",
    priority: "tier_2",
    ownedTruthSummary:
      "Pipeline, deals, stage transitions for teams running Pipedrive.",
    consumingModules: ["Client Sales Pipeline", "Acquisition"],
    industry: ["horizontal"],
    whenToActivate: "Activate when the client uses Pipedrive instead of HubSpot/Salesforce.",
    requestOnly: true,
  },
  {
    id: "google_search_console",
    label: "Google Search Console",
    priority: "tier_2",
    ownedTruthSummary:
      "Search visibility: queries, landing pages, impressions, click-through.",
    consumingModules: ["Acquisition"],
    industry: ["digital_acquisition_heavy"],
    whenToActivate: "Activate when organic search is a real acquisition channel.",
    requestOnly: true,
  },
  {
    id: "meta_ads",
    label: "Meta Ads (Facebook / Instagram)",
    priority: "tier_2",
    ownedTruthSummary:
      "Paid acquisition spend, campaigns, lead and conversion signals.",
    consumingModules: ["Acquisition"],
    industry: ["digital_acquisition_heavy"],
    whenToActivate: "Activate when the client runs material spend on Meta Ads.",
    requestOnly: true,
  },
  {
    id: "adp",
    label: "ADP",
    priority: "tier_2",
    ownedTruthSummary:
      "Payroll cost, headcount, labor cost truth when payroll runs on ADP.",
    consumingModules: ["Profitability", "Operations", "Business Control Center"],
    industry: ["labor_cost_material"],
    whenToActivate: "Activate when payroll runs on ADP instead of Paycom.",
    requestOnly: true,
  },
  {
    id: "gusto",
    label: "Gusto",
    priority: "tier_2",
    ownedTruthSummary:
      "Payroll, headcount, and labor cost for SMB-sized teams running Gusto.",
    consumingModules: ["Profitability", "Operations", "Business Control Center"],
    industry: ["labor_cost_material"],
    whenToActivate: "Activate for SMB clients running payroll on Gusto.",
    requestOnly: true,
  },
  {
    id: "servicetitan",
    label: "ServiceTitan",
    priority: "tier_3",
    ownedTruthSummary:
      "Field jobs, estimates, scheduling, booked vs. completed work for trades shops on ServiceTitan.",
    consumingModules: ["Operations", "Acquisition", "Revenue Review"],
    industry: ["trades_home_services"],
    whenToActivate: "Activate for trades clients running ServiceTitan instead of Jobber/Housecall.",
    requestOnly: true,
  },
];
 
// ─────────────────────────────────────────────────────────────────────────────
// 2. Field mapping registry
// ─────────────────────────────────────────────────────────────────────────────
 
export interface FieldMapping {
  connector: ConnectorId;
  /** Stable label of the source field. */
  sourceField: string;
  /** Module in the RGS OS that consumes this field. */
  destinationModule: string;
  /** Logical entity within that module. */
  destinationEntity: string;
  /** Field within that entity. */
  destinationField: string;
  truthRole: TruthRole;
  verification: VerificationPolicy;
  confidence: MappingConfidence;
  /** Optional one-line note for admins. */
  note?: string;
}
 
export const FIELD_MAPPINGS: FieldMapping[] = [
  // QuickBooks ────────────────────────────────────────────────────────────────
  {
    connector: "quickbooks",
    sourceField: "Invoice.TotalAmt",
    destinationModule: "Business Control Center",
    destinationEntity: "revenue_entries",
    destinationField: "amount",
    truthRole: "source_of_truth",
    verification: "auto_trust",
    confidence: "high",
    note: "Exact totals on closed invoices auto-trust.",
  },
  {
    connector: "quickbooks",
    sourceField: "Invoice.DueDate / Balance",
    destinationModule: "Cash Position & Obligations",
    destinationEntity: "financial_obligations",
    destinationField: "amount_due, due_date",
    truthRole: "source_of_truth",
    verification: "auto_trust",
    confidence: "high",
  },
  {
    connector: "quickbooks",
    sourceField: "Bill / Expense lines",
    destinationModule: "Business Control Center",
    destinationEntity: "expense_entries",
    destinationField: "amount, category, vendor",
    truthRole: "source_of_truth",
    verification: "admin_review",
    confidence: "medium",
    note: "Category mapping ambiguity → admin review before active use.",
  },
  {
    connector: "quickbooks",
    sourceField: "Item / Service category",
    destinationModule: "Profitability",
    destinationEntity: "service_lines",
    destinationField: "service_label",
    truthRole: "imported_supporting",
    verification: "client_verify",
    confidence: "low",
    note: "Mappings to RGS service taxonomy are client-specific.",
  },
  {
    connector: "quickbooks",
    sourceField: "Historical revenue (12–36 months)",
    destinationModule: "Revenue Review",
    destinationEntity: "revenue_review_monthly_points",
    destinationField: "amount, month_date, source",
    truthRole: "source_of_truth",
    verification: "client_verify",
    confidence: "high",
    note: "Imported history must be client-approved before activating analysis.",
  },
 
  // Stripe ────────────────────────────────────────────────────────────────────
  {
    connector: "stripe",
    sourceField: "Charge.amount / created",
    destinationModule: "Cash Position & Obligations",
    destinationEntity: "cash_flow_entries",
    destinationField: "amount, entry_date, direction=cash_in",
    truthRole: "source_of_truth",
    verification: "auto_trust",
    confidence: "high",
  },
  {
    connector: "stripe",
    sourceField: "Subscription.status / current_period_end",
    destinationModule: "Acquisition / Recurring Revenue",
    destinationEntity: "recurring_revenue_state",
    destinationField: "active_count, mrr_estimate",
    truthRole: "source_of_truth",
    verification: "auto_trust",
    confidence: "high",
  },
  {
    connector: "stripe",
    sourceField: "Refund / Dispute",
    destinationModule: "Insight Signals",
    destinationEntity: "customer_insight_signals",
    destinationField: "signal_type=revenue_leak",
    truthRole: "imported_supporting",
    verification: "admin_review",
    confidence: "medium",
  },
 
  // HubSpot ───────────────────────────────────────────────────────────────────
  {
    connector: "hubspot",
    sourceField: "Deal.dealstage / amount / closedate",
    destinationModule: "Client Sales Pipeline",
    destinationEntity: "client_pipeline_deals",
    destinationField: "stage_id, estimated_value, expected_close_date",
    truthRole: "source_of_truth",
    verification: "auto_trust",
    confidence: "high",
  },
  {
    connector: "hubspot",
    sourceField: "Contact.lifecyclestage transitions",
    destinationModule: "Acquisition",
    destinationEntity: "lead_funnel_events",
    destinationField: "stage, occurred_at",
    truthRole: "imported_supporting",
    verification: "auto_trust",
    confidence: "high",
  },
  {
    connector: "hubspot",
    sourceField: "Contact.hs_analytics_source",
    destinationModule: "Acquisition",
    destinationEntity: "lead_attribution",
    destinationField: "source_channel",
    truthRole: "imported_supporting",
    verification: "admin_review",
    confidence: "medium",
    note: "Attribution often dirty; review channel taxonomy before use.",
  },
 
  // GA4 ───────────────────────────────────────────────────────────────────────
  {
    connector: "ga4",
    sourceField: "sessions by sourceMedium",
    destinationModule: "Acquisition",
    destinationEntity: "traffic_summary",
    destinationField: "sessions_by_channel",
    truthRole: "imported_supporting",
    verification: "auto_trust",
    confidence: "high",
  },
  {
    connector: "ga4",
    sourceField: "key_events / conversions",
    destinationModule: "Acquisition",
    destinationEntity: "conversion_events",
    destinationField: "event_count, event_name",
    truthRole: "imported_supporting",
    verification: "admin_review",
    confidence: "medium",
    note: "Only configured key events count — ignore default GA event noise.",
  },
 
  // Paycom ────────────────────────────────────────────────────────────────────
  {
    connector: "paycom",
    sourceField: "Payroll period totals (gross + employer burden)",
    destinationModule: "Business Control Center",
    destinationEntity: "expense_entries",
    destinationField: "amount, category=payroll",
    truthRole: "source_of_truth",
    verification: "auto_trust",
    confidence: "high",
  },
  {
    connector: "paycom",
    sourceField: "Headcount by department",
    destinationModule: "Operations",
    destinationEntity: "labor_capacity",
    destinationField: "headcount, department",
    truthRole: "imported_supporting",
    verification: "admin_review",
    confidence: "medium",
  },
 
  // Jobber / Housecall Pro ────────────────────────────────────────────────────
  {
    connector: "jobber",
    sourceField: "Job.completedAt / total",
    destinationModule: "Revenue Review",
    destinationEntity: "revenue_review_monthly_points",
    destinationField: "amount, month_date, source=jobber",
    truthRole: "imported_supporting",
    verification: "client_verify",
    confidence: "medium",
    note: "Use only when QuickBooks not connected; otherwise advisory.",
  },
  {
    connector: "jobber",
    sourceField: "Quote → Job conversion",
    destinationModule: "Acquisition",
    destinationEntity: "conversion_events",
    destinationField: "quote_to_job_rate",
    truthRole: "source_of_truth",
    verification: "auto_trust",
    confidence: "high",
  },
  {
    connector: "housecall_pro",
    sourceField: "Job total / completed_at",
    destinationModule: "Revenue Review",
    destinationEntity: "revenue_review_monthly_points",
    destinationField: "amount, month_date, source=housecall_pro",
    truthRole: "imported_supporting",
    verification: "client_verify",
    confidence: "medium",
  },
  {
    connector: "housecall_pro",
    sourceField: "Estimate → Job conversion",
    destinationModule: "Acquisition",
    destinationEntity: "conversion_events",
    destinationField: "estimate_to_job_rate",
    truthRole: "source_of_truth",
    verification: "auto_trust",
    confidence: "high",
  },
];
 
// ─────────────────────────────────────────────────────────────────────────────
// 3. Verification policy matrix (per data class, not per field)
// ─────────────────────────────────────────────────────────────────────────────
 
export interface VerificationPolicyEntry {
  dataClass: string;
  policy: VerificationPolicy;
  rationale: string;
  appliesTo: ConnectorId[];
}
 
export const VERIFICATION_POLICIES: VerificationPolicyEntry[] = [
  {
    dataClass: "Closed-invoice totals",
    policy: "auto_trust",
    rationale: "Numerically exact and authoritative in QuickBooks/Stripe.",
    appliesTo: ["quickbooks", "stripe"],
  },
  {
    dataClass: "Imported revenue history (12–36 mo)",
    policy: "client_verify",
    rationale:
      "Historical context shapes diagnosis — client must confirm before it drives analysis.",
    appliesTo: ["quickbooks", "stripe", "jobber", "housecall_pro"],
  },
  {
    dataClass: "Expense category mapping",
    policy: "admin_review",
    rationale:
      "Source categories rarely match RGS taxonomy 1:1; review prevents bad attribution.",
    appliesTo: ["quickbooks", "paycom"],
  },
  {
    dataClass: "Service / SKU taxonomy",
    policy: "client_verify",
    rationale:
      "Client knows their service taxonomy; mapping must be confirmed.",
    appliesTo: ["quickbooks", "jobber", "housecall_pro"],
  },
  {
    dataClass: "Lead source attribution",
    policy: "admin_review",
    rationale:
      "UTM / source values are dirty — review channel collapsing rules first.",
    appliesTo: ["hubspot", "ga4"],
  },
  {
    dataClass: "Pipeline stage transitions",
    policy: "auto_trust",
    rationale:
      "Stage IDs are stable in HubSpot; safe to mirror into client pipeline.",
    appliesTo: ["hubspot"],
  },
  {
    dataClass: "Recurring subscription state",
    policy: "auto_trust",
    rationale: "Stripe is the authoritative system for subscription state.",
    appliesTo: ["stripe"],
  },
  {
    dataClass: "Inferred / OCR-derived fields",
    policy: "local_only_until_confirmed",
    rationale:
      "Until P12.x OCR work lands, anything inferred remains local and inert.",
    appliesTo: [],
  },
];
 
// ─────────────────────────────────────────────────────────────────────────────
// 4. Sync strategy matrix
// ─────────────────────────────────────────────────────────────────────────────
 
export interface SyncStrategyEntry {
  domain: string;
  connector: ConnectorId;
  syncMode: SyncMode;
  writeSemantics: WriteSemantics;
  conflict: ConflictHandling;
  cadence?: string; // human-readable
  notes?: string;
}
 
export const SYNC_STRATEGIES: SyncStrategyEntry[] = [
  {
    domain: "Revenue history (initial load)",
    connector: "quickbooks",
    syncMode: "one_time_import",
    writeSemantics: "append_only",
    conflict: "stage_for_review",
    cadence: "Once on activation",
    notes: "Stages into revenue_review_monthly_points for client verification.",
  },
  {
    domain: "Live invoices / AR",
    connector: "quickbooks",
    syncMode: "recurring",
    writeSemantics: "update_in_place",
    conflict: "source_wins",
    cadence: "Daily",
  },
  {
    domain: "Monthly close (published)",
    connector: "quickbooks",
    syncMode: "immutable_snapshot",
    writeSemantics: "no_writeback",
    conflict: "rgs_wins",
    notes: "Published closes are frozen; connector may not overwrite them.",
  },
  {
    domain: "Stripe charges & refunds",
    connector: "stripe",
    syncMode: "recurring",
    writeSemantics: "append_only",
    conflict: "source_wins",
    cadence: "Hourly",
  },
  {
    domain: "Stripe subscription state",
    connector: "stripe",
    syncMode: "recurring",
    writeSemantics: "update_in_place",
    conflict: "source_wins",
    cadence: "Hourly",
  },
  {
    domain: "HubSpot pipeline",
    connector: "hubspot",
    syncMode: "recurring",
    writeSemantics: "update_in_place",
    conflict: "source_wins",
    cadence: "Every 15 min",
    notes: "RGS-side overrides on a deal force stage_for_review.",
  },
  {
    domain: "GA4 traffic & conversions",
    connector: "ga4",
    syncMode: "recurring",
    writeSemantics: "append_only",
    conflict: "not_applicable",
    cadence: "Daily",
  },
  {
    domain: "Paycom payroll periods",
    connector: "paycom",
    syncMode: "recurring",
    writeSemantics: "append_only",
    conflict: "source_wins",
    cadence: "Per pay period",
  },
  {
    domain: "Jobber / Housecall jobs",
    connector: "jobber",
    syncMode: "recurring",
    writeSemantics: "append_only",
    conflict: "stage_for_review",
    cadence: "Daily",
    notes: "If QuickBooks present, treated as advisory, not source-of-truth.",
  },
  {
    domain: "On-demand reconciliation pull",
    connector: "quickbooks",
    syncMode: "on_demand_refresh",
    writeSemantics: "update_in_place",
    conflict: "stage_for_review",
    notes: "Triggered from admin reconciliation tools.",
  },
];
 
// ─────────────────────────────────────────────────────────────────────────────
// 5. Do-not-ingest rules (explicit noise prevention)
// ─────────────────────────────────────────────────────────────────────────────
 
export interface NoiseExclusion {
  connector: ConnectorId | "any";
  rule: string;
  reason: string;
}
 
export const NOISE_EXCLUSIONS: NoiseExclusion[] = [
  {
    connector: "quickbooks",
    rule: "Memorized transactions, journal templates, deleted entities",
    reason: "Not operating truth — adds noise to financial signals.",
  },
  {
    connector: "quickbooks",
    rule: "Class / location dimensions unless explicitly mapped per client",
    reason: "Inconsistent across clients; will mislead profitability views.",
  },
  {
    connector: "hubspot",
    rule:
      "All custom contact properties beyond the documented attribution / lifecycle set",
    reason:
      "Custom properties vary wildly per workspace and rarely affect modeled questions.",
  },
  {
    connector: "hubspot",
    rule: "Email / marketing engagement-level events",
    reason:
      "High volume, low operating value — does not change pipeline truth.",
  },
  {
    connector: "ga4",
    rule:
      "Default GA auto-events (scroll, video_progress, file_download, etc.)",
    reason:
      "Not modeled conversions — pure vanity unless explicitly configured.",
  },
  {
    connector: "ga4",
    rule: "User-level demographic / interest data",
    reason:
      "Privacy-fragile and irrelevant to operating diagnosis.",
  },
  {
    connector: "paycom",
    rule:
      "Individual employee PII beyond aggregate cost and headcount-by-role",
    reason:
      "Sensitive HRIS detail with no modeled business question behind it.",
  },
  {
    connector: "stripe",
    rule: "Card / customer PII fields beyond what's needed for reconciliation",
    reason: "Reduce blast radius; we model money, not card metadata.",
  },
  {
    connector: "jobber",
    rule: "Internal note threads, attachments",
    reason: "High-volume operational chatter, no diagnostic value.",
  },
  {
    connector: "housecall_pro",
    rule: "Internal note threads, attachments",
    reason: "Same rationale as Jobber.",
  },
  {
    connector: "any",
    rule: "Any field with no defined mapping in FIELD_MAPPINGS",
    reason:
      "Default deny — connectors must add a mapping entry before any new field is ingested.",
  },
];
 
// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────
 
export const PRIORITY_LABEL: Record<ConnectorPriority, string> = {
  tier_1: "Tier 1 — foundational",
  tier_2: "Tier 2 — high-value when relevant",
  tier_3: "Tier 3 — industry-specific",
};
 
export const VERIFICATION_LABEL: Record<VerificationPolicy, string> = {
  auto_trust: "Auto-trust",
  client_verify: "Client verify",
  admin_review: "Admin review",
  local_only_until_confirmed: "Local only",
  do_not_import: "Do not import",
};
 
export const TRUTH_ROLE_LABEL: Record<TruthRole, string> = {
  source_of_truth: "Source of truth",
  imported_supporting: "Imported · supporting",
  advisory_only: "Advisory only",
};
 
export const SYNC_MODE_LABEL: Record<SyncMode, string> = {
  one_time_import: "One-time import",
  manual: "Manual",
  recurring: "Recurring",
  on_demand_refresh: "On-demand refresh",
  immutable_snapshot: "Immutable snapshot",
};
 
export const WRITE_SEMANTICS_LABEL: Record<WriteSemantics, string> = {
  append_only: "Append-only",
  update_in_place: "Update in place",
  no_writeback: "No writeback",
};
 
export const CONFLICT_LABEL: Record<ConflictHandling, string> = {
  rgs_wins: "RGS wins",
  source_wins: "Source wins",
  stage_for_review: "Stage for review",
  not_applicable: "—",
};
 
export const INDUSTRY_LABEL: Record<IndustryRelevance, string> = {
  horizontal: "Horizontal",
  trades_home_services: "Trades / home services",
  digital_acquisition_heavy: "Digital acquisition",
  labor_cost_material: "Labor-heavy",
  subscription_or_recurring: "Subscription / recurring",
};
 
/** Convenience: get all field mappings for a connector. */
export function mappingsForConnector(id: ConnectorId): FieldMapping[] {
  return FIELD_MAPPINGS.filter((m) => m.connector === id);
}
 
/** Convenience: count mappings by truth role for a connector — used by UI summaries. */
export function truthRoleCounts(id: ConnectorId): Record<TruthRole, number> {
  const out: Record<TruthRole, number> = {
    source_of_truth: 0,
    imported_supporting: 0,
    advisory_only: 0,
  };
  for (const m of mappingsForConnector(id)) out[m.truthRole]++;
  return out;
}
