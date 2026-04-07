import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import {
  ArrowRight,
  Megaphone,
  DollarSign,
  Cog,
  BarChart3,
  UserMinus,
  CheckCircle2,
  Search,
  TrendingDown,
  AlertTriangle,
  Mail,
} from "lucide-react";

const coreProblems = [
  {
    icon: Search,
    title: "Pain Point Discovery",
    text: "You're solving the wrong problem — or solving it for the wrong customer.",
    label: "We identify:",
    items: [
      "your actual buyer",
      "what they truly care about",
      "where your current messaging disconnects",
    ],
  },
  {
    icon: TrendingDown,
    title: "Lost Revenue Conversion",
    text: "You're generating opportunities — but losing money in the process.",
    label: "We map:",
    items: [
      "how leads find you",
      "where they drop off",
      "what's preventing them from buying",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Process Execution Failure",
    text: "Your business depends on you too much — or breaks without constant oversight.",
    label: "We evaluate:",
    items: [
      "how work actually gets done",
      "where inefficiencies and gaps exist",
      "what's preventing consistency and scale",
    ],
  },
];

const pillars = [
  "Demand Generation",
  "Revenue Conversion",
  "Operational Efficiency",
  "Financial Visibility",
  "Owner Independence",
];

const whoFor = [
  "Service businesses with inconsistent revenue",
  "Trades and operators stuck doing everything themselves",
  "Businesses that feel \"off\" but can't pinpoint why",
  "Owners who want structure, not more noise",
];

const diagnosticItems = [
  "A defined buyer persona",
  "Clear outreach channels (what's working vs. wasting time)",
  "A step-by-step path from discovery to purchase",
  "Where revenue is currently being lost",
  "What to fix first for the highest impact",
];

const moreEffortItems = [
  "inconsistent revenue",
  "leads that don't convert",
  "constant operational fires",
  "feeling stuck in the business",
];

const Index = () => {
  const mailtoLink = "mailto:info@revenueandgrowthsystems.com?subject=RGS Diagnostic Inquiry";

  return (
    <Layout>
      {/* Hero */}
      <section className="min-h-[85vh] flex items-center px-6 grid-bg">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 className="font-display text-4xl md:text-6xl font-semibold leading-tight tracking-tight text-foreground">
              Your Business Isn't Broken.
              <br />
              <span className="text-primary">Your Systems Are.</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              We identify where your revenue is leaking, where your process breaks,
              and what's preventing stable growth — then design the system to fix it.
            </p>

            <div className="mt-10">
              <a href={mailtoLink} className="btn-primary">
                Request a Diagnostic
                <ArrowRight size={16} />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What We Do */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
          What We Do
        </h2>
        <div className="max-w-2xl space-y-5 text-muted-foreground leading-relaxed">
          <p className="text-lg">
            Most business owners don't have a motivation problem.
            <br />
            They have a system problem.
          </p>
          <div>
            <p className="mb-3">More effort doesn't fix:</p>
            <ul className="space-y-2">
              {moreEffortItems.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p>
            We identify exactly where the breakdown is — and design a system that removes it.
          </p>
          <p className="font-medium text-foreground">
            No guessing. No fluff. No ongoing dependency.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* 3 Core Problems */}
      <Section className="grid-bg">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-12">
          3 Core Problems We Solve
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {coreProblems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="p-8 rounded-lg bg-card border border-border"
            >
              <problem.icon className="text-primary mb-4" size={28} />
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {problem.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {problem.text}
              </p>
              <p className="text-sm font-medium text-foreground mb-2">{problem.label}</p>
              <ul className="space-y-1.5">
                {problem.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted-foreground text-sm">
                    <span className="text-primary mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* RGS Stability System */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
          The RGS Stability System
        </h2>
        <div className="max-w-2xl space-y-5 text-muted-foreground leading-relaxed">
          <p className="text-lg">
            A business is a machine.
            <br />
            If one gear slips, the entire system becomes unstable.
          </p>
          <div>
            <p className="mb-3">We rebuild the five core pillars:</p>
            <ul className="space-y-2">
              {pillars.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <p>
            When these work together, growth becomes predictable — not stressful.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* How We Work */}
      <Section className="grid-bg">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
          How We Work
        </h2>
        <div className="max-w-2xl space-y-5 text-muted-foreground leading-relaxed">
          <p className="text-lg">
            We are not an agency.
            <br />
            We do not execute for you.
          </p>
          <div>
            <p className="mb-3">We operate as architects:</p>
            <ul className="space-y-2">
              {["We identify the real problems", "We design the system to fix them", "We give you a clear, practical plan"].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p>You choose whether to implement.</p>
          <p className="font-medium text-foreground">
            You keep control. You own the outcome.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* The Diagnostic */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-2">
          The Diagnostic
        </h2>
        <p className="text-lg text-primary font-medium mb-6">
          Operational &amp; Revenue Pain Point Discovery
        </p>
        <div className="max-w-2xl space-y-5 text-muted-foreground leading-relaxed">
          <p>We break down one core product or service and give you:</p>
          <ul className="space-y-2">
            {diagnosticItems.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="font-medium text-foreground">
            You leave with a system you can actually use — not theory.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Who This Is For */}
      <Section className="grid-bg">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-8">
          Who This Is For
        </h2>
        <ul className="space-y-4 max-w-xl">
          {whoFor.map((item, i) => (
            <motion.li
              key={item}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="flex items-center gap-3 text-muted-foreground"
            >
              <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Final CTA */}
      <Section>
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
            Stop guessing what's wrong with your business.
          </h2>
          <div className="flex flex-col items-center gap-4">
            <a href={mailtoLink} className="btn-primary">
              Request your diagnostic
              <ArrowRight size={16} />
            </a>
            <a
              href={mailtoLink}
              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <Mail size={16} />
              info@revenueandgrowthsystems.com
            </a>
          </div>
          <p className="mt-10 text-sm text-muted-foreground italic">
            We work with a limited number of businesses at a time.
            <br />
            If you're serious about fixing the problem — reach out.
          </p>
        </div>
      </Section>
    </Layout>
  );
};

export default Index;
