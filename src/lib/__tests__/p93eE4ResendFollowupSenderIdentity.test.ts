// P93E-E4 — Resend follow-up email sender/reply-to + secret-safety guard.
// Pins:
//   - default From = "John Matthew Chubb <jmchubb@revenueandgrowthsystems.com>"
//   - default Reply-To = jmchubb@revenueandgrowthsystems.com
//   - optional RGS_EMAIL_FROM / RGS_EMAIL_REPLY_TO honored only on the
//     verified revenueandgrowthsystems.com domain
//   - Resend API key is backend-only, never in frontend bundles
//   - failure / missing-config / missing-consent paths all record honest
//     statuses and never break public Scorecard submission
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P93E-E4 — follow-up sender identity + reply-to", () => {
  const fn = read("supabase/functions/scorecard-followup/index.ts");

  it("default From uses 'John Matthew Chubb <jmchubb@revenueandgrowthsystems.com>'", () => {
    expect(fn).toMatch(
      /DEFAULT_FOLLOWUP_FROM\s*=\s*\n?\s*"John Matthew Chubb <jmchubb@revenueandgrowthsystems\.com>"/,
    );
  });

  it("default Reply-To uses jmchubb@revenueandgrowthsystems.com", () => {
    expect(fn).toMatch(
      /DEFAULT_FOLLOWUP_REPLY_TO\s*=\s*"jmchubb@revenueandgrowthsystems\.com"/,
    );
  });

  it("Resend payload includes reply_to alongside from/to/subject/html/text", () => {
    expect(fn).toMatch(
      /JSON\.stringify\(\{\s*from,\s*to:\s*\[args\.to\],\s*reply_to:\s*replyTo/,
    );
  });

  it("From override is restricted to the verified revenueandgrowthsystems.com domain", () => {
    expect(fn).toMatch(/SENDER_DOMAIN\s*=\s*"revenueandgrowthsystems\.com"/);
    expect(fn).toMatch(/safeFollowupFrom\(\)/);
    expect(fn).toMatch(/safeFollowupReplyTo\(\)/);
    expect(fn).toMatch(/senderDomainOf\(candidate\)\s*===\s*SENDER_DOMAIN/);
  });

  it("optional RGS_EMAIL_FROM / RGS_EMAIL_REPLY_TO secrets are read server-side only", () => {
    expect(fn).toMatch(/Deno\.env\.get\("RGS_EMAIL_FROM"\)/);
    expect(fn).toMatch(/Deno\.env\.get\("RGS_EMAIL_REPLY_TO"\)/);
  });
});

describe("P93E-E4 — honest follow-up statuses", () => {
  const fn = read("supabase/functions/scorecard-followup/index.ts");

  it("missing RESEND_API_KEY records skipped_missing_config (no fake success)", () => {
    expect(fn).toMatch(
      /if \(!apiKey\) \{\s*return \{ status: "skipped_missing_config"/,
    );
  });

  it("provider non-2xx response records failed with safe truncated detail", () => {
    expect(fn).toMatch(/return \{ status: "failed", error: detail/);
    expect(fn).toMatch(/t\.slice\(0,\s*300\)/);
  });

  it("missing email_consent records skipped_missing_consent without sending", () => {
    expect(fn).toMatch(/_status: "skipped_missing_consent"/);
  });

  it("admin alert + follow-up outcomes are persisted via admin_record_scorecard_email_result", () => {
    expect(fn).toMatch(/admin_record_scorecard_email_result/);
    expect(fn).toMatch(/_kind: "admin_alert"/);
    expect(fn).toMatch(/_kind: "follow_up"/);
  });

  it("public scorecard submission never throws — top-level catch returns 200", () => {
    expect(fn).toMatch(/catch \(e\) \{[\s\S]*scorecard-followup error[\s\S]*status: 200/);
  });
});

describe("P93E-E4 — RESEND_API_KEY is backend-only", () => {
  it("RESEND_API_KEY is referenced only in supabase/functions, never in src/", () => {
    // Search the frontend bundle source tree.
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const out = execSync(
      "grep -rln 'RESEND_API_KEY' src/ 2>/dev/null || true",
      { encoding: "utf8" },
    );
    // Allow guard tests themselves to mention the string. Any other
    // src/ reference is a frontend-secret leak.
    const offenders = out
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.includes("__tests__/"));
    expect(offenders).toEqual([]);
  });

  it("VITE_-prefixed RESEND keys are never declared in env files", () => {
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const out = execSync(
      "grep -rln 'VITE_RESEND' src/ .env .env.* 2>/dev/null || true",
      { encoding: "utf8" },
    );
    const offenders = out
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.includes("__tests__/"));
    expect(offenders).toEqual([]);
  });
});