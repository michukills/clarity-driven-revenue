import { motion } from "framer-motion";
import { ArrowRight, Search, Cog, BarChart3, ClipboardCheck, ClipboardList, Stethoscope, Map, X, Wrench, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import { DIAGNOSTIC_APPLY_PATH, DIAGNOSTIC_MAILTO } from "@/lib/cta";

const pageCards = [
  {
    icon: BarChart3,
    title: "RGS Business Diagnostic",
    description:
      "$3,000 fixed-scope analysis. Identifies revenue leaks, conversion gaps, and operating breakdowns — and what to fix first.",
    path: "/diagnostic",
  },
  {
    icon: Wrench,
    title: "RGS System Implementation",
    description:
      "Starting at $10,000. Installs the systems identified in the Diagnostic, with guided tool setup and Revenue Control Center™ access.",
    path: "/implementation",
  },
  {
    icon: Activity,
    title: "Revenue Control System™",
    description:
      "$297/month. The ongoing weekly operating rhythm — revenue, cash, pipeline, blockers, and trends inside the Revenue Control Center™.",
    path: "/revenue-control-system",
  },
  {
    icon: Cog,
    title: "The Stability System",
    description:
      "Explore the five interlocking pillars behind the RGS operating system.",
    path: "/system",
  },
  {
    icon: ClipboardCheck,
    title: "AI Business Scorecard",
    description:
      "Answer a few plain-language questions and get an AI-ready read on where your systems are strong, fragile, or leaking revenue.",
    path: "/scorecard",
  },
  {
    icon: Search,
    title: "What We Do",
    description:
      "How RGS identifies system breakdowns and installs the structure that removes them.",
    path: "/what-we-do",
  },
];

const howItWorks = [
  {
    icon: ClipboardList,
    title: "Start With the AI Scorecard or Inquiry",
    description: "Get a baseline or reach out directly.",
  },
  {
    icon: Stethoscope,
    title: "We Diagnose the System",
    description: "Identify where revenue is being lost and what's breaking.",
  },
  {
    icon: Map,
    title: "You Get a Clear Plan",
    description: "Know exactly what to fix first for the highest impact.",
  },
];

const notForList = [
  "People looking for quick hacks or shortcuts",
  "Businesses that aren't operating yet",
  "Anyone expecting done-for-you execution",
];

const caseStudies = [
  {
    title: "Inconsistent Revenue",
    problem: "Leads are coming in, but revenue is unpredictable.",
    found: ["No clear conversion path", "Leads dropping off before close"],
    changed: ["Mapped full customer journey", "Fixed drop-off points"],
    result: "Revenue became consistent and predictable.",
  },
  {
    title: "Owner Bottleneck",
    problem: "Everything depends on the owner.",
    found: ["No documented processes", "Decisions routed through owner"],
    changed: ["Built repeatable structure", "Removed owner bottlenecks"],
    result: "Less owner dependency. More consistent execution.",
  },
  {
    title: "Wrong Messaging / Wrong Customer",
    problem: "High effort, low results.",
    found: ["Targeting the wrong buyer", "Messaging missed real pain"],
    changed: ["Defined true buyer persona", "Aligned messaging to decision drivers"],
    result: "Better lead quality and stronger conversion.",
  },
];

const Index = () => {
  return (
    <Layout>
      <SEO
        title="Revenue & Growth Systems — A Business Operating System for Service Businesses"
        description="RGS installs the operating system behind stable revenue for owner-led service and trades businesses. Diagnostic, Implementation, and the Revenue Control System™ — no hype, no guarantees."
        canonical="/"
      />
      {/* ── HERO ── */}
      <section className="min-h-[92vh] flex items-center pt-32 pb-20 px-6 grid-bg relative overflow-hidden">
        {/* Radial glow — center-right, very subtle */}
        <div className="absolute top-1/2 right-[15%] -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#6B7B3A]/[0.07] blur-[140px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[60%_40%] gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[3.75rem] font-bold leading-[1.08] tracking-tight text-foreground">
              Your Business Isn't Broken.
              <br />
              <span className="text-accent">Your Systems Are.</span>
            </h1>

            <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              We identify where your revenue is leaking, where your process
              breaks, and what's preventing stable growth — then design the
              system to fix it.
            </p>
            <p className="mt-5 text-base md:text-lg text-foreground/85 italic max-w-xl leading-relaxed">
              We don't run your business. We fix the system that runs it.
            </p>

            <div className="mt-12 flex flex-col items-start gap-3">
              <Link
                to={DIAGNOSTIC_APPLY_PATH}
                className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-7 py-3.5 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-4px_hsl(78_36%_35%/0.55)] group"
              >
                Start With a Diagnostic
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <div className="text-xs text-muted-foreground/60 flex items-center gap-3">
                <span>Takes ~2 minutes to get started</span>
                <span className="text-muted-foreground/30">·</span>
                <Link
                  to="/system"
                  className="text-muted-foreground/80 hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  See the system
                </Link>
              </div>
            </div>

            <p className="mt-5 text-sm text-muted-foreground/60">
              Built for service businesses, trades, and owners who need
              structure — not more noise.
            </p>
          </motion.div>

          {/* Right side — empty with depth glow only */}
          <div className="hidden lg:block relative h-[400px]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#6B7B3A]/[0.06] blur-[100px] pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ── EXPLORE PAGES ── */}
      <Section>
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
            Explore RGS
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We install disciplined systems into service businesses. Here's how.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pageCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <Link
                to={card.path}
                className="group block premium-card h-full"
              >
                <card.icon
                  className="text-primary/70 mb-5 transition-all duration-300 group-hover:text-primary group-hover:scale-110"
                  size={26}
                  strokeWidth={1.5}
                />
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {card.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  {card.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm text-primary/70 font-medium group-hover:text-primary transition-colors duration-300">
                  Learn more
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── HOW IT WORKS ── */}
      <Section>
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
            The Process
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A clear path from where you are to what to fix first.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {howItWorks.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="premium-card h-full"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="font-display text-xs font-semibold text-primary/70 tracking-widest">
                  0{i + 1}
                </span>
                <span className="h-px flex-1 bg-border/40" />
                <step.icon size={18} className="text-primary/70" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── REAL BUSINESS EXAMPLES ── */}
      <Section>
        <div className="text-center max-w-3xl mx-auto mb-4">
          <h2 className="font-display text-3xl md:text-4xl lg:text-[2.75rem] font-semibold text-foreground leading-[1.15] tracking-tight">
            Most Businesses Don't Have a Revenue Problem —{" "}
            <span className="text-accent">They Have a System Problem.</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
            These are the patterns we see over and over again — across service
            businesses, trades, and local companies.
          </p>
        </div>

        <div className="flex justify-center mb-14 mt-10">
          <span className="h-px w-24 bg-border/60" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {caseStudies.map((ex, i) => (
            <motion.div
              key={ex.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group relative h-full flex flex-col rounded-xl border border-border/40 bg-card/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.4)]"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary/80 font-semibold mb-4">
                Case 0{i + 1}
              </p>
              <h3 className="font-display text-xl font-semibold text-foreground mb-5 leading-snug">
                {ex.title}
              </h3>

              <div className="space-y-5 text-sm flex-1">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-1.5">
                    Problem
                  </p>
                  <p className="text-foreground/90 leading-relaxed">{ex.problem}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2">
                    What we found
                  </p>
                  <ul className="space-y-1.5">
                    {ex.found.map((f) => (
                      <li key={f} className="flex gap-2.5 text-muted-foreground leading-relaxed">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50 flex-shrink-0 mt-2" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2">
                    What changed
                  </p>
                  <ul className="space-y-1.5">
                    {ex.changed.map((c) => (
                      <li key={c} className="flex gap-2.5 text-muted-foreground leading-relaxed">
                        <span className="w-1 h-1 rounded-full bg-accent/80 flex-shrink-0 mt-2" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-border/40">
                <p className="text-[11px] uppercase tracking-wider text-primary/80 font-semibold mb-1.5">
                  Result
                </p>
                <p className="text-sm text-foreground leading-relaxed">{ex.result}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-base md:text-lg text-muted-foreground italic mt-14 max-w-2xl mx-auto leading-relaxed">
          If any of this feels familiar, you're not alone — and it's fixable.
        </p>
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
            See What's Actually Holding Your Business Back
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Get a clear breakdown of where revenue is being lost, what's not
            working, and exactly what needs to change.
          </p>

          <div className="mt-10 flex flex-col items-center gap-5">
            <Link
              to="/scorecard"
              className="inline-flex items-center gap-2 bg-[hsl(78,36%,35%)] text-white font-semibold text-sm px-8 py-4 rounded-lg shadow-[0_4px_20px_-4px_hsl(78_36%_35%/0.45)] transition-all duration-300 hover:bg-[hsl(78,36%,50%)] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-4px_hsl(78_36%_35%/0.6)] group"
            >
              Start the AI Scorecard
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
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
            Be Honest With Yourself
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-10 leading-[1.15] text-center">
            This Is Not For
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
            RGS was built to give business owners clarity without the noise,
            guesswork, or dependency most consulting creates.
          </p>
        </div>
      </Section>
    </Layout>
  );
};

export default Index;
