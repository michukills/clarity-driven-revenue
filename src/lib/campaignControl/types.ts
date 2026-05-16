export type CampaignReadinessStatus =
  | "ready_to_market"
  | "market_with_caution"
  | "fix_intake_first"
  | "fix_conversion_first"
  | "fix_delivery_capacity_first"
  | "needs_strategy_review"
  | "insufficient_data";

export type CampaignConfidence = "low" | "medium" | "high";

export type CampaignBriefStatus =
  | "draft"
  | "needs_inputs"
  | "ready_for_generation"
  | "generated"
  | "in_review"
  | "approved"
  | "scheduled"
  | "posted"
  | "paused"
  | "completed"
  | "rejected"
  | "archived";

export type CampaignPublishingStatus =
  | "manual_only"
  | "connector_planned"
  | "connector_configured_not_synced"
  | "ready_for_manual_post"
  | "ready_for_scheduling_when_connector_exists"
  | "scheduled"
  | "posted_manually"
  | "posted_via_integration"
  | "failed_needs_attention";

export type CampaignAssetType =
  | "social_post"
  | "ad_copy"
  | "email"
  | "follow_up"
  | "landing_page_section"
  | "image_prompt"
  | "image_asset"
  | "carousel"
  | "story_graphic"
  | "campaign_calendar"
  | "sequence"
  | "report_export";

export type CampaignSafetyStatus = "passed" | "needs_review" | "blocked";
export type CampaignApprovalStatus =
  | "draft"
  | "needs_review"
  | "approved"
  | "rejected"
  | "archived";

export type CampaignPerformanceSource =
  | "manual"
  | "GA4"
  | "platform_import"
  | "demo"
  | "unavailable";

export type CampaignConnectionStatus =
  | "not_configured"
  | "manual_export_supported"
  | "setup_requested"
  | "connector_configured_not_synced"
  | "verified_live"
  | "sync_success"
  | "sync_failed"
  | "demo_only";

export type CampaignScopeMode = "full_rgs_client" | "standalone_gig" | "demo_test";
export type CampaignWorkspaceScope = "customer" | "rgs_internal";

export type CampaignChannel =
  | "google_ads"
  | "meta_ads"
  | "seo"
  | "referrals"
  | "email"
  | "organic_social"
  | "linkedin"
  | "direct_mail"
  | "events"
  | "partnerships"
  | "reddit_manual"
  | "other";

export type CampaignGearKey =
  | "demand_generation"
  | "revenue_conversion"
  | "operational_efficiency"
  | "financial_visibility"
  | "owner_independence";

export type CampaignGearScores = Partial<Record<CampaignGearKey, number>>;

export interface CampaignProfile {
  id?: string;
  customer_id?: string | null;
  workspace_scope?: CampaignWorkspaceScope;
  rgs_workspace_key?: string | null;
  industry?: string | null;
  location_market_area?: string | null;
  business_stage?: string | null;
  primary_offers?: string[];
  target_audiences?: string[];
  buyer_persona_refs?: string[];
  swot_refs?: string[];
  diagnostic_refs?: string[];
  repair_map_refs?: string[];
  implementation_refs?: string[];
  control_system_refs?: string[];
  brand_voice_notes?: string | null;
  forbidden_claims?: string[];
  preferred_cta_types?: string[];
  channel_preferences?: CampaignChannel[];
  channel_restrictions?: string[];
  readiness_status?: CampaignReadinessStatus;
  missing_inputs?: string[];
  scope_mode?: CampaignScopeMode;
}

export interface CampaignBrief {
  id?: string;
  customer_id?: string | null;
  workspace_scope?: CampaignWorkspaceScope;
  rgs_workspace_key?: string | null;
  campaign_profile_id?: string | null;
  objective: string;
  target_audience: string;
  offer_service_line: string;
  channel_platform: CampaignChannel | string;
  campaign_type: string;
  funnel_stage: string;
  cta: string;
  timing_recommendation?: string | null;
  manual_budget?: string | null;
  capacity_readiness_check?: string | null;
  operational_risk_warning?: string | null;
  evidence_confidence?: CampaignConfidence;
  missing_inputs?: string[];
  client_safe_notes?: string | null;
  admin_notes?: string | null;
  status?: CampaignBriefStatus;
  publishing_status?: CampaignPublishingStatus;
}

export interface CampaignPerformancePoint {
  customer_id?: string | null;
  workspace_scope?: CampaignWorkspaceScope;
  rgs_workspace_key?: string | null;
  platform_channel: CampaignChannel | string;
  connection_proof_id?: string | null;
  impressions?: number | null;
  reach?: number | null;
  clicks?: number | null;
  ctr?: number | null;
  landing_page_visits?: number | null;
  scorecard_starts?: number | null;
  scorecard_completions?: number | null;
  diagnostic_inquiries?: number | null;
  conversions_leads?: number | null;
  cost?: number | null;
  confidence_level?: CampaignConfidence;
  data_source?: CampaignPerformanceSource;
  notes?: string | null;
}

export interface CampaignConnectionProof {
  id?: string;
  customer_id?: string | null;
  workspace_scope?: CampaignWorkspaceScope;
  rgs_workspace_key?: string | null;
  provider: string;
  capability: "analytics" | "social_posting" | "ad_platform" | "crm" | "manual_import";
  status: CampaignConnectionStatus;
  proof_label: string;
  proof_source?: string | null;
  integration_id?: string | null;
  last_verified_at?: string | null;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  verified_by?: string | null;
  client_safe_summary?: string | null;
  admin_only_notes?: string | null;
}

export interface CampaignSignalInput {
  customer: {
    id?: string;
    business_name?: string | null;
    industry?: string | null;
    lifecycle_state?: string | null;
    account_kind?: string | null;
    is_demo_account?: boolean | null;
    needs_industry_review?: boolean | null;
  };
  profile?: CampaignProfile | null;
  scorecard?: {
    total_score?: number | null;
    gear_scores?: CampaignGearScores;
    strongest_gear?: CampaignGearKey | null;
    slipping_gear?: CampaignGearKey | null;
    confidence?: CampaignConfidence | null;
  } | null;
  diagnostic_findings?: Array<{
    gear: CampaignGearKey;
    severity?: "critical" | "high" | "medium" | "low";
    summary: string;
    evidence_confidence?: CampaignConfidence;
  }>;
  repair_map_priorities?: Array<{
    gear?: CampaignGearKey;
    title: string;
    status?: string;
    priority_score?: number;
  }>;
  implementation_status?: {
    active?: boolean;
    blocked?: boolean;
    blocker_summary?: string | null;
    capacity_notes?: string | null;
  } | null;
  control_system_signals?: Array<{
    label: string;
    gear?: CampaignGearKey;
    status?: string;
    client_safe_summary?: string;
  }>;
  channel_readiness?: Array<{
    channel: CampaignChannel | string;
    status: "ready" | "needs_setup" | "manual_only" | "blocked" | "unknown";
    notes?: string | null;
    connection_proof_id?: string | null;
  }>;
  connection_proofs?: CampaignConnectionProof[];
  swot_signals?: Array<{
    signal_type:
      | "campaign_input"
      | "buyer_persona_input"
      | "demand_opportunity"
      | "conversion_risk"
      | string;
    gear?: CampaignGearKey | "multiple" | null;
    summary: string;
    confidence?: "verified" | "partially_supported" | "owner_claim_only" | "assumption" | "missing_evidence" | CampaignConfidence;
    client_safe?: boolean;
  }>;
  prior_performance?: CampaignPerformancePoint[];
  offer_lines?: string[];
  target_audiences?: string[];
  brand_constraints?: string[];
  missing_data?: string[];
}

export interface CampaignRecommendation {
  recommended_objective: string;
  recommended_audience: string;
  recommended_offer_service_line: string;
  recommended_platform_channel: CampaignChannel | string;
  recommended_cta: string;
  recommended_timing: string;
  recommended_creative_angle: string;
  readiness_classification: CampaignReadinessStatus;
  demand_generation_fit: string;
  revenue_conversion_risk: string;
  operational_capacity_risk: string;
  financial_visibility_caution: string;
  owner_independence_caution: string;
  do_not_market_yet_warning: string | null;
  missing_inputs: string[];
  confidence_level: CampaignConfidence;
  client_safe_explanation: string;
  admin_only_explanation: string;
  recommended_next_workflow: string;
  support_scope: "included_support" | "implementation_work" | "reengagement_required" | "standalone_gig_ready";
  publishing_readiness: CampaignPublishingStatus;
}

export interface CampaignAssetDraft {
  asset_type: CampaignAssetType;
  platform: string;
  title: string;
  draft_content: string;
  client_safe_explanation: string;
  admin_only_rationale: string;
  safety_status: CampaignSafetyStatus;
  approval_status: CampaignApprovalStatus;
  manual_posting_instructions: string;
  ai_assisted: boolean;
}
