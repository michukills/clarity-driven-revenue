import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Database, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import SystemDemoAnimation from "@/components/demo/SystemDemoAnimation";

const SCORECARD_CTA =
  "/scorecard?utm_source=demo_page&utm_medium=video&utm_campaign=rgs_system_demo_v2";

const proofBullets = [
  {
    icon: Eye,
    title: "Owner inputs stay separate from evidence",
    body: "Owner-reported information is held apart from evidence-backed signals. The system tells you which is which.",
  },
  {
    icon: Database,
    title: "Live accounting sync, sandbox-safe",
    body: "QuickBooks sandbox-style data shows the live accounting sync capability without touching real client books.",
  },
  {
    icon: ShieldCheck,
    title: "The signal, not the mechanism",
    body: "The public demo shows the shape of the operating picture while the internal RGS logic stays protected.",
  },
];

const transcript = [
  "Are you reacting to problems, or operating with a system that guides the solution?",
  "Without a system: revenue is unclear, leads are inconsistent, and decisions are based on guesswork.",
  "Most businesses don't run systems. They react. This is what happens when you install one.",
  "The system is connected to QuickBooks using sandbox-style data. One live data path. Other business tools can connect or import data over time, so owner time is protected and the operating picture sharpens.",
  "A new invoice is created in the sandbox. The webhook triggers a system sync. Operating revenue updates from $82,500 to $84,200 — fresh accounting data updates the operating picture, not a final accounting close.",
  "The system flags a payment delay pattern and a potential revenue leak. Three simple cards summarize the signal: AR over thirty days, follow-up gap, and stability score. The video shows the signal — the internal scoring logic stays protected.",
  "The result is an operating picture that is clear, predictable, and controlled.",
  "Install a system that gives you control. — Revenue & Growth Systems. See how stable your business really is on a zero to one thousand scale.",
];

export default function Demo() {
  // JSON-LD: WebPage schema for /demo
  useEffect(() => {
    const id = "demo-jsonld";
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const data = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "RGS System Demo",
      description:
        "See how Revenue & Growth Systems turns business data into a clearer operating picture for owner-led trade and field service businesses.",
      url: "https://revenueandgrowthsystems.com/demo",
      isPartOf: {
        "@type": "WebSite",
        name: "Revenue & Growth Systems",
        url: "https://revenueandgrowthsystems.com",
      },
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);

  return (
    <Layout>
      <SEO
        title="RGS System Demo | Revenue & Growth Systems"
        description="See how Revenue & Growth Systems turns business data into a clearer operating picture for owner-led trade and field service businesses."
        canonical="/demo"
      />

      {/* ── HERO + DEMO ── */}
      <section className="pt-32 pb-16 px-6 hero-grid-bg relative overflow-hidden">
        <div className="absolute top-1/3 right-[5%] w-[500px] h-[500px] rounded-full bg-[hsl(78,30%,40%)]/[0.05] blur-[160px] pointer-events-none" />

        <div className="container mx-auto max-w-5xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-10"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-[hsl(78,24%,60%)] font-semibold mb-5">
              60-second system demo
            </p>
            <h1 className="font-hero text-[2rem] md:text-[2.5rem] lg:text-[3rem] font-bold leading-[1.14] tracking-[-0.02em] text-foreground text-balance">
              See What Happens When Your Business Runs on a{" "}
              <span className="text-[hsl(78,24%,60%)] font-semibold">System</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-foreground/75 max-w-2xl mx-auto leading-[1.65]">
              A short public demo of how RGS connects business signals,
              detects revenue leaks, and points owners toward better control.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="max-w-4xl mx-auto"
          >
            <SystemDemoAnimation />
            <p className="text-xs text-muted-foreground/70 mt-3 text-center leading-relaxed">
              Demo / Sandbox Data. This demo uses sandbox-style data to show
              the shape of the system. It does not claim a real client outcome.
            </p>
          </motion.div>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              to={SCORECARD_CTA}
              className="font-hero inline-flex items-center justify-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-[0.9375rem] px-7 py-4 rounded-md shadow-[0_2px_10px_-2px_hsl(78_36%_35%/0.35)] transition-all duration-200 hover:bg-[hsl(78,36%,46%)] hover:-translate-y-px hover:shadow-[0_6px_20px_-4px_hsl(78_36%_35%/0.45)] group"
            >
              Get Your Business Score (0–1000)
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
            <p className="text-xs text-muted-foreground/70 text-center max-w-md">
              The Scorecard is preliminary and self-reported. Final
              recommendations require diagnostic review and evidence
              validation.
            </p>
          </div>
        </div>
      </section>

      {/* ── PROOF OF SYSTEM ── */}
      <Section>
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            What this demo shows
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight">
            Signal first. Mechanism stays protected.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {proofBullets.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="premium-card h-full"
            >
              <b.icon
                className="text-primary/70 mb-5"
                size={24}
                strokeWidth={1.5}
              />
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                {b.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {b.body}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── TRANSCRIPT (SEO + accessibility) ── */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4 text-center">
            Transcript
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8 leading-tight text-center">
            Plain-English walkthrough
          </h2>
          <div className="space-y-3">
            {transcript.map((line, i) => (
              <p
                key={i}
                className="text-sm md:text-base text-foreground/80 leading-relaxed px-5 py-4 rounded-lg border border-border/40 bg-card/30"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FINAL CTA ── */}
      <section className="relative py-24 md:py-28 px-6 bg-[hsl(0_0%_8%)] border-t border-border/40 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(78_36%_35%/0.06)] blur-[140px] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="container mx-auto max-w-2xl text-center relative"
        >
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground leading-[1.15] tracking-tight">
            Install a system that gives you control.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            — Revenue & Growth Systems
          </p>
          <p className="mt-6 text-base md:text-lg text-foreground/85 leading-relaxed">
            → See how stable your business really is{" "}
            <span className="text-[hsl(78,28%,62%)] font-semibold">
              (0–1000)
            </span>
            .
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              to={SCORECARD_CTA}
              className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-8 py-4 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-4px_hsl(78_36%_35%/0.6)] group"
            >
              Get Your Business Score (0–1000)
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}
