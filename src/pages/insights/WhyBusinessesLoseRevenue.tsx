import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Users, Map, LineChart, Activity, Wrench, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import { DIAGNOSTIC_APPLY_PATH } from "@/lib/cta";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const leakAreas = [
  {
    icon: Users,
    title: "Wrong customers",
    body: "Effort spent attracting buyers who were never going to be a fit drains revenue without ever showing up as a single line item.",
    href: "/identify-ideal-customer",
    linkLabel: "How to identify your ideal customer",
  },
  {
    icon: Map,
    title: "Unclear buyer journey",
    body: "Prospects drop off because the next step is unclear, inconsistent, or too hard. It looks like a lead-quality problem. It usually isn't.",
    href: "/losing-customers-before-they-buy",
    linkLabel: "Why you're losing customers before they buy",
  },
  {
    icon: LineChart,
    title: "No weekly revenue visibility",
    body: "Owners review numbers monthly or quarterly. By then the leak has already shipped. Patterns become visible only when looked at weekly.",
    href: "/track-revenue-cash-flow-weekly",
    linkLabel: "How to track revenue and cash flow weekly",
  },
  {
    icon: Activity,
    title: "No business stability signal",
    body: "Revenue alone doesn't prove stability. Owner-dependency, single-source pipelines, and fragile processes hide inside top-line numbers.",
    href: "/measure-business-stability",
    linkLabel: "How to measure business stability",
  },
  {
    icon: Wrench,
    title: "Operational bottlenecks",
    body: "Handoffs break, follow-ups slip, the owner becomes the bottleneck. Adding more leads to a broken process produces more lost revenue, not more revenue.",
    href: "/fix-operational-bottlenecks",
    linkLabel: "How to fix operational bottlenecks",
  },
  {
    icon: Eye,
    title: "Cash flow blind spots",
    body: "Revenue can look healthy while cash quietly tightens. Receivables, timing, and obligations need their own weekly view, not a year-end surprise.",
    href: "/track-revenue-cash-flow-weekly",
    linkLabel: "Track cash flow weekly",
  },
];

const WhyBusinessesLoseRevenue = () => {
  return (
    <Layout>
      <SEO
        title="Why Your Business Is Losing Money (And How to Fix It) — RGS"
        description="Most businesses don't lose revenue randomly. Learn the structural reasons revenue leaks happen — wrong customers, unclear buyer journeys, weak weekly visibility, and operational bottlenecks — and how RGS diagnoses what to fix first."
        canonical="/why-businesses-lose-revenue"
      />

      {/* Hero */}
      <Section className="pt-32 grid-bg">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
            Revenue Leaks &amp; Business Stability
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6 leading-[1.05]">
            Why your business is losing money{" "}
            <span className="text-accent">(and how to fix it)</span>.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-2xl">
            Most businesses don't lose revenue randomly. They lose it in the
            same handful of structural places — quietly, week after week, until
            the year-end number tells a story no one was watching in real time.
          </p>
          <p className="text-base text-foreground/80 italic mb-10 max-w-2xl">
            We don't run your business. We fix the system that runs it.
          </p>
          <div className="flex flex-col items-start gap-3">
            <Link
              to={DIAGNOSTIC_APPLY_PATH}
              className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-7 py-3.5 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-4px_hsl(78_36%_35%/0.55)] group"
            >
              Request a Diagnostic
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="text-xs text-muted-foreground/70">
              The Diagnostic identifies which leaks are costing you most — and what to fix first.
            </p>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* What a revenue leak is */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            What a Revenue Leak Actually Is
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground leading-[1.1] mb-6">
            A revenue leak is a structural issue, not a bad month.
          </h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              A revenue leak is any place where the way the business is set up
              quietly costs you money you should be earning. It is not a bad
              week. It is not a slow season. It is the way the system itself
              repeatedly produces the same loss.
            </p>
            <p>
              Effort cannot fix a structural leak. Working harder against a
              broken funnel, an unclear buyer journey, or a missing weekly
              operating rhythm produces more activity and the same outcome.
            </p>
            <p>
              Most owners can feel the leak. Few can name it. Fewer can rank
              which leak to fix first. That ordering is the work.
            </p>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Common places money leaks */}
      <Section>
        <div className="max-w-3xl mb-12">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            Where Money Most Often Leaks
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground leading-[1.1]">
            Six structural places — not six bad habits.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {leakAreas.map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="premium-card h-full flex flex-col"
            >
              <item.icon className="text-primary/70 mb-4" size={22} strokeWidth={1.5} />
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                {item.body}
              </p>
              <Link
                to={item.href}
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors font-medium"
              >
                {item.linkLabel}
                <ArrowRight size={14} />
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Why most businesses can't see the problem */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            Why The Problem Is Hard To See
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6 leading-[1.15]">
            You can't fix what the system is hiding from you.
          </h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              Owners are inside the business. The same dashboards, the same
              meetings, the same gut-feel cadence. The leak hides in the gap
              between what's tracked and what actually drives revenue.
            </p>
            <p>
              Generic advice doesn't help here. "Get more leads" is not an
              answer when conversion is broken. "Hire someone" is not an answer
              when the process they'd inherit is the bottleneck. The work is
              structural before it is tactical.
            </p>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* How RGS approaches it */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            How RGS Approaches It
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground leading-[1.1] mb-8">
            Diagnose first. Implement what's actually broken. Hold it weekly.
          </h2>
          <div className="space-y-4">
            {[
              {
                title: "1. Diagnostic",
                body: "RGS uses a structured diagnostic system to surface where revenue is actually leaking — across customer fit, buyer journey, conversion, operations, and weekly visibility.",
              },
              {
                title: "2. Implementation",
                body: "The systems identified in the Diagnostic get installed into how the business actually runs — not handed over as a binder.",
              },
              {
                title: "3. Revenue Control System™",
                body: "A weekly operating rhythm — powered by the Revenue Control Center™ software — that keeps the installed systems alive instead of decaying after handoff.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="premium-card"
              >
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* What changes when leaks become visible */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            What Changes When The Right Problems Become Visible
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6 leading-[1.15]">
            Decisions stop relying on gut feel.
          </h2>
          <ul className="space-y-3">
            {[
              "You stop spending effort on the wrong fixes.",
              "You can name the structural problems out loud.",
              "You can sequence repairs by impact, not by anxiety.",
              "You see weekly whether the system is holding.",
              "You stop being the only person who knows what's going on.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-muted-foreground leading-relaxed">
                <CheckCircle2 size={16} className="text-primary/70 flex-shrink-0 mt-1" strokeWidth={1.75} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Final CTA */}
      <Section className="grid-bg">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-6 leading-[1.1]">
            Find the leak{" "}
            <span className="text-accent">before it finds the year-end number</span>.
          </h2>
          <p className="text-sm md:text-base text-muted-foreground/80 italic mb-10 max-w-xl mx-auto leading-relaxed">
            The Diagnostic is the first step. It tells you what's actually broken — in order.
          </p>
          <Link
            to={DIAGNOSTIC_APPLY_PATH}
            className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-8 py-4 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-4px_hsl(78_36%_35%/0.6)] group"
          >
            Request a Diagnostic
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </Section>
    </Layout>
  );
};

export default WhyBusinessesLoseRevenue;