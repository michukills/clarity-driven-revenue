// P44 — No-Fake-Proof + CTA audit contract.
//
// Static scan of public marketing pages, portal-facing marketing copy, and
// the demo / sticky-CTA / footer / navbar surfaces. Verifies:
//   1. No fake proof language (testimonials, case studies, trusted-by,
//      proven results, hundreds of businesses, guaranteed, unlimited).
//   2. No banned scope-creep / pushy upsell wording.
//   3. The canonical Diagnostic / Implementation / RGS Control System
//      offer-architecture line appears on the homepage.
//   4. The audit doc exists and includes the required sections.
//
// Strings inside disclaimer / negation lists are intentionally allowed —
// the audit exempts only the small set of files that legitimately enumerate
// what RGS does NOT claim. Tests, banned-word docs, and report-cadence
// labels are also exempt (they are infrastructure, not marketing claims).

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

/** Public + portal marketing surfaces audited in P44. */
const AUDIT_FILES = [
  "src/pages/Index.tsx",
  "src/pages/RevenueScorecard.tsx",
  "src/pages/WhyRGSIsDifferent.tsx",
  "src/pages/HowRGSWorks.tsx",
  "src/pages/Services.tsx",
  "src/pages/DiagnosticOffer.tsx",
  "src/pages/Implementation.tsx",
  "src/pages/RevenueControlSystem.tsx",
  "src/pages/Insights.tsx",
  "src/pages/StabilityFramework.tsx",
  "src/components/Footer.tsx",
  "src/components/Navbar.tsx",
  "src/components/StickyCTA.tsx",
  "src/components/CTAStack.tsx",
  "src/components/journey/StabilityJourneyDashboard.tsx",
  "src/pages/portal/MyTools.tsx",
];

/**
 * Files that legitimately enumerate what RGS does NOT do or NOT claim.
 * Banned phrases inside negation prose are allowed in these files only.
 */
const NEGATION_EXEMPT_FILES = new Set<string>([
  "src/pages/Demo.tsx",
  "src/pages/RevenueControlSystem.tsx",
  "src/pages/WhyRGSIsDifferent.tsx",
  "src/pages/DiagnosticOffer.tsx",
  "src/pages/Implementation.tsx",
]);

/** Banned proof / scope-creep / pushy wording. Whole-word, case-insensitive. */
const BANNED = [
  /\btestimonials?\b/i,
  /\bcase stud(?:y|ies)\b/i,
  /\btrusted by\b/i,
  /\bclients say\b/i,
  /\bproven results?\b/i,
  /\bguaranteed?\b/i,
  /\bunlimited\b/i,
  /\bhundreds of (?:businesses|clients|owners)\b/i,
  /\bover \d+ (?:businesses|clients|owners)\b/i,
  /\bjoin \d+\+? (?:businesses|clients|owners)\b/i,
  /\bdone-for-you\b/i,
  /\bfull-service\b/i,
  /\bwe run your business\b/i,
  /\bwe manage everything\b/i,
  /\bDiagnostic \+ ongoing\b/i,
  /\bafter major changes\b/i,
  /\bask RGS if\b/i,
  /\buse anytime\b/i,
  /\bupgrade anytime\b/i,
];

describe("P44 — no-fake-proof + CTA audit", () => {
  it("public + portal marketing surfaces contain no banned proof or scope-creep wording", () => {
    for (const file of AUDIT_FILES) {
      const body = read(file);
      // Strip JS/TS comments so internal code comments never trip the scan.
      const stripped = body
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
      const isNegationExempt = NEGATION_EXEMPT_FILES.has(file);
      for (const re of BANNED) {
        if (re.test(stripped)) {
          // In exempt files we still allow the term if every occurrence is
          // inside a negation context (e.g. "not done-for-you", "Cannot
          // provide unlimited", "does not imply guaranteed").
          if (isNegationExempt) {
            const lines = stripped.split("\n");
            const offending = lines.filter((line) => {
              if (!re.test(line)) return false;
              const idx = lines.indexOf(line);
              const window = lines.slice(Math.max(0, idx - 8), idx + 1).join("\n");
              return !/\b(not|no|never|cannot|can't|without|does not|do not|isn't|is not|won't|will not|cannotList|notList|whatThisIsNot|badFit|will\s+not)\b/i.test(
                window,
              );
            });
            expect(
              offending,
              `${file} uses banned phrase ${re} outside a negation context: ${offending.join(
                " | ",
              )}`,
            ).toEqual([]);
            continue;
          }
          throw new Error(
            `${file} contains banned phrase ${re}. Rewrite to scope-safe language.`,
          );
        }
      }
    }
  });

  it("homepage uses the canonical Diagnostic / Implementation / RGS Control System line", () => {
    const body = read("src/pages/Index.tsx");
    // The canonical sentence is wrapped across multiple JSX lines, so
    // collapse whitespace before matching.
    const flat = body.replace(/\s+/g, " ");
    expect(flat).toMatch(/finds the slipping gears/);
    expect(flat).toMatch(/installs the repair plan/);
    expect(flat).toMatch(/RGS Control System/);
    expect(flat).toMatch(/operator inside the business/);
  });

  it("docs/no-fake-proof-cta-audit.md exists and covers the required sections", () => {
    const path = resolve(ROOT, "docs/no-fake-proof-cta-audit.md");
    expect(existsSync(path)).toBe(true);
    const body = readFileSync(path, "utf8");
    expect(body).toMatch(/Banned proof language/i);
    expect(body).toMatch(/Banned scope-creep wording/i);
    expect(body).toMatch(/CTA hierarchy/i);
    expect(body).toMatch(/Demo \/ sample labeling/i);
    expect(body).toMatch(/Service-lane descriptions/i);
  });
});
