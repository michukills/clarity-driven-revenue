import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Section from "@/components/Section";

interface Props {
  onStart: () => void;
}

const ScorecardIntro = ({ onStart }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.4 }}
  >
    <Section className="pt-28">
      <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4">
        RGS Business Scorecard
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl mb-4">
        See how stable your business really is.
      </p>
      <p className="text-muted-foreground max-w-2xl mb-6 leading-relaxed">
        The RGS Business Scorecard measures the strength of your business across
        the five core pillars of the RGS Stability System™.
      </p>
      <p className="text-muted-foreground max-w-2xl mb-2">
        You'll receive a total score from 0 to 1,000 based on:
      </p>
      <ul className="list-disc list-inside text-muted-foreground max-w-2xl mb-10 space-y-1">
        <li>Demand Generation</li>
        <li>Revenue Conversion</li>
        <li>Operational Efficiency</li>
        <li>Financial Visibility</li>
        <li>Owner Independence</li>
      </ul>
      <button onClick={onStart} className="btn-primary group">
        Start the Scorecard
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </button>
    </Section>
  </motion.div>
);

export default ScorecardIntro;
