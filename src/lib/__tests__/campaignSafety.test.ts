import { describe, expect, it } from "vitest";
import { checkCampaignSafety } from "@/lib/campaignControl/campaignSafety";

describe("Campaign Control safety checker", () => {
  it("passes operational campaign guidance without guarantee claims", () => {
    const result = checkCampaignSafety(
      "Use this campaign to test a clearer maintenance-plan message and learn which right-fit prospects respond.",
    );
    expect(result.status).toBe("passed");
    expect(result.issues).toHaveLength(0);
  });

  it("blocks guaranteed revenue/profit/growth promises", () => {
    const result = checkCampaignSafety("This campaign will skyrocket growth and guarantee more revenue.");
    expect(result.status).toBe("blocked");
    expect(result.issues.map((i) => i.issue_type)).toContain("guaranteed_outcome");
  });

  it("blocks regulated legal/tax/compliance/valuation claims", () => {
    const result = checkCampaignSafety("This campaign is compliance approved and improves valuation.");
    expect(result.status).toBe("blocked");
    expect(result.issues.map((i) => i.issue_type)).toContain("regulated_claim");
  });

  it("flags fake proof and testimonials", () => {
    const result = checkCampaignSafety("Trusted by hundreds of owners with proven results and case studies.");
    expect(result.status).not.toBe("passed");
    expect(result.issues.some((i) => i.issue_type === "fake_proof")).toBe(true);
  });

  it("blocks cannabis compliance certification language while allowing operational visibility", () => {
    expect(checkCampaignSafety("Cannabis campaign guidance supports operational and documentation visibility.").status).toBe("passed");
    expect(checkCampaignSafety("Cannabis campaign is compliance certified for dispensaries.").status).toBe("blocked");
  });

  it("flags fake live integration and auto-post language", () => {
    const result = checkCampaignSafety("Auto-post this through live GA4 sync and automatic social posting.");
    expect(result.status).not.toBe("passed");
    expect(result.issues.some((i) => i.issue_type === "fake_integration")).toBe(true);
  });
});
