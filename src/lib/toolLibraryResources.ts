import { supabase } from "@/integrations/supabase/client";

export type TlrStatus = "draft" | "published" | "archived";

export type TlrResourceType =
  | "guide" | "template" | "checklist" | "worksheet" | "explainer"
  | "sop_support" | "training_support" | "report_support" | "decision_support"
  | "link" | "other";

export type TlrRelatedGear =
  | "demand_generation" | "revenue_conversion" | "operational_efficiency"
  | "financial_visibility" | "owner_independence" | "general";

export type TlrServiceLane =
  | "diagnostic" | "implementation" | "rgs_control_system" | "revenue_control_system"
  | "admin_only" | "shared_support" | "report_only" | "public_pre_client";

export type TlrJourneyPhase =
  | "public_pre_client" | "paid_diagnostic" | "owner_interview" | "diagnostic_tools"
  | "admin_review" | "report_repair_map" | "implementation_planning"
  | "implementation_execution" | "training_handoff" | "rcs_ongoing_visibility"
  | "renewal_health_monitoring" | "internal_admin_operations";

export type TlrIndustryBehavior =
  | "all_industries_shared" | "industry_aware_copy" | "industry_aware_questions"
  | "industry_aware_outputs" | "industry_specific_benchmarks"
  | "industry_specific_templates" | "industry_restricted" | "general_fallback";

export interface AdminToolLibraryResource {
  id: string;
  customer_id: string | null;
  title: string;
  slug: string | null;
  summary: string | null;
  body: string | null;
  resource_type: TlrResourceType;
  service_lane: TlrServiceLane;
  customer_journey_phase: TlrJourneyPhase;
  industry_behavior: TlrIndustryBehavior;
  related_tool_key: string | null;
  related_gear: TlrRelatedGear | null;
  external_url: string | null;
  cta_label: string | null;
  tags: unknown;
  industry_notes: unknown;
  internal_notes: string | null;
  status: TlrStatus;
  client_visible: boolean;
  requires_active_client: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClientToolLibraryResource {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  body: string | null;
  resource_type: TlrResourceType;
  service_lane: TlrServiceLane;
  customer_journey_phase: TlrJourneyPhase;
  industry_behavior: TlrIndustryBehavior;
  related_tool_key: string | null;
  related_gear: TlrRelatedGear | null;
  external_url: string | null;
  cta_label: string | null;
  tags: unknown;
  display_order: number;
  updated_at: string;
}

export const TLR_STATUSES: TlrStatus[] = ["draft", "published", "archived"];
export const TLR_RESOURCE_TYPES: TlrResourceType[] = [
  "guide", "template", "checklist", "worksheet", "explainer",
  "sop_support", "training_support", "report_support", "decision_support",
  "link", "other",
];
export const TLR_SERVICE_LANES: TlrServiceLane[] = [
  "diagnostic", "implementation", "rgs_control_system", "revenue_control_system",
  "admin_only", "shared_support", "report_only", "public_pre_client",
];
export const TLR_JOURNEY_PHASES: TlrJourneyPhase[] = [
  "public_pre_client", "paid_diagnostic", "owner_interview", "diagnostic_tools",
  "admin_review", "report_repair_map", "implementation_planning",
  "implementation_execution", "training_handoff", "rcs_ongoing_visibility",
  "renewal_health_monitoring", "internal_admin_operations",
];
export const TLR_INDUSTRY_BEHAVIORS: TlrIndustryBehavior[] = [
  "all_industries_shared", "industry_aware_copy", "industry_aware_questions",
  "industry_aware_outputs", "industry_specific_benchmarks",
  "industry_specific_templates", "industry_restricted", "general_fallback",
];
export const TLR_RELATED_GEARS: TlrRelatedGear[] = [
  "demand_generation", "revenue_conversion", "operational_efficiency",
  "financial_visibility", "owner_independence", "general",
];

export const TLR_RESOURCE_TYPE_LABEL: Record<TlrResourceType, string> = {
  guide: "Guide",
  template: "Template",
  checklist: "Checklist",
  worksheet: "Worksheet",
  explainer: "Explainer",
  sop_support: "SOP support",
  training_support: "Training support",
  report_support: "Report support",
  decision_support: "Decision support",
  link: "Link",
  other: "Other",
};

export const TLR_LANE_LABEL: Record<TlrServiceLane, string> = {
  diagnostic: "Diagnostic",
  implementation: "Implementation",
  rgs_control_system: "RGS Control System",
  revenue_control_system: "Revenue Control System",
  admin_only: "Admin only",
  shared_support: "Shared support",
  report_only: "Report",
  public_pre_client: "Public",
};

export const TLR_PHASE_LABEL: Record<TlrJourneyPhase, string> = {
  public_pre_client: "Public",
  paid_diagnostic: "Paid diagnostic",
  owner_interview: "Owner interview",
  diagnostic_tools: "Diagnostic tools",
  admin_review: "Admin review",
  report_repair_map: "Report / repair map",
  implementation_planning: "Implementation planning",
  implementation_execution: "Implementation execution",
  training_handoff: "Training handoff",
  rcs_ongoing_visibility: "Ongoing visibility",
  renewal_health_monitoring: "Renewal / health monitoring",
  internal_admin_operations: "Internal admin",
};

export const TLR_INDUSTRY_LABEL: Record<TlrIndustryBehavior, string> = {
  all_industries_shared: "All industries",
  industry_aware_copy: "Industry-aware copy",
  industry_aware_questions: "Industry-aware questions",
  industry_aware_outputs: "Industry-aware outputs",
  industry_specific_benchmarks: "Industry benchmarks",
  industry_specific_templates: "Industry templates",
  industry_restricted: "Industry restricted",
  general_fallback: "General fallback",
};

export const TLR_GEAR_LABEL: Record<TlrRelatedGear, string> = {
  demand_generation: "Demand generation",
  revenue_conversion: "Revenue conversion",
  operational_efficiency: "Operational efficiency",
  financial_visibility: "Financial visibility",
  owner_independence: "Owner independence",
  general: "General",
};

export const TLR_STATUS_LABEL: Record<TlrStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export async function adminListToolLibraryResources(
  customerId: string,
): Promise<AdminToolLibraryResource[]> {
  // Includes both global (customer_id IS NULL) and customer-specific rows so admins
  // see the full library context for this client.
  const { data, error } = await (supabase as any)
    .from("tool_library_resources")
    .select("*")
    .or(`customer_id.is.null,customer_id.eq.${customerId}`)
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminToolLibraryResource[];
}

export async function adminCreateToolLibraryResource(
  customerId: string | null,
  patch: Partial<AdminToolLibraryResource> & { title: string },
): Promise<AdminToolLibraryResource> {
  const { data, error } = await (supabase as any)
    .from("tool_library_resources")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminToolLibraryResource;
}

export async function adminUpdateToolLibraryResource(
  id: string,
  patch: Partial<AdminToolLibraryResource>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("tool_library_resources").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveToolLibraryResource(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("tool_library_resources")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientToolLibraryResources(
  customerId: string,
): Promise<ClientToolLibraryResource[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_tool_library_resources",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientToolLibraryResource[];
}
