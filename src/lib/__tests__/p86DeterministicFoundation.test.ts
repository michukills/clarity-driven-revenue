/**
 * P86 — Deterministic foundation tests for Evidence Decay, Labor
 * Burden, RGS Pulse Check, Owner Intervention, External Risk, and AI
 * HITL gating. Pure config / pure logic. No network. No AI.
 */
import { describe, it, expect } from "vitest";
import {
  EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED,
  EVIDENCE_DECAY_REMINDER_MODE_LABEL,
  EVIDENCE_DECAY_TTL_DAYS,
  EVIDENCE_EXPIRING_SOON_WINDOW_DAYS,
  computeEvidenceDecayState,
  findEvidenceDecayForbiddenPhrase,
  ttlForCategory,
} from "@/config/evidenceDecay";
import {
  LABOR_BURDEN_GAP_HIGH_RISK_PCT_THRESHOLD,
  LABOR_BURDEN_OPERATIONAL_EFFICIENCY_DEDUCTION_POINTS,
  LABOR_BURDEN_EVIDENCE_SOURCES,
  LABOR_BURDEN_CLIENT_SAFE_EXPLANATION,
  computeLaborBurden,
  findLaborBurdenForbiddenPhrase,
} from "@/config/laborBurden";
import {
  RGS_PULSE_CHECK_AUTOMATION_WIRED,
  RGS_PULSE_CHECK_CHECKLIST,
  RGS_PULSE_CHECK_MODE_LABEL,
  RGS_PULSE_CHECK_NAME,
  RGS_PULSE_CHECK_SCHEDULE_DOW,
  RGS_PULSE_CHECK_SCHEDULE_HOUR_24,
  nextPulseCheckAt,
} from "@/config/rgsPulseCheck";
import {
  OWNER_INTERVENTION_PATTERN_THRESHOLD_30D,
  OWNER_INTERVENTION_TYPES,
  evaluateOwnerInterventionRisk,
  findOwnerInterventionForbiddenPhrase,
} from "@/config/ownerInterventionLog";
import {
  EXTERNAL_RISK_AUTOMATION_WIRED,
  EXTERNAL_RISK_MODE_LABEL,
  EXTERNAL_RISK_TRIGGER_TYPES,
  evaluateExternalRiskTrigger,
  findExternalRiskForbiddenPhrase,
} from "@/config/externalRiskTriggers";
import {
  HITL_AI_TASK_TYPES,
  HITL_CLIENT_SAFE_PHRASE,
  HITL_CONFIRMATION_TEXT,
  evaluateHitlGate,
} from "@/config/aiHitlAudit";

describe("P86 — Evidence Decay TTL defaults", () => {
  it("financial / lead / payroll / field-ops / POS / inventory all default to 30 days", () => {
    for (const k of [
      "financial_snapshot",
      "lead_log",
      "crm_export",
      "sales_pipeline_export",
      "payroll_export",
      "field_ops_export",
      "pos_export",
      "inventory_reconciliation",
    ] as const) {
      expect(EVIDENCE_DECAY_TTL_DAYS[k]).toBe(30);
      expect(ttlForCategory(k)).toBe(30);
    }
  });
  it("SOPs / role clarity / scope docs default to 180 days", () => {
    expect(EVIDENCE_DECAY_TTL_DAYS.sop_or_handbook).toBe(180);
    expect(EVIDENCE_DECAY_TTL_DAYS.role_clarity_or_decision_rights).toBe(180);
    expect(EVIDENCE_DECAY_TTL_DAYS.scope_or_engagement_doc).toBe(180);
  });
  it("preserves P85.5 cannabis 7-day velocity rule", () => {
    expect(EVIDENCE_DECAY_TTL_DAYS.cannabis_seed_to_sale).toBe(7);
  });
  it("owner interview claims have no verified TTL", () => {
    expect(EVIDENCE_DECAY_TTL_DAYS.owner_interview_claim).toBeNull();
  });
  it("expiring-soon window is 5 days", () => {
    expect(EVIDENCE_EXPIRING_SOON_WINDOW_DAYS).toBe(5);
  });
});

describe("P86 — Evidence Decay state machine", () => {
  const now = new Date("2026-05-06T12:00:00Z");
  it("missing when no evidence", () => {
    expect(
      computeEvidenceDecayState({ verifiedAt: null, ttlDays: 30, hasEvidence: false, now }).state,
    ).toBe("missing");
  });
  it("pending_review / partial / rejected / not_applicable surface directly", () => {
    expect(computeEvidenceDecayState({ verifiedAt: null, ttlDays: 30, hasEvidence: true, reviewState: "pending_review", now }).state).toBe("pending_review");
    expect(computeEvidenceDecayState({ verifiedAt: null, ttlDays: 30, hasEvidence: true, reviewState: "partial", now }).state).toBe("partial");
    expect(computeEvidenceDecayState({ verifiedAt: null, ttlDays: 30, hasEvidence: true, reviewState: "rejected", now }).state).toBe("rejected");
    expect(computeEvidenceDecayState({ verifiedAt: null, ttlDays: 30, hasEvidence: true, reviewState: "not_applicable", now }).state).toBe("not_applicable");
  });
  it("current when verified well within TTL", () => {
    const verified = new Date(now.getTime() - 1 * 86400000).toISOString();
    expect(computeEvidenceDecayState({ verifiedAt: verified, ttlDays: 30, hasEvidence: true, reviewState: "approved", now }).state).toBe("current");
  });
  it("expiring_soon within 5 days of expiration", () => {
    const verified = new Date(now.getTime() - 26 * 86400000).toISOString(); // 4 days left
    expect(computeEvidenceDecayState({ verifiedAt: verified, ttlDays: 30, hasEvidence: true, reviewState: "approved", now }).state).toBe("expiring_soon");
  });
  it("expired after expiration", () => {
    const verified = new Date(now.getTime() - 31 * 86400000).toISOString();
    expect(computeEvidenceDecayState({ verifiedAt: verified, ttlDays: 30, hasEvidence: true, reviewState: "approved", now }).state).toBe("expired");
  });
  it("approved with null TTL stays current (e.g. owner interview claim)", () => {
    expect(computeEvidenceDecayState({ verifiedAt: now.toISOString(), ttlDays: null, hasEvidence: true, reviewState: "approved", now }).state).toBe("current");
  });
});

describe("P86 — Evidence Decay automation truth", () => {
  it("does not claim automated email unless wired", () => {
    expect(EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED).toBe(false);
    expect(EVIDENCE_DECAY_REMINDER_MODE_LABEL.toLowerCase()).toContain("admin-tracked");
    expect(EVIDENCE_DECAY_REMINDER_MODE_LABEL.toLowerCase()).toContain("not automated");
  });
  it("forbidden-phrase scanner catches unsafe claims", () => {
    expect(findEvidenceDecayForbiddenPhrase("audit-ready package")).not.toBeNull();
    expect(findEvidenceDecayForbiddenPhrase("operational-readiness signal")).toBeNull();
  });
});

describe("P86 — Labor Burden Calculator", () => {
  it("threshold and deduction constants are deterministic", () => {
    expect(LABOR_BURDEN_GAP_HIGH_RISK_PCT_THRESHOLD).toBe(20);
    expect(LABOR_BURDEN_OPERATIONAL_EFFICIENCY_DEDUCTION_POINTS).toBe(15);
  });
  it("computes (paid - billable) / paid * 100 correctly", () => {
    const r = computeLaborBurden({ totalFieldPayrollHours: 100, totalBillableHours: 70, hasEvidence: true });
    expect(r.status).toBe("high_risk");
    expect(r.paid_to_billable_gap_pct).toBeCloseTo(30);
    expect(r.scoring_impact_points).toBe(15);
  });
  it("exactly 20% does not trigger high_risk; 20.01% does", () => {
    const eq = computeLaborBurden({ totalFieldPayrollHours: 100, totalBillableHours: 80, hasEvidence: true });
    expect(eq.status).toBe("current");
    const over = computeLaborBurden({ totalFieldPayrollHours: 10000, totalBillableHours: 7999, hasEvidence: true });
    expect(over.status).toBe("high_risk");
  });
  it("invalid inputs handled deterministically", () => {
    expect(computeLaborBurden({ totalFieldPayrollHours: 0, totalBillableHours: 0, hasEvidence: true }).status).toBe("invalid_input");
    expect(computeLaborBurden({ totalFieldPayrollHours: 100, totalBillableHours: -1, hasEvidence: true }).status).toBe("invalid_input");
    expect(computeLaborBurden({ totalFieldPayrollHours: 100, totalBillableHours: 120, hasEvidence: true }).status).toBe("needs_admin_review");
  });
  it("missing evidence does not guess", () => {
    const r = computeLaborBurden({ totalFieldPayrollHours: 100, totalBillableHours: 50, hasEvidence: false });
    expect(r.status).toBe("missing");
    expect(r.scoring_impact_points).toBe(0);
  });
  it("all evidence sources are manual export / upload", () => {
    for (const e of LABOR_BURDEN_EVIDENCE_SOURCES) {
      expect(e.live_connector).toBe(false);
      expect(e.label.toLowerCase()).toContain("manual upload");
    }
  });
  it("client-safe explanation contains no forbidden language", () => {
    expect(findLaborBurdenForbiddenPhrase(LABOR_BURDEN_CLIENT_SAFE_EXPLANATION)).toBeNull();
    expect(findLaborBurdenForbiddenPhrase("OSHA compliance achieved")).not.toBeNull();
    expect(findLaborBurdenForbiddenPhrase("wage law violation")).not.toBeNull();
  });
});

describe("P86 — RGS Pulse Check (Friday 2 PM)", () => {
  it("is named 'RGS Pulse Check' and scheduled for Friday 14:00", () => {
    expect(RGS_PULSE_CHECK_NAME).toBe("RGS Pulse Check");
    expect(RGS_PULSE_CHECK_SCHEDULE_DOW).toBe(5);
    expect(RGS_PULSE_CHECK_SCHEDULE_HOUR_24).toBe(14);
  });
  it("does not claim calendar/email automation unless wired", () => {
    expect(RGS_PULSE_CHECK_AUTOMATION_WIRED).toBe(false);
    expect(RGS_PULSE_CHECK_MODE_LABEL.toLowerCase()).toContain("admin-tracked");
    expect(RGS_PULSE_CHECK_MODE_LABEL.toLowerCase()).toContain("no calendar automation");
  });
  it("checklist covers required pulse-check items", () => {
    const keys = RGS_PULSE_CHECK_CHECKLIST.map((c) => c.key);
    for (const k of [
      "evidence_expiring_7d",
      "evidence_expired",
      "owner_interventions",
      "source_of_truth_conflicts",
      "forward_stability_flags_reinspection",
      "cannabis_documentation_velocity_high_risk",
      "trades_operational_leakage_flags",
      "slipping_scores_or_verification_gaps",
      "reminders_due_or_overdue",
    ]) {
      expect(keys).toContain(k);
    }
  });
  it("nextPulseCheckAt returns a future Friday at 14:00", () => {
    const d = nextPulseCheckAt(new Date("2026-05-06T12:00:00")); // Wed
    expect(d.getDay()).toBe(5);
    expect(d.getHours()).toBe(14);
    expect(d.getTime()).toBeGreaterThan(new Date("2026-05-06T12:00:00").getTime());
  });
});

describe("P86 — Owner Intervention Log", () => {
  it("required intervention types are present", () => {
    for (const t of [
      "owner_jumped_into_dispatch",
      "owner_approved_discount",
      "owner_resolved_customer_issue",
      "owner_completed_staff_task",
      "owner_corrected_inventory",
      "owner_handled_scheduling",
      "owner_overrode_sop",
      "owner_made_unassigned_decision",
      "other",
    ]) {
      expect(OWNER_INTERVENTION_TYPES).toContain(t);
    }
  });
  it("repeated_pattern flag triggers Owner Independence risk", () => {
    expect(evaluateOwnerInterventionRisk({ interventionsLast30Days: 0, hasRepeatedPatternFlag: true })
      .triggers_owner_independence_risk).toBe(true);
  });
  it("count above threshold triggers risk; below does not", () => {
    expect(evaluateOwnerInterventionRisk({ interventionsLast30Days: OWNER_INTERVENTION_PATTERN_THRESHOLD_30D, hasRepeatedPatternFlag: false })
      .triggers_owner_independence_risk).toBe(true);
    expect(evaluateOwnerInterventionRisk({ interventionsLast30Days: OWNER_INTERVENTION_PATTERN_THRESHOLD_30D - 1, hasRepeatedPatternFlag: false })
      .triggers_owner_independence_risk).toBe(false);
  });
  it("forbidden-phrase scanner blocks unsafe language", () => {
    expect(findOwnerInterventionForbiddenPhrase("audit-ready owner log")).not.toBeNull();
    expect(findOwnerInterventionForbiddenPhrase("operational visibility only")).toBeNull();
  });
});

describe("P86 — External Risk Diagnostic Triggers", () => {
  it("supported trigger types include required categories", () => {
    for (const t of [
      "new_competitor_nearby",
      "platform_or_ad_rule_change",
      "vendor_disruption",
      "supplier_disruption",
      "license_or_documentation_deadline",
      "major_contract_expiration",
      "tax_or_cash_event",
      "market_demand_shock",
      "weather_or_seasonality_disruption",
      "cannabis_documentation_deadline",
    ]) {
      expect(EXTERNAL_RISK_TRIGGER_TYPES).toContain(t);
    }
  });
  it("does not claim live monitoring", () => {
    expect(EXTERNAL_RISK_AUTOMATION_WIRED).toBe(false);
    expect(EXTERNAL_RISK_MODE_LABEL.toLowerCase()).toContain("manual admin entry only");
  });
  it("requires a source note + gear and marks needs_reinspection when valid", () => {
    expect(evaluateExternalRiskTrigger({ triggerType: "vendor_disruption", sourceNote: "", affectedGear: "operational_efficiency" }).valid).toBe(false);
    expect(evaluateExternalRiskTrigger({ triggerType: "vendor_disruption", sourceNote: "Vendor announced shutdown", affectedGear: "" }).valid).toBe(false);
    const ok = evaluateExternalRiskTrigger({ triggerType: "vendor_disruption", sourceNote: "Vendor announced shutdown", affectedGear: "operational_efficiency" });
    expect(ok.valid).toBe(true);
    expect(ok.marks_needs_reinspection).toBe(true);
  });
  it("rejects unsafe regulated language in source note", () => {
    expect(evaluateExternalRiskTrigger({ triggerType: "cannabis_documentation_deadline", sourceNote: "Customer needs legal compliance", affectedGear: "financial_visibility" }).valid).toBe(false);
    expect(findExternalRiskForbiddenPhrase("audit-ready package")).not.toBeNull();
  });
});

describe("P86 — AI HITL Verification Gate", () => {
  it("uses the exact required confirmation text", () => {
    expect(HITL_CONFIRMATION_TEXT).toBe("I have cross-referenced the AI summary with the raw PDF.");
  });
  it("supports the documented AI task types", () => {
    for (const t of ["summarize", "interpret", "classify", "draft", "other"]) {
      expect(HITL_AI_TASK_TYPES).toContain(t);
    }
  });
  it("blocks verification when AI used without cross-check", () => {
    expect(evaluateHitlGate({ ai_assistance_used: true, raw_document_cross_checked: false, confirmation_text: HITL_CONFIRMATION_TEXT }).may_mark_verified).toBe(false);
  });
  it("blocks verification when confirmation text mismatched", () => {
    expect(evaluateHitlGate({ ai_assistance_used: true, raw_document_cross_checked: true, confirmation_text: "ok" }).may_mark_verified).toBe(false);
  });
  it("permits verification when AI used with confirmed cross-check", () => {
    expect(evaluateHitlGate({ ai_assistance_used: true, raw_document_cross_checked: true, confirmation_text: HITL_CONFIRMATION_TEXT }).may_mark_verified).toBe(true);
  });
  it("permits verification when AI was not used", () => {
    expect(evaluateHitlGate({ ai_assistance_used: false, raw_document_cross_checked: false, confirmation_text: "" }).may_mark_verified).toBe(true);
  });
  it("client-safe phrase does not say AI verified anything", () => {
    expect(HITL_CLIENT_SAFE_PHRASE.toLowerCase()).not.toContain("ai verified");
    expect(HITL_CLIENT_SAFE_PHRASE.toLowerCase()).toContain("admin-controlled review");
  });
});