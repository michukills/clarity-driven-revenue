import { describe, expect, it } from "vitest";
import {
  AI_OUTPUT_QUALITY_KERNEL_VERSION,
} from "@/lib/ai/aiOutputQualityKernel";
import * as Kernel from "@/lib/ai/aiOutputQualityKernel";
import {
  HITL_BOUNDARY_NOTICE,
  HITL_FORBIDDEN_AI_ROLES,
  PRIORITY_BANNED_CLAIMS,
  RGS_AI_TASK_ROLES,
  RGS_BANNED_VOICE_PHRASES,
  buildAiContextEnvelope,
  buildPriorityPromptPreamble,
  confidenceFromEvidence,
  detectVoiceViolations,
  enforceClaimSafety,
  isHitlAllowed,
  isVagueMissingInput,
  tierToEvidenceQuality,
  validateAiOutputEnvelope,
  validateMissingInputs,
  type AiOutputEnvelope,
  type EvidenceTier,
  type RgsAiTaskType,
} from "@/lib/ai/aiOutputQualityKernel";

const PRIORITY_TASKS: RgsAiTaskType[] = [
  "tool_report_draft",
  "sop_training_bible",
  "buyer_persona_icp",
  "swot_strategic_matrix",
  "campaign_brief",
  "campaign_strategy",
  "campaign_video_plan",
  "workflow_process_mapping",
];

function envelope(over: Partial<AiOutputEnvelope> = {}): AiOutputEnvelope {
  return {
    title: "Draft Buyer Persona",
    summary: "Best-fit customer derived from approved offer and persona context.",
    recommended_next_actions: ["Confirm primary objection list with the owner."],
    confidence_level: "high",
    confidence_reason:
      "Owner-approved offer, prior SWOT, and Scorecard provide structured context.",
    missing_inputs: [],
    evidence_basis: ["verified_evidence", "admin_observed"],
    assumptions: [],
    risk_warnings: [],
    claim_safety_warnings: [],
    human_review_required: true,
    client_safe_output: false,
    schema_version: AI_OUTPUT_QUALITY_KERNEL_VERSION,
    ...over,
  };
}

describe("P103 AI Output Quality Kernel — task roles", () => {
  it("exports a specific role for every priority task", () => {
    for (const t of PRIORITY_TASKS) {
      expect(RGS_AI_TASK_ROLES[t]).toMatch(/^You are the RGS/);
      expect(RGS_AI_TASK_ROLES[t].length).toBeGreaterThan(40);
    }
  });

  it("never uses generic helpful-assistant role", () => {
    for (const t of PRIORITY_TASKS) {
      expect(RGS_AI_TASK_ROLES[t]).not.toMatch(/helpful\s+assistant/i);
    }
  });
});

describe("P103 — confidence behavior", () => {
  it("HIGH when structured + verified evidence + multiple approved signals", () => {
    const d = confidenceFromEvidence({
      evidence: ["verified_evidence", "admin_observed"],
      approvedSignalCount: 3,
      coreRequiredSatisfied: true,
    });
    expect(d.label).toBe("high");
  });

  it("MEDIUM when partial context but no verified proof", () => {
    const d = confidenceFromEvidence({
      evidence: ["structured_interview_claim"],
      approvedSignalCount: 1,
      coreRequiredSatisfied: true,
    });
    expect(d.label).toBe("medium");
    expect(d.improvementSuggestions.length).toBeGreaterThan(0);
  });

  it("LOW only when contradiction is present", () => {
    const d = confidenceFromEvidence({
      evidence: ["owner_estimate", "contradiction"],
      approvedSignalCount: 1,
      coreRequiredSatisfied: true,
    });
    expect(d.label).toBe("low");
    expect(d.rationale).toMatch(/contradict/i);
  });

  it("does not default to LOW for partial-but-usable input", () => {
    const d = confidenceFromEvidence({
      evidence: ["admin_observed"],
      approvedSignalCount: 1,
      coreRequiredSatisfied: true,
      allowMediumWithoutVerifiedProof: true,
    });
    expect(d.label).not.toBe("low");
  });

  it("maps tiers to evidence quality correctly", () => {
    expect(tierToEvidenceQuality("verified_evidence")).toBe("verified");
    expect(tierToEvidenceQuality("admin_observed")).toBe("admin_reviewed");
    expect(tierToEvidenceQuality("owner_estimate")).toBe("owner_claim");
    expect(tierToEvidenceQuality("missing_evidence")).toBe("missing");
    expect(tierToEvidenceQuality("contradiction")).toBeNull();
  });

  it("owner_estimate alone cannot reach HIGH", () => {
    const d = confidenceFromEvidence({
      evidence: ["owner_estimate", "owner_estimate", "owner_estimate"],
      approvedSignalCount: 3,
      coreRequiredSatisfied: true,
    });
    expect(d.label).not.toBe("high");
  });
});

describe("P103 — missing input specificity", () => {
  it("rejects vague items", () => {
    expect(isVagueMissingInput("more data")).toBe(true);
    expect(isVagueMissingInput("metrics")).toBe(true);
    expect(isVagueMissingInput("business information")).toBe(true);
    expect(isVagueMissingInput("context")).toBe(true);
  });

  it("accepts specific items", () => {
    expect(isVagueMissingInput("POS category margin report")).toBe(false);
    expect(isVagueMissingInput("Owner-approved target customer segment")).toBe(false);
    expect(isVagueMissingInput("Approved campaign CTA URL")).toBe(false);
  });

  it("validateMissingInputs splits valid from rejected", () => {
    const r = validateMissingInputs([
      "more context",
      "Documented handoff owner",
      "metrics",
      "Current SOP owner",
    ]);
    expect(r.valid).toEqual(["Documented handoff owner", "Current SOP owner"]);
    expect(r.rejected.length).toBe(2);
  });
});

describe("P103 — output envelope validation", () => {
  it("passes a well-formed envelope", () => {
    const r = validateAiOutputEnvelope(envelope());
    expect(r.valid).toBe(true);
  });

  it("rejects vague missing inputs", () => {
    const r = validateAiOutputEnvelope(
      envelope({ missing_inputs: ["more data"] }),
    );
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => /vague/.test(i.problem))).toBe(true);
  });

  it("rejects generic low-confidence reasons", () => {
    const r = validateAiOutputEnvelope(
      envelope({
        confidence_level: "low",
        confidence_reason: "Confidence is medium",
        missing_inputs: ["POS export"],
      }),
    );
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.field === "confidence_reason")).toBe(true);
  });

  it("low confidence requires at least one specific missing input", () => {
    const r = validateAiOutputEnvelope(
      envelope({
        confidence_level: "low",
        confidence_reason:
          "Owner claim conflicts with uploaded POS data and no source-of-truth report is attached.",
        missing_inputs: [],
      }),
    );
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.field === "missing_inputs")).toBe(true);
  });

  it("strips admin_review_notes from client_safe outputs", () => {
    const r = validateAiOutputEnvelope(
      envelope({
        client_safe_output: true,
        admin_review_notes: "internal: handle with care",
      }),
    );
    expect(r.valid).toBe(true);
    expect(r.clientSafeEnvelope).toBeDefined();
    expect((r.clientSafeEnvelope as Record<string, unknown>).admin_review_notes).toBeUndefined();
  });

  it("forbids bypassing human review", () => {
    const r = validateAiOutputEnvelope(
      envelope({ human_review_required: false as unknown as true }),
    );
    expect(r.valid).toBe(false);
  });

  it("requires concrete next actions", () => {
    const r = validateAiOutputEnvelope(envelope({ recommended_next_actions: [] }));
    expect(r.valid).toBe(false);
  });
});

describe("P103 — context envelope (gig + report scope)", () => {
  it("Basic gig customer gets short scope and excluded full-RGS sections", () => {
    const env = buildAiContextEnvelope({
      task_type: "sop_training_bible",
      tool_key: "sop_training_bible",
      customer_type: "gig",
      gig_tier: "basic",
    });
    expect(env.gig_scope_context.gig_mode).toBe(true);
    expect(env.gig_scope_context.allowed_depth).toBe("light");
    expect(env.gig_scope_context.output_length_target).toBe("short");
    expect(env.gig_scope_context.excluded_full_rgs_sections).toContain(
      "implementation_roadmap",
    );
    expect(env.report_scope_context.allowed_sections).not.toContain("structured_analysis");
  });

  it("Premium gig is deeper but still scoped, not full-RGS", () => {
    const env = buildAiContextEnvelope({
      task_type: "buyer_persona_icp",
      tool_key: "buyer_persona_icp",
      customer_type: "gig",
      gig_tier: "premium",
    });
    expect(env.gig_scope_context.allowed_depth).toBe("deep");
    expect(env.report_scope_context.allowed_sections).toContain("structured_analysis");
    expect(env.gig_scope_context.excluded_full_rgs_sections).toContain(
      "control_system_monitoring",
    );
  });

  it("Full client preserves full RGS depth", () => {
    const env = buildAiContextEnvelope({
      task_type: "swot_strategic_matrix",
      tool_key: "swot_strategic_matrix",
      customer_type: "full_client",
    });
    expect(env.gig_scope_context.gig_mode).toBe(false);
    expect(env.gig_scope_context.allowed_depth).toBe("deep");
    expect(env.gig_scope_context.excluded_full_rgs_sections).toEqual([]);
  });

  it("preamble includes role, HITL, voice notice, and confidence rules", () => {
    const env = buildAiContextEnvelope({
      task_type: "campaign_brief",
      tool_key: "campaign_brief",
      customer_type: "gig",
      gig_tier: "standard",
    });
    const text = buildPriorityPromptPreamble(env);
    expect(text).toMatch(/RGS Campaign Strategy Director/);
    expect(text).toMatch(/AI may draft, summarize, recommend/);
    expect(text).toMatch(/Confidence rules/);
    expect(text).toMatch(/Missing inputs must be specific/);
    expect(text).toMatch(/Gig mode is ON/);
  });
});

describe("P103 — RGS / Matt voice", () => {
  it("detects banned hype and AI filler", () => {
    const v = detectVoiceViolations({
      summary:
        "We will supercharge growth, unlock 10x results, and as an AI we deliver guaranteed best practices.",
    });
    const phrases = v.map((x) => x.phrase.toLowerCase());
    expect(phrases).toEqual(expect.arrayContaining(["supercharge", "unlock", "10x"]));
    expect(v.some((x) => /as an ai/i.test(x.phrase))).toBe(true);
    expect(v.some((x) => /guaranteed/i.test(x.phrase))).toBe(true);
    expect(v.some((x) => /best practices/i.test(x.phrase))).toBe(true);
  });

  it("passes calm direct copy", () => {
    const v = detectVoiceViolations({
      summary: "Document the catering handoff and assign one owner for follow-up.",
    });
    expect(v).toEqual([]);
  });

  it("banned voice list covers core phrases", () => {
    const joined = RGS_BANNED_VOICE_PHRASES.map((r) => r.source).join("|");
    expect(joined).toMatch(/unlock/);
    expect(joined).toMatch(/skyrocket/);
    expect(joined).toMatch(/dominate/);
    expect(joined).toMatch(/guaranteed/);
  });
});

describe("P103 — claim safety + campaign rules", () => {
  it("blocks guaranteed-outcome claims", () => {
    const issues = enforceClaimSafety({
      body: "We guaranteed leads from this funnel.",
    });
    expect(issues.some((i) => /guaranteed/i.test(i.phrase))).toBe(true);
  });

  it("blocks auto-posting / auto-scheduling / live analytics / done-for-you", () => {
    const issues = enforceClaimSafety({
      a: "Posts will be scheduled automatically.",
      b: "Live analytics will track engagement.",
      c: "This is a done-for-you marketing service.",
    });
    const text = issues.map((i) => i.phrase).join(" | ").toLowerCase();
    expect(text).toMatch(/automatic/);
    expect(text).toMatch(/live analytics/);
    expect(text).toMatch(/done-for-you/);
  });

  it("blocks compliance / medical / cannabis certification claims", () => {
    const issues = enforceClaimSafety({
      a: "This SOP is OSHA compliant.",
      b: "Provides medical advice for patients.",
      c: "Dispensary compliance guarantee.",
    });
    expect(issues.length).toBeGreaterThan(0);
  });

  it("priority banned claims list is non-empty and covers core categories", () => {
    const joined = PRIORITY_BANNED_CLAIMS.map((r) => r.source).join("|");
    expect(joined).toMatch(/guaranteed/);
    expect(joined).toMatch(/auto/);
    expect(joined).toMatch(/done/);
    expect(joined).toMatch(/medical/);
  });
});

describe("P103 — HITL boundaries", () => {
  it("allows draft/summarize/recommend/identify_missing_inputs/flag_contradiction", () => {
    for (const action of ["draft", "summarize", "recommend", "identify_missing_inputs", "flag_contradiction"] as const) {
      expect(isHitlAllowed({ action })).toBe(true);
    }
  });

  it("forbids approve/verify/publish/schedule/send/override", () => {
    for (const action of [
      "approve_report",
      "mark_client_visible",
      "approve_campaign_asset",
      "approve_video_asset",
      "verify_evidence",
      "publish",
      "schedule",
      "send",
      "override_score",
    ] as const) {
      expect(isHitlAllowed({ action })).toBe(false);
    }
  });

  it("forbidden role list explicitly enumerates all blocked AI capabilities", () => {
    expect(HITL_FORBIDDEN_AI_ROLES).toEqual(
      expect.arrayContaining([
        "ai_approves_report",
        "ai_marks_client_visible",
        "ai_verifies_evidence",
        "ai_overrides_deterministic_score",
        "ai_publishes",
        "ai_schedules",
        "ai_sends",
      ]),
    );
  });

  it("boundary notice is human-readable and clear", () => {
    expect(HITL_BOUNDARY_NOTICE).toMatch(/may not approve/);
    expect(HITL_BOUNDARY_NOTICE).toMatch(/deterministic scoring/);
  });
});

describe("P103 — Campaign Video plan safety (no rendering claims unless wired)", () => {
  it("blocks any 'rendered MP4' or 'video published' assertions", () => {
    const issues = enforceClaimSafety({
      body: "Posts will be scheduled automatically and the video is rendered to MP4.",
    });
    expect(issues.some((i) => /automatic/i.test(i.phrase))).toBe(true);
  });
});

describe("P103 — evidence hierarchy mapping", () => {
  it("missing_evidence lowers confidence", () => {
    const d = confidenceFromEvidence({
      evidence: ["missing_evidence", "missing_evidence"],
      approvedSignalCount: 0,
      coreRequiredSatisfied: false,
      missingContext: ["no scorecard", "no diagnostic"],
    });
    expect(d.label).toBe("low");
  });

  it("AI cannot mark evidence verified — kernel exposes no such function", () => {
    const mod = Kernel as unknown as Record<string, unknown>;
    expect(typeof mod.markEvidenceVerified).toBe("undefined");
    expect(typeof mod.overrideDeterministicScore).toBe("undefined");
    expect(typeof mod.approveReport).toBe("undefined");
  });
});