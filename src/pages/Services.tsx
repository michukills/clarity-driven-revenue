// ⚠️ ORPHANED PAGE — not routed in src/App.tsx as of P8.4.
// Kept on disk to preserve historical copy. If you re-route this page,
// re-audit copy for: pricing accuracy ($3,000 / $10,000 / $297), founder
// name "John Matthew Chubb", and current offer structure (Diagnostic →
// Implementation → Revenue Control System™). See P8.0/P8.1/P8.2 audits.

import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import { Target, TrendingUp, BarChart3, Settings, ArrowRight, Search, ClipboardList, Compass } from "lucide-react";
import { motion } from "framer-motion";

const services = [
  {
    icon: Target,
    title: "Market Position & Pricing",
    description: "Define who you serve, clarify what you actually sell, and ensure your pricing supports the business you're building.",
    link: "/services/market-position-pricing",
  },
  {
    icon: TrendingUp,
    title: "Lead & Sales System",
    description: "Consistent lead sources, a clear sales process, follow-up discipline, and pipeline visibility so nothing falls through the cracks.",
    link: "/services/lead-sales-system",
  },
  {
    icon: BarChart3,
    title: "Revenue Tracking & Forecasting",
    description: "Know your numbers, track the metrics that drive your business, forecast realistically, and catch problems before they become emergencies.",
    link: "/services/revenue-tracking-forecasting",
  },
  {
    icon: Settings,
    title: "Operational Discipline",
    description: "Clear roles, documented processes, accountability rhythm, and a performance cadence that keeps the whole team moving forward.",
    link: "/services/operational-discipline",
  },
];

const Services = () => {
  return (
    <Layout>
      <Section className="pt-28">
        <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4">
          What we work on
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mb-12">
          Every engagement follows a clear path: Review → Diagnostic → Structured Implementation. We start by understanding where your trade business stands before recommending where to go.
        </p>

        {/* Engagement Flow */}
        <div className="mb-16">
          <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
            Our engagement model
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "Step 1", icon: Search, title: "Revenue Systems Review", desc: "A structured working session. We walk through your core numbers and assess what's being tracked, what isn't, and where structure is missing." },
              { step: "Step 2", icon: ClipboardList, title: "Revenue Diagnostic", desc: "A paid engagement with structured audit, key metric identification, revenue flow analysis, and a written Diagnostic Report with a prioritized implementation roadmap." },
              { step: "Step 3", icon: Compass, title: "Structured Implementation", desc: "Phased execution of the diagnostic roadmap with clear priorities, disciplined weekly review rhythm, and measurable accountability.\nStructured as a 90-day stabilization engagement." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="p-6 rounded-lg bg-card border border-border"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{item.step}</span>
                  <item.icon className="text-primary" size={18} />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="h-px bg-border mb-16" />

        <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
          The four pillars we evaluate
        </h2>
        <div className="space-y-6">
          {services.map((service) => (
            <Link
              key={service.title}
              to={service.link}
              className="group flex items-start gap-6 p-8 rounded-lg bg-card border border-border hover:border-primary/40 transition-all duration-300"
            >
              <service.icon className="text-primary flex-shrink-0 mt-1" size={28} />
              <div className="flex-1">
                <h2 className="font-display text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {service.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">{service.description}</p>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" size={20} />
            </Link>
          ))}
        </div>
      </Section>
    </Layout>
  );
};

export default Services;
