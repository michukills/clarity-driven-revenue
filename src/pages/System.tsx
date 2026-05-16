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
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import {
  SCAN_CTA_LABEL,
  SCAN_PATH,
  SCORECARD_DIAGNOSTIC_LABEL,
  SCORECARD_PATH,
} from "@/lib/cta";
import { ArrowRight } from "lucide-react";
import systemImage from "@/assets/rgs-stability-system-framework.png";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
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
      <SEO
        title="The RGS Stability System™ — Five Pillars Behind Stable Revenue"
        description="The RGS Stability System™ rebuilds the five interlocking pillars behind stable revenue: demand generation, revenue conversion, operational efficiency, financial visibility, and owner independence."
        canonical="/system"
      />
      <Section className="pt-32">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6 leading-[1.1]">
            The RGS Stability System™
          </h1>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p className="text-lg">
              A gear usually does not fail all at once.
              <br />
              One worn tooth starts slipping. Then the next part of the system
              has to carry pressure it was not built to carry.
            </p>
            <div>
              <p className="mb-5 text-foreground font-medium">
                The Stability System looks at the five places revenue usually
                starts to slip:
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
              When these are working together, the business is easier to run —
              and easier to think through.
            </p>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      <Section className="grid-bg">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
            See the System
          </h2>
        </div>

        <div className="max-w-4xl mx-auto mb-14">
          <div className="premium-card p-2 md:p-3 hover:transform-none">
            <img
              src={systemImage}
              alt="RGS Stability System showing five core business pillars: Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, and Owner Independence."
              className="w-full rounded-xl"
            />
          </div>
          <p className="text-center mt-6 text-sm text-primary font-medium">
            The RGS Stability System™ — Five Interlocking Pillars That Drive
            Predictable Growth
          </p>
          <p className="text-center mt-3 text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Most owner-led businesses are slipping in at least one of these.
            That is usually why the same problem keeps coming back. RGS does
            not guess which one — the diagnostic identifies it, and the work
            happens at the system level.
          </p>
          <p className="text-center mt-4 text-sm">
            <Link
              to="/why-rgs-is-different"
              className="inline-flex items-center gap-1.5 text-primary/80 hover:text-primary transition-colors"
            >
              See why RGS starts with diagnosis
            </Link>
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
              className="group relative p-6 rounded-2xl bg-card/50 border border-border/40 text-center transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_-8px_hsl(78_36%_35%/0.2)] cursor-default overflow-hidden"
            >
              <div className="absolute inset-0 bg-primary/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              <pillar.icon
                size={22}
                strokeWidth={1.5}
                className="mx-auto text-primary/60 mb-3 transition-all duration-300 group-hover:text-primary group-hover:scale-110"
              />
              <h4 className="font-display text-sm font-semibold text-foreground mb-2">
                {pillar.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-24 transition-all duration-400">
                {pillar.text}
              </p>
            </motion.div>
          ))}
        </div>

        {/* P96B.2 — continuity rail: how the public reads this system */}
        <div className="mt-16 max-w-4xl mx-auto rounded-2xl border border-border/50 bg-card/40 p-7 md:p-9">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-medium mb-3">
            How RGS reads this system
          </p>
          <h3 className="font-display text-2xl md:text-[1.625rem] font-semibold text-foreground mb-3 leading-snug">
            The Stability System is what RGS inspects.
            <br className="hidden md:inline" />
            The Scan and the Diagnostic are how RGS inspects it.
          </h3>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6 max-w-2xl">
            The Operational Friction Scan is the directional, two-minute
            read — it points at the gear that is likely slipping. The full
            Diagnostic is the structured inspection: the Business Stability
            Assessment (Part 1), the Owner Diagnostic Interview, and
            evidence review where available, reviewed by the RGS team
            into a Diagnostic Report and Repair Map.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={SCAN_PATH}
              className="inline-flex items-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-sm px-5 py-2.5 rounded-md transition-colors hover:bg-[hsl(78,36%,46%)] group"
            >
              {SCAN_CTA_LABEL}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to={SCORECARD_PATH}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground/85 px-5 py-2.5 rounded-md border border-border/60 hover:border-primary/50 hover:text-foreground transition-colors"
            >
              {SCORECARD_DIAGNOSTIC_LABEL}
            </Link>
          </div>
        </div>
      </Section>
    </Layout>
  );
};

export default SystemPage;
