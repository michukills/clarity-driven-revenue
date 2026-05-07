/**
 * P89 — General Industry Deterministic Depth Expansion.
 *
 * Locks the additive P89 metric catalog to P86C/P87/P88 without creating a
 * second repair-map, conflict, access, or client-publication system.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  DEPTH_EVIDENCE_EXAMPLES,
  DEPTH_INDUSTRY_KEYS,
  findDepthForbiddenPhrase,
  type DepthGearKey,
} from "@/config/industryOperationalDepth";
import {
  APPROVED_RGS_POSITIONING_SENTENCE,
  INDUSTRY_DEPTH_ADMIN_ANNOTATIONS,
  INDUSTRY_DEPTH_EXPANSION_METRICS,
} from "@/config/industryDepthExpansion";
import {
  STABILITY_QUICK_START_TEMPLATES,
  type QuickStartTemplateKey,
} from "@/config/stabilityQuickStartTemplates";
import {
  SOURCE_OF_TRUTH_CONFLICT_REVIEW_HELPER_TEXT,
  getAllDepthMetricsForIndustry,
  getClientSafeDepthMetric,
  getClientSafeDepthMetricsForIndustry,
  getDepthMetricAdminAnnotation,
  getExpansionMetricsForIndustry,
  getSourceOfTruthConflictCapableDepthMetrics,
  isDepthMetricSourceOfTruthConflictCapable,
} from "@/lib/industryOperationalDepth";

const ROOT = process.cwd();
const TARGET_GEARS: DepthGearKey[] = [
  "demand_generation",
  "revenue_conversion",
  "operational_efficiency",
  "financial_visibility",
  "owner_independence",
];

const QUICK_START_KEYS = new Set<QuickStartTemplateKey>(
  STABILITY_QUICK_START_TEMPLATES.map((t) => t.template_key),
);
const ANNOTATION_BY_KEY = new Map(
  INDUSTRY_DEPTH_ADMIN_ANNOTATIONS.map((a) => [a.metric_key, a]),
);
const EVIDENCE_KEYS = new Set(DEPTH_EVIDENCE_EXAMPLES.map((e) => e.source_type));

function walkProductFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "__tests__") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkProductFiles(p, acc);
    else if (/\.(ts|tsx|md)$/.test(name)) acc.push(p);
  }
  return acc;
}

describe("P89 — deterministic depth expansion catalog", () => {
  it("all five target industries have at least twenty combined metrics", () => {
    for (const industry of DEPTH_INDUSTRY_KEYS) {
      const all = getAllDepthMetricsForIndustry(industry);
      expect(all.length, industry).toBeGreaterThanOrEqual(20);
      expect(getExpansionMetricsForIndustry(industry).length, industry).toBe(17);
    }
  });

  it("each target industry covers every RGS gear", () => {
    for (const industry of DEPTH_INDUSTRY_KEYS) {
      const gears = new Set(getAllDepthMetricsForIndustry(industry).flatMap((m) => m.gears));
      for (const gear of TARGET_GEARS) {
        expect(gears.has(gear), `${industry} missing ${gear}`).toBe(true);
      }
    }
  });

  it("expansion metric keys are unique and every metric has the required fields", () => {
    const keys = new Set<string>();
    for (const m of INDUSTRY_DEPTH_EXPANSION_METRICS) {
      expect(keys.has(m.metric_key), `duplicate metric key: ${m.metric_key}`).toBe(false);
      keys.add(m.metric_key);
      expect(m.metric_key).toMatch(/^[a-z]+\.p89\.[a-z0-9_]+$/);
      expect(DEPTH_INDUSTRY_KEYS).toContain(m.industry_key);
      expect(m.label.length).toBeGreaterThan(2);
      expect(m.gears.length).toBeGreaterThan(0);
      expect(m.trigger_rule.length).toBeGreaterThan(20);
      expect(m.threshold_unit === null || ["percent", "count", "ratio", "boolean", "days"].includes(m.threshold_unit)).toBe(true);
      expect(m.client_safe_explanation.length).toBeGreaterThan(20);
      expect(m.evidence_examples.length).toBeGreaterThan(0);
      for (const e of m.evidence_examples) expect(EVIDENCE_KEYS.has(e), `${m.metric_key} bad evidence ${e}`).toBe(true);
      expect(m.forward_risk.length).toBeGreaterThan(20);
      expect(m.repair_map_recommendation.length).toBeGreaterThan(20);
      expect(m.recommended_quick_start_templates.length).toBeGreaterThan(0);
    }
  });

  it("every expansion metric references valid Quick-Start templates and matching admin annotations", () => {
    for (const m of INDUSTRY_DEPTH_EXPANSION_METRICS) {
      for (const key of m.recommended_quick_start_templates) {
        expect(QUICK_START_KEYS.has(key as QuickStartTemplateKey), `${m.metric_key} bad template ${key}`).toBe(true);
      }
      const a = getDepthMetricAdminAnnotation(m.metric_key);
      expect(a, `${m.metric_key} missing annotation`).toBeTruthy();
      expect(a?.admin_only_note.length).toBeGreaterThan(20);
      expect(a?.repair_trigger).toBeTruthy();
      expect(a?.repair_map_trigger_behavior).toBe("additive_admin_annotation_only");
      expect(ANNOTATION_BY_KEY.get(m.metric_key)).toEqual(a);
    }
  });

  it("conflict-capable metrics are discoverable for admin review only", () => {
    const conflictCapable = getSourceOfTruthConflictCapableDepthMetrics();
    expect(conflictCapable.length).toBeGreaterThan(10);
    for (const m of conflictCapable) {
      expect(isDepthMetricSourceOfTruthConflictCapable(m.metric_key)).toBe(true);
    }
    expect(SOURCE_OF_TRUTH_CONFLICT_REVIEW_HELPER_TEXT).toMatch(/Source-of-Truth Conflict Flags™/);
    expect(SOURCE_OF_TRUTH_CONFLICT_REVIEW_HELPER_TEXT).toMatch(/do not auto-create|do not auto-publish/i);
  });

  it("client-safe helper strips admin-only annotations and raw trigger internals", () => {
    const metric = INDUSTRY_DEPTH_EXPANSION_METRICS.find((m) => isDepthMetricSourceOfTruthConflictCapable(m.metric_key));
    expect(metric).toBeTruthy();
    const safe = getClientSafeDepthMetric(metric!);
    const raw = safe as unknown as Record<string, unknown>;
    expect(raw.metric_key).toBeUndefined();
    expect(raw.trigger_rule).toBeUndefined();
    expect(raw.admin_only_note).toBeUndefined();
    expect(raw.repair_trigger).toBeUndefined();
    expect(raw.source_of_truth_conflict_capable).toBeUndefined();
    expect(raw.recommended_quick_start_templates).toEqual(expect.arrayContaining([expect.any(String)]));
  });

  it("client-safe text avoids forbidden claims and fake live-sync wording", () => {
    for (const m of INDUSTRY_DEPTH_EXPANSION_METRICS) {
      const safe = getClientSafeDepthMetric(m);
      const text = [
        safe.client_safe_explanation,
        safe.forward_risk,
        safe.repair_map_recommendation,
        ...safe.evidence_examples,
        ...safe.recommended_quick_start_templates,
      ].join(" ");
      expect(findDepthForbiddenPhrase(text), m.metric_key).toBeNull();
      expect(text).not.toMatch(/live[- ]?sync|real[- ]?time|automatic connector|auto-publish|auto-create/i);
    }
  });

  it("manual export/upload language remains honest when connector evidence appears", () => {
    for (const safe of getClientSafeDepthMetricsForIndustry("ecommerce")) {
      for (const label of safe.evidence_examples) {
        if (/Shopify|WooCommerce|Amazon|QuickBooks|Stripe|Square|PayPal|HubSpot|Salesforce|Pipedrive|Google|Meta/i.test(label)) {
          expect(label).toMatch(/manual upload/i);
        }
      }
    }
  });

  it("does not treat cannabis/MMJ/MMC as general healthcare in this expansion", () => {
    expect(getAllDepthMetricsForIndustry("mmj")).toEqual([]);
    expect(getAllDepthMetricsForIndustry("medical marijuana")).toEqual([]);
    const text = INDUSTRY_DEPTH_EXPANSION_METRICS.map((m) => `${m.label} ${m.client_safe_explanation}`).join(" ");
    expect(text).not.toMatch(/HIPAA|patient care|clinical|medical billing|healthcare operations/i);
  });
});

describe("P89 — Quick-Start template hardening", () => {
  it("the eight new templates are present, unique, and client-safe", () => {
    const expected: QuickStartTemplateKey[] = [
      "opening_closing_checklist",
      "inventory_count_sheet",
      "client_onboarding_checklist",
      "customer_support_response_tracker",
      "stockout_backorder_log",
      "owner_time_audit_worksheet",
      "proposal_pipeline_tracker",
      "channel_concentration_review",
    ];
    const keys = STABILITY_QUICK_START_TEMPLATES.map((t) => t.template_key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of expected) {
      const t = STABILITY_QUICK_START_TEMPLATES.find((x) => x.template_key === key);
      expect(t, key).toBeTruthy();
      expect(t?.title).toBeTruthy();
      expect(t?.industry_keys?.length).toBeGreaterThan(0);
      expect(TARGET_GEARS).toContain(t?.gear_key);
      expect(t?.when_to_use.length).toBeGreaterThan(20);
      expect(t?.first_step.length).toBeGreaterThan(20);
      expect(t?.owner_instructions.length).toBeGreaterThan(20);
      expect(t?.admin_instructions.length).toBeGreaterThan(20);
      expect(t?.client_safe_description.length).toBeGreaterThan(20);
      expect(t?.scope_boundary.length).toBeGreaterThan(20);
      expect(t?.fields_or_columns.length).toBeGreaterThan(3);
      expect(t?.can_export).toBe(false);
      expect(t?.export_supported).toBe(false);
    }
  });
});

describe("P89 — positioning guard", () => {
  it("keeps the approved positioning sentence and excludes deprecated construction wording from product source", () => {
    expect(APPROVED_RGS_POSITIONING_SENTENCE).toBe(
      "RGS builds the operating structure owners use to see what is slipping, decide what to fix, and run the business with more control.",
    );
    const forbidden = [
      ["RGS provides the ", "blueprint and teaches the owner to ", "lay the ", "bricks"].join(""),
      ["blueprint and teaches the owner to ", "lay the ", "bricks"].join(""),
      ["teaches the owner to ", "lay the ", "bricks"].join(""),
      ["lay the ", "bricks"].join(""),
    ];
    const productText = walkProductFiles(resolve(ROOT, "src"))
      .filter((p) => !p.includes(`${join("src", "lib", "__tests__")}`))
      .map((p) => readFileSync(p, "utf8"))
      .join("\n");
    for (const phrase of forbidden) {
      expect(productText.toLowerCase()).not.toContain(phrase.toLowerCase());
    }
  });
});
