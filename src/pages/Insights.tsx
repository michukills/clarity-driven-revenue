// ⚠️ ORPHANED PAGE — not routed in src/App.tsx as of P8.4.
// Kept on disk to preserve historical copy. If you re-route this page,
// re-audit copy for: pricing accuracy ($3,000 / $10,000 / $297), founder
// name "John Matthew Chubb", and current offer structure (Diagnostic →
// Implementation → Revenue Control System™). See P8.0/P8.1/P8.2 audits.

import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import EmailSubscribeForm from "@/components/EmailSubscribeForm";
import DownloadModal from "@/components/DownloadModal";
import { ArrowRight } from "lucide-react";

const articles = [
  {
    slug: "why-revenue-systems-fail",
    title: "Why Revenue Systems Fail in Trade Businesses — And What to Do Instead",
    excerpt: "Most trade businesses don't lack effort. They lack structure. Here's why even good contractors plateau — and the framework that changes the trajectory.",
    date: "February 2026",
  },
  {
    slug: "data-over-emotion",
    title: "Data Over Emotion: The Discipline That Separates Growth from Guesswork",
    excerpt: "Gut feel has its place — but when it drives your pricing, your pipeline, and your forecasts, things break. A look at what happens when you let the numbers lead.",
    date: "January 2026",
  },
  {
    slug: "four-pillars-overview",
    title: "The Four Pillars Every Trade Business Owner Should Audit Quarterly",
    excerpt: "Market position, sales systems, revenue tracking, and operational discipline. If one is weak, the whole system suffers. Here's how to self-assess.",
    date: "December 2025",
  },
];

const Insights = () => {
  const [downloadOpen, setDownloadOpen] = useState(false);

  return (
    <Layout>
      <Section className="pt-28">
        <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4">
          Insights
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mb-8">
          Practical thinking on revenue systems, revenue discipline, and structured growth for trade businesses. No hype. No fluff.
        </p>

        <div className="max-w-lg mb-16">
          <EmailSubscribeForm />
        </div>

        <div className="space-y-8">
          {articles.map((article) => (
            <Link
              key={article.slug}
              to={`/insights/${article.slug}`}
              className="group block p-8 rounded-lg bg-card border border-border hover:border-primary/40 transition-all duration-300"
            >
              <p className="text-xs text-muted-foreground mb-2">{article.date}</p>
              <h2 className="font-display text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {article.title}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-3">{article.excerpt}</p>
              <span className="text-sm text-primary font-medium inline-flex items-center gap-1">
                Read more <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <DownloadModal open={downloadOpen} onClose={() => setDownloadOpen(false)} />
    </Layout>
  );
};

export default Insights;
