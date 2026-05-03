import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { blogPosts, getFeaturedPost } from "@/lib/blog/posts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const FAKE_PROOF = [
  /\btestimonial(s)?\b/i,
  /\bcase\s+study\b/i,
  /\btrusted by\b/i,
  /\bhundreds of clients\b/i,
  /\bproven results?\b/i,
  /\bguaranteed?\s+(revenue|results?|roi|growth|outcomes?)\b/i,
  /\b(10x|2x your|double your|triple your|skyrocket)\b/i,
  /in today'?s fast[-\s]?paced/i,
];

const ADVICE = [
  /\b(we\s+(provide|offer|give))\s+(legal|tax|accounting|financial)\s+advice\b/i,
  /\bcertified\s+(financial|legal|tax|accounting)\s+(advisor|professional)\b/i,
];

describe("P39 — blog registry shape and content rules", () => {
  it("has at least 3 published posts", () => {
    const published = blogPosts.filter((p) => p.status === "published");
    expect(published.length).toBeGreaterThanOrEqual(3);
  });

  for (const post of blogPosts) {
    describe(`post: ${post.slug}`, () => {
      it("has required SEO/meta fields", () => {
        expect(post.slug).toMatch(/^[a-z0-9-]+$/);
        expect(post.title.length).toBeGreaterThan(8);
        expect(post.seoTitle.length).toBeGreaterThan(8);
        expect(post.seoDescription.length).toBeGreaterThan(40);
        expect(post.seoDescription.length).toBeLessThan(200);
        expect(post.excerpt.length).toBeGreaterThan(20);
        expect(post.category.length).toBeGreaterThan(0);
        expect(post.primaryKeyword.length).toBeGreaterThan(0);
        expect(post.readingTimeMin).toBeGreaterThanOrEqual(2);
        expect(post.author).toMatch(/Revenue\s*&\s*Growth\s*Systems/);
        expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it("body has heading structure and substantive paragraphs", () => {
        const headings = post.body.filter((b) => b.type === "h2");
        const paras = post.body.filter((b) => b.type === "p");
        expect(headings.length).toBeGreaterThanOrEqual(3);
        expect(paras.length).toBeGreaterThanOrEqual(5);
        for (const p of paras) {
          if (p.type === "p") expect(p.text.length).toBeGreaterThan(60);
        }
      });

      it("contains no fake-proof / hype / advice language", () => {
        const haystack = [
          post.title,
          post.excerpt,
          post.heroSubtitle,
          post.seoDescription,
          ...post.body.map((b) => ("text" in b ? b.text : (b as { items: string[] }).items.join(" "))),
        ].join("\n");
        for (const re of [...FAKE_PROOF, ...ADVICE]) {
          expect(re.test(haystack), `${post.slug} matched ${re}`).toBe(false);
        }
      });
    });
  }
});

describe("P39 — blog routes and pages wired", () => {
  it("App.tsx wires /blog and /blog/:slug", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/path="\/blog"/);
    expect(app).toMatch(/path="\/blog\/:slug"/);
  });

  it("Footer links to /blog", () => {
    expect(read("src/components/Footer.tsx")).toMatch(/path:\s*"\/blog"/);
  });

  it("Blog index renders SEO + featured + grid + Scorecard + Why RGS CTAs", () => {
    const src = read("src/pages/Blog.tsx");
    expect(src).toMatch(/<SEO/);
    expect(src).toMatch(/data-testid="blog-featured"/);
    expect(src).toMatch(/data-testid="blog-grid"/);
    expect(src).toMatch(/Take the 0–1000 Scorecard/);
    expect(src).toMatch(/Why RGS Is Different/);
  });

  it("BlogPost template renders SEO + Scorecard + Why RGS + Diagnostic + disclaimer", () => {
    const src = read("src/pages/BlogPost.tsx");
    expect(src).toMatch(/<SEO/);
    expect(src).toMatch(/Take the 0–1000 Scorecard/);
    expect(src).toMatch(/Why RGS Is Different/);
    expect(src).toMatch(/Business Stability Diagnostic/);
    expect(src).toMatch(/not legal, tax,?\s*accounting,?\s*financial,?\s*or professional advice/i);
  });
});

describe("P39 — featured post is the launch post", () => {
  it("returns the launch article", () => {
    expect(getFeaturedPost().slug).toBe(
      "why-your-business-feels-harder-to-run-than-it-should",
    );
  });
});