/**
 * P87 — Evidence Vault Labeled Slots + Verification Rules + Diagnostic
 * Timeline deterministic tests.
 */
import { describe, it, expect } from "vitest";
import {
  EVIDENCE_VAULT_SLOTS,
  EVIDENCE_SLOT_STATUSES,
  EVIDENCE_SLOT_STATUS_CLIENT_LABEL,
  getSlotDefinition,
  evaluateRuleOfRecency,
  evaluateRuleOfSpecificity,
  evaluateRuleOfAlignment,
  evaluateRuleOfTotality,
  resolveSlotForIndustry,
  findForbiddenSlotPhrase,
  nextStatusOnClientUpload,
  isAdminTransitionAllowed,
  EVIDENCE_SLOT_FORBIDDEN_CLIENT_PHRASES,
} from "@/config/evidenceVaultSlots";
import {
  DIAGNOSTIC_STAGE_KEYS,
  DIAGNOSTIC_STAGE_DAY,
  STAGE_HAS_CLIENT_REMINDER,
  STAGE_NOTIFICATION_TYPE,
  computeStageStatus,
  validateExtendVaultClose,
} from "@/config/diagnosticTimeline";
import {
  EVIDENCE_DECAY_TTL_DAYS,
  EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED,
} from "@/config/evidenceDecay";
import { evaluateEmailSendDecision } from "@/lib/emailConsent";

describe("P87 — Evidence Vault Slot catalog", () => {
  it("defines all five required slots", () => {
    const keys = EVIDENCE_VAULT_SLOTS.map((s) => s.key).sort();
    expect(keys).toEqual([
      "financial_reality","operational_dna","pricing_strategy","sales_proof","time_audit",
    ]);
  });

  it("each slot has client-safe wording free of forbidden phrases", () => {
    for (const s of EVIDENCE_VAULT_SLOTS) {
      expect(findForbiddenSlotPhrase(s.clientLabel)).toBeNull();
      expect(findForbiddenSlotPhrase(s.uploadInstruction)).toBeNull();
      expect(findForbiddenSlotPhrase(s.clientSafeWording)).toBeNull();
    }
  });

  it("ttl matches P86 evidence_decay categories", () => {
    for (const s of EVIDENCE_VAULT_SLOTS) {
      const expected = EVIDENCE_DECAY_TTL_DAYS[s.verificationCategory];
      expect(s.defaultTtlDays).toBe(expected);
    }
  });

  it("status enum covers all required client-facing states", () => {
    expect(EVIDENCE_SLOT_STATUSES).toEqual([
      "missing","pending_review","verified","partial","rejected",
      "expired","expiring_soon","not_applicable",
    ]);
    for (const s of EVIDENCE_SLOT_STATUSES) {
      expect(EVIDENCE_SLOT_STATUS_CLIENT_LABEL[s]).toBeTruthy();
    }
  });

  it("client upload always transitions to pending_review (never verified)", () => {
    expect(nextStatusOnClientUpload("missing")).toBe("pending_review");
    expect(nextStatusOnClientUpload("rejected")).toBe("pending_review");
    expect(nextStatusOnClientUpload("expired")).toBe("pending_review");
    expect(nextStatusOnClientUpload("verified")).toBe("pending_review");
    expect(nextStatusOnClientUpload("not_applicable")).toBe("not_applicable");
  });

  it("admin transitions are restricted to allowed targets", () => {
    expect(isAdminTransitionAllowed("verified")).toBe(true);
    expect(isAdminTransitionAllowed("partial")).toBe(true);
    expect(isAdminTransitionAllowed("rejected")).toBe(true);
    expect(isAdminTransitionAllowed("not_applicable")).toBe(true);
    expect(isAdminTransitionAllowed("expired")).toBe(false);
    expect(isAdminTransitionAllowed("expiring_soon")).toBe(false);
  });
});

describe("P87 — Rule of Recency", () => {
  const now = new Date("2026-05-06T12:00:00Z");
  it("flags >12 months as out of window for operational categories", () => {
    const r = evaluateRuleOfRecency({
      category: "financial_snapshot",
      evidenceDate: "2024-01-01T00:00:00Z",
      now,
    });
    expect(r.in_window).toBe(false);
    expect(r.reason).toBe("evidence_older_than_12_months");
  });
  it("accepts within 12 months", () => {
    const r = evaluateRuleOfRecency({
      category: "lead_log",
      evidenceDate: "2025-12-01T00:00:00Z",
      now,
    });
    expect(r.in_window).toBe(true);
  });
  it("does not apply recency rule to SOPs", () => {
    const r = evaluateRuleOfRecency({
      category: "sop_or_handbook",
      evidenceDate: "2020-01-01T00:00:00Z",
      now,
    });
    expect(r.in_window).toBe(true);
    expect(r.reason).toBe("category_not_subject_to_recency_rule");
  });
  it("missing date fails recency", () => {
    const r = evaluateRuleOfRecency({
      category: "financial_snapshot",
      evidenceDate: null,
      now,
    });
    expect(r.in_window).toBe(false);
  });
});

describe("P87 — Rule of Specificity", () => {
  it("zero signals fails the rule", () => {
    const r = evaluateRuleOfSpecificity({
      has_specific_steps: false,
      has_role_assignments: false,
      has_checklist_items: false,
      has_decision_rules: false,
      has_handoff_points: false,
      has_review_cadence: false,
    });
    expect(r.meets_rule).toBe(false);
    expect(r.positive_signals).toBe(0);
  });
  it("one or more signals passes", () => {
    const r = evaluateRuleOfSpecificity({
      has_specific_steps: true,
      has_role_assignments: false,
      has_checklist_items: true,
      has_decision_rules: false,
      has_handoff_points: false,
      has_review_cadence: false,
    });
    expect(r.meets_rule).toBe(true);
    expect(r.positive_signals).toBe(2);
  });
});

describe("P87 — Rule of Alignment", () => {
  it("flags conflict on material disagreement and picks conservative value", () => {
    const r = evaluateRuleOfAlignment({
      client_claim_value: 100000,
      evidence_value: 70000,
      conservative_direction: "lower",
    });
    expect(r.conflict_flag_required).toBe(true);
    expect(r.conservative_value).toBe(70000);
  });
  it("aligned values do not flag conflict", () => {
    const r = evaluateRuleOfAlignment({
      client_claim_value: 100000,
      evidence_value: 99000,
      conservative_direction: "lower",
    });
    expect(r.conflict_flag_required).toBe(false);
  });
  it("claim only without evidence does not flag conflict (but is not verified)", () => {
    const r = evaluateRuleOfAlignment({
      client_claim_value: 50000,
      evidence_value: null,
      conservative_direction: "lower",
    });
    expect(r.conflict_flag_required).toBe(false);
    expect(r.reason).toBe("claim_only_no_evidence");
  });
});

describe("P87 — Rule of Totality", () => {
  it("verified gets full credit", () => {
    expect(evaluateRuleOfTotality({ status: "verified", scoring_mode: "binary" }).full_credit).toBe(true);
  });
  it("partial blocked under binary scoring", () => {
    const r = evaluateRuleOfTotality({ status: "partial", scoring_mode: "binary" });
    expect(r.full_credit).toBe(false);
    expect(r.partial_credit).toBe(false);
  });
  it("partial allowed when scoring supports partial", () => {
    const r = evaluateRuleOfTotality({ status: "partial", scoring_mode: "supports_partial_credit" });
    expect(r.partial_credit).toBe(true);
    expect(r.full_credit).toBe(false);
  });
  it("missing/rejected/expired never get credit", () => {
    for (const s of ["missing","rejected","expired"] as const) {
      const r = evaluateRuleOfTotality({ status: s, scoring_mode: "supports_partial_credit" });
      expect(r.full_credit).toBe(false);
      expect(r.partial_credit).toBe(false);
    }
  });
});

describe("P87 — Industry slot resolution", () => {
  it("trades adds Jobber/ServiceTitan/Housecall Pro hint to sales_proof", () => {
    const r = resolveSlotForIndustry("sales_proof", "trades_home_services");
    expect(r?.industryHelpText.toLowerCase()).toContain("jobber");
    expect(r?.industryHelpText.toLowerCase()).toContain("servicetitan");
    expect(r?.industryHelpText.toLowerCase()).toContain("housecall pro");
    expect(r?.industryHelpText.toLowerCase()).toContain("manual upload only");
  });
  it("cannabis hint avoids forbidden compliance language", () => {
    const r = resolveSlotForIndustry("sales_proof", "cannabis_mmj_dispensary");
    expect(r?.industryHelpText).toBeTruthy();
    expect(findForbiddenSlotPhrase(r!.industryHelpText)).toBeNull();
  });
  it("falls back to general for unknown industry", () => {
    const r = resolveSlotForIndustry("financial_reality", null);
    expect(r?.industryLabel).toBe("Financial Reality");
  });
});

describe("P87 — Diagnostic Timeline", () => {
  it("six stages with correct days", () => {
    expect(DIAGNOSTIC_STAGE_KEYS).toEqual([
      "systems_interview","evidence_vault_opens","evidence_reminder",
      "evidence_window_closes","rgs_review","report_walkthrough",
    ]);
    expect(DIAGNOSTIC_STAGE_DAY.systems_interview).toBe(1);
    expect(DIAGNOSTIC_STAGE_DAY.evidence_vault_opens).toBe(2);
    expect(DIAGNOSTIC_STAGE_DAY.evidence_reminder).toBe(4);
    expect(DIAGNOSTIC_STAGE_DAY.evidence_window_closes).toBe(6);
    expect(DIAGNOSTIC_STAGE_DAY.rgs_review).toBe(8);
    expect(DIAGNOSTIC_STAGE_DAY.report_walkthrough).toBe(10);
  });

  it("Day 4 and Day 6 are client-notifying stages", () => {
    expect(STAGE_HAS_CLIENT_REMINDER.evidence_reminder).toBe(true);
    expect(STAGE_HAS_CLIENT_REMINDER.evidence_window_closes).toBe(true);
  });

  it("notification types are unique", () => {
    const vals = Object.values(STAGE_NOTIFICATION_TYPE);
    expect(new Set(vals).size).toBe(vals.length);
  });

  it("computes stage status deterministically", () => {
    const now = new Date("2026-05-06T12:00:00Z");
    expect(computeStageStatus({ scheduledAt: null, completedAt: null, now })).toBe("not_scheduled");
    expect(computeStageStatus({ scheduledAt: "2026-05-10T00:00:00Z", completedAt: null, now })).toBe("scheduled");
    expect(computeStageStatus({ scheduledAt: "2026-05-01T00:00:00Z", completedAt: null, now })).toBe("overdue");
    expect(computeStageStatus({ scheduledAt: "2026-05-01T00:00:00Z", completedAt: "2026-05-02T00:00:00Z", now })).toBe("completed");
    expect(computeStageStatus({ scheduledAt: "2026-05-01T00:00:00Z", completedAt: null, extendedUntil: "2026-05-12T00:00:00Z", now })).toBe("extended");
    expect(computeStageStatus({ scheduledAt: "2026-05-01T00:00:00Z", completedAt: null, snoozedUntil: "2026-05-10T00:00:00Z", now })).toBe("snoozed");
  });

  it("vault-close extension requires admin reason and future date", () => {
    expect(validateExtendVaultClose({ newCloseAt: "2099-01-01T00:00:00Z", adminReason: "" }).ok).toBe(false);
    expect(validateExtendVaultClose({ newCloseAt: "1999-01-01T00:00:00Z", adminReason: "late client" }).ok).toBe(false);
    expect(validateExtendVaultClose({ newCloseAt: "2099-01-01T00:00:00Z", adminReason: "late client" }).ok).toBe(true);
  });
});

describe("P87 — Email consent gate honored for diagnostic reminders", () => {
  it("blocks reminder send when backend not wired", () => {
    const decision = evaluateEmailSendDecision({
      consentStatus: "active",
      unsubscribeStatus: "subscribed",
      preferences: { diagnostic_timeline_evidence_reminder: true },
      notificationType: "diagnostic_timeline_evidence_reminder",
      backendWired: false,
    });
    expect(decision.allow_send).toBe(false);
    expect(decision.send_status).toBe("blocked_no_email_backend");
  });
  it("blocks reminder send when consent missing", () => {
    const decision = evaluateEmailSendDecision({
      consentStatus: "missing",
      unsubscribeStatus: "subscribed",
      preferences: {},
      notificationType: "diagnostic_timeline_window_closes",
      backendWired: true,
    });
    expect(decision.allow_send).toBe(false);
  });
  it("blocks reminder send when unsubscribed", () => {
    const decision = evaluateEmailSendDecision({
      consentStatus: "active",
      unsubscribeStatus: "unsubscribed",
      preferences: { diagnostic_timeline_evidence_reminder: true },
      notificationType: "diagnostic_timeline_evidence_reminder",
      backendWired: true,
    });
    expect(decision.allow_send).toBe(false);
  });
  it("does NOT claim automation since backend flag is false", () => {
    expect(EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED).toBe(false);
  });
});
