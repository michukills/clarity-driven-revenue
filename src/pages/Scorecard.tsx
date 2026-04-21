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

  // Each question scored 0–40, 5 questions per pillar = 200 max per pillar.
  const getPillarScore = (pillarId: string) => {
    const vals = answers[pillarId] || [];
    return vals.reduce((s, v) => s + (v >= 0 ? v : 0), 0);
  };

  const totalScore = pillars.reduce((s, p) => s + getPillarScore(p.id), 0);

  const handleContactSubmit = () => {
    // Determine lowest-scoring pillar
    const ranked = pillars
      .map((p) => ({ title: p.title, score: getPillarScore(p.id) }))
      .sort((a, b) => a.score - b.score);
    const lowestSystem = ranked[0]?.title ?? "";

    const payload = {
      name: `${contact.firstName} ${contact.lastName}`.trim(),
      email: contact.email,
      total_score: totalScore,
      lowest_system: lowestSystem,
    };

    // Fire-and-forget Zapier webhook (no-cors to avoid CORS issues)
    fetch("https://hooks.zapier.com/hooks/catch/27303455/ujf52fn/", {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => console.error("Webhook error:", err));

    setStep("results");
  };

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
            onSubmit={handleContactSubmit}
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
