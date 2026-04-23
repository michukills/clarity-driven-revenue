import { motion } from "framer-motion";
import { ArrowRight, AlertCircle, Info } from "lucide-react";
import Section from "@/components/Section";
import { pillars } from "./scorecardData";
import { DIAGNOSTIC_MAILTO } from "@/lib/cta";
import { ScoreBenchmarkScale } from "@/components/scoring/ScoreBenchmarkScale";

const mailtoLink = DIAGNOSTIC_MAILTO;

interface Props {
  totalScore: number;
  getPillarScore: (id: string) => number;
}

interface RangeContent {
  label: string;
  color: string;
  currentState: string;
  whatThisMeans: string;
  whereThisShowsUp: string[];
  whenFixed: string;
  important: string;
}

const getRange = (score: number): RangeContent => {
  if (score <= 300) {
    return {
      label: "Critical Instability",
      color: "text-destructive",
      currentState:
        "The business is operating without reliable systems. Most outcomes depend on effort, urgency, or the owner stepping in directly.",
      whatThisMeans:
        "Growth is unpredictable because the foundation underneath it isn't stable. Performance shifts from week to week, and most decisions are reactive rather than informed.",
      whereThisShowsUp: [
        "Lead flow varies sharply between weeks or months",
        "The same problems resurface even after they appear to be resolved",
        "Day-to-day execution depends heavily on the owner being involved",
        "Financial visibility is limited, so decisions are made on instinct",
      ],
      whenFixed:
        "Operations become predictable, the owner stops being the bottleneck, and the business starts to behave like a system rather than a series of fires.",
      important:
        "At this stage, adding more leads, hiring, or marketing rarely helps. The structural gaps need to be addressed first or new effort gets absorbed by the same friction.",
    };
  }
  if (score <= 600) {
    return {
      label: "Unstable & Reactive",
      color: "text-accent",
      currentState:
        "The business has momentum, but it runs on effort rather than structure. Results happen, but consistency is hard to maintain.",
      whatThisMeans:
        "Several systems are partially in place, but gaps between them create friction. Output is tied to how hard the team pushes in any given week.",
      whereThisShowsUp: [
        "Revenue swings month to month without a clear cause",
        "Process depends on key people remembering steps rather than following a system",
        "Follow-up, delivery, or financial review slips when things get busy",
        "Decisions are often made with incomplete information",
      ],
      whenFixed:
        "Performance becomes consistent across months. The team stops re-solving the same problems, and the owner gains visibility into what's actually driving results.",
      important:
        "Businesses at this stage often try to grow faster before stabilizing — which usually amplifies the existing gaps instead of resolving them.",
    };
  }
  if (score <= 800) {
    return {
      label: "Functional, But Constrained",
      color: "text-accent",
      currentState:
        "Core systems are working. The business is producing reliable results, but a small number of weak points are limiting how far it can scale.",
      whatThisMeans:
        "You've built a solid foundation. The remaining constraints are no longer about effort — they're structural. Fixing them tends to unlock disproportionate growth.",
      whereThisShowsUp: [
        "Growth has plateaued despite consistent input",
        "One or two areas keep capping overall performance",
        "Certain workflows still rely on the owner to move forward",
        "Margins or financial signals aren't as clear as they could be",
      ],
      whenFixed:
        "The business shifts from functional to scalable. Capacity opens up, the owner steps further out of operations, and growth compounds instead of plateauing.",
      important:
        "At this stage, the highest-leverage move is rarely doing more — it's removing the specific constraint that's keeping the system from running at full strength.",
    };
  }
  return {
    label: "Strong & Scalable",
    color: "text-primary",
    currentState:
      "The business is running on a strong, well-built system. Performance is consistent, the team operates with clarity, and the owner isn't the bottleneck.",
    whatThisMeans:
      "You've built something most operators don't — a business that holds together without constant intervention. The opportunity now is optimization and durability.",
    whereThisShowsUp: [
      "Performance stays steady across most months",
      "The team executes without needing the owner in every decision",
      "Financial and operational signals are clear and reviewed regularly",
      "Growth feels controlled rather than chaotic",
    ],
    whenFixed:
      "Refining the remaining edges turns a strong business into a true asset — one that scales further, runs more independently, and increases enterprise value.",
    important:
      "Even at this level, small structural gaps compound at scale. The businesses that stay strong are the ones that keep tightening the system rather than coasting on it.",
  };
};

const ScorecardResults = ({ totalScore, getPillarScore }: Props) => {
  const range = getRange(totalScore);

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
          <p className={`text-lg font-medium ${range.color} relative`}>{range.label}</p>
        </div>

        {/* P10.0 — Score Benchmark Scale */}
        <div className="mb-10">
          <ScoreBenchmarkScale score={totalScore} />
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

        {/* Current State */}
        <div className="premium-card hover:transform-none mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Current State
          </p>
          <p className="text-foreground/90 leading-relaxed">{range.currentState}</p>
        </div>

        {/* What This Means */}
        <div className="premium-card hover:transform-none mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            What This Means
          </p>
          <p className="text-foreground/90 leading-relaxed">{range.whatThisMeans}</p>
        </div>

        {/* Where This Shows Up */}
        <div className="premium-card hover:transform-none mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Where This Shows Up
          </p>
          <ul className="space-y-2.5">
            {range.whereThisShowsUp.map((item, i) => (
              <li key={i} className="flex gap-3 text-foreground/90 leading-relaxed">
                <span className="text-accent mt-2 w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Your Biggest Constraint */}
        <div className="premium-card hover:transform-none mb-6 border-accent/30">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-accent" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Your Biggest Constraint
              </p>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {lowest.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This is the system holding back the rest of your business. Until
                it's strengthened, improvements elsewhere tend to underperform.
              </p>
            </div>
          </div>
        </div>

        {/* What Happens When This Is Fixed */}
        <div className="premium-card hover:transform-none mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            What Happens When This Is Fixed
          </p>
          <p className="text-foreground/90 leading-relaxed">{range.whenFixed}</p>
        </div>

        {/* Important */}
        <div className="premium-card hover:transform-none mb-10 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Info size={18} className="text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Important
              </p>
              <p className="text-foreground/90 leading-relaxed">{range.important}</p>
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
            Request Full Diagnostic
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
