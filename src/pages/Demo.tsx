import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Database, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import SystemDemoAnimation from "@/components/demo/SystemDemoAnimation";
import ShareDemoRow from "@/components/demo/ShareDemoRow";

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
    body: "QuickBooks sandbox-style data demonstrates the live accounting sync capability without touching live customer books.",
  },
  {
    icon: ShieldCheck,
    title: "The signal, not the mechanism",
    body: "The public demo shows the shape of the operating picture while the internal RGS logic stays protected.",
  },
];

const transcript = [
  "Busy is not the same as stable.",
  "A business can have customers, activity, and effort and still feel like the same problems keep coming back.",
  "Most owners are not failing from lack of effort. A lot of the time, the business is carrying pressure in a part of the system that has not been clearly identified yet.",
  "A gear usually does not fail all at once. One worn tooth starts slipping. Then the next part of the system has to carry pressure it was not built to carry.",
  "Businesses work the same way. If demand is inconsistent, sales follow-up is unclear, operations keep getting stuck, financial visibility is late, or every decision has to come back to the owner, the system starts slipping.",
  "Revenue & Growth Systems helps owner-led businesses diagnose where that pressure is building.",
  "The 0–1000 Business Stability Scorecard gives you a self-reported starting read across five gears: Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, and Owner Independence. The Scorecard is not a final diagnosis. It helps point attention.",
  "The Diagnostic goes deeper by reviewing the information behind the score and identifying what needs attention first. Implementation turns the diagnosis into a repair plan. The Revenue Control System™ keeps important signals visible after the work is done.",
  "RGS is not here to make the owner dependent. It is here to make the business easier to think through. When the right information is in front of you, the next step usually makes more sense.",
  "If the same problems keep coming back, check the system. Take the 0–1000 Business Stability Scorecard.",
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
        "See how Revenue & Growth Systems turns business data into a clearer operating picture for owner-led businesses across trade, service, retail, restaurant, and regulated industries.",
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
        title="See How RGS Helps Owners Find What Is Slipping"
        description="A short, plain-English walkthrough of how RGS helps owners see where the business is slipping and what needs attention first. Start with the 0–1000 Business Stability Scorecard."
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
              A short, honest look
            </p>
            <h1 className="font-hero text-[2rem] md:text-[2.5rem] lg:text-[3rem] font-bold leading-[1.14] tracking-[-0.02em] text-foreground text-balance">
              See how RGS helps owners find what is{" "}
              <span className="text-[hsl(78,24%,60%)] font-semibold">slipping</span>.
            </h1>
            <p className="mt-6 text-base md:text-lg text-foreground/75 max-w-2xl mx-auto leading-[1.65]">
              A short, plain-English walkthrough of how RGS helps owners see
              where the business is slipping and what needs attention first.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="max-w-4xl mx-auto"
          >
            <SystemDemoAnimation />
            <p className="text-xs text-muted-foreground/75 mt-3 text-center leading-relaxed max-w-2xl mx-auto">
              This demo uses sandbox-style data to demonstrate system capability.
              It does not represent an actual customer outcome, and no private
              client data is used in public demos.
            </p>
            <div className="mt-5">
              <ShareDemoRow />
            </div>
          </motion.div>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              to={SCORECARD_CTA}
              className="font-hero inline-flex items-center justify-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-[0.9375rem] px-7 py-4 rounded-md shadow-[0_2px_10px_-2px_hsl(78_36%_35%/0.35)] transition-all duration-200 hover:bg-[hsl(78,36%,46%)] hover:-translate-y-px hover:shadow-[0_6px_20px_-4px_hsl(78_36%_35%/0.45)] group"
            >
              Take the 0–1000 Business Stability Scorecard
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
            <Link
              to="/why-rgs-is-different"
              className="inline-flex items-center gap-1.5 text-sm text-foreground/80 hover:text-foreground transition-colors"
            >
              Why RGS Is Different
              <ArrowRight size={13} />
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
            The signal first. The mechanism stays protected.
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
            If the same problems keep coming back, check the system.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            — Revenue & Growth Systems
          </p>
          <p className="mt-6 text-base md:text-lg text-foreground/85 leading-relaxed">
            The 0–1000 Business Stability Scorecard is a self-reported starting
            read across the five gears. It helps point attention. It is not a
            final diagnosis.
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              to={SCORECARD_CTA}
              className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-8 py-4 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-4px_hsl(78_36%_35%/0.6)] group"
            >
              Take the 0–1000 Business Stability Scorecard
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
