// ⚠️ ORPHANED PAGE — not routed in src/App.tsx as of P8.4.
// Kept on disk to preserve historical copy. If you re-route this page,
// re-audit copy for: pricing accuracy ($3,000 / $10,000 / $297), founder
// name "John Matthew Chubb", and current offer structure (Diagnostic →
// Implementation → Revenue Control System™). See P8.0/P8.1/P8.2 audits.

import { motion } from "framer-motion";
import { ArrowRight, Check, X, Activity, Target, Layers, BarChart3, Compass } from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
};

const Section = ({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <motion.section {...fadeUp} id={id} className={`py-20 md:py-28 px-6 ${className}`}>
    <div className="container mx-auto max-w-3xl">{children}</div>
  </motion.section>
);

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 text-foreground">{children}</h2>
);

const Body = ({ children }: { children: React.ReactNode }) => (
  <p className="text-base md:text-lg leading-relaxed text-muted-foreground">{children}</p>
);

const Bullets = ({ items, icon: Icon = Check }: { items: string[]; icon?: any }) => (
  <ul className="mt-6 space-y-3">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 shrink-0 text-primary" strokeWidth={2.25} />
        <span className="text-foreground/90 text-base md:text-lg leading-relaxed">{item}</span>
      </li>
    ))}
  </ul>
);

const PrimaryCTA = ({ label = "Request Full Diagnostic" }: { label?: string }) => (
  <Link
    to="/diagnostic-apply"
    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-base transition-all duration-300 hover:-translate-y-0.5"
    style={{ boxShadow: "0 4px 24px -4px hsl(78 36% 35% / 0.45)" }}
  >
    {label} <ArrowRight className="w-4 h-4" />
  </Link>
);

const Divider = () => (
  <div className="container mx-auto max-w-3xl px-6">
    <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
  </div>
);

const systems = [
  { icon: Target, name: "Demand Generation" },
  { icon: Activity, name: "Revenue Conversion" },
  { icon: Layers, name: "Operational Efficiency" },
  { icon: BarChart3, name: "Financial Visibility" },
  { icon: Compass, name: "Owner Independence" },
];

const DiagnosticOffer = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal header — brand only, no nav */}
      <header className="absolute top-0 left-0 right-0 z-10 px-6 py-6">
        <div className="container mx-auto max-w-6xl">
          <Link to="/" className="text-sm font-semibold tracking-wide text-foreground/80 hover:text-foreground transition-colors">
            RGS
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="container mx-auto max-w-3xl relative text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-card/40 backdrop-blur-sm mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">The RGS Diagnostic</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
            Find Exactly What's Holding Your Business Back{" "}
            <span className="text-muted-foreground">(Not Just What It Feels Like)</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
            The RGS Diagnostic breaks your business down system-by-system to identify where performance is breaking down—and what needs to be addressed first.
          </p>

          <PrimaryCTA />

          <p className="mt-5 text-sm text-muted-foreground/80">
            Structured analysis &nbsp;•&nbsp; No guesswork &nbsp;•&nbsp; Clear direction
          </p>
        </motion.div>
      </section>

      <Divider />

      {/* PROBLEM */}
      <Section>
        <H2>The Problem Isn't Effort—It's Clarity</H2>
        <Body>
          Most business owners can feel when something isn't working, but without a structured breakdown, it's difficult to pinpoint where the issue actually is.
        </Body>
        <Bullets
          items={[
            "More marketing gets added",
            "More time gets spent",
            "More effort gets applied",
            "But the core issue remains",
          ]}
        />
      </Section>

      <Divider />

      {/* REALITY */}
      <Section>
        <H2>Businesses Don't Struggle Because of One Big Problem</H2>
        <Body>
          They struggle because multiple systems are slightly off—and those inefficiencies compound over time.
        </Body>
        <Bullets
          items={[
            "Inconsistent revenue",
            "Operational friction",
            "Slower growth than expected",
            "Increased dependence on the owner",
          ]}
        />
      </Section>

      <Divider />

      {/* SYSTEM INTRO */}
      <Section>
        <H2>The RGS Stability System™</H2>
        <Body>
          We break your business down into 5 core systems and 25 underlying components to identify exactly where performance is breaking down.
        </Body>
        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          {systems.map(({ icon: Icon, name }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-card/60 border border-border/50"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium text-foreground/90">{name}</span>
            </motion.div>
          ))}
        </div>
      </Section>

      <Divider />

      {/* WHAT THIS DIAGNOSTIC DOES */}
      <Section>
        <H2>What This Diagnostic Actually Does</H2>
        <Body>This is a structured analysis designed to give you clarity—not assumptions.</Body>
        <Bullets
          items={[
            "Identifies where revenue is being lost",
            "Highlights underperforming systems",
            "Reveals inefficiencies and friction points",
            "Shows what needs to be addressed first",
          ]}
        />
      </Section>

      <Divider />

      {/* WHAT YOU RECEIVE */}
      <Section>
        <H2>What You Receive</H2>
        <div className="mt-2 p-8 rounded-2xl bg-card/60 border border-border/50">
          <Bullets
            items={[
              "Full RGS Stability Score (0–1000)",
              "Breakdown across all 5 systems",
              "Identification of primary and secondary constraints",
              "Subsystem-level insights (25 components)",
              "Clear prioritization of what to fix first",
              "Structured diagnostic report (PDF-style deliverable)",
            ]}
          />
        </div>
      </Section>

      <Divider />

      {/* WHAT THIS IS NOT */}
      <Section>
        <H2>What This Is Not</H2>
        <Bullets
          icon={X}
          items={[
            "Not generic business advice",
            "Not a motivational session",
            "Not random recommendations",
          ]}
        />
        <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
          This is a structured analysis of how your business is actually functioning.
        </p>
      </Section>

      <Divider />

      {/* WHO THIS IS FOR / NOT FOR */}
      <Section>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl bg-card/60 border border-border/50">
            <h3 className="text-xl font-semibold mb-5 text-foreground">Who This Is For</h3>
            <ul className="space-y-3">
              {[
                "Business owners who know something is off but can't pinpoint it",
                "Those seeking clarity before making more changes",
                "Owners already putting in effort but lacking consistency",
                "Businesses looking to stabilize and scale",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <Check className="w-5 h-5 mt-0.5 shrink-0 text-primary" strokeWidth={2.25} />
                  <span className="text-foreground/90 leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-8 rounded-2xl bg-card/40 border border-border/40">
            <h3 className="text-xl font-semibold mb-5 text-foreground">Who This Is Not For</h3>
            <ul className="space-y-3">
              {[
                "Those looking for quick hacks",
                "Those unwilling to take a structured approach",
                "Those expecting results without implementation",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <X className="w-5 h-5 mt-0.5 shrink-0 text-muted-foreground" strokeWidth={2.25} />
                  <span className="text-muted-foreground leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Divider />

      {/* HOW IT WORKS */}
      <Section>
        <H2>How It Works</H2>
        <ol className="mt-6 space-y-4">
          {[
            "Complete a short intake process",
            "Your business is analyzed across all 5 systems",
            "Receive your full diagnostic report",
            "Review exactly where your business is being limited",
          ].map((step, i) => (
            <li key={step} className="flex items-start gap-4 p-5 rounded-xl bg-card/40 border border-border/40">
              <span className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                0{i + 1}
              </span>
              <span className="text-foreground/90 leading-relaxed pt-1.5">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Divider />

      {/* WHY THIS MATTERS */}
      <Section>
        <H2>Why This Matters</H2>
        <Body>Most businesses try to fix symptoms. This identifies the system causing them.</Body>
        <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
          Without clarity, effort gets wasted. With clarity, improvement becomes intentional.
        </p>
      </Section>

      {/* FINAL CTA */}
      <section className="py-24 md:py-32 px-6">
        <motion.div {...fadeUp} className="container mx-auto max-w-3xl text-center">
          <div className="p-10 md:p-14 rounded-3xl bg-gradient-to-b from-card/80 to-card/40 border border-primary/20">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-5">
              Get a Clear Breakdown of Your Business
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
              If you want to understand exactly what's holding your business back—and what to do about it—this is the next step.
            </p>
            <PrimaryCTA />
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default DiagnosticOffer;
