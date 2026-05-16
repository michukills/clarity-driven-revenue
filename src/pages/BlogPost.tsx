import { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Compass, Gauge, BookOpen } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import {
  getPostBySlug,
  getRelatedPosts,
  type BlogBlock,
  type BlogPost,
} from "@/lib/blog/posts";
import { SCAN_CTA_LABEL, SCAN_PATH, SCORECARD_PATH, DIAGNOSTIC_APPLY_PATH } from "@/lib/cta";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;
  // P40 — JSON-LD Article schema for the current post. Inject as a single
  // script tag, removed on unmount/route change. No fake authorship or
  // ratings — only fields we actually own.
  useEffect(() => {
    if (!post) return;
    const url = `https://www.revenueandgrowthsystems.com/blog/${post.slug}`;
    const ld = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.seoDescription,
      author: { "@type": "Organization", name: post.author },
      publisher: { "@type": "Organization", name: "Revenue & Growth Systems" },
      datePublished: post.date,
      dateModified: post.updatedAt ?? post.date,
      mainEntityOfPage: url,
      keywords: [post.primaryKeyword, ...post.secondaryKeywords].join(", "),
      articleSection: post.category,
    };
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.dataset.rgs = "blog-article";
    el.text = JSON.stringify(ld);
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [post]);
  if (!post) return <Navigate to="/blog" replace />;

  const related = getRelatedPosts(post);

  return (
    <Layout>
      <SEO
        title={post.seoTitle}
        description={post.seoDescription}
        canonical={`/blog/${post.slug}`}
      />
      <Section className="pt-28">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Business Stability Notes
        </Link>

        <p className="text-xs uppercase tracking-widest text-accent mb-3">{post.heroEyebrow}</p>
        <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4 text-balance max-w-3xl">
          {post.title}
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mb-6">{post.heroSubtitle}</p>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-12">
          <span>{post.author}</span>
          <span aria-hidden>·</span>
          <span>{formatDate(post.date)}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {post.readingTimeMin} min read
          </span>
          <span aria-hidden>·</span>
          <span>{post.category}</span>
        </div>

        {/* Article body */}
        <article className="max-w-2xl space-y-5 text-muted-foreground leading-relaxed">
          {post.body.map((block, i) => (
            <BlockRenderer key={i} block={block} />
          ))}
        </article>

        {/* Inline primary CTA */}
        <div className="max-w-2xl mt-12 rounded-lg border border-primary/30 bg-primary/5 p-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-medium mb-2">
            Start with the directional read
          </p>
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">
            See where your business is actually slipping
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Run the Operational Friction Scan first — two minutes — to find
            the likely upstream bottleneck and the worn teeth in your system.
          </p>
          <p className="text-xs text-muted-foreground/85 mb-4">
            When you are ready for structured diagnosis, the
            0–1000 Business Stability Scorecard is Diagnostic Part 1 — a
            structured first read across the five gears RGS looks at.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={SCAN_PATH}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {SCAN_CTA_LABEL} <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              to={SCORECARD_PATH}
              className="inline-flex items-center gap-2 rounded-md border border-primary/40 px-4 py-2 text-sm font-semibold text-foreground hover:border-primary transition-colors"
            >
              Take the FREE Business Stability Scorecard <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              to="/why-rgs-is-different"
              className="inline-flex items-center gap-2 rounded-md border border-border/60 px-4 py-2 text-sm text-foreground hover:border-primary/50 transition-colors"
            >
              Why RGS Is Different
            </Link>
          </div>
        </div>

        {/* Diagnostic soft CTA */}
        <p className="max-w-2xl mt-6 text-sm text-muted-foreground">
          Ready for a deeper review?{" "}
          <Link to={DIAGNOSTIC_APPLY_PATH} className="text-primary hover:underline">
            Start the Business Stability Diagnostic
          </Link>
          .
        </p>

        {/* Related */}
        {/* P40.1 — Next steps: contextual internal link block. Highlights
            the Scorecard as the primary next action, then surfaces the
            most relevant post-specific links and related articles. */}
        <div data-testid="blog-next-steps" className="max-w-3xl mt-16">
          <p className="text-xs uppercase tracking-widest text-accent mb-2">Next steps</p>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
            Where to go from here
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to={SCORECARD_PATH}
              className="group rounded-lg border border-primary/40 bg-primary/5 hover:border-primary transition-colors p-5"
            >
              <div className="flex items-center gap-2 text-primary mb-2">
                <Gauge className="w-4 h-4" />
                <p className="text-xs uppercase tracking-widest">Start here</p>
              </div>
              <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                Take the FREE Business Stability Scorecard
              </h3>
              <p className="text-sm text-muted-foreground">
                A structured first read across the five gears in about five minutes.
              </p>
            </Link>

            {(post.internalLinks ?? []).slice(0, 1).map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group rounded-lg border border-border/60 bg-card/30 hover:border-primary/40 transition-colors p-5"
              >
                <div className="flex items-center gap-2 text-accent mb-2">
                  <Compass className="w-4 h-4" />
                  <p className="text-xs uppercase tracking-widest">From this article</p>
                </div>
                <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {link.label}
                </h3>
              </Link>
            ))}

            {related.map((r) => (
              <Link
                key={r.slug}
                to={`/blog/${r.slug}`}
                className="group rounded-lg border border-border/60 bg-card/30 hover:border-primary/40 transition-colors p-5"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <BookOpen className="w-4 h-4" />
                  <p className="text-xs uppercase tracking-widest">{r.category}</p>
                </div>
                <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {r.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground/70 mt-12 max-w-3xl leading-relaxed">
          This article is general business education from RGS. It is not legal, tax,
          accounting, financial, or professional advice, and it does not guarantee outcomes.
        </p>
      </Section>
    </Layout>
  );
}

function BlockRenderer({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "p":
      return <p>{block.text}</p>;
    case "h2":
      return (
        <h2 className="font-display text-2xl font-semibold text-foreground pt-6">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="font-display text-lg font-semibold text-foreground pt-4">
          {block.text}
        </h3>
      );
    case "callout":
      return (
        <div className="border-l-2 border-primary pl-4 italic text-foreground/90">
          {block.text}
        </div>
      );
    case "list":
      return (
        <ul className="list-disc pl-6 space-y-2">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Keep type referenced.
void (null as unknown as BlogPost);