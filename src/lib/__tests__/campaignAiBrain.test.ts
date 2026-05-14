import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_AI_ALLOWED_ACTIONS,
  CAMPAIGN_AI_FORBIDDEN_ACTIONS,
  CAMPAIGN_AI_OUTPUT_SCHEMA,
  CAMPAIGN_AI_SYSTEM_PROMPT,
  buildCampaignAiPrompt,
  hasCampaignBrainBoundary,
} from "@/lib/campaignControl/campaignAiBrain";

describe("Campaign AI brain contract", () => {
  it("declares allowed campaign draft actions", () => {
    expect(CAMPAIGN_AI_ALLOWED_ACTIONS).toContain("draft social posts");
    expect(CAMPAIGN_AI_ALLOWED_ACTIONS).toContain("summarize performance");
    expect(CAMPAIGN_AI_ALLOWED_ACTIONS).toContain("identify missing inputs");
  });

  it("forbids outcome promises, fake proof, cross-customer leakage, and auto-publishing", () => {
    const text = CAMPAIGN_AI_FORBIDDEN_ACTIONS.join("\n");
    expect(text).toMatch(/revenue/);
    expect(text).toMatch(/fake/);
    expect(text).toMatch(/cross-customer/);
    expect(text).toMatch(/post automatically/);
  });

  it("requires structured output fields", () => {
    expect(CAMPAIGN_AI_OUTPUT_SCHEMA.requiredFields).toContain("assets");
    expect(CAMPAIGN_AI_OUTPUT_SCHEMA.requiredFields).toContain("admin_only_rationale");
    expect(CAMPAIGN_AI_OUTPUT_SCHEMA.assetFields).toContain("manual_posting_instructions");
  });

  it("locks source-of-truth, approval, and tenant boundaries into the system prompt", () => {
    expect(hasCampaignBrainBoundary(CAMPAIGN_AI_SYSTEM_PROMPT)).toBe(true);
    expect(CAMPAIGN_AI_SYSTEM_PROMPT).toMatch(/No promises of revenue/);
    expect(CAMPAIGN_AI_SYSTEM_PROMPT).toMatch(/No automatic posting/);
  });

  it("builds a prompt without flattening customer context", () => {
    const prompt = buildCampaignAiPrompt({ customer: { business_name: "Demo" }, scorecard: { total_score: 620 } });
    expect(prompt).toMatch(/Campaign request JSON/);
    expect(prompt).toMatch(/Demo/);
    expect(prompt).toMatch(/620/);
  });
});
