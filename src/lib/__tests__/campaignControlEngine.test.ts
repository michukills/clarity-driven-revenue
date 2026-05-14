import { describe, expect, it } from "vitest";
import {
  buildCampaignRecommendation,
  connectionProofSummary,
  hasProvenCampaignConnection,
} from "@/lib/campaignControl/campaignControlEngine";
import type { CampaignSignalInput } from "@/lib/campaignControl/types";

const base: CampaignSignalInput = {
  customer: {
    id: "customer-1",
    business_name: "Demo HVAC",
    industry: "trade_field_service",
    lifecycle_state: "implementation",
  },
  profile: {
    customer_id: "customer-1",
    industry: "trade_field_service",
    primary_offers: ["Maintenance plan"],
    target_audiences: ["Homeowners with aging HVAC systems"],
    brand_voice_notes: "Plain, helpful, local.",
    channel_preferences: ["organic_social", "email"],
    scope_mode: "full_rgs_client",
  },
  scorecard: {
    gear_scores: {
      demand_generation: 60,
      revenue_conversion: 165,
      operational_efficiency: 150,
      financial_visibility: 145,
      owner_independence: 120,
    },
    slipping_gear: "demand_generation",
    confidence: "high",
  },
  channel_readiness: [{ channel: "organic_social", status: "manual_only" }],
};

describe("Campaign Control engine", () => {
  it("recommends marketable demand work when demand is weak and conversion/capacity are stable", () => {
    const rec = buildCampaignRecommendation(base);
    expect(rec.readiness_classification).toBe("ready_to_market");
    expect(rec.recommended_audience).toContain("Homeowners");
    expect(rec.recommended_offer_service_line).toBe("Maintenance plan");
    expect(rec.recommended_cta).toMatch(/Scorecard|fit/i);
    expect(rec.admin_only_explanation).toMatch(/Deterministic Scorecard/);
  });

  it("blocks demand expansion when Revenue Conversion is weak", () => {
    const rec = buildCampaignRecommendation({
      ...base,
      scorecard: {
        ...base.scorecard,
        gear_scores: { ...base.scorecard!.gear_scores, revenue_conversion: 45 },
        slipping_gear: "revenue_conversion",
      },
    });
    expect(rec.readiness_classification).toBe("fix_conversion_first");
    expect(rec.do_not_market_yet_warning).toMatch(/conversion/i);
    expect(rec.revenue_conversion_risk).toMatch(/More traffic/i);
  });

  it("cautions against high-volume campaigns when delivery capacity is weak", () => {
    const rec = buildCampaignRecommendation({
      ...base,
      scorecard: {
        ...base.scorecard,
        gear_scores: { ...base.scorecard!.gear_scores, operational_efficiency: 55 },
        slipping_gear: "operational_efficiency",
      },
    });
    expect(rec.readiness_classification).toBe("fix_delivery_capacity_first");
    expect(rec.operational_capacity_risk).toMatch(/high-volume/i);
  });

  it("lowers confidence when core campaign inputs are missing", () => {
    const rec = buildCampaignRecommendation({
      customer: { id: "customer-2", business_name: "Thin Context" },
    });
    expect(rec.readiness_classification).toBe("insufficient_data");
    expect(rec.confidence_level).toBe("low");
    expect(rec.missing_inputs).toContain("Campaign profile");
  });

  it("requires proof before treating analytics or posting as connected", () => {
    expect(hasProvenCampaignConnection([], "analytics")).toBe(false);
    expect(
      hasProvenCampaignConnection(
        [
          {
            customer_id: "customer-1",
            provider: "ga4",
            capability: "analytics",
            status: "verified_live",
            proof_label: "GA4 property verified",
            last_verified_at: "2026-05-14T12:00:00Z",
          },
        ],
        "analytics",
      ),
    ).toBe(true);
    const summary = connectionProofSummary(base);
    expect(summary.analyticsProven).toBe(false);
    expect(summary.summary).toMatch(/manual performance entry/i);
  });

  it("uses approved SWOT campaign and persona signals as recommendation support without recalculating scores", () => {
    const rec = buildCampaignRecommendation({
      ...base,
      profile: {
        ...base.profile!,
        target_audiences: [],
      },
      target_audiences: [],
      swot_signals: [
        {
          signal_type: "buyer_persona_input",
          summary: "Owners of multi-truck service businesses who are losing follow-up visibility",
          gear: "revenue_conversion",
          confidence: "partially_supported",
          client_safe: true,
        },
        {
          signal_type: "campaign_input",
          summary: "Follow-up gaps are creating missed estimates and unclear callbacks",
          gear: "revenue_conversion",
          confidence: "partially_supported",
          client_safe: true,
        },
      ],
    });

    expect(rec.recommended_audience).toContain("multi-truck service businesses");
    expect(rec.recommended_creative_angle).toContain("Follow-up gaps");
    expect(rec.admin_only_explanation).toMatch(/Approved SWOT support/);
    expect(rec.admin_only_explanation).toMatch(/Deterministic Scorecard/);
  });
});
