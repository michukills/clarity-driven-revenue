// ⚠️ ORPHANED PAGE — not routed in src/App.tsx as of P8.4.
// Kept on disk to preserve historical copy. If you re-route this page,
// re-audit copy for: pricing accuracy ($3,000 / $10,000 / $1,000), founder
// name "John Matthew Chubb", and current offer structure (Diagnostic →
// Implementation → Revenue Control System™). See P8.0/P8.1/P8.2 audits.

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import { ArrowRight, Target, BarChart3, Clock, ClipboardList, Search } from "lucide-react";

const scorecardGroups = [
  {
    title: "Lead Flow",
    items: ["Leads by source", "Speed-to-lead (response time)", "Qualified lead rate"],
  },
  {
    title: "Sales Pipeline",
    items: ["Appointments set", "Estimates sent", "Close rate", "Average ticket"],
  },
  {
    title: "Capacity & Production",
    items: [
      "Jobs scheduled vs available capacity",
      "Job cycle time",
      "Utilization (hours sold vs available)",
      "Rework / callbacks",
    ],
  },
  {
    title: "Margin & Cash",
    items: ["Gross margin by job type", "Labor % and materials %", "Cash collected vs billed", "Accounts receivable aging"],
  },
];

const patterns = [
  { symptom: "Leads are up, revenue is flat", cause: "Conversion leak or capacity constraint" },
  { symptom: "Revenue is up, cash is tight", cause: "Billing cadence, collections, or job costing issues" },
  { symptom: "Booked out, but not profitable", cause: "Pricing and production efficiency mismatch" },
  { symptom: "Owner is overwhelmed", cause: "Missing roles, missing rhythm, no clear ownership of the key performance indicators (KPIs) that show how the business is performing" },
  { symptom: "Growth feels random", cause: "No weekly signal, no measurable control points" },
];

const Visibility = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="pt-20 pb-16 px-6">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                Framework Pillar
              </span>
              <Target className="text-primary" size={18} />
            </div>

            <h1 className="font-display text-4xl md:text-6xl font-semibold leading-tight tracking-tight text-foreground">
              Visibility: Know what’s actually happening in your revenue.
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed">
              Visibility is not “more reports.” It’s end-to-end clarity across lead flow, conversion, capacity, and cash —
              so decisions are based on reality, not assumptions.
            </p>

            <p className="mt-4 text-lg text-muted-foreground">
              If you can’t see it consistently, you can’t control it.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link to="/contact" className="btn-primary">
                Schedule Your Revenue Systems Review
                <ArrowRight size={16} />
              </Link>

              <Link to="/framework/control" className="btn-outline">
                Next: Control
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Cost of low visibility */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
          When visibility is missing, volatility takes over.
        </h2>

        <ul className="space-y-3 text-muted-foreground leading-relaxed max-w-3xl">
          {[
            "You can’t tell whether growth problems are lead, conversion, pricing, or capacity.",
            "Revenue feels unpredictable because you’re operating without a reliable weekly signal.",
            "Margin leaks stay hidden until cash tightens and decisions become reactive.",
            "The owner becomes the default control system — and burnout follows.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="text-primary mt-1">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Definition + 3 dimensions */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
          What Visibility means in the RGS Revenue Control Model™
        </h2>

        <div className="p-6 rounded-lg bg-card border border-border max-w-3xl">
          <p className="text-muted-foreground leading-relaxed">
            Visibility is the ability to see revenue flow end-to-end using consistent metrics and a disciplined review rhythm —
            so performance can be managed intentionally.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {[
            {
              icon: BarChart3,
              title: "Revenue Flow Clarity",
              desc: "Know where revenue originates, how it moves, and where it breaks down.",
            },
            {
              icon: Search,
              title: "Conversion Clarity",
              desc: "See the pipeline from lead → appointment → estimate → close, without guesswork.",
            },
            {
              icon: Clock,
              title: "Capacity & Delivery Clarity",
              desc: "Understand whether you can deliver profitably with current crews, schedule, and standards.",
            },
          ].map((c) => (
            <div key={c.title} className="p-8 rounded-lg bg-card border border-border">
              <c.icon className="text-primary mb-4" size={26} />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">{c.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Scorecard */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
          The Visibility Scorecard
        </h2>
        <p className="text-muted-foreground text-lg max-w-3xl leading-relaxed mb-10">
          We don’t build strategies on opinions. We build them on tracking points that reveal what the business is actually doing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scorecardGroups.map((g) => (
            <div key={g.title} className="p-8 rounded-lg bg-card border border-border">
              <h3 className="font-display text-xl font-semibold text-foreground mb-4">{g.title}</h3>
              <ul className="space-y-2">
                {g.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="text-primary mt-1">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-8 text-muted-foreground max-w-3xl">
          <span className="text-foreground font-medium">Note:</span> If it isn’t tracked, we don’t pretend it’s true.
        </p>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Patterns */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-10">
          Common patterns Visibility reveals
        </h2>

        <div className="space-y-4">
          {patterns.map((p) => (
            <div key={p.symptom} className="p-6 rounded-lg bg-card border border-border">
              <p className="text-foreground font-medium">{p.symptom}</p>
              <p className="text-muted-foreground text-sm mt-2">
                <span className="text-primary font-medium">→</span> {p.cause}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* How we create visibility */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
          How we create Visibility
        </h2>
        <p className="text-muted-foreground text-lg max-w-3xl leading-relaxed mb-10">
          Visibility starts with a working session that replaces assumptions with clarity. If the business needs deeper measurement,
          we move into a paid diagnostic and deliver a written roadmap grounded in the data.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                Step 1
              </span>
              <Search className="text-primary" size={20} />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              Revenue Systems Review
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A structured working session to map current tracking, identify blind spots, and clarify the most likely causes of volatility.
            </p>
          </div>

          <div className="p-8 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                Step 2
              </span>
              <ClipboardList className="text-primary" size={20} />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              Revenue Diagnostic
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A measurable audit across the RGS model — delivered as a written report with prioritized corrections and a clear path forward.
            </p>

            <div className="mt-6">
              <Link to="/services" className="btn-outline inline-flex items-center gap-2">
                View the Engagement Model
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Bridge to Control */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
          Visibility shows the truth. Control turns truth into decisions.
        </h2>
        <p className="text-muted-foreground text-lg max-w-3xl leading-relaxed mb-10">
          Once the signal is clear, we help organize control systems — ownership of the KPIs that matter, cadence, and decision rules designed to give the owner a clearer operating picture and reduce drift, based on available source data.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/framework/control" className="btn-primary">
            Next: Control
            <ArrowRight size={16} />
          </Link>
          <Link to="/framework/execution" className="btn-outline">
            Then: Execution
          </Link>
        </div>
      </Section>

      {/* Final CTA */}
      <Section className="border-t border-border">
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
            Ready to see what your numbers are actually saying?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            It starts with a Revenue Systems Review — a working session where we walk through your numbers together and identify what needs attention first.
          </p>
          <Link to="/contact" className="btn-primary">
            Schedule Your Revenue Systems Review
            <ArrowRight size={16} />
          </Link>
        </div>
      </Section>
    </Layout>
  );
};

export default Visibility;
