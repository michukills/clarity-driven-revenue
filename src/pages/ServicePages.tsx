// ⚠️ ORPHANED PAGE — not routed in src/App.tsx as of P8.4.
// Kept on disk to preserve historical copy. If you re-route this page,
// re-audit copy for: pricing accuracy ($3,000 / $10,000 / $1,000), founder
// name "John Matthew Chubb", and current offer structure (Diagnostic →
// Implementation → Revenue Control System™). See P8.0/P8.1/P8.2 audits.

import { useState } from "react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import CTAStack from "@/components/CTAStack";
import DownloadModal from "@/components/DownloadModal";

interface ServicePageProps {
  title: string;
  subtitle: string;
  points: { heading: string; description: string }[];
}

const ServicePage = ({ title, subtitle, points }: ServicePageProps) => {
  const [downloadOpen, setDownloadOpen] = useState(false);

  return (
    <Layout>
      <Section className="pt-28">
        <Link to="/services" className="text-sm text-muted-foreground hover:text-primary transition-colors mb-6 inline-block">
          ← All Services
        </Link>
        <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4 text-balance">
          {title}
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mb-12">{subtitle}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {points.map((point) => (
            <div key={point.heading} className="p-6 rounded-lg bg-card border border-border">
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{point.heading}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{point.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="border-t border-border">
        <h2 className="font-display text-2xl font-semibold text-foreground mb-3">
          How we get started
        </h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-2xl leading-relaxed">
          Every engagement begins with a Revenue Systems Review — a structured working session where we walk through your numbers and identify what needs attention.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">1. Review</span>
          <span className="text-muted-foreground hidden sm:block">→</span>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">2. Revenue Diagnostic</span>
          <span className="text-muted-foreground hidden sm:block">→</span>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">3. Structured Implementation</span>
        </div>
        <CTAStack onDownloadClick={() => setDownloadOpen(true)} />
      </Section>

      <DownloadModal open={downloadOpen} onClose={() => setDownloadOpen(false)} />
    </Layout>
  );
};

export const MarketPositionPricing = () => (
  <ServicePage
    title="Market Position & Pricing"
    subtitle="Get clear on who you serve, what you sell, and whether your pricing actually supports the trade business you're trying to build."
    points={[
      { heading: "Define who you serve", description: "Stop trying to be everything to everyone. Get specific about your ideal customer — whether that's residential remodels, commercial builds, or specialty trade work." },
      { heading: "Clarify what you actually sell", description: "Many trade businesses struggle to explain their offer simply. We help you define it in a way that makes sense to the buyer and supports your revenue goals." },
      { heading: "Strengthen pricing structure", description: "If your pricing doesn't support sustainable growth, the rest falls apart. We look at your pricing model and make sure it aligns with the business you're building." },
      { heading: "Identify revenue leaks", description: "Discounts, scope creep, under-billing, weak follow-up — we find where revenue is slipping through the cracks in your trade operation." },
    ]}
  />
);

export const LeadSalesSystem = () => (
  <ServicePage
    title="Lead & Sales System"
    subtitle="Build a reliable process for finding, qualifying, and closing jobs — so revenue stops feeling random."
    points={[
      { heading: "Consistent lead sources", description: "Referrals are great, but they're not a strategy. We help trade businesses build repeatable ways to generate opportunities." },
      { heading: "Clear sales process", description: "From first inquiry to signed contract, everyone should know the steps. We document it and make it simple to follow." },
      { heading: "Follow-up discipline", description: "Most jobs are lost in the follow-up gap. We put structure around it so nothing falls through." },
      { heading: "Pipeline visibility", description: "You should always know what's in your pipeline, what's likely to close, and where things are getting stuck." },
    ]}
  />
);

export const RevenueTrackingForecasting = () => (
  <ServicePage
    title="Revenue Tracking & Forecasting"
    subtitle="Stop guessing where you stand. Build the tracking discipline and revenue visibility to know your numbers — and see what's coming."
    points={[
      { heading: "Know your numbers", description: "Revenue flow, close rates, average job size, capacity utilization. If you can't see it clearly, you can't manage it." },
      { heading: "Track what matters", description: "Not every number matters equally. We help you identify and track the metrics that actually drive your trade business forward." },
      { heading: "Forecast realistically", description: "Not pie-in-the-sky projections — honest forecasts based on real data so you can plan crews, materials, and cash flow with confidence." },
      { heading: "Catch problems early", description: "When numbers start to drift, you need to know right away — not at the end of the quarter when it's too late to course-correct." },
    ]}
  />
);

export const OperationalDiscipline = () => (
  <ServicePage
    title="Operational Discipline"
    subtitle="Revenue systems only work when the team behind them is aligned, accountable, and moving in the same direction."
    points={[
      { heading: "Clear roles", description: "Everyone should know what they own and what they're responsible for. No ambiguity, no overlap, no gaps — especially on job sites and in the office." },
      { heading: "Documented processes", description: "If it lives in someone's head, it's fragile. We help you get the important stuff written down and repeatable across your trade operation." },
      { heading: "Accountability rhythm", description: "Regular check-ins, scorecards, and honest conversations about what's working and what's not." },
      { heading: "Performance cadence", description: "Build a weekly and monthly rhythm that keeps the business on track without micromanagement." },
    ]}
  />
);
