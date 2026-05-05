/**
 * P75A — Global RGS AI safety scanner.
 *
 * Scans AI-assisted output (admin or client) for forbidden claims that
 * RGS may not make: legal/tax/accounting/HR/OSHA/compliance/fiduciary
 * certification, valuation/appraisal/lender/investor language, ROI/
 * savings/exact-loss guarantees, fake "audit-ready"/"CPA verified"
 * stamps, and similar unsafe phrases.
 *
 * This builds on the SOP-specific scanner (`sopForbiddenPhrases.ts`)
 * and is the registry-level scanner referenced by the RGS AI brain
 * registry. It is deterministic, regex-based, and never calls AI itself.
 */
import { GLOBAL_FORBIDDEN_AI_CLAIMS } from "@/config/rgsAiBrains";

export interface ForbiddenClaimHit {
  field: string;
  phrase: string;
}

/** Compile a forbidden phrase list into case-insensitive regexes. */
export function compileForbiddenClaimPatterns(
  phrases: ReadonlyArray<string> = GLOBAL_FORBIDDEN_AI_CLAIMS,
): RegExp[] {
  return phrases.map(
    (p) => new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
  );
}

const DEFAULT_PATTERNS = compileForbiddenClaimPatterns();

/** Scan a record of named string fields for forbidden AI claims. */
export function findForbiddenAiClaims(
  fields: Record<string, string | null | undefined>,
  patterns: RegExp[] = DEFAULT_PATTERNS,
): ForbiddenClaimHit[] {
  const hits: ForbiddenClaimHit[] = [];
  for (const [field, raw] of Object.entries(fields)) {
    if (!raw) continue;
    for (const re of patterns) {
      const m = raw.match(re);
      if (m) hits.push({ field, phrase: m[0] });
    }
  }
  return hits;
}

/** Scrub forbidden phrases out of free-text AI output. */
export function scrubForbiddenAiClaims(
  text: string | null | undefined,
  patterns: RegExp[] = DEFAULT_PATTERNS,
): string {
  if (!text) return "";
  let out = text;
  for (const re of patterns) {
    out = out.replace(
      new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"),
      "[review with qualified professional]",
    );
  }
  return out;
}

/** Throw if any forbidden claim is detected. Useful in edge functions. */
export function assertNoForbiddenAiClaims(
  fields: Record<string, string | null | undefined>,
  patterns: RegExp[] = DEFAULT_PATTERNS,
): void {
  const hits = findForbiddenAiClaims(fields, patterns);
  if (hits.length > 0) {
    const detail = hits.map((h) => `${h.field}: "${h.phrase}"`).join("; ");
    throw new Error(`AI output contains forbidden claims — ${detail}`);
  }
}