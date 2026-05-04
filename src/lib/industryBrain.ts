import { supabase } from "@/integrations/supabase/client";

export type IndustryKey =
  | "trades_services"
  | "restaurant_food_service"
  | "retail"
  | "cannabis_mmj_mmc"
  | "general_small_business";

export type IndustryBrainTemplateType =
  | "diagnostic_question_example"
  | "diagnostic_interpretation"
  | "report_language"
  | "risk_signal"
  | "benchmark_note"
  | "implementation_example"
  | "workflow_example"
  | "sop_example"
  | "decision_rights_example"
  | "financial_visibility_caveat"
  | "rgs_control_system_note"
  | "compliance_sensitive_note"
  | "other";

export type IndustryBrainGear =
  | "demand_generation"
  | "revenue_conversion"
  | "operational_efficiency"
  | "financial_visibility"
  | "owner_independence"
  | "general";

export type IndustryBrainStatus = "draft" | "active" | "archived";

export interface IndustryBrainEntry {
  id: string;
  industry_key: IndustryKey;
  industry_label: string;
  title: string;
  summary: string | null;
  content: string | null;
  caution_note: string | null;
  template_type: IndustryBrainTemplateType;
  gear: IndustryBrainGear;
  service_lane: string;
  customer_journey_phase: string;
  industry_behavior: string;
  related_tool_key: string | null;
  tags: unknown;
  version: number;
  status: IndustryBrainStatus;
  client_visible: boolean;
  contains_internal_notes: boolean;
  internal_notes: string | null;
  admin_notes: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export const INDUSTRY_KEYS: IndustryKey[] = [
  "trades_services",
  "restaurant_food_service",
  "retail",
  "cannabis_mmj_mmc",
  "general_small_business",
];

export const INDUSTRY_LABEL: Record<IndustryKey, string> = {
  trades_services: "Trades / Services",
  restaurant_food_service: "Restaurant / Food Service",
  retail: "Retail",
  cannabis_mmj_mmc: "Cannabis / MMJ / MMC",
  general_small_business: "General Small Business",
};

export const TEMPLATE_TYPES: IndustryBrainTemplateType[] = [
  "diagnostic_question_example","diagnostic_interpretation","report_language",
  "risk_signal","benchmark_note","implementation_example","workflow_example",
  "sop_example","decision_rights_example","financial_visibility_caveat",
  "rgs_control_system_note","compliance_sensitive_note","other",
];

export const TEMPLATE_TYPE_LABEL: Record<IndustryBrainTemplateType, string> = {
  diagnostic_question_example: "Diagnostic question example",
  diagnostic_interpretation: "Diagnostic interpretation",
  report_language: "Report language",
  risk_signal: "Risk signal",
  benchmark_note: "Benchmark note",
  implementation_example: "Implementation example",
  workflow_example: "Workflow example",
  sop_example: "SOP example",
  decision_rights_example: "Decision rights example",
  financial_visibility_caveat: "Financial visibility caveat",
  rgs_control_system_note: "RGS Control System note",
  compliance_sensitive_note: "Compliance-sensitive note",
  other: "Other",
};

export const GEARS: IndustryBrainGear[] = [
  "demand_generation","revenue_conversion","operational_efficiency",
  "financial_visibility","owner_independence","general",
];

export const GEAR_LABEL: Record<IndustryBrainGear, string> = {
  demand_generation: "Demand generation",
  revenue_conversion: "Revenue conversion",
  operational_efficiency: "Operational efficiency",
  financial_visibility: "Financial visibility",
  owner_independence: "Owner independence",
  general: "General",
};

export const STATUSES: IndustryBrainStatus[] = ["draft", "active", "archived"];

export async function adminListIndustryBrain(): Promise<IndustryBrainEntry[]> {
  const { data, error } = await (supabase as any)
    .from("industry_brain_entries")
    .select("*")
    .order("industry_key", { ascending: true })
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as IndustryBrainEntry[];
}

export async function adminCreateIndustryBrain(
  patch: Partial<IndustryBrainEntry> & {
    industry_key: IndustryKey;
    industry_label: string;
    title: string;
  },
): Promise<IndustryBrainEntry> {
  const { data, error } = await (supabase as any)
    .from("industry_brain_entries")
    .insert(patch)
    .select("*")
    .single();
  if (error) throw error;
  return data as IndustryBrainEntry;
}

export async function adminUpdateIndustryBrain(
  id: string,
  patch: Partial<IndustryBrainEntry>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("industry_brain_entries").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveIndustryBrain(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("industry_brain_entries")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}