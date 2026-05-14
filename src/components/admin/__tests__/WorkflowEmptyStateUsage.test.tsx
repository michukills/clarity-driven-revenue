/**
 * P93E-E2G-P2.7D — Regression: every admin surface hardened in P2.7C/P2.7D
 * imports and uses the shared WorkflowEmptyState primitive (so we don't
 * silently regress to vague "No data" copy and don't fork a second empty-
 * state system).
 *
 * Also asserts that touched pages do NOT introduce unsafe wording such as
 * fake "live verified", "report ready", or "live sync" claims in their
 * static empty/blocked copy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src", "pages", "admin");

const TOUCHED_PAGES = [
  "DiagnosticInterviews.tsx",
  "IndustryDiagnosticInterviews.tsx",
  "ReportDrafts.tsx",
  "ImplementationRoadmapAdmin.tsx",
  "DiagnosticInterviewDetail.tsx",
  "ReportDraftDetail.tsx",
  "RgsControlSystemAdmin.tsx",
  "PendingAccounts.tsx",
  "StandaloneToolRunner.tsx",
];

const UNSAFE_PHRASES = [
  "live verified",
  "live-verified",
  "report ready",
  "report-ready",
  "live sync",
  "live-sync",
  "guaranteed",
];

describe("Admin workflow surfaces — WorkflowEmptyState adoption", () => {
  for (const file of TOUCHED_PAGES) {
    const path = join(ROOT, file);
    const src = readFileSync(path, "utf8");

    it(`${file} imports WorkflowEmptyState`, () => {
      expect(src).toMatch(/from\s+["']@\/components\/admin\/WorkflowEmptyState["']/);
    });

    it(`${file} renders <WorkflowEmptyState …>`, () => {
      expect(src).toMatch(/<WorkflowEmptyState/);
    });

    it(`${file} avoids unsafe overclaim phrases in static copy`, () => {
      // Strip code-comments to avoid false positives from policy notes.
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        .toLowerCase();
      for (const phrase of UNSAFE_PHRASES) {
        expect(stripped).not.toContain(phrase);
      }
    });
  }
});