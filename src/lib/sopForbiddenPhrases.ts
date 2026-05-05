/**
 * P75 — Forbidden client-facing claim scanner for SOP / Training Bible
 * content. Scrubs/blocks language that would imply RGS or AI-drafted SOPs
 * provide legal, HR, OSHA, cannabis, healthcare-privacy, tax, accounting,
 * licensing, or professional certification advice.
 *
 * Used by both the client portal SOP creator (defensive UI scrub before
 * save) and by the `client-sop-ai-assist` edge function (authoritative
 * scrub before returning AI output to the browser).
 */

/** Phrases that are never safe in a client-visible SOP draft. */
export const FORBIDDEN_SOP_PHRASES: ReadonlyArray<RegExp> = [
  /\blegally\s+compliant\b/i,
  /\bHR\s+compliant\b/i,
  /\bOSHA\s+compliant\b/i,
  /\bcannabis\s+compliant\b/i,
  /\bHIPAA\s+compliant\b/i,
  /\blicensing\s+compliant\b/i,
  /\btax\s+compliant\b/i,
  /\baccounting\s+compliant\b/i,
  /\bcertified\b/i,
  /\bguaranteed\b/i,
  /\blegal\s+advice\b/i,
  /\bHR\s+advice\b/i,
  /\bOSHA\s+advice\b/i,
  /\btax\s+advice\b/i,
  /\baccounting\s+advice\b/i,
  /\bcompliance\s+certification\b/i,
  /\bregulatory\s+assurance\b/i,
  /\bsafe\s+harbor\b/i,
  /\benforcement[-\s]?proof\b/i,
  /\bprofessional\s+certification\b/i,
];

export interface ForbiddenPhraseHit {
  field: string;
  phrase: string;
}

/** Inspect a record of string fields and return any forbidden hits found. */
export function findForbiddenSopPhrases(
  fields: Record<string, string | null | undefined>,
): ForbiddenPhraseHit[] {
  const hits: ForbiddenPhraseHit[] = [];
  for (const [field, raw] of Object.entries(fields)) {
    if (!raw) continue;
    for (const re of FORBIDDEN_SOP_PHRASES) {
      const m = raw.match(re);
      if (m) hits.push({ field, phrase: m[0] });
    }
  }
  return hits;
}

/** Replace every forbidden phrase with a neutral placeholder. */
export function scrubForbiddenSopPhrases(text: string | null | undefined): string {
  if (!text) return "";
  let out = text;
  for (const re of FORBIDDEN_SOP_PHRASES) {
    out = out.replace(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"), "[review with qualified professional]");
  }
  return out;
}

export const SOP_AI_DISCLOSURE =
  "This SOP draft was created with AI assistance. Review it carefully, adjust it to your business, and confirm it before using it with your team.";

export const SOP_PROFESSIONAL_REVIEW_DISCLOSURE =
  "AI can help structure process information, but it does not provide legal, HR, OSHA, cannabis compliance, healthcare privacy, licensing, tax, accounting, or professional certification advice.";