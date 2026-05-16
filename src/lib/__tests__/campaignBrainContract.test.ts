import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_BRAIN_CONTRACT_VERSION,
  CampaignBrainInputSchema,
  CampaignBrainOutputSchema,
  buildMissingInputQuestions,
  decideConfidence,
  evaluateCampaignBrain,
} from "@/lib/campaignControl/campaignBrainContract";
import { checkCampaignSafety } from "@/lib/campaignControl/campaignSafety";

const baseInput = {
  customer: { id: "c1", business_name: "Demo", industry: "trades" },
  objective: "Drive maintenance plan inquiries",
  approved_signals: [
    { signal_type: "scorecard", summary: "demand gear weak", approved: true },
    { signal_type: "diagnostic", summary: "intake gap", approved: true },
  ],
  approved_persona: { name: "Repeat homeowner", summary: "owns home 5+ yrs" },
  approved_proof: [{ label: "Verified review batch", verified: true, source: "internal" }],
  scorecard: { total_score: 620, confidence: "medium" as const },
  diagnostic_refs: ["d1"],
  repair_map_refs: [],
  channel_preferences: ["email"],
  missing_context: [],
  raw_copy_to_check: "Test a clearer maintenance-plan message and learn which prospects respond.",
};

describe("Campaign Brain contract", () => {
  it("parses valid input via Zod input schema", () => {
    const parsed = CampaignBrainInputSchema.parse(baseInput);
    expect(parsed.objective).toBe("Drive maintenance plan inquiries");
    expect(parsed.approved_signals.length).toBe(2);
  });

  it("produces output that validates against Zod output schema", () => {
    const out = evaluateCampaignBrain(baseInput);
    expect(CampaignBrainOutputSchema.parse(out)).toBeTruthy();
    expect(out.contract_version).toBe(CAMPAIGN_BRAIN_CONTRACT_VERSION);
    expect(out.approval_required).toBe(true);
  });

  it("returns high confidence when approved signals/persona/proof are strong and safety is clean", () => {
    const out = evaluateCampaignBrain(baseInput);
    expect(out.confidence_label).toBe("high");
    expect(out.next_best_action).toBe("draft_assets");
  });

  it("returns medium when inputs are partial but usable", () => {
    const out = evaluateCampaignBrain({
      ...baseInput,
      approved_proof: [],
    });
    expect(out.confidence_label).toBe("medium");
  });

  it("returns low only when core context is genuinely missing", () => {
    const out = evaluateCampaignBrain({
      ...baseInput,
      objective: "",
      approved_signals: [],
      approved_persona: null,
      missing_context: ["no scorecard", "no diagnostic"],
    });
    expect(out.confidence_label).toBe("low");
    expect(out.next_best_action).toBe("request_more_inputs");
  });

  it("does not default to low when context is partial", () => {
    const parsed = CampaignBrainInputSchema.parse({
      ...baseInput,
      approved_proof: [],
      missing_context: [],
    });
    const safety = checkCampaignSafety("Operational test message.");
    expect(decideConfidence(parsed, safety).label).not.toBe("low");
  });

  it("generates missing-input questions when approved signals/persona/proof are absent", () => {
    const parsed = CampaignBrainInputSchema.parse({
      ...baseInput,
      objective: "",
      approved_signals: [],
      approved_persona: null,
      approved_proof: [],
    });
    const qs = buildMissingInputQuestions(parsed);
    expect(qs.some((q) => /approved campaign signals/i.test(q))).toBe(true);
    expect(qs.some((q) => /approved buyer persona/i.test(q))).toBe(true);
    expect(qs.some((q) => /verified.*proof/i.test(q))).toBe(true);
    expect(qs.some((q) => /business objective/i.test(q))).toBe(true);
  });

  it("supports missing_context passthrough", () => {
    const out = evaluateCampaignBrain({ ...baseInput, missing_context: ["industry not confirmed"] });
    expect(out.missing_context).toContain("industry not confirmed");
    expect(out.missing_input_questions.some((q) => /industry not confirmed/.test(q))).toBe(true);
  });

  it("flags hardened claim phrases via safety checker", () => {
    const phrases = [
      "This campaign is viral-ready and will outperform guaranteed competitors.",
      "Copy that will convert every visitor.",
      "platform-approved system for guaranteed growth.",
      "Get guaranteed revenue and guaranteed ROI with guaranteed leads.",
      "Includes fake testimonials and fake proof of results.",
    ];
    for (const p of phrases) {
      const r = checkCampaignSafety(p);
      expect(r.status).not.toBe("passed");
    }
  });

  it("downgrades to low and reworks for safety when copy is blocked", () => {
    const out = evaluateCampaignBrain({
      ...baseInput,
      raw_copy_to_check: "Guaranteed revenue and viral-ready growth.",
    });
    expect(out.safety_status).toBe("blocked");
    expect(out.confidence_label).toBe("low");
    expect(out.next_best_action).toBe("rework_for_safety");
  });
});
