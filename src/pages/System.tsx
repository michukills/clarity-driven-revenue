import { motion } from "framer-motion";
import {
  CheckCircle2,
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
    transition: { delay: i * 0.08, duration: 0.5, ease: [0, 0, 0.58, 1] as const },
  }),
};

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

const SystemPage = () => {
  return (
    <Layout>
      <Section>
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6">
            The RGS Stability System™
          </h1>
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
    </Layout>
  );
};

export default SystemPage;
