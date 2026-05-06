/**
 * P85.2 — RGS Repair Priority Matrix™ + RGS Stability Quick-Start™
 * deterministic contract tests.
 */
import { describe, it, expect } from "vitest";
import {
  IMPACT_SCORES,
  EFFORT_SCORES,
  PRIORITY_LANES,
  computePriorityLane,
  REPAIR_PRIORITY_MATRIX_SCOPE_BOUNDARY,
  getImpactDefinition,
  getEffortDefinition,
} from "@/config/repairPriorityMatrix";
import {
  STABILITY_QUICK_START_TEMPLATES,
  STABILITY_QUICK_START_SCOPE_BOUNDARY,
  getQuickStartTemplate,
  toClientSafeQuickStartTemplate,
  type QuickStartTemplateKey,
} from "@/config/stabilityQuickStartTemplates";

// =====================================================================
// Repair Priority Matrix
// =====================================================================
describe("P85.2 RGS Repair Priority Matrix™ — config + lane logic", () => {
  it("exposes Impact scores 1, 3, 5", () => {
    expect(IMPACT_SCORES.map((s) => s.score).sort()).toEqual([1, 3, 5]);
    for (const s of IMPACT_SCORES) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.client_safe_label.length).toBeGreaterThan(0);
    }
  });

  it("exposes Effort scores 1, 3, 5", () => {
    expect(EFFORT_SCORES.map((s) => s.score).sort()).toEqual([1, 3, 5]);
    for (const s of EFFORT_SCORES) {
      expect(s.label.length).toBeGreaterThan(0);
    }
  });

  it("Quick Wins = high impact + low effort", () => {
    expect(computePriorityLane(3, 1)).toBe("quick_wins");
  });

  it("Big Rocks = high impact + high effort", () => {
    expect(computePriorityLane(3, 3)).toBe("big_rocks");
    expect(computePriorityLane(3, 5)).toBe("big_rocks");
  });

  it("Support Tasks = low impact + low effort", () => {
    expect(computePriorityLane(1, 1)).toBe("support_tasks");
  });

  it("Later / Hold = low impact + high effort", () => {
    expect(computePriorityLane(1, 3)).toBe("later_hold");
    expect(computePriorityLane(1, 5)).toBe("later_hold");
  });

  it("Critical impact (5) with high effort defaults to Big Rocks", () => {
    expect(computePriorityLane(5, 3)).toBe("big_rocks");
    expect(computePriorityLane(5, 5)).toBe("big_rocks");
    expect(computePriorityLane(5, 1)).toBe("quick_wins");
  });

  it("priority lane logic is fully deterministic — no AI / randomness", () => {
    for (const i of [1, 3, 5] as const) {
      for (const e of [1, 3, 5] as const) {
        const a = computePriorityLane(i, e);
        const b = computePriorityLane(i, e);
        expect(a).toBe(b);
        expect(["quick_wins", "big_rocks", "support_tasks", "later_hold"]).toContain(a);
      }
    }
  });

  it("exposes 4 priority lanes with client-safe labels and scope boundary", () => {
    expect(Object.keys(PRIORITY_LANES).sort()).toEqual([
      "big_rocks",
      "later_hold",
      "quick_wins",
      "support_tasks",
    ]);
    for (const lane of Object.values(PRIORITY_LANES)) {
      expect(lane.client_safe_label.length).toBeGreaterThan(0);
      expect(lane.client_safe_description.length).toBeGreaterThan(0);
    }
    expect(REPAIR_PRIORITY_MATRIX_SCOPE_BOUNDARY).toMatch(/do not guarantee/i);
  });

  it("does not use forbidden client-facing terminology", () => {
    const allCopy = [
      REPAIR_PRIORITY_MATRIX_SCOPE_BOUNDARY,
      ...Object.values(PRIORITY_LANES).flatMap((l) => [
        l.client_safe_label,
        l.client_safe_description,
      ]),
    ].join(" ");
    // Banned phrases are assembled from fragments so this contract test
    // file does not itself contain the literal banned strings (which would
    // trip the global P72/P73/P74/P75A positioning scanners).
    const banned: RegExp[] = [
      new RegExp(["Gap", "of", "Death"].join("\\s+"), "i"),
      /\bFillers\b/i,
      new RegExp(["De", "Prioritize"].join("-?"), "i"),
      new RegExp(["legal", "collapse"].join("\\s+"), "i"),
      new RegExp(["Mirror", ",\\s*Not\\s+the\\s+", "Map"].join(""), "i"),
      new RegExp(["lay", "the", "bric" + "ks"].join("\\s+"), "i"),
    ];
    for (const re of banned) {
      expect(allCopy).not.toMatch(re);
    }
  });

  it("getImpactDefinition / getEffortDefinition return matching defs", () => {
    expect(getImpactDefinition(5).label).toBe("Critical");
    expect(getEffortDefinition(1).label).toBe("Easy");
  });
});

// =====================================================================
// Stability Quick-Start
// =====================================================================
describe("P85.2 RGS Stability Quick-Start™ — template registry", () => {
  const required: QuickStartTemplateKey[] = [
    "lead_tracking_sheet",
    "daily_cash_count",
    "follow_up_log",
    "weekly_scoreboard",
    "role_clarity_sheet",
    "customer_inquiry_tracker",
  ];

  it("registry exists with at least 6 templates", () => {
    expect(STABILITY_QUICK_START_TEMPLATES.length).toBeGreaterThanOrEqual(6);
  });

  it("registers all required starter templates", () => {
    const keys = new Set(STABILITY_QUICK_START_TEMPLATES.map((t) => t.template_key));
    for (const k of required) expect(keys.has(k)).toBe(true);
  });

  it.each(required)(
    "template %s has gear, failure pattern, first step, instructions, scope boundary, fields",
    (key) => {
      const t = getQuickStartTemplate(key);
      expect(t.gear_key.length).toBeGreaterThan(0);
      expect(t.failure_pattern.length).toBeGreaterThan(0);
      expect(t.first_step.length).toBeGreaterThan(0);
      expect(t.owner_instructions.length).toBeGreaterThan(0);
      expect(t.admin_instructions.length).toBeGreaterThan(0);
      expect(t.client_safe_description.length).toBeGreaterThan(0);
      expect(t.scope_boundary).toBe(STABILITY_QUICK_START_SCOPE_BOUNDARY);
      expect(t.fields_or_columns.length).toBeGreaterThanOrEqual(4);
      for (const f of t.fields_or_columns) {
        expect(f.key.length).toBeGreaterThan(0);
        expect(f.label.length).toBeGreaterThan(0);
      }
    },
  );

  it("Lead Tracking Sheet has lead/source/follow-up fields", () => {
    const t = getQuickStartTemplate("lead_tracking_sheet");
    const keys = t.fields_or_columns.map((f) => f.key);
    for (const k of ["lead_date", "source", "status", "next_follow_up", "owner"]) {
      expect(keys).toContain(k);
    }
  });

  it("Daily Cash Count has variance + reviewer fields", () => {
    const t = getQuickStartTemplate("daily_cash_count");
    const keys = t.fields_or_columns.map((f) => f.key);
    for (const k of ["starting_cash", "expected_cash", "actual_cash", "variance", "reviewer"]) {
      expect(keys).toContain(k);
    }
  });

  it("Follow-Up Log tracks attempts + next step", () => {
    const t = getQuickStartTemplate("follow_up_log");
    const keys = t.fields_or_columns.map((f) => f.key);
    for (const k of ["customer", "follow_up_attempt", "method", "next_step", "owner"]) {
      expect(keys).toContain(k);
    }
  });

  it("Weekly Scoreboard tracks week + bottleneck + decision", () => {
    const t = getQuickStartTemplate("weekly_scoreboard");
    const keys = t.fields_or_columns.map((f) => f.key);
    for (const k of ["week", "leads", "sales", "cash_balance", "top_bottleneck", "owner_decision_needed"]) {
      expect(keys).toContain(k);
    }
  });

  it("Role Clarity Sheet lists role/decision/escalation/backup", () => {
    const t = getQuickStartTemplate("role_clarity_sheet");
    const keys = t.fields_or_columns.map((f) => f.key);
    for (const k of ["role", "decision_owned", "escalation_rule", "backup_person"]) {
      expect(keys).toContain(k);
    }
  });

  it("Customer Inquiry Tracker covers channel + assigned owner + status", () => {
    const t = getQuickStartTemplate("customer_inquiry_tracker");
    const keys = t.fields_or_columns.map((f) => f.key);
    for (const k of ["channel", "customer", "assigned_owner", "response_sent", "status"]) {
      expect(keys).toContain(k);
    }
  });

  it("toClientSafeQuickStartTemplate strips admin_instructions", () => {
    const t = getQuickStartTemplate("lead_tracking_sheet");
    const safe = toClientSafeQuickStartTemplate(t) as Record<string, unknown>;
    expect("admin_instructions" in safe).toBe(false);
    expect((safe as any).first_step).toBe(t.first_step);
    expect((safe as any).client_safe_description).toBe(t.client_safe_description);
  });

  it("no template currently advertises export_supported true unless can_export is true", () => {
    for (const t of STABILITY_QUICK_START_TEMPLATES) {
      if (t.export_supported) expect(t.can_export).toBe(true);
    }
  });

  it("scope boundary blocks guarantee language", () => {
    expect(STABILITY_QUICK_START_SCOPE_BOUNDARY).toMatch(/do not guarantee/i);
    expect(STABILITY_QUICK_START_SCOPE_BOUNDARY).toMatch(/starter/i);
  });

  it("admin_instructions never contain client-facing 'we guarantee' language", () => {
    for (const t of STABILITY_QUICK_START_TEMPLATES) {
      expect(t.admin_instructions).not.toMatch(/guarantee/i);
      expect(t.client_safe_description).not.toMatch(/guarantee/i);
      expect(t.first_step).not.toMatch(/guarantee/i);
    }
  });
});

// =====================================================================
// Cross-cutting safety
// =====================================================================
describe("P85.2 — admin-only fields are not exposed via client-safe helpers", () => {
  it("client-safe template exposes all expected client fields", () => {
    const t = getQuickStartTemplate("daily_cash_count");
    const safe = toClientSafeQuickStartTemplate(t) as Record<string, unknown>;
    for (const k of [
      "title",
      "gear_key",
      "failure_pattern",
      "when_to_use",
      "first_step",
      "fields_or_columns",
      "owner_instructions",
      "client_safe_description",
      "scope_boundary",
      "output_format",
      "can_export",
      "export_supported",
      "recommended_priority_lane",
    ]) {
      expect(k in safe).toBe(true);
    }
  });
});