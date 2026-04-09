import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const diagnosticItems = [
  "A defined buyer persona",
  "Clear outreach channels (what's working vs. wasting time)",
  "A step-by-step path from discovery to purchase",
  "Where revenue is currently being lost",
  "What to fix first for the highest impact",
];

const whoFor = [
  "Service businesses with inconsistent revenue",
  "Trades and operators stuck doing everything themselves",
  "Businesses that feel \u201Coff\u201D but can\u2019t pinpoint why",
  "Owners who want structure, not more noise",
];

const mailtoLink =
  "mailto:info@revenueandgrowthsystems.com?subject=RGS Diagnostic Inquiry";

const Diagnostic = () => {
  return (
    <Layout>
      <Section className="pt-32 grid-bg">
        <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-2 leading-[1.1]">
          The Diagnostic
        </h1>
        <p className="text-lg text-primary font-medium mb-10">
          Operational &amp; Revenue Pain Point Discovery
        </p>

        <div className="max-w-3xl">
          <p className="text-muted-foreground mb-8 leading-relaxed">
            We break down one core product or service and give you:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {diagnosticItems.map((item, i) => (
              <motion.div
                key={item}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-start gap-3 p-5 rounded-xl bg-card/50 border border-border/40 transition-all duration-300 hover:border-primary/30"
              >
                <CheckCircle2
                  size={16}
                  className="text-primary flex-shrink-0 mt-0.5"
                />
                <span className="text-sm text-foreground">{item}</span>
              </motion.div>
            ))}
          </div>

          <p className="font-medium text-foreground text-lg">
            You leave with a system you can actually use — not theory.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-10 leading-[1.1]">
          Who This Is For
        </h2>
        <ul className="space-y-5 max-w-xl">
          {whoFor.map((item, i) => (
            <motion.li
              key={item}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="flex items-center gap-3 text-muted-foreground"
            >
              <CheckCircle2
                size={18}
                className="text-primary flex-shrink-0"
              />
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      <Section className="grid-bg">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6 leading-[1.1]">
            Stop Guessing What's Wrong With Your Business
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            We work with a limited number of businesses at a time.
            <br />
            If you're serious about fixing the problem — reach out.
          </p>
          <div className="flex flex-col items-center gap-5">
            <a href={mailtoLink} className="btn-primary group text-base px-8 py-4">
              Request Your Diagnostic
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </a>
            <a
              href={mailtoLink}
              className="text-muted-foreground/60 hover:text-primary transition-colors duration-300 text-sm"
            >
              info@revenueandgrowthsystems.com
            </a>
          </div>
        </div>
      </Section>
    </Layout>
  );
};

export default Diagnostic;
