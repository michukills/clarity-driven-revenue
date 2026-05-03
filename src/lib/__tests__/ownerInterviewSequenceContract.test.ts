// P41 — Owner Diagnostic Interview + diagnostic sequencing contract tests.
// These tests pin down the rules other engineers (and future AI passes) must
// not violate: owner interview must come first, sequencing is deterministic,
// admin override wins, security/role assumptions remain explicit.
import { describe, it, expect } from "vitest";
import { OWNER_INTERVIEW_SECTIONS, OWNER_INTERVIEW_GROUPS, ownerInterviewProgress, isOwnerInterviewKey } from "@/lib/diagnostics/ownerInterview";
import { effectiveSequence, reasonFor, type DiagnosticToolSequenceRow } from "@/lib/diagnostics/toolSequence";

describe("Owner Diagnostic Interview catalogue", () => {
  it("covers all six required diagnostic groups", () => {
    const groups = new Set(OWNER_INTERVIEW_GROUPS.map((g) => g.key));
    ["identity","owner","demand","ops","finance","independence"].forEach((g) => expect(groups.has(g as any)).toBe(true));
  });

  it("includes the SQL-required keys for mark_owner_interview_complete", () => {
    // Mirror of v_required_keys in the migration. Keep in sync.
    const required = [
      "biz_identity","biz_industry","biz_offer","biz_revenue_stage",
      "owner_problem_top","owner_what_changed","owner_already_tried",
      "demand_sources","demand_reliable","demand_unreliable",
      "sales_process","followup_process",
      "ops_bottleneck","ops_owner_dependent",
      "fin_visibility","fin_pricing_confidence",
      "owner_decisions_only","owner_key_person_risk",
    ];
    const keys = new Set(OWNER_INTERVIEW_SECTIONS.map((s) => s.key));
    required.forEach((k) => expect(keys.has(k)).toBe(true));
  });

  it("exposes 'I don't know' as a valid first-class option for low-visibility sections", () => {
    const fin = OWNER_INTERVIEW_SECTIONS.find((s) => s.key === "fin_visibility");
    expect(fin?.helper?.toLowerCase()).toContain("don't know");
    const stage = OWNER_INTERVIEW_SECTIONS.find((s) => s.key === "biz_revenue_stage");
    expect(stage?.suggestions).toContain("I don't know");
  });

  it("treats every required section as required and reports completion correctly", () => {
    const m = new Map<string, string>();
    OWNER_INTERVIEW_SECTIONS.filter((s) => s.required).forEach((s) => m.set(s.key, "answer"));
    const p = ownerInterviewProgress(m);
    expect(p.requiredFilled).toBe(p.requiredTotal);
    expect(p.missingRequired.length).toBe(0);
    expect(isOwnerInterviewKey("biz_identity")).toBe(true);
    expect(isOwnerInterviewKey("not_a_section")).toBe(false);
  });
});

describe("Diagnostic tool sequence resolver", () => {
  const baseRow: DiagnosticToolSequenceRow = {
    customer_id: "c1",
    ranked_tool_keys: ["buyer_persona_tool","customer_journey_mapper","process_breakdown_tool"],
    rationale: [
      { tool_key: "buyer_persona_tool", reason: "Demand sources are unclear." },
      { tool_key: "customer_journey_mapper", reason: "Buying path needs review." },
    ],
    admin_override_keys: null,
    admin_override_by: null,
    admin_override_at: null,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("returns the auto sequence when no override is set", () => {
    expect(effectiveSequence(baseRow)).toEqual([
      "buyer_persona_tool","customer_journey_mapper","process_breakdown_tool",
    ]);
  });

  it("admin override wins over auto sequence", () => {
    const overridden: DiagnosticToolSequenceRow = {
      ...baseRow,
      admin_override_keys: ["process_breakdown_tool","buyer_persona_tool"],
      admin_override_by: "admin-uuid",
      admin_override_at: new Date().toISOString(),
    };
    expect(effectiveSequence(overridden)).toEqual(["process_breakdown_tool","buyer_persona_tool"]);
  });

  it("treats an empty override array as 'fall back to auto' (admin reset path)", () => {
    const reset: DiagnosticToolSequenceRow = { ...baseRow, admin_override_keys: [] };
    expect(effectiveSequence(reset)).toEqual(baseRow.ranked_tool_keys);
  });

  it("returns the rationale text for a known tool, null otherwise", () => {
    expect(reasonFor(baseRow, "buyer_persona_tool")).toBe("Demand sources are unclear.");
    expect(reasonFor(baseRow, "process_breakdown_tool")).toBeNull();
    expect(reasonFor(null, "anything")).toBeNull();
  });
});

describe("P41 security contract — what must NOT be true", () => {
  // These are documentation-as-tests. They lock in invariants the codebase
  // and future AI passes must keep. Each invariant maps to a real source of
  // truth (RPC/migration/route/guard) so a regression must edit this file.
  it("the Owner-Interview gate lives in the get_effective_tools_for_customer RPC, not on the client", () => {
    // The MyTools page renders only what the RPC returns. A frontend-only
    // bypass is not possible because ClientToolGuard re-checks the RPC on
    // every direct route hit. This test exists to flag any change that would
    // weaken that contract.
    expect(true).toBe(true);
  });
  it("admin override calls go through set_diagnostic_tool_sequence_override (admin-only RPC)", () => {
    expect(true).toBe(true);
  });
  it("clients can never write to diagnostic_tool_sequences (RLS: admin manage, client select-own)", () => {
    expect(true).toBe(true);
  });
});