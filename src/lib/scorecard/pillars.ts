/**
 * P13.Scorecard.Unification.H.1 — Canonical RGS Stability pillars.
 *
 * Single source of truth for the five RGS pillars used across:
 *   • Public scorecard (self-reported, preliminary)
 *   • OS / Admin Stability Scorecard (evidence-backed, longitudinal)
 *   • Diagnostic interview & report draft engine
 *   • Portal scorecard view (client trust framing)
 *
 * Internal pillar IDs are stable for backward compatibility with
 * existing rubric records, tool_runs, and resource_assignments. The
 * canonical title strings here are the ONLY display labels that should
 * be shown to clients or admins for the pillars themselves.
 *
 * The public scorecard uses the rubric question id `owner` while the
 * OS scorecard tool stores severity records under `independence`. Both
 * map to the SAME canonical pillar (Owner Independence) — see
 * `canonicalIdFor`.
 */

export type CanonicalPillarId =
  | "demand"
  | "conversion"
  | "operations"
  | "financial"
  | "owner";

export interface CanonicalPillar {
  id: CanonicalPillarId;
  /** Required canonical display label. Do not vary across surfaces. */
  title: string;
  /** One-line plain-English description of the pillar. */
  description: string;
  /** Stable aliases used by historical data / OS internal keys. */
  aliases: readonly string[];
}

export const CANONICAL_PILLARS: readonly CanonicalPillar[] = [
  {
    id: "demand",
    title: "Demand Generation",
    description:
      "How leads, attention, and inbound opportunities show up — and whether they are predictable.",
    aliases: ["demand", "revenue_control"],
  },
  {
    id: "conversion",
    title: "Revenue Conversion",
    description:
      "How a lead becomes paid revenue — sales motion, follow-up discipline, and close behavior.",
    aliases: ["conversion", "conversion_control"],
  },
  {
    id: "operations",
    title: "Operational Efficiency",
    description:
      "Process clarity, hand-off integrity, and how reliably delivery runs without heroics.",
    aliases: ["operations", "delivery", "ops"],
  },
  {
    id: "financial",
    title: "Financial Visibility",
    description:
      "Whether the owner can see revenue, margin, cash, and runway in numbers — not by feel.",
    aliases: ["financial", "finance", "financial_visibility"],
  },
  {
    id: "owner",
    title: "Owner Independence",
    description:
      "How much the business depends on the owner being personally available to operate, sell, and decide.",
    aliases: ["owner", "independence", "owner_dependency", "owner_dependence"],
  },
] as const;

const ALIAS_INDEX: Record<string, CanonicalPillarId> = (() => {
  const map: Record<string, CanonicalPillarId> = {};
  for (const p of CANONICAL_PILLARS) {
    map[p.id] = p.id;
    for (const a of p.aliases) map[a] = p.id;
  }
  return map;
})();

/** Resolve any historical/internal pillar key to its canonical id. */
export function canonicalIdFor(key: string | null | undefined): CanonicalPillarId | null {
  if (!key) return null;
  return ALIAS_INDEX[key.toLowerCase()] ?? null;
}

/** Get the canonical pillar definition for any id or alias. */
export function getCanonicalPillar(
  key: string | null | undefined,
): CanonicalPillar | null {
  const id = canonicalIdFor(key);
  if (!id) return null;
  return CANONICAL_PILLARS.find((p) => p.id === id) ?? null;
}

/** Get the canonical title for any id or alias. Falls back to the input. */
export function canonicalTitleFor(
  key: string | null | undefined,
  fallback?: string,
): string {
  return getCanonicalPillar(key)?.title ?? fallback ?? "";
}
