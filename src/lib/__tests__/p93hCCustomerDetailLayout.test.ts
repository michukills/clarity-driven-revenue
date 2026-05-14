/**
 * P93H-C — CustomerDetail focused UI polish + layout hardening.
 *
 * Source-level contract guards (no rendering). These lock the P93F flow,
 * the destructive-action separation introduced in P93H-C, and the overflow
 * protections added for long emails / business names.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILE = "src/pages/admin/CustomerDetail.tsx";
const src = readFileSync(join(process.cwd(), FILE), "utf8");

describe("P93H-C — CustomerDetail preserves the P93F flow", () => {
  it("renders AccountIdentityHeader near the top of the detail block", () => {
    expect(src).toMatch(/<AccountIdentityHeader\s+customer={c}\s*\/>/);
  });

  it("keeps the status badges row above the classification panel", () => {
    const badgesIdx = src.indexOf('data-testid="customer-status-badges"');
    const classificationIdx = src.indexOf("<AccountClassificationPanel");
    expect(badgesIdx).toBeGreaterThan(-1);
    expect(classificationIdx).toBeGreaterThan(-1);
    expect(badgesIdx).toBeLessThan(classificationIdx);
  });

  it("keeps Next Action + Tool Guide together near the top, above Primary actions", () => {
    const nextIdx = src.indexOf('data-testid="next-action-tool-guide"');
    const primaryIdx = src.indexOf('data-testid="primary-actions"');
    expect(nextIdx).toBeGreaterThan(-1);
    expect(primaryIdx).toBeGreaterThan(-1);
    expect(nextIdx).toBeLessThan(primaryIdx);
    // Both AdminNextActionPanel + AdminToolGuidePanel still render inside it.
    expect(src).toMatch(/<AdminNextActionPanel/);
    expect(src).toMatch(/<AdminToolGuidePanel/);
  });

  it("keeps AdminSpecialistToolMenu (collapsible / progressively disclosed)", () => {
    expect(src).toMatch(/<AdminSpecialistToolMenu\s+customerId={c\.id}\s*\/>/);
  });
});

describe("P93H-C — destructive actions are visually separated", () => {
  it("Primary actions splits into workflow and destructive clusters", () => {
    expect(src).toMatch(/data-testid="primary-actions-workflow"/);
    expect(src).toMatch(/data-testid="primary-actions-destructive"/);
    // Destructive cluster carries an aria label so screen readers can announce it.
    expect(src).toMatch(/aria-label="Destructive actions"/);
  });

  it("destructive cluster contains Archive + Delete and the Delete button is intact", () => {
    const destructiveBlock = src.split('data-testid="primary-actions-destructive"')[1] ?? "";
    expect(destructiveBlock).toMatch(/Archive client/);
    expect(destructiveBlock).toMatch(/Delete account/);
    expect(destructiveBlock).toMatch(/data-testid="open-delete-account-dialog"/);
    expect(destructiveBlock).toMatch(/border-destructive\/40 text-destructive/);
  });

  it("Delete still routes through the server-side admin-cleanup-customer function", () => {
    expect(src).toMatch(/<DeleteAccountDialog/);
    expect(src).toMatch(/admin-cleanup-customer/);
    // Real-client guard remains: forceRealClientDelete is set for non-demo.
    expect(src).toMatch(/forceRealClientDelete:\s*!isDemo/);
    // Typed-email confirmation is still passed in.
    expect(src).toMatch(/confirmEmail:\s*c\.email/);
  });

  it("Archive still routes through admin-cleanup-customer (not a direct DB write)", () => {
    // Two invocations of admin-cleanup-customer: one for archive/restore, one for delete.
    const matches = src.match(/admin-cleanup-customer/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

describe("P93H-C — overflow + responsive protections", () => {
  it("outer detail block uses min-w-0 to prevent long emails / names from blowing out the layout", () => {
    // The space-y-6 mb-8 wrapper is the outer detail block; it must include min-w-0.
    expect(src).toMatch(/space-y-6 mb-8 min-w-0/);
  });

  it("status badges row uses flex-wrap so long badge sets stack on narrow widths", () => {
    // The badges row is flex-wrap items-center gap-2 with min-w-0.
    expect(src).toMatch(/flex flex-wrap items-center gap-2 min-w-0/);
  });

  it("Next Action + Tool Guide grid uses items-start to top-align asymmetric panels", () => {
    expect(src).toMatch(
      /grid grid-cols-1 lg:grid-cols-2 gap-4 items-start min-w-0/,
    );
  });

  it("Primary actions cluster row stacks on small viewports and splits on lg+", () => {
    expect(src).toMatch(
      /flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between min-w-0/,
    );
  });
});

describe("P93H-C — does not regress to the old wall of equal-weight tool buttons", () => {
  it("does not render legacy AdminToolButton / AdminToolGrid blocks", () => {
    // These hypothetical legacy components were removed in P93F — guard that
    // they don't get reintroduced as part of a polish pass.
    expect(src).not.toMatch(/<AdminToolButton/);
    expect(src).not.toMatch(/<AdminToolGrid/);
  });

  it("specialist tools remain behind the AdminSpecialistToolMenu collapsible only", () => {
    // Only one specialist-tool surface should exist on the page.
    const matches = src.match(/<AdminSpecialistToolMenu/g) ?? [];
    expect(matches.length).toBe(1);
  });
});

describe("P93H-C — no frontend secrets or banned scope language", () => {
  it("does not embed service-role keys or other backend secrets", () => {
    expect(src).not.toMatch(/SERVICE_ROLE/i);
    expect(src).not.toMatch(/sk_live_/);
    expect(src).not.toMatch(/sk_test_/);
  });

  it("does not reintroduce banned marketing / scope-creep language", () => {
    const banned = [
      /trusted by/i,
      /guaranteed (revenue|ROI|results)/i,
      /unlimited (support|consulting|advisory)/i,
      /\bHIPAA\b/i,
      /done[- ]for[- ]you/i,
    ];
    for (const re of banned) expect(src).not.toMatch(re);
  });
});