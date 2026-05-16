/**
 * P100 — Gig customer + tier gating contract tests.
 *
 * Covers:
 *  - tier eligibility for every gig-eligible tool
 *  - full-client-only tools remain blocked for gig customers regardless of tier
 *  - selector classifies gig rows, hides archived by default
 *  - AI scope context tier-depth contract
 *  - report scope metadata
 *  - copy safety (no guaranteed/full-OS language)
 *  - public funnel & protected scorecard regression
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  checkGigToolAccess,
  buildGigAiScopeContext,
  buildGigReportScopeMetadata,
  detectUnsafeGigCopy,
  FULL_CLIENT_ONLY_TOOLS,
  GIG_TOOL_REGISTRY,
  GIG_TIERS,
  GIG_DENIAL_REASONS,
  tierMeets,
} from "@/lib/gig/gigTier";
import {
  applyEligibilityFilters,
  classifyCustomerForSelector,
} from "@/lib/admin/eligibleCustomerSelector";

describe("P100 — Tier comparison", () => {
  it("basic does not satisfy standard or premium", () => {
    expect(tierMeets("basic", "basic")).toBe(true);
    expect(tierMeets("basic", "standard")).toBe(false);
    expect(tierMeets("basic", "premium")).toBe(false);
  });
  it("premium satisfies all tiers", () => {
    for (const t of GIG_TIERS) {
      expect(tierMeets("premium", t)).toBe(true);
    }
  });
  it("null tier never satisfies anything", () => {
    expect(tierMeets(null, "basic")).toBe(false);
  });
});

describe("P100 — Tool access gating", () => {
  it("blocks every full-RGS-only tool for gig customers regardless of tier", () => {
    for (const tool of FULL_CLIENT_ONLY_TOOLS) {
      for (const tier of GIG_TIERS) {
        const r = checkGigToolAccess(tool, { isGig: true, gigTier: tier, gigStatus: "active" });
        expect(r.allowed).toBe(false);
        expect(r.reason).toMatch(/Convert to a full RGS engagement/i);
      }
    }
  });

  it("allows full-RGS-only tools for non-gig (full client) accounts", () => {
    for (const tool of FULL_CLIENT_ONLY_TOOLS) {
      const r = checkGigToolAccess(tool, { isGig: false, gigTier: null, gigStatus: null });
      expect(r.allowed).toBe(true);
    }
  });

  it("Basic gig customer cannot access Standard- or Premium-tier tools", () => {
    const swot = checkGigToolAccess("swot_strategic_matrix", {
      isGig: true,
      gigTier: "basic",
      gigStatus: "active",
    });
    expect(swot.allowed).toBe(false);
    expect(swot.reason).toBe(GIG_DENIAL_REASONS.notIncludedInPackage + " Upgrade to Standard or higher to access it.");

    const campaignStrategy = checkGigToolAccess("campaign_strategy", {
      isGig: true,
      gigTier: "basic",
      gigStatus: "active",
    });
    expect(campaignStrategy.allowed).toBe(false);
  });

  it("Standard gig customer accesses Basic+Standard tools, not Premium-only", () => {
    expect(checkGigToolAccess("sop_training_bible", { isGig: true, gigTier: "standard", gigStatus: "active" }).allowed).toBe(true);
    expect(checkGigToolAccess("swot_strategic_matrix", { isGig: true, gigTier: "standard", gigStatus: "active" }).allowed).toBe(true);
    expect(checkGigToolAccess("campaign_strategy", { isGig: true, gigTier: "standard", gigStatus: "active" }).allowed).toBe(false);
  });

  it("Premium gig customer accesses every gig tool", () => {
    for (const key of Object.keys(GIG_TOOL_REGISTRY)) {
      const r = checkGigToolAccess(key, { isGig: true, gigTier: "premium", gigStatus: "active" });
      expect(r.allowed).toBe(true);
    }
  });

  it("archived gig customer cannot run any tool", () => {
    const r = checkGigToolAccess("sop_training_bible", {
      isGig: true,
      gigTier: "premium",
      gigStatus: "archived",
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe(GIG_DENIAL_REASONS.archived);
  });

  it("unknown standalone tool denies with specific reason", () => {
    const r = checkGigToolAccess("nonexistent_tool", { isGig: true, gigTier: "premium", gigStatus: "active" });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe(GIG_DENIAL_REASONS.notEligible);
  });

  it("denied access reasons are specific (never generic)", () => {
    const reasons = Object.values(GIG_DENIAL_REASONS);
    for (const r of reasons) {
      expect(r.length).toBeGreaterThan(10);
      expect(r.toLowerCase()).not.toMatch(/something went wrong|no data|unavailable/);
    }
  });
});

describe("P100 — Selector behavior", () => {
  const gigRow = {
    id: "gig-1",
    email: "founder@gigshop.example",
    full_name: "Pat Founder",
    business_name: "Gig Shop",
    is_gig: true,
    gig_tier: "standard",
    gig_status: "active",
    account_kind: "gig_work",
    service_type: "standalone deliverable",
    lifecycle_state: "lead",
    archived_at: null,
  };
  const archivedGig = { ...gigRow, id: "gig-2", archived_at: new Date().toISOString() };
  const fullClient = {
    id: "fc-1",
    email: "ceo@client.example",
    full_name: "Real Client",
    business_name: "Client Co",
    account_kind: "client",
    lifecycle_state: "diagnostic",
    has_real_payment: true,
    archived_at: null,
  };

  it("classifier surfaces gig metadata so selectors can render badges", () => {
    const opt = classifyCustomerForSelector(gigRow);
    expect(opt.eligible.standaloneGig).toBe(true);
    expect(opt.classification.accountKind).toBe("gig_work");
    expect(opt.raw.gig_tier).toBe("standard");
    expect(opt.raw.is_gig).toBe(true);
  });

  it("standalone_gig run mode includes both gig customers and full clients", () => {
    const rows = applyEligibilityFilters([gigRow, fullClient], { runMode: "standalone_gig" });
    expect(rows.map((r) => r.id).sort()).toEqual(["fc-1", "gig-1"]);
  });

  it("archived rows are hidden by default", () => {
    const rows = applyEligibilityFilters([gigRow, archivedGig], { runMode: "standalone_gig" });
    expect(rows.map((r) => r.id)).toEqual(["gig-1"]);
  });

  it("archived rows appear when admin explicitly opts in", () => {
    const rows = applyEligibilityFilters([gigRow, archivedGig], {
      runMode: "standalone_gig",
      includeArchived: true,
    });
    expect(rows.map((r) => r.id).sort()).toEqual(["gig-1", "gig-2"]);
  });
});

describe("P100 — AI scope context tier-depth contract", () => {
  it("non-gig accounts get full-depth scope and no excluded sections", () => {
    const c = buildGigAiScopeContext({ isGig: false, gigTier: null });
    expect(c.gig_mode).toBe(false);
    expect(c.allowed_depth).toBe("deep");
    expect(c.excluded_full_rgs_sections).toEqual([]);
  });

  it("each gig tier produces a distinct depth+length combination", () => {
    const b = buildGigAiScopeContext({ isGig: true, gigTier: "basic" });
    const s = buildGigAiScopeContext({ isGig: true, gigTier: "standard" });
    const p = buildGigAiScopeContext({ isGig: true, gigTier: "premium" });
    expect(b.allowed_depth).toBe("light");
    expect(s.allowed_depth).toBe("structured");
    expect(p.allowed_depth).toBe("deep");
    expect(b.output_length_target).toBe("short");
    expect(s.output_length_target).toBe("medium");
    expect(p.output_length_target).toBe("long");
  });

  it("every gig mode context excludes full-RGS sections", () => {
    for (const tier of GIG_TIERS) {
      const c = buildGigAiScopeContext({ isGig: true, gigTier: tier });
      expect(c.excluded_full_rgs_sections).toEqual(
        expect.arrayContaining([
          "full_diagnostic_scorecard",
          "owner_interview",
          "diagnostic_report",
          "priority_repair_map",
          "implementation_roadmap",
          "control_system_monitoring",
        ]),
      );
      expect(c.scope_limitations.join(" ")).toMatch(/Do not promise outcomes/);
    }
  });

  it("missing tier in gig mode degrades safely to lightest depth and refuses to deliver", () => {
    const c = buildGigAiScopeContext({ isGig: true, gigTier: null });
    expect(c.allowed_depth).toBe("light");
    expect(c.scope_limitations.join(" ")).toMatch(/Decline to produce/);
  });
});

describe("P100 — Report scope metadata for P101 compatibility", () => {
  it("basic gig report exposes the narrowest allowed sections", () => {
    const m = buildGigReportScopeMetadata({ isGig: true, gigTier: "basic", toolKey: "sop_training_bible" });
    expect(m.customer_type).toBe("gig");
    expect(m.allowed_sections).toEqual(["summary", "key_findings", "next_actions"]);
    expect(m.excluded_sections).toEqual(
      expect.arrayContaining(["full_diagnostic_scorecard", "control_system_monitoring"]),
    );
  });
  it("premium gig report includes structured + SWOT/positioning but never full-RGS sections", () => {
    const m = buildGigReportScopeMetadata({ isGig: true, gigTier: "premium" });
    expect(m.allowed_sections).toEqual(
      expect.arrayContaining(["structured_analysis", "swot", "positioning", "channel_plan", "kpi_outline"]),
    );
    expect(m.excluded_sections).toEqual(
      expect.arrayContaining(["implementation_roadmap", "control_system_monitoring"]),
    );
  });
  it("full client report defaults to client_safe visibility", () => {
    const m = buildGigReportScopeMetadata({ isGig: false, gigTier: null });
    expect(m.customer_type).toBe("full_client");
    expect(m.client_visibility).toBe("client_safe");
  });
});

describe("P100 — Copy safety guard", () => {
  it("flags unsafe guaranteed/full-OS phrases", () => {
    const flagged = detectUnsafeGigCopy(
      "We deliver guaranteed revenue and unlimited full OS access with ongoing Control System monitoring.",
    );
    expect(flagged).toEqual(
      expect.arrayContaining([
        "guaranteed revenue",
        "unlimited",
        "full os access",
        "ongoing control system monitoring",
      ]),
    );
  });
  it("accepts compliant gig copy", () => {
    const flagged = detectUnsafeGigCopy(
      "Standalone deliverable scoped to your purchased gig package. Does not include full Diagnostic, Implementation, or RGS Control System access.",
    );
    expect(flagged).toEqual([]);
  });

  it("denial copy strings themselves are safe", () => {
    for (const reason of Object.values(GIG_DENIAL_REASONS)) {
      expect(detectUnsafeGigCopy(reason)).toEqual([]);
    }
  });
});

describe("P100 — Regression: public funnel + protected Scorecard", () => {
  const appSrc = readFileSync(path.resolve("src/App.tsx"), "utf8");

  it("/scorecard route exists (redirect to /scan handled by component, not deleted)", () => {
    expect(appSrc).toMatch(/path="\/scorecard"/);
  });

  it("/diagnostic/scorecard remains gated by a ProtectedRoute wrapper", () => {
    const idx = appSrc.indexOf('/diagnostic/scorecard');
    expect(idx).toBeGreaterThan(-1);
    const window = appSrc.slice(idx, idx + 800);
    expect(window).toMatch(/ProtectedRoute/);
  });

  it("/scan public lead-gen route remains intact", () => {
    expect(appSrc).toMatch(/path="\/scan"/);
  });

  it("new gig admin route is admin-only", () => {
    const idx = appSrc.indexOf('/admin/gig-customers');
    expect(idx).toBeGreaterThan(-1);
    const window = appSrc.slice(idx, idx + 400);
    expect(window).toMatch(/requireRole="admin"/);
  });
});

describe("P100 — Tool registry self-consistency", () => {
  it("every registered tool lists itself in allowedTiers starting at its minTier", () => {
    for (const tool of Object.values(GIG_TOOL_REGISTRY)) {
      expect(tool.allowedTiers).toContain(tool.minTier);
      for (const t of tool.allowedTiers) {
        expect(tierMeets(t, tool.minTier)).toBe(true);
      }
    }
  });
  it("no gig tool exposes full-RGS-only sections via excludedFullRgsSections leakage", () => {
    const forbidden = ["control_system", "revenue_risk_monitor", "priority_repair_map", "implementation_roadmap"];
    // The tools themselves may *exclude* these strings, which is fine; just
    // confirm none of those forbidden surfaces appear as ELIGIBLE tool keys.
    for (const k of Object.keys(GIG_TOOL_REGISTRY)) {
      expect(forbidden).not.toContain(k);
    }
  });
});
