import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";
import Section from "@/components/Section";
import ScorecardIntro from "@/components/scorecard/ScorecardIntro";
import ScorecardQuestions from "@/components/scorecard/ScorecardQuestions";
import ScorecardContactGate from "@/components/scorecard/ScorecardContactGate";
import ScorecardResults from "@/components/scorecard/ScorecardResults";
import { pillars, type PillarAnswers } from "@/components/scorecard/scorecardData";

export type ScorecardStep = "intro" | "questions" | "contact" | "results";

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  phone: string;
}

const Scorecard = () => {
  const [step, setStep] = useState<ScorecardStep>("intro");
  const [answers, setAnswers] = useState<PillarAnswers>(() => {
    const initial: PillarAnswers = {};
    pillars.forEach((p) => {
      initial[p.id] = p.questions.map(() => -1);
    });
    return initial;
  });
  const [contact, setContact] = useState<ContactInfo>({
    firstName: "",
    lastName: "",
    email: "",
    businessName: "",
    phone: "",
  });

  const getPillarScore = (pillarId: string) => {
    const pillar = pillars.find((p) => p.id === pillarId);
    if (!pillar) return 0;
    const vals = answers[pillarId];
    const total = vals.reduce((s, v) => s + (v >= 0 ? v : 0), 0);
    const max = pillar.questions.length * 4;
    return Math.round((total / max) * 200);
  };

  const totalScore = pillars.reduce((s, p) => s + getPillarScore(p.id), 0);

  return (
    <Layout>
      <AnimatePresence mode="wait">
        {step === "intro" && (
          <ScorecardIntro key="intro" onStart={() => setStep("questions")} />
        )}
        {step === "questions" && (
          <ScorecardQuestions
            key="questions"
            answers={answers}
            setAnswers={setAnswers}
            onComplete={() => setStep("contact")}
          />
        )}
        {step === "contact" && (
          <ScorecardContactGate
            key="contact"
            contact={contact}
            setContact={setContact}
            onSubmit={() => setStep("results")}
          />
        )}
        {step === "results" && (
          <ScorecardResults
            key="results"
            totalScore={totalScore}
            getPillarScore={getPillarScore}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default Scorecard;
