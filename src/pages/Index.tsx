import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Search,
  TrendingDown,
  AlertTriangle,
  Mail,
  Crosshair,
  BarChart3,
  Cog,
  Eye,
  UserMinus,
} from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import systemImage from "@/assets/rgs-stability-system-framework.png";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

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

const hoverPillars = [
  {
    icon: Crosshair,
    title: "Demand Generation",
    text: "How consistently your business creates qualified interest from the right people.",
  },
  {
    icon: BarChart3,
    title: "Revenue Conversion",
    text: "How effectively interest turns into paying customers instead of stalled opportunities.",
  },
  {
    icon: Cog,
    title: "Operational Efficiency",
    text: "How clearly and consistently the work gets done without wasted motion or constant fire-fighting.",
  },
  {
    icon: Eye,
    title: "Financial Visibility",
    text: "How well you understand the numbers that actually drive decisions, margins, and stability.",
  },
  {
    icon: UserMinus,
    title: "Owner Independence",
    text: "How much the business can function without everything depending on the owner.",
  },
];

const diagnosticItems = [
  "A defined buyer persona",
  "Clear outreach channels (what's working vs. wasting time)",
  "A step-by-step path from discovery to purchase",
  "Where revenue is currently being lost",
  "What to fix first for the highest impact",
];

const whoFor = [
  "Service businesses with inconsistent revenue",
  "Trades and operators stuck doing everything themselves",
  "Businesses that feel \u201Coff\u201D but can\u2019t pinpoint why",
  "Owners who want structure, not more noise",
];

const moreEffortItems = [
  "inconsistent revenue",
  "leads that don't convert",
  "constant operational fires",
  "feeling stuck in the business",
];

const mailtoLink =
  "mailto:info@revenueandgrowthsystems.com?subject=RGS Diagnostic Inquiry";

const Index = () => {
  return (
    <Layout>
      {/* ── HERO ── */}
      <section className="min-h-[90vh] flex items-center px-6 grid-bg relative overflow-hidden">
        {/* subtle radial glow */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.1] tracking-tight text-foreground">
              Your Business Isn't Broken.
              <br />
              <span className="text-primary">Your Systems Are.</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              We identify where your revenue is leaking, where your process
              breaks, and what's preventing stable growth — then design the
              system to fix it.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a href={mailtoLink} className="btn-primary group">
                Request a Diagnostic
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </a>
            </div>

            <p className="mt-4 text-sm text-muted-foreground/70">
              Built for service businesses, trades, and owners who need
              structure — not more noise.
            </p>
          </motion.div>

          {/* Right decorative element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative w-72 h-72">
              {/* Spinning gear rings */}
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-[spin_30s_linear_infinite]" />
              <div className="absolute inset-6 rounded-full border border-accent/15 animate-[spin_25s_linear_infinite_reverse]" />
              <div className="absolute inset-12 rounded-full border border-primary/25 animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-[4.5rem] rounded-full border border-accent/10 animate-[spin_35s_linear_infinite_reverse]" />
              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-primary/60" />
              </div>
              {/* Accent dots on rings */}
              {[0, 72, 144, 216, 288].map((deg) => (
                <div
                  key={deg}
                  className="absolute w-2 h-2 rounded-full bg-accent/40"
                  style={{
                    top: `${50 - 45 * Math.cos((deg * Math.PI) / 180)}%`,
                    left: `${50 + 45 * Math.sin((deg * Math.PI) / 180)}%`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── WHAT WE DO ── */}
      <Section id="what-we-do">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
              What We Do
            </h2>
            <div className="space-y-5 text-muted-foreground leading-relaxed">
              <p className="text-lg">
                Most business owners don't have a motivation problem.
                <br />
                They have a <span className="text-foreground font-medium">system problem</span>.
              </p>
              <p>
                We identify exactly where the breakdown is — and design a system
                that removes it.
              </p>
              <p className="font-medium text-foreground">
                No guessing. No fluff. No ongoing dependency.
              </p>
            </div>
          </div>

          <div className="p-8 rounded-xl bg-card/60 border border-border/60 backdrop-blur-sm">
            <p className="text-sm text-muted-foreground mb-4">
              More effort doesn't fix:
            </p>
            <ul className="space-y-3">
              {moreEffortItems.map((item, i) => (
                <motion.li
                  key={item}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="flex items-center gap-3 text-foreground"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {item}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-6xl px-6">
        <div className="h-px bg-border/50" />
      </div>

      {/* ── 3 CORE PROBLEMS ── */}
      <Section className="grid-bg">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
          The 3 Core Problems We Solve
        </h2>
        <p className="text-muted-foreground mb-12 max-w-2xl">
          Every service business we work with faces at least one of these.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {coreProblems.map((problem, i) => (
            <motion.div
              key={problem.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="group p-8 rounded-xl bg-card/80 border border-border/60 transition-all duration-300 hover:border-primary/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_-12px_hsl(78_36%_35%/0.2)]"
            >
              <problem.icon
                className="text-primary mb-5 transition-transform duration-300 group-hover:scale-110"
                size={28}
              />
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {problem.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                {problem.text}
              </p>
              <p className="text-sm font-medium text-foreground mb-2">
                {problem.label}
              </p>
              <ul className="space-y-1.5">
                {problem.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-muted-foreground text-sm"
                  >
                    <span className="text-primary mt-1.5 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-6xl px-6">
        <div className="h-px bg-border/50" />
      </div>

      {/* ── RGS STABILITY SYSTEM ── */}
      <Section id="system">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
            The RGS Stability System™
          </h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p className="text-lg">
              A business is a machine.
              <br />
              If one gear slips, the entire system becomes unstable.
            </p>
            <div>
              <p className="mb-4 text-foreground font-medium">
                We rebuild the five core pillars:
              </p>
              <ul className="space-y-3 inline-block text-left">
                {pillars.map((p, i) => (
                  <motion.li
                    key={p}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2
                      size={18}
                      className="text-primary flex-shrink-0"
                    />
                    <span>{p}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            <p>
              When these work together, growth becomes predictable — not
              stressful.
            </p>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-6xl px-6">
        <div className="h-px bg-border/50" />
      </div>

      {/* ── SEE THE SYSTEM — Image + Interactive Pillars ── */}
      <Section className="grid-bg">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
            See the System
          </h2>
        </div>

        <div className="max-w-4xl mx-auto mb-12">
          <img
            src={systemImage}
            alt="RGS Stability System showing five core business pillars: Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, and Owner Independence."
            className="w-full rounded-xl border border-border/40"
          />
          <p className="text-center mt-4 text-sm text-primary font-medium">
            The RGS Stability System™ — Five Interlocking Pillars That Drive
            Predictable Growth
          </p>
          <p className="text-center mt-3 text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Most businesses are missing at least one of these. That's why growth
            feels inconsistent, stressful, or stuck. We don't guess which one.
            We identify it — and fix it at the system level.
          </p>
        </div>

        {/* Interactive hover cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
          {hoverPillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="group relative p-6 rounded-xl bg-card/70 border border-border/50 text-center transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_20px_-6px_hsl(78_36%_35%/0.25)] cursor-default overflow-hidden"
            >
              {/* Glow overlay on hover */}
              <div className="absolute inset-0 bg-primary/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />

              <pillar.icon
                size={24}
                className="mx-auto text-primary/70 mb-3 transition-all duration-300 group-hover:text-primary group-hover:scale-110"
              />
              <h4 className="font-display text-sm font-semibold text-foreground mb-2">
                {pillar.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-24 transition-all duration-300">
                {pillar.text}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-6xl px-6">
        <div className="h-px bg-border/50" />
      </div>

      {/* ── HOW WE WORK ── */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
              How We Work
            </h2>
            <div className="space-y-5 text-muted-foreground leading-relaxed">
              <p className="text-lg">
                We are not an agency.
                <br />
                We do not execute for you.
              </p>
              <p>You choose whether to implement.</p>
              <p className="font-medium text-foreground">
                You keep control. You own the outcome.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              "We identify the real problems",
              "We design the system to fix them",
              "We give you a clear, practical plan",
            ].map((step, i) => (
              <motion.div
                key={step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-center gap-4 p-5 rounded-xl bg-card/60 border border-border/50"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-foreground font-medium">{step}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-6xl px-6">
        <div className="h-px bg-border/50" />
      </div>

      {/* ── THE DIAGNOSTIC ── */}
      <Section id="diagnostic" className="grid-bg">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-2">
          The Diagnostic
        </h2>
        <p className="text-lg text-primary font-medium mb-8">
          Operational &amp; Revenue Pain Point Discovery
        </p>

        <div className="max-w-3xl">
          <p className="text-muted-foreground mb-6 leading-relaxed">
            We break down one core product or service and give you:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {diagnosticItems.map((item, i) => (
              <motion.div
                key={item}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/40"
              >
                <CheckCircle2
                  size={16}
                  className="text-primary flex-shrink-0 mt-0.5"
                />
                <span className="text-sm text-foreground">{item}</span>
              </motion.div>
            ))}
          </div>

          <p className="font-medium text-foreground text-lg">
            You leave with a system you can actually use — not theory.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-6xl px-6">
        <div className="h-px bg-border/50" />
      </div>

      {/* ── WHO THIS IS FOR ── */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-8">
          Who This Is For
        </h2>
        <ul className="space-y-4 max-w-xl">
          {whoFor.map((item, i) => (
            <motion.li
              key={item}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="flex items-center gap-3 text-muted-foreground"
            >
              <CheckCircle2
                size={18}
                className="text-primary flex-shrink-0"
              />
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>
      </Section>

      <div className="container mx-auto max-w-6xl px-6">
        <div className="h-px bg-border/50" />
      </div>

      {/* ── FINAL CTA ── */}
      <Section className="grid-bg">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
            Stop Guessing What's Wrong With Your Business
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            We work with a limited number of businesses at a time.
            <br />
            If you're serious about fixing the problem — reach out.
          </p>
          <div className="flex flex-col items-center gap-4">
            <a href={mailtoLink} className="btn-primary group text-base px-8 py-3.5">
              Request Your Diagnostic
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </a>
            <a
              href={mailtoLink}
              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 text-sm"
            >
              <Mail size={14} />
              info@revenueandgrowthsystems.com
            </a>
          </div>
        </div>
      </Section>
    </Layout>
  );
};

export default Index;
