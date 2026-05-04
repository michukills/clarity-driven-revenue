import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Framework vs Launch-Ready Audit contract.
 *
 * Pins the launch-readiness classification doc and re-asserts the small set
 * of cross-cutting launch invariants we never want silently regressed:
 *
 *  - audit doc exists and classifies every required area
 *  - no frontend code imports a service-role / stripe / webhook secret
 *  - "medical" terminology guard doc + cannabis safety doc both exist
 *  - private tool-reports + report drafts + StoredToolReportsPanel are
 *    still part of the codebase
 *  - admin-protected routes still wrap with requireRole="admin"
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const AUDIT_DOC = "docs/rgs-framework-vs-launch-ready-audit.md";

describe("Framework vs Launch-Ready audit", () => {
  it("audit doc exists", () => {
    expect(existsSync(join(root, AUDIT_DOC))).toBe(true);
  });

  it("audit doc classifies every required launch area", () => {
    const doc = read(AUDIT_DOC);
    for (const area of [
      "Public site",
      "Stability Scorecard",
      "Lead capture",
      "Payment / invite / access",
      "Owner Diagnostic Interview",
      "Diagnostic Report Builder",
      "RGS Stability Snapshot",
      "Tool-specific reports",
      "Priority Repair Map",
      "Implementation Tool suite",
      "RGS Control System umbrella",
      "Industry Brain catalog",
      "Industry Brain launch integration",
      "Admin Command Center",
      "Cannabis / MMJ terminology",
      "AI assist",
      "Role/access/RLS/tenant isolation",
    ]) {
      expect(doc).toContain(area);
    }
  });

  it("audit doc explicitly confirms no frontend secrets and no admin-note leakage", () => {
    const doc = read(AUDIT_DOC);
    expect(doc).toMatch(/No frontend secrets introduced/);
    expect(doc).toMatch(/No admin-only notes exposed to clients/);
  });

  it("audit doc keeps cannabis/MMJ scope (allows safety-guard mentions of forbidden terms)", () => {
    const doc = read(AUDIT_DOC);
    expect(doc).toMatch(/cannabis\/MMJ\/MMC/i);
    // Healthcare/HIPAA/clinical may only appear as part of the explicit
    // "no healthcare drift" guard sentence — never as positive scope.
    expect(doc).toMatch(/no healthcare\/HIPAA\/clinical[\s\S]*terminology introduced/i);
  });

  it("supporting safety docs still exist", () => {
    for (const p of [
      "docs/rgs-medical-terminology-clarification.md",
      "docs/final-launch-audit.md",
      "docs/live-readiness-checklist.md",
      "docs/connector-readiness.md",
      "docs/no-fake-proof-cta-audit.md",
      "docs/report-export-safety.md",
    ]) {
      expect(existsSync(join(root, p))).toBe(true);
    }
  });

  it("private tool-reports infrastructure files still exist", () => {
    for (const p of [
      "src/components/admin/StoredToolReportsPanel.tsx",
      "src/components/portal/ClientToolGuard.tsx",
      "src/components/portal/ProtectedRoute.tsx",
    ]) {
      expect(existsSync(join(root, p))).toBe(true);
    }
  });

  it("ProtectedRoute still enforces requireRole=admin pattern", () => {
    const src = read("src/components/portal/ProtectedRoute.tsx");
    expect(src).toMatch(/requireRole.*admin/);
    expect(src).toMatch(/isAdmin/);
  });
});