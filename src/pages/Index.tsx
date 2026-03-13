import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import {
  ArrowRight,
  Megaphone,
  DollarSign,
  Cog,
  BarChart3,
  UserMinus,
  CheckCircle2,
} from "lucide-react";

const pillars = [
  {
    icon: Megaphone,
    title: "Demand Generation",
    description: "A predictable system for attracting qualified opportunities.",
  },
  {
    icon: DollarSign,
    title: "Revenue Conversion",
    description: "Structured sales processes that turn leads into profitable customers.",
  },
  {
    icon: Cog,
    title: "Operational Efficiency",
    description: "Clear workflows and processes that reduce operational chaos.",
  },
  {
    icon: BarChart3,
    title: "Financial Visibility",
    description: "Accurate numbers that allow owners to make confident decisions.",
  },
  {
    icon: UserMinus,
    title: "Owner Independence",
    description: "Systems that prevent the owner from becoming the operational bottleneck.",
  },
];

const outcomes = [
  "More predictable lead flow",
  "Improved conversion discipline",
  "Less wasted marketing spend",
  "Reduced operational chaos",
  "Greater financial clarity",
  "A business that runs on structured systems",
];

const Index = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="min-h-[85vh] flex items-center px-6 grid-bg">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 className="font-display text-4xl md:text-6xl font-semibold leading-tight tracking-tight text-foreground">
              Operational Discipline for
              <span className="text-primary"> Service Businesses</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              RGS installs the systems that create predictable revenue, disciplined
              operations, and reduced chaos for service business owners.
            </p>

            <p className="mt-4 text-base text-muted-foreground max-w-xl leading-relaxed">
              Built for service business owners who are tired of random marketing,
              reactive decisions, and operational chaos.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link to="/business-mri" className="btn-primary">
                Get Your Business MRI
                <ArrowRight size={16} />
              </Link>
              <Link to="/stability-framework" className="btn-outline">
                Explore the RGS Stability Framework
              </Link>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Start with a Business MRI™ and see exactly where your systems are breaking down.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What RGS Does */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
          What RGS Does
        </h2>
        <div className="max-w-2xl space-y-5 text-muted-foreground leading-relaxed">
          <p className="text-lg">
            Revenue &amp; Growth Systems installs the operational systems that transform
            chaotic service businesses into disciplined, predictable organizations.
          </p>
          <p>
            Most service businesses work hard but operate without the systems needed to
            maintain control as they grow. Marketing becomes reactive, decisions become
            unclear, and operational chaos slowly increases.
          </p>
          <p>
            RGS replaces guesswork with structure by installing disciplined systems across
            the core areas that determine whether a business remains stable or becomes chaotic.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Stability Framework Preview */}
      <Section className="grid-bg">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
          The RGS Stability Framework™
        </h2>
        <p className="text-lg text-muted-foreground mb-12 max-w-2xl leading-relaxed">
          Every stable service business is supported by five operational pillars.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="p-8 rounded-lg bg-card border border-border"
            >
              <pillar.icon className="text-primary mb-4" size={28} />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {pillar.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10">
          <Link to="/stability-framework" className="btn-primary">
            Explore the RGS Stability Framework
            <ArrowRight size={16} />
          </Link>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* What Changes */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
          What Changes After RGS
        </h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-2xl leading-relaxed">
          After installing disciplined systems across the business, owners typically experience:
        </p>

        <ul className="space-y-4 max-w-xl">
          {outcomes.map((item, i) => (
            <motion.li
              key={item}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="flex items-center gap-3 text-muted-foreground"
            >
              <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>

        <div className="mt-10">
          <Link to="/business-mri" className="btn-primary">
            Get Your Business MRI
            <ArrowRight size={16} />
          </Link>
        </div>
      </Section>
    </Layout>
  );
};

export default Index;
