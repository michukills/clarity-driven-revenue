/**
 * Per-industry public landing content.
 *
 * Single source of truth for the public `/industries/*` pages so the routes,
 * tests, and SEO metadata all stay aligned. RGS voice: calm, direct,
 * owner-respecting, system-focused. No fake proof, no testimonials, no
 * unlimited-support implication, no legal/tax/accounting/HR/compliance
 * advice. Cannabis / MMJ / MMC / Rec is dispensary / regulated retail
 * operations only — never healthcare, HIPAA, patient care, insurance
 * claims, medical billing, or clinical workflows. The word "medical" in
 * this file refers exclusively to medical marijuana.
 */

export type IndustrySlug =
  | "general-business"
  | "trades-field-service"
  | "restaurant-food-service"
  | "retail"
  | "cannabis-mmj-dispensary";

export interface IndustryLandingContent {
  slug: IndustrySlug;
  label: string;
  eyebrow: string;
  h1: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
  slippingGears: string[];
  diagnosticLooksFor: string[];
  implementationInstalls: string[];
  controlSystemMonitors: string[];
  ownerExpectations: string[];
  notWhatRgsDoes: string[];
  /** Cannabis-only safety footer; empty for other industries. */
  cannabisSafetyNotes?: string[];
}

const SHARED_NOT_WHAT_RGS_DOES = [
  "Not unlimited consulting or open-ended support.",
  "Not a substitute for legal, tax, accounting, HR, or compliance advice.",
  "Not a guarantee of revenue, outcomes, or compliance.",
  "Not an operator inside the business — RGS is the architect, the owner runs the system.",
];

export const INDUSTRY_LANDING_CONTENT: Record<IndustrySlug, IndustryLandingContent> = {
  "general-business": {
    slug: "general-business",
    label: "General / Mixed Business",
    eyebrow: "RGS for owner-led businesses",
    h1: "Stability for general and mixed business operations",
    intro:
      "Owner-led businesses that have grown past the early days often discover that follow-up, quoting, invoicing, and decision-making depend on the owner being in the loop for everything. RGS helps surface where the system is slipping and what to repair first.",
    seoTitle: "General Business Diagnostic & System Repair | Revenue & Growth Systems",
    seoDescription:
      "RGS helps owner-led general and mixed businesses surface slipping gears, organize evidence, and prioritize repairs through a structured 0–1000 Stability Diagnostic.",
    slippingGears: [
      "Lead source tracking is informal or untracked.",
      "Close rate, revenue by line, and margin visibility are unclear.",
      "Owner is involved in nearly every decision.",
      "SOP coverage and handoff quality are inconsistent.",
      "Follow-up after quotes or invoices slips through the cracks.",
    ],
    diagnosticLooksFor: [
      "Where revenue, conversion, operations, financial visibility, and owner independence are slipping.",
      "Which evidence sources are missing or inconsistent.",
      "Which gear should be repaired first based on impact and dependency.",
      "What the owner is doing that the system should be doing.",
    ],
    implementationInstalls: [
      "Operating SOPs and workflows for the highest-impact gears.",
      "Decision rights and accountability so the owner stops being the bottleneck.",
      "Tool assignments and training so the system actually runs.",
    ],
    controlSystemMonitors: [
      "Stability score history and trend.",
      "Priority actions and owner decisions.",
      "Revenue and risk signals worth reviewing each month.",
    ],
    ownerExpectations: [
      "A scored 0–1000 Business Stability snapshot.",
      "A prioritized repair map that explains what to fix first and why.",
      "A walkthrough so the owner understands the report — not a document dropped over the wall.",
    ],
    notWhatRgsDoes: SHARED_NOT_WHAT_RGS_DOES,
  },

  "trades-field-service": {
    slug: "trades-field-service",
    label: "Trades / Field Service",
    eyebrow: "RGS for trades & field service",
    h1: "Stability for trades and field service operations",
    intro:
      "Trades and field service businesses live and die on dispatch, estimate close rate, technician utilization, and AR aging. RGS helps surface where the operating system is slipping so the owner can repair the gears that matter most.",
    seoTitle: "Trades & Field Service Diagnostic | Revenue & Growth Systems",
    seoDescription:
      "RGS helps trades and field service owners surface slipping gears across dispatch, estimates, job costing, callbacks, and AR — through a structured 0–1000 Stability Diagnostic.",
    slippingGears: [
      "Estimate close rate and quote follow-up are not measured.",
      "Job costing is informal or done after the fact.",
      "Dispatch, scheduling, and route handoffs are owner-dependent.",
      "Callback rate and warranty work are not tracked.",
      "AR aging and unbilled work create cash flow surprises.",
    ],
    diagnosticLooksFor: [
      "Lead and demand sources, including organic search, Google Business Profile, and referrals.",
      "Estimate-to-close conversion gaps and follow-up cadence.",
      "Dispatch workflow, technician utilization, and capacity visibility.",
      "Job costing, margin per job, and AR aging visibility.",
    ],
    implementationInstalls: [
      "Estimate, follow-up, and dispatch SOPs.",
      "Job costing and margin-per-job evidence routines.",
      "Owner decision rights so dispatch stops bottlenecking on the owner.",
    ],
    controlSystemMonitors: [
      "Estimate close rate, callback rate, and AR aging trend.",
      "Capacity and utilization signals.",
      "Stability score history and priority actions.",
    ],
    ownerExpectations: [
      "A scored 0–1000 Stability snapshot.",
      "Industry-emphasized repair priorities for trades and field service.",
      "A walkthrough so the owner understands the gears at risk.",
    ],
    notWhatRgsDoes: SHARED_NOT_WHAT_RGS_DOES,
  },

  "restaurant-food-service": {
    slug: "restaurant-food-service",
    label: "Restaurant / Food Service",
    eyebrow: "RGS for restaurants & food service",
    h1: "Stability for restaurant and food service operations",
    intro:
      "Restaurants and food service operators run on prime cost, food cost, labor cost, ticket time, waste, and service handoffs. RGS helps surface where the operating system is slipping so the owner can repair gears that move the business.",
    seoTitle: "Restaurant & Food Service Diagnostic | Revenue & Growth Systems",
    seoDescription:
      "RGS helps restaurant and food service owners surface slipping gears across prime cost, labor, waste, ticket time, and service handoffs — through a structured 0–1000 Stability Diagnostic.",
    slippingGears: [
      "Prime cost, food cost, and labor cost are not reviewed on cadence.",
      "Waste and over-portioning are not measured.",
      "Ticket times and service handoffs are inconsistent.",
      "Menu margin and category performance are unclear.",
      "FOH/BOH ownership of issues is informal.",
    ],
    diagnosticLooksFor: [
      "Prime cost, food cost, and labor cost visibility.",
      "Ticket time, void/comp patterns, and service handoff quality.",
      "Menu margin by category and waste signals.",
      "Owner dependence on day-of operations.",
    ],
    implementationInstalls: [
      "Prep, line, and service SOPs.",
      "Cadence for prime cost and labor review.",
      "Decision rights for FOH and BOH leads.",
    ],
    controlSystemMonitors: [
      "Prime cost trend, labor percentage, and ticket-time trend.",
      "Waste signals and category margin shifts.",
      "Stability score history and priority actions.",
    ],
    ownerExpectations: [
      "A scored 0–1000 Stability snapshot.",
      "Restaurant-emphasized repair priorities.",
      "A walkthrough that respects how a restaurant actually runs.",
    ],
    notWhatRgsDoes: SHARED_NOT_WHAT_RGS_DOES,
  },

  retail: {
    slug: "retail",
    label: "Retail",
    eyebrow: "RGS for retail",
    h1: "Stability for retail operations",
    intro:
      "Retail businesses run on inventory turnover, stockouts, dead stock, shrink, basket size, and category margin. RGS helps surface where the operating system is slipping so the owner can prioritize repairs that protect margin.",
    seoTitle: "Retail Diagnostic & System Repair | Revenue & Growth Systems",
    seoDescription:
      "RGS helps retail owners surface slipping gears across inventory turnover, stockouts, dead stock, shrink, basket size, and category margin — through a structured 0–1000 Stability Diagnostic.",
    slippingGears: [
      "Inventory turnover and dead stock are not measured.",
      "Stockouts on top SKUs go unnoticed until customers complain.",
      "Shrink is suspected but not quantified.",
      "Category margin and basket size patterns are unclear.",
      "Returns and refunds are not reviewed for trend.",
    ],
    diagnosticLooksFor: [
      "Inventory turnover, stockouts, and dead-stock signals.",
      "Shrink visibility and reconciliation routines.",
      "Category margin, basket size, and conversion trends.",
      "Owner dependence on day-of merchandising and POS decisions.",
    ],
    implementationInstalls: [
      "Receiving, counting, and reconciliation SOPs.",
      "Cadence for category margin and stockout review.",
      "Decision rights for store leads and merchandisers.",
    ],
    controlSystemMonitors: [
      "Inventory turnover, stockout, and shrink signals.",
      "Category margin and basket-size shifts.",
      "Stability score history and priority actions.",
    ],
    ownerExpectations: [
      "A scored 0–1000 Stability snapshot.",
      "Retail-emphasized repair priorities.",
      "A walkthrough grounded in the realities of running a store.",
    ],
    notWhatRgsDoes: SHARED_NOT_WHAT_RGS_DOES,
  },

  "cannabis-mmj-dispensary": {
    slug: "cannabis-mmj-dispensary",
    label: "Cannabis / MMJ / Medical Marijuana / Recreational",
    eyebrow: "RGS for cannabis / MMJ / MMC / Rec dispensary operations",
    h1: "Stability for cannabis dispensary and regulated retail operations",
    intro:
      "Cannabis, MMJ, medical marijuana, and recreational dispensary operations run in a compliance-sensitive environment. RGS helps surface where dispensary operating systems are slipping — POS / inventory reconciliation, cash handling, ID and check-in process visibility, menu and pricing accuracy, and evidence readiness — so the owner knows where to focus.",
    seoTitle: "Cannabis / MMJ Dispensary Diagnostic | Revenue & Growth Systems",
    seoDescription:
      "RGS helps cannabis, MMJ, and recreational dispensary owners surface slipping gears across POS / inventory reconciliation, cash handling, check-in process, menu accuracy, and evidence readiness — through a structured 0–1000 Stability Diagnostic. Not legal advice. Not a compliance guarantee.",
    slippingGears: [
      "POS and inventory reconciliation gaps go unnoticed between counts.",
      "Cash handling routines are informal or owner-dependent.",
      "ID / age / check-in process visibility is inconsistent.",
      "Menu, pricing, and promo accuracy across systems is hard to verify.",
      "Evidence readiness for regulator-style review is not organized.",
    ],
    diagnosticLooksFor: [
      "POS / inventory reconciliation routines and gaps.",
      "Cash handling visibility and owner dependence.",
      "Check-in process visibility and consistency.",
      "Menu, pricing, and promo accuracy.",
      "Evidence readiness — not compliance certification.",
    ],
    implementationInstalls: [
      "Open / close, reconciliation, and cash handling SOPs.",
      "Check-in and menu accuracy routines.",
      "Decision rights so the owner is not the only operating signal.",
    ],
    controlSystemMonitors: [
      "Reconciliation cadence and exception trend.",
      "Cash handling and check-in process signals.",
      "Stability score history and priority actions for dispensary operations.",
    ],
    ownerExpectations: [
      "A scored 0–1000 Stability snapshot focused on dispensary operations.",
      "Cannabis-emphasized repair priorities.",
      "A walkthrough that respects compliance sensitivity without overclaiming.",
    ],
    notWhatRgsDoes: [
      ...SHARED_NOT_WHAT_RGS_DOES,
      "Not healthcare, patient care, HIPAA, insurance claims, medical billing, or clinical workflows.",
      "Not a substitute for regulated cannabis legal counsel.",
    ],
    cannabisSafetyNotes: [
      "Cannabis / MMJ / MMC / Rec means dispensary and regulated retail operations only.",
      "State-specific rules may apply.",
      "Professional review may still be required.",
      "Not legal advice. Not a compliance guarantee.",
      "Supports operational visibility and evidence readiness — does not certify compliance.",
    ],
  },
};

export const INDUSTRY_LANDING_SLUGS: IndustrySlug[] = [
  "general-business",
  "trades-field-service",
  "restaurant-food-service",
  "retail",
  "cannabis-mmj-dispensary",
];