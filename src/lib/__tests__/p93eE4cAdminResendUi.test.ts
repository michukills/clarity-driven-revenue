import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * P93E-E4C — Admin Resend Follow-Up UI contract.
 *
 * Pins the admin-only resend surface on /admin/scorecard-leads:
 *   - Resend button calls the admin-resend-scorecard-followup edge function.
 *   - Cooldown response gates a force resend behind explicit confirmation.
 *   - Attempt history is rendered from scorecard_email_attempts.
 *   - Route is admin-only (ProtectedRoute requireRole="admin").
 *   - RESEND_API_KEY never appears anywhere in src/.
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const LEADS = read("src/pages/admin/ScorecardLeads.tsx");
const APP = read("src/App.tsx");

describe("P93E-E4C — Admin Resend Follow-Up UI", () => {
  it("/admin/scorecard-leads route is admin-only via ProtectedRoute", () => {
    expect(APP).toMatch(
      /path="\/admin\/scorecard-leads"[\s\S]*?ProtectedRoute\s+requireRole="admin"[\s\S]*?AdminScorecardLeads/,
    );
  });

  it("renders a resend button and invokes admin-resend-scorecard-followup", () => {
    expect(LEADS).toMatch(/data-testid="admin-resend-followup"/);
    expect(LEADS).toMatch(
      /supabase\.functions\.invoke\(\s*["']admin-resend-scorecard-followup["']/,
    );
    // Initial click must not pass force.
    expect(LEADS).toMatch(/resendFollowup\(false\)/);
  });

  it("respects cooldown response and gates force=true behind explicit confirmation", () => {
    expect(LEADS).toMatch(/skipped_recently_sent/);
    expect(LEADS).toMatch(/requiresConfirm/);
    expect(LEADS).toMatch(/data-testid="admin-resend-force-confirm"/);
    expect(LEADS).toMatch(/data-testid="admin-resend-confirm-force"/);
    expect(LEADS).toMatch(/resendFollowup\(true\)/);
  });

  it("button is disabled while a request is pending (no double-click spam)", () => {
    expect(LEADS).toMatch(/disabled=\{resending\}/);
    expect(LEADS).toMatch(/setResending\(true\)/);
    expect(LEADS).toMatch(/setResending\(false\)/);
  });

  it("attempt history reads scorecard_email_attempts and renders a panel", () => {
    expect(LEADS).toMatch(
      /from\(\s*["']scorecard_email_attempts["']\s*\)/,
    );
    expect(LEADS).toMatch(
      /eq\(\s*["']scorecard_run_id["']/,
    );
    expect(LEADS).toMatch(/data-testid="admin-resend-attempt-history"/);
    expect(LEADS).toMatch(/Manual resend/);
    expect(LEADS).toMatch(/Automatic dispatcher/);
  });

  it("UI refreshes status + history after a resend attempt", () => {
    expect(LEADS).toMatch(/await Promise\.all\(\[load\(\), loadAttempts\(\)\]\)/);
  });

  it("RESEND_API_KEY is never referenced in src/", () => {
    function walk(dir: string, out: string[] = []): string[] {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) walk(full, out);
        else if (/\.(t|j)sx?$/.test(name)) out.push(full);
      }
      return out;
    }
    for (const file of walk(join(root, "src"))) {
      const src = readFileSync(file, "utf8");
      // Allow tests that pin the contract that this key is backend-only.
      if (file.includes("__tests__")) continue;
      expect(src, `RESEND_API_KEY leaked into ${file}`).not.toMatch(
        /RESEND_API_KEY/,
      );
    }
  });

  it("does not surface raw provider internals or secrets in the UI", () => {
    // No raw bearer/secret patterns hard-coded into the admin surface.
    expect(LEADS).not.toMatch(/Bearer\s+re_[A-Za-z0-9]/);
    expect(LEADS).not.toMatch(/RESEND_API_KEY/);
  });
});