/**
 * P67A — Industry-Wide Source-of-Truth Connector Capability Matrix.
 *
 * Single source of truth describing, per provider:
 *   - which RGS industries it serves
 *   - source-of-truth category
 *   - honest live/manual/planned/demo/not-available status
 *   - whether OAuth/admin setup is required
 *   - which RGS modules it can feed (Scorecard, Evidence Vault,
 *     Revenue & Risk Monitor, Worn Tooth Signals, System Ledger,
 *     Structural Health Report, Repair Map)
 *   - the marketing-safe claim label (Truth-in-Sync requirement)
 *
 * RULES (Truth-in-Sync):
 *   - Never label a connector "live" unless it is actually wired,
 *     authenticated, tenant-safe, and successfully syncing real data.
 *   - If only export/import is supported today, status is
 *     `manual_export_import_supported` and routes through the
 *     RGS Evidence Vault™.
 *   - If the connector is not yet wired, status is `planned_connector`
 *     or `not_available`.
 *
 * This module is read-only registry / no side effects.
 */

import { BRANDS, type BrandKey } from "@/config/brands";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

export type ConnectorStatus =
  | "live_connected_sync"
  | "manual_export_import_supported"
  | "admin_setup_required"
  | "oauth_configured_not_synced"
  | "planned_connector"
  | "demo_only_connector"
  | "sync_failed_needs_reconnect"
  | "not_available";

export type MarketingClaimLabel =
  | "Live Sync Available"
  | "Manual Export Supported"
  | "Planned Integration"
  | "Demo Data Only"
  | "Admin Setup Required"
  | "Not Currently Available"
  | "Sync Needs Reconnect"
  | "API Access Required";

export type SourceOfTruthCategory =
  | "accounting"
  | "payments"
  | "crm_pipeline"
  | "pos"
  | "ecommerce"
  | "inventory"
  | "scheduling_booking"
  | "labor_payroll"
  | "field_service"
  | "marketing_ads"
  | "analytics"
  | "seed_to_sale_state_tracking"
  | "compliance_evidence"
  | "fulfillment_shipping"
  | "reviews_local";

export interface ConnectorCapability {
  /** Stable provider key (lowercase, snake_case). */
  providerId: string;
  providerName: string;
  industries: IndustryCategory[];
  sourceOfTruth: SourceOfTruthCategory[];
  status: ConnectorStatus;
  marketingClaim: MarketingClaimLabel;
  liveSyncAvailable: boolean;
  manualExportImportSupported: boolean;
  adminSetupRequired: boolean;
  oauthRequired: boolean;
  /** RGS module support (true = data can feed this module today). */
  feeds: {
    scorecard: boolean;
    evidenceVault: boolean;
    revenueRiskMonitor: boolean;
    wornToothSignals: boolean;
    systemLedger: boolean;
    structuralHealthReport: boolean;
    repairMap: boolean;
  };
  /** Plain-English known limitations, surfaced to admin only. */
  knownLimitations: string;
  /** Plain-English client-safe one-liner. */
  clientSafeBlurb: string;
}

const ALL_FEEDS_VIA_EVIDENCE = {
  scorecard: true,
  evidenceVault: true,
  revenueRiskMonitor: false,
  wornToothSignals: false,
  systemLedger: true,
  structuralHealthReport: true,
  repairMap: true,
};

const NO_FEEDS = {
  scorecard: false,
  evidenceVault: false,
  revenueRiskMonitor: false,
  wornToothSignals: false,
  systemLedger: false,
  structuralHealthReport: false,
  repairMap: false,
};

const FEEDS_PLANNED = { ...NO_FEEDS };

function brand(k: BrandKey): string {
  return BRANDS[k];
}

/**
 * The matrix. Honest about every entry's current real status in this
 * codebase. Update only when a connector's actual state changes.
 */
export const CONNECTOR_CAPABILITY_MATRIX: ConnectorCapability[] = [
  // ── Accounting (horizontal) ────────────────────────────────────────
  {
    providerId: "quickbooks",
    providerName: brand("quickbooks"),
    industries: ["trade_field_service", "retail", "restaurant", "general_service", "mmj_cannabis", "other"],
    sourceOfTruth: ["accounting"],
    status: "live_connected_sync",
    marketingClaim: "Live Sync Available",
    liveSyncAvailable: true,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: {
      scorecard: true, evidenceVault: true, revenueRiskMonitor: true,
      wornToothSignals: true, systemLedger: true,
      structuralHealthReport: true, repairMap: true,
    },
    knownLimitations: "QuickBooks Online only (Desktop not supported).",
    clientSafeBlurb: "Connect QuickBooks for live revenue, expense, AR, and AP visibility.",
  },
  {
    providerId: "xero",
    providerName: brand("xero"),
    industries: ["trade_field_service", "retail", "restaurant", "general_service", "mmj_cannabis", "other"],
    sourceOfTruth: ["accounting"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live OAuth not implemented yet. Upload exported reports through the RGS Evidence Vault™.",
    clientSafeBlurb: "Live Xero sync is planned. Today, upload exported P&L / AR reports through the Evidence Vault.",
  },
  {
    providerId: "freshbooks",
    providerName: brand("freshbooks"),
    industries: ["general_service", "trade_field_service", "other"],
    sourceOfTruth: ["accounting"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live integration not implemented. Manual upload only.",
    clientSafeBlurb: "FreshBooks live sync is planned. Upload exported reports through the Evidence Vault.",
  },

  // ── Payments ───────────────────────────────────────────────────────
  {
    providerId: "stripe",
    providerName: brand("stripe"),
    industries: ["retail", "general_service", "other"],
    sourceOfTruth: ["payments"],
    status: "manual_export_import_supported",
    marketingClaim: "Manual Export Supported",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: true,
    oauthRequired: false,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Stripe normalized period summaries can be ingested by admin; live OAuth not wired.",
    clientSafeBlurb: "Stripe live sync is planned. Upload exported transaction reports through the Evidence Vault.",
  },
  {
    providerId: "square",
    providerName: brand("square"),
    industries: ["retail", "restaurant", "general_service", "other"],
    sourceOfTruth: ["payments", "pos"],
    status: "manual_export_import_supported",
    marketingClaim: "Manual Export Supported",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: true,
    oauthRequired: false,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Normalized Square period summaries can be ingested by admin; live OAuth not wired.",
    clientSafeBlurb: "Square live sync is planned. Upload exported reports through the Evidence Vault.",
  },
  {
    providerId: "paypal",
    providerName: brand("paypal"),
    industries: ["retail", "general_service", "other"],
    sourceOfTruth: ["payments"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live integration not implemented.",
    clientSafeBlurb: "PayPal sync is planned. Upload payout reports through the Evidence Vault.",
  },

  // ── CRM / Pipeline ─────────────────────────────────────────────────
  {
    providerId: "hubspot",
    providerName: brand("hubspot"),
    industries: ["general_service", "other"],
    sourceOfTruth: ["crm_pipeline"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live OAuth not wired. Upload exported pipeline reports through the Evidence Vault.",
    clientSafeBlurb: "HubSpot live sync is planned. Upload pipeline exports through the Evidence Vault.",
  },
  {
    providerId: "salesforce",
    providerName: brand("salesforce"),
    industries: ["general_service", "other"],
    sourceOfTruth: ["crm_pipeline"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live OAuth not wired.",
    clientSafeBlurb: "Salesforce live sync is planned. Upload pipeline exports through the Evidence Vault.",
  },
  {
    providerId: "pipedrive",
    providerName: brand("pipedrive"),
    industries: ["general_service", "other"],
    sourceOfTruth: ["crm_pipeline"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live OAuth not wired.",
    clientSafeBlurb: "Pipedrive live sync is planned. Upload pipeline exports through the Evidence Vault.",
  },

  // ── Trades / Field Service ─────────────────────────────────────────
  {
    providerId: "jobber",
    providerName: brand("jobber"),
    industries: ["trade_field_service"],
    sourceOfTruth: ["field_service", "scheduling_booking"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "Jobber sync is planned. Upload jobs/estimates exports through the Evidence Vault.",
  },
  {
    providerId: "housecall_pro",
    providerName: brand("housecallPro"),
    industries: ["trade_field_service"],
    sourceOfTruth: ["field_service", "scheduling_booking"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "Housecall Pro sync is planned. Upload jobs exports through the Evidence Vault.",
  },
  {
    providerId: "servicetitan",
    providerName: brand("serviceTitan"),
    industries: ["trade_field_service"],
    sourceOfTruth: ["field_service", "scheduling_booking"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "ServiceTitan sync is planned. Upload exports through the Evidence Vault.",
  },

  // ── Restaurants ────────────────────────────────────────────────────
  {
    providerId: "toast",
    providerName: brand("toast"),
    industries: ["restaurant"],
    sourceOfTruth: ["pos", "payments"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "Toast sync is planned. Upload sales reports through the Evidence Vault.",
  },
  {
    providerId: "clover",
    providerName: brand("clover"),
    industries: ["restaurant", "retail"],
    sourceOfTruth: ["pos", "payments"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "Clover sync is planned. Upload reports through the Evidence Vault.",
  },
  {
    providerId: "sevenshifts",
    providerName: brand("sevenshifts"),
    industries: ["restaurant"],
    sourceOfTruth: ["labor_payroll", "scheduling_booking"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "7shifts sync is planned. Upload labor reports through the Evidence Vault.",
  },
  {
    providerId: "homebase",
    providerName: brand("homebase"),
    industries: ["restaurant", "retail", "trade_field_service"],
    sourceOfTruth: ["labor_payroll", "scheduling_booking"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "Homebase sync is planned. Upload labor reports through the Evidence Vault.",
  },

  // ── Retail / E-commerce ────────────────────────────────────────────
  {
    providerId: "shopify",
    providerName: brand("shopify"),
    industries: ["retail", "other"],
    sourceOfTruth: ["ecommerce", "pos", "inventory", "payments"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "Shopify sync is planned. Upload orders/inventory exports through the Evidence Vault.",
  },
  {
    providerId: "woocommerce",
    providerName: brand("woocommerce"),
    industries: ["retail", "other"],
    sourceOfTruth: ["ecommerce"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "WooCommerce sync is planned. Upload exports through the Evidence Vault.",
  },
  {
    providerId: "bigcommerce",
    providerName: brand("bigcommerce"),
    industries: ["retail", "other"],
    sourceOfTruth: ["ecommerce"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "BigCommerce sync is planned. Upload exports through the Evidence Vault.",
  },
  {
    providerId: "lightspeed",
    providerName: brand("lightspeed"),
    industries: ["retail", "restaurant"],
    sourceOfTruth: ["pos", "inventory"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "Lightspeed sync is planned. Upload exports through the Evidence Vault.",
  },
  {
    providerId: "klaviyo",
    providerName: brand("klaviyo"),
    industries: ["retail", "other"],
    sourceOfTruth: ["marketing_ads"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "Klaviyo sync is planned. Upload exports through the Evidence Vault.",
  },
  {
    providerId: "shipstation",
    providerName: brand("shipStation"),
    industries: ["retail", "other"],
    sourceOfTruth: ["fulfillment_shipping"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "ShipStation sync is planned. Upload exports through the Evidence Vault.",
  },

  // ── Cannabis / MMJ / Dispensary (CRITICAL) ─────────────────────────
  {
    providerId: "dutchie",
    providerName: brand("dutchie"),
    industries: ["mmj_cannabis"],
    sourceOfTruth: ["pos", "ecommerce", "inventory"],
    status: "manual_export_import_supported",
    marketingClaim: "Manual Export Supported",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: true,
    oauthRequired: false,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations:
      "Live Dutchie API/OAuth is not configured. Admin can ingest a normalized Dutchie period summary, or clients can upload Dutchie report exports through the Compliance Evidence Vault™.",
    clientSafeBlurb:
      "Dutchie live sync is planned. Upload Dutchie report exports through the Compliance Evidence Vault™.",
  },
  {
    providerId: "flowhub",
    providerName: brand("flowhub"),
    industries: ["mmj_cannabis"],
    sourceOfTruth: ["pos", "inventory"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: true,
    oauthRequired: false,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live integration not wired. Manual export upload only.",
    clientSafeBlurb: "Flowhub sync is planned. Upload exports through the Compliance Evidence Vault™.",
  },
  {
    providerId: "cova",
    providerName: brand("cova"),
    industries: ["mmj_cannabis"],
    sourceOfTruth: ["pos", "inventory"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: true,
    oauthRequired: false,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live integration not wired.",
    clientSafeBlurb: "Cova sync is planned. Upload exports through the Compliance Evidence Vault™.",
  },
  {
    providerId: "treez",
    providerName: brand("treez"),
    industries: ["mmj_cannabis"],
    sourceOfTruth: ["pos", "inventory"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: true,
    oauthRequired: false,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live integration not wired.",
    clientSafeBlurb: "Treez sync is planned. Upload exports through the Compliance Evidence Vault™.",
  },
  {
    providerId: "greenbits",
    providerName: brand("greenbits"),
    industries: ["mmj_cannabis"],
    sourceOfTruth: ["pos"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: true,
    oauthRequired: false,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live integration not wired.",
    clientSafeBlurb: "Greenbits sync is planned. Upload exports through the Compliance Evidence Vault™.",
  },
  {
    providerId: "metrc",
    providerName: brand("metrc"),
    industries: ["mmj_cannabis"],
    sourceOfTruth: ["seed_to_sale_state_tracking", "compliance_evidence"],
    status: "manual_export_import_supported",
    marketingClaim: "Manual Export Supported",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: true,
    oauthRequired: false,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations:
      "RGS does not act as the official compliance record keeper. METRC reconciliation/manifest exports support evidence/visibility only.",
    clientSafeBlurb:
      "Upload METRC reconciliation/manifest exports through the Compliance Evidence Vault™. RGS reflects documentation readiness; it does not certify regulatory compliance.",
  },
  {
    providerId: "biotrack",
    providerName: brand("biotrack"),
    industries: ["mmj_cannabis"],
    sourceOfTruth: ["seed_to_sale_state_tracking", "compliance_evidence"],
    status: "manual_export_import_supported",
    marketingClaim: "Manual Export Supported",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: true,
    oauthRequired: false,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations:
      "BioTrack exports support evidence/visibility only; RGS does not certify regulatory compliance.",
    clientSafeBlurb:
      "Upload BioTrack exports through the Compliance Evidence Vault™. RGS reflects documentation readiness; it does not certify compliance.",
  },
  {
    providerId: "weedmaps",
    providerName: brand("weedmaps"),
    industries: ["mmj_cannabis"],
    sourceOfTruth: ["ecommerce", "marketing_ads"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live integration not wired.",
    clientSafeBlurb: "Weedmaps sync is planned. Upload exports through the Compliance Evidence Vault™.",
  },
  {
    providerId: "leafly",
    providerName: brand("leafly"),
    industries: ["mmj_cannabis"],
    sourceOfTruth: ["ecommerce", "marketing_ads"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live integration not wired.",
    clientSafeBlurb: "Leafly sync is planned. Upload exports through the Compliance Evidence Vault™.",
  },

  // ── Payroll / Labor (horizontal) ───────────────────────────────────
  {
    providerId: "paycom",
    providerName: brand("paycom"),
    industries: ["trade_field_service", "general_service", "restaurant", "retail", "other"],
    sourceOfTruth: ["labor_payroll"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live integration not wired.",
    clientSafeBlurb: "Paycom sync is planned. Upload payroll exports through the Evidence Vault.",
  },
  {
    providerId: "adp",
    providerName: brand("adp"),
    industries: ["trade_field_service", "general_service", "restaurant", "retail", "other"],
    sourceOfTruth: ["labor_payroll"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live integration not wired.",
    clientSafeBlurb: "ADP sync is planned. Upload payroll exports through the Evidence Vault.",
  },
  {
    providerId: "gusto",
    providerName: brand("gusto"),
    industries: ["trade_field_service", "general_service", "restaurant", "retail", "other"],
    sourceOfTruth: ["labor_payroll"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live integration not wired.",
    clientSafeBlurb: "Gusto sync is planned. Upload payroll exports through the Evidence Vault.",
  },

  // ── Analytics / Ads ────────────────────────────────────────────────
  {
    providerId: "ga4",
    providerName: `${brand("googleAnalytics")} (GA4)`,
    industries: ["retail", "general_service", "restaurant", "trade_field_service", "other"],
    sourceOfTruth: ["analytics"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "GA4 sync is planned. Upload exported reports through the Evidence Vault.",
  },
  {
    providerId: "google_search_console",
    providerName: brand("googleSearchConsole"),
    industries: ["retail", "general_service", "other"],
    sourceOfTruth: ["analytics"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "Search Console sync is planned. Upload exports through the Evidence Vault.",
  },
  {
    providerId: "meta_ads",
    providerName: brand("metaAds"),
    industries: ["retail", "restaurant", "general_service", "other"],
    sourceOfTruth: ["marketing_ads"],
    status: "planned_connector",
    marketingClaim: "Planned Integration",
    liveSyncAvailable: false,
    manualExportImportSupported: true,
    adminSetupRequired: false,
    oauthRequired: true,
    feeds: ALL_FEEDS_VIA_EVIDENCE,
    knownLimitations: "Live API not wired.",
    clientSafeBlurb: "Meta Ads sync is planned. Upload exports through the Evidence Vault.",
  },
];

// silence unused warning if someone refactors:
void FEEDS_PLANNED;

// ─── Helpers ─────────────────────────────────────────────────────────

export const CONNECTOR_STATUS_LABEL: Record<ConnectorStatus, string> = {
  live_connected_sync: "Live connected sync",
  manual_export_import_supported: "Manual export/import supported",
  admin_setup_required: "Admin setup required",
  oauth_configured_not_synced: "OAuth configured, not yet synced",
  planned_connector: "Planned connector",
  demo_only_connector: "Demo data only",
  sync_failed_needs_reconnect: "Sync failed — reconnect needed",
  not_available: "Not currently available",
};

/** Honest client-facing label per status. */
export const CONNECTOR_STATUS_CLIENT_LABEL: Record<ConnectorStatus, string> = {
  live_connected_sync: "Connect live sync",
  manual_export_import_supported: "Upload export manually",
  admin_setup_required: "Admin setup required",
  oauth_configured_not_synced: "Reconnect to start sync",
  planned_connector: "Planned connector",
  demo_only_connector: "Demo-only data",
  sync_failed_needs_reconnect: "Sync failed — reconnect needed",
  not_available: "Not currently available",
};

export function getConnectorsForIndustry(
  industry: IndustryCategory,
): ConnectorCapability[] {
  return CONNECTOR_CAPABILITY_MATRIX.filter((c) =>
    c.industries.includes(industry),
  );
}

export function getCannabisConnectors(): ConnectorCapability[] {
  return getConnectorsForIndustry("mmj_cannabis");
}

/**
 * Phrases that must NEVER appear in client-facing copy unless the
 * connector is `live_connected_sync`. Used by tests + UI guards.
 */
export const FORBIDDEN_LIVE_SYNC_PHRASES = [
  "syncing now",
  "real-time sync",
  "automatic sync",
  "pulling data live",
  "actively syncing",
] as const;

/**
 * Marketing-claim safety check. Returns the only labels safe to show
 * publicly for a given connector right now.
 */
export function safeMarketingClaim(c: ConnectorCapability): MarketingClaimLabel {
  return c.marketingClaim;
}

/** True if a "live"/"connected"/"synced" word would be a lie for this entry. */
export function liveLanguageWouldBeFalse(c: ConnectorCapability): boolean {
  return c.status !== "live_connected_sync";
}
