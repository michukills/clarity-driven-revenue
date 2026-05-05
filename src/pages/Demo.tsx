import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Compass, Eye, AlertTriangle, PlayCircle, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import SystemDemoAnimation from "@/components/demo/SystemDemoAnimation";
import ShareDemoRow from "@/components/demo/ShareDemoRow";

const SCORECARD_CTA =
  "/scorecard?utm_source=demo_page&utm_medium=video&utm_campaign=rgs_system_demo_v2";
const DIAGNOSTIC_APPLY_PATH = "/diagnostic-apply";

// If/when a final, reviewed walkthrough file ships, set this to a real
// in-repo path (e.g. "/videos/rgs-os-walkthrough.mp4"). While null, the
// page renders a safe placeholder card — never a fake play state.
const WALKTHROUGH_VIDEO_SRC: string | null = null;

const proofBullets = [
  {
    icon: Compass,
    title: "Why business symptoms are usually connected",
    body: "Slower sales, missed follow-ups, messy handoffs, and unclear numbers usually trace back to one slipping gear, not five separate problems.",
  },
  {
    icon: Eye,
    title: "How the five RGS gears work together",
    body: "Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, and Owner Independence — viewed as one connected operating picture.",
  },
  {
    icon: ShieldCheck,
    title: "How the Diagnostic turns evidence into priorities",
    body: "The Business Stability Diagnostic looks at what is slipping, why it matters, and what should be fixed first. The point is guided independence — not dependency.",
  },
];

const transcript = [
  "Most business problems do not start as a disaster. They start as a small slip.",
  "A lead comes in, but follow-up is inconsistent. Sales happen, but the process depends too much on the owner. Work gets done, but handoffs are messy. The numbers exist, but they do not help when a decision has to be made.",
  "That is not usually five separate problems. It is one system carrying pressure in the wrong places.",
  "Revenue & Growth Systems looks at the business through five gears: Demand Generation. Revenue Conversion. Operational Efficiency. Financial Visibility. Owner Independence.",
  "The Business Stability Diagnostic looks for where the system is slipping, what evidence supports that, and what should be fixed first.",
  "This is not done-for-you marketing. It is not legal, tax, accounting, or financial advice. And it is not a promise that a report magically fixes the business.",
  "The point is to make the business clearer, so the owner can make better decisions with less guessing. RGS does not create dependency. It gives the owner clearer control.",
  "Start with the 0–1000 Business Stability Scorecard.",
];

const whatThisShows = [
  "Why business symptoms are often connected",
  "How the five RGS gears work together",
  "Why guessing creates wasted effort",
  "How the Diagnostic turns evidence into priorities",
  "Why RGS focuses on guided independence, not dependency",
];

const whatThisIsNot = [
  "promises about revenue growth or business outcomes",
  "legal, tax, accounting, or financial advice",
  "done-for-you execution",
  "real customer outcomes or quoted results",
  "instant fixes",
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
        title="See How RGS Finds the Slipping Gears"
        description="Most business problems look separate at first. The demo shows how RGS connects the symptoms, identifies the pressure points, and turns the findings into a clearer roadmap."
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
              See how RGS finds the{" "}
              <span className="text-[hsl(78,24%,60%)] font-semibold">slipping gears</span>.
            </h1>
            <p className="mt-6 text-base md:text-lg text-foreground/75 max-w-2xl mx-auto leading-[1.65]">
              Most business problems look separate at first. The demo shows
              how RGS connects the symptoms, identifies the pressure points,
              and turns the findings into a clearer roadmap.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="max-w-4xl mx-auto"
          >
            {/* ── WALKTHROUGH VIDEO (or honest placeholder) ── */}
            <div
              className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden mb-6"
              aria-labelledby="rgs-os-walkthrough-title"
            >
              <div className="px-5 md:px-7 pt-6 pb-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(78,24%,60%)] font-semibold mb-2">
                  Demo walkthrough
                </p>
                <h2
                  id="rgs-os-walkthrough-title"
                  className="font-display text-xl md:text-2xl font-semibold text-foreground leading-snug"
                >
                  Watch the RGS OS demo
                </h2>
                <p className="text-sm text-foreground/75 mt-2 leading-relaxed">
                  This walkthrough uses illustrative sandbox / sample data to show
                  how the RGS OS moves from scorecard to diagnostic review, report,
                  repair map, implementation planning, and ongoing visibility. It
                  is a product walkthrough — not a real customer story, not a
                  client outcome, and not a performance claim.
                </p>
              </div>

              <div className="relative w-full aspect-video bg-[hsl(0_0%_8%)] border-y border-border/40">
                {WALKTHROUGH_VIDEO_SRC ? (
                  <video
                    className="w-full h-full"
                    controls
                    preload="metadata"
                    playsInline
                    aria-label="RGS OS product walkthrough using sample demo data"
                  >
                    <source src={WALKTHROUGH_VIDEO_SRC} type="video/mp4" />
                    Your browser does not support embedded video. The full
                    walkthrough is described in the transcript below.
                  </video>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                    <PlayCircle
                      size={44}
                      strokeWidth={1.25}
                      className="text-[hsl(78,32%,60%)] mb-4"
                      aria-hidden="true"
                    />
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(78,24%,60%)] font-semibold mb-2">
                      Walkthrough video placeholder
                    </p>
                    <h3 className="font-display text-lg md:text-xl font-semibold text-foreground mb-2">
                      Demo video coming soon
                    </h3>
                    <p className="text-sm text-foreground/70 max-w-xl leading-relaxed">
                      The final walkthrough video will show the RGS OS using
                      sample/demo data: scorecard, client portal, admin diagnostic
                      review, the 0–1000 Business Stability Score, the diagnostic
                      report, the Priority Repair Map, implementation tools, and the
                      RGS Control System. Until the final video is uploaded, the
                      animated walkthrough and storyboard below outline the demo
                      flow.
                    </p>
                  </div>
                )}
              </div>

              <div className="px-5 md:px-7 py-4 flex flex-wrap gap-3 items-center">
                <Link
                  to={SCORECARD_CTA}
                  className="inline-flex items-center gap-2 bg-[hsl(78,34%,38%)] text-white font-semibold text-sm px-5 py-2.5 rounded-md transition-all duration-200 hover:bg-[hsl(78,36%,46%)]"
                >
                  Start the scorecard
                  <ArrowRight size={14} />
                </Link>
                <a
                  href="#demo-flow"
                  className="inline-flex items-center gap-1.5 text-sm text-foreground/80 hover:text-foreground transition-colors"
                >
                  <FileText size={14} aria-hidden="true" />
                  View demo flow
                </a>
              </div>
            </div>

            <div id="demo-flow">
              <SystemDemoAnimation />
            </div>
            <p className="text-xs text-muted-foreground/75 mt-3 text-center leading-relaxed max-w-2xl mx-auto">
              This is sample/demo data. This is a product walkthrough — not a
              real customer story. No revenue improvement or business outcome is
              guaranteed. The scorecard is deterministic and preliminary until
              the paid Diagnostic. AI-assisted outputs are admin-reviewed before
              becoming client-visible. Cannabis/MMJ/MMC examples are operational
              visibility only — not legal advice or compliance certification.
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
            <Link
              to={DIAGNOSTIC_APPLY_PATH}
              className="inline-flex items-center gap-1.5 text-sm text-foreground/80 hover:text-foreground transition-colors"
            >
              Request a Diagnostic
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
            One system. Five gears. A clearer next step.
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
        <div className="mt-12 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-card/40 p-6">
            <p className="text-[11px] uppercase tracking-widest text-[hsl(78,24%,60%)] font-semibold mb-3">
              What this demo shows
            </p>
            <ul className="space-y-2">
              {whatThisShows.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2 text-sm text-foreground/85 leading-relaxed"
                >
                  <span className="mt-2 w-1 h-1 rounded-full bg-[hsl(78,32%,60%)] flex-shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/30 p-6">
            <p className="text-[11px] uppercase tracking-widest text-[hsl(38,40%,60%)] font-semibold mb-3 inline-flex items-center gap-1.5">
              <AlertTriangle size={12} />
              What this demo does not claim
            </p>
            <ul className="space-y-2">
              {whatThisIsNot.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
                >
                  <span className="mt-2 w-1 h-1 rounded-full bg-foreground/30 flex-shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
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
