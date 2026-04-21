import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle2, Settings, Activity } from "lucide-react";
import Section from "@/components/Section";
import { Link } from "react-router-dom";

// ----------------- Data -----------------

interface Q {
  text: string;
  options: string[]; // length 5 (A–E)
}
interface Pillar {
  id: string;
  title: string;
  questions: Q[];
}

const pillars: Pillar[] = [
  {
    id: "demand",
    title: "Demand Generation",
    questions: [
      {
        text: "How consistent is your lead flow month over month?",
        options: [
          "No consistent leads — feast or famine",
          "Occasional leads with no pattern",
          "Some consistency, but unpredictable swings",
          "Mostly consistent with minor dips",
          "Highly predictable lead volume each month",
        ],
      },
      {
        text: "How clear are you on which channels actually drive your best leads?",
        options: [
          "No idea where leads come from",
          "Rough guess based on memory",
          "Some tracking, mostly partial",
          "Clear understanding of top channels",
          "Fully attributed and dialed in",
        ],
      },
      {
        text: "How strong is the messaging that brings leads in?",
        options: [
          "Doesn't resonate with the right buyers",
          "Weak — gets ignored most of the time",
          "Sometimes lands, sometimes misses",
          "Usually resonates with the right buyers",
          "Consistently converts attention into inquiries",
        ],
      },
      {
        text: "How qualified are the leads you actually receive?",
        options: [
          "Almost all unqualified",
          "Mostly unqualified, time-wasting",
          "Mixed — half quality, half noise",
          "Mostly qualified and worth pursuing",
          "Highly targeted, ready-to-buy fit",
        ],
      },
      {
        text: "How scalable is your lead generation right now?",
        options: [
          "Not scalable — fully reliant on you",
          "Hard to scale without major rework",
          "Somewhat scalable with effort",
          "Mostly scalable with current systems",
          "Easily scalable on demand",
        ],
      },
    ],
  },
  {
    id: "conversion",
    title: "Revenue Conversion",
    questions: [
      {
        text: "How consistent is your close rate from qualified leads?",
        options: [
          "Highly inconsistent — no pattern",
          "Mostly inconsistent, hit-or-miss",
          "Somewhat consistent",
          "Mostly consistent across reps/months",
          "Highly consistent and predictable",
        ],
      },
      {
        text: "How clearly defined is your sales process from inquiry to close?",
        options: [
          "No process — every deal is different",
          "Loose steps in someone's head",
          "Partially defined and inconsistent",
          "Mostly defined and followed",
          "Fully defined, documented, and followed",
        ],
      },
      {
        text: "How often do deals stall mid-pipeline?",
        options: [
          "Almost always — most deals get stuck",
          "Often — visible bottleneck",
          "Sometimes, depending on deal type",
          "Rarely — most move forward",
          "Almost never — deals move cleanly",
        ],
      },
      {
        text: "How disciplined is your follow-up after first contact?",
        options: [
          "No real follow-up happens",
          "Inconsistent — depends on the day",
          "Sometimes followed, often dropped",
          "Mostly consistent follow-up cadence",
          "Highly disciplined, systemized follow-up",
        ],
      },
      {
        text: "How clearly do you track conversion rates at each stage?",
        options: [
          "Not tracked at all",
          "Roughly tracked from memory",
          "Some tracking in spreadsheets",
          "Clear tracking by stage",
          "Fully measured with stage-by-stage data",
        ],
      },
    ],
  },
  {
    id: "operations",
    title: "Operational Efficiency",
    questions: [
      {
        text: "How well documented are your core operating processes?",
        options: [
          "Not documented anywhere",
          "A few scattered notes",
          "Partially documented, often outdated",
          "Mostly documented and used",
          "Fully documented and actively maintained",
        ],
      },
      {
        text: "How often does day-to-day work depend on you personally?",
        options: [
          "Always — nothing moves without me",
          "Most of the time",
          "Sometimes for key decisions",
          "Rarely — only escalations",
          "Almost never — team runs it",
        ],
      },
      {
        text: "How consistent is delivery quality across clients/jobs?",
        options: [
          "Highly inconsistent",
          "Mostly inconsistent",
          "Somewhat consistent",
          "Mostly consistent",
          "Highly consistent, every time",
        ],
      },
      {
        text: "How often do the same operational issues repeat?",
        options: [
          "Constantly — same fires daily",
          "Often — recurring weekly issues",
          "Sometimes — known patterns",
          "Rarely — most issues stay solved",
          "Almost never — root-caused once and fixed",
        ],
      },
      {
        text: "How efficient is execution day to day?",
        options: [
          "Constant friction and rework",
          "Frequent friction across teams",
          "Some friction in known areas",
          "Mostly smooth with minor drag",
          "Highly efficient and clean",
        ],
      },
    ],
  },
  {
    id: "financial",
    title: "Financial Visibility",
    questions: [
      {
        text: "How well do you understand your true margins by service or product?",
        options: [
          "No real understanding",
          "Rough idea, mostly intuition",
          "Some clarity on a few areas",
          "Clear understanding overall",
          "Fully dialed in by line item",
        ],
      },
      {
        text: "How often do you review financial performance?",
        options: [
          "Almost never",
          "Occasionally when there's a problem",
          "Monthly review",
          "Weekly review",
          "Continuously with live dashboards",
        ],
      },
      {
        text: "How clear are the key numbers that drive your business?",
        options: [
          "Undefined — no real KPIs",
          "Loosely tracked",
          "Some metrics defined",
          "Mostly clear and tracked",
          "Fully defined and reported",
        ],
      },
      {
        text: "How quickly can you identify a financial issue when it happens?",
        options: [
          "Too late — months after the fact",
          "After damage is already done",
          "Within a few weeks",
          "Within days",
          "In real time",
        ],
      },
      {
        text: "How confident are your decisions based on actual financial data?",
        options: [
          "Pure guesswork",
          "Mostly intuition",
          "Some data-informed decisions",
          "Mostly data-driven",
          "Fully data-driven decisions",
        ],
      },
    ],
  },
  {
    id: "independence",
    title: "Owner Independence",
    questions: [
      {
        text: "How dependent is the business on you personally to operate?",
        options: [
          "Fully dependent — I am the business",
          "Heavily dependent on me",
          "Somewhat dependent",
          "Mostly independent of me",
          "Fully independent — runs without me",
        ],
      },
      {
        text: "Can the business run without you for a full week?",
        options: [
          "Not at all",
          "Barely — things break fast",
          "Somewhat, with constant check-ins",
          "Mostly, with light oversight",
          "Fully, with no disruption",
        ],
      },
      {
        text: "How distributed is decision-making across the team?",
        options: [
          "All decisions sit with the owner",
          "Mostly owner-driven",
          "Some delegation in narrow areas",
          "Mostly delegated to leads",
          "Fully distributed across the team",
        ],
      },
      {
        text: "How replaceable are your key roles if someone leaves?",
        options: [
          "Not replaceable — would break operations",
          "Hard to replace, painful gap",
          "Somewhat replaceable with effort",
          "Mostly replaceable with onboarding",
          "Fully replaceable, low risk",
        ],
      },
      {
        text: "How scalable is your current org structure?",
        options: [
          "Not scalable — capped by current setup",
          "Hard to scale without rebuild",
          "Somewhat scalable",
          "Mostly scalable with hires",
          "Easily scalable on demand",
        ],
      },
    ],
  },
];

const TOTAL_QUESTIONS = pillars.reduce((s, p) => s + p.questions.length, 0); // 25

const tierFor = (score: number) => {
  if (score <= 250) return { label: "Critical Instability", color: "text-destructive" };
  if (score <= 500) return { label: "Unstable / Reactive", color: "text-orange-400" };
  if (score <= 750) return { label: "Functional but Limited", color: "text-yellow-400" };
  if (score <= 900) return { label: "Strong System", color: "text-primary" };
  return { label: "Elite / Optimized", color: "text-accent" };
};

const stateLineFor = (score: number) => {
  if (score <= 300)
    return "Your business is operating in a fragile state with multiple system breakdowns.";
  if (score <= 600)
    return "Your business is inconsistent and reactive, with gaps limiting performance.";
  if (score <= 800)
    return "Your business has structure, but key constraints are holding back growth.";
  return "Your business is strong and scalable, with systems working effectively together.";
};

const bottleneckCopy: Record<string, { explanation: string; fixes: string[] }> = {
  demand: {
    explanation:
      "You don't have a predictable way to generate demand. This creates inconsistency in everything downstream.",
    fixes: [
      "Predictable, consistent lead flow",
      "Clear visibility into what's actually working",
      "Less reliance on referrals or luck",
      "A scalable engine instead of constant hustle",
    ],
  },
  conversion: {
    explanation:
      "Leads are not consistently turning into paying customers, limiting revenue growth.",
    fixes: [
      "Higher close rates from existing leads",
      "A repeatable sales process across the team",
      "Fewer deals stalling mid-pipeline",
      "More revenue from the same lead volume",
    ],
  },
  operations: {
    explanation:
      "Inefficiencies and lack of systems are creating friction and limiting scalability.",
    fixes: [
      "Cleaner day-to-day execution",
      "Less daily chaos and firefighting",
      "Consistent delivery quality",
      "A business that can scale without breaking",
    ],
  },
  financial: {
    explanation:
      "You don't have clear insight into your numbers, making it difficult to make confident decisions.",
    fixes: [
      "Clear visibility into real margins",
      "Confident, data-driven decisions",
      "Earlier detection of financial issues",
      "A predictable path to profitability",
    ],
  },
  independence: {
    explanation:
      "The business relies heavily on you, limiting growth and creating long-term risk.",
    fixes: [
      "A business that runs without you in every decision",
      "Distributed decision-making across the team",
      "Reduced personal risk and burnout",
      "Real ability to step back and scale",
    ],
  },
};

type Step = "intro" | "quiz" | "contact" | "results";

interface Contact {
  name: string;
  email: string;
  businessType: string;
}

// ----------------- Page -----------------

const Start = () => {
  const [step, setStep] = useState<Step>("intro");
  const [pillarIdx, setPillarIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>(() => {
    const init: Record<string, number[]> = {};
    pillars.forEach((p) => (init[p.id] = p.questions.map(() => -1)));
    return init;
  });
  const [contact, setContact] = useState<Contact>({ name: "", email: "", businessType: "" });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const pillar = pillars[pillarIdx];
  const answeredCount = useMemo(
    () => Object.values(answers).flat().filter((v) => v >= 0).length,
    [answers]
  );
  const percent = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  const pillarScores = pillars.map((p) => ({
    id: p.id,
    title: p.title,
    score: answers[p.id].reduce((s, v) => s + (v >= 0 ? v : 0), 0), // 0–200
  }));
  const totalScore = pillarScores.reduce((s, p) => s + p.score, 0); // 0–1000
  const lowest = [...pillarScores].sort((a, b) => a.score - b.score)[0];

  const allAnsweredInPillar = pillar.questions.every((_, i) => answers[pillar.id][i] >= 0);

  const handleSelect = (qi: number, value: number) => {
    setAnswers((prev) => {
      const next = { ...prev, [pillar.id]: [...prev[pillar.id]] };
      next[pillar.id][qi] = value;
      return next;
    });
  };

  const goNextPillar = () => {
    // Trigger contact gate at >=60% if not yet submitted
    const newPercent = Math.round(
      (Object.values({ ...answers }).flat().filter((v) => v >= 0).length / TOTAL_QUESTIONS) * 100
    );
    if (pillarIdx < pillars.length - 1) {
      const nextIdx = pillarIdx + 1;
      // After moving forward, if percent will be >=60 and not submitted, prompt later before results
      setPillarIdx(nextIdx);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Last pillar finished
      if (!contactSubmitted) setStep("contact");
      else setStep("results");
    }
    void newPercent;
  };

  // Show contact gate mid-flow once we cross 60% if user hasn't submitted yet
  const maybeShowMidGate = () => {
    if (!contactSubmitted && percent >= 60 && step === "quiz") {
      setStep("contact");
      return true;
    }
    return false;
  };

  const goPrevPillar = () => {
    if (pillarIdx > 0) {
      setPillarIdx((p) => p - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const submitContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.name.trim() || !contact.email.trim()) return;
    setContactSubmitted(true);
    // If quiz fully done → results, else resume quiz
    if (answeredCount === TOTAL_QUESTIONS) setStep("results");
    else setStep("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal top bar — no nav, focused funnel */}
      <header className="px-6 py-5 border-b border-border/40">
        <div className="container mx-auto max-w-5xl flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-foreground">
            Revenue &amp; Growth Systems
          </Link>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Business Scorecard
          </span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            {/* HERO */}
            <Section className="pt-20 pb-16">
              <div className="grid lg:grid-cols-[1.4fr_1fr] gap-12 items-center">
                <div>
                  <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight text-foreground mb-6">
                    Most Businesses Are Losing Revenue—
                    <span className="text-primary">They Just Can't See Where.</span>
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
                    Take the RGS Business Scorecard and get a clear breakdown of where your
                    business is leaking revenue, wasting effort, and stuck.
                  </p>
                  <button
                    onClick={() => setStep("quiz")}
                    className="btn-primary text-base"
                  >
                    Start My Business Scorecard
                    <ArrowRight size={18} />
                  </button>
                  <p className="text-xs text-muted-foreground/70 mt-3">
                    Takes 3–5 minutes • No fluff • Real insights
                  </p>
                </div>
                <div className="relative aspect-square max-w-sm mx-auto w-full">
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
                  <div className="relative h-full w-full rounded-2xl border border-border/50 bg-card/40 backdrop-blur flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-4">
                      {[Settings, Activity, CheckCircle2, Settings].map((Icon, i) => (
                        <motion.div
                          key={i}
                          animate={{ rotate: i % 2 === 0 ? [0, 8, 0] : [0, -8, 0] }}
                          transition={{ duration: 6, repeat: Infinity, delay: i * 0.4 }}
                          className="h-20 w-20 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-center"
                        >
                          <Icon className="text-primary" size={28} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            {/* PAIN */}
            <Section className="py-20 bg-muted/10">
              <div className="max-w-3xl">
                <p className="text-xl sm:text-2xl text-foreground leading-relaxed mb-8 font-display">
                  If your business feels inconsistent, unpredictable, or harder than it should be…
                  it's not a motivation problem. It's a systems problem.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  {[
                    "You're getting leads, but not enough convert",
                    "Revenue fluctuates month to month",
                    "You're busy all day, but not moving forward",
                    "You don't know exactly where the problem is",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>

            {/* SYSTEM INTRO */}
            <Section>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
                The RGS Stability System™ breaks your business into 5 core systems that must work
                together:
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {pillars.map((p, i) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border/50 bg-card/40 p-5"
                  >
                    <div className="text-xs text-primary font-medium mb-2">0{i + 1}</div>
                    <div className="font-display text-base font-semibold text-foreground">
                      {p.title}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* SCORECARD EXPLANATION */}
            <Section className="bg-muted/10">
              <div className="max-w-3xl">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold mb-6 leading-tight">
                  A 0–1000 score showing exactly where you stand.
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  The RGS Business Scorecard evaluates all 5 areas and gives you a clear picture
                  of your business system.
                </p>
                <ul className="space-y-3 mb-10">
                  {[
                    "Identify your biggest bottleneck",
                    "See where revenue is leaking",
                    "Understand what to fix first",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-foreground">
                      <CheckCircle2 className="text-primary mt-0.5 flex-shrink-0" size={18} />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => setStep("quiz")} className="btn-primary">
                  Start Your Scorecard Now
                  <ArrowRight size={18} />
                </button>
                <p className="text-xs text-muted-foreground/70 mt-3">
                  Takes ~2 minutes to get started
                </p>
              </div>
            </Section>
          </motion.div>
        )}

        {step === "quiz" && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            <Section className="pt-12 pb-24">
              {/* Progress */}
              <div className="mb-10 sticky top-0 bg-background/80 backdrop-blur py-4 z-10 -mx-6 px-6 border-b border-border/30">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <span className="font-medium">
                    {pillar.title} — Pillar {pillarIdx + 1} of {pillars.length}
                  </span>
                  <span>You're {percent}% done</span>
                </div>
                <div className="w-full bg-muted/50 rounded-full h-1.5">
                  <motion.div
                    className="bg-primary h-1.5 rounded-full"
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="premium-card hover:transform-none"
              >
                <h2 className="font-display text-2xl font-semibold mb-10 text-foreground">
                  {pillar.title}
                </h2>
                <div className="space-y-10">
                  {pillar.questions.map((q, qi) => (
                    <div key={qi}>
                      <p className="text-base text-foreground mb-4 font-medium">
                        {qi + 1}. {q.text}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => {
                          const value = oi * 10;
                          const selected = answers[pillar.id][qi] === value;
                          const letter = String.fromCharCode(65 + oi);
                          return (
                            <button
                              key={oi}
                              onClick={() => handleSelect(qi, value)}
                              className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all duration-200 border flex items-start gap-3 ${
                                selected
                                  ? "bg-primary/15 border-primary/60 text-foreground shadow-[0_0_16px_-6px_hsl(var(--primary)/0.4)]"
                                  : "border-border/50 text-muted-foreground hover:bg-muted/40 hover:border-border hover:text-foreground"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${
                                  selected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/60 text-muted-foreground"
                                }`}
                              >
                                {letter}
                              </span>
                              <span className="leading-relaxed">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <div className="mt-10 flex items-center justify-between">
                <button
                  onClick={goPrevPillar}
                  disabled={pillarIdx === 0}
                  className={`flex items-center gap-2 text-sm font-medium ${
                    pillarIdx === 0
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArrowLeft size={14} /> Previous
                </button>
                <button
                  onClick={() => {
                    if (!allAnsweredInPillar) return;
                    if (maybeShowMidGate()) return;
                    goNextPillar();
                  }}
                  disabled={!allAnsweredInPillar}
                  className={`btn-primary ${!allAnsweredInPillar ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {pillarIdx < pillars.length - 1 ? "Next Pillar" : "Get My Results"}
                  <ArrowRight size={16} />
                </button>
              </div>
              {!allAnsweredInPillar && (
                <p className="text-xs text-muted-foreground/60 mt-3 text-right">
                  Answer all questions to continue.
                </p>
              )}
            </Section>
          </motion.div>
        )}

        {step === "contact" && (
          <motion.div
            key="contact"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            <Section className="pt-16">
              <div className="max-w-lg mx-auto">
                <h2 className="font-display text-3xl font-semibold mb-3 text-center leading-[1.1]">
                  Get Your Results
                </h2>
                <p className="text-muted-foreground text-center mb-10 leading-relaxed">
                  We'll send your full breakdown + next steps.
                </p>
                <form onSubmit={submitContact} className="premium-card hover:transform-none space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Name <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contact.name}
                      onChange={(e) => setContact((p) => ({ ...p, name: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email <span className="text-primary">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={contact.email}
                      onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))}
                      className="input-field"
                      placeholder="you@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Business Type <span className="text-muted-foreground/60 text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={contact.businessType}
                      onChange={(e) =>
                        setContact((p) => ({ ...p, businessType: e.target.value }))
                      }
                      className="input-field"
                      placeholder="e.g., Service business, Trade, Agency"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!contact.name.trim() || !contact.email.trim()}
                    className={`btn-primary w-full justify-center ${
                      !contact.name.trim() || !contact.email.trim()
                        ? "opacity-40 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {answeredCount === TOTAL_QUESTIONS ? "View My Results" : "Continue Scorecard"}
                    <ArrowRight size={16} />
                  </button>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed pt-1">
                    By submitting, you agree to be contacted by Revenue &amp; Growth Systems
                    regarding your scorecard results and related services.
                  </p>
                </form>
              </div>
            </Section>
          </motion.div>
        )}

        {step === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <Section className="pt-16">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                  <p className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
                    Your RGS Score
                  </p>
                  <div className="font-display text-7xl sm:text-8xl font-semibold text-foreground leading-none mb-3">
                    {totalScore}
                    <span className="text-3xl text-muted-foreground/60">/1000</span>
                  </div>
                  <p className={`text-lg font-medium ${tierFor(totalScore).color}`}>
                    {tierFor(totalScore).label}
                  </p>
                </div>

                <div className="premium-card hover:transform-none mb-10">
                  <h3 className="font-display text-xl font-semibold mb-6">Section Breakdown</h3>
                  <div className="space-y-5">
                    {pillarScores.map((p) => (
                      <div key={p.id}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-foreground font-medium">{p.title}</span>
                          <span className="text-muted-foreground">{p.score} / 200</span>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-700"
                            style={{ width: `${(p.score / 200) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 mb-10">
                  <p className="text-foreground leading-relaxed">
                    Your biggest opportunity is improving your lowest scoring system:{" "}
                    <span className="text-primary font-semibold">{lowest.title}</span>.
                  </p>
                </div>

                <div className="text-center mb-16">
                  <Link to="/diagnostic" className="btn-primary">
                    Request a Full Diagnostic
                    <ArrowRight size={18} />
                  </Link>
                </div>

                {/* Trust */}
                <div className="border-t border-border/40 pt-12 text-center max-w-2xl mx-auto">
                  <p className="text-muted-foreground leading-relaxed mb-10">
                    Built using proven marketing, sales, and operational principles. Designed for
                    business owners who want clarity—not guesswork.
                  </p>
                  <Link to="/diagnostic" className="btn-primary">
                    Find Out What's Actually Holding Your Business Back
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Start;