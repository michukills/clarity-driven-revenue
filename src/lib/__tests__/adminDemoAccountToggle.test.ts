import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Admin Demo Account Toggle contract.
 *
 * Pins:
 *  - Admin Customer Detail surfaces an "Account Type: Client/Demo" label.
 *  - Admin can flip the type via a confirmation-gated button.
 *  - The toggle writes the existing source-of-truth column
 *    (`is_demo_account`) — no new duplicate `account_type` field.
 *  - The toggle is mounted on an admin-only route and is not exposed
 *    in any client/portal surface.
 *  - `is_demo_account` is not consulted by access/payment/report/visibility
 *    gates, so flipping demo state cannot bypass security.
 */

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("Admin Demo Account Toggle", () => {
  it("Customer Detail shows an Account Type label and toggle button", () => {
    // P93F replaced the inline "Account Type:" label with the
    // AccountIdentityHeader + AccountTypeBadge contract. The toggle button
    // remains on CustomerDetail.
    const detail = read("src/pages/admin/CustomerDetail.tsx");
    const header = read("src/components/admin/AccountIdentityHeader.tsx");
    const badges = read("src/components/admin/AccountClassificationBadges.tsx");
    expect(detail).toMatch(/AccountIdentityHeader/);
    expect(header).toMatch(/AccountTypeBadge/);
    expect(badges).toMatch(/AccountTypeBadge/);
    expect(detail).toMatch(/data-testid="account-type-toggle"/);
    expect(detail).toMatch(/Mark as Demo Account/);
    expect(detail).toMatch(/Return to Client Account/);
  });

  it("toggle requires confirmation before mutating", () => {
    const src = read("src/pages/admin/CustomerDetail.tsx");
    // The toggle handler must (a) build a confirmation message that names
    // "demo account" and (b) early-return when confirm() is dismissed.
    expect(/Mark this account as a demo account/.test(src)).toBe(true);
    expect(/Return this demo account to a normal client account/.test(src)).toBe(true);
    expect(/if \(!window\.confirm\(msg\)\) return/.test(src)).toBe(true);
  });

  it("toggle writes the existing is_demo_account column (no duplicate field)", () => {
    const src = read("src/pages/admin/CustomerDetail.tsx");
    expect(src).toMatch(/updateField\("is_demo_account"/);
    // Reject accidental duplicate columns being introduced for the same concept.
    expect(/account_type:\s*["']/.test(src)).toBe(false);
  });

  it("Customer Detail route is admin-only via ProtectedRoute requireRole=admin", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/admin\/customers\/:id"\s+element=\{<ProtectedRoute\s+requireRole="admin">/,
    );
  });

  it("client/portal surfaces never expose a mutating demo-account control", () => {
    const portalFiles = [
      "src/pages/portal/Account.tsx",
      "src/components/portal/PortalShell.tsx",
      "src/components/portal/ClientToolGuard.tsx",
    ];
    for (const rel of portalFiles) {
      const src = read(rel);
      expect(/Mark as Demo|Return to Client/i.test(src)).toBe(false);
      expect(/update[^\n]*is_demo_account/i.test(src)).toBe(false);
    }
  });

  it("is_demo_account is not consulted by access/payment/report gates", () => {
    const gateFiles = [
      "src/components/portal/ClientToolGuard.tsx",
      "src/components/portal/ProtectedRoute.tsx",
      "src/lib/visibility.ts",
    ];
    for (const rel of gateFiles) {
      const src = read(rel);
      expect(
        /is_demo_account/.test(src),
        `gate file must not branch on is_demo_account: ${rel}`,
      ).toBe(false);
    }
  });

  it("source of truth helper still derives Demo from is_demo_account", () => {
    const src = read("src/lib/customers/accountKind.ts");
    expect(src).toMatch(/is_demo_account/);
    expect(src).toMatch(/return "demo"/);
  });
});
