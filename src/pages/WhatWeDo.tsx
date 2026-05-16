import { motion } from "framer-motion";
import { Search, TrendingDown, AlertTriangle, PlayCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import {
  DIAGNOSTIC_APPLY_PATH,
  SCAN_CTA_LABEL,
  SCAN_PATH,
} from "@/lib/cta";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
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

const moreEffortItems = [
  "inconsistent revenue",
  "leads that don't convert",
  "constant operational fires",
  "feeling stuck in the business",
];

const WhatWeDo = () => {
  return (
    <Layout>
      <SEO
        title="What RGS Does — Find What's Breaking Revenue and Fix the System"
        description="Revenue & Growth Systems identifies where revenue leaks, where conversion fails, and where operations break — then installs the structure that removes them. Built for owner-led service and trades businesses."
        canonical="/what-we-do"
      />
      <Section className="pt-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6 leading-[1.1]">
              What We Do
            </h1>
            <div className="space-y-5 text-muted-foreground leading-relaxed">
              <p className="text-lg">
                Most owners are not failing from lack of effort.
                <br />
                They are running a business with a <span className="text-foreground font-medium">system problem</span>.
              </p>
              <p>
                RGS identifies what is actually breaking, where the system is
                slipping, and what needs attention first.
              </p>
              <p className="font-medium text-foreground">
                No guessing. No fluff. No keeping the owner dependent.
              </p>
            </div>
          </div>

          <div className="premium-card">
            <p className="text-sm text-muted-foreground mb-5">
              More effort doesn't fix:
            </p>
            <ul className="space-y-4">
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

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      <Section className="grid-bg">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-[1.1]">
          The 3 Core Problems We Solve
        </h2>
        <p className="text-muted-foreground mb-14 max-w-2xl">
          Every service business we work with faces at least one of these.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {coreProblems.map((problem, i) => (
            <motion.div
              key={problem.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="group premium-card"
            >
              <problem.icon
                className="text-primary/70 mb-5 transition-all duration-300 group-hover:text-primary group-hover:scale-110"
                size={26}
                strokeWidth={1.5}
              />
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {problem.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {problem.text}
              </p>
              <p className="text-sm font-medium text-foreground mb-3">
                {problem.label}
              </p>
              <ul className="space-y-2">
                {problem.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-muted-foreground text-sm"
                  >
                    <span className="mt-2 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section className="pt-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="premium-card flex flex-col md:flex-row md:items-center md:justify-between gap-6"
        >
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-primary text-xs uppercase tracking-[0.18em] mb-3">
              <PlayCircle size={16} strokeWidth={1.5} />
              <span>Demo</span>
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3 leading-[1.15]">
              See the system in motion
            </h3>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              A short demo of how RGS turns business signals into a clearer
              operating picture so owners can see what needs attention first.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:flex-shrink-0">
            <Link
              to="/demo?utm_source=what_we_do&utm_medium=section_cta&utm_campaign=rgs_system_demo_v2"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <PlayCircle size={16} strokeWidth={1.75} />
              Watch the demo
            </Link>
            <Link
              to={`${SCAN_PATH}?utm_source=what_we_do&utm_medium=section_cta&utm_campaign=rgs_operational_scan_v1`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-border text-foreground font-medium text-sm hover:bg-muted/40 transition-colors"
            >
              {SCAN_CTA_LABEL}
              <ArrowRight size={16} strokeWidth={1.75} />
            </Link>
          </div>
        </motion.div>
      </Section>

      {/* Final CTA — give serious visitors a clear next step */}
      <Section className="grid-bg">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            Where to start
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-[1.15]">
            If the same problems keep coming back, check the system.
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto">
            Start with the Operational Friction Scan — a two-minute
            directional read on where the system is slipping and which gear
            is carrying pressure. When the friction feels real, the deeper
            Diagnostic combines structured operational review, owner
            interviews, and business-system analysis to produce a
            Diagnostic Report and Priority Repair Map.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to={SCAN_PATH}
              className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-7 py-3.5 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 group"
            >
              {SCAN_CTA_LABEL}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to={SCAN_PATH}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground/90 px-6 py-3 rounded-lg border border-border/60 hover:border-primary/50 hover:text-foreground transition-all duration-300"
            >
              {SCAN_CTA_LABEL}
            </Link>
            <Link
              to="/diagnostic"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground/85 px-6 py-3 rounded-lg border border-border/40 hover:border-primary/50 hover:text-foreground transition-all duration-300"
            >
              How the full Diagnostic works
            </Link>
          </div>
        </div>
      </Section>
    </Layout>
  );
};

export default WhatWeDo;
