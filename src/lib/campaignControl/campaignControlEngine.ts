import type {
  CampaignBrief,
  CampaignChannel,
  CampaignConfidence,
  CampaignConnectionProof,
  CampaignGearKey,
  CampaignRecommendation,
  CampaignReadinessStatus,
  CampaignSignalInput,
} from "./types";

const GEAR_LABEL: Record<CampaignGearKey, string> = {
  demand_generation: "Demand Generation",
  revenue_conversion: "Revenue Conversion",
  operational_efficiency: "Operational Efficiency",
  financial_visibility: "Financial Visibility",
  owner_independence: "Owner Independence",
};

const CHANNEL_LABEL: Record<CampaignChannel, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  seo: "SEO",
  referrals: "Referrals",
  email: "Email",
  organic_social: "Organic social",
  linkedin: "LinkedIn",
  direct_mail: "Direct mail",
  events: "Events",
  partnerships: "Partnerships",
  reddit_manual: "Reddit draft/manual only",
  other: "Other",
};

function scoreBand(score: number | null | undefined): "low" | "medium" | "high" | "unknown" {
  if (typeof score !== "number") return "unknown";
  if (score < 80) return "low";
  if (score < 140) return "medium";
  return "high";
}

function lowGear(input: CampaignSignalInput, gear: CampaignGearKey): boolean {
  return scoreBand(input.scorecard?.gear_scores?.[gear]) === "low";
}

function hasMissingCore(input: CampaignSignalInput): boolean {
  const profile = input.profile;
  const offers = profile?.primary_offers?.length || input.offer_lines?.length;
  const audiences = profile?.target_audiences?.length || input.target_audiences?.length;
  return !profile || !offers || !audiences || !profile.industry;
}

function confidenceFor(input: CampaignSignalInput, readiness: CampaignReadinessStatus): CampaignConfidence {
  const missing = collectMissingInputs(input);
  if (readiness === "insufficient_data" || missing.length >= 4) return "low";
  if (input.scorecard?.confidence === "high" && missing.length <= 1) return "high";
  if ((input.diagnostic_findings?.length ?? 0) > 0 && missing.length <= 2) return "medium";
  return missing.length === 0 ? "medium" : "low";
}

function collectMissingInputs(input: CampaignSignalInput): string[] {
  const out = new Set<string>(input.missing_data ?? []);
  const profile = input.profile;
  if (!profile) out.add("Campaign profile");
  if (!profile?.industry && !input.customer.industry) out.add("Confirmed industry");
  if (!(profile?.primary_offers?.length || input.offer_lines?.length)) out.add("Primary offer or service line");
  if (!(profile?.target_audiences?.length || input.target_audiences?.length)) out.add("Target audience or ICP");
  if (!profile?.brand_voice_notes) out.add("Brand voice notes");
  if (!(input.channel_readiness?.length || profile?.channel_preferences?.length)) out.add("Channel readiness");
  if (!input.scorecard?.gear_scores) out.add("Scorecard or Diagnostic signal");
  if (!(input.prior_performance?.length)) out.add("Prior campaign performance");
  return Array.from(out);
}

function chooseChannel(input: CampaignSignalInput, readiness: CampaignReadinessStatus): CampaignChannel {
  const ready = input.channel_readiness?.find((c) => c.status === "ready" || c.status === "manual_only");
  if (ready?.channel) return ready.channel as CampaignChannel;
  const preferred = input.profile?.channel_preferences?.[0];
  if (preferred) return preferred;
  if (readiness === "fix_delivery_capacity_first") return "email";
  if (readiness === "fix_conversion_first") return "email";
  return "organic_social";
}

export function hasProvenCampaignConnection(
  proofs: ReadonlyArray<CampaignConnectionProof> | undefined,
  capability: CampaignConnectionProof["capability"],
): boolean {
  return !!proofs?.some(
    (p) =>
      p.capability === capability &&
      (p.status === "verified_live" || p.status === "sync_success") &&
      !!(p.last_verified_at || p.last_sync_at),
  );
}

export function connectionProofSummary(input: CampaignSignalInput): {
  analyticsProven: boolean;
  postingProven: boolean;
  summary: string;
} {
  const analyticsProven = hasProvenCampaignConnection(input.connection_proofs, "analytics");
  const postingProven = hasProvenCampaignConnection(input.connection_proofs, "social_posting");
  return {
    analyticsProven,
    postingProven,
    summary: [
      analyticsProven
        ? "Analytics connection is proven for this customer."
        : "Analytics connection is not proven; use manual performance entry.",
      postingProven
        ? "Publishing connector is proven for this customer."
        : "Publishing connector is not proven; use manual posting.",
    ].join(" "),
  };
}

function chooseOffer(input: CampaignSignalInput): string {
  return (
    input.profile?.primary_offers?.[0] ??
    input.offer_lines?.[0] ??
    "the clearest offer the business can currently fulfill"
  );
}

function chooseAudience(input: CampaignSignalInput): string {
  return (
    input.profile?.target_audiences?.[0] ??
    input.target_audiences?.[0] ??
    "the best-fit buyer segment that still needs validation"
  );
}

function readinessFor(input: CampaignSignalInput): CampaignReadinessStatus {
  if (hasMissingCore(input)) return "insufficient_data";
  if (lowGear(input, "revenue_conversion")) return "fix_conversion_first";
  if (lowGear(input, "operational_efficiency")) return "fix_delivery_capacity_first";
  if (lowGear(input, "financial_visibility")) return "market_with_caution";
  if (lowGear(input, "owner_independence")) return "market_with_caution";
  if (input.implementation_status?.blocked) return "needs_strategy_review";
  if (lowGear(input, "demand_generation")) return "ready_to_market";
  return "market_with_caution";
}

function nextWorkflowFor(readiness: CampaignReadinessStatus): string {
  switch (readiness) {
    case "ready_to_market":
      return "Create campaign brief, generate draft assets, run safety review, approve, then post manually or schedule when a verified connector exists.";
    case "market_with_caution":
      return "Create a low-volume campaign brief with manual tracking and review operating strain before increasing demand.";
    case "fix_intake_first":
      return "Repair lead capture, intake, or handoff before increasing traffic.";
    case "fix_conversion_first":
      return "Tighten offer clarity, follow-up, and sales conversion before pushing more demand.";
    case "fix_delivery_capacity_first":
      return "Repair delivery capacity and handoffs before running a higher-volume campaign.";
    case "needs_strategy_review":
      return "Admin should review the campaign strategy against current Implementation and Control System blockers.";
    case "insufficient_data":
      return "Complete the minimum campaign profile inputs before generating assets.";
  }
}

function scopeFor(input: CampaignSignalInput): CampaignRecommendation["support_scope"] {
  if (input.profile?.scope_mode === "standalone_gig") return "standalone_gig_ready";
  if (input.implementation_status?.active) return "implementation_work";
  if (input.customer.lifecycle_state === "ongoing_support") return "included_support";
  return "reengagement_required";
}

export function buildCampaignRecommendation(input: CampaignSignalInput): CampaignRecommendation {
  const readiness = readinessFor(input);
  const confidence = confidenceFor(input, readiness);
  const missing = collectMissingInputs(input);
  const offer = chooseOffer(input);
  const audience = chooseAudience(input);
  const channel = chooseChannel(input, readiness);
  const slipping = input.scorecard?.slipping_gear;
  const slippingLabel = slipping ? GEAR_LABEL[slipping] : "the weakest current operating signal";
  const demandLow = lowGear(input, "demand_generation");
  const conversionLow = lowGear(input, "revenue_conversion");
  const opsLow = lowGear(input, "operational_efficiency");
  const financeLow = lowGear(input, "financial_visibility");
  const ownerLow = lowGear(input, "owner_independence");
  const doNot =
    readiness === "fix_conversion_first" || readiness === "fix_delivery_capacity_first" || readiness === "insufficient_data"
      ? `${nextWorkflowFor(readiness)} Campaign work can be drafted, but should not be approved for publishing until this is addressed.`
      : null;
  const connection = connectionProofSummary(input);

  return {
    recommended_objective: demandLow
      ? "Create clearer right-fit demand without increasing operational noise."
      : "Use a focused campaign to learn which buyer message deserves the next test.",
    recommended_audience: audience,
    recommended_offer_service_line: offer,
    recommended_platform_channel: channel,
    recommended_cta:
      readiness === "fix_conversion_first"
        ? "Request a fit review"
        : "Take the Business Stability Scorecard",
    recommended_timing:
      readiness === "ready_to_market"
        ? "Run the first reviewed test this week after approval."
        : "Draft now, then wait for admin approval after the readiness concern is addressed.",
    recommended_creative_angle:
      `Lead with ${slippingLabel}: show the owner what is slipping, why it matters, and the next practical step.`,
    readiness_classification: readiness,
    demand_generation_fit: demandLow
      ? "Demand Generation is the main campaign opportunity, but the message should stay narrow and measurable."
      : "Demand does not appear to be the only constraint; avoid adding traffic without checking conversion and capacity.",
    revenue_conversion_risk: conversionLow
      ? "Revenue Conversion is weak. More traffic may create more dropped follow-up or low-fit conversations."
      : "Revenue Conversion is not the primary caution from the available signals.",
    operational_capacity_risk: opsLow
      ? "Operational capacity is weak. A high-volume campaign may increase rework, delays, or owner intervention."
      : "No major delivery-capacity warning is visible from the current inputs.",
    financial_visibility_caution: financeLow
      ? "Financial visibility is weak. Avoid budget-heavy paid campaigns until spend and lead quality can be reviewed."
      : connection.analyticsProven
        ? "A proven analytics connection exists. Still review imported data before changing spend."
        : "Budget-heavy activity still needs manual tracking; no live analytics connector is proven.",
    owner_independence_caution: ownerLow
      ? "Owner dependence is high. More demand may increase the owner's bottleneck unless intake and delegation are clear."
      : "Owner dependence is not the main campaign blocker from the available inputs.",
    do_not_market_yet_warning: doNot,
    missing_inputs: missing,
    confidence_level: confidence,
    client_safe_explanation:
      "Campaign Control uses the strongest available business signals to decide what to market, who to target, what message to use, and when to run it. Recommendations are operational guidance, not promised outcomes.",
    admin_only_explanation:
      `Readiness=${readiness}; confidence=${confidence}; channel=${CHANNEL_LABEL[channel] ?? channel}; missing=${missing.join(", ") || "none"}. ${connection.summary} Deterministic Scorecard and Diagnostic signals were referenced but not recalculated.`,
    recommended_next_workflow: nextWorkflowFor(readiness),
    support_scope: scopeFor(input),
    publishing_readiness: connection.postingProven
      ? "ready_for_scheduling_when_connector_exists"
      : "manual_only",
  };
}

export function recommendationToBriefDraft(
  customerId: string | null,
  profileId: string | null,
  recommendation: CampaignRecommendation,
): CampaignBrief {
  return {
    customer_id: customerId,
    campaign_profile_id: profileId,
    objective: recommendation.recommended_objective,
    target_audience: recommendation.recommended_audience,
    offer_service_line: recommendation.recommended_offer_service_line,
    channel_platform: recommendation.recommended_platform_channel,
    campaign_type: "Focused operating-signal campaign",
    funnel_stage: "awareness_to_diagnostic_fit",
    cta: recommendation.recommended_cta,
    timing_recommendation: recommendation.recommended_timing,
    capacity_readiness_check: recommendation.operational_capacity_risk,
    operational_risk_warning: recommendation.do_not_market_yet_warning,
    evidence_confidence: recommendation.confidence_level,
    missing_inputs: recommendation.missing_inputs,
    client_safe_notes: recommendation.client_safe_explanation,
    admin_notes: recommendation.admin_only_explanation,
    status: recommendation.missing_inputs.length > 0 ? "needs_inputs" : "ready_for_generation",
    publishing_status: recommendation.publishing_readiness,
  };
}
