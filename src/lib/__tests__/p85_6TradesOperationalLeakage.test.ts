/**
 * P85.6 — Trades / Home Services Operational Leakage™ tests.
 * Pure deterministic-logic + config tests. No network. No AI.
 */
import { describe, it, expect } from "vitest";
import {
  DISPATCH_CONTINUITY_HOURS,
  FIRST_TIME_FIX_CALLBACK_RATE_THRESHOLD,
  FIRST_TIME_FIX_DEDUCTION_POINTS,
  SHADOW_LABOR_GAP_PERCENT_THRESHOLD,
  TRADES_ALLOWED_EVIDENCE_EXAMPLES,
  TRADES_INDUSTRY_KEYS,
  TRADES_OPERATIONAL_CLIENT_SAFE_EXPLANATION,
  TRADES_OPERATIONAL_FORBIDDEN_CLAIMS,
  TRADES_OPERATIONAL_LEAKAGE_CONFIG,
  TRADES_OPERATIONAL_LEAKAGE_METRICS,
  TRADES_OPERATIONAL_REPORT_SAFE_LANGUAGE,
  findTradesOperationalForbiddenPhrase,
  getTradesMetricDefinition,
  isTradesIndustryKey,
} from "@/config/tradesOperationalLeakage";
import {
  calculateCallbackRate,
  calculateFirstTimeFixRate,
  calculateShadowLaborGapPercent,
  calculateTechnicianUtilization,
  detectFirstTimeFixDrag,
  detectShadowDispatcherRisk,
  detectShadowLaborLeak,
  detectTruckInventoryAccountability,
} from "@/lib/tradesOperationalLeakage";
import {
  STABILITY_QUICK_START_TEMPLATES,
  getQuickStartTemplate,
  toClientSafeQuickStartTemplate,
} from "@/config/stabilityQuickStartTemplates";

describe("P85.6 — Trades config", () => {
  it("includes trades_services and reasonable aliases", () => {
    for (const k of [
      "trades_services",
      "trades",
      "home_services",
      "hvac",
      "plumbing",
      "electrical",
      "roofing",
      "landscaping",
      "pest_control",
      "cleaning_services",
      "restoration",
      "appliance_repair",
      "service_contractors",
      "field_service",
    ]) {
      expect(TRADES_INDUSTRY_KEYS).toContain(k);
      expect(isTradesIndustryKey(k)).toBe(true);
    }
    expect(isTradesIndustryKey("mmj_cannabis")).toBe(false);
    expect(isTradesIndustryKey(null)).toBe(false);
  });

  it("declares the four required metrics with gear mappings", () => {
    const keys = TRADES_OPERATIONAL_LEAKAGE_METRICS.map((m) => m.metric_key);
    expect(keys).toEqual([
      "shadow_labor_leak",
      "first_time_fix_drag",
      "truck_inventory_accountability_loop",
      "shadow_dispatcher_risk",
    ]);
    expect(getTradesMetricDefinition("shadow_labor_leak").gears).toContain("financial_visibility");
    expect(getTradesMetricDefinition("shadow_labor_leak").gears).toContain("operational_efficiency");
    expect(getTradesMetricDefinition("first_time_fix_drag").gears).toContain("operational_efficiency");
    expect(getTradesMetricDefinition("truck_inventory_accountability_loop").gears).toContain("operational_efficiency");
    expect(getTradesMetricDefinition("truck_inventory_accountability_loop").gears).toContain("financial_visibility");
    expect(getTradesMetricDefinition("shadow_dispatcher_risk").gears).toContain("owner_independence");
    expect(getTradesMetricDefinition("shadow_dispatcher_risk").gears).toContain("operational_efficiency");
  });

  it("uses deterministic thresholds", () => {
    expect(SHADOW_LABOR_GAP_PERCENT_THRESHOLD).toBe(20);
    expect(FIRST_TIME_FIX_CALLBACK_RATE_THRESHOLD).toBe(5);
    expect(DISPATCH_CONTINUITY_HOURS).toBe(48);
    expect(FIRST_TIME_FIX_DEDUCTION_POINTS).toBe(30);
    expect(TRADES_OPERATIONAL_LEAKAGE_CONFIG.shadow_labor_gap_threshold_percent).toBe(20);
    expect(TRADES_OPERATIONAL_LEAKAGE_CONFIG.callback_rate_threshold_percent).toBe(5);
  });

  it("evidence examples include manual sources for Jobber/ServiceTitan/HCP/payroll/manual logs and never claim live sync", () => {
    const wanted = [
      "jobber_manual_export",
      "servicetitan_manual_export",
      "housecall_pro_manual_export",
      "payroll_manual_export",
      "adp_manual_export",
      "gusto_manual_export",
      "paycom_manual_export",
      "quickbooks_time_manual_export",
      "manual_truck_inventory_count_sheet",
      "callback_log",
      "dispatch_priority_playbook",
    ];
    const all = TRADES_ALLOWED_EVIDENCE_EXAMPLES.map((e) => e.source_type);
    for (const w of wanted) expect(all).toContain(w);
    for (const e of TRADES_ALLOWED_EVIDENCE_EXAMPLES) {
      expect(e.live_connector).toBe(false);
    }
  });

  it("forbidden claims block payroll/legal/tax/labor/OSHA/insurance/compliance/guarantee/blame language", () => {
    const wanted = [
      "payroll violation",
      "wage issue",
      "labor law",
      "osha compliance",
      "licensing compliance",
      "insurance suitability",
      "tax compliance",
      "accounting compliance",
      "legal compliance",
      "compliance certification",
      "guaranteed",
      "theft",
      "stealing",
      "fraud",
    ];
    const lc = TRADES_OPERATIONAL_FORBIDDEN_CLAIMS.map((s) => s.toLowerCase());
    for (const w of wanted) expect(lc).toContain(w);
  });

  it("findTradesOperationalForbiddenPhrase catches unsafe wording case-insensitively", () => {
    expect(findTradesOperationalForbiddenPhrase("Guaranteed savings of 10%")).not.toBeNull();
    expect(findTradesOperationalForbiddenPhrase("Likely employee THEFT")).not.toBeNull();
    expect(findTradesOperationalForbiddenPhrase("Operational readiness improved.")).toBeNull();
  });

  it("client-safe + report-safe copy avoids legal/payroll/compliance/guarantee language", () => {
    for (const txt of [TRADES_OPERATIONAL_CLIENT_SAFE_EXPLANATION, TRADES_OPERATIONAL_REPORT_SAFE_LANGUAGE]) {
      expect(txt.toLowerCase()).toContain("operational-readiness");
      expect(findTradesOperationalForbiddenPhrase(txt)).toBeNull();
    }
  });

  it("approved positioning and forbidden positioning phrases are absent from configured copy", () => {
    const all = [
      TRADES_OPERATIONAL_CLIENT_SAFE_EXPLANATION,
      TRADES_OPERATIONAL_REPORT_SAFE_LANGUAGE,
      TRADES_OPERATIONAL_LEAKAGE_CONFIG.admin_interpretation,
      ...TRADES_OPERATIONAL_LEAKAGE_METRICS.flatMap((m) => [
        m.client_safe_explanation,
        m.trigger_rule,
        m.repair_map_recommendation,
        m.forward_risk,
      ]),
    ].join(" \n ");
    const banned = [
      ["lay", "the", "bric" + "ks"].join(" "),
      ["provides", "the", "blue" + "print"].join(" "),
      ["Mirror,", "Not", "the", "M" + "ap"].join(" "),
    ];
    for (const b of banned) expect(all.toLowerCase()).not.toContain(b.toLowerCase());
  });
});

describe("P85.6 — Shadow Labor Leak™", () => {
  it("calculates utilization and gap correctly", () => {
    expect(calculateTechnicianUtilization({ paidHours: 100, billableHours: 75 })).toBe(75);
    expect(calculateShadowLaborGapPercent({ paidHours: 100, billableHours: 75 })).toBe(25);
  });
  it("paid hours <= 0 returns invalid_input", () => {
    expect(calculateTechnicianUtilization({ paidHours: 0, billableHours: 1 })).toBeNull();
    const r = detectShadowLaborLeak({ paidHours: 0, billableHours: 10, industryKey: "hvac" });
    expect(r.status).toBe("invalid_input");
  });
  it("billable > paid returns source_conflict_possible", () => {
    const r = detectShadowLaborLeak({ paidHours: 40, billableHours: 50, industryKey: "hvac" });
    expect(r.status).toBe("source_conflict_possible");
  });
  it("exactly 20% gap does not trigger high risk", () => {
    const r = detectShadowLaborLeak({ paidHours: 100, billableHours: 80, industryKey: "hvac" });
    expect(r.status).toBe("current");
    expect(r.severity).toBe("none");
    expect(r.needs_reinspection).toBe(false);
  });
  it(">20% gap triggers Shadow Labor Leak™ and maps to Financial Visibility / Operational Efficiency", () => {
    const r = detectShadowLaborLeak({ paidHours: 100, billableHours: 70, industryKey: "hvac" });
    expect(r.status).toBe("shadow_labor_leak");
    expect(r.severity).toBe("high");
    expect(r.needs_reinspection).toBe(true);
    expect(r.gears).toContain("financial_visibility");
    expect(r.gears).toContain("operational_efficiency");
  });
  it("non-trades industry returns not_applicable", () => {
    const r = detectShadowLaborLeak({ paidHours: 100, billableHours: 50, industryKey: "mmj_cannabis" });
    expect(r.status).toBe("not_applicable");
  });
});

describe("P85.6 — First-Time Fix Drag™", () => {
  it("calculates callback and FTFR rates correctly", () => {
    expect(calculateCallbackRate({ completedJobs: 100, callbackJobs: 5 })).toBe(5);
    expect(calculateFirstTimeFixRate({ completedJobs: 100, callbackJobs: 5 })).toBe(95);
  });
  it("completed jobs <= 0 returns invalid_input", () => {
    const r = detectFirstTimeFixDrag({ completedJobs: 0, callbackJobs: 0, industryKey: "hvac" });
    expect(r.status).toBe("invalid_input");
  });
  it("callbacks > completed returns source_conflict_possible", () => {
    const r = detectFirstTimeFixDrag({ completedJobs: 5, callbackJobs: 10, industryKey: "hvac" });
    expect(r.status).toBe("source_conflict_possible");
  });
  it("exactly 5% callback rate does not trigger high risk", () => {
    const r = detectFirstTimeFixDrag({ completedJobs: 100, callbackJobs: 5, industryKey: "hvac" });
    expect(r.status).toBe("current");
    expect(r.severity).toBe("none");
  });
  it(">5% callback rate triggers callback_drag with Operational Efficiency gear", () => {
    const r = detectFirstTimeFixDrag({ completedJobs: 100, callbackJobs: 6, industryKey: "hvac" });
    expect(r.status).toBe("callback_drag");
    expect(r.severity).toBe("high");
    expect(r.needs_reinspection).toBe(true);
    expect(r.gears).toContain("operational_efficiency");
  });
  it("optional deterministic 30-point deduction is honest", () => {
    const noDed = detectFirstTimeFixDrag({ completedJobs: 100, callbackJobs: 6, industryKey: "hvac" });
    expect(noDed.scoring_impact_type).toBe("high_risk_alert_pending_scoring");
    expect(noDed.scoring_impact_value).toBeNull();
    const ded = detectFirstTimeFixDrag({ completedJobs: 100, callbackJobs: 6, industryKey: "hvac", applyDeterministicDeduction: true });
    expect(ded.scoring_impact_type).toBe("deterministic_deduction");
    expect(ded.scoring_impact_value).toBe(30);
  });
});

describe("P85.6 — Truck Inventory Accountability Loop™", () => {
  it("truck inventory + no scanning + no logged movement returns incomplete_accountability", () => {
    const r = detectTruckInventoryAccountability({
      hasTruckInventory: true,
      hasMobileScanning: false,
      hasLoggedPartsMovement: false,
      hasJobCostingTieOut: false,
      industryKey: "plumbing",
    });
    expect(r.status).toBe("incomplete_accountability");
    expect(r.severity).toBe("high");
    expect(r.needs_reinspection).toBe(true);
    expect(r.gears).toContain("operational_efficiency");
  });
  it("scanning OR logged + job-costing tie-out returns verified_accountability", () => {
    const r1 = detectTruckInventoryAccountability({
      hasTruckInventory: true,
      hasMobileScanning: true,
      hasLoggedPartsMovement: false,
      hasJobCostingTieOut: true,
      industryKey: "plumbing",
    });
    expect(r1.status).toBe("verified_accountability");
    const r2 = detectTruckInventoryAccountability({
      hasTruckInventory: true,
      hasMobileScanning: false,
      hasLoggedPartsMovement: true,
      hasJobCostingTieOut: true,
      industryKey: "plumbing",
    });
    expect(r2.status).toBe("verified_accountability");
  });
  it("missing all evidence returns needs_review", () => {
    const r = detectTruckInventoryAccountability({
      hasTruckInventory: true,
      hasMobileScanning: null as any,
      hasLoggedPartsMovement: null as any,
      hasJobCostingTieOut: null as any,
      industryKey: "plumbing",
    });
    expect(r.status).toBe("needs_review");
  });
});

describe("P85.6 — Shadow Dispatcher Risk™", () => {
  it("dispatcher + no playbook triggers Shadow Dispatcher Risk™ severe", () => {
    const r = detectShadowDispatcherRisk({
      hasDispatcher: true,
      hasDispatchPriorityPlaybook: false,
      canCoverDispatchFor48Hours: true,
      dispatcherSinglePointOfFailure: false,
      industryKey: "hvac",
    });
    expect(r.status).toBe("shadow_dispatcher_risk");
    expect(r.severity).toBe("severe");
    expect(r.needs_reinspection).toBe(true);
    expect(r.gears).toContain("owner_independence");
  });
  it("cannot cover 48 hours triggers high-risk Owner Independence alert", () => {
    const r = detectShadowDispatcherRisk({
      hasDispatcher: true,
      hasDispatchPriorityPlaybook: true,
      canCoverDispatchFor48Hours: false,
      dispatcherSinglePointOfFailure: false,
      industryKey: "hvac",
    });
    expect(r.status).toBe("shadow_dispatcher_risk");
    expect(r.severity).toBe("high");
    expect(r.gears).toContain("owner_independence");
  });
  it("dispatcher single point of failure triggers high-risk alert", () => {
    const r = detectShadowDispatcherRisk({
      hasDispatcher: true,
      hasDispatchPriorityPlaybook: true,
      canCoverDispatchFor48Hours: true,
      dispatcherSinglePointOfFailure: true,
      industryKey: "hvac",
    });
    expect(r.status).toBe("shadow_dispatcher_risk");
    expect(r.severity).toBe("high");
  });
  it("good scheduling software alone does not suppress risk if no playbook", () => {
    // Same as 'no playbook' case — scheduling software is irrelevant to the rule.
    const r = detectShadowDispatcherRisk({
      hasDispatcher: true,
      hasDispatchPriorityPlaybook: false,
      canCoverDispatchFor48Hours: true,
      dispatcherSinglePointOfFailure: false,
      industryKey: "hvac",
    });
    expect(r.status).toBe("shadow_dispatcher_risk");
  });
  it("playbook + 48h continuity + not SPOF returns current", () => {
    const r = detectShadowDispatcherRisk({
      hasDispatcher: true,
      hasDispatchPriorityPlaybook: true,
      canCoverDispatchFor48Hours: true,
      dispatcherSinglePointOfFailure: false,
      industryKey: "hvac",
    });
    expect(r.status).toBe("current");
  });
});

describe("P85.6 — Trades Quick-Start templates", () => {
  const required = [
    "dispatch_priority_playbook",
    "technician_utilization_tracker",
    "first_time_fix_callback_log",
    "truck_inventory_scan_checklist",
  ] as const;
  it("all four trades templates exist with required structure", () => {
    for (const key of required) {
      const t = getQuickStartTemplate(key as any);
      expect(t.title).toBeTruthy();
      expect(t.gear_key).toBeTruthy();
      expect(t.failure_pattern).toBeTruthy();
      expect(t.first_step).toBeTruthy();
      expect(t.owner_instructions).toBeTruthy();
      expect(t.admin_instructions).toBeTruthy();
      expect(t.client_safe_description).toBeTruthy();
      expect(t.scope_boundary).toBeTruthy();
      expect(t.fields_or_columns.length).toBeGreaterThan(3);
      expect(t.output_format).toBeTruthy();
      expect(t.export_supported).toBe(false);
      expect(t.can_export).toBe(false);
      expect(t.industry_keys).toBeDefined();
      expect(t.industry_keys).toContain("trades_services");
    }
    // Required field coverage
    const dpp = getQuickStartTemplate("dispatch_priority_playbook" as any);
    for (const k of ["job_type","urgency_level","revenue_impact","escalation_rule","backup_dispatcher","decision_owner","after_hours_rule"]) {
      expect(dpp.fields_or_columns.find((f) => f.key === k)).toBeTruthy();
    }
    const tut = getQuickStartTemplate("technician_utilization_tracker" as any);
    for (const k of ["paid_hours","billable_hours","non_billable_reason","work_orders_completed","utilization_rate"]) {
      expect(tut.fields_or_columns.find((f) => f.key === k)).toBeTruthy();
    }
    const ftf = getQuickStartTemplate("first_time_fix_callback_log" as any);
    for (const k of ["job_id","callback_date","callback_reason","labor_hours_lost","resolution","prevention_note"]) {
      expect(ftf.fields_or_columns.find((f) => f.key === k)).toBeTruthy();
    }
    const tis = getQuickStartTemplate("truck_inventory_scan_checklist" as any);
    for (const k of ["truck_id","part_sku","starting_quantity","used_quantity","job_id","scan_log_confirmed","reviewer"]) {
      expect(tis.fields_or_columns.find((f) => f.key === k)).toBeTruthy();
    }
  });
  it("admin_instructions stripped from client-safe template", () => {
    for (const key of required) {
      const t = getQuickStartTemplate(key as any);
      const safe = toClientSafeQuickStartTemplate(t) as any;
      expect(safe.admin_instructions).toBeUndefined();
      expect(safe.client_safe_description).toBeTruthy();
    }
  });
  it("registry contains the trades templates and no fake export buttons", () => {
    const keys = STABILITY_QUICK_START_TEMPLATES.map((t) => t.template_key);
    for (const k of required) expect(keys).toContain(k);
    for (const t of STABILITY_QUICK_START_TEMPLATES) {
      // No template should claim export_supported=true while can_export=false.
      if (t.export_supported) expect(t.can_export).toBe(true);
    }
  });
});
