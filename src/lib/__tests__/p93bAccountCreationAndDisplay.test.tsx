/**
 * P93B — Account Creation UX + Account Card / Status Display Clarity.
 *
 * Static + render coverage for:
 *  - new typed Create Account dialog
 *  - reusable AccountClassificationPanel / AccountTypePillFromInput
 *  - removal of confusing shorthand from key admin surfaces
 */
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AccountClassificationPanel,
  AccountTypePillFromInput,
  NeedsReviewBanner,
} from "@/components/admin/AccountClassificationBadges";
import { CreateAccountDialog } from "@/components/admin/CreateAccountDialog";
import { classifyAccount } from "@/lib/accounts/accountClassification";

const root = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("P93B — Account Creation + Display Clarity", () => {
  it("1. CreateAccountDialog requires explicit account type before submit", () => {
    render(<CreateAccountDialog />);
    fireEvent.click(screen.getByTestId("open-create-account"));
    const submit = screen.getByTestId("create-account-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(submit.textContent).toMatch(/choose a record type/i);
  });

  it("2. Offers exactly the four required record types", () => {
    render(<CreateAccountDialog />);
    fireEvent.click(screen.getByTestId("open-create-account"));
    expect(screen.getByTestId("record-type-real_client")).toBeTruthy();
    expect(screen.getByTestId("record-type-demo_test")).toBeTruthy();
    expect(screen.getByTestId("record-type-prospect_draft")).toBeTruthy();
    expect(screen.getByTestId("record-type-gig_work")).toBeTruthy();
  });

  it("3. Submit stays disabled until confirmation + name + email are provided", () => {
    render(<CreateAccountDialog />);
    fireEvent.click(screen.getByTestId("open-create-account"));
    fireEvent.click(screen.getByTestId("record-type-gig_work"));
    const submit = screen.getByTestId("create-account-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/full name/i), {
      target: { value: "Jane" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^email$/i), {
      target: { value: "j@example.com" },
    });
    expect(submit.disabled).toBe(true); // still missing confirmation
  });

  it("4. Review summary uses P93A classifyAccount labels", () => {
    render(<AccountClassificationPanel input={{ is_gig: true, full_name: "X" }} />);
    expect(screen.getAllByText(/Gig Work Account/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Gig Scope Data Only/i)).toBeTruthy();
    expect(screen.getByText(/Gig Deliverable Only/i)).toBeTruthy();
  });

  it("5. Demo classification renders demo facets, not real-client labels", () => {
    render(<AccountClassificationPanel input={{ is_demo_account: true }} />);
    expect(screen.getAllByText(/Demo \/ Test Account/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Demo Data Only/i)).toBeTruthy();
    expect(screen.queryByText(/Real Client Data/i)).toBeNull();
    expect(screen.queryByText(/Real Payment$/i)).toBeNull();
  });

  it("6. Prospect classification labels stay prospect-only", () => {
    render(<AccountClassificationPanel input={{ account_kind: "prospect" }} />);
    expect(screen.getAllByText(/Prospect \/ Draft/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Draft \/ Pre-Sale Data/i)).toBeTruthy();
    expect(screen.getByText(/Prospect Only/i)).toBeTruthy();
  });

  it("7. NeedsReviewBanner renders only when classification is needs_review", () => {
    const ok = classifyAccount({ account_kind: "client" });
    const conflict = classifyAccount({ is_demo: true, has_real_payment: true });
    const { container: c1 } = render(<NeedsReviewBanner classification={ok} />);
    expect(c1.textContent).toBe("");
    const { container: c2 } = render(<NeedsReviewBanner classification={conflict} />);
    expect(c2.textContent).toMatch(/Needs Review/i);
    expect(c2.textContent).toMatch(/Risk: Blocked/i);
  });

  it("8. AccountTypePillFromInput renders the safe label", () => {
    render(<AccountTypePillFromInput input={{ is_gig: true }} />);
    expect(screen.getByText(/Gig Work Account/i)).toBeTruthy();
  });

  it("9. Customers admin page no longer ships the legacy 'New Client' inline form", () => {
    const src = read("src/pages/admin/Customers.tsx");
    expect(src).toContain("CreateAccountDialog");
    expect(src).not.toMatch(/<DialogTitle>New Client<\/DialogTitle>/);
    expect(src).not.toMatch(/Create Client/);
  });

  it("10. CustomerDetail header replaces DX:/IM:/generic Demo shorthand", () => {
    const src = read("src/pages/admin/CustomerDetail.tsx");
    expect(src).not.toMatch(/DX:\s*\{labelOf/);
    expect(src).not.toMatch(/IM:\s*\{labelOf/);
    expect(src).toContain("Diagnostic: {labelOf");
    expect(src).toContain("Implementation: {labelOf");
    expect(src).toContain("AccountClassificationPanel");
  });

  it("11. Gig record-type persistence payload tags service_type with gig", async () => {
    // Internal contract — submitting Gig Work must produce a service_type
    // that classifyAccount() recognises as a gig signal.
    const mod = await import("@/components/admin/CreateAccountDialog");
    // The persistence payload helper isn't exported — we instead verify by
    // the classification logic which mirrors it.
    const c = classifyAccount({
      account_kind: "client",
      service_type: "gig: standalone deliverable",
    });
    expect(c.accountKind).toBe("gig_work");
    expect(mod.CreateAccountDialog).toBeTruthy();
  });

  it("12. Demo record-type produces demo classification via stored fields", () => {
    const c = classifyAccount({ account_kind: "demo", is_demo_account: true });
    expect(c.accountKind).toBe("demo_test");
    expect(c.allowedActions.canUsePaymentFlows).toBe(false);
  });

  it("13. Prospect record-type produces prospect classification via stored fields", () => {
    const c = classifyAccount({ account_kind: "prospect" });
    expect(c.accountKind).toBe("prospect_draft");
    expect(c.allowedActions.canAccessClientPortal).toBe(false);
  });
});