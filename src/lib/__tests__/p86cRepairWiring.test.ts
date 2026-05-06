/**
 * P86C-Repair — UI wiring + Quick-Start template completeness tests.
 * No network. No AI. Static file + config inspection only.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  STABILITY_QUICK_START_TEMPLATES,
  toClientSafeQuickStartTemplate,
  type QuickStartTemplate,
  type QuickStartTemplateKey,
} from "@/config/stabilityQuickStartTemplates";
import { findDepthForbiddenPhrase } from "@/config/industryOperationalDepth";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const NEW_KEYS: QuickStartTemplateKey[] = [
  "menu_margin_tracker",
  "daily_sales_and_labor_log",
  "dead_stock_liquidation_plan",
  "category_margin_review",
  "utilization_tracker",
  "scope_change_log",
  "ar_aging_review",
  "fulfillment_sla_tracker",
  "return_reason_log",
  "repeat_purchase_tracker",
];

describe("P86C-Repair — admin/client components exist", () => {
  it("admin panel file exists", () => {
    expect(existsSync(resolve(ROOT, "src/components/admin/IndustryOperationalDepthPanel.tsx"))).toBe(true);
  });
  it("client list file exists", () => {
    expect(existsSync(resolve(ROOT, "src/components/portal/IndustryOperationalDepthList.tsx"))).toBe(true);
  });
});

describe("P86C-Repair — admin page wiring", () => {
  const src = read("src/pages/admin/CustomerDetail.tsx");
  it("imports admin panel", () => {
    expect(src).toMatch(/IndustryOperationalDepthPanel/);
    expect(src).toMatch(/from\s+"@\/components\/admin\/IndustryOperationalDepthPanel"/);
  });
  it("mounts admin panel with customerId + industryKey", () => {
    expect(src).toMatch(/<IndustryOperationalDepthPanel[\s\S]*customerId=/);
    expect(src).toMatch(/<IndustryOperationalDepthPanel[\s\S]*industryKey=/);
  });
});

describe("P86C-Repair — client report wiring", () => {
  const src = read("src/pages/portal/ReportView.tsx");
  it("imports client list", () => {
    expect(src).toMatch(/IndustryOperationalDepthList/);
    expect(src).toMatch(/from\s+"@\/components\/portal\/IndustryOperationalDepthList"/);
  });
  it("mounts client list with customerId", () => {
    expect(src).toMatch(/<IndustryOperationalDepthList[\s\S]*customerId=/);
  });
});

describe("P86C-Repair — Quick-Start template completeness", () => {
  const byKey = new Map<string, QuickStartTemplate>(
    STABILITY_QUICK_START_TEMPLATES.map((t) => [t.template_key, t]),
  );

  it("every new template key exists in registry", () => {
    for (const k of NEW_KEYS) expect(byKey.has(k)).toBe(true);
  });

  it("no duplicate template keys in registry", () => {
    const keys = STABILITY_QUICK_START_TEMPLATES.map((t) => t.template_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("each new template has at least 4 fields and required structure", () => {
    for (const k of NEW_KEYS) {
      const t = byKey.get(k)!;
      expect(t.fields_or_columns.length).toBeGreaterThanOrEqual(4);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.gear_key.length).toBeGreaterThan(0);
      expect(t.failure_pattern.length).toBeGreaterThan(0);
      expect(t.when_to_use.length).toBeGreaterThan(0);
      expect(t.first_step.length).toBeGreaterThan(0);
      expect(t.owner_instructions.length).toBeGreaterThan(0);
      expect(t.admin_instructions.length).toBeGreaterThan(0);
      expect(t.client_safe_description.length).toBeGreaterThan(0);
      expect(t.scope_boundary.length).toBeGreaterThan(0);
    }
  });

  it("export_supported and can_export are false (no real export wired)", () => {
    for (const k of NEW_KEYS) {
      const t = byKey.get(k)!;
      expect(t.export_supported).toBe(false);
      expect(t.can_export).toBe(false);
    }
  });

  it("client-safe helper strips admin_instructions", () => {
    for (const k of NEW_KEYS) {
      const t = byKey.get(k)!;
      const safe = toClientSafeQuickStartTemplate(t) as Record<string, unknown>;
      expect("admin_instructions" in safe).toBe(false);
    }
  });

  it("no forbidden depth phrases in client-facing copy", () => {
    for (const k of NEW_KEYS) {
      const t = byKey.get(k)!;
      expect(findDepthForbiddenPhrase(t.client_safe_description)).toBeNull();
      expect(findDepthForbiddenPhrase(t.owner_instructions)).toBeNull();
      expect(findDepthForbiddenPhrase(t.first_step)).toBeNull();
      expect(findDepthForbiddenPhrase(t.scope_boundary)).toBeNull();
    }
  });

  it("no banned legacy positioning phrase in client-facing copy", () => {
    const banned = ["mirror", ",", " not the map"].join("");
    for (const k of NEW_KEYS) {
      const t = byKey.get(k)!;
      expect(t.client_safe_description.toLowerCase()).not.toContain(banned);
      expect(t.owner_instructions.toLowerCase()).not.toContain(banned);
    }
  });
});

describe("P86C-Repair — client list safety", () => {
  const src = read("src/components/portal/IndustryOperationalDepthList.tsx");
  it("uses getClientDepthReviews", () => {
    expect(src).toMatch(/getClientDepthReviews/);
  });
  it("uses findDepthForbiddenPhrase", () => {
    expect(src).toMatch(/findDepthForbiddenPhrase/);
  });
  it("does not reference admin_notes or evidence_id", () => {
    expect(src).not.toMatch(/admin_notes/);
    expect(src).not.toMatch(/evidence_id/);
  });
  it("includes report-safe disclaimer", () => {
    expect(src.toLowerCase()).toMatch(/operating-readiness|operational-readiness/);
    expect(src.toLowerCase()).toContain("not determine legal compliance");
  });
});

describe("P86C-Repair — admin panel safety", () => {
  const src = read("src/components/admin/IndustryOperationalDepthPanel.tsx");
  it("uses findDepthForbiddenPhrase", () => {
    expect(src).toMatch(/findDepthForbiddenPhrase/);
  });
  it("labels evidence as manual export / upload", () => {
    expect(src.toLowerCase()).toContain("manual export / upload");
  });
  it("uses approve / unapprove helpers", () => {
    expect(src).toMatch(/approveDepthForClient/);
    expect(src).toMatch(/unapproveDepth/);
  });
  it("does not call AI gateway / lovable AI / openai", () => {
    expect(src).not.toMatch(/lovable-ai|openai|ai-gateway|invoke\(.*ai/i);
  });
});