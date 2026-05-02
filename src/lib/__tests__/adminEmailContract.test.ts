import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("P33 — Admin email contract", () => {
  it("frontend never references admin email secrets", () => {
    const files = walk(join(root, "src"));
    for (const f of files) {
      if (f.includes("__tests__")) continue;
      const c = readFileSync(f, "utf8");
      expect(c, f).not.toMatch(/RESEND_API_KEY/);
      expect(c, f).not.toMatch(/ADMIN_EMAIL_FROM/);
      expect(c, f).not.toMatch(/ADMIN_EMAIL_RECIPIENTS/);
      expect(c, f).not.toMatch(/INVITE_EMAIL_FROM/);
    }
  });

  it("admin email helper lives in shared edge functions only", () => {
    const helper = read("supabase/functions/_shared/admin-email.ts");
    expect(helper).toMatch(/RESEND_API_KEY/);
    expect(helper).toMatch(/ADMIN_EMAIL_RECIPIENTS|info@revenueandgrowthsystems\.com/);
  });

  it("notify-admin-event re-verifies state and never trusts caller payload", () => {
    const src = read("supabase/functions/notify-admin-event/index.ts");
    // Allow-list of events
    expect(src).toMatch(/intake_needs_review/);
    expect(src).toMatch(/portal_invite_accepted/);
    // Re-reads diagnostic_intakes / customers before sending
    expect(src).toMatch(/from\("diagnostic_intakes"\)/);
    expect(src).toMatch(/from\("customers"\)/);
    // State guard
    expect(src).toMatch(/state_mismatch/);
  });

  it("admin email helper is invoked from webhook + admin functions", () => {
    expect(read("supabase/functions/payments-webhook/index.ts")).toMatch(/sendAdminEmail/);
    expect(read("supabase/functions/admin-mint-portal-invite/index.ts")).toMatch(/sendAdminEmail/);
    expect(read("supabase/functions/admin-create-payment-link/index.ts")).toMatch(/sendAdminEmail/);
  });

  it("admin retry RPC is admin-gated", () => {
    const dir = join(root, "supabase/migrations");
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .find((c) => c.includes("admin_notification_retry_email"));
    expect(sql, "P33 migration not found").toBeTruthy();
    expect(sql!).toMatch(/is_admin\(auth\.uid\(\)\)/);
    expect(sql!).toMatch(/admin_notification_record_email_result/);
    expect(sql!).toMatch(/service_role_only/);
  });

  it("client invite emails still go only to the client (not admin recipients)", () => {
    const mint = read("supabase/functions/admin-mint-portal-invite/index.ts");
    // The client-facing send still targets the intake email, not admin list.
    expect(mint).toMatch(/to:\s*\[intake\.email\]/);
    // The raw token is never sent to admin recipients.
    const helper = read("supabase/functions/_shared/admin-email.ts");
    expect(helper).not.toMatch(/rawToken|inviteUrl/);
  });
});