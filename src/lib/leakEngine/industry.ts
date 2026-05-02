// P20.2 — Industry-aware leak adjustments and recommendations.
//
// Pure functions. Given a Leak and an industry, returns the industry-specific
// recommended fix (and optional emphasis hints). Falls back to the leak's
// default recommended_fix when no industry-specific override exists.

import type { IndustryCategory } from "@/lib/priorityEngine/types";
import type { Leak } from "./leakObject";

export interface IndustryProfile {
  industry: IndustryCategory;
  /** Short label for admin/client surfaces. */
  label: string;
  /** Plain-English focus area for the industry. */
  focus: string;
  /** Common issues we already detect or want to emphasize. */
  commonIssues: readonly string[];
  /**
   * Per-leak-type recommendation overrides. Key is Leak.type (friction kind).
   * If a leak type is not in this map we keep the generic recommendation.
   */
  recommendationOverrides: Readonly<Record<string, string>>;
}

export const INDUSTRY_PROFILES: Readonly<Record<IndustryCategory, IndustryProfile>> = {
  trade_field_service: {
    industry: "trade_field_service",
    label: "Trades / Field Service",
    focus: "estimates → jobs → invoices",
    commonIssues: [
      "unsent estimates",
      "no follow-up cadence",
      "jobs completed not invoiced",
      "no margin tracking per job",
    ],
    recommendationOverrides: {
      estimate_never_sent:
        "Send today, then enforce a same-day estimate rule for every booked job.",
      estimate_stale_sent:
        "Add a 3-touch follow-up cadence (day 3, day 7, day 14) on every sent estimate.",
      estimate_approved_not_invoiced:
        "Invoice on approval, not on job completion. Move billing to the front of the workflow.",
      job_completed_not_invoiced:
        "Add a daily 'jobs completed today' check and require an invoice before close-out.",
    },
  },
  mmj_cannabis: {
    industry: "mmj_cannabis",
    label: "Cannabis / MMJ / Rec",
    focus: "regulated cannabis retail · dispensary operations · inventory · product/category margin",
    commonIssues: [
      "no product/category margin visibility",
      "dead inventory and slow stock",
      "stockouts on high-margin products",
      "discount/promotion margin erosion",
      "vendor cost changes not reflected in pricing",
      "payment/cash reconciliation gaps",
    ],
    recommendationOverrides: {
      // Cannabis retail rarely uses estimates, but B2B/wholesale orders do.
      estimate_approved_not_invoiced:
        "For wholesale/B2B cannabis orders, invoice at order approval — not at fulfillment.",
    },
  },
  restaurant: {
    industry: "restaurant",
    label: "Restaurant",
    focus: "daily sales → cost control → margins",
    commonIssues: [
      "no daily cost tracking",
      "inconsistent margins",
      "waste",
      "weak reporting cadence",
    ],
    recommendationOverrides: {
      // Restaurants rarely run estimates — most leaks land in workflow/visibility.
      estimate_approved_not_invoiced:
        "Confirm catering / event invoices are issued the same day the booking is approved.",
    },
  },
  retail: {
    industry: "retail",
    label: "Retail",
    focus: "inventory → sales → margin",
    commonIssues: [
      "dead inventory",
      "no margin visibility per SKU",
      "weak sales reporting cadence",
    ],
    recommendationOverrides: {
      estimate_approved_not_invoiced:
        "For wholesale/B2B orders, invoice at order approval — not at fulfillment.",
    },
  },
  general_service: {
    industry: "general_service",
    label: "General / Mixed",
    focus: "general RGS revenue stability",
    commonIssues: [],
    recommendationOverrides: {},
  },
  other: {
    industry: "other",
    label: "Other",
    focus: "general RGS revenue stability",
    commonIssues: [],
    recommendationOverrides: {},
  },
};

export function profileFor(industry: IndustryCategory): IndustryProfile {
  return INDUSTRY_PROFILES[industry] ?? INDUSTRY_PROFILES.general_service;
}

/**
 * Apply an industry profile to a leak, returning a new leak with the
 * industry-specific recommended_fix when available. Never mutates input.
 */
export function applyIndustryRecommendation(leak: Leak): Leak {
  const profile = profileFor(leak.industry_context);
  const override = profile.recommendationOverrides[leak.type];
  if (!override) return leak;
  return { ...leak, recommended_fix: override };
}

/** Apply industry recommendations across an array of leaks. */
export function applyIndustryRecommendations(leaks: Leak[]): Leak[] {
  return leaks.map(applyIndustryRecommendation);
}