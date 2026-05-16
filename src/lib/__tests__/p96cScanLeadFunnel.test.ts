/**
 * P96C — Scan as lead-gen, Scorecard as Diagnostic Part 1.
 *
 * Pins the public funnel architecture:
 *   /scan → captures contact, inserts into scan_leads, invokes the
 *           scan-followup edge function, and never unlocks the portal,
 *           Diagnostic, Implementation, or RGS Control System.
 *   /scorecard is framed as Diagnostic Part 1, not the primary public
 *   lead magnet.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const HOME = read("src/pages/Index.tsx");
const SCAN = read("src/pages/Scan.tsx");
const SCORECARD = read("src/pages/Scorecard.tsx");
const ADMIN_SCAN = read("src/pages/admin/ScanLeads.tsx");
const APP = read("src/App.tsx");
const FOLLOWUP_EMAIL = read("supabase/functions/_shared/scan-followup-email.ts");
const FOLLOWUP_FN = read("supabase/functions/scan-followup/index.ts");

describe("P96C — Scan is the primary public lead-gen surface", () => {
  it("hero primary CTA on / routes to the Scan, not the Scorecard", () => {
    expect(HOME).toMatch(/data-testid="hero-primary-cta"[\s\S]{0,200}to=\{SCAN_PATH\}/);
  });

  it("Scorecard page is reframed as Diagnostic Part 1", () => {
    expect(SCORECARD).toMatch(/Diagnostic Part 1/i);
  });
});

describe("P96C — Scan lead capture wiring", () => {
  it("renders a scan-lead capture block in the result stage", () => {
    expect(SCAN).toContain('data-testid="scan-lead-capture"');
    expect(SCAN).toContain('data-testid="scan-lead-submit-deeper"');
    expect(SCAN).toContain('data-testid="scan-lead-submit-summary"');
    expect(SCAN).toContain('data-testid="scan-lead-success"');
  });

  it("inserts into the scan_leads table with the operational_friction_scan source", () => {
    expect(SCAN).toMatch(/\.from\(\s*"scan_leads"\s*\)\s*\n?\s*\.insert/);
    expect(SCAN).toContain('"operational_friction_scan"');
    expect(SCAN).toContain('source_page: "/scan"');
    expect(SCAN).toMatch(/scan_answers:\s*answers/);
    expect(SCAN).toMatch(/scan_summary/);
  });

  it("invokes the scan-followup edge function after a successful insert", () => {
    expect(SCAN).toMatch(/functions\s*\n?\s*\.invoke\(\s*"scan-followup"/);
  });

  it("makes clear that the lead capture does NOT unlock portal / Diagnostic / Control System", () => {
    expect(SCAN).toMatch(/does not unlock|not unlock/i);
    expect(SCAN).toMatch(/Client Portal/);
    expect(SCAN).toMatch(/Control System/);
  });
});

describe("P96C — Scan follow-up email frames Scan, not Scorecard", () => {
  it("the shared scan follow-up template references the Operational Friction Scan", () => {
    expect(FOLLOWUP_EMAIL).toMatch(/Operational Friction Scan/i);
  });

  it("the scan-followup edge function reads from scan_leads and uses the scan template", () => {
    expect(FOLLOWUP_FN).toMatch(/from\(\s*"scan_leads"\s*\)/);
    expect(FOLLOWUP_FN).toMatch(/sendScanFollowupEmail|scan-followup-email/);
  });

  it("emits the scan_lead_captured admin alert event", () => {
    const ADMIN_EMAIL = read("supabase/functions/_shared/admin-email.ts");
    expect(ADMIN_EMAIL).toContain("scan_lead_captured");
  });
});

describe("P96C — Admin visibility for scan leads", () => {
  it("registers an /admin/scan-leads route distinct from scorecard-leads", () => {
    expect(APP).toContain("/admin/scan-leads");
    expect(APP).toContain("AdminScanLeads");
  });

  it("admin scan leads page lists captured prospects from scan_leads", () => {
    expect(ADMIN_SCAN).toMatch(/from\(\s*"scan_leads"\s*\)/);
    expect(ADMIN_SCAN).toMatch(/Operational Friction Scan/);
    expect(ADMIN_SCAN).toMatch(/Likely bottleneck/);
    expect(ADMIN_SCAN).toMatch(/Follow-up email/);
  });

  it("admin scan leads page documents that scan capture does NOT activate paid workspaces", () => {
    expect(ADMIN_SCAN).toMatch(/does NOT unlock|not\s+(an?\s+)?active Diagnostic/i);
  });
});