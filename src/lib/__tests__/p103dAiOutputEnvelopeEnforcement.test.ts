/**
 * P103D — AI Output Envelope Enforcement + Frontend Consumer Compatibility.
 *
 * Verifies every targeted AI edge function:
 *   1. imports the shared envelope helper,
 *   2. wires attachAiOutputEnvelope into its success path,
 *   3. preserves the legacy response field(s) consumers depend on,
 *   4. correctly marks client-facing surfaces vs admin-only surfaces,
 *   5. never returns admin_review_notes on client-facing payloads.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = process.cwd();
const read = (p: string) => readFileSync(join(REPO, p), "utf-8");

interface SurfaceContract {
  name: string;
  legacyFieldRegex: RegExp;
  clientSafe: boolean;
}

const SURFACES: SurfaceContract[] = [
  { name: "generate-campaign-assets", legacyFieldRegex: /assets:\s*stored/, clientSafe: false },
  { name: "persona-ai-seed", legacyFieldRegex: /persona:\s*parsed/, clientSafe: false },
  { name: "sop-ai-assist", legacyFieldRegex: /sop:\s*parsed/, clientSafe: false },
  { name: "client-sop-ai-assist", legacyFieldRegex: /sop:\s*cleaned/, clientSafe: true },
  { name: "process-ai-seed", legacyFieldRegex: /process:\s*parsed/, clientSafe: false },
  { name: "report-ai-assist", legacyFieldRegex: /draft_id:\s*draftId/, clientSafe: false },
  { name: "journey-ai-seed", legacyFieldRegex: /journey:\s*parsed/, clientSafe: false },
  { name: "diagnostic-ai-followup", legacyFieldRegex: /followups:\s*inserted/, clientSafe: false },
  { name: "rgs-guide-bot", legacyFieldRegex: /answer,?\s*\n/, clientSafe: true },
];

describe("P103D — every target AI edge function imports envelope helper", () => {
  for (const s of SURFACES) {
    it(`${s.name} imports attachAiOutputEnvelope`, () => {
      const src = read(`supabase/functions/${s.name}/index.ts`);
      expect(src).toMatch(
        /import\s*{\s*attachAiOutputEnvelope\s*}\s*from\s*["']\.\.\/_shared\/ai-output-envelope\.ts["']/,
      );
    });
  }
});

describe("P103D — every target AI edge function wires attach into success path", () => {
  for (const s of SURFACES) {
    it(`${s.name} calls attachAiOutputEnvelope in success path`, () => {
      const src = read(`supabase/functions/${s.name}/index.ts`);
      expect(src).toMatch(/attachAiOutputEnvelope\s*\(/);
      expect(src).toContain(`surface: "${s.name}"`);
    });

    it(`${s.name} preserves its legacy response field`, () => {
      const src = read(`supabase/functions/${s.name}/index.ts`);
      expect(src).toMatch(s.legacyFieldRegex);
    });

    it(`${s.name} marks client_safe_output correctly (${s.clientSafe})`, () => {
      const src = read(`supabase/functions/${s.name}/index.ts`);
      const pattern = new RegExp(
        `surface:\\s*"${s.name}"[\\s\\S]{0,400}?client_safe_output:\\s*${s.clientSafe}`,
      );
      expect(src).toMatch(pattern);
    });
  }
});

describe("P103D — shared helper enforces envelope guarantees", () => {
  it("helper exists and exports attachAiOutputEnvelope + buildAiOutputEnvelopeMeta", () => {
    const src = read("supabase/functions/_shared/ai-output-envelope.ts");
    expect(src).toMatch(/export function attachAiOutputEnvelope/);
    expect(src).toMatch(/export function buildAiOutputEnvelopeMeta/);
  });

  it("helper strips admin_review_notes from client-safe payloads", () => {
    const src = read("supabase/functions/_shared/ai-output-envelope.ts");
    // Either the meta builder strips it, or attach strips it. Both is best.
    expect(src).toMatch(/client_safe_output\s*\?\s*undefined\s*:\s*input\.admin_review_notes/);
    expect(src).toMatch(/if\s*\(envelope\.client_safe_output\)/);
  });

  it("helper forces human_review_required = true", () => {
    const src = read("supabase/functions/_shared/ai-output-envelope.ts");
    expect(src).toMatch(/human_review_required:\s*true/);
  });
});
