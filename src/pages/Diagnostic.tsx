import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, X } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DIAGNOSTIC_MAILTO } from "@/lib/cta";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const mailtoLink = DIAGNOSTIC_MAILTO;

const faqs = [
  {
    q: "Do you implement the solutions?",
    a: "No. We identify problems, design systems, and give you the plan. You decide how to execute.",
  },
  {
    q: "How long does the diagnostic take?",
    a: "Typically around 14 days depending on complexity.",
  },
  {
    q: "What happens after the diagnostic?",
    a: "You leave with a clear system and priorities. Additional work can be discussed, but execution is not included.",
  },
  {
    q: "Is this for new or established businesses?",
    a: "This is best suited for businesses already operating with active revenue.",
  },
  {
    q: "What industries do you work with?",
    a: "Primarily service businesses, trades, and operators.",
  },
];

const problems = [
  "Revenue feels inconsistent",
  "Leads aren't converting",
  "You're stuck in day-to-day operations",
  "You know something is off, but can't pinpoint it",
];

const whatThisIs = [
  "Where revenue is being lost",
  "Where your system is breaking",
  "What's creating inconsistency",
  "What to fix first for the highest impact",
];

const whatYouGet = [
  "Clear buyer definition",
  "Lead source clarity",
  "Conversion path breakdown",
  "Process gaps identified",
  "Priority action plan",
];

const whatThisIsNot = [
  "Not ongoing consulting",
  "Not vague advice",
  "Not execution",
];

const Diagnostic = () => {
  return (
    <Layout>
      {/* Hero */}
      <Section className="pt-32 grid-bg">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
            The Diagnostic
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6 leading-[1.05]">
            Find What's Actually <span className="text-accent">Holding Your Business Back</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Most businesses don't need more effort.
            <br />
            They need clarity on what's broken.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* The Problem */}
      <Section>
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            The Problem
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-8 leading-[1.1]">
            Right now, you're likely dealing with at least one of these:
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
            {problems.map((item, i) => (
              <motion.div
                key={item}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="premium-card hover:transform-none py-5 px-6 flex items-start gap-3"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-2" />
                <span className="text-sm text-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
          <p className="font-display text-xl text-foreground">
            More effort won't fix this.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* What This Is */}
      <Section>
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            What This Is
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6 leading-[1.1]">
            Operational &amp; Revenue Pain Point Discovery
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            A structured diagnostic that identifies:
          </p>
          <div className="space-y-3">
            {whatThisIs.map((item, i) => (
              <motion.div
                key={item}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-center gap-3"
              >
                <CheckCircle2 size={16} className="text-primary flex-shrink-0" strokeWidth={1.75} />
                <span className="text-sm text-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* What You Get */}
      <Section>
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            What You Get
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-10 leading-[1.1]">
            A clear, structured deliverable.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {whatYouGet.map((item, i) => (
              <motion.div
                key={item}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="premium-card hover:transform-none py-5 px-6 flex items-center gap-3"
              >
                <CheckCircle2 size={16} className="text-primary flex-shrink-0" strokeWidth={1.75} />
                <span className="text-sm text-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* What This Is Not */}
      <Section>
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            What This Is Not
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-10 leading-[1.1]">
            Clarity through structure, not effort.
          </h2>
          <div className="space-y-3 mb-10">
            {whatThisIsNot.map((item, i) => (
              <motion.div
                key={item}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-center gap-3"
              >
                <X size={16} className="text-muted-foreground/60 flex-shrink-0" strokeWidth={1.75} />
                <span className="text-sm text-muted-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
          <p className="font-display text-xl text-foreground">
            This is a system-level diagnosis.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Why This Matters */}
      <Section>
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            Why This Matters
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-8 leading-[1.1]">
            Most businesses try to fix symptoms.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">
            We identify the root constraint.
          </p>
          <p className="font-display text-xl text-foreground">
            Fix that — everything else improves.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Pricing */}
      <Section>
        <div className="premium-card hover:transform-none text-center max-w-xl mx-auto py-14">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-5">
            Investment
          </p>
          <p className="font-display text-6xl md:text-7xl font-semibold text-foreground">
            $1,750
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* FAQ */}
      <Section>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            FAQ
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-10 leading-[1.1]">
            Common Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`faq-${i}`}
                className="border-b border-border/40"
              >
                <AccordionTrigger className="text-left font-display text-base md:text-lg font-medium text-foreground hover:no-underline hover:text-primary py-5 transition-colors">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>
      <Section className="grid-bg">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-8 leading-[1.15]">
            If you want to stop guessing and fix the actual problem:
          </h2>
          <div className="flex flex-col items-center gap-5">
            <a href={mailtoLink} className="btn-primary group text-base px-8 py-4">
              Start With a Diagnostic
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
