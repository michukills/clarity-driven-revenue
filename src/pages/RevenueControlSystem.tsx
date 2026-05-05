import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  LineChart,
  Wallet,
  Compass,
  MessageSquare,
  Calendar,
  AlertTriangle,
  GitCompare,
  Lightbulb,
  XCircle,
  Plug,
} from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import { DIAGNOSTIC_APPLY_PATH } from "@/lib/cta";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const tracked = [
  {
    icon: LineChart,
    title: "Revenue & pipeline",
    points: [
      "Weekly revenue logged consistently",
      "Pipeline confidence and quote-to-close",
      "Lead source quality vs. volume",
    ],
  },
  {
    icon: Wallet,
    title: "Cash & receivables",
    points: [
      "AR aging buckets",
      "Inflows and obligations next 7 / 30",
      "Cash concern level captured weekly",
    ],
  },
  {
    icon: Compass,
    title: "Owner load & blockers",
    points: [
      "Owner-only decisions and bottlenecks",
      "Process, people, sales, and cash blockers",
      "Repeated issues flagged across weeks",
    ],
  },
  {
    icon: MessageSquare,
    title: "Reports & RGS reviews",
    points: [
      "Quarterly Business Control Reports",
      "Long-term trend lines, not vanity charts",
      "Request an RGS review when something is off",
    ],
  },
];

const monthlyRhythm = [
  {
    icon: LineChart,
    title: "Stability Snapshot",
    body: "A monthly read on where the business appears stable and where it may be slipping, based on the information connected or provided.",
  },
  {
    icon: AlertTriangle,
    title: "Priority Issue Review",
    body: "A short review of the areas most likely to affect revenue, control, or owner dependence.",
  },
  {
    icon: Compass,
    title: "Revenue / Risk Signal Check",
    body: "A check on the signals that may point to revenue leakage, cost pressure, follow-up gaps, or operational strain — where supported by available information.",
  },
  {
    icon: Lightbulb,
    title: "Owner Decision Prompts",
    body: "Clear prompts that help the owner decide what needs to be reviewed, assigned, validated, or acted on.",
  },
  {
    icon: GitCompare,
    title: "Progress Comparison",
    body: "A look at what changed since the last snapshot so the owner is not starting from scratch every month.",
  },
];

const doesNotDo = [
  "Make decisions for the owner or replace owner judgment",
  "Replace legal, tax, accounting, HR, payroll, insurance, or compliance professionals",
  "Run daily operations or guarantee that issues will be detected",
  "Guarantee revenue improvement or specific business outcomes",
  "Act as 24/7 monitoring, on-demand consulting, or after-hours response",
];

const RevenueControlSystem = () => {
  return (
    <Layout>
      <SEO
        title="Revenue Control System™ — Revenue Visibility Inside the RGS Control System™"
        description="The Revenue Control System™ is the revenue visibility tool inside the larger RGS Control System™. It helps organize the numbers and signals that show how revenue is moving, where attention is needed, and what the owner should review next."
        canonical="/revenue-control-system"
      />

      {/* Hero */}
      <Section className="pt-32 grid-bg">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
            Part of the RGS Control System™
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6 leading-[1.05]">
            Keep the important signals{" "}
            <span className="text-accent">in front of you</span>.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-2xl">
            The Revenue Control System™ is the revenue visibility layer inside
            the larger RGS Control System™. It helps organize the numbers and
            signals that show how revenue is moving, where attention is needed,
            and what the owner should review next.
          </p>
          <p className="text-sm text-muted-foreground/80 mb-10 max-w-2xl leading-relaxed">
            The Revenue Control System™ is one tool inside the RGS Control
            System™ subscription — not the whole subscription, and not
            implementation work. The owner keeps final decision authority.
          </p>
          <div className="flex flex-col items-start gap-3">
            <Link
              to={DIAGNOSTIC_APPLY_PATH}
              className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-7 py-3.5 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-4px_hsl(78_36%_35%/0.55)] group"
            >
              Start With a Diagnostic
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="text-xs text-muted-foreground/70">
              Included during implementation. Continues at $1,000/month after system install.
            </p>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Sequence — where RCS fits */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            Where it fits
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5 leading-[1.15]">
            Diagnostic → Implementation → RGS Control System™ (with Revenue Control System™ inside)
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            The Diagnostic finds the slipping gears. Implementation installs
            the repair plan. The RGS Control System™ is the ongoing visibility
            lane that keeps the owner connected to the system without turning
            RGS into an operator inside the business. The Revenue Control
            System™ is one tool inside that umbrella — focused on revenue
            visibility, not the whole subscription.
          </p>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Monthly rhythm */}
      <Section>
        <div className="max-w-3xl mb-12">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            What Happens Each Month
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground leading-[1.1] mb-5">
            A monthly rhythm, not a guessing exercise.
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Each month, the Revenue Control System™ is designed to keep the
            important signals visible: where the business appears stable,
            where pressure is building, what changed since the last review,
            and what decision may need attention next.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {monthlyRhythm.map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="premium-card h-full"
            >
              <item.icon className="text-primary/70 mb-4" size={22} strokeWidth={1.5} />
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.body}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* What it tracks */}
      <Section>
        <div className="max-w-3xl mb-12">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            Signals It Helps Keep Visible
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground leading-[1.1]">
            One operating picture across the five gears.
          </h2>
          <p className="text-muted-foreground leading-relaxed mt-4">
            The Revenue Control System™ keeps watch on the same five gears
            used in the Diagnostic — Demand Generation, Revenue Conversion,
            Operational Efficiency, Financial Visibility, and Owner
            Independence. If one area starts slipping again, the owner
            should be able to see it sooner.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tracked.map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="premium-card h-full"
            >
              <item.icon className="text-primary/70 mb-4" size={22} strokeWidth={1.5} />
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

      {/* Truth sources — connected tools positioning (P46) */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4 inline-flex items-center gap-2">
            <Plug size={14} strokeWidth={1.75} /> Connected truth sources
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5 leading-[1.15]">
            Not another dashboard. A clearer operating picture.
          </h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              Most owners do not need another disconnected dashboard. They need
              the tools they already use to start telling the same story. Where
              supported, RGS can help connect key business truth sources —
              accounting, CRM, POS, payments, and operating data — so the owner
              is not trying to interpret every tool in isolation.
            </p>
            <p>
              QuickBooks, HubSpot, Dutchie, Square, Stripe, Xero, Salesforce,
              and similar systems can serve as truth sources for financial,
              customer, sales, payment, and operational visibility where
              integration access is available. The goal is not more software
              noise. The goal is a clearer view of where the system may be
              slipping.
            </p>
            <p className="text-sm text-muted-foreground/80">
              Integration readiness varies by platform and client setup. Some
              sources are available as live connections today; others are
              supported through reviewed imports or normalized summaries. RGS
              does not replace these tools, does not guarantee clean data if
              the source system is messy, and does not provide accounting,
              legal, tax, or compliance services.
            </p>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Visibility, not dependency */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            Visibility, not dependency
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6 leading-[1.15]">
            Guided independence after the work is done.
          </h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              This is not standalone software, and it is not a vague
              consulting retainer. It keeps the important signals visible so
              the owner is not carrying every decision alone and the same
              problems do not have to keep coming back.
            </p>
            <p>
              The Revenue Control System™ does not make decisions for the
              owner. It helps the owner see what decision needs attention
              next, and who inside the business should own it. The owner
              keeps final decision authority.
            </p>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* What it does not do */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            What It Does Not Do
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6 leading-[1.15]">
            Honest about the boundary.
          </h2>
          <ul className="space-y-3">
            {doesNotDo.map((line) => (
              <li
                key={line}
                className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed"
              >
                <XCircle
                  size={16}
                  className="text-muted-foreground/60 flex-shrink-0 mt-0.5"
                  strokeWidth={1.75}
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Pricing */}
      <Section>
        <div className="premium-card hover:transform-none max-w-2xl mx-auto py-14 px-10 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-5">
            Subscription
          </p>
          <p className="font-display text-6xl md:text-7xl font-semibold text-foreground mb-2">
            $1,000<span className="text-2xl text-muted-foreground/80">/month</span>
          </p>
          <p className="text-sm text-muted-foreground/80 mb-8">
            Continues after system install
          </p>
          <div className="border-t border-border/30 pt-6 text-xs text-muted-foreground/70 leading-relaxed max-w-md mx-auto">
            Included during implementation. Continued use of the Revenue
            Control Center™ after system install requires this subscription.
          </div>
          <p className="mt-5 text-xs text-muted-foreground/70 leading-relaxed max-w-md mx-auto">
            The Revenue Control System™ keeps important signals visible. It
            does not replace owner judgment or licensed legal, tax,
            accounting, HR, or compliance advice, and it does not guarantee
            business outcomes.
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
            A stable business should keep moving even when the{" "}
            <span className="text-accent">owner steps away</span>.
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-6">
            <Link
              to={DIAGNOSTIC_APPLY_PATH}
              className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-8 py-4 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-4px_hsl(78_36%_35%/0.6)] group"
            >
              Start With the Diagnostic
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/why-rgs-is-different"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
            >
              Why RGS Is Different →
            </Link>
          </div>
        </div>
      </Section>
    </Layout>
  );
};

export default RevenueControlSystem;
