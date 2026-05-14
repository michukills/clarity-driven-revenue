import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Cog, Settings2, Wallet, UserCheck, ShieldCheck, AlertTriangle } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import { SCORECARD_CTA_LABEL, SCORECARD_PATH } from "@/lib/cta";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const comparisonRows = [
  {
    option: "Consultant",
    gives: "Advice and recommendations.",
    missing: "Clear ownership, scope, evidence level, and repeatable follow-through.",
    rgs: "RGS connects findings to decisions, evidence levels, suggested next steps, and execution ownership.",
  },
  {
    option: "Agency",
    gives: "Execution in a specific channel.",
    missing: "System-level diagnosis.",
    rgs: "RGS checks whether the issue is really demand, conversion, operations, financial visibility, or owner dependence before recommending action.",
  },
  {
    option: "Coach",
    gives: "Motivation, perspective, or accountability.",
    missing: "Operational evidence and system repair logic.",
    rgs: "RGS focuses on business stability, not motivation.",
  },
  {
    option: "Dashboard / BI Tool",
    gives: "Data visibility.",
    missing: "Interpretation and the next decision.",
    rgs: "RGS helps explain what the signals mean, what appears unstable, and what decision needs attention first.",
  },
  {
    option: "Generic Assessment",
    gives: "A score or summary.",
    missing: "Repair logic, evidence labels, decision rights, and ongoing visibility.",
    rgs: "RGS connects score → diagnostic → implementation guidance → Revenue Control System™.",
  },
];

const gears = [
  {
    icon: Search,
    name: "Demand Generation",
    question: "Can the business consistently attract the right kind of attention?",
  },
  {
    icon: Cog,
    name: "Revenue Conversion",
    question: "Can the business turn interest into paying customers through a clear sales process?",
  },
  {
    icon: Settings2,
    name: "Operational Efficiency",
    question: "Can the business deliver without constant friction, confusion, or owner intervention?",
  },
  {
    icon: Wallet,
    name: "Financial Visibility",
    question: "Can the owner see what is happening financially soon enough to make useful decisions?",
  },
  {
    icon: UserCheck,
    name: "Owner Independence",
    question: "Can the business keep moving without the owner being the only person who knows what to do?",
  },
];

const reportAnswers = [
  "What RGS found",
  "Evidence level",
  "Why it matters",
  "What this connects to",
  "Owner decision needed",
  "Suggested next step",
  "Execution owner",
];

const evidenceLabels = [
  { label: "Observed", note: "Directly supported by submitted data." },
  { label: "Indicated", note: "Suggested by multiple answers or patterns." },
  { label: "Possible", note: "Worth investigating, not yet proven." },
  { label: "Insufficient Data", note: "Cannot conclude yet." },
];

const badFitItems = [
  "Looking for someone to simply take tasks off their plate without diagnosing the system",
  "Looking for promised revenue outcomes",
  "Unwilling to provide business information",
  "Looking for legal, tax, accounting, HR, payroll, or compliance advice",
  "Expecting RGS to run the business for them",
];

export default function WhyRGSIsDifferent() {
  return (
    <Layout>
      <SEO
        title="Why RGS Is Different | Revenue & Growth Systems"
        description="Revenue & Growth Systems starts with diagnosis, not generic advice. See how RGS helps owner-led businesses identify instability, clarify decisions, and build guided independence."
        canonical="/why-rgs-is-different"
      />

      {/* Hero */}
      <section className="py-24 px-6 grid-bg">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Why RGS Is Different
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6 leading-tight">
              RGS Does Not Start With Advice. It Starts With Diagnosis.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mb-10">
              Most owners are not failing from lack of effort. The problem is that
              general advice, one-off fixes, and scattered tools often leave the owner
              still wondering what to do next. RGS is built to identify what is actually
              slipping, why it matters, and what decision needs attention first.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to={SCORECARD_PATH}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3"
              >
                See How Stable Your Business Really Is
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/diagnostic"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border text-foreground hover:bg-accent/10 transition-colors"
              >
                How the Diagnostic Works
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Most Advice Starts Too Late */}
      <Section>
        <div className="max-w-3xl space-y-6">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
            Most Advice Starts Too Late
          </h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            Many business solutions start with advice, execution, dashboards, or
            motivation before the real issue is identified. General advice can sound
            helpful and still leave the owner without a clear next step.
          </p>
          <p className="text-muted-foreground leading-relaxed text-lg">
            RGS starts by asking what is actually breaking.
          </p>
          <p className="font-display text-foreground text-xl border-l-2 border-primary pl-6 italic">
            General advice is a slippery slope when the real problem has not been
            identified.
          </p>
        </div>
      </Section>

      {/* What RGS Is Not */}
      <Section className="bg-card/30">
        <div className="max-w-3xl space-y-6">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
            What RGS Is Not
          </h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            Agencies, coaches, consultants, and dashboards can all be useful in the
            right situation. The problem starts when the owner is asked to buy a
            solution before the system has been diagnosed.
          </p>
          <ul className="space-y-3 text-muted-foreground leading-relaxed">
            <li>• RGS is not a marketing agency selling one channel as the answer.</li>
            <li>• RGS is not a motivational coach.</li>
            <li>• RGS is not a generic business assessment.</li>
            <li>• RGS is not a dashboard that only shows numbers.</li>
            <li>• RGS is not a consultant trying to make the owner dependent forever.</li>
          </ul>
        </div>
      </Section>

      {/* Comparison */}
      <Section>
        <div className="space-y-8">
          <div className="max-w-3xl">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
              How RGS Compares
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              A side-by-side look at where common options usually start, what may still
              be missing, and how RGS approaches the same situation.
            </p>
          </div>

          <div className="grid gap-4 md:hidden">
            {comparisonRows.map((row, i) => (
              <motion.div
                key={row.option}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="rounded-lg border border-border bg-card p-5 space-y-3"
              >
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {row.option}
                </h3>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">What it usually gives</p>
                  <p className="text-sm text-foreground">{row.gives}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">What may still be missing</p>
                  <p className="text-sm text-foreground">{row.missing}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-primary mb-1">How RGS is different</p>
                  <p className="text-sm text-foreground">{row.rgs}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="hidden md:block overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card">
                <tr className="text-left">
                  <th className="px-5 py-4 font-display font-semibold text-foreground w-[18%]">Common option</th>
                  <th className="px-5 py-4 font-display font-semibold text-foreground w-[24%]">What it usually gives</th>
                  <th className="px-5 py-4 font-display font-semibold text-foreground w-[28%]">What may still be missing</th>
                  <th className="px-5 py-4 font-display font-semibold text-primary w-[30%]">How RGS is different</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.option} className="border-t border-border align-top">
                    <td className="px-5 py-4 font-medium text-foreground">{row.option}</td>
                    <td className="px-5 py-4 text-muted-foreground">{row.gives}</td>
                    <td className="px-5 py-4 text-muted-foreground">{row.missing}</td>
                    <td className="px-5 py-4 text-foreground">{row.rgs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Five Gears */}
      <Section className="bg-card/30">
        <div className="space-y-8">
          <div className="max-w-3xl">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
              The Five Gears Give RGS a System-Level View
            </h2>
            <p className="text-muted-foreground leading-relaxed text-lg italic border-l-2 border-primary pl-6">
              A gear usually does not fail all at once. One worn tooth starts slipping.
              Then the next part of the system has to carry pressure it was not built to
              carry.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {gears.map((gear, i) => {
              const Icon = gear.icon;
              return (
                <motion.div
                  key={gear.name}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  variants={fadeUp}
                  className="rounded-lg border border-border bg-background p-6 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-primary/10 text-primary p-2">
                      <Icon size={18} />
                    </span>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {gear.name}
                    </h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {gear.question}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Guided Independence */}
      <Section>
        <div className="max-w-3xl space-y-6">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
            Guided Independence, Not Dependency
          </h2>
          <p className="text-foreground leading-relaxed text-lg border-l-2 border-primary pl-6">
            RGS is not here to make the owner dependent. It is here to make the
            business easier to think through. When the right information is in
            front of you, the next step usually makes more sense. If you want
            continued visibility after the work is done, that is what the
            Revenue Control System™ is for.
          </p>
          <ul className="space-y-3 text-muted-foreground leading-relaxed">
            <li>• RGS does not replace the owner's judgment.</li>
            <li>• RGS makes the business easier to think through.</li>
            <li>• The Revenue Control System™ keeps the important signals visible after the work is done.</li>
            <li>• Continued visibility is not dependency.</li>
          </ul>
        </div>
      </Section>

      {/* Reports */}
      <Section className="bg-card/30">
        <div className="max-w-3xl space-y-6">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
            RGS Reports Are Built to Be Clear, Not Impressive-Sounding
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Every RGS report is structured to answer the same questions, in the same
            order, so the owner can read it once and know what to do next.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {reportAnswers.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-md border border-border bg-background p-3"
              >
                <ShieldCheck size={16} className="text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 space-y-3">
            <h3 className="font-display text-xl font-semibold text-foreground">
              Evidence labels
            </h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Every finding is tagged so the owner can see how strong the support is
              behind it.
            </p>
            <ul className="space-y-2">
              {evidenceLabels.map((e) => (
                <li key={e.label} className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{e.label}:</span> {e.note}
                </li>
              ))}
            </ul>
            <p className="text-foreground italic pt-2">
              Evidence levels are meant to keep the report honest.
            </p>
          </div>
        </div>
      </Section>

      {/* Bad fit */}
      <Section>
        <div className="max-w-3xl space-y-6">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
            When RGS May Not Be the Right Fit
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            RGS may not be the right fit if you are looking for someone to simply take
            tasks off your plate without first diagnosing the system. A few other
            situations where RGS is probably not the right call:
          </p>
          <ul className="space-y-3">
            {badFitItems.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-md border border-border bg-card p-4"
              >
                <AlertTriangle size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground pt-2 leading-relaxed">
            RGS provides diagnosis, structure, visibility, implementation guidance, and
            decision support. The owner keeps final decision authority. RGS does not
            guarantee revenue outcomes and does not replace legal, tax, accounting, HR,
            payroll, insurance, financial advisory, or compliance professionals.
          </p>
        </div>
      </Section>

      {/* Final CTA */}
      <Section className="bg-card/30">
        <div className="max-w-3xl space-y-6 text-center mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
            If the same problems keep coming back, check the system.
          </h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            The Scorecard gives a self-reported starting read. The Diagnostic goes
            deeper by reviewing the information behind the score and identifying which
            issues should be addressed first.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              to={SCORECARD_PATH}
              className="btn-primary inline-flex items-center gap-2 px-6 py-3"
            >
              {SCORECARD_CTA_LABEL}
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/diagnostic"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border text-foreground hover:bg-accent/10 transition-colors"
            >
              Learn About the Diagnostic
            </Link>
          </div>
        </div>
      </Section>
    </Layout>
  );
}
