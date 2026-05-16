import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import {
  blogCategories,
  blogPosts,
  getFeaturedPost,
  getNonFeaturedPosts,
} from "@/lib/blog/posts";
import { SCAN_CTA_LABEL, SCAN_PATH, SCORECARD_PATH } from "@/lib/cta";

const ALL = "All";

export default function Blog() {
  const [category, setCategory] = useState<string>(ALL);
  const featured = getFeaturedPost();
  const rest = getNonFeaturedPosts();

  const visible = useMemo(
    () => (category === ALL ? rest : rest.filter((p) => p.category === category)),
    [category, rest],
  );

  return (
    <Layout>
      <SEO
        title="Business Stability Notes — Plain-language articles for owner-led businesses | RGS"
        description="Plain-language articles for owner-led businesses that want clearer systems, better visibility, and fewer decisions made from guesswork."
        canonical="/blog"
      />
      <Section className="pt-28">
        <p className="text-xs uppercase tracking-widest text-accent mb-3">RGS Blog</p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-4 text-balance">
          Business Stability Notes
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mb-10">
          Plain-language articles for owner-led businesses that want clearer systems,
          better visibility, and fewer decisions made from guesswork.
        </p>

        {/* Featured */}
        <Link
          to={`/blog/${featured.slug}`}
          className="block group rounded-xl border border-border/60 bg-card/40 hover:border-primary/50 transition-colors p-8 md:p-10 mb-12"
          data-testid="blog-featured"
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent mb-3">
            <span>Featured</span>
            <span aria-hidden>·</span>
            <span>{featured.category}</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
            {featured.title}
          </h2>
          <p className="text-muted-foreground max-w-3xl mb-4">{featured.excerpt}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{formatDate(featured.date)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {featured.readingTimeMin} min read
            </span>
            <span className="inline-flex items-center gap-1 text-primary">
              Read article <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Filter by category">
          {[ALL, ...blogCategories].map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                category === c
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="blog-grid">
          {visible.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group rounded-lg border border-border/60 bg-card/30 hover:border-primary/40 transition-colors p-6 flex flex-col"
            >
              <p className="text-xs uppercase tracking-widest text-accent mb-2">{post.category}</p>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 flex-1">{post.excerpt}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatDate(post.date)}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {post.readingTimeMin} min
                </span>
              </div>
            </Link>
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-muted-foreground">No posts in this category yet.</p>
          )}
        </div>
      </Section>

      {/* CTA section */}
      <Section className="pt-0">
        <div className="rounded-xl border border-border/60 bg-card/40 p-8 md:p-10">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-medium mb-3">
            Start with the directional read
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">
            Want to see where your business is actually slipping?
          </h2>
          <p className="text-muted-foreground max-w-2xl mb-4">
            Run the Operational Friction Scan first — two minutes, seven
            questions — to surface the likely upstream bottleneck and the
            worn teeth in your system.
          </p>
          <p className="text-sm text-muted-foreground/85 max-w-2xl mb-6">
            When you are ready for structured diagnosis, the
            0–1000 Business Stability Scorecard is Diagnostic Part 1 — a
            structured first read across the five gears RGS looks at. It
            takes a few minutes and gives an honest picture of what is
            solid and what is slipping.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={SCAN_PATH}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {SCAN_CTA_LABEL} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={SCAN_PATH}
              className="inline-flex items-center gap-2 rounded-md border border-primary/40 px-5 py-2.5 text-sm font-semibold text-foreground hover:border-primary transition-colors"
            >
              Take the FREE Business Stability Scorecard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/why-rgs-is-different"
              className="inline-flex items-center gap-2 rounded-md border border-border/60 px-5 py-2.5 text-sm text-foreground hover:border-primary/50 transition-colors"
            >
              See Why RGS Is Different
            </Link>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 rounded-md border border-border/60 px-5 py-2.5 text-sm text-foreground hover:border-primary/50 transition-colors"
            >
              Watch the Demo
            </Link>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-6 max-w-3xl leading-relaxed">
            Articles are general business education from RGS. They are not legal, tax,
            accounting, financial, or professional advice, and they do not guarantee outcomes.
          </p>
        </div>
      </Section>
    </Layout>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Keep registry visible to bundlers in case of future tree-shaking surprises.
void blogPosts;