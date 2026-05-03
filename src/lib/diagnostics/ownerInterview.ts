// P41 — Owner Diagnostic Interview catalogue + helpers.
// Reuses the existing diagnostic_intake_answers table (one row per
// section_key per customer). Section keys mirror the keys validated by the
// `mark_owner_interview_complete` SQL function; do not rename without
// updating the migration.
import { supabase } from "@/integrations/supabase/client";

export type OwnerInterviewSection = {
  key: string;
  label: string;
  prompt: string;
  helper?: string;
  placeholder: string;
  required: boolean;
  group: "identity" | "owner" | "demand" | "ops" | "finance" | "independence";
  /** Optional fixed-choice helpers shown above the freeform field. */
  suggestions?: string[];
};

export const OWNER_INTERVIEW_GROUPS: { key: OwnerInterviewSection["group"]; title: string; intro: string }[] = [
  { key: "identity", title: "Business identity", intro: "The basics of what the business does and who it serves." },
  { key: "owner", title: "Owner's view of the problem", intro: "What feels harder than it should — in plain language." },
  { key: "demand", title: "Demand & revenue", intro: "Where customers come from and how reliably." },
  { key: "ops", title: "Operations", intro: "Where the work gets stuck or depends too heavily on you." },
  { key: "finance", title: "Financial visibility", intro: "What you can and cannot see about the money." },
  { key: "independence", title: "Owner independence", intro: "Where the business still runs through you." },
];

export const OWNER_INTERVIEW_SECTIONS: OwnerInterviewSection[] = [
  // Identity
  { key: "biz_identity", group: "identity", required: true, label: "Business name & market",
    prompt: "What is the business called and what market does it serve?",
    placeholder: "We are…  located in…  serving…", },
  { key: "biz_industry", group: "identity", required: true, label: "Industry",
    prompt: "What industry would you say the business sits in?",
    placeholder: "Trades, retail, restaurant, services…", },
  { key: "biz_offer", group: "identity", required: true, label: "Primary product or service",
    prompt: "What is the single offer we should diagnose first?",
    placeholder: "Our core offer is…", },
  { key: "biz_revenue_stage", group: "identity", required: true, label: "Current revenue stage",
    prompt: "Roughly where is the business today on revenue?",
    helper: "Approximate is fine. \"I don't know\" is also a valid answer.",
    placeholder: "Approx. annual revenue or stage…",
    suggestions: ["Under $250k", "$250k–$1M", "$1M–$5M", "$5M+", "I don't know"], },
  { key: "biz_team", group: "identity", required: false, label: "Team size",
    prompt: "How many people are part of the business right now (including you)?",
    placeholder: "e.g. 4 full-time, 2 part-time", },

  // Owner view
  { key: "owner_problem_top", group: "owner", required: true, label: "What feels harder than it should",
    prompt: "What part of running the business feels harder than it should right now?",
    placeholder: "The thing that drains me most is…", },
  { key: "owner_what_changed", group: "owner", required: true, label: "What has changed recently",
    prompt: "What has shifted in the last 6–12 months — internally or externally?",
    placeholder: "Recently we noticed…", },
  { key: "owner_already_tried", group: "owner", required: true, label: "What you've already tried",
    prompt: "What have you already tried to fix it, and what happened?",
    placeholder: "We tried…  it helped/didn't help because…", },
  { key: "owner_worried_about", group: "owner", required: false, label: "What worries you most",
    prompt: "If nothing changes, what worries you most about the next 12 months?",
    placeholder: "What worries me is…", },

  // Demand
  { key: "demand_sources", group: "demand", required: true, label: "Where customers come from",
    prompt: "Where do new customers come from today? List every channel you can name.",
    placeholder: "Referrals, repeat buyers, ads, walk-in, inbound…", },
  { key: "demand_reliable", group: "demand", required: true, label: "Most reliable demand source",
    prompt: "Which channel can you actually count on month after month?",
    placeholder: "The most reliable source is…  /  I don't know", },
  { key: "demand_unreliable", group: "demand", required: true, label: "Least reliable demand source",
    prompt: "Which channel feels inconsistent or hard to predict?",
    placeholder: "The least reliable source is…  /  I don't know", },

  // Ops + sales
  { key: "sales_process", group: "ops", required: true, label: "Sales / conversion process",
    prompt: "Walk us through how a new lead becomes a paying customer.",
    placeholder: "First we…, then…, then they pay when…", },
  { key: "followup_process", group: "ops", required: true, label: "Follow-up process",
    prompt: "How do you follow up with leads who don't buy right away?",
    placeholder: "We follow up by…  /  We don't have one yet", },
  { key: "ops_bottleneck", group: "ops", required: true, label: "Recurring bottleneck",
    prompt: "Where does the work consistently get stuck or delayed?",
    placeholder: "It usually gets stuck when…", },
  { key: "ops_owner_dependent", group: "ops", required: true, label: "Owner-dependent work",
    prompt: "What work cannot move forward without you specifically?",
    placeholder: "Nothing happens until I…", },

  // Finance
  { key: "fin_visibility", group: "finance", required: true, label: "Financial visibility",
    prompt: "How clearly can you see margin, cash, and which services are most profitable?",
    helper: "Be honest. Many owners answer \"I don't know\" here — that itself is the diagnosis.",
    placeholder: "Today I can see…  /  I don't know what the real margin is", },
  { key: "fin_pricing_confidence", group: "finance", required: true, label: "Pricing confidence",
    prompt: "How confident are you that current pricing covers cost + the margin you need?",
    placeholder: "I'm confident because…  /  I'm not sure because…", },

  // Independence
  { key: "owner_decisions_only", group: "independence", required: true, label: "Decisions only you can make",
    prompt: "Which decisions still come back to you because no one else can make them?",
    placeholder: "Only I can decide…", },
  { key: "owner_key_person_risk", group: "independence", required: true, label: "Key-person risk",
    prompt: "If you stepped away for two weeks, what would slow down or stop?",
    placeholder: "If I'm out, what stops is…", },
];

export function isOwnerInterviewKey(key: string): boolean {
  return OWNER_INTERVIEW_SECTIONS.some((s) => s.key === key);
}

export function ownerInterviewProgress(answers: Map<string, string>): {
  filled: number; total: number; requiredFilled: number; requiredTotal: number; missingRequired: OwnerInterviewSection[]; pct: number;
} {
  const required = OWNER_INTERVIEW_SECTIONS.filter((s) => s.required);
  const filled = OWNER_INTERVIEW_SECTIONS.filter((s) => (answers.get(s.key) ?? "").trim().length > 0).length;
  const requiredFilled = required.filter((s) => (answers.get(s.key) ?? "").trim().length > 0).length;
  const missingRequired = required.filter((s) => (answers.get(s.key) ?? "").trim().length === 0);
  return {
    filled, total: OWNER_INTERVIEW_SECTIONS.length,
    requiredFilled, requiredTotal: required.length,
    missingRequired,
    pct: Math.round((filled / OWNER_INTERVIEW_SECTIONS.length) * 100),
  };
}

export async function markOwnerInterviewComplete(customerId: string) {
  const { data, error } = await supabase.rpc("mark_owner_interview_complete", { _customer_id: customerId });
  if (error) throw error;
  return data;
}