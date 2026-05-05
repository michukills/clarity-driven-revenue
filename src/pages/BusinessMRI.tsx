// ⚠️ ORPHANED PAGE — not routed in src/App.tsx as of P8.4.
// Kept on disk to preserve historical copy. If you re-route this page,
// re-audit copy for: pricing accuracy ($3,000 / $10,000 / $1,000), founder
// name "John Matthew Chubb", and current offer structure (Diagnostic →
// Implementation → Revenue Control System™). See P8.0/P8.1/P8.2 audits.

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import {
  ArrowRight,
  Megaphone,
  DollarSign,
  Cog,
  BarChart3,
  UserMinus,
} from "lucide-react";

const pillars = [
  {
    icon: Megaphone,
    key: "demand",
    title: "Demand Generation",
    description: "How consistently your business attracts qualified opportunities.",
    questions: [
      "How predictable is your lead flow month to month?",
      "How well-defined is your ideal customer profile?",
      "How disciplined is your marketing execution?",
      "How effectively do you measure marketing ROI?",
    ],
  },
  {
    icon: DollarSign,
    key: "conversion",
    title: "Revenue Conversion",
    description: "How effectively leads turn into profitable customers.",
    questions: [
      "How structured is your sales/quoting process?",
      "How consistently do you follow up with prospects?",
      "How disciplined is your pricing strategy?",
      "How well do you track close rates?",
    ],
  },
  {
    icon: Cog,
    key: "operations",
    title: "Operational Efficiency",
    description: "How smoothly your workflows, scheduling, and team operate.",
    questions: [
      "How clearly defined are your standard operating procedures?",
      "How efficiently does work move through your business?",
      "How well does your team operate without direct oversight?",
      "How effectively do you manage scheduling and capacity?",
    ],
  },
  {
    icon: BarChart3,
    key: "financial",
    title: "Financial Visibility",
    description: "How clearly you understand the financial performance of the business.",
    questions: [
      "How accurately do you track revenue and margins?",
      "How quickly can you identify financial problems?",
      "How confident are you in your financial forecasting?",
      "How well do you understand job-level profitability?",
    ],
  },
  {
    icon: UserMinus,
    key: "independence",
    title: "Owner Independence",
    description: "How dependent the business is on the owner's constant involvement.",
    questions: [
      "How well does the business run when you step away?",
      "How clearly are roles and responsibilities defined?",
      "How effective is your delegation system?",
      "How well do accountability structures function?",
    ],
  },
];

function getCategory(score: number) {
  if (score >= 800) return { label: "Elite Stability", color: "text-primary" };
  if (score >= 600) return { label: "Strong Business", color: "text-secondary" };
  if (score >= 400) return { label: "Unstable Growth", color: "text-yellow-500" };
  if (score >= 200) return { label: "Critical Weakness", color: "text-orange-500" };
  return { label: "Survival Mode", color: "text-destructive" };
}

const BusinessMRI = () => {
  const totalQuestions = pillars.reduce((sum, p) => sum + p.questions.length, 0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentPillar, setCurrentPillar] = useState(0);

  const handleAnswer = (questionKey: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionKey]: value }));
  };

  const allAnswered = Object.keys(answers).length === totalQuestions;

  const calculateScore = () => {
    const total = Object.values(answers).reduce((sum, v) => sum + v, 0);
    const maxScore = totalQuestions * 10;
    return Math.round((total / maxScore) * 1000);
  };

  const score = submitted ? calculateScore() : 0;
  const category = getCategory(score);

  return (
    <Layout>
      <section className="py-24 px-6 grid-bg">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6">
              Start With a Business MRI™
            </h1>
            <div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
              <p>Before systems can be improved, they must first be understood.</p>
              <p>
                The RGS Business MRI™ is a structured diagnostic that evaluates how your
                business operates across the five pillars of the RGS Stability Framework™.
              </p>
              <p>
                Instead of guessing what to fix next, the MRI provides a clear operational
                picture of your business.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What it evaluates */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-10">
          What the Business MRI Evaluates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((p, i) => (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="p-6 rounded-lg bg-card border border-border"
            >
              <p.icon className="text-primary mb-3" size={24} />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                {p.title}
              </h3>
              <p className="text-sm text-muted-foreground">{p.description}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* What You Receive */}
      <Section>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-6">
          What You Receive
        </h2>
        <p className="text-muted-foreground text-lg mb-6">
          After completing the Business MRI™, you receive:
        </p>
        <ul className="space-y-3 text-muted-foreground mb-6">
          <li className="flex items-start gap-2"><span className="text-primary mt-1">—</span> Your RGS Stability Index™ score</li>
          <li className="flex items-start gap-2"><span className="text-primary mt-1">—</span> A breakdown of system strengths and weaknesses</li>
          <li className="flex items-start gap-2"><span className="text-primary mt-1">—</span> Identification of operational bottlenecks</li>
          <li className="flex items-start gap-2"><span className="text-primary mt-1">—</span> Insight into where chaos is entering the business</li>
        </ul>
        <p className="text-sm text-muted-foreground italic">
          Most business problems are not effort problems. They are system problems.
        </p>
      </Section>

      <div className="container mx-auto max-w-5xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Interactive Scorecard */}
      <Section className="grid-bg">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
          RGS Stability Index™ — Self Assessment
        </h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-2xl">
          Rate your business across each question on a scale of 0–10.
        </p>

        {!submitted ? (
          <>
            {/* Pillar tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              {pillars.map((p, i) => {
                const pillarAnswered = p.questions.every(
                  (_, qi) => answers[`${p.key}-${qi}`] !== undefined
                );
                return (
                  <button
                    key={p.key}
                    onClick={() => setCurrentPillar(i)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPillar === i
                        ? "bg-primary text-primary-foreground"
                        : pillarAnswered
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.title}
                  </button>
                );
              })}
            </div>

            {/* Questions */}
            <div className="space-y-6 mb-10">
              {pillars[currentPillar].questions.map((q, qi) => {
                const key = `${pillars[currentPillar].key}-${qi}`;
                return (
                  <div key={key} className="p-6 rounded-lg bg-card border border-border">
                    <p className="text-foreground text-sm font-medium mb-4">{q}</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 11 }, (_, v) => (
                        <button
                          key={v}
                          onClick={() => handleAnswer(key, v)}
                          className={`w-10 h-10 rounded-md text-sm font-medium transition-colors ${
                            answers[key] === v
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPillar((p) => Math.max(0, p - 1))}
                disabled={currentPillar === 0}
                className="btn-outline disabled:opacity-30"
              >
                Previous
              </button>

              {currentPillar < pillars.length - 1 ? (
                <button
                  onClick={() => setCurrentPillar((p) => p + 1)}
                  className="btn-primary"
                >
                  Next Pillar <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => allAnswered && setSubmitted(true)}
                  disabled={!allAnswered}
                  className="btn-primary disabled:opacity-40"
                >
                  Calculate Score <ArrowRight size={16} />
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              {Object.keys(answers).length} of {totalQuestions} questions answered
            </p>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="p-12 rounded-lg bg-card border border-border mb-10">
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
                Your RGS Stability Index™
              </p>
              <p className={`font-display text-7xl font-bold ${category.color} mb-3`}>
                {score}
              </p>
              <p className={`text-xl font-semibold ${category.color}`}>
                {category.label}
              </p>
              <p className="text-muted-foreground text-sm mt-2">out of 1,000</p>
            </div>

            <h3 className="font-display text-2xl font-semibold text-foreground mb-3">
              Want help understanding your score?
            </h3>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              RGS helps service businesses identify where systems are breaking down
              and what to fix next.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact" className="btn-primary">
                Book a Revenue Fit Conversation
                <ArrowRight size={16} />
              </Link>
              <Link to="/stability-framework" className="btn-outline">
                Explore the RGS Stability Framework
              </Link>
            </div>
          </motion.div>
        )}
      </Section>
    </Layout>
  );
};

export default BusinessMRI;
