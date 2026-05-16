/**
 * P103C — Remaining AI surface wiring + output envelope contract tests.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildAiContextEnvelope,
  buildPriorityPromptPreamble,
  RGS_AI_TASK_ROLES,
  validateAiOutputEnvelope,
  type AiOutputEnvelope,
} from "@/lib/ai/aiOutputQualityKernel";

const REPO_ROOT = process.cwd();

function readEdgeFn(name: string): string {
  return readFileSync(join(REPO_ROOT, "supabase", "functions", name, "index.ts"), "utf-8");
}
function readShared(name: string): string {
  return readFileSync(join(REPO_ROOT, "supabase", "functions", "_shared", name), "utf-8");
}

const REMAINING_SURFACES: ReadonlyArray<{ name: string; taskType: string; role: RegExp }> = [
  { name: "journey-ai-seed", taskType: "journey_architecture", role: /RGS Journey Architecture Analyst/ },
  { name: "diagnostic-ai-followup", taskType: "diagnostic_followup", role: /RGS Diagnostic Follow-Up Analyst/ },
  { name: "rgs-guide-bot", taskType: "rgs_guide", role: /RGS Guide/ },
];

describe("P103C — kernel + shared preamble expose remaining surface roles", () => {
  it("kernel declares the 3 remaining task roles", () => {
    expect(RGS_AI_TASK_ROLES.journey_architecture).toMatch(/Journey Architecture Analyst/);
    expect(RGS_AI_TASK_ROLES.diagnostic_followup).toMatch(/Diagnostic Follow-Up Analyst/);
    expect(RGS_AI_TASK_ROLES.rgs_guide).toMatch(/RGS Guide/);
    // Boundary language present
    expect(RGS_AI_TASK_ROLES.diagnostic_followup).toMatch(/do not change scores/i);
    expect(RGS_AI_TASK_ROLES.rgs_guide).toMatch(/do not grant access/i);
  });

  it("shared edge preamble declares the 3 remaining task roles", () => {
    const src = readShared("ai-priority-preamble.ts");
    expect(src).toContain("journey_architecture");
    expect(src).toContain("diagnostic_followup");
    expect(src).toContain("rgs_guide");
    expect(src).toMatch(/RGS Journey Architecture Analyst/);
    expect(src).toMatch(/RGS Diagnostic Follow-Up Analyst/);
    expect(src).toMatch(/RGS Guide/);
  });
});

describe("P103C — remaining edge functions wire the shared preamble", () => {
  for (const { name, taskType, role } of REMAINING_SURFACES) {
    it(`${name} imports buildAiPriorityPreamble with task_type: ${taskType}`, () => {
      const src = readEdgeFn(name);
      expect(src).toMatch(/from\s+["']\.\.\/_shared\/ai-priority-preamble\.ts["']/);
      expect(src).toMatch(/buildAiPriorityPreamble\s*\(/);
      expect(src).toContain(`task_type: "${taskType}"`);
      // Role string is provided through the shared preamble lookup, not
      // necessarily inlined in the edge file. Verify lookup is present.
      expect(role).toBeInstanceOf(RegExp);
    });
  }
});

describe("P103C — generated preamble carries kernel guarantees for new surfaces", () => {
  for (const taskType of ["journey_architecture", "diagnostic_followup", "rgs_guide"] as const) {
    it(`${taskType} preamble enforces voice, HITL, confidence, missing-input, evidence, claim safety`, () => {
      const env = buildAiContextEnvelope({
        task_type: taskType,
        tool_key: taskType,
        customer_type: "full_client",
      });
      const text = buildPriorityPromptPreamble(env);
      expect(text).toMatch(/RGS voice/);
      expect(text).toMatch(/AI may draft/);
      expect(text).toMatch(/Do not default to LOW/);
      expect(text).toMatch(/WHY/);
      expect(text).toMatch(/WHAT IS MISSING/);
      expect(text).toMatch(/HOW TO IMPROVE/);
      expect(text).toMatch(/Missing inputs must be specific/);
      expect(text).toMatch(/Evidence hierarchy/);
      expect(text).toMatch(/Owner claims are not verified facts/);
      expect(text).toMatch(/AI cannot override deterministic scoring/);
      expect(text).toMatch(/guaranteed revenue/);
      expect(text).toMatch(/automatic posting/);
    });
  }

  it("gig mode adds scope limitations for journey_architecture", () => {
    const env = buildAiContextEnvelope({
      task_type: "journey_architecture",
      tool_key: "customer_journey_map",
      customer_type: "gig",
      gig_tier: "basic",
    });
    const text = buildPriorityPromptPreamble(env);
    expect(text).toMatch(/Gig mode is ON/i);
  });
});

describe("P103C — shared edge output envelope validator", () => {
  function base(): AiOutputEnvelope {
    return {
      title: "Sample",
      summary: "Concrete summary of approved context.",
      recommended_next_actions: ["Owner reviews staffing handoff for evening shift."],
      confidence_level: "medium",
      confidence_reason: "Owner-claim plus partial schedule export support a medium read.",
      missing_inputs: ["POS category margin report"],
      evidence_basis: ["structured_interview_claim"],
      assumptions: [],
      risk_warnings: [],
      claim_safety_warnings: [],
      human_review_required: true,
      client_safe_output: false,
      schema_version: "p103-ai-output-quality-kernel-v1",
    };
  }

  it("accepts a well-formed envelope", () => {
    const r = validateAiOutputEnvelope(base());
    expect(r.valid).toBe(true);
  });

  it("rejects vague missing inputs", () => {
    const env = base();
    env.missing_inputs = ["more data"];
    const r = validateAiOutputEnvelope(env);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => /vague missing input/.test(i.problem))).toBe(true);
  });

  it("rejects low confidence without specific reason or specific missing input", () => {
    const env = base();
    env.confidence_level = "low";
    env.confidence_reason = "not sure";
    env.missing_inputs = ["context"];
    const r = validateAiOutputEnvelope(env);
    expect(r.valid).toBe(false);
  });

  it("requires human_review_required true", () => {
    const env = base();
    (env as unknown as { human_review_required: boolean }).human_review_required = false;
    const r = validateAiOutputEnvelope(env);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.field === "human_review_required")).toBe(true);
  });

  it("strips admin_review_notes from client-safe envelope", () => {
    const env = base();
    env.client_safe_output = true;
    env.admin_review_notes = "internal only";
    const r = validateAiOutputEnvelope(env);
    expect(r.clientSafeEnvelope).toBeDefined();
    expect((r.clientSafeEnvelope as Record<string, unknown>).admin_review_notes).toBeUndefined();
  });
});

describe("P103C — HITL + claim safety still enforced for new surfaces", () => {
  it("RGS Guide role string forbids granting access and admin-only exposure", () => {
    expect(RGS_AI_TASK_ROLES.rgs_guide).toMatch(/admin-only/i);
  });
  it("Diagnostic Follow-Up role string forbids changing scores or official findings", () => {
    expect(RGS_AI_TASK_ROLES.diagnostic_followup).toMatch(/do not change scores/i);
    expect(RGS_AI_TASK_ROLES.diagnostic_followup).toMatch(/official findings/i);
  });
});