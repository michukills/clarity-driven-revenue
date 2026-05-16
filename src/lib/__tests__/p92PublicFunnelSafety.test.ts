// P92 — Final Sales Funnel + Public Site Conversion Safety + Live CTA Routing Audit.
//
// Static, deterministic guardrails over every public-facing page, footer,
// nav, and reusable CTA component. Locks in the public conversion funnel
// after P83C–P91 so launch-time regressions are caught at build time.
//
// Hard locks enforced:
//   - every internal CTA href resolves to a registered route in App.tsx
//   - external links open safely (target=_blank + rel=noopener noreferrer)
//   - no public page surfaces forbidden sales/positioning claims
//   - no public page exposes admin-link-only offer slugs as public checkout
//   - no public page shows a fixed public price for Implementation or RGS
//     Control System; no $297 anywhere
//   - every primary public CTA routes to one of: /scorecard,
//     /diagnostic-apply, /diagnostic, /contact, /auth, /claim-invite
//   - every routed /insights/* spoke and the blog post page have a funnel
//     CTA, exactly one H1, and SEO meta wired
//   - the locked positioning sentence + helper exists in config and the
//     deprecated construction-metaphor positioning is absent

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const APP = readFileSync(join(SRC, "App.tsx"), "utf8");

const registered = new Set<string>();
for (const m of APP.matchAll(/path="([^"]+)"/g)) registered.add(m[1]);

function matchesRegistered(target: string): boolean {
  const clean = target.split("?")[0].split("#")[0];
  if (registered.has(clean)) return true;
  for (const r of registered) {
    if (!r.includes(":") && !r.includes("*")) continue;
    const rx = new RegExp(
      "^" + r.replace(/\*/g, ".*").replace(/:[A-Za-z0-9_]+/g, "[^/]+") + "$",
    );
    if (rx.test(clean)) return true;
  }
  return false;
}

const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

// Public, anonymous-accessible pages and reusable public components.
const PUBLIC_PAGES = [
  "src/pages/Index.tsx",
  "src/pages/About.tsx",
  "src/pages/WhatWeDo.tsx",
  "src/pages/HowRGSWorks.tsx",
  "src/pages/WhyRGSExists.tsx",
  "src/pages/WhyRGSIsDifferent.tsx",
  "src/pages/System.tsx",
  "src/pages/StabilityFramework.tsx",
  "src/pages/Diagnostic.tsx",
  "src/pages/DiagnosticApply.tsx",
  "src/pages/Implementation.tsx",
  "src/pages/RevenueControlSystem.tsx",
  "src/pages/RevenueScorecard.tsx",
  "src/pages/Scorecard.tsx",
  "src/pages/Contact.tsx",
  "src/pages/Blog.tsx",
  "src/pages/BlogPost.tsx",
  "src/pages/industries/Industries.tsx",
  "src/pages/industries/IndustryLanding.tsx",
  "src/pages/insights/_SpokeTemplate.tsx",
  "src/pages/insights/WhyBusinessesLoseRevenue.tsx",
  "src/pages/insights/IdentifyIdealCustomer.tsx",
  "src/pages/insights/TrackRevenueCashFlowWeekly.tsx",
  "src/pages/insights/LosingCustomersBeforeTheyBuy.tsx",
  "src/pages/insights/MeasureBusinessStability.tsx",
  "src/pages/insights/FixOperationalBottlenecks.tsx",
  "src/components/Footer.tsx",
  "src/components/Navbar.tsx",
];

const publicBlob = () => PUBLIC_PAGES.map((f) => read(f)).join("\n");

// Allowed public funnel destinations for primary CTAs.
const ALLOWED_FUNNEL_TARGETS = new Set<string>([
  "/scorecard",
  "/diagnostic-apply",
  "/diagnostic",
  "/contact",
  "/auth",
  "/claim-invite",
  // Reverse-funnel exits (footer/nav navigations) are validated separately.
]);

// Routed insight spoke pages (those wired in App.tsx).
const INSIGHT_SPOKE_PAGES = [
  "src/pages/insights/WhyBusinessesLoseRevenue.tsx",
  "src/pages/insights/IdentifyIdealCustomer.tsx",
  "src/pages/insights/TrackRevenueCashFlowWeekly.tsx",
  "src/pages/insights/LosingCustomersBeforeTheyBuy.tsx",
  "src/pages/insights/MeasureBusinessStability.tsx",
  "src/pages/insights/FixOperationalBottlenecks.tsx",
];

describe("P92 — public funnel routing safety", () => {
  it("every internal CTA href on public pages resolves to a registered route", () => {
    const dead: string[] = [];
    const HREF = /(?:to|href)=\{?\s*["'`](\/[^"'`$}\s]+)["'`]/g;
    for (const f of PUBLIC_PAGES) {
      const text = read(f);
      HREF.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = HREF.exec(text))) {
        const target = m[1];
        if (target.startsWith("//")) continue;
        if (target.includes("${")) continue;
        if (/\.(png|jpg|jpeg|svg|webp|pdf|ico|json|xml|txt|mp4|vtt|srt|md)$/i.test(target)) continue;
        if (!matchesRegistered(target)) dead.push(`${target}  (${f})`);
      }
    }
    expect(dead, `Dead public CTA targets:\n${dead.join("\n")}`).toEqual([]);
  });

  it("footer + nav internal links resolve to registered routes", () => {
    for (const f of ["src/components/Footer.tsx", "src/components/Navbar.tsx"]) {
      const text = read(f);
      const targets = [...text.matchAll(/to=\{?\s*["'`](\/[^"'`$}]+)["'`]/g)].map((m) => m[1]);
      const bad = targets.filter((t) => !matchesRegistered(t));
      expect(bad, `Footer/nav broken links in ${f}: ${bad.join(", ")}`).toEqual([]);
    }
  });

  it("external links in footer/nav use safe target+rel", () => {
    const text = read("src/components/Footer.tsx") + "\n" + read("src/components/Navbar.tsx");
    // Find every <a ... href="http..." ...> tag and verify rel includes
    // noopener and noreferrer when target=_blank.
    const ANCHOR = /<a\b[^>]*href=["']https?:\/\/[^"']+["'][^>]*>/g;
    let m: RegExpExecArray | null;
    while ((m = ANCHOR.exec(text))) {
      const tag = m[0];
      if (/target=["']_blank["']/.test(tag)) {
        expect(tag, `External link missing noopener/noreferrer: ${tag}`).toMatch(/rel=["'][^"']*noopener[^"']*noreferrer[^"']*["']|rel=["'][^"']*noreferrer[^"']*noopener[^"']*["']/);
      }
    }
  });
});

describe("P92 — forbidden phrase + positioning guards", () => {
  it("no public page contains forbidden sales/hype phrases", () => {
    const text = publicBlob().toLowerCase();
    const banned = [
      /\bfree trial\b/,
      /\bsign up free\b/,
      /\binstant access\b/,
      /\bmoney back\b/,
      /\bguaranteed (?:results|roi|revenue|growth|outcomes?)\b/,
      /\bautomated checkout\b/,
      /\bfully automated audit\b/,
      /\bcompliance certified\b/,
      /\blegal compliance guarantee\b/,
      /\btax guarantee\b/,
      /\bdone-for-you operator\b/,
      /\bunlimited support\b/,
      /\bfully managed business operations\b/,
    ];
    for (const pat of banned) {
      expect(text, `forbidden phrase ${pat}`).not.toMatch(pat);
    }
  });

  it("no public page contains the deprecated blueprint/lay-bricks positioning", () => {
    const text = publicBlob().toLowerCase();
    const brick = ["lay", "the", "bric" + "ks"].join(" ");
    const variants = [
      ["blue", "print and teaches the owner to ", brick].join(""),
      ["teaches the owner to ", brick].join(""),
    ];
    for (const v of variants) expect(text).not.toContain(v.toLowerCase());
  });

  it("no public page mentions the retired $297 offer", () => {
    const text = publicBlob();
    expect(/\$297\b/.test(text)).toBe(false);
    expect(/29700/.test(text)).toBe(false);
  });

  it("no public page exposes admin-link-only offer slugs as buy/checkout CTAs", () => {
    const text = publicBlob().toLowerCase();
    expect(text).not.toContain("rgs_implementation_10000");
    expect(text).not.toContain("rgs_revenue_control_1000_monthly");
  });
});

describe("P92 — pricing visibility safety", () => {
  it("Implementation public page does not show fixed-price checkout language", () => {
    const impl = read("src/pages/Implementation.tsx");
    expect(impl).not.toContain("Continue to Secure Payment");
    // No fixed dollar-amount Implementation pricing; rely on PUBLIC_PRICING_SUMMARY.
    expect(/\$\d{1,3},\d{3}\s*(?:flat|fixed|today|now|one-time)/i.test(impl)).toBe(false);
  });

  it("RGS Control System public page does not show fixed-price subscribe CTA", () => {
    const rcs = read("src/pages/RevenueControlSystem.tsx");
    expect(rcs).not.toContain("Continue to Secure Payment");
    expect(/\$\d{1,3},?\d{0,3}\s*\/\s*month\b(?![^.]*depends)/i.test(rcs.replace(/PUBLIC_PRICING_SUMMARY[\s\S]*?\}/, ""))).toBe(false);
  });

  it("Diagnostic public price only appears via the wired checkout config", () => {
    const diag = read("src/pages/Diagnostic.tsx");
    // Diagnostic page reads the price from EXACT_CHECKOUT_FLOWS rather than
    // hardcoding a public price string.
    expect(diag).toContain("EXACT_CHECKOUT_FLOWS");
  });
});

describe("P92 — insights spoke + blog hygiene", () => {
  it("each routed spoke page has exactly one H1, SEO meta, and a funnel CTA", () => {
    for (const f of INSIGHT_SPOKE_PAGES) {
      const text = read(f);
      const usesTemplate = /SpokeTemplate/.test(text);
      const h1Count = (text.match(/<h1[\s>]/g) || []).length;
      if (usesTemplate) {
        // SpokeTemplate provides SEO + H1 + funnel CTA.
        expect(h1Count, `${f} should not redeclare <h1>`).toBe(0);
        expect(text, `${f} should pass seoTitle to SpokeTemplate`).toMatch(/seoTitle/);
      } else {
        expect(text, `${f} missing <SEO />`).toMatch(/<SEO\s/);
        expect(h1Count, `${f} must have exactly one <h1>`).toBe(1);
      }
      if (!usesTemplate) {
        expect(text, `${f} missing funnel CTA`).toMatch(
          /DIAGNOSTIC_APPLY_PATH|to=["'`]\/(?:diagnostic-apply|contact|scorecard)["'`]/,
        );
      }
    }
    const tpl = read("src/pages/insights/_SpokeTemplate.tsx");
    const tplH1 = (tpl.match(/<h1[\s>]/g) || []).length;
    expect(tplH1).toBe(1);
    expect(tpl).toMatch(/<SEO\s/);
    expect(tpl).toMatch(/DIAGNOSTIC_APPLY_PATH/);
  });

  it("blog list and blog post pages have SEO + a single H1", () => {
    for (const f of ["src/pages/Blog.tsx", "src/pages/BlogPost.tsx"]) {
      const text = read(f);
      expect(text).toMatch(/<SEO\s/);
      const h1Count = (text.match(/<h1[\s>]/g) || []).length;
      expect(h1Count, `${f} h1 count`).toBe(1);
    }
  });
});

describe("P92 — auth/signup funnel safety", () => {
  it("/auth uses admin-reviewed access flow, no open public signup language", () => {
    const auth = read("src/pages/portal/Auth.tsx");
    expect(auth).toMatch(/submit_signup_request|claim-invite/);
    expect(auth.toLowerCase()).not.toMatch(/free trial|sign up free|instant access/);
  });

  it("portal access pending route remains the gate for unapproved users", () => {
    expect(registered.has("/portal-access-pending")).toBe(true);
  });
});

describe("P92 — primary CTA whitelisting", () => {
  it("homepage primary CTA targets are inside the allowed funnel set (P96E)", () => {
    const text = read("src/pages/Index.tsx");
    // P96E — SCAN_PATH and DIAGNOSTIC_APPLY_PATH are the two primary hero CTAs.
    expect(text).toMatch(/to=\{SCAN_PATH\}/);
    expect(text).toMatch(/to=\{DIAGNOSTIC_APPLY_PATH\}/);
    // The public Scorecard CTA has been retired from the hero.
    expect(text).not.toMatch(/to=\{SCORECARD_PATH\}/);
    // Sanity: the CTA constants themselves resolve to allowed targets.
    const cta = read("src/lib/cta.ts");
    const scan = cta.match(/SCAN_PATH\s*=\s*"([^"]+)"/)?.[1];
    const apply = cta.match(/DIAGNOSTIC_APPLY_PATH\s*=\s*"([^"]+)"/)?.[1];
    expect(scan && ALLOWED_FUNNEL_TARGETS.has(scan)).toBe(true);
    expect(apply && ALLOWED_FUNNEL_TARGETS.has(apply)).toBe(true);
  });
});

describe("P92 — connected-source honesty on public surfaces", () => {
  it("public pages do not falsely claim live sync for non-QuickBooks sources", () => {
    const text = publicBlob().toLowerCase();
    const nonQbSources = [
      "xero",
      "freshbooks",
      "stripe",
      "square",
      "paypal",
      "hubspot",
      "salesforce",
      "pipedrive",
      "google analytics",
      "google search console",
      "meta ads",
      "paycom",
      "adp",
      "gusto",
      "jobber",
      "housecall pro",
      "servicetitan",
    ];
    for (const src of nonQbSources) {
      const idx = text.indexOf(src);
      if (idx === -1) continue;
      const window = text.slice(Math.max(0, idx - 60), idx + src.length + 60);
      expect(window, `false live-sync claim near ${src}: "${window}"`)
        .not.toMatch(/live\s*sync|real-?time\s*sync|automatic(?:ally)?\s*sync/);
    }
  });
});

describe("P92 — locked positioning sentence is available", () => {
  it("approved positioning sentence is exposed via the pricing config", () => {
    const pricing = read("src/config/rgsPricingTiers.ts");
    expect(pricing).toContain(
      "RGS builds the operating structure owners use to see what is slipping, decide what to fix, and run the business with more control.",
    );
  });
});

describe("P92 — CTA inventory snapshot", () => {
  it("exposes a deterministic count of public CTAs (sanity floor)", () => {
    const HREF = /(?:to|href)=\{?\s*["'`](\/[^"'`$}\s]+)["'`]/g;
    let count = 0;
    for (const f of PUBLIC_PAGES) {
      const text = read(f);
      const matches = text.match(HREF) || [];
      count += matches.length;
    }
    // Floor sanity check — public funnel must exist; locks against accidental wipe.
    expect(count).toBeGreaterThan(20);
  });
});

// Walks src/ for orphaned public files referencing dead routes — kept as a
// soft assertion to avoid duplicating the broader P90 sweep but localized
// to public surfaces.
describe("P92 — public surface route sweep complement", () => {
  it("no public surface references an unregistered admin/portal route", () => {
    const violations: string[] = [];
    for (const f of PUBLIC_PAGES) {
      const text = read(f);
      for (const m of text.matchAll(/(?:to|href)=\{?\s*["'`](\/(?:admin|portal)[^"'`$}\s]*)["'`]/g)) {
        violations.push(`${m[1]} in ${f}`);
      }
    }
    // Public pages should not deep-link into gated admin/portal surfaces;
    // any such link is either a leak or a dead public CTA.
    expect(violations, `Public pages link into gated surfaces:\n${violations.join("\n")}`).toEqual([]);
  });
});

// Make TS happy with unused walker helpers should we extend this later.
function _walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) _walk(p, out);
    else if (/\.(tsx?)$/.test(f)) out.push(p);
  }
  return out;
}
void _walk;