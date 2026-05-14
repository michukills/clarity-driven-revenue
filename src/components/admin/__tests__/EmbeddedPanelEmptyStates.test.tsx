/**
 * P93E-E2G-P2.7F — Regression: CustomerDetail-embedded and dashboard
 * secondary panels we hardened in this pass adopt WorkflowEmptyState (or
 * keep their already-clear copy) and avoid unsafe overclaim phrases.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src", "components", "admin");

const TOUCHED = [
  { file: "ConnectedSourceRequestsPanel.tsx", requiresPrimitive: true },
  { file: "EvidenceDecayPanel.tsx", requiresPrimitive: true },
  { file: "SuggestedGuidancePanel.tsx", requiresPrimitive: false },
];

const UNSAFE_PHRASES = [
  "live verified",
  "live-verified",
  "report ready",
  "report-ready",
  "live sync",
  "live-sync",
  "guaranteed",
  "guaranteed revenue",
  "guaranteed profit",
  "guaranteed roi",
  "legally compliant",
  "compliance certified",
];

const VAGUE_PHRASES = [
  "no data",
  "nothing here",
];

describe("Embedded admin panels — P2.7F empty/blocked state hardening", () => {
  for (const { file, requiresPrimitive } of TOUCHED) {
    const src = readFileSync(join(ROOT, file), "utf8");
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      .toLowerCase();

    if (requiresPrimitive) {
      it(`${file} imports WorkflowEmptyState`, () => {
        expect(src).toMatch(/from\s+["']@\/components\/admin\/WorkflowEmptyState["']/);
      });
      it(`${file} renders <WorkflowEmptyState …>`, () => {
        expect(src).toMatch(/<WorkflowEmptyState/);
      });
    }

    it(`${file} avoids unsafe overclaim phrases in static copy`, () => {
      for (const phrase of UNSAFE_PHRASES) {
        expect(stripped).not.toContain(phrase);
      }
    });

    it(`${file} avoids bare vague empty-state phrases in static copy`, () => {
      for (const phrase of VAGUE_PHRASES) {
        expect(stripped).not.toContain(phrase);
      }
    });
  }
});