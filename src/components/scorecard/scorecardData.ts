export interface ScorecardQuestion {
  text: string;
  options: { label: string; value: number }[];
}

export interface ScorecardPillar {
  id: string;
  title: string;
  questions: ScorecardQuestion[];
}

export type PillarAnswers = Record<string, number[]>;

// Standard ascending scale 0–40
const scale = (labels: [string, string, string, string, string]) =>
  labels.map((label, i) => ({ label, value: i * 10 }));

export const pillars: ScorecardPillar[] = [
  {
    id: "demand",
    title: "Demand Generation",
    questions: [
      {
        text: "How consistent is your lead flow?",
        options: scale([
          "No consistent leads",
          "Occasional leads",
          "Some consistency",
          "Mostly consistent",
          "Highly predictable",
        ]),
      },
      {
        text: "How clear are your lead sources?",
        options: scale([
          "No idea",
          "Rough guess",
          "Some tracking",
          "Clear understanding",
          "Fully dialed in",
        ]),
      },
      {
        text: "How strong is your messaging?",
        options: scale([
          "Doesn't resonate",
          "Weak",
          "Sometimes works",
          "Usually works",
          "Consistently converts",
        ]),
      },
      {
        text: "How targeted are your leads?",
        options: scale([
          "Completely unqualified",
          "Mostly unqualified",
          "Mixed quality",
          "Mostly qualified",
          "Highly targeted",
        ]),
      },
      {
        text: "How scalable is your lead generation?",
        options: scale([
          "Not scalable",
          "Hard to scale",
          "Somewhat scalable",
          "Mostly scalable",
          "Easily scalable",
        ]),
      },
    ],
  },
  {
    id: "conversion",
    title: "Revenue Conversion",
    questions: [
      {
        text: "How consistent is your close rate?",
        options: scale([
          "Highly inconsistent",
          "Mostly inconsistent",
          "Somewhat consistent",
          "Mostly consistent",
          "Highly consistent",
        ]),
      },
      {
        text: "How defined is your sales process?",
        options: scale([
          "No process",
          "Loose steps",
          "Partially defined",
          "Mostly defined",
          "Fully defined",
        ]),
      },
      {
        text: "How often do deals stall?",
        options: scale([
          "Almost always",
          "Often",
          "Sometimes",
          "Rarely",
          "Almost never",
        ]),
      },
      {
        text: "How well do you follow up?",
        options: scale([
          "No follow-up",
          "Inconsistent",
          "Sometimes",
          "Mostly consistent",
          "Highly disciplined",
        ]),
      },
      {
        text: "How clearly do you track conversions?",
        options: scale([
          "Not tracked",
          "Roughly tracked",
          "Some tracking",
          "Clear tracking",
          "Fully measured",
        ]),
      },
    ],
  },
  {
    id: "operations",
    title: "Operational Efficiency",
    questions: [
      {
        text: "How documented are your processes?",
        options: scale([
          "Not documented",
          "A few notes",
          "Partially documented",
          "Mostly documented",
          "Fully documented",
        ]),
      },
      {
        text: "How often does work rely on you?",
        options: scale([
          "Always",
          "Most of the time",
          "Sometimes",
          "Rarely",
          "Almost never",
        ]),
      },
      {
        text: "How consistent is delivery?",
        options: scale([
          "Highly inconsistent",
          "Mostly inconsistent",
          "Somewhat consistent",
          "Mostly consistent",
          "Highly consistent",
        ]),
      },
      {
        text: "How often do issues repeat?",
        options: scale([
          "Constantly",
          "Often",
          "Sometimes",
          "Rarely",
          "Almost never",
        ]),
      },
      {
        text: "How efficient is day-to-day execution?",
        options: scale([
          "Constant friction",
          "Frequent friction",
          "Some friction",
          "Mostly smooth",
          "Highly efficient",
        ]),
      },
    ],
  },
  {
    id: "financial",
    title: "Financial Visibility",
    questions: [
      {
        text: "How well do you understand margins?",
        options: scale([
          "No understanding",
          "Rough idea",
          "Some clarity",
          "Clear understanding",
          "Fully dialed in",
        ]),
      },
      {
        text: "How often do you review numbers?",
        options: scale([
          "Almost never",
          "Occasionally",
          "Monthly",
          "Weekly",
          "Continuously",
        ]),
      },
      {
        text: "How clear are your key metrics?",
        options: scale([
          "Undefined",
          "Loosely tracked",
          "Some defined",
          "Mostly clear",
          "Fully defined",
        ]),
      },
      {
        text: "How quickly can you identify issues?",
        options: scale([
          "Too late",
          "After damage",
          "Within weeks",
          "Within days",
          "In real time",
        ]),
      },
      {
        text: "How confident are your decisions financially?",
        options: scale([
          "Pure guesswork",
          "Mostly intuition",
          "Some data",
          "Mostly data-driven",
          "Fully data-driven",
        ]),
      },
    ],
  },
  {
    id: "independence",
    title: "Owner Independence",
    questions: [
      {
        text: "How dependent is the business on you?",
        options: scale([
          "Fully dependent",
          "Heavily dependent",
          "Somewhat dependent",
          "Mostly independent",
          "Fully independent",
        ]),
      },
      {
        text: "Can the business run without you daily?",
        options: scale([
          "Not at all",
          "Barely",
          "Somewhat",
          "Mostly",
          "Fully",
        ]),
      },
      {
        text: "How distributed is decision-making?",
        options: scale([
          "All on owner",
          "Mostly owner",
          "Some delegation",
          "Mostly delegated",
          "Fully distributed",
        ]),
      },
      {
        text: "How replaceable are key roles?",
        options: scale([
          "Not replaceable",
          "Hard to replace",
          "Somewhat replaceable",
          "Mostly replaceable",
          "Fully replaceable",
        ]),
      },
      {
        text: "How scalable is your structure?",
        options: scale([
          "Not scalable",
          "Hard to scale",
          "Somewhat scalable",
          "Mostly scalable",
          "Easily scalable",
        ]),
      },
    ],
  },
];
