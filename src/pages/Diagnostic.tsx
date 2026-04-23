import { motion } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  Target,
  Map,
  Users,
  Settings,
  ListChecks,
  Activity,
  ClipboardList,
  Search,
  FileText,
} from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DIAGNOSTIC_MAILTO, DIAGNOSTIC_CTA_LABEL, DIAGNOSTIC_APPLY_PATH } from "@/lib/cta";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const whoFor = [
  "Generating revenue but inconsistent",
  "Leads but poor conversion",
  "Constant operational fires",
  "Know something is wrong but unclear where",
];

const whatYouGet = [
  {
    icon: Target,
    title: "Revenue Leak Identification",
    points: ["Where leads drop off", "Where conversion fails", "Missed opportunities"],
  },
  {
    icon: Map,
    title: "Customer Journey Mapping",
    points: ["How leads find you", "What happens after", "Where friction exists"],
  },
  {
    icon: Users,
    title: "Buyer Clarity",
    points: ["Actual customer", "What they care about", "Messaging gaps"],
  },
  {
    icon: Settings,
    title: "Process Breakdown",
    points: ["How work gets done", "Inefficiencies", "Owner dependency"],
  },
  {
    icon: ListChecks,
    title: "Prioritized Action Plan",
    points: ["What to fix first", "Highest impact areas", "What can wait"],
  },
  {
    icon: Activity,
    title: "Metrics",
    points: ["What to track", "Conversion indicators", "System performance signals"],
  },
];

const howItWorks = [
  {
    icon: ClipboardList,
    title: "Input",
    description: "You share business and process information.",
  },
  {
    icon: Search,
    title: "Analysis",
    description: "We diagnose system breakdowns across all five pillars.",
  },
  {
    icon: FileText,
    title: "Delivery",
    description: "You receive clear findings and a prioritized action plan.",
  },
];

const whyItMatters = [
  "Guess what to fix",
  "Waste money on wrong solutions",
  "Fix symptoms instead of root problems",
];

const pricingIncludes = [
  "Full system breakdown",
  "Revenue leak identification",
  "Journey mapping",
  "Process evaluation",
  "Action plan",
];

const riskReduction = [
  "No fluff",
  "No long-term contracts",
  "No dependency",
];

const faqs = [
  {
    q: "Do you implement the solutions?",
    a: "Yes. The Diagnostic is the first step. After it, RGS System Implementation installs the systems we identify — guided setup, Revenue Control Center™ access, and a 30-day post-implementation grace. Implementation starts at $10,000.",
  },
  {
    q: "How long does the diagnostic take?",
    a: "Typically around 14 days depending on complexity.",
  },
  {
    q: "What happens after the diagnostic?",
    a: "You leave with a clear system map and prioritized action plan. From there, you can implement on your own or move into RGS System Implementation. Implementation is optional, not assumed.",
  },
  {
    q: "What is the Revenue Control System™?",
    a: "The Revenue Control System™ ($297/month) is the ongoing weekly operating rhythm clients use after implementation. It runs inside the Revenue Control Center™ software and tracks revenue, cash, pipeline, blockers, and trends. It begins after the 30-day post-implementation grace.",
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
            Know Exactly What's Broken —{" "}
            <span className="text-accent">Before You Try to Fix It</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-2xl">
            Most businesses aren't failing because of effort — they're fixing
            the wrong problems. This diagnostic identifies where revenue is
            leaking, where your system breaks, and what to fix first.
          </p>
          <div className="flex flex-col items-start gap-3">
            <a href={DIAGNOSTIC_MAILTO} className="btn-primary group text-base px-8 py-4">
              {DIAGNOSTIC_CTA_LABEL}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </a>
            <div className="text-xs text-muted-foreground/70 space-y-1">
              <p>Fixed-scope. No ongoing commitment.</p>
              <p>Takes ~2 minutes to get started · You'll know exactly what to fix within 14 days.</p>
            </div>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Who This Is For */}
      <Section>
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            Who This Is For
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-10 leading-[1.1]">
            Built for operators who feel the friction.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {whoFor.map((item, i) => (
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
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* What You Get */}
      <Section>
        <div className="max-w-3xl mb-12">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            What You Get
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground leading-[1.1]">
            A clear, structured deliverable.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {whatYouGet.map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="premium-card h-full"
            >
              <item.icon
                className="text-primary/70 mb-4"
                size={22}
                strokeWidth={1.5}
              />
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">
                {item.title}
              </h3>
              <ul className="space-y-2">
                {item.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                    <CheckCircle2 size={14} className="text-primary/70 flex-shrink-0 mt-1" strokeWidth={1.75} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* How It Works */}
      <Section>
        <div className="max-w-3xl mb-12">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            The Process
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground leading-[1.1]">
            How It Works
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {howItWorks.map((step, i) => (
            <motion.div
              key={step.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="premium-card h-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="font-display text-xs font-semibold text-primary/70 tracking-widest">
                  0{i + 1}
                </span>
                <span className="h-px flex-1 bg-border/40" />
                <step.icon size={18} className="text-primary/70" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Why Trust This Process */}
      <Section>
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            Why Trust This Process
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-8 leading-[1.1]">
            Grounded in how revenue actually works.
          </h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              This system isn't based on theory, trends, or generic frameworks.
            </p>
            <p>
              It's built around how real service businesses actually generate,
              convert, and deliver revenue in day-to-day operations.
            </p>
            <p className="text-foreground/90">Every diagnostic is grounded in:</p>
            <ul className="space-y-2.5 pl-1">
              {[
                { label: "Real buyer behavior", detail: "how customers actually make decisions" },
                { label: "Actual conversion paths", detail: "how leads move from inquiry to purchase" },
                { label: "Operational reality", detail: "how work gets done inside the business" },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-2" />
                  <span>
                    <span className="text-foreground/90 font-medium">{item.label}</span>
                    <span className="text-muted-foreground"> ({item.detail})</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-foreground/90 font-medium">
              No assumptions. No templates. No guesswork.
            </p>
          </div>
          <p className="mt-8 pt-6 border-t border-border/30 text-base text-foreground/90 leading-relaxed">
            Built for service businesses, trades, and owner-led companies that
            need <span className="text-accent">clarity — not more noise</span>.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Why This Matters */}
      <Section>
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            Why This Matters
          </p>
...
          <p className="font-display text-xl text-foreground leading-relaxed">
            The diagnostic is clarity — <span className="text-accent">before action</span>.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Pricing */}
      <Section>
        <div className="premium-card hover:transform-none max-w-2xl mx-auto py-14 px-10 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-5">
            Diagnostic Investment
          </p>
          <p className="font-display text-6xl md:text-7xl font-semibold text-foreground mb-2">
            $1,750
          </p>
          <p className="text-sm text-muted-foreground/80 mb-4">
            Fixed Diagnostic
          </p>
          <p className="text-sm text-accent/90 font-medium mb-10 max-w-md mx-auto leading-relaxed">
            One missed issue in your system can cost more than this every month.
          </p>

          <div className="border-t border-border/30 pt-8 mb-8">
            <ul className="space-y-3 text-left max-w-sm mx-auto">
              {pricingIncludes.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" strokeWidth={1.75} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-xs text-muted-foreground/70 space-y-1 mb-8">
            <p>One primary product · Add-ons available · No ongoing commitment</p>
          </div>

          <p className="font-display text-base md:text-lg text-foreground/90 italic leading-relaxed max-w-md mx-auto">
            "This is not a cost — it's clarity before you invest in fixing the
            wrong thing."
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Risk Reduction */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4 text-center">
            What You Won't Get
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            {riskReduction.map((item, i) => (
              <motion.div
                key={item}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center py-6 px-5 rounded-lg border border-border/30 bg-card/30"
              >
                <span className="text-sm text-muted-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
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

      {/* Final CTA */}
      <Section className="grid-bg">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-6 leading-[1.1]">
            Stop Guessing.{" "}
            <span className="text-accent">Start Fixing the Right Thing.</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground/80 italic mb-10 max-w-xl mx-auto leading-relaxed">
            Most businesses wait too long to fix system issues — and pay for it
            in lost revenue.
          </p>
          <div className="flex flex-col items-center gap-4">
            <a href={DIAGNOSTIC_MAILTO} className="btn-primary group text-base px-8 py-4">
              {DIAGNOSTIC_CTA_LABEL}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </a>
            <div className="text-xs text-muted-foreground/70 space-y-1">
              <p>Takes ~2 minutes to get started</p>
              <p>No pressure. No ongoing obligation beyond the diagnostic.</p>
            </div>
            <a
              href={DIAGNOSTIC_MAILTO}
              className="text-muted-foreground/60 hover:text-primary transition-colors duration-300 text-sm mt-2"
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
