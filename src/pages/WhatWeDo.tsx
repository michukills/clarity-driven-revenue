import { motion } from "framer-motion";
import { Search, TrendingDown, AlertTriangle } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";

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
    </Layout>
  );
};

export default WhatWeDo;
