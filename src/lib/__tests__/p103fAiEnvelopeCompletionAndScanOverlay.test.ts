/**
 * P103F — Complete AI Envelope Surface Wiring + Public Scan Overlay Bugfix.
 *
 * - Verifies remaining AI surfaces consume the envelope panel or render a
 *   safe admin-only trust banner.
 * - Verifies the public /scan hero-grid-bg overlay is contained (root-cause
 *   fix in index.css), not hidden behind a partial workaround.
 * - Verifies public funnel architecture (scorecard -> scan) is preserved.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractAiOutputEnvelope } from "@/lib/ai/aiOutputEnvelopeTypes";

const REPO = process.cwd();
const read = (p: string) => readFileSync(join(REPO, p), "utf-8");

describe("P103F — remaining AI surfaces consume the envelope panel", () => {
  it("SOP admin surface renders AiOutputEnvelopePanel review variant", () => {
    const src = read("src/pages/admin/SopTrainingBibleAdmin.tsx");
    expect(src).toMatch(/AiOutputEnvelopePanel/);
    expect(src).toMatch(/extractAiOutputEnvelope/);
    expect(src).toMatch(/variant="review"/);
    // No legal/HR/OSHA certification claims
    expect(src).not.toMatch(/legally\s+certified|OSHA\s+certified|HR\s+certified|compliance\s+certified/i);
  });

  it("CampaignVideoPanel renders compact envelope and keeps render-honesty copy", () => {
    const src = read("src/components/campaignControl/CampaignVideoPanel.tsx");
    expect(src).toMatch(/AiOutputEnvelopePanel/);
    expect(src).toMatch(/variant="compact"/);
    expect(src).toMatch(/Rendering setup required/);
    expect(src).not.toMatch(/posted to|scheduled to|paid ads|guaranteed/i);
  });

  it("Diagnostic AI follow-up admin panel shows trust banner (no score changes)", () => {
    const src = read("src/components/admin/diagnostic-workspace/AiFollowupReviewPanel.tsx");
    expect(src).toMatch(/AI-assisted draft/);
    expect(src).toMatch(/Human review required/);
    expect(src).toMatch(/do not change scores/);
    expect(src).toMatch(/verify\s+evidence/);
  });

  it("RGS Guide Bot shows compact envelope on admin surface only", () => {
    const src = read("src/components/guideBot/RgsGuideBot.tsx");
    expect(src).toMatch(/AiOutputEnvelopePanel/);
    expect(src).toMatch(/surface === "admin"/);
    expect(src).toMatch(/extractAiOutputEnvelope/);
  });
});

describe("P103F — extractor remains safe for legacy/missing envelopes", () => {
  it("returns null when envelope is missing", () => {
    expect(extractAiOutputEnvelope({ sop: { title: "x" } })).toBeNull();
    expect(extractAiOutputEnvelope(null)).toBeNull();
    expect(extractAiOutputEnvelope(undefined)).toBeNull();
  });

  it("extracts ai_output_envelope when attached", () => {
    const env = extractAiOutputEnvelope({
      sop: {},
      ai_output_envelope: {
        confidence_level: "medium",
        confidence_reason: "Partial inputs",
        missing_inputs: ["owner_decision_point"],
        evidence_basis: [],
        assumptions: [],
        risk_warnings: [],
        claim_safety_warnings: [],
        human_review_required: true,
        client_safe_output: false,
        recommended_next_actions: [],
        output_schema_version: "p103c-ai-output-envelope-v1",
        admin_review_notes: "internal only",
      },
    });
    expect(env).not.toBeNull();
    expect(env!.confidence_level).toBe("medium");
    expect(env!.missing_inputs).toContain("owner_decision_point");
  });
});

describe("P103F — functional boundary: envelope UI cannot mutate state", () => {
  it("AiOutputEnvelopePanel imports no supabase mutation helpers", () => {
    const src = read("src/components/ai/AiOutputEnvelopePanel.tsx");
    expect(src).not.toMatch(/from "@\/integrations\/supabase\/client"/);
    expect(src).not.toMatch(/supabase\.from|\.update\(|\.insert\(|\.delete\(|\.upsert\(/);
    expect(src).not.toMatch(/approve|publish|client_visible\s*=\s*true|grant access/i);
  });
});

describe("P103F — public /scan overlay root-cause fix in CSS", () => {
  it("hero-grid-bg is positioned + isolated and ::before sits behind content", () => {
    const css = read("src/index.css");
    // Root cause: ::before previously escaped to viewport because the section
    // was not positioned. Fix MUST be in the CSS rule, not a partial workaround.
    expect(css).toMatch(/\.hero-grid-bg\s*\{[^}]*position:\s*relative/);
    expect(css).toMatch(/\.hero-grid-bg\s*\{[^}]*isolation:\s*isolate/);
    expect(css).toMatch(/\.hero-grid-bg::before\s*\{[^}]*z-index:\s*-1/);
    expect(css).toMatch(/\.hero-grid-bg::before\s*\{[^}]*pointer-events:\s*none/);
  });

  it("Scan page renders interactive content without a blocking fullscreen overlay", () => {
    const src = read("src/pages/Scan.tsx");
    expect(src).toMatch(/hero-grid-bg/);
    // No new fixed/absolute viewport overlay was added on top of scan content
    expect(src).not.toMatch(/fixed\s+inset-0\s+bg-(?:background|black)/);
  });
});

describe("P103F — public funnel regression: scorecard routes stay locked to /scan", () => {
  it("/scorecard redirects to /scan", () => {
    const src = read("src/pages/Scorecard.tsx");
    expect(src).toMatch(/Navigate to=\{SCAN_PATH\}/);
  });
  it("App.tsx keeps /revenue-scorecard -> /scan redirect and /diagnostic/scorecard protected", () => {
    const src = read("src/App.tsx");
    expect(src).toMatch(/path="\/revenue-scorecard"\s+element=\{<Navigate to="\/scan" replace \/>\}/);
    expect(src).toMatch(/path="\/diagnostic\/scorecard"/);
    // Protected route guard somewhere on that path
    const idx = src.indexOf('path="/diagnostic/scorecard"');
    expect(src.slice(idx, idx + 400)).toMatch(/ProtectedRoute/);
  });
});

describe("P103F — claim-safety copy in new UI", () => {
  it("no banned claims in the new envelope-adjacent copy", () => {
    const files = [
      "src/pages/admin/SopTrainingBibleAdmin.tsx",
      "src/components/campaignControl/CampaignVideoPanel.tsx",
      "src/components/admin/diagnostic-workspace/AiFollowupReviewPanel.tsx",
      "src/components/guideBot/RgsGuideBot.tsx",
    ];
    const banned = [
      /guaranteed/i,
      /final\s+finding/i,
      /paid\s+ads/i,
      /\bposted\s+to\b/i,
      /\bscheduled\s+to\b/i,
      /legal(ly)?\s+certified/i,
      /medical(ly)?\s+certified/i,
      /tax(ly)?\s+certified/i,
    ];
    for (const f of files) {
      const src = read(f);
      for (const pat of banned) expect(src, `${f}`).not.toMatch(pat);
    }
  });
});