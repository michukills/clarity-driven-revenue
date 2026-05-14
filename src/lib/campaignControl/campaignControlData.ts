import { supabase } from "@/integrations/supabase/client";
import type {
  CampaignAssetDraft,
  CampaignBrief,
  CampaignConnectionProof,
  CampaignPerformancePoint,
  CampaignProfile,
  CampaignRecommendation,
} from "./types";

export const RGS_MARKETING_WORKSPACE_KEY = "rgs_marketing";

export interface CampaignControlBundle {
  profile: CampaignProfile | null;
  briefs: CampaignBrief[];
  assets: CampaignAssetDraft[];
  performance: CampaignPerformancePoint[];
  connection_proofs: CampaignConnectionProof[];
  learning: Array<{
    summary: string;
    what_worked?: string | null;
    what_did_not_work?: string | null;
    recommended_next_action?: string | null;
    confidence?: string | null;
  }>;
}

function workspaceFilter(query: any, workspaceKey: string) {
  return query.eq("workspace_scope", "rgs_internal").eq("rgs_workspace_key", workspaceKey);
}

export async function adminListCampaignProfiles(customerId: string): Promise<CampaignProfile[]> {
  const { data, error } = await (supabase as any)
    .from("campaign_profiles")
    .select("*")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CampaignProfile[];
}

export async function adminListRgsCampaignProfiles(
  workspaceKey = RGS_MARKETING_WORKSPACE_KEY,
): Promise<CampaignProfile[]> {
  const { data, error } = await workspaceFilter(
    (supabase as any).from("campaign_profiles").select("*"),
    workspaceKey,
  ).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CampaignProfile[];
}

export async function adminUpsertCampaignProfile(profile: CampaignProfile): Promise<CampaignProfile> {
  const { data: auth } = await supabase.auth.getUser();
  const row = {
    ...profile,
    primary_offers: profile.primary_offers ?? [],
    target_audiences: profile.target_audiences ?? [],
    buyer_persona_refs: profile.buyer_persona_refs ?? [],
    swot_refs: profile.swot_refs ?? [],
    diagnostic_refs: profile.diagnostic_refs ?? [],
    repair_map_refs: profile.repair_map_refs ?? [],
    implementation_refs: profile.implementation_refs ?? [],
    control_system_refs: profile.control_system_refs ?? [],
    forbidden_claims: profile.forbidden_claims ?? [],
    preferred_cta_types: profile.preferred_cta_types ?? [],
    channel_preferences: profile.channel_preferences ?? [],
    channel_restrictions: profile.channel_restrictions ?? [],
    missing_inputs: profile.missing_inputs ?? [],
    created_by: auth.user?.id ?? null,
    updated_by: auth.user?.id ?? null,
  };
  const query = profile.id
    ? (supabase as any).from("campaign_profiles").update(row).eq("id", profile.id)
    : (supabase as any).from("campaign_profiles").insert(row);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data as CampaignProfile;
}

export async function adminUpsertRgsCampaignProfile(
  profile: CampaignProfile,
  workspaceKey = RGS_MARKETING_WORKSPACE_KEY,
): Promise<CampaignProfile> {
  return adminUpsertCampaignProfile({
    ...profile,
    customer_id: null,
    workspace_scope: "rgs_internal",
    rgs_workspace_key: workspaceKey,
  });
}

export async function adminListCampaignBriefs(customerId: string): Promise<CampaignBrief[]> {
  const { data, error } = await (supabase as any)
    .from("campaign_briefs")
    .select("*")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CampaignBrief[];
}

export async function adminListRgsCampaignBriefs(
  workspaceKey = RGS_MARKETING_WORKSPACE_KEY,
): Promise<CampaignBrief[]> {
  const { data, error } = await workspaceFilter(
    (supabase as any).from("campaign_briefs").select("*"),
    workspaceKey,
  ).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CampaignBrief[];
}

export async function adminCreateCampaignBrief(brief: CampaignBrief): Promise<CampaignBrief> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from("campaign_briefs")
    .insert({
      ...brief,
      missing_inputs: brief.missing_inputs ?? [],
      evidence_confidence: brief.evidence_confidence ?? "low",
      status: brief.status ?? "draft",
      publishing_status: brief.publishing_status ?? "manual_only",
      created_by: auth.user?.id ?? null,
      updated_by: auth.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CampaignBrief;
}

export async function adminCreateRgsCampaignBrief(
  brief: CampaignBrief,
  workspaceKey = RGS_MARKETING_WORKSPACE_KEY,
): Promise<CampaignBrief> {
  return adminCreateCampaignBrief({
    ...brief,
    customer_id: null,
    workspace_scope: "rgs_internal",
    rgs_workspace_key: workspaceKey,
  });
}

export async function adminUpdateCampaignBrief(id: string, patch: Partial<CampaignBrief>): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await (supabase as any)
    .from("campaign_briefs")
    .update({ ...patch, updated_by: auth.user?.id ?? null })
    .eq("id", id);
  if (error) throw error;
}

export async function adminListCampaignAssets(customerId: string): Promise<any[]> {
  const { data, error } = await (supabase as any)
    .from("campaign_assets")
    .select("*")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminListRgsCampaignAssets(workspaceKey = RGS_MARKETING_WORKSPACE_KEY): Promise<any[]> {
  const { data, error } = await workspaceFilter(
    (supabase as any).from("campaign_assets").select("*"),
    workspaceKey,
  ).order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminListCampaignConnectionProofs(customerId: string): Promise<CampaignConnectionProof[]> {
  const { data, error } = await (supabase as any)
    .from("campaign_connection_proofs")
    .select("*")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CampaignConnectionProof[];
}

export async function adminListRgsCampaignConnectionProofs(
  workspaceKey = RGS_MARKETING_WORKSPACE_KEY,
): Promise<CampaignConnectionProof[]> {
  const { data, error } = await workspaceFilter(
    (supabase as any).from("campaign_connection_proofs").select("*"),
    workspaceKey,
  ).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CampaignConnectionProof[];
}

export async function adminUpsertCampaignConnectionProof(
  proof: CampaignConnectionProof,
): Promise<CampaignConnectionProof> {
  const { data: auth } = await supabase.auth.getUser();
  const row = {
    ...proof,
    verified_by: proof.verified_by ?? auth.user?.id ?? null,
    updated_by: auth.user?.id ?? null,
    created_by: auth.user?.id ?? null,
  };
  const query = proof.id
    ? (supabase as any).from("campaign_connection_proofs").update(row).eq("id", proof.id)
    : (supabase as any).from("campaign_connection_proofs").insert(row);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data as CampaignConnectionProof;
}

export async function adminUpsertRgsCampaignConnectionProof(
  proof: CampaignConnectionProof,
  workspaceKey = RGS_MARKETING_WORKSPACE_KEY,
): Promise<CampaignConnectionProof> {
  return adminUpsertCampaignConnectionProof({
    ...proof,
    customer_id: null,
    workspace_scope: "rgs_internal",
    rgs_workspace_key: workspaceKey,
  });
}

export async function adminUpdateCampaignAsset(id: string, patch: Record<string, unknown>): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await (supabase as any)
    .from("campaign_assets")
    .update({ ...patch, updated_by: auth.user?.id ?? null })
    .eq("id", id);
  if (error) throw error;
}

export async function adminRecordCampaignPerformance(input: {
  customer_id?: string | null;
  workspace_scope?: "customer" | "rgs_internal";
  rgs_workspace_key?: string | null;
  campaign_brief_id?: string | null;
  campaign_asset_id?: string | null;
  platform_channel: string;
  connection_proof_id?: string | null;
  date_range_start: string;
  date_range_end: string;
  impressions?: number;
  reach?: number;
  clicks?: number;
  landing_page_visits?: number;
  scorecard_starts?: number;
  scorecard_completions?: number;
  diagnostic_inquiries?: number;
  conversions_leads?: number;
  cost?: number;
  notes?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await (supabase as any)
    .from("campaign_performance")
    .insert({
      ...input,
      confidence_level: "medium",
      data_source: "manual",
      created_by: auth.user?.id ?? null,
      updated_by: auth.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function adminRecordRgsCampaignPerformance(input: Omit<Parameters<typeof adminRecordCampaignPerformance>[0], "customer_id" | "workspace_scope" | "rgs_workspace_key">, workspaceKey = RGS_MARKETING_WORKSPACE_KEY) {
  return adminRecordCampaignPerformance({
    ...input,
    customer_id: null,
    workspace_scope: "rgs_internal",
    rgs_workspace_key: workspaceKey,
  });
}

export async function generateCampaignAssetsWithAi(input: {
  customerId: string;
  briefId: string;
  recommendation: CampaignRecommendation;
}) {
  const { data, error } = await supabase.functions.invoke("generate-campaign-assets", {
    body: {
      customer_id: input.customerId,
      campaign_brief_id: input.briefId,
      recommendation: input.recommendation,
    },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export async function generateRgsCampaignAssetsWithAi(input: {
  briefId: string;
  recommendation: CampaignRecommendation;
  workspaceKey?: string;
}) {
  const { data, error } = await supabase.functions.invoke("generate-campaign-assets", {
    body: {
      workspace_scope: "rgs_internal",
      rgs_workspace_key: input.workspaceKey ?? RGS_MARKETING_WORKSPACE_KEY,
      campaign_brief_id: input.briefId,
      recommendation: input.recommendation,
    },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export async function getClientCampaignControl(customerId: string): Promise<CampaignControlBundle> {
  const { data, error } = await (supabase as any).rpc("get_client_campaign_control", {
    _customer_id: customerId,
  });
  if (error) throw error;
  return (data ?? {
    profile: null,
    briefs: [],
    assets: [],
    performance: [],
    connection_proofs: [],
    learning: [],
  }) as CampaignControlBundle;
}

export async function clientSubmitCampaignInputs(input: {
  customerId: string;
  businessStage: string;
  primaryOffers: string[];
  targetAudiences: string[];
  brandVoiceNotes: string;
  preferredCtaTypes: string[];
  channelPreferences: string[];
  channelRestrictions: string[];
}): Promise<CampaignControlBundle> {
  const { data, error } = await (supabase as any).rpc("upsert_client_campaign_profile_inputs", {
    _customer_id: input.customerId,
    _business_stage: input.businessStage,
    _primary_offers: input.primaryOffers,
    _target_audiences: input.targetAudiences,
    _brand_voice_notes: input.brandVoiceNotes,
    _preferred_cta_types: input.preferredCtaTypes,
    _channel_preferences: input.channelPreferences,
    _channel_restrictions: input.channelRestrictions,
  });
  if (error) throw error;
  return data as CampaignControlBundle;
}

export function splitLines(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 24);
}
