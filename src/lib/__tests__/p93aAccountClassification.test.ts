import { describe, expect, it } from "vitest";
import {
  classifyAccount,
  isDemoTestAccount,
  isGigWorkAccount,
  isProspectDraftAccount,
  isRealClientAccount,
  isNeedsReviewAccount,
  isPendingRequestAccount,
  ACCOUNT_KIND_DISPLAY_LABEL,
  DATA_MODE_LABEL,
  PAYMENT_MODE_LABEL,
  PORTAL_ACCESS_LABEL,
  SCOPE_BOUNDARY_LABEL,
} from "@/lib/accounts/accountClassification";

describe("P93A — Account Classification", () => {
  it("1. classifies a real client", () => {
    expect(
      isRealClientAccount({
        account_kind: "client",
        email: "owner@beltway.com",
        business_name: "Beltway Fitness",
      }),
    ).toBe(true);
  });

  it("2. classifies a demo/test account", () => {
    expect(isDemoTestAccount({ account_kind: "demo", email: "demo@demo.rgs.local" })).toBe(true);
  });

  it("3. classifies a prospect/draft", () => {
    expect(isProspectDraftAccount({ account_kind: "prospect" })).toBe(true);
  });

  it("4. classifies gig work via service_type", () => {
    expect(isGigWorkAccount({ account_kind: "client", service_type: "Fiverr SOP gig" })).toBe(true);
  });

  it("5. classifies pending request", () => {
    expect(isPendingRequestAccount({ signup_request_status: "pending_review" })).toBe(true);
  });

  it("6. demo/test uses demo_data + demo_only scope", () => {
    const c = classifyAccount({ account_kind: "demo" });
    expect(c.dataMode).toBe("demo_data");
    expect(c.scopeBoundary).toBe("demo_only");
  });

  it("7. gig work uses gig_scope_data + gig_deliverable_only", () => {
    const c = classifyAccount({ is_gig: true });
    expect(c.dataMode).toBe("gig_scope_data");
    expect(c.scopeBoundary).toBe("gig_deliverable_only");
  });

  it("8. prospect uses draft_data + prospect_only", () => {
    const c = classifyAccount({ account_kind: "prospect" });
    expect(c.dataMode).toBe("draft_data");
    expect(c.scopeBoundary).toBe("prospect_only");
  });

  it("9. real client does not get demo/gig labels", () => {
    const c = classifyAccount({ account_kind: "client", email: "a@b.com" });
    expect(c.displayLabel).toBe("Real Client");
  });

  it("10. demo/test does not get real client label", () => {
    expect(classifyAccount({ is_demo_account: true }).displayLabel).toBe("Demo / Test Account");
  });

  it("11. gig work does not get full client label", () => {
    expect(classifyAccount({ is_gig: true }).displayLabel).toBe("Gig Work Account");
  });

  it("12. demo cannot use real payment flows", () => {
    const c = classifyAccount({ account_kind: "demo" });
    expect(c.allowedActions.canUsePaymentFlows).toBe(false);
    expect(c.paymentMode).toBe("demo_no_real_payment");
  });

  it("13-15. gig blocks Diagnostic/Implementation/Control System without upgrade", () => {
    const c = classifyAccount({ is_gig: true });
    expect(c.allowedActions.canAccessFullDiagnostic).toBe(false);
    expect(c.allowedActions.canAccessImplementation).toBe(false);
    expect(c.allowedActions.canAccessControlSystem).toBe(false);
  });

  it("16. pending request cannot access tools", () => {
    const c = classifyAccount({ signup_request_status: "pending_review" });
    expect(c.allowedActions.canAssignTools).toBe(false);
    expect(c.allowedActions.canRunStandaloneTools).toBe(false);
  });

  it("17. needs_review blocks risky actions", () => {
    const c = classifyAccount({ is_demo: true, has_real_payment: true });
    expect(c.accountKind).toBe("needs_review");
    expect(c.riskLevel).toBe("blocked");
    expect(c.allowedActions.canUsePaymentFlows).toBe(false);
  });

  it("18. is_demo + account_kind=client → needs_review", () => {
    expect(
      isNeedsReviewAccount({ account_kind: "client", is_demo: true }),
    ).toBe(true);
  });

  it("19. is_demo + real payment → needs_review", () => {
    expect(isNeedsReviewAccount({ is_demo_account: true, has_real_payment: true })).toBe(true);
  });

  it("20. gig + Control System active → needs_review", () => {
    expect(
      isNeedsReviewAccount({ is_gig: true, control_system_active: true }),
    ).toBe(true);
  });

  it("21. gig + Implementation active without upgrade → needs_review", () => {
    expect(
      isNeedsReviewAccount({ is_gig: true, implementation_active: true }),
    ).toBe(true);
    // upgraded → allowed
    expect(
      isNeedsReviewAccount({
        is_gig: true,
        implementation_active: true,
        upgraded_to_implementation: true,
      }),
    ).toBe(false);
  });

  it("22. suspended + active portal → needs_review", () => {
    expect(
      isNeedsReviewAccount({ suspended: true, portal_access_status: "active" }),
    ).toBe(true);
  });

  it("23. denied signup + active portal → needs_review", () => {
    expect(
      isNeedsReviewAccount({
        signup_request_status: "denied",
        portal_access_status: "active",
      }),
    ).toBe(true);
  });

  it("24. demo paid state is not real payment", () => {
    const c = classifyAccount({ account_kind: "demo", payment_status: "paid" });
    // demo classification reached only when no conflict; payment_status alone
    // is not has_real_payment, so this stays demo with simulated payment label.
    expect(c.accountKind).toBe("demo_test");
    expect(c.paymentMode).toBe("demo_no_real_payment");
  });

  it("25. gig payment is labeled gig_payment", () => {
    const c = classifyAccount({ is_gig: true, payment_status: "paid" });
    expect(c.paymentMode).toBe("gig_payment");
  });

  it("26. safe display labels are human-readable", () => {
    expect(ACCOUNT_KIND_DISPLAY_LABEL.gig_work).toBe("Gig Work Account");
    expect(DATA_MODE_LABEL.gig_scope_data).toBe("Gig Scope Data Only");
    expect(PAYMENT_MODE_LABEL.gig_payment).toBe("Gig Payment");
    expect(PORTAL_ACCESS_LABEL.gig_limited_access).toBe("Gig Limited Access");
    expect(SCOPE_BOUNDARY_LABEL.gig_deliverable_only).toBe("Gig Deliverable Only");
  });

  it("27. allowed actions are deterministic by kind", () => {
    const real = classifyAccount({ account_kind: "client", diagnostic_paid: true });
    expect(real.allowedActions.canAccessFullDiagnostic).toBe(true);
    const gig = classifyAccount({ is_gig: true });
    expect(gig.allowedActions.canCreateGigDeliverable).toBe(true);
    expect(gig.allowedActions.canAccessFullDiagnostic).toBe(false);
  });
});