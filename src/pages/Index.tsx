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
  { step: "01", title: "Start with the Scorecard", description: "A 0–1000 system check — not a personality quiz. A first read on where the business looks stable and where it may be slipping." },
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
    note: "Not legal, tax, accounting, compliance, or valuation advice. No revenue or outcome guarantees.",
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

        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[62%_38%] gap-16 items-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="font-hero text-[2.125rem] md:text-[2.5rem] lg:text-[2.875rem] xl:text-[3.0625rem] font-bold leading-[1.14] tracking-[-0.02em] text-foreground text-balance">
              Busy is not the same as{" "}
              <span className="text-[hsl(78,24%,60%)] font-semibold">stable</span>.
            </h1>

            <p className="mt-7 text-base md:text-lg text-foreground/75 max-w-[34rem] leading-[1.65] font-hero font-normal">
              Most owners are not failing from lack of effort. When the same
              problems keep coming back, RGS helps you see what is actually
              breaking, why it matters, and what needs attention first.
            </p>

            <div className="mt-10 flex flex-col items-start gap-4">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full sm:w-auto">
                <Link
                  to={SCORECARD_PATH}
                  className="font-hero inline-flex items-center justify-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-[0.9375rem] px-6 py-3.5 rounded-md shadow-[0_2px_10px_-2px_hsl(78_36%_35%/0.35)] transition-all duration-200 hover:bg-[hsl(78,36%,46%)] hover:-translate-y-px hover:shadow-[0_6px_20px_-4px_hsl(78_36%_35%/0.45)] group"
                >
                  {SCORECARD_CTA_LABEL}
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
                The Scorecard is a self-reported starting read. RGS would
                validate it against real evidence in a Diagnostic before
                recommending action.
              </p>
            </div>

            <p className="mt-8 text-sm text-muted-foreground/70 font-hero">
              Built for owner-led operators in trade, service, retail,
              restaurant, and regulated industries. Industry-aware on
              purpose — not a generic playbook.
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
                      Take the free 0–1000 Scorecard
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
                Take the 0–1000 Business Stability Scorecard
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                Diagnostic — scope-based
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Identify what is actually breaking, where the system is
                slipping, and what needs attention first. {PUBLIC_PRICING_SUMMARY.diagnostic}
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
            <Link to="/revenue-control-system" className="group block premium-card h-full">
              <Activity
                className="text-primary/70 mb-5 transition-all duration-300 group-hover:text-primary group-hover:scale-110"
                size={28}
                strokeWidth={1.5}
              />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-2">
                Phase 3 — post-implementation
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
