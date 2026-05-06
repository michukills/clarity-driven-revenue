/**
 * P85.5 — Cannabis Documentation Velocity™ tests.
 *
 * Pure deterministic-logic + config tests. No network. No AI.
 */
import { describe, it, expect } from "vitest";
import {
  CANNABIS_ALLOWED_EVIDENCE_EXAMPLES,
  CANNABIS_DOC_VELOCITY_CLIENT_SAFE_EXPLANATION,
  CANNABIS_DOC_VELOCITY_CONFIG,
  CANNABIS_DOC_VELOCITY_FORBIDDEN_CLAIMS,
  CANNABIS_DOC_VELOCITY_REPORT_SAFE_LANGUAGE,
  CANNABIS_DOC_VELOCITY_THRESHOLD_DAYS,
  CANNABIS_INDUSTRY_KEYS,
  findCannabisDocVelocityForbiddenPhrase,
  isCannabisIndustryKey,
} from "@/config/cannabisDocumentationVelocity";
import {
  calculateDaysSinceManualCannabisAudit,
  detectCannabisDocumentationVelocity,
  getCannabisDocumentationVelocityStatus,
} from "@/lib/cannabisDocumentationVelocity";

const NOW = new Date("2026-05-06T12:00:00Z");
const daysAgo = (n: number) => {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

describe("P85.5 — Cannabis Documentation Velocity™ config", () => {
  it("threshold is 7 calendar days", () => {
    expect(CANNABIS_DOC_VELOCITY_THRESHOLD_DAYS).toBe(7);
    expect(CANNABIS_DOC_VELOCITY_CONFIG.threshold_days).toBe(7);
  });

  it("gear is operational_efficiency", () => {
    expect(CANNABIS_DOC_VELOCITY_CONFIG.gear_key).toBe("operational_efficiency");
  });

  it("client-safe explanation calls itself an operational documentation-readiness signal and not a legal compliance determination", () => {
    const txt = CANNABIS_DOC_VELOCITY_CLIENT_SAFE_EXPLANATION.toLowerCase();
    expect(txt).toContain("operational documentation-readiness signal");
    expect(txt).toContain("not a legal compliance determination");
  });

  it("report-safe language declines legal/regulatory/license/enforcement/certification claims", () => {
    const txt = CANNABIS_DOC_VELOCITY_REPORT_SAFE_LANGUAGE.toLowerCase();
    expect(txt).toContain("operational documentation-readiness");
    expect(txt).toContain("does not determine legal compliance");
    expect(txt).toContain("regulatory status");
    expect(txt).toContain("license safety");
    expect(txt).toContain("enforcement risk");
    expect(txt).toContain("compliance certification");
  });

  it("forbidden claims block compliant/non-compliant/legal/regulatory/certification language", () => {
    const wanted = [
      "compliant",
      "non-compliant",
      "legal compliance",
      "regulatory assurance",
      "compliance certification",
      "audit ready",
      "guaranteed",
    ];
    for (const w of wanted) {
      expect(
        CANNABIS_DOC_VELOCITY_FORBIDDEN_CLAIMS.map((s) => s.toLowerCase()),
      ).toContain(w);
    }
  });

  it("findCannabisDocVelocityForbiddenPhrase catches unsafe wording case-insensitively", () => {
    expect(findCannabisDocVelocityForbiddenPhrase("Client is COMPLIANT.")).not.toBeNull();
    expect(findCannabisDocVelocityForbiddenPhrase("Now audit-ready.")).not.toBeNull();
    expect(findCannabisDocVelocityForbiddenPhrase("Operational readiness improved.")).toBeNull();
  });

  it("allowed evidence examples include the required manual sources", () => {
    const labels = CANNABIS_ALLOWED_EVIDENCE_EXAMPLES.map((e) => e.source_type);
    expect(labels).toEqual(
      expect.arrayContaining([
        "metrc_manual_export",
        "biotrack_manual_export",
        "pos_inventory_report",
        "manual_inventory_count_sheet",
        "discrepancy_log",
      ]),
    );
  });

  it("no allowed evidence example claims a live connector (connector-truth)", () => {
    for (const e of CANNABIS_ALLOWED_EVIDENCE_EXAMPLES) {
      expect(e.live_connector).toBe(false);
    }
  });

  it("isCannabisIndustryKey accepts cannabis/MMJ/dispensary keys and rejects others", () => {
    for (const k of CANNABIS_INDUSTRY_KEYS) {
      expect(isCannabisIndustryKey(k)).toBe(true);
    }
    expect(isCannabisIndustryKey("MMJ_CANNABIS")).toBe(true);
    expect(isCannabisIndustryKey("retail")).toBe(false);
    expect(isCannabisIndustryKey(null)).toBe(false);
    expect(isCannabisIndustryKey(undefined)).toBe(false);
  });
});

describe("P85.5 — deterministic Cannabis Documentation Velocity™ logic", () => {
  it("non-cannabis industry returns not_applicable", () => {
    const r = detectCannabisDocumentationVelocity({
      lastManualAuditAt: daysAgo(0),
      industryKey: "retail",
      nowDate: NOW,
    });
    expect(r.status).toBe("not_applicable");
    expect(r.needs_reinspection).toBe(false);
    expect(r.days_since_manual_audit).toBeNull();
  });

  it("missing last audit date returns needs_review / missing_evidence", () => {
    const r = detectCannabisDocumentationVelocity({
      lastManualAuditAt: null,
      industryKey: "mmj_cannabis",
      nowDate: NOW,
    });
    expect(r.status).toBe("needs_review");
    expect(r.reason).toBe("missing_evidence");
    expect(r.needs_reinspection).toBe(false);
  });

  it("future audit date returns invalid_date and does not mark current", () => {
    const future = new Date(NOW);
    future.setUTCDate(future.getUTCDate() + 3);
    const r = detectCannabisDocumentationVelocity({
      lastManualAuditAt: future,
      industryKey: "mmj_cannabis",
      nowDate: NOW,
    });
    expect(r.status).toBe("invalid_date");
    expect(r.needs_reinspection).toBe(false);
  });

  it("0 days since audit returns current", () => {
    const r = detectCannabisDocumentationVelocity({
      lastManualAuditAt: NOW,
      industryKey: "mmj_cannabis",
      nowDate: NOW,
    });
    expect(r.status).toBe("current");
    expect(r.days_since_manual_audit).toBe(0);
    expect(r.needs_reinspection).toBe(false);
  });

  it("exactly 7 days since audit returns current (does NOT trigger high risk)", () => {
    const r = detectCannabisDocumentationVelocity({
      lastManualAuditAt: daysAgo(7),
      industryKey: "mmj_cannabis",
      nowDate: NOW,
    });
    expect(r.status).toBe("current");
    expect(r.needs_reinspection).toBe(false);
    expect(r.days_since_manual_audit).toBe(7);
  });

  it("8+ days since audit returns high_risk and sets needs_reinspection=true", () => {
    const r = detectCannabisDocumentationVelocity({
      lastManualAuditAt: daysAgo(8),
      industryKey: "mmj_cannabis",
      nowDate: NOW,
    });
    expect(r.status).toBe("high_risk");
    expect(r.needs_reinspection).toBe(true);
    expect(r.severity).toBe("high");
    expect(r.days_since_manual_audit).toBe(8);
  });

  it("30 days since audit also returns high_risk", () => {
    const r = detectCannabisDocumentationVelocity({
      lastManualAuditAt: daysAgo(30),
      industryKey: "mmj_cannabis",
      nowDate: NOW,
    });
    expect(r.status).toBe("high_risk");
    expect(r.needs_reinspection).toBe(true);
  });

  it("calculateDaysSinceManualCannabisAudit handles null and invalid inputs", () => {
    expect(calculateDaysSinceManualCannabisAudit(null)).toBeNull();
    expect(calculateDaysSinceManualCannabisAudit(undefined)).toBeNull();
    expect(calculateDaysSinceManualCannabisAudit("not-a-date")).toBeNull();
  });

  it("calculateDaysSinceManualCannabisAudit is deterministic across timezone-equivalent inputs", () => {
    const a = calculateDaysSinceManualCannabisAudit(
      new Date("2026-05-01T00:00:00Z"),
      new Date("2026-05-06T23:59:59Z"),
    );
    expect(a).toBe(5);
  });

  it("getCannabisDocumentationVelocityStatus matches detector for stale inputs", () => {
    expect(
      getCannabisDocumentationVelocityStatus({
        lastManualAuditAt: daysAgo(10),
        industryKey: "mmj_cannabis",
        nowDate: NOW,
      }),
    ).toBe("high_risk");
  });

  it("approved positioning and forbidden phrases are absent from configured copy", () => {
    const all = [
      CANNABIS_DOC_VELOCITY_CLIENT_SAFE_EXPLANATION,
      CANNABIS_DOC_VELOCITY_REPORT_SAFE_LANGUAGE,
      CANNABIS_DOC_VELOCITY_CONFIG.deterministic_trigger_description,
      CANNABIS_DOC_VELOCITY_CONFIG.admin_interpretation,
    ].join(" \n ");
    const banned = [
      // P72–P75A old positioning
      ["lay", "the", "bric" + "ks"].join(" "),
      "provides the blueprint",
      "Mirror, Not the Map",
    ];
    for (const b of banned) {
      expect(all.toLowerCase()).not.toContain(b.toLowerCase());
    }
  });
});
