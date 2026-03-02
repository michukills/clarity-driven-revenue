import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import { ArrowRight, Target, TrendingUp, BarChart3, Settings, Search, ClipboardList, Compass } from "lucide-react";

const pillars = [
  {
    icon: Target,
    title: "Market Position & Pricing",
    description: "Define who you serve, clarify your offer, and ensure your pricing supports sustainable growth.",
    link: "/services/market-position-pricing",
  },
  {
    icon: TrendingUp,
    title: "Lead & Sales System",
    description: "Consistent lead sources, a clear sales process, follow-up discipline, and pipeline visibility.",
    link: "/services/lead-sales-system",
  },
  {
    icon: BarChart3,
    title: "Revenue Tracking & Forecasting",
    description: "Know your numbers. Track the metrics that drive your business. Forecast realistically and catch problems early.",
    link: "/services/revenue-tracking-forecasting",
  },
  {
    icon: Settings,
    title: "Operational Discipline",
    description: "Clear roles, documented processes, accountability rhythm, and performance cadence.",
    link: "/services/operational-discipline",
  },
];

const engagementSteps = [
  {
    step: "1",
    icon: Search,
    title: "Revenue Systems Review",
    subtitle: "Initial Working Session",
    description:
      "A structured, data-driven working session. We walk through your core numbers and assess what's being tracked, what isn't, and where structure is missing — replacing assumptions with clarity.",
    details: [
      "Surface-level review of revenue flow, lead sources, close rate, and capacity",
      "Identify gaps in structured tracking and operational visibility",
      "Determine whether deeper diagnostic work is required",
      "Clear next steps — no pressure, no pitch",
    ],
  },
  {
    step: "2",
    icon: ClipboardList,
    title: "Paid Revenue Diagnostic",
    subtitle: "Paid Engagement",
    description:
      "A paid engagement built on measurable analysis, not opinion. We dig into your numbers across all four pillars and deliver a written report grounded in what the data actually says.",
    details: [
      "Structured audit across all four pillars",
      "Revenue flow visibility and key metric identification",
      "Performance analysis across critical tracking points",
      "Written Diagnostic Report with prioritized roadmap",
    ],
  },
  {
    step: "3",
    icon: Compass,
    title: "Structured Implementation Support",
    subtitle: "Phased Execution",
    description:
      "Once the roadmap is in place, we work alongside you to execute it — phase by phase, with defined priorities and a disciplined review rhythm. Every decision is measured against clear performance benchmarks.",
    details: [
      "Phased execution of the diagnostic roadmap",
      "Clear priorities at every stage",
      "Regular review rhythm and measurable accountability",
      "Ongoing refinement as your business evolves",
      "Typically runs 3–6 months; complete when core metrics are stabilized",
    ],
  },
];

const Index = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="min-h-[85vh] flex items-center px-6">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold leading-tight tracking-tight text-foreground text-balance max-w-4xl">
              Revenue Clarity.{" "}
              <span className="text-primary">Predictable Growth.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              We help owner-led trade businesses see what's actually happening in their numbers, build structured tracking systems, and create predictable revenue — without the chaos.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link to="/contact" className="btn-primary">
                Schedule Your Revenue Systems Review
                <ArrowRight size={16} />
              </Link>
              <Link to="/services" className="btn-outline">
                How We Work
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-6"><div className="h-px bg-border" /></div>

      {/* What We Believe */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
          What We Believe
        </h2>
        <div className="max-w-2xl space-y-5 text-muted-foreground leading-relaxed">
          <p className="text-lg">
            Strong trade businesses are built on data, not emotion. On structure, not chaos.
          </p>
          <p>
            When decisions are driven by revenue visibility and disciplined systems, growth becomes predictable. When they're driven by gut feel and urgency, even good contractors and trade operators stay stuck.
          </p>
          <p>
            We don't believe in chasing trends or reacting to noise. We believe in understanding what's actually happening — revenue flow, lead conversion, capacity utilization — and building the right systems around it.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6"><div className="h-px bg-border" /></div>

      {/* Engagement Model */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
          How every engagement works
        </h2>
        <p className="text-muted-foreground text-lg mb-12 max-w-2xl leading-relaxed">
          We follow a clear, three-step process. Each step builds on the last — so you always know where you are and what comes next.
        </p>
        <div className="space-y-8">
          {engagementSteps.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="p-8 rounded-lg bg-card border border-border"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  Step {item.step}
                </span>
                <item.icon className="text-primary" size={22} />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-primary font-medium mb-3">{item.subtitle}</p>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4 max-w-3xl">{item.description}</p>
              <ul className="space-y-2">
                {item.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-1 flex-shrink-0">—</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6"><div className="h-px bg-border" /></div>

      {/* Framework */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
          Four pillars of a working revenue system
        </h2>
        <p className="text-muted-foreground text-lg mb-12 max-w-2xl">
          Every trade business we work with gets evaluated across these four areas. If one is weak, the whole system feels it.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((pillar, i) => (
            <Link
              key={pillar.title}
              to={pillar.link}
              className="group block p-8 rounded-lg bg-card border border-border hover:border-primary/40 transition-all duration-300"
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <pillar.icon className="text-primary mb-4" size={28} />
                <h3 className="font-display text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{pillar.description}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section className="border-t border-border">
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
            Ready to see where you actually stand?
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

export default Index;
