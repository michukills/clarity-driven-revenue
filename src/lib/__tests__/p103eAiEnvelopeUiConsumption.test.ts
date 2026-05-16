/**
 * P103E — AI Envelope UI Consumption + Admin Review Visibility.
 *
 * Verifies:
 *   1. Shared AiOutputEnvelopePanel exists and exposes the documented props.
 *   2. Shared extractAiOutputEnvelope handles legacy/missing/safe shapes.
 *   3. Priority admin/review surfaces import the panel + extractor.
 *   4. Client-safe rules (admin_review_notes stripping is enforced in panel
 *      client variant + edge helper).
 *   5. Functional boundary: the panel/types cannot mutate records.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractAiOutputEnvelope,
  AI_ENVELOPE_CONFIDENCE_COPY,
} from "@/lib/ai/aiOutputEnvelopeTypes";

const REPO = process.cwd();
const read = (p: string) => readFileSync(join(REPO, p), "utf-8");

const PANEL = "src/components/ai/AiOutputEnvelopePanel.tsx";
const TYPES = "src/lib/ai/aiOutputEnvelopeTypes.ts";

const WIRED_SURFACES = [
  "src/pages/admin/tools/PersonaBuilder.tsx",
  "src/pages/admin/tools/JourneyMapper.tsx",
  "src/pages/admin/tools/ProcessBreakdown.tsx",
  "src/pages/admin/ReportDraftDetail.tsx",
  "src/pages/admin/CampaignControl.tsx",
];

describe("P103E — shared component + types exist", () => {
  it("AiOutputEnvelopePanel exists and exposes documented props/variants", () => {
    const src = read(PANEL);
    expect(src).toMatch(/export function AiOutputEnvelopePanel/);
    expect(src).toMatch(/AiOutputEnvelopePanelVariant/);
    for (const v of ["admin", "review", "compact", "client"]) {
      expect(src).toContain(`"${v}"`);
    }
    expect(src).toMatch(/showSchemaDebug/);
    expect(src).toMatch(/className/);
  });

  it("types file exposes AiOutputEnvelope + extractor + confidence copy", () => {
    const src = read(TYPES);
    expect(src).toMatch(/export interface AiOutputEnvelope\b/);
    expect(src).toMatch(/export function extractAiOutputEnvelope/);
    expect(src).toMatch(/AI_ENVELOPE_CONFIDENCE_COPY/);
    expect(AI_ENVELOPE_CONFIDENCE_COPY.high).toMatch(/Strongly supported/);
    expect(AI_ENVELOPE_CONFIDENCE_COPY.medium).toMatch(/Usable/);
    expect(AI_ENVELOPE_CONFIDENCE_COPY.low).toMatch(/Limited/);
  });

  it("panel hides admin_review_notes in client variant and shows fallback notice", () => {
    const src = read(PANEL);
    // Client variant must never render admin_review_notes.
    expect(src).not.toMatch(/admin_review_notes/);
    expect(src).toMatch(/Admin-only review notes hidden from\s*\n?\s*clients/);
  });

  it("panel never approves / publishes / mutates records", () => {
    const src = read(PANEL);
    expect(src).not.toMatch(/supabase\./);
    expect(src).not.toMatch(/\.update\(/);
    expect(src).not.toMatch(/\.insert\(/);
    expect(src).not.toMatch(/client_visible\s*:\s*true/);
    expect(src).not.toMatch(/approved_at/);
    expect(src).not.toMatch(/fetch\(/);
  });

  it("panel uses RGS voice labels and avoids banned/over-promise wording", () => {
    const src = read(PANEL);
    expect(src).toMatch(/Human review required/);
    expect(src).toMatch(/AI-assisted draft/);
    expect(src).toMatch(/Why this confidence/);
    expect(src).toMatch(/Missing inputs/);
    expect(src).toMatch(/Risk warnings/);
    expect(src).toMatch(/Claim-safety warnings/);
    expect(src).toMatch(/Evidence basis/);
    expect(src).not.toMatch(/\bGuaranteed\b/i);
    expect(src).not.toMatch(/\bThe AI thinks\b/i);
    expect(src).not.toMatch(/\bAI certainty\b/i);
    expect(src).not.toMatch(/\bFinal finding\b/i);
    expect(src).not.toMatch(/\bPublished\b/);
  });
});

describe("P103E — extractAiOutputEnvelope safety", () => {
  it("returns null for null/undefined/empty/legacy payloads", () => {
    expect(extractAiOutputEnvelope(null)).toBeNull();
    expect(extractAiOutputEnvelope(undefined)).toBeNull();
    expect(extractAiOutputEnvelope({})).toBeNull();
    expect(extractAiOutputEnvelope({ persona: { name: "x" } })).toBeNull();
    expect(extractAiOutputEnvelope("oops")).toBeNull();
    expect(extractAiOutputEnvelope(42)).toBeNull();
  });

  it("extracts a wrapped envelope and preserves required fields", () => {
    const env = extractAiOutputEnvelope({
      persona: {},
      ai_output_envelope: {
        title: "Persona AI draft",
        summary: "ok",
        recommended_next_actions: ["Admin reviews draft."],
        confidence_level: "medium",
        confidence_reason: "Has admin context but not verified.",
        missing_inputs: [],
        evidence_basis: ["structured_interview_claim"],
        assumptions: [],
        risk_warnings: [],
        claim_safety_warnings: [],
        human_review_required: true,
        client_safe_output: false,
        admin_review_notes: "admin only",
        output_schema_version: "p103c-ai-output-envelope-v1",
      },
    });
    expect(env).not.toBeNull();
    expect(env?.confidence_level).toBe("medium");
    expect(env?.human_review_required).toBe(true);
    expect(env?.client_safe_output).toBe(false);
  });

  it("never throws on malformed envelope shapes", () => {
    expect(() =>
      extractAiOutputEnvelope({ ai_output_envelope: { confidence_level: "bogus" } }),
    ).not.toThrow();
    expect(
      extractAiOutputEnvelope({ ai_output_envelope: { confidence_level: "bogus" } }),
    ).toBeNull();
  });
});

describe("P103E — priority surfaces import + render envelope panel", () => {
  for (const surface of WIRED_SURFACES) {
    it(`${surface} imports AiOutputEnvelopePanel + extractor`, () => {
      const src = read(surface);
      expect(src).toMatch(
        /from\s*["']@\/components\/ai\/AiOutputEnvelopePanel["']/,
      );
      expect(src).toMatch(
        /from\s*["']@\/lib\/ai\/aiOutputEnvelopeTypes["']/,
      );
      expect(src).toMatch(/extractAiOutputEnvelope\(/);
      expect(src).toMatch(/<AiOutputEnvelopePanel\b/);
    });
  }

  it("ReportDraftDetail surface uses admin variant for AI assist envelope", () => {
    const src = read("src/pages/admin/ReportDraftDetail.tsx");
    expect(src).toMatch(/variant="admin"/);
  });

  it("Admin CampaignControl uses admin variant for asset generation envelope", () => {
    const src = read("src/pages/admin/CampaignControl.tsx");
    expect(src).toMatch(/variant="admin"/);
  });
});

describe("P103E — edge envelope helper still hides admin_review_notes on client-safe", () => {
  it("shared edge helper strips admin_review_notes when client_safe_output is true", () => {
    const src = read("supabase/functions/_shared/ai-output-envelope.ts");
    expect(src).toMatch(/clientSafe\s*\?\s*undefined\s*:\s*input\.admin_review_notes/);
    expect(src).toMatch(/if\s*\(envelope\.client_safe_output\)/);
  });
});

describe("P103E — public funnel + protected routes are not touched", () => {
  it("App.tsx still redirects /scorecard and /revenue-scorecard to /scan", () => {
    const src = read("src/App.tsx");
    expect(src).toMatch(/path="\/scorecard"/);
    expect(src).toMatch(/path="\/revenue-scorecard"/);
    expect(src).toMatch(/\/scan/);
  });

  it("/diagnostic/scorecard remains protected", () => {
    const src = read("src/App.tsx");
    expect(src).toMatch(/\/diagnostic\/scorecard/);
    expect(src).toMatch(/ProtectedRoute|RequireAuth|requireAuth/i);
  });
});
