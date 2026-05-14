import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  enrichScorecardRun,
  EVIDENCE_PROMPTS_V3,
  RUBRIC_VERSION_V2,
} from "@/lib/scorecard/v3Enrichment";
import {
  RUBRIC_VERSION_V3,
  emptyAnswersV3,
  GEARS_V3,
  scoreScorecardV3,
} from "@/lib/scorecard/rubricV3";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

/** Build a fully-answered v3 row with a target weight per gear. */
function makeV3Row(weightPerGear: Partial<Record<string, "best" | "worst" | "mid">> = {}) {
  const answers = emptyAnswersV3();
  for (const g of GEARS_V3) {
    const choice = weightPerGear[g.id] ?? "mid";
    for (const q of g.questions) {
      const opts = q.options;
      const pick =
        choice === "best"
          ? opts[0]
          : choice === "worst"
            ? opts[opts.length - 1]
            : opts[Math.floor(opts.length / 2)];
      answers[g.id][q.id] = pick.id;
    }
  }
  const result = scoreScorecardV3(answers);
  return {
    rubric_version: RUBRIC_VERSION_V3,
    overall_score_estimate: result.overall_score_estimate,
    pillar_results: result.pillar_results,
    top_gaps: result.top_gaps,
  };
}

describe("P93E-E3 — v3 OS brain feed + admin visibility", () => {
  it("v2 historical runs remain readable with safe fallback (no invented metadata)", () => {
    const view = enrichScorecardRun({
      rubric_version: RUBRIC_VERSION_V2,
      overall_score_estimate: 612,
      pillar_results: [],
      top_gaps: [],
    });
    expect(view.rubric_kind).toBe("v2");
    expect(view.rubric_is_current).toBe(false);
    expect(view.rubric_label).toMatch(/historical/i);
    expect(view.has_structured_metadata).toBe(false);
    expect(view.gear_scores).toEqual([]);
    expect(view.worn_tooth_signals).toEqual([]);
    expect(view.evidence_needed).toEqual([]);
    expect(view.fallback_note).toMatch(/historical/i);
    // Total + band still surfaced for context.
    expect(view.total_score).toBe(612);
    expect(view.interpretation_band?.label).toBeTruthy();
  });

  it("unknown rubric falls back safely without inventing v3 metadata", () => {
    const view = enrichScorecardRun({
      rubric_version: "v0_legacy",
      overall_score_estimate: null,
      pillar_results: [],
    });
    expect(view.rubric_kind).toBe("unknown");
    expect(view.has_structured_metadata).toBe(false);
    expect(view.evidence_needed).toEqual([]);
    expect(view.fallback_note).toBeTruthy();
  });

  it("v3 runs expose total + per-gear scores + strongest + most-slipping gear", () => {
    const row = makeV3Row({
      demand: "best",
      conversion: "mid",
      operations: "mid",
      financial: "mid",
      owner: "worst",
    });
    const view = enrichScorecardRun(row);
    expect(view.rubric_kind).toBe("v3");
    expect(view.has_structured_metadata).toBe(true);
    expect(view.gear_scores).toHaveLength(5);
    expect(view.total_score).toBe(row.overall_score_estimate);
    expect(view.strongest_gear?.pillar_id).toBe("demand");
    expect(view.most_slipping_gear?.pillar_id).toBe("owner");
    expect(view.interpretation_band?.label).toBeTruthy();
  });

  it("v3 worst-case run exposes worn-tooth signals (deduped, capped)", () => {
    const row = makeV3Row({
      demand: "worst",
      conversion: "worst",
      operations: "worst",
      financial: "worst",
      owner: "worst",
    });
    const view = enrichScorecardRun(row);
    expect(view.worn_tooth_signals.length).toBeGreaterThan(0);
    expect(view.worn_tooth_signals.length).toBeLessThanOrEqual(5);
    // Deduped — Set should match length.
    expect(new Set(view.worn_tooth_signals).size).toBe(view.worn_tooth_signals.length);
  });

  it("v3 evidence-needed prompts come from the canonical paid-Diagnostic catalog", () => {
    const row = makeV3Row({
      demand: "worst",
      conversion: "worst",
      operations: "best",
      financial: "best",
      owner: "best",
    });
    const view = enrichScorecardRun(row);
    expect(view.evidence_needed.length).toBeGreaterThan(0);
    expect(view.evidence_needed.length).toBeLessThanOrEqual(3);
    for (const e of view.evidence_needed) {
      expect(EVIDENCE_PROMPTS_V3[e.pillar_id]).toEqual(e.prompts);
    }
    // Lowest-scoring gears should appear first.
    const ids = view.evidence_needed.map((e) => e.pillar_id);
    expect(ids).toContain("demand");
    expect(ids).toContain("conversion");
  });

  it("evidence prompt catalog covers every gear with realistic Diagnostic artifacts", () => {
    expect(Object.keys(EVIDENCE_PROMPTS_V3).sort()).toEqual(
      ["conversion", "demand", "financial", "operations", "owner"],
    );
    expect(EVIDENCE_PROMPTS_V3.financial.join(" ")).toMatch(/P&L|cash|AR|margin/i);
    expect(EVIDENCE_PROMPTS_V3.owner.join(" ")).toMatch(/SOP|decision rights|escalation/i);
    expect(EVIDENCE_PROMPTS_V3.demand.join(" ")).toMatch(/lead|inquiry|CRM/i);
  });

  it("recommended next step varies by score band and never guarantees outcomes", () => {
    const high = enrichScorecardRun(makeV3Row({
      demand: "best", conversion: "best", operations: "best", financial: "best", owner: "best",
    }));
    const mid = enrichScorecardRun(makeV3Row({
      demand: "mid", conversion: "mid", operations: "mid", financial: "mid", owner: "mid",
    }));
    const low = enrichScorecardRun(makeV3Row({
      demand: "worst", conversion: "worst", operations: "worst", financial: "worst", owner: "worst",
    }));
    expect(high.recommended_next_step.category).toBe("monitor");
    expect(low.recommended_next_step.category).toBe("diagnostic");
    // Mid should not be "monitor" only — should suggest implementation or diagnostic.
    expect(["diagnostic", "implementation"]).toContain(mid.recommended_next_step.category);
    for (const v of [high, mid, low]) {
      const blob = `${v.recommended_next_step.label} ${v.recommended_next_step.rationale}`;
      expect(blob).not.toMatch(/guaranteed (revenue|profit|growth|funding|ROI)/i);
      expect(blob).not.toMatch(/will (double|triple|10x)/i);
    }
  });

  it("admin Scorecard Leads page renders v3/v2-aware enrichment via enrichScorecardRun", () => {
    const src = read("src/pages/admin/ScorecardLeads.tsx");
    expect(src).toMatch(/from\s+"@\/lib\/scorecard\/v3Enrichment"/);
    expect(src).toMatch(/enrichScorecardRun\(row\)/);
    expect(src).toMatch(/Strongest gear/);
    expect(src).toMatch(/Most slipping gear/);
    expect(src).toMatch(/Worn-tooth signals/);
    expect(src).toMatch(/Evidence the paid Diagnostic would inspect/);
    expect(src).toMatch(/Recommended admin next step/);
    expect(src).toMatch(/rubric_label/);
    expect(src).toMatch(/fallback_note/);
  });

  it("admin view does not fake email sent/skipped status when E4 is not yet wired", () => {
    const src = read("src/pages/admin/ScorecardLeads.tsx");
    // Admin email status is only ever rendered from the persisted DB field via emailStatusLabel,
    // never hardcoded as "sent" or "skipped".
    expect(src).not.toMatch(/follow_up_email_status\s*=\s*["']sent["']/);
    expect(src).not.toMatch(/follow_up_email_status\s*=\s*["']skipped/);
  });

  it("v3 enrichment never references admin-only notes or frontend secrets", () => {
    const src = read("src/lib/scorecard/v3Enrichment.ts");
    expect(src).not.toMatch(/admin_notes/);
    expect(src).not.toMatch(/RESEND_API_KEY|SUPABASE_SERVICE_ROLE_KEY|FOLLOWUP_EMAIL_FROM/);
  });

  it("v3 enrichment is pure: no AI calls, no fetch, no supabase imports", () => {
    const src = read("src/lib/scorecard/v3Enrichment.ts");
    expect(src).not.toMatch(/from\s+"@\/integrations\/supabase\/client"/);
    expect(src).not.toMatch(/\bfetch\(/);
    expect(src).not.toMatch(/openai|anthropic|gemini|lovable[- ]?ai/i);
  });
});

describe("P93E-E3 — v3 rubric version constant export parity", () => {
  it("RUBRIC_VERSION_V3 is the v3 deterministic gears identifier", () => {
    expect(RUBRIC_VERSION_V3).toBe("v3_deterministic_gears");
  });
});
