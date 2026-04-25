import { motion } from "framer-motion";
import {
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  Stethoscope,
  Map,
  X,
  Wrench,
  Activity,
  Megaphone,
  Repeat,
  Cog,
  LineChart,
  UserCheck,
  ShieldCheck,
  FileSearch,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import { DIAGNOSTIC_APPLY_PATH, DIAGNOSTIC_MAILTO } from "@/lib/cta";

// Trade/service businesses RGS is built for. Kept narrow on purpose —
// no MMJ/retail/e-commerce/SaaS expansion.
const builtFor = [
  "Contractors & general builders",
  "Home services",
  "HVAC",
  "Plumbing",
  "Roofing",
  "Mechanical & service businesses",
  "Owner-led local service companies",
];

// Five pillars the diagnostic looks at, with plain-English failure modes.
const pillars = [
  {
    icon: Megaphone,
    title: "Demand Generation",
    description:
      "Where lead flow is unreliable, mis-targeted, or dependent on referrals you can't predict.",
  },
  {
    icon: Repeat,
    title: "Revenue Conversion",
    description:
      "Where quotes, follow-ups, and close steps break down — and good leads quietly slip away.",
  },
  {
    icon: Cog,
    title: "Operational Efficiency",
    description:
      "Where dispatch, scheduling, jobs, and handoffs lose hours, margin, or customer trust.",
  },
  {
    icon: LineChart,
    title: "Financial Visibility",
    description:
      "Where cash, AR, payroll load, and margin aren't measured weekly — so problems show up late.",
  },
  {
    icon: UserCheck,
    title: "Owner Independence",
    description:
      "Where the business runs through the owner — decisions, sales, and quality all sit on one person.",
  },
];

// Diagnostic flow — 7 named steps with the trust framing.
const diagnosticFlow = [
  { step: "01", title: "Scorecard / Intake", description: "Owner-reported baseline of where the business stands." },
  { step: "02", title: "Diagnostic Interview", description: "Structured interview that pulls real context, not check-boxes." },
  { step: "03", title: "Evidence Mapping", description: "Each finding is tied back to a source — interview, document, or system." },
  { step: "04", title: "Revenue Leak Quantification", description: "Where possible, leaks are sized so priority is honest, not opinion." },
  { step: "05", title: "Report Draft", description: "Findings, risks, missing data, and recommended next steps in one document." },
  { step: "06", title: "Admin Validation", description: "A human reviews the draft before anything is presented as client-facing." },
  { step: "07", title: "Implementation Plan", description: "If you proceed, the plan installs the changes the diagnostic identified." },
];

const trustPrinciples = [
  "Owner-reported information is kept separate from validated evidence.",
  "Weak or missing data lowers the confidence on a finding — it doesn't get hidden.",
  "Vague answers are not treated as fact.",
  "Every report distinguishes what is known, what is likely, and what still needs proof.",
];

const notForList = [
  "Owners looking for quick hacks or shortcuts",
  "Businesses that aren't operating yet",
  "Anyone expecting done-for-you execution",
];

const Index = () => {
  return (
    <Layout>
      <SEO
        title="Evidence-Based Revenue Diagnostics for Trade & Service Businesses | RGS"
        description="RGS helps trade and service business owners find revenue leaks, weak systems, financial blind spots, and owner-dependence — using an evidence-based diagnostic and a practical implementation plan."
        canonical="/"
      />
      {/* ── HERO ── */}
      <section className="min-h-[88vh] flex items-center pt-32 pb-20 px-6 hero-grid-bg relative overflow-hidden">
        {/* Soft ambient glow — far right, low intensity */}
        <div className="absolute top-1/2 right-[8%] -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(78,30%,40%)]/[0.05] blur-[160px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[62%_38%] gap-16 items-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="font-hero text-[2.125rem] md:text-[2.5rem] lg:text-[2.875rem] xl:text-[3.0625rem] font-bold leading-[1.14] tracking-[-0.02em] text-foreground text-balance">
              Evidence-based revenue diagnostics for{" "}
              <span className="text-[hsl(78,24%,60%)] font-semibold">trade and service businesses</span>
            </h1>

            <p className="mt-7 text-base md:text-lg text-foreground/75 max-w-[34rem] leading-[1.65] font-hero font-normal">
              RGS helps owners identify where revenue is being lost across
              leads, sales, operations, financial visibility, and
              owner-dependence — then turns that diagnosis into a practical
              implementation plan.
            </p>

            <div className="mt-10 flex flex-col items-start gap-4">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  to="/scorecard"
                  className="font-hero inline-flex items-center justify-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-[0.9375rem] px-6 py-3.5 rounded-md shadow-[0_2px_10px_-2px_hsl(78_36%_35%/0.35)] transition-all duration-200 hover:bg-[hsl(78,36%,46%)] hover:-translate-y-px hover:shadow-[0_6px_20px_-4px_hsl(78_36%_35%/0.45)] group"
                >
                  Start with the Scorecard
                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  to={DIAGNOSTIC_APPLY_PATH}
                  className="font-hero inline-flex items-center justify-center gap-2 text-[0.9375rem] font-medium text-foreground/85 px-6 py-3.5 rounded-md border border-border/70 hover:border-[hsl(78,30%,45%)]/60 hover:text-foreground hover:bg-card/40 transition-all duration-200"
                >
                  Book a Diagnostic Call
                </Link>
              </div>
              <p className="text-xs text-muted-foreground/80 max-w-xl leading-relaxed font-hero">
                The Scorecard is preliminary and self-reported. Final
                recommendations require diagnostic review and evidence
                validation.
              </p>
            </div>

            <p className="mt-8 text-sm text-muted-foreground/70 font-hero">
              Built for owner-led trade and service businesses, including
              contractors, home services, HVAC, plumbing, and roofing.
            </p>
          </motion.div>

          {/* Right side — quiet depth, no decorative shapes */}
          <div className="hidden lg:block relative h-[380px]" aria-hidden="true" />
        </div>
      </section>

      {/* ── WHO THIS IS FOR ── */}
      <Section>
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            Who this is for
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
            Built specifically for trade and service businesses
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            RGS is narrow on purpose. The diagnostic is calibrated for
            owner-led service operations, not generic small business advice.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {builtFor.map((item) => (
            <div
              key={item}
              className="text-sm text-foreground/85 px-4 py-3 rounded-lg border border-border/40 bg-card/40 text-center leading-snug"
            >
              {item}
            </div>
          ))}
        </div>
      </Section>

      {/* ── WHAT RGS DIAGNOSES — 5 pillars ── */}
      <Section>
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            What RGS diagnoses
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
            Five places revenue quietly breaks
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Most owner-led service businesses lose revenue in the same five
            places. The diagnostic looks at each one with the same discipline.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className="premium-card h-full"
            >
              <p.icon
                className="text-primary/70 mb-5"
                size={26}
                strokeWidth={1.5}
              />
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                {p.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {p.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── HOW THE DIAGNOSTIC WORKS ── */}
      <Section>
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            How the diagnostic works
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
            From scorecard to a validated plan
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Every step ties claims to evidence. Missing data lowers
            confidence. Recommendations are reviewed before becoming
            client-facing.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {diagnosticFlow.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.45 }}
              className="premium-card h-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="font-display text-xs font-semibold text-primary/70 tracking-widest">
                  {s.step}
                </span>
                <span className="h-px flex-1 bg-border/40" />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {s.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── BUILT TO AVOID GUESSWORK — Trust layer ── */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4 inline-flex items-center gap-2">
              <ShieldCheck size={14} />
              Trust layer
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
              Built to avoid guesswork
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              RGS is built around evidence discipline. The diagnostic is
              designed to be honest about what it knows, what it doesn't, and
              where it needs more proof.
            </p>
          </div>
          <div className="space-y-3">
            {trustPrinciples.map((line, i) => (
              <motion.div
                key={line}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="flex items-start gap-3 px-5 py-4 rounded-lg border border-border/40 bg-card/40"
              >
                <CheckCircle2
                  size={16}
                  strokeWidth={1.75}
                  className="text-primary/80 flex-shrink-0 mt-0.5"
                />
                <span className="text-sm text-foreground/85 leading-relaxed">
                  {line}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── OFFERS — light pricing ── */}
      <Section>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
              Offers
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
              Diagnostic first, implementation second
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The diagnostic always comes first. If the findings warrant it,
              an implementation plan installs the changes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link to="/diagnostic" className="group block premium-card h-full">
              <FileSearch
                className="text-primary/70 mb-5 transition-all duration-300 group-hover:text-primary group-hover:scale-110"
                size={28}
                strokeWidth={1.5}
              />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-2">
                Step 1
              </p>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                RGS Diagnostic
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Fixed-scope evidence-based diagnostic. Identifies revenue
                leaks, system gaps, and what to address first. Starts at
                $3,000.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm text-primary/80 font-medium group-hover:text-primary transition-colors">
                Learn more
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link to="/implementation" className="group block premium-card h-full">
              <Wrench
                className="text-primary/70 mb-5 transition-all duration-300 group-hover:text-primary group-hover:scale-110"
                size={28}
                strokeWidth={1.5}
              />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-2">
                Step 2 — after diagnostic
              </p>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                RGS Implementation
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Installs the systems the diagnostic identified, with guided
                tool setup and an operating rhythm. Starts at $10,000.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm text-primary/80 font-medium group-hover:text-primary transition-colors">
                Learn more
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-6 text-center max-w-xl mx-auto leading-relaxed">
            Pricing is a starting point. Final scope is set after the
            diagnostic is reviewed.
          </p>
        </div>
      </Section>

      {/* ── PREMIUM CTA BLOCK ── */}
      <section className="relative py-24 md:py-32 px-6 bg-[hsl(0_0%_8%)] border-t border-border/40 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[hsl(78_36%_35%/0.06)] blur-[140px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="container mx-auto max-w-2xl text-center relative"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-[2.5rem] font-semibold text-foreground leading-[1.15] tracking-tight">
            Find out where your revenue is actually breaking
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Start with the Scorecard for a preliminary read, or book a
            diagnostic call to scope a full evidence-based review.
          </p>

          <div className="mt-10 flex flex-col items-center gap-5">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/scorecard"
                className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-8 py-4 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-4px_hsl(78_36%_35%/0.6)] group"
              >
                Start with the Scorecard
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                to={DIAGNOSTIC_APPLY_PATH}
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground/90 px-6 py-3.5 rounded-lg border border-border/60 hover:border-primary/50 hover:text-foreground transition-all duration-300"
              >
                Book a Diagnostic Call
              </Link>
            </div>
            <a
              href={DIAGNOSTIC_MAILTO}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Or book a discovery conversation
            </a>
          </div>
        </motion.div>
      </section>

      {/* ── THIS IS NOT FOR ── */}
      <Section>
        <div className="max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4 text-center">
            Be Honest With Yourself
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-10 leading-[1.15] text-center">
            This Is Not For
          </h2>
          <div className="space-y-3">
            {notForList.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="flex items-center gap-3 py-3 px-5 rounded-lg border border-border/30 bg-card/30"
              >
                <X size={15} className="text-muted-foreground/50 flex-shrink-0" strokeWidth={1.75} />
                <span className="text-sm text-muted-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── WHY RGS EXISTS ── */}
      <Section className="grid-bg">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
            Why RGS Exists
          </p>
          <p className="font-display text-xl md:text-2xl text-foreground/90 leading-relaxed">
            RGS was built to give business owners clarity without the noise,
            guesswork, or dependency most consulting creates.
          </p>
        </div>
      </Section>
    </Layout>
  );
};

export default Index;
