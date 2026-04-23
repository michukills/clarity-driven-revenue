// ⚠️ ORPHANED PAGE — not routed in src/App.tsx as of P8.4.
// Kept on disk to preserve historical copy. If you re-route this page,
// re-audit copy for: pricing accuracy ($3,000 / $10,000 / $297), founder
// name "John Matthew Chubb", and current offer structure (Diagnostic →
// Implementation → Revenue Control System™). See P8.0/P8.1/P8.2 audits.

import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import { Stethoscope, Gauge, Settings, LayoutDashboard } from "lucide-react";

const steps = [
  {
    step: "1",
    icon: Stethoscope,
    title: "Business MRI™",
    description: "The process begins with a structured diagnostic of the business.",
    detail: "The MRI identifies operational gaps across the five pillars of the RGS Stability Framework™.",
  },
  {
    step: "2",
    icon: Gauge,
    title: "Stability Index™",
    description: "Results from the diagnostic generate a Stability Index™ score that measures how stable the business currently operates.",
    detail: "This score reveals where systems are strong and where improvements are needed.",
  },
  {
    step: "3",
    icon: Settings,
    title: "Stability Engine™",
    description: "Once the gaps are clear, RGS installs operational systems designed to stabilize the business.",
    detail: "These systems address marketing discipline, sales conversion, operations, financial clarity, and leadership structure.",
  },
  {
    step: "4",
    icon: LayoutDashboard,
    title: "Stability Dashboard™",
    description: "After systems are installed, businesses operate using performance dashboards and metrics that maintain operational discipline.",
    detail: "The result is a company that grows with control instead of chaos.",
  },
];

const HowRGSWorks = () => {
  return (
    <Layout>
      <section className="py-24 px-6 grid-bg">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6">
              How RGS Works
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              RGS follows a structured process designed to diagnose, measure, and install
              disciplined systems into service businesses.
            </p>
          </motion.div>
        </div>
      </section>

      <Section>
        <div className="space-y-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="p-8 rounded-lg bg-card border border-border"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  Step {s.step}
                </span>
                <s.icon className="text-primary" size={22} />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                {s.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-2">
                {s.description}
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {s.detail}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>
    </Layout>
  );
};

export default HowRGSWorks;
