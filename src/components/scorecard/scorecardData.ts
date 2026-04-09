export interface ScorecardQuestion {
  text: string;
  options: string[];
}

export interface ScorecardPillar {
  id: string;
  title: string;
  questions: ScorecardQuestion[];
}

export type PillarAnswers = Record<string, number[]>;

const scale = [
  "Not at all",
  "Rarely",
  "Sometimes",
  "Mostly",
  "Consistently",
];

export const pillars: ScorecardPillar[] = [
  {
    id: "demand",
    title: "Demand Generation",
    questions: [
      { text: "How consistently do qualified leads come into your business?", options: scale },
      { text: "How clear are you on where your best leads come from?", options: scale },
      { text: "How confident are you in your messaging to the right buyer?", options: scale },
      { text: "How predictable is your lead flow month to month?", options: scale },
      { text: "How actively are you generating demand beyond word-of-mouth?", options: scale },
    ],
  },
  {
    id: "conversion",
    title: "Revenue Conversion",
    questions: [
      { text: "How consistently do leads turn into paying customers?", options: scale },
      { text: "How clearly is your sales process defined?", options: scale },
      { text: "How often do prospects stall or disappear before closing?", options: [...scale].reverse() },
      { text: "How well do you track close rates or conversion points?", options: scale },
      { text: "How confident are you in your pricing strategy?", options: scale },
    ],
  },
  {
    id: "operations",
    title: "Operational Efficiency",
    questions: [
      { text: "How documented are your core processes?", options: scale },
      { text: "How often does work depend on the owner stepping in?", options: [...scale].reverse() },
      { text: "How frequently do tasks get delayed, repeated, or dropped?", options: [...scale].reverse() },
      { text: "How consistently does the business run without fire-fighting?", options: scale },
    ],
  },
  {
    id: "financial",
    title: "Financial Visibility",
    questions: [
      { text: "How clearly do you understand your margins and key numbers?", options: scale },
      { text: "How often do you review business performance metrics?", options: scale },
      { text: "How confident are you in knowing what is driving profit or loss?", options: scale },
      { text: "How quickly can you spot financial problems?", options: scale },
    ],
  },
  {
    id: "independence",
    title: "Owner Independence",
    questions: [
      { text: "How much does the business rely on you daily?", options: [...scale].reverse() },
      { text: "Can work continue smoothly if you step away for a week?", options: scale },
      { text: "How much decision-making is bottlenecked through the owner?", options: [...scale].reverse() },
      { text: "How transferable are responsibilities across the team?", options: scale },
    ],
  },
];
