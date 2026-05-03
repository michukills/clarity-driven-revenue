import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const CANON = "https://www.revenueandgrowthsystems.com";

describe("P48.1 — Sitemap & robots crawl repair contract", () => {
  it("public/sitemap.xml exists and is valid XML", () => {
    expect(existsSync(join(root, "public/sitemap.xml"))).toBe(true);
    const xml = read("public/sitemap.xml");
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(xml).toMatch(/<urlset[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
    expect(xml).toMatch(/<\/urlset>\s*$/);
    // Balanced url tags
    const opens = (xml.match(/<url>/g) ?? []).length;
    const closes = (xml.match(/<\/url>/g) ?? []).length;
    expect(opens).toBeGreaterThan(0);
    expect(opens).toBe(closes);
  });

  it("sitemap uses the canonical www.revenueandgrowthsystems.com domain", () => {
    const xml = read("public/sitemap.xml");
    expect(xml).toMatch(new RegExp(CANON.replace(/\./g, "\\.")));
    expect(xml).not.toMatch(/clarity-driven-revenue\.lovable\.app/);
    expect(xml).not.toMatch(/lovable\.app/);
  });

  it("sitemap includes required public marketing URLs", () => {
    const xml = read("public/sitemap.xml");
    const required = [
      "/", "/scorecard", "/diagnostic", "/why-rgs-is-different",
      "/implementation", "/revenue-control-system", "/demo", "/blog",
      "/contact", "/eula", "/privacy",
    ];
    for (const path of required) {
      expect(xml).toContain(`<loc>${CANON}${path}</loc>`);
    }
  });

  it("sitemap excludes private/protected routes", () => {
    const xml = read("public/sitemap.xml");
    const banned = [
      "/admin", "/portal", "/auth", "/claim-invite", "/api/", "/functions/",
      "/diagnostic-apply", "/diagnostic-interview",
    ];
    for (const path of banned) {
      expect(xml).not.toContain(`<loc>${CANON}${path}`);
    }
  });

  it("public/robots.txt exists, references canonical sitemap, and does not block site", () => {
    expect(existsSync(join(root, "public/robots.txt"))).toBe(true);
    const txt = read("public/robots.txt");
    expect(txt).toMatch(new RegExp(`Sitemap:\\s+${CANON.replace(/\./g, "\\.")}/sitemap\\.xml`));
    // Allow public crawl, never blanket disallow root
    expect(txt).toMatch(/^User-agent: \*[\s\S]*Allow: \//m);
    expect(txt).not.toMatch(/^Disallow:\s*\/\s*$/m);
    expect(txt).not.toMatch(/clarity-driven-revenue\.lovable\.app/);
  });

  it("robots.txt disallows private app surfaces", () => {
    const txt = read("public/robots.txt");
    for (const path of ["/admin", "/portal", "/auth"]) {
      expect(txt).toContain(`Disallow: ${path}`);
    }
  });

  it("no broken sitemap-index references remain in repo", () => {
    const robots = read("public/robots.txt");
    const sitemap = read("public/sitemap.xml");
    expect(robots).not.toMatch(/sitemap[_-]index\.xml/i);
    expect(sitemap).not.toMatch(/sitemap[_-]index\.xml/i);
  });

  it("SEO component canonical origin uses the production domain", () => {
    const seo = read("src/components/SEO.tsx");
    expect(seo).toContain(`"${CANON}"`);
    expect(seo).not.toMatch(/clarity-driven-revenue\.lovable\.app/);
  });
});
