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
  SCAN_PATH,
  SCAN_CTA_LABEL,
  SCAN_CTA_HELPER,
} from "@/lib/cta";
import { PUBLIC_PRICING_SUMMARY } from "@/config/rgsPricingTiers";

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
  { step: "01", title: "Start with the Operational Friction Scan", description: "A 2-minute read that surfaces the likely upstream bottleneck and where the business may be carrying hidden pressure." },
  { step: "02", title: "Diagnose what is breaking", description: "The deeper Diagnostic combines structured operational review, owner interviews, and business-system analysis across demand, conversion, operations, financial visibility, and owner dependency." },
  { step: "03", title: "Turn the diagnosis into a repair plan", description: "The Diagnostic Report feeds a Priority Repair Map — sequenced by impact instead of guesswork, matched to how the business actually runs." },
  { step: "04", title: "Install clearer structure", description: "Implementation puts the fixes into how the business operates week to week — not into a binder." },
  { step: "05", title: "Keep the important signals visible", description: "The Revenue Control System™ keeps the signals that matter in front of the owner. Continued visibility, not dependency." },
];

const trustPrinciples = [
  "A formal diagnostic framework, not a generic playbook",
  "5-gear RGS Stability System™",
  "Structured operational visibility model",
  "Software-backed reporting with clear evidence trails",
  "No vague consulting retainers",
  "Built for owner-led service, trades, retail, restaurant, and regulated operators",
];

// P96E — The retired public comparison block has been removed entirely.
// The Scorecard is now an internal diagnostic instrument; the public site
// only describes the deeper Diagnostic in high-level language.

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
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 w-full sm:w-auto">
                {/* P96E — Public secondary CTA: request the deeper Diagnostic.
                    No scorecard surface, no "Part 1/Part 2" exposure. */}
                <Link
                  data-testid="hero-secondary-cta"
                  to={DIAGNOSTIC_APPLY_PATH}
                  className="font-hero inline-flex items-center justify-center gap-2 text-[0.9375rem] font-medium text-foreground/85 px-6 py-3.5 rounded-md border border-border/70 hover:border-[hsl(78,30%,45%)]/60 hover:text-foreground hover:bg-card/40 transition-all duration-200"
                >
                  Request the Diagnostic
                </Link>
              </div>
              <p
                data-testid="hero-cta-helper"
                className="text-xs text-muted-foreground/85 max-w-xl leading-relaxed font-hero"
              >
                The deeper Diagnostic combines structured operational review,
                owner interviews, and business-system analysis to produce a
                Diagnostic Report and Priority Repair Map.
              </p>
              <p className="text-[11px] text-muted-foreground/65 max-w-xl leading-relaxed font-hero">
                RGS does not provide legal, tax, accounting, compliance, or
                valuation advice, and does not promise revenue, profit,
                growth, funding, compliance, valuation, or business outcomes.
              </p>
            </div>

            <p className="mt-8 text-sm text-muted-foreground/70 font-hero">
              Built for owner-led operators in trade, service, retail,
              restaurant, and regulated industries. Industry-aware on
              purpose — not a generic playbook.
            </p>
          </motion.div>

          {/* P96E — Operational Visibility Panel. Replaces the previous
              scorecard-style "612 / 1000" hero card. Visually communicates
              that RGS sees where pressure is building in the business —
              without exposing scoring internals, numeric reads, or
              proprietary repair logic. */}
          <motion.div
            data-testid="hero-operational-visibility"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="hidden lg:block"
            aria-hidden="true"
          >
            <div className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 shadow-[0_30px_80px_-30px_hsl(0_0%_0%/0.6)]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                  <Eye size={11} strokeWidth={2.25} />
                  <span>What RGS Sees</span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[hsl(78,30%,45%)]/40 bg-[hsl(78,34%,38%)]/15 text-[hsl(78,30%,68%)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(78,34%,55%)] animate-pulse" />
                  Live read
                </span>
              </div>

              <div className="mb-1 font-display text-[1.35rem] font-semibold text-foreground leading-snug">
                System pressure building upstream
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed mb-5">
                A worn tooth in one gear is forcing the next part of the system
                to carry pressure it was not built to carry.
              </div>

              <div className="space-y-2">
                {[
                  { name: "Demand Generation", state: "stable", note: "Holding" },
                  { name: "Revenue Conversion", state: "slipping", note: "Likely worn tooth" },
                  { name: "Operational Efficiency", state: "drag", note: "Carrying pressure" },
                  { name: "Financial Visibility", state: "drag", note: "Lagging signal" },
                  { name: "Owner Independence", state: "stable", note: "Holding" },
                ].map((g) => {
                  const dot =
                    g.state === "slipping"
                      ? "bg-amber-400"
                      : g.state === "drag"
                      ? "bg-amber-400/40"
                      : "bg-[hsl(78,34%,55%)]";
                  const noteColor =
                    g.state === "slipping"
                      ? "text-amber-200/90"
                      : g.state === "drag"
                      ? "text-amber-100/60"
                      : "text-muted-foreground";
                  return (
                    <div
                      key={g.name}
                      className="flex items-center justify-between px-3 py-2 rounded-md border border-border/40 bg-background/30"
                    >
                      <div className="flex items-center gap-2.5 text-[12px] text-foreground/90">
                        <span className={`w-1.5 h-1.5 rounded-full ${dot} ${g.state === "slipping" ? "animate-pulse" : ""}`} />
                        {g.name}
                      </div>
                      <div className={`text-[10px] uppercase tracking-[0.14em] ${noteColor}`}>
                        {g.note}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-border/40 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="flex items-center gap-1.5 text-muted-foreground/70 uppercase tracking-wider text-[10px] mb-1">
                    <Compass size={10} strokeWidth={2.25} />
                    Upstream bottleneck
                  </div>
                  <div className="text-foreground/90">Revenue Conversion</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-muted-foreground/70 uppercase tracking-wider text-[10px] mb-1">
                    <Activity size={10} strokeWidth={2.25} />
                    Downstream strain
                  </div>
                  <div className="text-amber-200/90">Operational Efficiency</div>
                </div>
              </div>

              <div className="mt-3 text-[10px] text-muted-foreground/60 italic leading-relaxed">
                Illustrative inspection view. Real reads are generated from your
                structured answers and reviewed inside the Diagnostic — not from AI.
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

      {/* ── WHAT THE DEEPER DIAGNOSTIC PRODUCES — high-level only (P96E) ── */}
      <Section>
        <div className="max-w-5xl mx-auto" data-testid="diagnostic-value-prop">
          <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-10 items-start">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
                The deeper Diagnostic
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
                Structured operational review — not a quiz
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The deeper Diagnostic combines structured operational review,
                owner interviews, and business-system analysis to produce a
                Diagnostic Report and Priority Repair Map. Inspection
                mechanics stay inside the RGS workflow — the public surface
                only shows what comes out of it.
              </p>
              <Link
                to={DIAGNOSTIC_APPLY_PATH}
                className="inline-flex items-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-sm px-6 py-3.5 rounded-md transition-all duration-200 hover:bg-[hsl(78,36%,46%)] hover:-translate-y-px group"
              >
                Request the Diagnostic
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <p className="mt-3 text-[11px] text-muted-foreground/80 leading-relaxed">
                Start with the free Operational Friction Scan if you want a
                directional read before scoping the deeper Diagnostic.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  icon: Eye,
                  title: "Operational visibility read",
                  body: "A plain-English read on where the business system appears to be carrying pressure and which gear is most likely slipping.",
                },
                {
                  icon: FileSearch,
                  title: "Owner interview review",
                  body: "Structured owner-led conversation to ground findings in how the business actually runs day to day.",
                },
                {
                  icon: Layers,
                  title: "Business-system analysis",
                  body: "Cross-checks across demand, conversion, operations, financial visibility, and owner dependency.",
                },
                {
                  icon: Activity,
                  title: "Worn-tooth signals",
                  body: "Plain-English markers of where the system is starting to drag — and where downstream strain is showing up.",
                },
                {
                  icon: Compass,
                  title: "Diagnostic Report",
                  body: "A clear write-up of what looks stable, what looks slipping, and what needs attention first.",
                },
                {
                  icon: Wrench,
                  title: "Priority Repair Map",
                  body: "Sequenced direction on what to fix first so the owner is not guessing where to spend money next.",
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
                to={SCAN_PATH}
                className="inline-flex items-center justify-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-sm px-6 py-3.5 rounded-md transition-all duration-200 hover:bg-[hsl(78,36%,46%)] hover:-translate-y-px group whitespace-nowrap"
              >
                {SCAN_CTA_LABEL}
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
                Request the Diagnostic
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
              to={SCAN_PATH}
              data-testid="offer-ladder-scan"
              className="group block premium-card h-full"
            >
              <Eye
                className="text-primary/70 mb-5 transition-all duration-300 group-hover:text-primary group-hover:scale-110"
                size={28}
                strokeWidth={1.5}
              />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-2">
                Step 1 — free
              </p>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Operational Friction Scan — first-pass read
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                A 2-minute operational visibility read that surfaces the
                likely upstream bottleneck and where the business may be
                carrying hidden pressure. Free.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm text-primary/80 font-medium group-hover:text-primary transition-colors">
                {SCAN_CTA_LABEL}
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
            Start with the free Operational Friction Scan, or request the
            deeper Diagnostic to scope a structured operational review.
          </p>

          <div className="mt-10 flex flex-col items-center gap-5">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to={SCAN_PATH}
                className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-8 py-4 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-4px_hsl(78_36%_35%/0.6)] group"
              >
                {SCAN_CTA_LABEL}
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
