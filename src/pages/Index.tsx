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
  Gauge,
  Compass,
  Eye,
  Layers,
} from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import {
  DIAGNOSTIC_APPLY_PATH,
  DIAGNOSTIC_MAILTO,
  SCORECARD_CTA_LABEL,
  SCORECARD_CTA_HELPER,
  SCORECARD_PATH,
  SCAN_PATH,
  SCAN_CTA_LABEL,
  SCORECARD_DIAGNOSTIC_LABEL,
  SCORECARD_DIAGNOSTIC_HELPER,
  SCAN_CTA_HELPER,
} from "@/lib/cta";
import { PUBLIC_PRICING_SUMMARY } from "@/config/rgsPricingTiers";

const DEMO_SCORECARD_CTA =
  "/scorecard?utm_source=homepage&utm_medium=demo_section&utm_campaign=rgs_system_demo_v2";

// Audience expressed as fit-patterns rather than an industry list — RGS is
// industry-aware (trade, service, retail, restaurant, regulated operators)
// but stays focused on owner-led operators with shared revenue dynamics.
const fitPatterns = [
  {
    title: "Quote- or order-based revenue",
    description:
      "Companies where inquiries, estimates, orders, follow-up, and close rate determine revenue.",
  },
  {
    title: "Owner-led decisions",
    description:
      "Operators where the owner is still central to sales, pricing, approvals, scheduling, or delivery.",
  },
  {
    title: "Local or regional operations",
    description:
      "Single-site or multi-location operators where execution depends on a small core team.",
  },
  {
    title: "Cash-flow sensitivity",
    description:
      "Businesses where timing of receivables, payroll, and inventory directly affects stability.",
  },
  {
    title: "Team execution gaps",
    description:
      "Companies with demand and capacity, but inconsistent handoffs, follow-through, or accountability.",
  },
  {
    title: "Industry-specific workflows",
    description:
      "Operators whose day-to-day depends on workflows that vary by industry — not generic playbooks.",
  },
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

const rgsWorkSteps = [
  { step: "01", title: "Start with the Scorecard", description: "A 0–1000 first-pass systems check. A structured read on where the business looks stable and where it may be slipping." },
  { step: "02", title: "Diagnose what is breaking", description: "Identify what is actually breaking across demand, conversion, operations, financial visibility, and how much the business depends on the owner." },
  { step: "03", title: "Turn the diagnosis into a repair plan", description: "The RGS Structural Health Report™ feeds a 30/60/90 RGS Repair Map™ — sequenced by impact instead of guesswork, matched to how the business actually runs." },
  { step: "04", title: "Install clearer structure", description: "Implementation puts the fixes into how the business operates week to week — not into a binder." },
  { step: "05", title: "Keep the important signals visible", description: "The Revenue Control System™ keeps the signals that matter in front of the owner. Continued visibility, not dependency." },
];

const trustPrinciples = [
  "A formal diagnostic framework, not a generic playbook",
  "5-gear RGS Stability System™",
  "0–1000 Business Stability scoring model",
  "Software-backed reporting with clear evidence trails",
  "No vague consulting retainers",
  "Built for owner-led service, trades, retail, restaurant, and regulated operators",
];

// Public Scorecard vs Paid Diagnostic — side-by-side differentiation.
// Required for P93E E1 (public clarity): a cold visitor must understand
// what the free Scorecard is, what the paid Diagnostic adds, and why the
// free tool is still a serious first-pass assessment (not a teaser).
const scorecardVsDiagnostic = {
  scorecard: {
    eyebrow: "Free · 10–15 minutes",
    title: "RGS Stability Scorecard",
    summary:
      "A first-pass, self-reported view of where your business system may be stable, slipping, or missing visibility. Directional 0–1000 read across all five gears.",
    includes: [
      "0–1000 Business Stability Score",
      "Gear-level read (200 points each)",
      "Strongest gear and most slipping gear",
      "Likely worn-tooth signals to watch",
      "Plain-English next-step direction",
    ],
    note: "Self-reported. No documents required. Useful on its own — not a replacement for evidence review.",
  },
  diagnostic: {
    eyebrow: "Paid · deeper inspection",
    title: "RGS Business Stability Diagnostic",
    summary:
      "A deeper, evidence-supported examination. RGS reviews the system with admin interpretation, contradiction checks, and a sequenced repair direction.",
    includes: [
      "Everything in the Scorecard, validated against evidence",
      "Admin review and interpretation",
      "Contradiction and source-of-truth checks",
      "Industry-specific context",
      "Prioritized repair sequencing — what to fix first and why",
    ],
    note: "Not legal, tax, accounting, compliance, or valuation advice. RGS does not promise revenue, profit, growth, or business outcomes.",
  },
} as const;

const notForList = [
  "Owners looking for quick hacks or shortcuts",
  "Businesses that are not operating yet",
  "Anyone expecting the work to happen without owner participation",
  "Anyone looking for hype, motivation, or someone to make decisions for them",
];

const Index = () => {
  return (
    <Layout>
      <SEO
        title="Revenue & Growth Systems — Make the Business Clearer, Not More Dependent"
        description="Most owners are not failing from lack of effort. When the same problems keep coming back, RGS helps you see what is actually breaking, why it matters, and what needs attention first."
        canonical="/"
      />
      {/* ── HERO ── */}
      <section className="min-h-[88vh] flex items-center pt-32 pb-20 px-6 hero-grid-bg relative overflow-hidden">
        {/* Soft ambient glow — far right, low intensity */}
        <div className="absolute top-1/2 right-[8%] -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(78,30%,40%)]/[0.05] blur-[160px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[58%_42%] gap-12 lg:gap-16 items-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div
              data-testid="hero-eyebrow"
              className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full border border-[hsl(78,30%,45%)]/40 bg-[hsl(78,34%,38%)]/10 text-[11px] uppercase tracking-[0.18em] text-[hsl(78,30%,68%)] font-semibold mb-6"
            >
              <Eye size={12} strokeWidth={2.25} />
              <span>Operational Intelligence for Owner-Led Businesses</span>
              <span className="text-foreground/30">·</span>
              <span>See what is slipping</span>
            </div>
            <h1 className="font-hero text-[2.125rem] md:text-[2.5rem] lg:text-[2.875rem] xl:text-[3.0625rem] font-bold leading-[1.14] tracking-[-0.02em] text-foreground text-balance">
              Busy is not the same as{" "}
              <span className="text-[hsl(78,24%,60%)] font-semibold">stable</span>.
            </h1>

            <p className="mt-7 text-base md:text-lg text-foreground/75 max-w-[34rem] leading-[1.65] font-hero font-normal">
              RGS builds the operating structure owners use to see what is
              slipping, decide what to fix, and run the business with more
              control. Start with a 2-minute Operational Friction Scan that
              surfaces the likely upstream bottleneck — then go deeper when
              the friction feels real.
            </p>

            <div className="mt-10 flex flex-col items-start gap-4">
              {/* P96 — Operational Friction Scan: visual primary public CTA. */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  data-testid="hero-primary-cta"
                  data-scan-cta="true"
                  to={SCAN_PATH}
                  className="font-hero inline-flex items-center justify-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-[0.9375rem] px-7 py-3.5 rounded-md shadow-[0_4px_16px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-200 hover:bg-[hsl(78,36%,46%)] hover:-translate-y-px hover:shadow-[0_10px_28px_-6px_hsl(78_36%_35%/0.55)] group"
                >
                  {SCAN_CTA_LABEL}
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <p className="text-xs text-muted-foreground/85 max-w-xl leading-relaxed font-hero">
                {SCAN_CTA_HELPER}. Becomes a lead in the RGS OS so we can review what is slipping.
              </p>
              <div className="mt-3 inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-card/40 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/75">
                <Gauge size={11} strokeWidth={2.25} />
                <span>Inside the Diagnostic — Part 1: Free 0–1000 Stability Scorecard</span>
                <span className="text-foreground/30">·</span>
                <span>10–15 min</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  data-testid="hero-diagnostic-part1-cta"
                  to={SCORECARD_PATH}
                  className="font-hero inline-flex items-center justify-center gap-2 text-[0.9375rem] font-medium text-foreground/90 px-6 py-3.5 rounded-md border border-[hsl(78,30%,45%)]/40 bg-[hsl(78,34%,38%)]/8 hover:border-[hsl(78,30%,45%)]/70 hover:bg-[hsl(78,34%,38%)]/15 transition-all duration-200 group"
                >
                  {SCORECARD_DIAGNOSTIC_LABEL}
                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  data-testid="hero-secondary-cta"
                  to={DIAGNOSTIC_APPLY_PATH}
                  className="font-hero inline-flex items-center justify-center gap-2 text-[0.9375rem] font-medium text-foreground/85 px-6 py-3.5 rounded-md border border-border/70 hover:border-[hsl(78,30%,45%)]/60 hover:text-foreground hover:bg-card/40 transition-all duration-200"
                >
                  Book a Diagnostic Call
                </Link>
              </div>
              <p
                data-testid="hero-cta-helper"
                className="text-xs text-muted-foreground/85 max-w-xl leading-relaxed font-hero"
              >
                {SCORECARD_DIAGNOSTIC_HELPER}. {SCORECARD_CTA_HELPER}.
              </p>
              <p className="text-[11px] text-muted-foreground/65 max-w-xl leading-relaxed font-hero">
                The Scorecard is a directional first-pass systems check based
                on self-reported answers. The paid Diagnostic adds evidence
                review and admin interpretation. RGS does not provide legal,
                tax, accounting, compliance, or valuation advice, and does
                not promise revenue, profit, growth, funding, compliance,
                valuation, or business outcomes.
              </p>
            </div>

            <p className="mt-8 text-sm text-muted-foreground/70 font-hero">
              Built for owner-led operators in trade, service, retail,
              restaurant, and regulated industries. Industry-aware on
              purpose — not a generic playbook.
            </p>
          </motion.div>

          {/* P93E-E5 — Hero score-preview card. Communicates "this is what
              you actually get" within the first viewport so cold visitors
              understand the value of the free Scorecard immediately. */}
          <motion.div
            data-testid="hero-score-preview"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="hidden lg:block"
            aria-hidden="true"
          >
            <div className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 shadow-[0_30px_80px_-30px_hsl(0_0%_0%/0.6)]">
              <div className="flex items-center justify-between mb-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                  Sample Stability Read
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[hsl(78,30%,45%)]/40 bg-[hsl(78,34%,38%)]/15 text-[hsl(78,30%,68%)]">
                  Free
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <div className="font-display text-5xl font-semibold text-foreground tabular-nums leading-none">
                  612
                </div>
                <div className="text-sm text-muted-foreground tabular-nums">
                  / 1000
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-5">
                Business Stability Score (illustrative)
              </div>
              <div className="space-y-2.5">
                {[
                  { name: "Demand Generation", v: 142 },
                  { name: "Revenue Conversion", v: 98 },
                  { name: "Operational Efficiency", v: 124 },
                  { name: "Financial Visibility", v: 116 },
                  { name: "Owner Independence", v: 132 },
                ].map((g) => {
                  const pct = Math.round((g.v / 200) * 100);
                  const slipping = g.v <= 100;
                  return (
                    <div key={g.name}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-foreground/85">{g.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {g.v}
                          <span className="text-muted-foreground/50"> / 200</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            slipping ? "bg-amber-400/70" : "bg-[hsl(78,34%,46%)]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-border/40 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="text-muted-foreground/70 uppercase tracking-wider text-[10px] mb-1">
                    Strongest gear
                  </div>
                  <div className="text-foreground/90">Demand Generation</div>
                </div>
                <div>
                  <div className="text-muted-foreground/70 uppercase tracking-wider text-[10px] mb-1">
                    Most slipping
                  </div>
                  <div className="text-amber-200/90">Revenue Conversion</div>
                </div>
              </div>
              <div className="mt-3 text-[10px] text-muted-foreground/60 italic leading-relaxed">
                Illustrative only. Your read is generated from your structured
                answers — not from AI.
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── WHAT RGS IS (and isn't) — architect/builder positioning ── */}
      <Section>
        <div className="max-w-5xl mx-auto" data-testid="what-rgs-is">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
              What RGS is
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
              An architect for your operating system — not an agency, not an operator
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              RGS builds the operating structure owners use to see what is
              slipping, decide what to fix, and run the business with more
              control. The owner stays in charge — RGS makes the decisions
              easier to think through.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-[hsl(78,30%,45%)]/30 bg-[hsl(78,34%,38%)]/5 p-6">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[hsl(78,30%,68%)] font-semibold mb-4">
                <CheckCircle2 size={14} strokeWidth={2.25} />
                What RGS does
              </div>
              <ul className="space-y-2.5 text-sm text-foreground/85 leading-relaxed">
                {[
                  "Diagnoses where the business system is slipping",
                  "Builds operating structure owners can actually use",
                  "Sequences repairs by impact, not by guesswork",
                  "Keeps the signals that matter visible to the owner",
                  "Stays industry-aware — calibrated to how the business runs",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={15}
                      strokeWidth={1.75}
                      className="text-[hsl(78,30%,60%)] flex-shrink-0 mt-0.5"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground/80 font-semibold mb-4">
                <X size={14} strokeWidth={2.25} />
                What RGS is not
              </div>
              <ul className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
                {[
                  "Not a marketing or growth agency",
                  "Not an operator running the business for you",
                  "Not generic coaching, motivation, or playbooks",
                  "Not legal, tax, accounting, compliance, or valuation advice",
                  "Does not promise revenue, profit, growth, funding, compliance, valuation, or business outcomes",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <X
                      size={14}
                      strokeWidth={2}
                      className="text-muted-foreground/50 flex-shrink-0 mt-1"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ── WHO THIS IS FOR ── */}
      <Section>
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            Who this is for
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
            Built for owner-led operators
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            RGS is industry-aware on purpose. The diagnostic is calibrated to
            the workflows of each supported industry — not a generic playbook
            — and stays focused on businesses where demand, conversion,
            operations, financial visibility, and owner decisions all shape
            whether revenue actually holds.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {fitPatterns.map((item) => (
            <div
              key={item.title}
              className="px-5 py-5 rounded-lg border border-border/50 bg-card/40 leading-snug"
            >
              <h3 className="font-hero text-[0.95rem] font-semibold text-foreground mb-1.5 tracking-tight">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/70 mt-6 text-center max-w-3xl mx-auto leading-relaxed">
          Examples include trade and field service, retail, restaurants,
          MMJ/cannabis, and other owner-led operating businesses.
        </p>
        <div className="mt-8 max-w-3xl mx-auto">
          <div className="flex items-start gap-3 px-5 py-4 rounded-lg border border-border/40 bg-card/40">
            <ShieldCheck size={16} strokeWidth={1.75} className="text-primary/80 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80 leading-relaxed">
              RGS is configured by industry. Clients only see the tools,
              workflows, and recommendations appropriate to their business.
            </p>
          </div>
          <div className="mt-3 flex items-start gap-3 px-5 py-4 rounded-lg border border-border/40 bg-card/40">
            <ShieldCheck size={16} strokeWidth={1.75} className="text-primary/80 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80 leading-relaxed">
              RGS is built for owners who need clarity without exposing
              private business information. Public demos use sandbox-style
              data. Client information stays inside secured client/admin
              workflows and is used only to support diagnostic review,
              implementation planning, and authorized client work.
            </p>
          </div>
        </div>
      </Section>

      {/* ── WHAT RGS DIAGNOSES — 5 pillars ── */}
      <Section>
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            What RGS diagnoses
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
            The five places revenue usually starts to slip
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            A gear usually does not fail all at once. One worn tooth starts
            slipping, then the next part of the system has to carry pressure
            it was not built to carry. The diagnostic looks at each of these
            five with the same discipline.
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

      {/* ── HOW RGS WORKS ── */}
      <Section>
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            How RGS works
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
            Score, diagnose, repair, and keep visibility
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            The work moves in order on purpose. Before spending more money on
            the issue, it helps to actually know what is breaking.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {rgsWorkSteps.map((s, i) => (
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

      {/* ── WHAT YOU GET FROM THE FREE SCORECARD — value proposition ── */}
      <Section>
        <div className="max-w-5xl mx-auto" data-testid="scorecard-value-prop">
          <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-10 items-start">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
                What you actually get
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
                A real first-pass read — not a teaser
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The free 0–1000 Stability Scorecard is a structured business
                systems assessment. Ten to fifteen minutes of focused
                self-reported answers produce a directional read across the
                five gears that hold revenue together.
              </p>
              <Link
                to={SCORECARD_PATH}
                className="inline-flex items-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-sm px-6 py-3.5 rounded-md transition-all duration-200 hover:bg-[hsl(78,36%,46%)] hover:-translate-y-px group"
              >
                {SCORECARD_CTA_LABEL}
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <p className="mt-3 text-[11px] text-muted-foreground/80 leading-relaxed">
                {SCORECARD_CTA_HELPER}.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  icon: Gauge,
                  title: "0–1000 Business Stability Score",
                  body: "A single directional number, scored from your structured answers — not from AI.",
                },
                {
                  icon: Layers,
                  title: "Gear-by-gear read",
                  body: "200 points per gear across Demand, Conversion, Operations, Financial Visibility, and Owner Independence.",
                },
                {
                  icon: CheckCircle2,
                  title: "Strongest gear",
                  body: "What is currently working — so you don't accidentally break it while fixing something else.",
                },
                {
                  icon: Activity,
                  title: "Most slipping gear",
                  body: "The gear most likely creating downstream pressure right now.",
                },
                {
                  icon: Eye,
                  title: "Likely worn-tooth signals",
                  body: "Plain-English markers of where the system is starting to drag — based on your answers.",
                },
                {
                  icon: Compass,
                  title: "Plain-English next-step direction",
                  body: "What to look at next and whether a deeper Diagnostic is worth scoping.",
                },
              ].map((it) => (
                <div
                  key={it.title}
                  className="rounded-xl border border-border/50 bg-card/40 p-4"
                >
                  <it.icon
                    size={18}
                    strokeWidth={1.75}
                    className="text-[hsl(78,30%,60%)] mb-2"
                  />
                  <div className="font-display text-sm font-semibold text-foreground mb-1.5">
                    {it.title}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {it.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── FREE SCORECARD vs PAID DIAGNOSTIC — differentiation ── */}
      <Section>
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            Scorecard vs Diagnostic
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
            Where the free Scorecard ends and the paid Diagnostic begins
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Both look at the same five gears. The Scorecard gives you a fast,
            self-reported read. The Diagnostic adds evidence review, admin
            interpretation, and a sequenced repair direction.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {([scorecardVsDiagnostic.scorecard, scorecardVsDiagnostic.diagnostic] as const).map(
            (col, idx) => (
              <div
                key={col.title}
                className="premium-card h-full flex flex-col"
                data-testid={
                  idx === 0 ? "scorecard-vs-diagnostic-scorecard" : "scorecard-vs-diagnostic-diagnostic"
                }
              >
                <p className="text-[11px] uppercase tracking-widest text-primary/80 font-semibold mb-3">
                  {col.eyebrow}
                </p>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {col.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {col.summary}
                </p>
                <ul className="space-y-2.5 mb-5">
                  {col.includes.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm text-foreground/85 leading-relaxed">
                      <CheckCircle2
                        size={15}
                        strokeWidth={1.75}
                        className="text-primary/70 flex-shrink-0 mt-0.5"
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground/80 leading-relaxed mt-auto pt-4 border-t border-border/40">
                  {col.note}
                </p>
                <div className="mt-5">
                  {idx === 0 ? (
                    <Link
                      to={SCORECARD_PATH}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors group"
                    >
                      Take the FREE Business Stability Scorecard
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <Link
                      to={DIAGNOSTIC_APPLY_PATH}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors group"
                    >
                      Apply for the Diagnostic
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                  )}
                </div>
              </div>
            ),
          )}
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
              Built to remove guesswork, not to replace your judgment
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              RGS is built as a diagnostic and operating architecture. It is
              not here to think for the owner — it is here to make the
              business easier to think through.
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

      {/* ── SEE THE SYSTEM IN MOTION — demo link ── */}
      <Section>
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border/50 bg-card/40 px-6 py-10 md:px-12 md:py-12 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <p className="text-xs uppercase tracking-widest text-[hsl(78,24%,60%)] font-semibold mb-3">
                Watch the RGS Stability System
              </p>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground leading-tight mb-3">
                One slipping gear creates pressure somewhere else.
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
                If the business feels inconsistent, the problem is usually
                not one isolated issue. This short demo shows how RGS looks
                at the business through five gears and turns scattered
                symptoms into a clearer diagnostic roadmap.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link
                to={DEMO_SCORECARD_CTA}
                className="inline-flex items-center justify-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-sm px-6 py-3.5 rounded-md transition-all duration-200 hover:bg-[hsl(78,36%,46%)] hover:-translate-y-px group whitespace-nowrap"
              >
                Take the FREE Business Stability Scorecard
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                to="/demo"
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground/85 px-5 py-3 rounded-md border border-border/60 hover:border-[hsl(78,30%,45%)]/60 hover:text-foreground transition-all duration-200 whitespace-nowrap"
              >
                Watch the demo
              </Link>
              <Link
                to={DIAGNOSTIC_APPLY_PATH}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                Start the Business Stability Diagnostic
                <ArrowRight size={12} />
              </Link>
              <Link
                to="/why-rgs-is-different"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                Why RGS Is Different
                <ArrowRight size={12} />
              </Link>
            </div>
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
            Diagnose first. Implement when the picture is clear.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
            The diagnostic always comes first. If the findings warrant it,
            implementation installs the repairs. One-off fixes rarely solve
            complex system issues.
            </p>
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed mb-6 max-w-2xl mx-auto text-center">
          The Diagnostic finds the slipping gears. Implementation installs the
          repair plan. The RGS Control System™ keeps the owner connected to the
          system without turning RGS into an operator inside the business.
          </p>
          <div
            data-testid="offer-ladder"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            <Link
              to={SCORECARD_PATH}
              data-testid="offer-ladder-scorecard"
              className="group block premium-card h-full"
            >
              <Gauge
                className="text-primary/70 mb-5 transition-all duration-300 group-hover:text-primary group-hover:scale-110"
                size={28}
                strokeWidth={1.5}
              />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-2">
                Step 1 — free
              </p>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Stability Scorecard — first-pass read
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                A self-reported 0–1000 systems assessment across the five
                gears. Directional read on where the business looks stable
                and where it may be slipping. Free.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm text-primary/80 font-medium group-hover:text-primary transition-colors">
                Take the Scorecard
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              to="/diagnostic"
              data-testid="offer-ladder-diagnostic"
              className="group block premium-card h-full"
            >
              <FileSearch
                className="text-primary/70 mb-5 transition-all duration-300 group-hover:text-primary group-hover:scale-110"
                size={28}
                strokeWidth={1.5}
              />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-2">
                Step 2 — paid
              </p>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Diagnostic — scope-based
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                A deeper, evidence-supported inspection with admin review and
                interpretation. Identifies what is actually breaking and what
                needs attention first. {PUBLIC_PRICING_SUMMARY.diagnostic}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm text-primary/80 font-medium group-hover:text-primary transition-colors">
                Learn more
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              to="/implementation"
              data-testid="offer-ladder-implementation"
              className="group block premium-card h-full"
            >
              <Wrench
                className="text-primary/70 mb-5 transition-all duration-300 group-hover:text-primary group-hover:scale-110"
                size={28}
                strokeWidth={1.5}
              />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-2">
                Step 3 — after diagnostic
              </p>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Implementation — scoped project
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Turn the diagnosis into a repair plan and install clearer
                structure into how the business actually runs. {PUBLIC_PRICING_SUMMARY.implementation}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm text-primary/80 font-medium group-hover:text-primary transition-colors">
                Learn more
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              to="/revenue-control-system"
              data-testid="offer-ladder-control-system"
              className="group block premium-card h-full"
            >
              <Activity
                className="text-primary/70 mb-5 transition-all duration-300 group-hover:text-primary group-hover:scale-110"
                size={28}
                strokeWidth={1.5}
              />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-2">
                Step 4 — post-implementation
              </p>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                RGS Control System™ — ongoing visibility
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Continued visibility, not dependency. Keeps the signals that
                matter in front of the owner so decisions get easier when the
                right information is already visible. {PUBLIC_PRICING_SUMMARY.rgs_control_system}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm text-primary/80 font-medium group-hover:text-primary transition-colors">
                Learn more
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-6 text-center max-w-xl mx-auto leading-relaxed">
            Final pricing depends on complexity, evidence depth,
            implementation scope, HITL review level, reporting depth, and
            monitoring needs. RGS will not quote implementation without first
            knowing what is actually breaking.
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
            Find out what is actually breaking before spending more on the wrong thing
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Start with the Scorecard for a self-reported read, or book a
            diagnostic call to scope an evidence-based review.
          </p>

          <div className="mt-10 flex flex-col items-center gap-5">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to={SCORECARD_PATH}
                className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-8 py-4 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-4px_hsl(78_36%_35%/0.6)] group"
              >
                {SCORECARD_CTA_LABEL}
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
            A few honest notes
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-10 leading-[1.15] text-center">
            This is probably not for you if
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
            RGS is not here to make the owner dependent. It is here to make
            the business easier to think through. When the right information
            is in front of you, the next step usually makes more sense.
          </p>
        </div>
      </Section>
    </Layout>
  );
};

export default Index;
