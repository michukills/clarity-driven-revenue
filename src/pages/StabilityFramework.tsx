import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import {
  Megaphone,
  DollarSign,
  Cog,
  BarChart3,
  UserMinus,
} from "lucide-react";

const pillars = [
  {
    icon: Megaphone,
    title: "Demand Generation",
    body: "Every stable business needs a predictable system for generating qualified opportunities.",
    detail: "Demand generation systems ensure marketing is disciplined, measurable, and consistent rather than random and reactive.",
  },
  {
    icon: DollarSign,
    title: "Revenue Conversion",
    body: "Opportunities must convert into profitable customers.",
    detail: "Conversion systems include quoting processes, sales structure, pricing discipline, and follow-up systems.",
  },
  {
    icon: Cog,
    title: "Operational Efficiency",
    body: "Operational systems ensure work is delivered consistently without unnecessary chaos.",
    detail: "Clear workflows, scheduling systems, and operational processes increase productivity and reduce stress for both owners and teams.",
  },
  {
    icon: BarChart3,
    title: "Financial Visibility",
    body: "Owners must clearly understand the financial performance of the business.",
    detail: "Financial visibility includes accurate reporting, margin awareness, and disciplined financial tracking.",
  },
  {
    icon: UserMinus,
    title: "Owner Independence",
    body: "A business should run on systems rather than constant owner intervention.",
    detail: "Leadership structures, delegation systems, and accountability frameworks allow owners to step back from daily operational chaos.",
  },
];

const StabilityFramework = () => {
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
              The RGS Stability Framework™
            </h1>
            <div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
              <p>Stable businesses are not built through effort alone. They are built through disciplined systems.</p>
              <p>
                The RGS Stability Framework™ identifies the five operational pillars that
                determine whether a business grows with stability or chaos.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <Section>
        <div className="space-y-10">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="p-8 rounded-lg bg-card border border-border"
            >
              <div className="flex items-center gap-3 mb-4">
                <p.icon className="text-primary" size={26} />
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  {p.title}
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-2">{p.body}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{p.detail}</p>
            </motion.div>
          ))}
        </div>
      </Section>
    </Layout>
  );
};

export default StabilityFramework;
