import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Wrench, Layers, Activity, Calendar } from "lucide-react";
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

const whatsInstalled = [
  {
    icon: Wrench,
    title: "The systems identified in your Diagnostic",
    points: [
      "Revenue, conversion, and operations fixes",
      "Sequenced by impact, not by guesswork",
      "Installed inside your real workflow",
    ],
  },
  {
    icon: Layers,
    title: "Guided setup of the right tools",
    points: [
      "Diagnostic Engines™ already used in your scoring",
      "Structuring Engines™ to standardize how work runs",
      "Control Systems for visibility week to week",
    ],
  },
  {
    icon: Activity,
    title: "Revenue Control Center™ access",
    points: [
      "Live during implementation",
      "Tracks revenue, cash, pipeline, and blockers",
      "Used by RGS to keep the install on track",
    ],
  },
  {
    icon: Calendar,
    title: "30-day post-implementation grace",
    points: [
      "Continued Revenue Control Center™ access for 30 days after handoff",
      "Time to see the system run before deciding what's next",
      "Continued use after grace requires Revenue Control System™ ($297/month)",
    ],
  },
];

const notList = [
  "We don't run your business for you",
  "We don't promise revenue numbers or growth multiples",
  "We don't bolt on tools you don't need",
];

// Owner-responsibility line shown beneath the "What Implementation Is Not"
// grid. Keeps the boundary plainspoken instead of legalistic.
const implementationOwnerLine =
  "Implementation guidance turns the diagnosis into a repair plan and helps install clearer structure. The owner still decides what gets approved, who executes it, and how the change is carried into the business. RGS does not replace legal, tax, accounting, HR, payroll, insurance, or compliance professionals, and does not guarantee revenue or business outcomes.";

const Implementation = () => {
  return (
    <Layout>
      <SEO
        title="RGS System Implementation — Install the Systems Behind Stable Revenue"
        description="RGS System Implementation installs the operating systems identified in the Diagnostic — guided setup, Revenue Control Center™ access, and a 30-day post-implementation grace. Starting at $10,000."
        canonical="/implementation"
      />

      {/* Hero */}
      <Section className="pt-32 grid-bg">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
            RGS System Implementation
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6 leading-[1.05]">
            Install the systems that{" "}
            <span className="text-accent">make stable revenue possible</span>.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-2xl">
            The Diagnostic tells you what's actually broken. Implementation is
            where those systems get built into how your business runs — week to
            week, not in a binder.
          </p>
          <p className="text-base text-foreground/80 italic mb-10 max-w-2xl">
            We don't run your business. We fix the system that runs it.
          </p>
          <div className="flex flex-col items-start gap-3">
            <Link
              to={DIAGNOSTIC_APPLY_PATH}
              className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-7 py-3.5 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-4px_hsl(78_36%_35%/0.55)] group"
            >
              Start With a Diagnostic
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="text-xs text-muted-foreground/70">
              Implementation begins after the Diagnostic. Starting at $10,000.
            </p>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* What gets installed */}
      <Section>
        <div className="max-w-3xl mb-12">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            What Gets Installed
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground leading-[1.1]">
            A working operating system, not a deck.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {whatsInstalled.map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="premium-card h-full"
            >
              <item.icon className="text-primary/70 mb-4" size={22} strokeWidth={1.5} />
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                {item.title}
              </h3>
              <ul className="space-y-2">
                {item.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                    <CheckCircle2 size={14} className="text-primary/70 flex-shrink-0 mt-1" strokeWidth={1.75} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Pricing */}
      <Section>
        <div className="premium-card hover:transform-none max-w-2xl mx-auto py-14 px-10 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-5">
            Implementation Investment
          </p>
          <p className="font-display text-5xl md:text-6xl font-semibold text-foreground mb-2">
            Starting at $10,000
          </p>
          <p className="text-sm text-muted-foreground/80 mb-6">
            Scope sized to the systems identified in your Diagnostic
          </p>
          <p className="text-xs text-muted-foreground/80 mb-6 max-w-md mx-auto leading-relaxed">
            The Diagnostic tells you what is broken. Implementation repairs
            the system. Revenue Control System™ helps keep it stable.
          </p>
          <p className="text-sm text-accent/90 font-medium mb-8 max-w-md mx-auto leading-relaxed">
            Includes guided tool setup, Revenue Control Center™ access during
            implementation, and a 30-day post-implementation grace.
          </p>
          <div className="border-t border-border/30 pt-6">
            <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-md mx-auto">
              Continued Revenue Control Center™ access after the grace period
              requires the Revenue Control System™ subscription at $297/month.
            </p>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* What this is not */}
      <Section>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4 text-center">
            What Implementation Is Not
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            {notList.map((item, i) => (
              <motion.div
                key={item}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center py-6 px-5 rounded-lg border border-border/30 bg-card/30"
              >
                <span className="text-sm text-muted-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
          <p className="mt-8 text-xs text-muted-foreground/80 leading-relaxed text-center max-w-xl mx-auto">
            {implementationOwnerLine}
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Final CTA */}
      <Section className="grid-bg">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-6 leading-[1.1]">
            Diagnostic first.{" "}
            <span className="text-accent">Implementation when the picture is clear.</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground/80 italic mb-10 max-w-xl mx-auto leading-relaxed">
            We won't quote implementation without a Diagnostic. The work starts
            once we know what's actually broken.
          </p>
          <Link
            to={DIAGNOSTIC_APPLY_PATH}
            className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-8 py-4 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-4px_hsl(78_36%_35%/0.6)] group"
          >
            Apply for the Diagnostic
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </Section>
    </Layout>
  );
};

export default Implementation;
