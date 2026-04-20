import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Section from "@/components/Section";

interface Props {
  onStart: () => void;
}

const pillarList = [
  "Demand Generation",
  "Revenue Conversion",
  "Operational Efficiency",
  "Financial Visibility",
  "Owner Independence",
];

const scoreBands = [
  { range: "0–300", label: "Unstable system (major breakdowns)" },
  { range: "300–600", label: "Inconsistent performance (gaps in key areas)" },
  { range: "600–800", label: "Structured but limited (growth constraints exist)" },
  { range: "800–1000", label: "Stable and scalable system" },
];

const ScorecardIntro = ({ onStart }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.4 }}
  >
    <Section className="pt-32">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl md:text-5xl font-semibold text-foreground mb-4 leading-[1.1]">
          RGS Business Scorecard
        </h1>
        <p className="text-xl text-muted-foreground mb-4">
          See how stable your business really is.
        </p>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The RGS Business Scorecard measures the strength of your business across
          the five core pillars of the RGS Stability System™.
        </p>
        <p className="text-muted-foreground mb-4">
          You'll receive a total score from 0 to 1,000 based on:
        </p>
        <ul className="space-y-3 mb-12">
          {pillarList.map((p) => (
            <li key={p} className="flex items-center gap-3 text-muted-foreground">
              <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
              <span>{p}</span>
            </li>
          ))}
        </ul>

        {/* What Your Score Means */}
        <div className="premium-card hover:transform-none mb-12">
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-5">
            What Your Score Means
          </p>
          <ul className="space-y-3 mb-5">
            {scoreBands.map((b) => (
              <li key={b.range} className="flex items-start gap-4 text-sm">
                <span className="font-display font-semibold text-foreground tabular-nums w-24 flex-shrink-0">
                  {b.range}
                </span>
                <span className="text-muted-foreground leading-relaxed">{b.label}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-foreground/80 italic pt-4 border-t border-border/30">
            Most businesses fall below where they think they are.
          </p>
        </div>

        <button onClick={onStart} className="btn-primary group">
          Start the Scorecard
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </Section>
  </motion.div>
);

export default ScorecardIntro;
