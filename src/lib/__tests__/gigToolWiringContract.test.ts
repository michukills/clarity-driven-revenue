/**
 * P100A — Tool-screen wiring contract.
 *
 * Covers the new alias resolver, the pure composer that backs
 * `useGigCustomerScope`, and the file-level wiring of
 * `StandaloneToolRunner` + `ToolRunnerShell` so the gig scope banner and
 * denial guard stay attached.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { resolveGigToolKey } from "@/lib/gig/gigToolKeyMap";
import { composeGigCustomerScope } from "@/lib/gig/useGigCustomerScope";
import { GIG_TOOL_REGISTRY, FULL_CLIENT_ONLY_TOOLS } from "@/lib/gig/gigTier";

const read = (p: string) => readFileSync(path.resolve(p), "utf8");

describe("P100A — Tool key alias resolution", () => {
  it("maps standalone-runner aliases to canonical gig registry keys", () => {
    expect(resolveGigToolKey("buyer_persona_tool")).toEqual({ kind: "gig", key: "buyer_persona_icp" });
    expect(resolveGigToolKey("workflow_process_mapping")).toEqual({ kind: "gig", key: "workflow_process_map" });
    expect(resolveGigToolKey("swot_analysis")).toEqual({ kind: "gig", key: "swot_strategic_matrix" });
    expect(resolveGigToolKey("persona_builder")).toEqual({ kind: "gig", key: "buyer_persona_icp" });
    expect(resolveGigToolKey("process_breakdown")).toEqual({ kind: "gig", key: "workflow_process_map" });
  });

  it("recognises canonical gig keys directly", () => {
    for (const k of Object.keys(GIG_TOOL_REGISTRY)) {
      expect(resolveGigToolKey(k).kind).toBe("gig");
    }
  });

  it("flags full-client-only tools so gig customers cannot reach them", () => {
    for (const k of FULL_CLIENT_ONLY_TOOLS) {
      expect(resolveGigToolKey(k)).toEqual({ kind: "full_client_only", key: k });
    }
    expect(resolveGigToolKey("revenue_review_sync").kind).toBe("full_client_only");
    expect(resolveGigToolKey("stability_scorecard").kind).toBe("full_client_only");
  });

  it("unknown keys are reported, not silently accepted", () => {
    expect(resolveGigToolKey("definitely_made_up_tool")).toEqual({ kind: "unknown" });
    expect(resolveGigToolKey(null)).toEqual({ kind: "unknown" });
  });
});

describe("P100A — composeGigCustomerScope", () => {
  const baseRow = (overrides: Record<string, any> = {}) => ({
    id: "c1",
    full_name: "Pat",
    business_name: "Shop",
    email: "pat@shop.example",
    is_gig: true,
    gig_tier: "basic",
    gig_status: "active",
    gig_package_type: "SOP package",
    account_kind: "gig_work",
    ...overrides,
  });

  it("propagates Basic tier metadata into AI + report scope", () => {
    const s = composeGigCustomerScope({
      loading: false,
      row: baseRow({ gig_tier: "basic" }),
      customerId: "c1",
      toolKey: "sop_training_bible",
    });
    expect(s.isGig).toBe(true);
    expect(s.gigTier).toBe("basic");
    expect(s.aiScope.gig_mode).toBe(true);
    expect(s.aiScope.allowed_depth).toBe("light");
    expect(s.aiScope.output_length_target).toBe("short");
    expect(s.reportScope.customer_type).toBe("gig");
    expect(s.reportScope.gig_tier).toBe("basic");
    expect(s.reportScope.report_mode).toBe("gig_report");
    expect(s.reportScope.rgs_report_available).toBe(false);
    expect(s.reportScope.allowed_sections).toEqual(["summary", "key_findings", "next_actions"]);
  });

  it("propagates Standard tier with structured depth", () => {
    const s = composeGigCustomerScope({
      loading: false,
      row: baseRow({ gig_tier: "standard" }),
      customerId: "c1",
      toolKey: "swot_analysis",
    });
    expect(s.aiScope.allowed_depth).toBe("structured");
    expect(s.aiScope.output_length_target).toBe("medium");
    expect(s.access.allowed).toBe(true);
    expect(s.reportScope.allowed_sections).toContain("structured_analysis");
  });

  it("propagates Premium tier with deep depth and full gig sections", () => {
    const s = composeGigCustomerScope({
      loading: false,
      row: baseRow({ gig_tier: "premium" }),
      customerId: "c1",
      toolKey: "campaign_strategy",
    });
    expect(s.aiScope.allowed_depth).toBe("deep");
    expect(s.reportScope.allowed_sections).toEqual(
      expect.arrayContaining(["swot", "positioning", "channel_plan", "kpi_outline"]),
    );
    expect(s.access.allowed).toBe(true);
  });

  it("denies Basic tier when tool requires Standard or higher, with specific reason", () => {
    const s = composeGigCustomerScope({
      loading: false,
      row: baseRow({ gig_tier: "basic" }),
      customerId: "c1",
      toolKey: "swot_analysis", // canonical: swot_strategic_matrix (Standard+)
    });
    expect(s.access.allowed).toBe(false);
    expect(s.access.reason).toMatch(/not included in this gig package/i);
    expect(s.access.reason).toMatch(/Standard or higher/);
  });

  it("denies any full-client-only tool for a gig customer regardless of tier", () => {
    for (const tier of ["basic", "standard", "premium"] as const) {
      const s = composeGigCustomerScope({
        loading: false,
        row: baseRow({ gig_tier: tier }),
        customerId: "c1",
        toolKey: "owner_diagnostic_interview",
      });
      expect(s.access.allowed).toBe(false);
      expect(s.access.reason).toMatch(/Convert to a full RGS engagement/i);
    }
  });

  it("archived gig customers are denied with a specific reason", () => {
    const s = composeGigCustomerScope({
      loading: false,
      row: baseRow({ gig_status: "archived", gig_tier: "premium" }),
      customerId: "c1",
      toolKey: "sop_training_bible",
    });
    expect(s.access.allowed).toBe(false);
    expect(s.access.reason).toMatch(/archived/i);
  });

  it("full clients do not enter gig mode and keep the full report option", () => {
    const s = composeGigCustomerScope({
      loading: false,
      row: { id: "fc", is_gig: false, account_kind: "client" },
      customerId: "fc",
      toolKey: "sop_training_bible",
    });
    expect(s.isGig).toBe(false);
    expect(s.aiScope.gig_mode).toBe(false);
    expect(s.aiScope.allowed_depth).toBe("deep");
    expect(s.reportScope.report_mode).toBe("full_rgs_report");
    expect(s.reportScope.rgs_report_available).toBe(true);
    expect(s.reportScope.excluded_sections).toEqual([]);
    expect(s.access.allowed).toBe(true);
  });

  it("missing tier degrades safely without leaking full RGS depth", () => {
    const s = composeGigCustomerScope({
      loading: false,
      row: baseRow({ gig_tier: null }),
      customerId: "c1",
      toolKey: "sop_training_bible",
    });
    expect(s.aiScope.allowed_depth).toBe("light");
    expect(s.aiScope.scope_limitations.join(" ")).toMatch(/Decline to produce/);
    expect(s.access.allowed).toBe(false);
    expect(s.access.reason).toMatch(/Set a gig package tier/);
  });

  it("no-customer state is stable and never grants gig metadata", () => {
    const s = composeGigCustomerScope({
      loading: false,
      row: null,
      customerId: null,
      toolKey: null,
    });
    expect(s.isGig).toBe(false);
    expect(s.aiScope.gig_mode).toBe(false);
    expect(s.reportScope.report_mode).toBe("full_rgs_report");
  });
});

describe("P100A — File-level wiring", () => {
  it("StandaloneToolRunner consumes the gig scope hook and gates openTool/generate", () => {
    const src = read("src/pages/admin/StandaloneToolRunner.tsx");
    expect(src).toMatch(/useGigCustomerScope/);
    expect(src).toMatch(/GigAccountBadge/);
    expect(src).toMatch(/GigTierBadge/);
    // Both action paths must short-circuit when gigScope denies the tool.
    const openToolBlock = src.slice(src.indexOf("const openTool"), src.indexOf("const generate"));
    expect(openToolBlock).toMatch(/gigScope\.isGig[\s\S]*gigScope\.access\.allowed/);
    const generateBlock = src.slice(src.indexOf("const generate"));
    expect(generateBlock).toMatch(/gigScope\.isGig[\s\S]*gigScope\.access\.allowed/);
  });

  it("ToolRunnerShell renders the gig scope banner with badges and denial reason", () => {
    const src = read("src/components/tools/ToolRunnerShell.tsx");
    expect(src).toMatch(/useGigCustomerScope/);
    expect(src).toMatch(/data-testid="tool-runner-gig-scope"/);
    expect(src).toMatch(/data-testid="tool-runner-gig-denied"/);
  });
});

describe("P100A — Copy safety in selector + denial strings", () => {
  it("no forbidden hype/guarantee/full-OS phrases in the new gig files", async () => {
    const files = [
      "src/lib/gig/gigTier.ts",
      "src/lib/gig/gigToolKeyMap.ts",
      "src/lib/gig/useGigCustomerScope.ts",
      "src/components/admin/gig/GigCustomerSelector.tsx",
      "src/components/admin/gig/GigCustomerManager.tsx",
    ];
    const forbidden = [
      /\bunlimited\b/i,
      /full os access/i,
      /\bguaranteed\b/i,
      /\b10x\b/i,
      /explosive growth/i,
      /\bdominate\b/i,
      /done-for-you operator/i,
      /fully managed marketing department/i,
    ];
    for (const f of files) {
      const src = read(f);
      for (const re of forbidden) {
        // Allow the FORBIDDEN_GIG_PHRASES list inside gigTier.ts (it's a
        // safety guard, not user copy).
        if (f.endsWith("gigTier.ts") && re.test(src)) {
          const inGuardList = src.split(/FORBIDDEN_GIG_PHRASES/).length > 1;
          expect(inGuardList).toBe(true);
          continue;
        }
        expect(src).not.toMatch(re);
      }
    }
  });

  it("standalone copy uses purchased-scope language", () => {
    const selector = read("src/components/admin/gig/GigCustomerSelector.tsx");
    expect(selector.toLowerCase()).toMatch(/standalone deliverable/);
    const runner = read("src/pages/admin/StandaloneToolRunner.tsx");
    expect(runner.toLowerCase()).toMatch(/standalone deliverable/);
  });
});

describe("P100A — Regression", () => {
  const app = read("src/App.tsx");
  it("/scorecard route still defined (component redirects to /scan)", () => {
    expect(app).toMatch(/path="\/scorecard"/);
  });
  it("/diagnostic/scorecard remains gated by ProtectedRoute", () => {
    const idx = app.indexOf('"/diagnostic/scorecard"');
    expect(idx).toBeGreaterThan(-1);
    expect(app.slice(idx, idx + 800)).toMatch(/ProtectedRoute/);
  });
  it("/scan public route untouched", () => {
    expect(app).toMatch(/path="\/scan"/);
  });
});
