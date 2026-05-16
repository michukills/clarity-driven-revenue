/**
 * P103B — Priority AI Brain Wiring contract tests.
 *
 * Verifies that the priority AI surfaces invoke the P103 kernel
 * preamble (either via the client-side `buildPriorityPromptPreamble`
 * or via the edge-function mirror `buildAiPriorityPreamble`), and
 * that the resulting prompts include task role, RGS voice notice,
 * HITL boundary, confidence rules, specific missing-input rule,
 * evidence hierarchy, and claim-safety guidance.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildCampaignAiPrompt } from "@/lib/campaignControl/campaignAiBrain";
import { buildCampaignVideoAiPreamble } from "@/lib/campaignControl/campaignVideoBrain";
import { buildSwotAiPrompt } from "@/lib/swot/swotAiBrain";
import {
  buildAiContextEnvelope,
  buildPriorityPromptPreamble,
} from "@/lib/ai/aiOutputQualityKernel";

const REPO_ROOT = process.cwd();

function readEdgeFn(name: string): string {
  return readFileSync(
    join(REPO_ROOT, "supabase", "functions", name, "index.ts"),
    "utf-8",
  );
}

function readSharedPreamble(): string {
  return readFileSync(
    join(REPO_ROOT, "supabase", "functions", "_shared", "ai-priority-preamble.ts"),
    "utf-8",
  );
}

const PRIORITY_EDGE_FUNCTIONS: ReadonlyArray<{ name: string; taskType: string }> = [
  { name: "generate-campaign-assets", taskType: "campaign_brief" },
  { name: "persona-ai-seed", taskType: "buyer_persona_icp" },
  { name: "sop-ai-assist", taskType: "sop_training_bible" },
  { name: "client-sop-ai-assist", taskType: "sop_training_bible" },
  { name: "process-ai-seed", taskType: "workflow_process_mapping" },
  { name: "report-ai-assist", taskType: "tool_report_draft" },
];

describe("P103B — shared edge preamble mirrors P103 kernel", () => {
  it("declares all priority task roles", () => {
    const src = readSharedPreamble();
    for (const t of [
      "tool_report_draft",
      "sop_training_bible",
      "buyer_persona_icp",
      "swot_strategic_matrix",
      "campaign_brief",
      "campaign_video_plan",
      "workflow_process_mapping",
    ]) {
      expect(src).toContain(t);
    }
  });

  it("includes RGS voice, HITL, confidence, missing-input, evidence hierarchy, and claim-safety language", () => {
    const src = readSharedPreamble();
    expect(src).toMatch(/RGS voice/);
    expect(src).toMatch(/AI may draft/);
    expect(src).toMatch(/Do not default to LOW/);
    expect(src).toMatch(/Missing inputs must be specific/);
    expect(src).toMatch(/Evidence hierarchy/);
    expect(src).toMatch(/Owner claims are not verified facts/);
    expect(src).toMatch(/AI cannot override deterministic scoring/);
    expect(src).toMatch(/guaranteed revenue/);
    expect(src).toMatch(/automatic posting/);
  });
});

describe("P103B — priority edge functions wire the shared preamble", () => {
  for (const { name, taskType } of PRIORITY_EDGE_FUNCTIONS) {
    it(`${name} imports buildAiPriorityPreamble and uses task_type: ${taskType}`, () => {
      const src = readEdgeFn(name);
      expect(src).toMatch(
        /from\s+["']\.\.\/_shared\/ai-priority-preamble\.ts["']/,
      );
      expect(src).toMatch(/buildAiPriorityPreamble\s*\(/);
      expect(src).toContain(`task_type: "${taskType}"`);
    });
  }
});

describe("P103B — client-side priority brains use the P103 kernel preamble", () => {
  it("campaignAiBrain prepends the campaign_brief preamble", () => {
    const prompt = buildCampaignAiPrompt({ customer: { business_name: "Demo" } });
    expect(prompt).toMatch(/RGS Campaign Strategy Director/);
    expect(prompt).toMatch(/Do not default to LOW/);
    expect(prompt).toMatch(/Missing inputs must be specific/);
    expect(prompt).toMatch(/AI may draft/);
    expect(prompt).toMatch(/Demo/);
  });

  it("swot brain exposes a wired preamble using the strategic-pattern role", () => {
    const prompt = buildSwotAiPrompt();
    expect(prompt).toMatch(/RGS Strategic Pattern Analyst/);
    expect(prompt).toMatch(/Evidence hierarchy/);
    expect(prompt).toMatch(/AI cannot override deterministic scoring/);
  });

  it("campaign video brain exposes a wired preamble using the producer role", () => {
    const preamble = buildCampaignVideoAiPreamble();
    expect(preamble).toMatch(/RGS Campaign Video Producer/);
    expect(preamble).toMatch(/Do not claim rendering/);
    expect(preamble).toMatch(/Confidence rules/);
  });
});

describe("P103B — kernel preamble does not default to LOW confidence", () => {
  it("includes explicit non-LOW-by-default instruction with WHY/WHAT IS MISSING/HOW TO IMPROVE", () => {
    const env = buildAiContextEnvelope({
      task_type: "tool_report_draft",
      tool_key: "tool_report_draft",
      customer_type: "full_client",
    });
    const text = buildPriorityPromptPreamble(env);
    expect(text).toMatch(/Do not default to LOW/);
    expect(text).toMatch(/WHY/);
    expect(text).toMatch(/WHAT IS MISSING/);
    expect(text).toMatch(/HOW TO IMPROVE/);
  });

  it("encodes gig scope when customer_type is gig", () => {
    const env = buildAiContextEnvelope({
      task_type: "sop_training_bible",
      tool_key: "sop_training_bible",
      customer_type: "gig",
      gig_tier: "basic",
    });
    const text = buildPriorityPromptPreamble(env);
    expect(text).toMatch(/Gig mode is ON/i);
  });
});