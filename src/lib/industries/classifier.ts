/**
 * Deterministic industry classifier.
 *
 * Pure / local. Used to suggest an industry from free-text business data
 * (description, service type, business name, scorecard/interview answers).
 * AI may be layered on top via an admin-only edge function later, but the
 * baseline rules below are deterministic so behavior is testable and
 * cannot silently introduce a healthcare vertical.
 *
 * Rules:
 *  - "medical" + cannabis / MMJ / dispensary / marijuana / weed terms ->
 *    cannabis_mmj_mmc.
 *  - "medical" without cannabis context -> general_service +
 *    needs_admin_review (RGS does NOT have a healthcare vertical).
 *  - Admin-confirmed industry is NEVER overwritten by this function — the
 *    caller checks `industry_confirmed_by_admin` first.
 *  - Low confidence -> needs_admin_review = true.
 */

import type { IndustryCategory } from "@/lib/priorityEngine/types";

export interface ClassifierInput {
  business_name?: string | null;
  business_description?: string | null;
  service_type?: string | null;
  notes?: string | null;
}

export interface ClassifierResult {
  inferred_industry: IndustryCategory;
  confidence: number; // 0..1
  needs_admin_review: boolean;
  rationale: string;
  matched_keywords: string[];
  source: "rules";
}

const CANNABIS_TERMS = [
  "cannabis", "marijuana", "mmj", "mmc", "dispensary", "weed",
  "thc", "cbd flower", "budtender", "rec dispensary", "recreational cannabis",
  "medical marijuana",
];
const HEALTHCARE_AMBIGUOUS = [
  "hospital", "clinic", "patient", "doctor", "dentist", "nurse",
  "physician", "hipaa", "medical billing", "insurance claims",
];
const RESTAURANT_TERMS = [
  "restaurant", "cafe", "café", "bistro", "diner", "kitchen",
  "food truck", "bakery", "bar & grill", "pizzeria", "catering",
  "food service", "qsr", "fast casual",
];
const TRADES_TERMS = [
  "plumbing", "plumber", "hvac", "electrical", "electrician",
  "roofing", "roofer", "landscaping", "lawn care", "pest control",
  "carpentry", "general contractor", "field service", "dispatch",
  "installer", "garage door", "septic", "appliance repair",
];
const RETAIL_TERMS = [
  "boutique", "store", "shop", "retail", "ecommerce", "e-commerce",
  "shopify", "merchandise", "apparel", "clothing", "gift shop",
  "grocery", "convenience store", "pos retail",
];

function lower(s: string | null | undefined): string {
  return (s ?? "").toLowerCase();
}

function matches(text: string, terms: string[]): string[] {
  const found: string[] = [];
  for (const t of terms) {
    if (text.includes(t)) found.push(t);
  }
  return found;
}

export function classifyIndustry(input: ClassifierInput): ClassifierResult {
  const haystack = [
    lower(input.business_name),
    lower(input.business_description),
    lower(input.service_type),
    lower(input.notes),
  ].join(" | ");

  const cannabisHits = matches(haystack, CANNABIS_TERMS);
  const restaurantHits = matches(haystack, RESTAURANT_TERMS);
  const tradesHits = matches(haystack, TRADES_TERMS);
  const retailHits = matches(haystack, RETAIL_TERMS);
  const healthcareAmbiguous = matches(haystack, HEALTHCARE_AMBIGUOUS);
  const mentionsMedical = haystack.includes("medical");

  // Cannabis takes priority — including "medical marijuana".
  if (cannabisHits.length > 0) {
    return {
      inferred_industry: "mmj_cannabis",
      confidence: cannabisHits.length >= 2 ? 0.95 : 0.85,
      needs_admin_review: cannabisHits.length < 2,
      rationale: `Matched cannabis / MMJ / MMC / Rec dispensary terms: ${cannabisHits.join(", ")}.`,
      matched_keywords: cannabisHits,
      source: "rules",
    };
  }

  // Healthcare-style "medical" without cannabis -> NOT a supported vertical.
  if (mentionsMedical || healthcareAmbiguous.length > 0) {
    return {
      inferred_industry: "general_service",
      confidence: 0.3,
      needs_admin_review: true,
      rationale:
        "Mentions of healthcare / clinical / 'medical' without cannabis context. " +
        "RGS does not currently support a healthcare vertical — defaulting to General / Mixed Business and flagging for admin review.",
      matched_keywords: healthcareAmbiguous,
      source: "rules",
    };
  }

  // Single-industry hits.
  const buckets: Array<{ ind: IndustryCategory; hits: string[] }> = [
    { ind: "restaurant", hits: restaurantHits },
    { ind: "trade_field_service", hits: tradesHits },
    { ind: "retail", hits: retailHits },
  ];
  buckets.sort((a, b) => b.hits.length - a.hits.length);
  const top = buckets[0];
  const second = buckets[1];

  if (top.hits.length === 0) {
    return {
      inferred_industry: "general_service",
      confidence: 0.4,
      needs_admin_review: true,
      rationale: "No strong industry signal in provided text.",
      matched_keywords: [],
      source: "rules",
    };
  }

  // Ambiguous if top and second are tied.
  const ambiguous = top.hits.length > 0 && top.hits.length === second.hits.length;
  const confidence = ambiguous ? 0.5 : Math.min(0.6 + 0.1 * top.hits.length, 0.95);

  return {
    inferred_industry: ambiguous ? "general_service" : top.ind,
    confidence,
    needs_admin_review: confidence < 0.7,
    rationale: ambiguous
      ? `Ambiguous: matched both ${top.ind} and ${second.ind} terms equally.`
      : `Matched ${top.ind} terms: ${top.hits.join(", ")}.`,
    matched_keywords: top.hits,
    source: "rules",
  };
}

/**
 * Apply a classifier result to an existing customer record. Never overwrites
 * an admin-confirmed industry; never silently sets healthcare.
 */
export function shouldApplyClassification(opts: {
  current_industry: IndustryCategory | null | undefined;
  industry_confirmed_by_admin: boolean;
  result: ClassifierResult;
}): boolean {
  if (opts.industry_confirmed_by_admin) return false;
  if (opts.current_industry && opts.current_industry !== "other" && opts.current_industry !== "general_service") {
    // Only overwrite weak defaults.
    return false;
  }
  return opts.result.confidence >= 0.5;
}