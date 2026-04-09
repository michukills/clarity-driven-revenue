import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Section from "@/components/Section";
import { pillars } from "./scorecardData";

const mailtoLink =
  "mailto:info@revenueandgrowthsystems.com?subject=RGS Diagnostic Inquiry";

interface Props {
  totalScore: number;
  getPillarScore: (id: string) => number;
}

const getBand = (score: number) => {
  if (score >= 901) return { label: "High Stability", color: "text-primary", description: "The business shows strong system alignment across core areas." };
  if (score >= 751) return { label: "Strong Foundation", color: "text-primary", description: "Strong foundation with some gaps that, if fixed, could significantly improve performance and independence." };
  if (score >= 501) return { label: "Developing Systems", color: "text-accent", description: "The business has working parts, but key systems are still reducing stability and predictability." };
  if (score >= 251) return { label: "Foundational Weaknesses", color: "text-accent", description: "Foundational weaknesses are limiting growth and creating unnecessary strain." };
  return { label: "Critical Instability", color: "text-destructive", description: "Multiple parts of the business likely depend on guesswork, inconsistency, or owner overload." };
};

const ScorecardResults = ({ totalScore, getPillarScore }: Props) => {
  const band = getBand(totalScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <Section className="pt-28">
        {/* Total Score */}
        <div className="p-8 rounded-xl bg-card border border-border text-center mb-10">
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Your RGS Business Score</p>
          <p className="font-display text-6xl md:text-7xl font-semibold text-foreground mb-2">{totalScore}</p>
          <p className="text-muted-foreground text-sm mb-3">out of 1,000</p>
          <p className={`text-lg font-medium ${band.color}`}>{band.label}</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">{band.description}</p>
        </div>

        {/* Pillar Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {pillars.map((pillar) => {
            const score = getPillarScore(pillar.id);
            const pct = Math.round((score / 200) * 100);
            return (
              <div key={pillar.id} className="p-6 rounded-xl bg-card border border-border">
                <h3 className="font-display text-base font-semibold text-foreground mb-3">{pillar.title}</h3>
                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{score} / 200</p>
              </div>
            );
          })}
        </div>

        {/* Next Step */}
        <div className="p-8 rounded-xl bg-card border border-border">
          <h3 className="font-display text-xl font-semibold text-foreground mb-3">
            Recommended Next Step
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            Want help turning this score into a clear plan? Contact Revenue &amp;
            Growth Systems to discuss your results and explore what a structured
            diagnostic could uncover.
          </p>
          <a href={mailtoLink} className="btn-primary group">
            Request a Diagnostic
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </Section>
    </motion.div>
  );
};

export default ScorecardResults;
