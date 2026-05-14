/**
 * P93E-E2G — RGS Control System Continuation tests.
 *
 * Proves the Control System add-on is its own distinct post-Implementation
 * continuation module: client-operable, monitoring-focused, with bounded
 * support and clear re-engagement triggers, never confused with the
 * Implementation phase, never leaking admin-only content, never moving
 * deterministic score, and never making outcome / legal / tax /
 * accounting / compliance / valuation promises.
 */
import { describe, it, expect } from "vitest";
import {
  buildControlSystemView,
  RGS_STAGE_LABELS,
  type ControlSystemInput,
  type RepairProgressInput,
} from "@/lib/controlSystem/continuationEngine";
import {
  classifySupportRequest,
  CONTROL_SYSTEM_INCLUDED_SUPPORT,
  CONTROL_SYSTEM_REENGAGEMENT_TRIGGERS,
  CONTROL_SYSTEM_FORBIDDEN_CLAIMS,
  CONTROL_SYSTEM_CANNABIS_AFFIRMATIVE_BLOCK,
} from "@/config/controlSystemSupportBoundary";
import {
  MATRIX_GEAR_KEYS,
  type MatrixGearKey,
  type MatrixIndustryKey,
} from "@/config/industryDiagnosticDepthMatrix";
import type { DiagnosticFinding } from "@/lib/implementation/depthEngine";

function findings(industry: MatrixIndustryKey): DiagnosticFinding[] {
  return MATRIX_GEAR_KEYS.map((gear, i) => ({
    industry,
    gear,
    rubric_state:
      i === 0 ? "absent_or_unknown" : i === 1 ? "informal_or_owner_in_head" : "documented_but_inconsistent",
    evidence_confidence: i % 2 === 0 ? "low" : "medium",
    contradiction_flagged: i === 0,
    false_green_flagged: i === 2,
  }));
}

function progress(): RepairProgressInput[] {
  return MATRIX_GEAR_KEYS.map((gear, i): RepairProgressInput => ({
    recommendation_id: `rec_step_${i + 1}`,
    gear,
    status: i === 0 ? "client_action_needed" : i === 1 ? "in_progress" : "stable",
    last_updated_iso: "2026-05-01T00:00:00.000Z",
    evidence_freshness: i === 0 ? "missing" : i === 1 ? "needs_refresh" : "current",
    owner_action_pending: i === 0,
  }));
}

function input(industry: MatrixIndustryKey): ControlSystemInput {
  const baseGears: Record<MatrixGearKey, number> = {
    demand_generation: 120,
    revenue_conversion: 130,
    operational_efficiency: 110,
    financial_visibility: 140,
    owner_independence: 100,
  };
  const laterGears = { ...baseGears, financial_visibility: 130, owner_independence: 110 };
  return {
    industry,
    findings: findings(industry),
    repair_progress: progress(),
    score_history: [
      { iso_date: "2026-04-01", total_score: 600, gear_scores: baseGears },
      { iso_date: "2026-05-01", total_score: 580, gear_scores: laterGears },
    ],
    add_on_active: true,
  };
}

describe("P93E-E2G :: Stage separation", () => {
  it("Implementation and Control System have distinct labels and stage descriptions", () => {
    expect(RGS_STAGE_LABELS.implementation.label).toBe("Implementation");
    expect(RGS_STAGE_LABELS.control_system.label).toBe("RGS Control System");
    expect(RGS_STAGE_LABELS.implementation.one_liner).not.toBe(
      RGS_STAGE_LABELS.control_system.one_liner,
    );
    expect(RGS_STAGE_LABELS.control_system.role.toLowerCase()).toMatch(
      /not a new implementation project/,
    );
    expect(RGS_STAGE_LABELS.implementation.one_liner.toLowerCase()).toMatch(/installing/);
    expect(RGS_STAGE_LABELS.control_system.one_liner.toLowerCase()).toMatch(/operating and monitoring/);
  });

  it("Control System scope notice is post-Implementation, not unlimited consulting or execution", () => {
    const view = buildControlSystemView(input("general_service_other"));
    const t = view.scope_boundary_notice.toLowerCase();
    expect(t).toMatch(/post-implementation continuation layer/);
    expect(t).toMatch(/not a new implementation project/);
    expect(t).toMatch(/does not run the business/);
    for (const re of CONTROL_SYSTEM_FORBIDDEN_CLAIMS) {
      expect(view.scope_boundary_notice).not.toMatch(re);
    }
  });
});

describe("P93E-E2G :: Continuation view is client-operable and monitoring-focused", () => {
  it("exposes repair continuation, evidence freshness, owner-control, industry signals, and monitoring plan", () => {
    const view = buildControlSystemView(input("trades_home_services"));
    expect(view.repair_continuation.length).toBeGreaterThan(0);
    expect(view.evidence_freshness.length).toBeGreaterThan(0);
    expect(view.owner_control_signals.length).toBe(MATRIX_GEAR_KEYS.length);
    expect(view.industry_signals.length).toBe(MATRIX_GEAR_KEYS.length);
    expect(view.monitoring_plan.length).toBeGreaterThanOrEqual(6);
    expect(view.recommended_next_client_action).toBeTruthy();
  });

  it("repair continuation items expose dependency status, monitoring frequency, and re-engagement note", () => {
    const view = buildControlSystemView(input("retail"));
    for (const r of view.repair_continuation) {
      expect(["ready", "waiting_on_prereq", "blocked"]).toContain(r.dependency_status);
      expect(["weekly", "biweekly", "monthly"]).toContain(r.monitoring_frequency);
      expect(r.reengagement_trigger_if_scope_expands.toLowerCase()).toMatch(
        /new implementation engagement may be required/,
      );
      expect(r.next_client_action).toBeTruthy();
      expect(r.control_system_watch_item).toBeTruthy();
    }
  });

  it("evidence freshness items separate confidence from certification claims", () => {
    const view = buildControlSystemView(input("professional_services"));
    for (const e of view.evidence_freshness) {
      expect(e.confidence_note.toLowerCase()).toMatch(
        /does not certify legal, tax, accounting, compliance, or valuation status/,
      );
      expect(["current", "needs_refresh", "stale", "missing"]).toContain(e.freshness);
    }
  });

  it("score movement detects regression and identifies the top slipping gear", () => {
    const view = buildControlSystemView(input("ecommerce_online_retail"));
    expect(view.score_movement.trend).toBe("regressing");
    expect(view.score_movement.delta).toBeLessThan(0);
    expect(view.score_movement.top_slipping_gear).toBeTruthy();
  });

  it("owner-control signals expose bottleneck and trend per gear", () => {
    const view = buildControlSystemView(input("restaurant_food_service"));
    for (const s of view.owner_control_signals) {
      expect(s.bottleneck_warning).toBeTruthy();
      expect(s.what_owner_can_stop_carrying).toBeTruthy();
      expect(["improving", "flat", "regressing", "unknown"]).toContain(s.owner_independence_trend);
    }
  });

  it("client-safe surfaces never echo admin-only notes verbatim", () => {
    const view = buildControlSystemView(input("trades_home_services"));
    for (const r of view.repair_continuation) {
      expect(r.client_safe_explanation).not.toContain(r.admin_only_note);
    }
    // admin summary note must not bleed into client-safe scope notice
    expect(view.scope_boundary_notice).not.toContain(view.admin_summary_note);
  });
});

describe("P93E-E2G :: Industry-specific ongoing signals", () => {
  it("each supported industry produces a non-empty Control System view with industry signals", () => {
    const inds: MatrixIndustryKey[] = [
      "trades_home_services",
      "restaurant_food_service",
      "retail",
      "professional_services",
      "ecommerce_online_retail",
      "cannabis_mmj_dispensary",
      "general_service_other",
    ];
    for (const ind of inds) {
      const v = buildControlSystemView(input(ind));
      expect(v.industry_signals.length, ind).toBeGreaterThan(0);
      for (const s of v.industry_signals) {
        expect(s.signal_label, ind).toBeTruthy();
        expect(s.monitoring_question, ind).toBeTruthy();
        expect(s.client_safe_explanation, ind).toBeTruthy();
      }
    }
  });

  it("Cannabis Control System surface uses operational/documentation visibility only", () => {
    const v = buildControlSystemView(input("cannabis_mmj_dispensary"));
    const surface = [
      v.scope_boundary_notice,
      ...v.industry_signals.map((s) => s.client_safe_explanation),
      ...v.evidence_freshness.map((e) => e.confidence_note),
      ...v.repair_continuation.map((r) => r.client_safe_explanation),
    ].join(" | ");
    for (const re of CONTROL_SYSTEM_CANNABIS_AFFIRMATIVE_BLOCK) {
      expect(surface).not.toMatch(re);
    }
    for (const re of CONTROL_SYSTEM_FORBIDDEN_CLAIMS) {
      expect(surface).not.toMatch(re);
    }
  });
});

describe("P93E-E2G :: Bounded support classification", () => {
  it("included support requests are classified as included_support", () => {
    for (const text of [
      "How do I update this evidence?",
      "What does this warning mean?",
      "Where do I mark this repair item complete?",
      "Can you clarify this installed process?",
    ]) {
      const c = classifySupportRequest(text);
      expect(c.classification, text).toBe("included_support");
      expect(c.matched_signals.length, text).toBeGreaterThan(0);
      expect(c.ai_assisted).toBe(false);
    }
  });

  it("re-engagement requests are classified as reengagement_required", () => {
    for (const text of [
      "Can you build a new sales process?",
      "Can you redo our diagnostic?",
      "Can you analyze a new business line?",
      "Can you create a new SOP system?",
      "Can you advise on tax/legal/compliance?",
      "Can RGS manage this every week?",
      "We need a guaranteed revenue plan.",
    ]) {
      const c = classifySupportRequest(text);
      expect(c.classification, text).toBe("reengagement_required");
      expect(c.client_safe_explanation.toLowerCase(), text).toMatch(
        /new diagnostic or implementation engagement|beyond the installed system/,
      );
    }
  });

  it("ambiguous requests fall to admin_review_needed and never auto-promise", () => {
    const c = classifySupportRequest("Hello, just checking in.");
    expect(c.classification).toBe("admin_review_needed");
    for (const re of CONTROL_SYSTEM_FORBIDDEN_CLAIMS) {
      expect(c.client_safe_explanation).not.toMatch(re);
      expect(c.admin_note).not.toMatch(re);
    }
  });

  it("included-support and re-engagement-trigger lists are exposed for UI surfaces", () => {
    expect(CONTROL_SYSTEM_INCLUDED_SUPPORT.length).toBeGreaterThanOrEqual(8);
    expect(CONTROL_SYSTEM_REENGAGEMENT_TRIGGERS.length).toBeGreaterThanOrEqual(8);
  });
});

describe("P93E-E2G :: Safety guards", () => {
  it("no client-facing field across any industry contains forbidden outcome / scope-creep claims", () => {
    const inds: MatrixIndustryKey[] = [
      "trades_home_services",
      "restaurant_food_service",
      "retail",
      "professional_services",
      "ecommerce_online_retail",
      "cannabis_mmj_dispensary",
      "general_service_other",
    ];
    for (const ind of inds) {
      const v = buildControlSystemView(input(ind));
      const surface = [
        v.scope_boundary_notice,
        v.recommended_next_client_action,
        ...v.monitoring_plan,
        ...v.included_support,
        ...v.reengagement_triggers,
        ...v.industry_signals.map((s) => `${s.signal_label} ${s.monitoring_question} ${s.client_safe_explanation}`),
        ...v.evidence_freshness.map((e) => `${e.why_it_matters} ${e.what_to_upload} ${e.confidence_note}`),
        ...v.owner_control_signals.map(
          (o) => `${o.bottleneck_warning} ${o.decisions_still_routed_to_owner} ${o.what_owner_can_stop_carrying}`,
        ),
        ...v.repair_continuation.map(
          (r) =>
            `${r.next_client_action} ${r.client_safe_explanation} ${r.control_system_watch_item} ${r.reengagement_trigger_if_scope_expands}`,
        ),
      ].join(" | ");
      for (const re of CONTROL_SYSTEM_FORBIDDEN_CLAIMS) {
        expect(surface, `${ind} :: ${re}`).not.toMatch(re);
      }
    }
  });
});
