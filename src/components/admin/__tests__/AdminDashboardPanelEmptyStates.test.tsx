/**
 * P93E-E2G-P2.7E — Regression: AdminDashboard panels and small admin
 * surfaces use the shared WorkflowEmptyState primitive and avoid unsafe
 * overclaim phrases in static empty/blocked copy.
 *
 * Static-source assertions only — no rendering. Mirrors the P2.7D
 * WorkflowEmptyStateUsage test so the dashboard panels can't silently
 * regress to terse "No data" lines.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TARGETS: { label: string; path: string }[] = [
  { label: "AdminTimelineCommandCenter",  path: "src/components/admin/AdminTimelineCommandCenter.tsx" },
  { label: "AdminOperationalQueuePanel",  path: "src/components/admin/AdminOperationalQueuePanel.tsx" },
  { label: "AdminNewAccountsPanel",       path: "src/components/admin/AdminNewAccountsPanel.tsx" },
  { label: "AdminRgsReviewQueuePanel",    path: "src/components/admin/AdminRgsReviewQueuePanel.tsx" },
  { label: "ClientHealthAdmin page",      path: "src/pages/admin/ClientHealthAdmin.tsx" },
  { label: "ClientHealthOverview page",   path: "src/pages/admin/ClientHealthOverview.tsx" },
  { label: "DiagnosticOrders page",       path: "src/pages/admin/DiagnosticOrders.tsx" },
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

describe("AdminDashboard panels & small surfaces — WorkflowEmptyState adoption", () => {
  for (const t of TARGETS) {
    const src = readFileSync(join(process.cwd(), t.path), "utf8");

    it(`${t.label} imports WorkflowEmptyState`, () => {
      expect(src).toMatch(/from\s+["']@\/components\/admin\/WorkflowEmptyState["']/);
    });

    it(`${t.label} renders <WorkflowEmptyState …>`, () => {
      expect(src).toMatch(/<WorkflowEmptyState/);
    });

    it(`${t.label} avoids unsafe overclaim phrases in static copy`, () => {
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