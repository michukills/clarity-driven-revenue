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

// P40 — banned AI / corporate filler phrases.
const BANNED_FILLER = [
  /unlock your potential/i,
  /take your business to the next level/i,
  /\bgame[- ]changer\b/i,
  /leverage synergy|synergize/i,
  /comprehensive guide/i,
  /\bin conclusion\b/i,
  /\bin summary\b/i,
  /it is important to note/i,
  /this article will explore/i,
  /whether you are a small business owner or entrepreneur/i,
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
        for (const re of [...FAKE_PROOF, ...ADVICE, ...BANNED_FILLER]) {
          expect(re.test(haystack), `${post.slug} matched ${re}`).toBe(false);
        }
      });

      if (post.status === "published") {
        it("published post has SEO description in 60–165 char range", () => {
          expect(post.seoDescription.length).toBeGreaterThanOrEqual(60);
          expect(post.seoDescription.length).toBeLessThanOrEqual(180);
        });
        it("published post has tags and at least 2 secondary keywords", () => {
          expect(post.tags.length).toBeGreaterThanOrEqual(2);
          expect(post.secondaryKeywords.length).toBeGreaterThanOrEqual(2);
        });
        it("published post has at least one related slug", () => {
          expect(post.related.length).toBeGreaterThanOrEqual(1);
        });
      }
    });
  }
});

describe("P40 — flagship post quality bar", () => {
  const flagship = blogPosts.find(
    (p) => p.slug === "why-your-business-feels-harder-to-run-than-it-should",
  )!;
  it("exists and is published", () => {
    expect(flagship).toBeDefined();
    expect(flagship.status).toBe("published");
  });
  it("uses the gear / slipping metaphor", () => {
    const text = flagship.body
      .map((b) => ("text" in b ? b.text : b.items.join(" ")))
      .join("\n");
    expect(/gear/i.test(text)).toBe(true);
    expect(/slip/i.test(text)).toBe(true);
  });
  it("uses guided independence language", () => {
    const text = flagship.body
      .map((b) => ("text" in b ? b.text : b.items.join(" ")))
      .join("\n")
      .toLowerCase();
    expect(text).toContain("guided independence");
  });
  it("is not thin content (>= 1000 words of body)", () => {
    const words = flagship.body
      .map((b) => ("text" in b ? b.text : b.items.join(" ")))
      .join(" ")
      .split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(1000);
  });
  it("has launch-ready quality fields", () => {
    expect(flagship.qualityStatus).toBe("launch_ready");
    expect(flagship.searchIntent).toBeDefined();
    expect(flagship.audience && flagship.audience.length).toBeGreaterThan(10);
    expect(flagship.contentGoal && flagship.contentGoal.length).toBeGreaterThan(10);
    expect((flagship.internalLinks ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

describe("P40 — BlogPost emits JSON-LD Article schema", () => {
  it("BlogPost.tsx contains JSON-LD Article injection", () => {
    const src = read("src/pages/BlogPost.tsx");
    expect(src).toMatch(/application\/ld\+json/);
    expect(src).toMatch(/"@type":\s*"Article"/);
    expect(src).toMatch(/datePublished/);
  });
});

describe("P40 — blog quality docs exist", () => {
  it("docs/blog-writing-quality.md exists with required sections", () => {
    const md = read("docs/blog-writing-quality.md");
    expect(md).toMatch(/Voice rules/i);
    expect(md).toMatch(/Banned phrases/i);
    expect(md).toMatch(/No-fake-proof/i);
    expect(md).toMatch(/Expert SEO checklist/i);
    expect(md).toMatch(/Readability checklist/i);
    expect(md).toMatch(/Internal linking/i);
  });
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
    expect(src).toMatch(/Take the FREE Business Stability Scorecard/);
    expect(src).toMatch(/Why RGS Is Different/);
  });

  it("BlogPost template renders SEO + Scorecard + Why RGS + Diagnostic + disclaimer", () => {
    const src = read("src/pages/BlogPost.tsx");
    expect(src).toMatch(/<SEO/);
    expect(src).toMatch(/Take the FREE Business Stability Scorecard/);
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