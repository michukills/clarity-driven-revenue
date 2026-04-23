import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, LineChart, Wallet, Compass, MessageSquare } from "lucide-react";
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

const RevenueControlSystem = () => {
  return (
    <Layout>
      <SEO
        title="Revenue Control System™ — Weekly Revenue Monitoring for Service Businesses"
        description="The Revenue Control System™ is the ongoing weekly operating rhythm RGS clients use after implementation. Tracks revenue, cash, pipeline, blockers, and trends inside the Revenue Control Center™. $297/month."
        canonical="/revenue-control-system"
      />

      {/* Hero */}
      <Section className="pt-32 grid-bg">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
            Revenue Control System™
          </p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-6 leading-[1.05]">
            The weekly rhythm{" "}
            <span className="text-accent">that keeps the system running</span>.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6 max-w-2xl">
            Implementation installs the systems. The Revenue Control System™ is
            how those systems stay alive — a structured weekly operating rhythm
            powered by the Revenue Control Center™ software.
          </p>
          <p className="text-sm text-muted-foreground/80 mb-10 max-w-2xl leading-relaxed">
            <span className="text-foreground/90 font-medium">Revenue Control System™</span> is the
            monthly offer.{" "}
            <span className="text-foreground/90 font-medium">Revenue Control Center™</span> is the
            client software experience you log into.
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
              The Revenue Control System™ begins after implementation and the 30-day grace.
            </p>
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* What it tracks */}
      <Section>
        <div className="max-w-3xl mb-12">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            What It Tracks
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground leading-[1.1]">
            One operating picture, updated every week.
          </h2>
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

      {/* What RGS Review actually is */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            What "RGS Review" Actually Is
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6 leading-[1.15]">
            Advisory and operational support — not automatic magic.
          </h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              When something looks off in your weekly numbers — a cash concern,
              a repeated blocker, a pipeline stall — you can request an RGS
              review from inside the Revenue Control Center™.
            </p>
            <p>
              An RGS reviewer reads the context, flags what likely matters, and
              responds. It is not a guarantee. It is not an algorithm. It is
              another set of eyes on your operating picture.
            </p>
          </div>
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
            $297<span className="text-2xl text-muted-foreground/80">/month</span>
          </p>
          <p className="text-sm text-muted-foreground/80 mb-8">
            Begins after the 30-day post-implementation grace
          </p>
          <div className="border-t border-border/30 pt-6 text-xs text-muted-foreground/70 leading-relaxed max-w-md mx-auto">
            Continued use of the Revenue Control Center™ after the grace period
            requires this subscription. No long-term contracts.
          </div>
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="section-divider" />
      </div>

      {/* Final CTA */}
      <Section className="grid-bg">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-6 leading-[1.1]">
            Stable revenue is a{" "}
            <span className="text-accent">weekly habit</span>, not a quarterly hope.
          </h2>
          <Link
            to={DIAGNOSTIC_APPLY_PATH}
            className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-8 py-4 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-4px_hsl(78_36%_35%/0.6)] group mt-6"
          >
            Start With a Diagnostic
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </Section>
    </Layout>
  );
};

export default RevenueControlSystem;
