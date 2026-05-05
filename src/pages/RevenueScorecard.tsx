// ⚠️ ORPHANED PAGE — not routed in src/App.tsx as of P8.4.
// Kept on disk to preserve historical copy. If you re-route this page,
// re-audit copy for: pricing accuracy ($3,000 / $10,000 / $1,000), founder
// name "John Matthew Chubb", and current offer structure (Diagnostic →
// Implementation → Revenue Control System™). See P8.0/P8.1/P8.2 audits.

import { useState } from "react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import { Link } from "react-router-dom";
import { ArrowRight, Target, TrendingUp, BarChart3, Settings, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const pillars = [
  {
    icon: Target,
    title: "Market Position & Pricing",
    questions: [
      "Do you have a clearly defined ideal customer profile?",
      "Has your pricing been reviewed in the last 12 months?",
      "Can you articulate your offer in one sentence?",
      "Do you know your average job profitability?",
    ],
  },
  {
    icon: TrendingUp,
    title: "Lead & Sales System",
    questions: [
      "Do you have more than one consistent lead source?",
      "Is your sales process documented and repeatable?",
      "Do you follow up with every lead within 24 hours?",
      "Can you see your full pipeline at any time?",
    ],
  },
  {
    icon: BarChart3,
    title: "Revenue Tracking & Forecasting",
    questions: [
      "Do you know your close rate?",
      "Do you track revenue weekly — not just monthly?",
      "Can you forecast the next 90 days with confidence?",
      "Do you know your customer acquisition cost?",
    ],
  },
  {
    icon: Settings,
    title: "Operational Discipline",
    questions: [
      "Are roles and responsibilities clearly documented?",
      "Do you have a weekly review rhythm?",
      "Are your key processes written down?",
      "Is there a regular accountability cadence for the team?",
    ],
  },
];

type Answers = Record<string, Record<number, "yes" | "no" | "unsure" | null>>;

const RevenueScorecard = () => {
  const [answers, setAnswers] = useState<Answers>(() => {
    const initial: Answers = {};
    pillars.forEach((p) => {
      initial[p.title] = {};
      p.questions.forEach((_, i) => {
        initial[p.title][i] = null;
      });
    });
    return initial;
  });

  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (pillar: string, qIndex: number, value: "yes" | "no" | "unsure") => {
    setAnswers((prev) => ({
      ...prev,
      [pillar]: { ...prev[pillar], [qIndex]: value },
    }));
  };

  const allAnswered = pillars.every((p) =>
    p.questions.every((_, i) => answers[p.title][i] !== null)
  );

  const getScore = (pillarTitle: string) => {
    const pillar = pillars.find((p) => p.title === pillarTitle);
    if (!pillar) return 0;
    let score = 0;
    pillar.questions.forEach((_, i) => {
      if (answers[pillarTitle][i] === "yes") score += 1;
      else if (answers[pillarTitle][i] === "unsure") score += 0.5;
    });
    return score;
  };

  const totalScore = pillars.reduce((acc, p) => acc + getScore(p.title), 0);
  const maxScore = pillars.reduce((acc, p) => acc + p.questions.length, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);

  const getLevel = () => {
    if (percentage >= 80) return { label: "Strong Foundation", color: "text-primary" };
    if (percentage >= 50) return { label: "Needs Attention", color: "text-accent" };
    return { label: "Critical Gaps", color: "text-destructive" };
  };

  return (
    <Layout>
      <Section className="pt-28">
        <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4">
          Revenue Scorecard
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mb-4">
          A quick self-assessment across the four pillars of a working revenue system. Answer honestly — this is for your clarity, not ours.
        </p>
        <p className="text-sm text-primary font-medium mb-12">
          16 questions. 3 minutes. Real visibility into where your trade business stands.
        </p>

        {!showResults ? (
          <>
            <div className="space-y-12">
              {pillars.map((pillar, pi) => (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: pi * 0.05, duration: 0.4 }}
                  className="p-8 rounded-lg bg-card border border-border"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <pillar.icon className="text-primary" size={24} />
                    <h2 className="font-display text-xl font-semibold text-foreground">
                      {pillar.title}
                    </h2>
                  </div>
                  <div className="space-y-5">
                    {pillar.questions.map((q, qi) => (
                      <div key={qi}>
                        <p className="text-sm text-foreground mb-2">{q}</p>
                        <div className="flex gap-2">
                          {(["yes", "no", "unsure"] as const).map((val) => (
                            <button
                              key={val}
                              onClick={() => handleAnswer(pillar.title, qi, val)}
                              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all border ${
                                answers[pillar.title][qi] === val
                                  ? val === "yes"
                                    ? "bg-primary/10 border-primary/40 text-primary"
                                    : val === "no"
                                    ? "bg-destructive/10 border-destructive/40 text-destructive"
                                    : "bg-muted border-border text-muted-foreground"
                                  : "border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {val === "yes" ? "Yes" : val === "no" ? "No" : "Unsure"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <button
                onClick={() => allAnswered && setShowResults(true)}
                disabled={!allAnswered}
                className={`btn-primary ${!allAnswered ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                See My Score
                <ArrowRight size={16} />
              </button>
              {!allAnswered && (
                <p className="text-xs text-muted-foreground mt-3">Answer all questions to see your results.</p>
              )}
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-8 rounded-lg bg-card border border-border text-center mb-10">
              <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider">Your Revenue System Score</p>
              <p className="font-display text-6xl font-semibold text-foreground mb-2">{percentage}%</p>
              <p className={`text-lg font-medium ${getLevel().color}`}>{getLevel().label}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {pillars.map((pillar) => {
                const score = getScore(pillar.title);
                const max = pillar.questions.length;
                const pct = Math.round((score / max) * 100);
                return (
                  <div key={pillar.title} className="p-6 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <pillar.icon className="text-primary" size={20} />
                      <h3 className="font-display text-lg font-semibold text-foreground">{pillar.title}</h3>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mb-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{score}/{max} — {pct}%</p>
                  </div>
                );
              })}
            </div>

            <div className="p-8 rounded-lg bg-card border border-border">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="text-primary flex-shrink-0 mt-0.5" size={22} />
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                    What this means
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    This scorecard gives you a snapshot — not a diagnosis. It shows where your revenue system is strong and where gaps may be costing you growth, time, or money.
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    If your score reveals gaps, the next step is a Revenue Systems Review — a structured working session where we walk through your numbers together and build a clear picture of what needs attention first.
                  </p>
                  <Link to="/contact" className="btn-primary">
                    Schedule Your Revenue Systems Review
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setShowResults(false)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                Retake Scorecard
              </button>
            </div>
          </motion.div>
        )}
      </Section>
    </Layout>
  );
};

export default RevenueScorecard;
