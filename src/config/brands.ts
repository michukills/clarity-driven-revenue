/**
 * P13.Brand.1 — Single source of truth for third-party brand names.
 *
 * GLOBAL BRAND NAMING ENFORCEMENT SYSTEM
 *
 * All third-party platform names that appear in UI, copy, buttons,
 * tooltips, toasts, or documentation MUST be referenced through this
 * dictionary. Never hard-code variants like "Quickbooks" or "QB".
 *
 * Every entry uses the official, registered capitalization and spacing
 * defined by the platform's owner. RGS is not affiliated with or
 * endorsed by any of these companies.
 */
export const BRANDS = {
  // Accounting
  quickbooks: "QuickBooks",
  xero: "Xero",
  freshbooks: "FreshBooks",

  // Payments
  stripe: "Stripe",
  square: "Square",
  paypal: "PayPal",

  // CRM / Pipeline
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  pipedrive: "Pipedrive",

  // Analytics
  googleAnalytics: "Google Analytics",
  googleSearchConsole: "Google Search Console",
  metaAds: "Meta Ads",

  // Payroll / Labor
  paycom: "Paycom",
  adp: "ADP",
  gusto: "Gusto",

  // Field Ops
  jobber: "Jobber",
  housecallPro: "Housecall Pro",
  serviceTitan: "ServiceTitan",

  // Cannabis / MMJ / Dispensary (P67A)
  dutchie: "Dutchie",
  flowhub: "Flowhub",
  cova: "Cova",
  treez: "Treez",
  greenbits: "Greenbits",
  metrc: "METRC",
  biotrack: "BioTrack",
  weedmaps: "Weedmaps",
  leafly: "Leafly",

  // Restaurants
  toast: "Toast",
  clover: "Clover",
  doordash: "DoorDash",
  uberEats: "Uber Eats",
  grubhub: "Grubhub",
  sevenshifts: "7shifts",
  homebase: "Homebase",
  restaurant365: "Restaurant365",
  marginEdge: "MarginEdge",
  openTable: "OpenTable",
  resy: "Resy",

  // Retail / E-commerce
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  bigcommerce: "BigCommerce",
  lightspeed: "Lightspeed",
  klaviyo: "Klaviyo",
  mailchimp: "Mailchimp",
  googleAds: "Google Ads",
  shipStation: "ShipStation",
  shippo: "Shippo",
  cin7: "Cin7",
  skuvault: "SKUvault",

  // Professional services / scheduling
  calendly: "Calendly",
  googleCalendar: "Google Calendar",
  asana: "Asana",
  trello: "Trello",
  monday: "Monday.com",
  clickup: "ClickUp",
  zohoCrm: "Zoho CRM",
} as const;

export type BrandKey = keyof typeof BRANDS;
export type BrandName = (typeof BRANDS)[BrandKey];

/**
 * Standard connection prompt. Use this everywhere a user is asked to
 * link an external account so phrasing stays consistent and neutral.
 *
 *   connectPrompt("quickbooks") // => "Connect your QuickBooks account"
 */
export function connectPrompt(key: BrandKey): string {
  return `Connect your ${BRANDS[key]} account`;
}

/**
 * Trademark / non-affiliation footer line for a single brand. Use only
 * in legal/footer contexts — not inline UI.
 */
export function brandTrademarkLine(key: BrandKey, owner: string): string {
  return `${BRANDS[key]} is a trademark of ${owner}. RGS is not affiliated with or endorsed by ${owner}.`;
}

/**
 * Common incorrect variants → canonical name. Used by the validation
 * script to flag drift. Matching is case-sensitive against the literal
 * forms callers might type.
 */
export const BRAND_FORBIDDEN_VARIANTS: Record<string, BrandName> = {
  Quickbooks: BRANDS.quickbooks,
  QUICKBOOKS: BRANDS.quickbooks,
  "Quick Books": BRANDS.quickbooks,
  "quick books": BRANDS.quickbooks,

  Freshbooks: BRANDS.freshbooks,
  "Fresh Books": BRANDS.freshbooks,

  Paypal: BRANDS.paypal,
  "Pay Pal": BRANDS.paypal,

  Hubspot: BRANDS.hubspot,
  "Hub Spot": BRANDS.hubspot,

  Servicetitan: BRANDS.serviceTitan,
  "Service Titan": BRANDS.serviceTitan,

  Housecallpro: BRANDS.housecallPro,
  HousecallPro: BRANDS.housecallPro,

  "Facebook Ads": BRANDS.metaAds,
  "facebook ads": BRANDS.metaAds,
};
