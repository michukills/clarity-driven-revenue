// ⚠️ ORPHANED PAGE — not routed in src/App.tsx as of P8.4.
// Kept on disk to preserve historical copy. If you re-route this page,
// re-audit copy for: pricing accuracy ($3,000 / $10,000 / $1,000), founder
// name "John Matthew Chubb", and current offer structure (Diagnostic →
// Implementation → Revenue Control System™). See P8.0/P8.1/P8.2 audits.

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import ShareButtons from "@/components/ShareButtons";
import CTAStack from "@/components/CTAStack";
import DownloadModal from "@/components/DownloadModal";

interface ArticleData {
  title: string;
  date: string;
  content: string[];
}

const articlesData: Record<string, ArticleData> = {
  "why-revenue-systems-fail": {
    title: "Why Revenue Systems Fail in Trade Businesses — And What to Do Instead",
    date: "February 2026",
    content: [
      "Most trade businesses don't fail from a lack of effort. They fail because the systems underneath the effort — how revenue is generated, tracked, and sustained — were never built to hold weight.",
      "It starts small. Pricing that hasn't been reviewed in years. A sales process that lives in someone's head. Metrics that no one is actually watching. No clear view of what's in the pipeline or when it's likely to close.",
      "These aren't dramatic breakdowns. They're slow leaks. And by the time they surface, the damage is already done — lost jobs, unpredictable cash flow, missed forecasts, and a crew that's working hard but not moving forward.",
      "The fix isn't more effort. It's better structure. A revenue system that tracks the right metrics, defines the right processes, and holds the right people accountable — not with bureaucracy, but with clarity.",
      "That's the foundation of what we call the Revenue Operating System™. Four pillars — Market Position & Pricing, Lead & Sales System, Revenue Tracking & Forecasting, and Operational Discipline — each reinforcing the others.",
      "When all four are working, growth becomes predictable. When even one is weak, the whole thing feels unstable. The goal isn't perfection. It's visibility — seeing where you actually stand so you can make better decisions, faster.",
    ],
  },
  "data-over-emotion": {
    title: "Data Over Emotion: The Discipline That Separates Growth from Guesswork",
    date: "January 2026",
    content: [
      "Every trade business owner has instincts. Good ones, usually. The problem isn't that instinct is wrong — it's that instinct without data is unreliable.",
      "When you set prices based on what feels right, you often leave money on the table — or price yourself out of jobs you should've won. When you forecast based on optimism, you staff up too early or invest in the wrong things.",
      "Data doesn't replace judgment. It sharpens it. It gives you the foundation to make faster decisions with more confidence — and to course-correct before small problems become expensive ones.",
      "The trade businesses that grow predictably aren't the ones with the best crews or the hardest-working owners (though those help). They're the ones that track what matters, review it regularly, and let the data inform the plan.",
      "This doesn't require complex dashboards or enterprise software. It requires discipline. Know your revenue flow. Know your close rate. Know your pipeline value and average job cycle. Know what it costs to acquire a customer.",
      "When those numbers are clear, decisions get simpler. Growth gets calmer. And the business starts running on evidence instead of adrenaline.",
    ],
  },
  "four-pillars-overview": {
    title: "The Four Pillars Every Trade Business Owner Should Audit Quarterly",
    date: "December 2025",
    content: [
      "If you only do one thing each quarter to strengthen your trade business, make it this: audit the four pillars of your revenue system.",
      "Pillar 1: Market Position & Pricing — Are you clear on who you serve? Is your pricing supporting your business, or slowly undermining it? Are you spreading too thin across too many job types?",
      "Pillar 2: Lead & Sales System — Where are your leads coming from? Is there a defined process from first inquiry to signed contract? Is follow-up happening consistently, or falling through the cracks?",
      "Pillar 3: Revenue Tracking & Forecasting — Do you know your real numbers? Not just revenue, but close rates, pipeline value, average job size, and capacity utilization? Can you forecast the next 90 days with any confidence?",
      "Pillar 4: Operational Discipline — Are roles clear? Are processes documented? Is there a regular rhythm of accountability that keeps the team aligned and moving forward?",
      "You don't need to fix everything at once. But you do need to see where things stand. That revenue visibility — honest, data-driven clarity — is the first step toward building a revenue system that actually works for your trade business.",
    ],
  },
};

const InsightArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const [downloadOpen, setDownloadOpen] = useState(false);

  const article = slug ? articlesData[slug] : null;

  if (!article) {
    return (
      <Layout>
        <Section className="pt-28">
          <h1 className="font-display text-3xl font-semibold text-foreground mb-4">Article not found</h1>
          <Link to="/insights" className="text-primary hover:underline">← Back to Insights</Link>
        </Section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Section className="pt-28">
        <Link to="/insights" className="text-sm text-muted-foreground hover:text-primary transition-colors mb-6 inline-block">
          ← All Insights
        </Link>
        <p className="text-xs text-muted-foreground mb-3">{article.date}</p>
        <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-6 text-balance max-w-3xl">
          {article.title}
        </h1>
        <div className="mb-8">
          <ShareButtons title={article.title} />
        </div>
        <div className="max-w-2xl space-y-5 text-muted-foreground leading-relaxed">
          {article.content.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <CTAStack onDownloadClick={() => setDownloadOpen(true)} />
      </Section>

      <DownloadModal open={downloadOpen} onClose={() => setDownloadOpen(false)} />
    </Layout>
  );
};

export default InsightArticle;
