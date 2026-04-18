import { motion } from "framer-motion";
import { ArrowRight, AlertCircle } from "lucide-react";
import Section from "@/components/Section";
import { pillars } from "./scorecardData";
import { DIAGNOSTIC_MAILTO } from "@/lib/cta";

const mailtoLink = DIAGNOSTIC_MAILTO;

interface Props {
  totalScore: number;
  getPillarScore: (id: string) => number;
}

const getBand = (score: number) => {
  if (score >= 901)
    return {
      label: "High Stability",
      color: "text-primary",
      description:
        "Highly stable system with predictable performance.",
    };
  if (score >= 751)
    return {
      label: "Strong Foundation",
      color: "text-primary",
      description: "Strong foundation with a few high-impact gaps.",
    };
  if (score >= 501)
    return {
      label: "Functional, Not Scalable",
      color: "text-accent",
      description:
        "Functional, but key systems are holding back consistency and scale.",
    };
  if (score >= 251)
    return {
      label: "Major Gaps",
      color: "text-accent",
      description:
        "Major gaps are limiting growth and creating constant friction.",
    };
  return {
    label: "Critical Instability",
    color: "text-destructive",
    description:
      "Critical instability. The business is operating without reliable systems.",
  };
};

const ScorecardResults = ({ totalScore, getPillarScore }: Props) => {
  const band = getBand(totalScore);

  // Find lowest-scoring pillar (primary constraint)
  const ranked = pillars
    .map((p) => ({ ...p, score: getPillarScore(p.id) }))
    .sort((a, b) => a.score - b.score);
  const lowest = ranked[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <Section className="pt-32">
        {/* Total Score */}
        <div className="premium-card hover:transform-none text-center mb-10 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/[0.05] blur-[80px] pointer-events-none" />
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-3 relative">
            Your RGS Business Score
          </p>
          <p className="font-display text-6xl md:text-7xl font-semibold text-foreground mb-2 relative">
            {totalScore}
          </p>
          <p className="text-muted-foreground text-sm mb-4 relative">out of 1,000</p>
          <p className={`text-lg font-medium ${band.color} relative`}>{band.label}</p>
          <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto relative">
            {band.description}
          </p>
        </div>

        {/* Pillar Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {pillars.map((pillar) => {
            const score = getPillarScore(pillar.id);
            const pct = Math.round((score / 200) * 100);
            const isLowest = pillar.id === lowest.id;
            return (
              <div
                key={pillar.id}
                className={`premium-card hover:transform-none ${
                  isLowest ? "border-accent/40" : ""
                }`}
              >
                <h3 className="font-display text-base font-semibold text-foreground mb-4">
                  {pillar.title}
                </h3>
                <div className="w-full bg-muted/50 rounded-full h-1.5 mb-3">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{score} / 200</p>
              </div>
            );
          })}
        </div>

        {/* Primary Constraint */}
        <div className="premium-card hover:transform-none mb-10 border-accent/30">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-accent" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Your Primary Constraint
              </p>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {lowest.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your lowest scoring pillar is your primary constraint. This is where
                your business is losing the most revenue and stability.
              </p>
            </div>
          </div>
        </div>

        {/* Scorecard → Diagnostic Bridge */}
        <div className="premium-card hover:transform-none text-center max-w-2xl mx-auto relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full bg-primary/[0.05] blur-[80px] pointer-events-none" />
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4 relative">
            Recommended Next Step
          </p>
          <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-3 leading-snug relative">
            This score shows where your system is breaking.
          </h3>
          <p className="text-muted-foreground text-base leading-relaxed mb-8 relative">
            The diagnostic identifies exactly how to fix it.
          </p>
          <a href={mailtoLink} className="btn-primary group relative">
            Start With a Diagnostic
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </a>
        </div>
      </Section>
    </motion.div>
  );
};

export default ScorecardResults;
