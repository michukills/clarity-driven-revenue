import type { DiagnosticCategory, FactorRubric } from "@/lib/diagnostics/engine";

/**
 * Buyer Persona fit scoring — uses the shared diagnostic engine.
 *
 * Convention: 0 = strongest fit on this dimension (no leak / no risk),
 *             5 = weakest fit (severe risk to revenue if pursued).
 * This inversion lets the shared engine treat misfit as "leakage" so the
 * Ideal-Fit Score (engine's `result.score`, higher=better) reads naturally
 * as a 0–100 fit number.
 */

const fitRubric = (label: string, strong: string, weak: string): FactorRubric => ({
  0: `Ideal — ${strong}`,
  1: `Strong — minor friction; ${strong.toLowerCase()}`,
  2: `Workable — some risk; outcomes vary.`,
  3: `Marginal — recurring friction with ${label.toLowerCase()}.`,
  4: `Weak — significant risk; ${weak.toLowerCase()}`,
  5: `Wrong fit — ${weak}`,
});

export const PERSONA_FIT_CATEGORIES: DiagnosticCategory[] = [
  {
    key: "fit",
    label: "Buyer Fit",
    short: "Five dimensions that determine whether this persona will buy, succeed, and refer.",
    weight: 1,
    nextStep: "Diagnostic",
    rootCause:
      "The persona shows risk on one or more buying dimensions — pursuing them as-is will compress close rate, lengthen the cycle, or create delivery drag.",
    ifIgnored:
      "Pipeline fills with the wrong-shaped buyer; close rate, margin, and referrals all decline.",
    fixFirst:
      "Tighten the disqualifier list and lead with the dimension that is weakest on the radar.",
    factors: [
      {
        key: "urgency",
        label: "Pain Urgency",
        lookFor: "How acute the problem feels right now and whether they have a deadline.",
        rubric: fitRubric(
          "pain urgency",
          "Pain is acute today and they have a clear trigger.",
          "Pain is theoretical; buying cycle will stall without an external trigger.",
        ),
      },
      {
        key: "budget",
        label: "Budget Capacity",
        lookFor: "Their ability to fund the engagement without straining cash.",
        rubric: fitRubric(
          "budget capacity",
          "Funded — can pay without negotiating the offer down.",
          "Budget is thin; expect heavy price negotiation or churn.",
        ),
      },
      {
        key: "authority",
        label: "Decision Authority",
        lookFor: "Whether the contact can say yes alone or needs a committee.",
        rubric: fitRubric(
          "decision authority",
          "Single decision-maker — short cycle is achievable.",
          "Limited decision authority; multi-stakeholder deal you must plan for.",
        ),
      },
      {
        key: "self_aware",
        label: "Self-Awareness",
        lookFor: "Whether they already know they have this problem and own it.",
        rubric: fitRubric(
          "self-awareness",
          "Aware of the problem; sales is diagnosis, not education.",
          "Low self-awareness; sales becomes education-heavy and slow.",
        ),
      },
      {
        key: "coachable",
        label: "Coachability",
        lookFor: "Openness to being challenged and willingness to change behavior.",
        rubric: fitRubric(
          "coachability",
          "Highly coachable; testimonial and case-study yield will be strong.",
          "Low coachability; implementation risk is high and results likely poor.",
        ),
      },
    ],
  },
];

/**
 * Convert legacy persona.fit (1..5, higher = better) into engine severity (0..5, higher = worse).
 */
export function legacyFitToSeverity(fit: number | undefined): number {
  if (fit === undefined || fit === null) return 0;
  const clamped = Math.max(1, Math.min(5, Math.round(fit)));
  return 5 - clamped;
}