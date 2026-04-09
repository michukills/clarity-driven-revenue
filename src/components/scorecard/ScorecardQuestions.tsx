import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import Section from "@/components/Section";
import { pillars, type PillarAnswers } from "./scorecardData";

interface Props {
  answers: PillarAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<PillarAnswers>>;
  onComplete: () => void;
}

const ScorecardQuestions = ({ answers, setAnswers, onComplete }: Props) => {
  const [currentPillar, setCurrentPillar] = useState(0);
  const pillar = pillars[currentPillar];
  const progress = ((currentPillar + 1) / pillars.length) * 100;

  const handleSelect = (qIndex: number, value: number) => {
    setAnswers((prev) => {
      const updated = { ...prev };
      updated[pillar.id] = [...updated[pillar.id]];
      updated[pillar.id][qIndex] = value;
      return updated;
    });
  };

  const allAnswered = pillar.questions.every((_, i) => answers[pillar.id][i] >= 0);

  const next = () => {
    if (currentPillar < pillars.length - 1) {
      setCurrentPillar((p) => p + 1);
    } else {
      onComplete();
    }
  };

  const prev = () => {
    if (currentPillar > 0) setCurrentPillar((p) => p - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <Section className="pt-32">
        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <span className="font-medium">Pillar {currentPillar + 1} of {pillars.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <motion.div
          key={pillar.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="premium-card hover:transform-none"
        >
          <h2 className="font-display text-2xl font-semibold text-foreground mb-10">
            {pillar.title}
          </h2>

          <div className="space-y-10">
            {pillar.questions.map((q, qi) => (
              <div key={qi}>
                <p className="text-sm text-foreground mb-4">{q.text}</p>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => handleSelect(qi, oi)}
                      className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                        answers[pillar.id][qi] === oi
                          ? "bg-primary/15 border-primary/50 text-primary shadow-[0_0_12px_-4px_hsl(78_36%_35%/0.3)]"
                          : "border-border/50 text-muted-foreground hover:bg-muted/50 hover:border-border"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={currentPillar === 0}
            className={`flex items-center gap-2 text-sm font-medium transition-colors duration-300 ${
              currentPillar === 0
                ? "text-muted-foreground/30 cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowLeft size={14} /> Previous
          </button>
          <button
            onClick={next}
            disabled={!allAnswered}
            className={`btn-primary ${!allAnswered ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {currentPillar < pillars.length - 1 ? "Next Pillar" : "See My Score"}
            <ArrowRight size={16} />
          </button>
        </div>
        {!allAnswered && (
          <p className="text-xs text-muted-foreground/60 mt-3 text-right">
            Answer all questions to continue.
          </p>
        )}
      </Section>
    </motion.div>
  );
};

export default ScorecardQuestions;
