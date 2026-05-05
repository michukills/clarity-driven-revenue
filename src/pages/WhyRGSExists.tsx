// ⚠️ ORPHANED PAGE — not routed in src/App.tsx as of P8.4.
// Kept on disk to preserve historical copy. If you re-route this page,
// re-audit copy for: pricing accuracy ($3,000 / $10,000 / $1,000), founder
// name "John Matthew Chubb", and current offer structure (Diagnostic →
// Implementation → Revenue Control System™). See P8.0/P8.1/P8.2 audits.

import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Section from "@/components/Section";

const WhyRGSExists = () => {
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
              Why RGS Exists
            </h1>
          </motion.div>
        </div>
      </section>

      <Section>
        <div className="max-w-2xl space-y-6 text-muted-foreground leading-relaxed text-lg">
          <p>
            John Matthew Chubb first experienced the power of operational discipline while
            working inside one of the top performing Best Buy stores in the organization.
          </p>
          <p>
            Every part of the business ran on clear metrics, structured processes, and
            disciplined decision-making.
          </p>
          <p>
            Years later, he witnessed the opposite environment when a small business collapsed
            despite strong leadership and hard work.
          </p>
          <p className="font-display text-foreground text-xl font-semibold">
            The lesson became clear.
          </p>
          <p>
            Small businesses rarely fail because owners lack effort.
            <br />
            They fail because they lack systems.
          </p>
          <p>
            Revenue &amp; Growth Systems (RGS) was created to bring practical operational
            discipline into service businesses so owners can replace chaos with clarity and run
            companies built on structure rather than guesswork.
          </p>
          <p className="text-foreground font-medium border-l-2 border-primary pl-6">
            Small business owners deserve access to the systems that create predictable,
            disciplined businesses.
          </p>
        </div>
      </Section>
    </Layout>
  );
};

export default WhyRGSExists;
