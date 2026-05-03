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
    title: "Demand Generation",
    points: ["How attention comes in", "Where lead flow is fragile", "What is actually predictable"],
  },
  {
    icon: Map,
    title: "Revenue Conversion",
    points: ["How interest becomes revenue", "Where the sales process breaks", "Where follow-up is dropping"],
  },
  {
    icon: Users,
    title: "Operational Efficiency",
    points: ["Where work gets stuck", "What causes rework or friction", "What runs only on heroics"],
  },
  {
    icon: Settings,
    title: "Financial Visibility",
    points: ["What the owner can see in time", "Where margin or cash is unclear", "What signals are missing"],
  },
  {
    icon: ListChecks,
    title: "Owner Independence",
    points: ["Where the business depends on the owner", "Where decisions bottleneck", "Where knowledge lives in one head"],
  },
  {
    icon: Activity,
    title: "What Needs Attention First",
    points: ["Findings tied to evidence", "Likely priority areas", "The next decision to make"],
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

// Service boundary — calm, plain notes about what the Diagnostic is
// and what the owner remains responsible for. Not a legal disclaimer
// section; just clear expectations near the offer.
const diagnosticBoundary = {
  is: [
    "Identifies what appears to be breaking and where the system may be slipping",
    "Prioritizes what needs attention first based on the information provided",
    "Connects findings back to the five operating pillars",
  ],
  isNot: [
    "Not a guarantee of revenue, growth, or business outcomes",
    "Not a legal, tax, accounting, HR, or compliance review",
    "Not a substitute for owner judgment or licensed professional advice",
  ],
};

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
    q: "What does one Diagnostic cover?",
    a: "A standard Diagnostic is built around one primary business, one primary operating unit or location, and one primary product, service, or revenue line. If the business has multiple locations, brands, major service lines, or revenue models, RGS may recommend expanding or phasing the review so the findings stay useful — one weak area should not blur the read on the rest of the system.",
  },
  {
    q: "What information do you need from me?",
    a: "RGS may ask about your offer, target customers, lead sources, sales and follow-up process, pricing and average ticket, revenue patterns, customer journey, operations and delivery, staffing or handoffs, financial visibility, owner involvement, and the tools you use. Where useful and available, RGS may also ask for reports from systems like QuickBooks, Stripe, Square, HubSpot, or Dutchie.",
  },
  {
    q: "What if my information is incomplete?",
    a: "RGS can only diagnose what it can see. If the information provided is incomplete, outdated, or inaccurate, the findings may be limited or directional. That does not make the Diagnostic useless — it just affects how strongly RGS can interpret the issues, and the report will say so plainly.",
  },
  {
    q: "What happens after the diagnostic?",
    a: "You leave with a clear system map and prioritized action plan. From there, you can implement on your own or move into RGS System Implementation. Implementation is optional, not assumed.",
  },
  {
    q: "What is the Revenue Control System™?",
    a: "The Revenue Control System™ ($297/month) is the post-implementation control layer clients use after systems are installed. It runs inside the Revenue Control Center™ software and tracks revenue, cash, pipeline, blockers, and trends. It begins after the 30-day post-implementation grace.",
  },
  {
    q: "Does RGS replace QuickBooks, HubSpot, Square, or my other tools?",
    a: "No. RGS is not designed to become another tool the owner has to manage. Where supported, RGS can help connect key business truth sources — accounting systems like QuickBooks or Xero, CRM tools like HubSpot or Salesforce, POS systems like Square or Dutchie, payment processors like Stripe, and other operating data sources — so the owner is not trying to interpret every tool in isolation. The goal is a clearer operating picture, not more software noise. Integration readiness varies by platform and client setup, and RGS does not guarantee clean data if the source system is messy.",
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
      <SEO
        title="RGS Business Diagnostic — Find What's Actually Breaking Revenue"
        description="The RGS Business Diagnostic is a structured analysis for owner-led service businesses. Identifies revenue leaks, conversion gaps, and operating breakdowns — and what to fix first. Fixed scope, $3,000."
        canonical="/diagnostic"
      />
      {/* Hero */}
      <Section className="pt-32 grid-bg">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
            The Diagnostic
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6 leading-[1.05]">
            Find What Is Actually <span className="text-accent">Breaking.</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4 max-w-2xl">
            The Scorecard gives a starting read. The Diagnostic goes deeper by
            reviewing the information behind the score and identifying what
            needs attention first.
          </p>
          <p className="text-base text-muted-foreground/85 leading-relaxed mb-10 max-w-2xl">
            Most owners are not failing from lack of effort. The problem is
            usually that the business is carrying pressure in a part of the
            system that has not been clearly identified yet.
          </p>
          <div className="inline-flex items-baseline gap-3 mb-8 rounded-lg border border-border/50 bg-card/40 px-5 py-3">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Diagnostic</span>
            <span className="font-display text-2xl md:text-3xl text-foreground tabular-nums">$3,000</span>
            <span className="text-xs text-muted-foreground/80">fixed scope</span>
          </div>
          <div className="flex flex-col items-start gap-3">
            <Link to={DIAGNOSTIC_APPLY_PATH} className="btn-primary group text-base px-8 py-4">
              Request a Diagnostic Review
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="text-xs text-muted-foreground/70 space-y-1">
              <p>Short request form. RGS reviews fit and scope before confirming next steps.</p>
              <p>No ongoing commitment from the Diagnostic alone.</p>
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
        <p className="mt-8 text-sm text-muted-foreground text-center">
          <Link
            to="/why-rgs-is-different"
            className="inline-flex items-center gap-1.5 text-primary/80 hover:text-primary transition-colors"
          >
            See why RGS starts with diagnosis
          </Link>
        </p>
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
            $3,000
          </p>
          <p className="text-sm text-muted-foreground/80 mb-4">
            Fixed-scope Business Diagnostic
          </p>
          <p className="text-xs text-muted-foreground/80 mb-6 max-w-md mx-auto leading-relaxed">
            The Diagnostic tells you what is broken. Implementation repairs
            the system. Revenue Control System™ helps keep it stable.
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
            <p>First step before Implementation · No ongoing commitment from the Diagnostic alone</p>
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

      {/* Service boundary — what the Diagnostic is and is not. Plain
          language, not a legal block. Sets expectations near the offer. */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-6 text-center">
            What the Diagnostic Is — And Is Not
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-lg border border-border/40 bg-card/40 p-6">
              <p className="text-xs uppercase tracking-wider text-primary/80 mb-3">What it is</p>
              <ul className="space-y-2.5">
                {diagnosticBoundary.is.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/85 leading-relaxed">
                    <CheckCircle2 size={14} className="text-primary/70 flex-shrink-0 mt-1" strokeWidth={1.75} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border/40 bg-card/40 p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">What it is not</p>
              <ul className="space-y-2.5">
                {diagnosticBoundary.isNot.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0 mt-2" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-xs text-muted-foreground/80 leading-relaxed text-center max-w-2xl mx-auto">
            RGS helps identify the issue and explain the likely next step. The
            owner keeps final decision authority and remains responsible for
            execution, staffing, compliance, and business outcomes.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* What One Diagnostic Covers — scope lock + minimum data
          requirement. Plain language, no calculator, no new pricing. */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            Scope &amp; Information Needed
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6 leading-[1.1]">
            What One Diagnostic Covers
          </h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              A standard Diagnostic is built around{" "}
              <span className="text-foreground/90">one primary business</span>,{" "}
              <span className="text-foreground/90">
                one primary operating unit or location
              </span>
              , and{" "}
              <span className="text-foreground/90">
                one primary product, service, or revenue line
              </span>
              . If the business has multiple locations, brands, major service
              lines, or revenue models, RGS may recommend expanding or phasing
              the review so the findings stay useful.
            </p>
            <p className="text-sm">
              RGS may recommend reviewing those areas separately so one weak
              location, offer, or service line does not blur the read on the
              rest of the system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
            <div className="rounded-lg border border-border/40 bg-card/40 p-6">
              <p className="text-xs uppercase tracking-wider text-primary/80 mb-3">
                What RGS may need to see
              </p>
              <ul className="space-y-2 text-sm text-foreground/85 leading-relaxed">
                {[
                  "Offer or service details and target customers",
                  "Lead sources, sales process, and follow-up",
                  "Pricing, average ticket, and revenue patterns",
                  "Customer journey and operations / delivery workflow",
                  "Staffing, handoffs, and owner involvement",
                  "Financial visibility and tools or systems used",
                  "Where useful and available, reports from systems like QuickBooks, Stripe, Square, HubSpot, or Dutchie",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={14}
                      className="text-primary/70 flex-shrink-0 mt-1"
                      strokeWidth={1.75}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border/40 bg-card/40 p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                When information is incomplete
              </p>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  RGS can only diagnose what it can see. If the information
                  provided is incomplete, outdated, or inaccurate, the
                  findings may be limited or directional.
                </p>
                <p>
                  Incomplete information does not make the Diagnostic useless,
                  but it does affect how strongly RGS can interpret the
                  findings. The report will say so plainly rather than
                  pretending to be more certain than the evidence supports.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground/80 leading-relaxed text-center max-w-2xl mx-auto">
            The Scorecard gives a self-reported starting read. The Diagnostic
            goes deeper by reviewing the information behind the score and
            identifying which issues should be addressed first.
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

      {/* What Happens After You Request It — calm, plain process steps */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            The Inquiry Path
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-8 leading-[1.1]">
            What Happens After You Request It
          </h2>
          <ol className="space-y-4">
            {[
              { t: "RGS reviews the request", d: "We read what you sent and look at whether the Diagnostic is the right next step." },
              { t: "RGS confirms fit and scope", d: "If the Diagnostic is a fit, we confirm what one Diagnostic will cover for your business." },
              { t: "RGS explains what information is needed", d: "We outline the operating, sales, and financial details that will let the review be useful — not a long checklist for its own sake." },
              { t: "The Diagnostic is completed based on the information available", d: "RGS reviews the system, separates symptoms from system issues, and identifies what needs attention first." },
              { t: "You receive the report", d: "Findings, evidence levels, scope notes, and the suggested next decision." },
              { t: "You decide what to do next", d: "Implementation and ongoing Revenue Control System™ visibility are options, not assumptions. The owner keeps final decision authority." },
            ].map((step, i) => (
              <li
                key={step.t}
                className="flex items-start gap-4 rounded-lg border border-border/40 bg-card/40 p-5"
              >
                <span className="font-display text-sm text-primary/80 tabular-nums mt-0.5 flex-shrink-0 w-6">
                  0{i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{step.t}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-xs text-muted-foreground/80 leading-relaxed text-center max-w-2xl mx-auto">
            Submitting a request does not start the Diagnostic automatically.
            RGS confirms fit and scope first so the review stays useful.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* After the Diagnostic — the offer sequence, calmly framed */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            After the Diagnostic
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6 leading-[1.1]">
            Diagnostic → Implementation → Revenue Control System™
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-lg border border-border/40 bg-card/40 p-6">
              <p className="text-xs uppercase tracking-wider text-primary/80 mb-2">Diagnostic</p>
              <p className="text-sm text-foreground/85 leading-relaxed">
                Identifies what is actually breaking and what needs attention
                first. The starting point.
              </p>
            </div>
            <div className="rounded-lg border border-border/40 bg-card/40 p-6">
              <p className="text-xs uppercase tracking-wider text-primary/80 mb-2">Implementation</p>
              <p className="text-sm text-foreground/85 leading-relaxed">
                Turns the diagnosis into a repair plan and helps install
                clearer structure into how the business actually runs. Optional,
                not assumed.
              </p>
            </div>
            <div className="rounded-lg border border-border/40 bg-card/40 p-6">
              <p className="text-xs uppercase tracking-wider text-primary/80 mb-2">Revenue Control System™</p>
              <p className="text-sm text-foreground/85 leading-relaxed">
                Keeps the important signals visible after the work is done so
                the owner can see what the next decision should be.
              </p>
            </div>
          </div>
          <p className="mt-6 text-xs text-muted-foreground/80 leading-relaxed text-center max-w-2xl mx-auto">
            Each step is its own decision. The Diagnostic does not commit you
            to Implementation, and Implementation does not commit you to
            ongoing Revenue Control System™ visibility.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Final CTA */}
      <Section className="grid-bg">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-6 leading-[1.1]">
            Ready to <span className="text-accent">find what is actually breaking?</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground/85 mb-10 max-w-xl mx-auto leading-relaxed">
            RGS reviews the request and confirms fit and scope before any
            Diagnostic begins. The owner keeps final decision authority on what
            to do with the findings.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Link to={DIAGNOSTIC_APPLY_PATH} className="btn-primary group text-base px-8 py-4">
              Request a Diagnostic Review
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="text-xs text-muted-foreground/70 space-y-1">
              <p>Diagnostic — $3,000, fixed scope.</p>
              <p>No pressure. No ongoing obligation beyond the Diagnostic itself.</p>
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
