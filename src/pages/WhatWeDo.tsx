import { motion } from "framer-motion";
import { Search, TrendingDown, AlertTriangle } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0, 0, 0.58, 1] as const },
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
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6">
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
    </Layout>
  );
};

export default WhatWeDo;
