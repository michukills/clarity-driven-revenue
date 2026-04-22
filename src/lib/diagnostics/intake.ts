// Diagnostic Intake — structured client-side answers for the RGS Diagnostic.
// Backed by `diagnostic_intake_answers` (one row per customer + section_key).
import { supabase } from "@/integrations/supabase/client";

export type IntakeSection = {
  key: string;
  label: string;
  prompt: string;
  placeholder: string;
  required: boolean;
  /** Which diagnostic deliverable this answer feeds. */
  feeds: string;
};

/** Fixed intake section catalogue. Order = display order in the form. */
export const INTAKE_SECTIONS: IntakeSection[] = [
  {
    key: "business_overview",
    label: "Business overview",
    prompt: "In a few sentences, what does your business do and who do you do it for?",
    placeholder: "We help…",
    required: true,
    feeds: "Buyer Persona",
  },
  {
    key: "primary_offer",
    label: "Primary offer / services",
    prompt: "What is the single offer or service we should diagnose? List the main deliverable.",
    placeholder: "Our core offer is…",
    required: true,
    feeds: "Strategy Plan",
  },
  {
    key: "pricing_model",
    label: "Pricing model",
    prompt: "How is this offer priced? (flat fee, hourly, retainer, tiered, value-based, etc.)",
    placeholder: "We charge…",
    required: true,
    feeds: "Revenue Metrics",
  },
  {
    key: "revenue_model",
    label: "Current revenue model",
    prompt: "How does revenue actually come in today? Recurring, one-time, project-based, mix?",
    placeholder: "Most revenue today is…",
    required: true,
    feeds: "Revenue Metrics",
  },
  {
    key: "sales_process",
    label: "Sales process",
    prompt: "Walk us through how a new customer goes from first contact to paying you.",
    placeholder: "First we…, then…",
    required: true,
    feeds: "Conversion Flow Map",
  },
  {
    key: "lead_sources",
    label: "Lead sources",
    prompt: "Where do new leads come from right now? (referrals, ads, networking, inbound, outbound…)",
    placeholder: "Most leads come from…",
    required: true,
    feeds: "Outreach Channels",
  },
  {
    key: "best_fit_buyer",
    label: "Target customer / best-fit buyer",
    prompt: "Describe the customer who buys easily, pays well, and is great to work with.",
    placeholder: "Our best-fit buyer is…",
    required: true,
    feeds: "Buyer Persona",
  },
  {
    key: "customer_journey",
    label: "Current customer journey",
    prompt: "From the customer's view, what does it look like to discover you, decide, and buy?",
    placeholder: "They first hear about us when…",
    required: true,
    feeds: "Conversion Flow Map",
  },
  {
    key: "revenue_blockers",
    label: "Biggest revenue blockers",
    prompt: "What is most clearly getting in the way of more revenue right now?",
    placeholder: "The biggest issue is…",
    required: true,
    feeds: "Strategy Plan",
  },
  {
    key: "ops_blockers",
    label: "Operational / process blockers",
    prompt: "Where do things break down operationally? Where are you the bottleneck?",
    placeholder: "The work gets stuck when…",
    required: false,
    feeds: "Strategy Plan",
  },
  {
    key: "tools_systems",
    label: "Current tools & systems",
    prompt: "What CRM, accounting, scheduling, or delivery tools are you using today?",
    placeholder: "We use…",
    required: false,
    feeds: "Strategy Plan",
  },
  {
    key: "diagnostic_goals",
    label: "Goals for the diagnostic",
    prompt: "What would make this diagnostic genuinely worth it for you?",
    placeholder: "I want to walk away with…",
    required: true,
    feeds: "Strategy Plan",
  },
  {
    key: "constraints",
    label: "Constraints / non-negotiables",
    prompt: "What can't change? Anything we should not recommend? (people, tools, structure, time)",
    placeholder: "We can't…",
    required: false,
    feeds: "Strategy Plan",
  },
  {
    key: "uploads_note",
    label: "Files & documents",
    prompt: "List any files you'll upload (P&L, sales reports, current marketing, sample contracts). Use the Files tab to upload them.",
    placeholder: "I'll upload…",
    required: false,
    feeds: "Revenue Metrics",
  },
];

export type IntakeAnswerRow = {
  id: string;
  customer_id: string;
  section_key: string;
  answer: string | null;
  updated_at: string;
};

const isFilled = (s: string | null | undefined) => !!s && s.trim().length > 0;

export type IntakeStatus = "missing" | "partial" | "complete";

export type IntakeProgress = {
  status: IntakeStatus;
  filled: number;
  total: number;
  requiredFilled: number;
  requiredTotal: number;
  pct: number;
  missingRequired: IntakeSection[];
};

/** Compute intake progress from a customer's answer rows. */
export function buildIntakeProgress(answers: IntakeAnswerRow[]): IntakeProgress {
  const bySection = new Map<string, IntakeAnswerRow>();
  answers.forEach((a) => bySection.set(a.section_key, a));

  const total = INTAKE_SECTIONS.length;
  const filled = INTAKE_SECTIONS.filter((s) => isFilled(bySection.get(s.key)?.answer)).length;

  const required = INTAKE_SECTIONS.filter((s) => s.required);
  const requiredFilled = required.filter((s) => isFilled(bySection.get(s.key)?.answer)).length;
  const missingRequired = required.filter((s) => !isFilled(bySection.get(s.key)?.answer));

  let status: IntakeStatus = "missing";
  if (requiredFilled === required.length && required.length > 0) status = "complete";
  else if (filled > 0) status = "partial";

  return {
    status,
    filled,
    total,
    requiredFilled,
    requiredTotal: required.length,
    pct: total ? Math.round((filled / total) * 100) : 0,
    missingRequired,
  };
}

/** Upsert a single intake answer for a customer. */
export async function saveIntakeAnswer(opts: {
  customerId: string;
  sectionKey: string;
  answer: string;
  submittedBy: string | null;
}) {
  const { customerId, sectionKey, answer, submittedBy } = opts;
  const trimmed = answer.trim();

  // Look up existing to decide insert vs update (UNIQUE constraint also protects us)
  const { data: existing } = await supabase
    .from("diagnostic_intake_answers")
    .select("id")
    .eq("customer_id", customerId)
    .eq("section_key", sectionKey)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("diagnostic_intake_answers")
      .update({ answer: trimmed || null, submitted_by: submittedBy })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("diagnostic_intake_answers")
    .insert([
      {
        customer_id: customerId,
        section_key: sectionKey,
        answer: trimmed || null,
        submitted_by: submittedBy,
      },
    ]);
  if (error) throw error;
}

/** Load all intake answers for a customer. */
export async function loadIntakeAnswers(customerId: string): Promise<IntakeAnswerRow[]> {
  const { data, error } = await supabase
    .from("diagnostic_intake_answers")
    .select("id, customer_id, section_key, answer, updated_at")
    .eq("customer_id", customerId);
  if (error) throw error;
  return (data || []) as IntakeAnswerRow[];
}

/** Bulk-load answers for multiple customers (used by admin dashboards). */
export async function loadIntakeAnswersFor(customerIds: string[]): Promise<IntakeAnswerRow[]> {
  if (customerIds.length === 0) return [];
  const { data, error } = await supabase
    .from("diagnostic_intake_answers")
    .select("id, customer_id, section_key, answer, updated_at")
    .in("customer_id", customerIds);
  if (error) throw error;
  return (data || []) as IntakeAnswerRow[];
}

/** Group answers by customer_id. */
export function groupAnswersByCustomer(rows: IntakeAnswerRow[]): Map<string, IntakeAnswerRow[]> {
  const m = new Map<string, IntakeAnswerRow[]>();
  for (const r of rows) {
    const arr = m.get(r.customer_id) || [];
    arr.push(r);
    m.set(r.customer_id, arr);
  }
  return m;
}