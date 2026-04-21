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

const bottleneckCopy: Record<string, { explanation: string; fixes: string[]; signals: string[] }> = {
  demand: {
    explanation:
      "You don't have a predictable way to generate demand. This creates inconsistency in everything downstream.",
    fixes: [
      "Predictable, consistent lead flow",
      "Clear visibility into what's actually working",
      "Less reliance on referrals or luck",
      "A scalable engine instead of constant hustle",
    ],
    signals: [
      "Lead volume varies noticeably from month to month",
      "Most new business comes from referrals or repeat clients",
      "It's unclear which marketing activities are actually driving results",
      "Pipeline planning relies more on estimation than data",
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
    signals: [
      "Close rates differ significantly between team members or weeks",
      "Deals tend to stall in the middle of the pipeline",
      "Follow-up happens inconsistently or depends on memory",
      "It's difficult to predict which leads will convert",
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
    signals: [
      "Recurring tasks are handled differently each time",
      "Small issues frequently escalate into urgent problems",
      "Team members rely on tribal knowledge rather than documented processes",
      "Delivery quality depends heavily on who is doing the work",
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
    signals: [
      "Margins per service or client aren't clearly visible",
      "Cash flow surprises show up later than they should",
      "Pricing decisions are made without full cost data",
      "Financial reviews happen reactively rather than on a schedule",
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
    signals: [
      "Most decisions still route through the owner",
      "Time off creates noticeable slowdowns or issues",
      "Key knowledge lives in one person's head rather than systems",
      "The team waits for direction instead of moving independently",
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
                {/* SCORE REVEAL */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-center mb-14"
                >
                  <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">
                    Your RGS Stability Score
                  </p>
                  <div className="font-display text-7xl sm:text-8xl font-semibold text-foreground leading-none mb-4">
                    {totalScore}
                    <span className="text-3xl text-muted-foreground/60">/1000</span>
                  </div>
                  <p className={`text-lg font-medium mb-6 ${tierFor(totalScore).color}`}>
                    {tierFor(totalScore).label}
                  </p>
                  <p className="text-foreground/90 leading-relaxed max-w-xl mx-auto mb-3">
                    {stateLineFor(totalScore)}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
                    Most business owners overestimate how stable their business actually is. This
                    score shows where reality is.
                  </p>
                </motion.div>

                {/* SYSTEM BREAKDOWN */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="premium-card hover:transform-none mb-10"
                >
                  <h3 className="font-display text-xl font-semibold mb-2">System Breakdown</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Your score across the 5 core systems.
                  </p>
                  <div className="space-y-5">
                    {pillarScores.map((p, i) => {
                      const isLowest = p.id === lowest.id;
                      return (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                        >
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span
                              className={`font-medium ${
                                isLowest ? "text-accent" : "text-foreground"
                              }`}
                            >
                              {p.title}
                              {isLowest && (
                                <span className="ml-2 text-[10px] uppercase tracking-widest text-accent/80">
                                  Lowest
                                </span>
                              )}
                            </span>
                            <span
                              className={isLowest ? "text-accent" : "text-muted-foreground"}
                            >
                              {p.score} / 200
                            </span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(p.score / 200) * 100}%` }}
                              transition={{ duration: 0.9, delay: 0.4 + i * 0.08, ease: "easeOut" }}
                              className={`h-2 rounded-full ${
                                isLowest ? "bg-accent" : "bg-primary"
                              }`}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* BIGGEST BOTTLENECK */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="rounded-xl border border-accent/40 bg-accent/[0.04] p-7 mb-10"
                >
                  <p className="text-xs uppercase tracking-widest text-accent mb-3">
                    Your Biggest Constraint
                  </p>
                  <h3 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mb-4 leading-tight">
                    {lowest.title}
                  </h3>
                  <p className="text-foreground/85 leading-relaxed">
                    {bottleneckCopy[lowest.id].explanation}
                  </p>
                </motion.div>

                {/* COST OF THE PROBLEM */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="mb-10"
                >
                  <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground mb-4 leading-snug">
                    This isn't just a minor inefficiency.
                  </h3>
                  <p className="text-foreground/85 leading-relaxed mb-3">
                    This is likely costing you revenue, time, and growth opportunities every month.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Most businesses don't fail because of one big problem—they struggle because
                    small system breakdowns compound over time.
                  </p>
                </motion.div>

                {/* WHAT FIXING THIS LOOKS LIKE */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="premium-card hover:transform-none mb-12"
                >
                  <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground mb-5 leading-snug">
                    When this system is fixed, everything changes:
                  </h3>
                  <ul className="space-y-3">
                    {bottleneckCopy[lowest.id].fixes.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-foreground/90">
                        <CheckCircle2
                          className="text-primary mt-0.5 flex-shrink-0"
                          size={18}
                          strokeWidth={1.75}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* TRANSITION */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="text-center mb-10 max-w-xl mx-auto"
                >
                  <p className="text-foreground text-lg leading-relaxed mb-1">
                    This score shows where the problem is.
                  </p>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    But it doesn't show exactly how to fix it.
                  </p>
                </motion.div>

                {/* PRIMARY CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                  className="premium-card hover:transform-none text-center mb-6 relative overflow-hidden"
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/[0.06] blur-[80px] pointer-events-none" />
                  <h3 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mb-4 relative">
                    Get a Full Business Diagnostic
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-7 max-w-xl mx-auto relative">
                    We break down your business step-by-step, identify exactly where you're losing
                    revenue, and give you a clear system to fix it.
                  </p>
                  <Link to="/diagnostic" className="btn-primary relative">
                    Request Full Diagnostic
                    <ArrowRight size={18} />
                  </Link>
                  <ul className="mt-8 grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground text-left max-w-xl mx-auto relative">
                    {[
                      "One primary product/service deep dive",
                      "Clear system breakdown",
                      "Practical next steps you can implement",
                      "No fluff, no guesswork",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2">
                        <CheckCircle2
                          className="text-primary mt-0.5 flex-shrink-0"
                          size={15}
                          strokeWidth={1.75}
                        />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <div className="text-center mb-16">
                  <a
                    href={`mailto:?subject=My RGS Stability Score&body=My RGS Stability Score: ${totalScore}/1000`}
                    className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors"
                  >
                    Not ready yet? Get your results emailed to you
                  </a>
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