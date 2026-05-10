/**
 * P93A — Account Type Classification + Gig Work Account Foundation
 *
 * Deterministic, centralized resolver that turns the messy combination of
 * customer / signup-request / payment / portal-access fields into a single
 * structured `AccountClassification` object the rest of the OS can trust.
 *
 * IMPORTANT:
 *   - This helper is read-only. It never mutates DB rows.
 *   - It never assumes capabilities that are not explicitly true in the input.
 *   - When fields disagree it returns `needs_review` + `riskLevel: "blocked"`
 *     rather than guessing.
 *   - Gig Work Account is a first-class kind here even though the DB does not
 *     yet have a dedicated `is_gig` column. Callers can supply `is_gig` /
 *     `gig_status` / `service_type` markers; otherwise classification falls
 *     back to the safest available signals.
 */

import {
  getCustomerAccountKind,
  type CustomerAccountKind,
} from "@/lib/customers/accountKind";

export type AccountKind =
  | "real_client"
  | "demo_test"
  | "prospect_draft"
  | "gig_work"
  | "pending_request"
  | "needs_review";

export type DataMode =
  | "real_data"
  | "demo_data"
  | "draft_data"
  | "gig_scope_data"
  | "unknown";

export type PaymentMode =
  | "real_payment"
  | "admin_link_only"
  | "gig_payment"
  | "demo_no_real_payment"
  | "not_required"
  | "unknown";

export type PortalAccessState =
  | "not_invited"
  | "pending"
  | "active"
  | "suspended"
  | "denied"
  | "demo_access"
  | "gig_limited_access"
  | "unknown";

export type DeliveryStage =
  | "not_started"
  | "diagnostic"
  | "implementation"
  | "control_system"
  | "standalone"
  | "gig_deliverable"
  | "complete"
  | "unknown";

export type ScopeBoundary =
  | "full_diagnostic"
  | "implementation"
  | "control_system"
  | "standalone_deliverable"
  | "gig_deliverable_only"
  | "demo_only"
  | "prospect_only"
  | "unknown";

export type RiskLevel = "normal" | "demo" | "gig" | "warning" | "blocked";

export interface AllowedAccountActions {
  canInvite: boolean;
  canAssignTools: boolean;
  canCreateReport: boolean;
  canUseDemoData: boolean;
  canAccessClientPortal: boolean;
  canUsePaymentFlows: boolean;
  canRunStandaloneTools: boolean;
  canCreateGigDeliverable: boolean;
  canPublishClientVisibleOutputs: boolean;
  canAccessFullDiagnostic: boolean;
  canAccessImplementation: boolean;
  canAccessControlSystem: boolean;
}

export interface AccountClassification {
  accountKind: AccountKind;
  displayLabel: string;
  dataMode: DataMode;
  paymentMode: PaymentMode;
  portalAccessState: PortalAccessState;
  deliveryStage: DeliveryStage;
  scopeBoundary: ScopeBoundary;
  riskLevel: RiskLevel;
  helperText: string;
  conflictReasons: string[];
  allowedActions: AllowedAccountActions;
}

/**
 * Input shape. Every field is optional — callers pass whatever they have.
 * Names mirror the most common DB / API columns used today.
 */
export interface AccountInput {
  // Identity
  account_kind?: CustomerAccountKind | string | null;
  is_demo_account?: boolean | null;
  is_demo?: boolean | null;
  is_gig?: boolean | null;
  gig_status?: string | null;
  service_type?: string | null;
  client_type?: string | null;
  status?: string | null;
  account_status?: string | null;
  email?: string | null;
  full_name?: string | null;
  business_name?: string | null;

  // Stage / payment
  client_stage?: string | null;
  delivery_stage?: string | null;
  payment_status?: string | null;
  diagnostic_status?: string | null;
  diagnostic_paid?: boolean | null;
  implementation_status?: string | null;
  implementation_active?: boolean | null;
  control_system_status?: string | null;
  control_system_active?: boolean | null;
  standalone_status?: string | null;
  has_real_payment?: boolean | null;

  // Scope explicitly approved/upgraded by admin
  upgraded_to_diagnostic?: boolean | null;
  upgraded_to_implementation?: boolean | null;
  upgraded_to_control_system?: boolean | null;

  // Portal / signup
  portal_access_status?: PortalAccessState | string | null;
  signup_request_status?: string | null;
  has_user_link?: boolean | null;
  approved?: boolean | null;
  suspended?: boolean | null;
}

const REAL_PAID_STATES = new Set([
  "paid",
  "succeeded",
  "complete",
  "completed",
  "active",
  "captured",
]);

function lower(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

function isRealPayment(input: AccountInput): boolean {
  if (input.has_real_payment === true) return true;
  if (input.diagnostic_paid === true) return true;
  const ps = lower(input.payment_status);
  if (ps && REAL_PAID_STATES.has(ps)) return true;
  return false;
}

function isGigSignal(input: AccountInput): boolean {
  if (input.is_gig === true) return true;
  const st = lower(input.service_type);
  const cs = lower(input.client_type);
  const ak = lower(input.account_kind);
  const gs = lower(input.gig_status);
  if (gs) return true;
  if (ak === "gig" || ak === "gig_work") return true;
  if (cs === "gig" || cs === "gig_work") return true;
  if (
    st.includes("gig") ||
    st.includes("fiverr") ||
    st.includes("standalone deliverable") ||
    st.includes("standalone-deliverable")
  ) {
    return true;
  }
  return false;
}

function isProspectSignal(input: AccountInput): boolean {
  const ak = lower(input.account_kind);
  const cs = lower(input.client_type);
  const stt = lower(input.status);
  const acs = lower(input.account_status);
  return (
    ak === "prospect" ||
    ak === "draft" ||
    ak === "prospect_draft" ||
    cs === "prospect" ||
    cs === "draft" ||
    stt === "prospect" ||
    stt === "draft" ||
    acs === "prospect" ||
    acs === "draft"
  );
}

function pendingFromSignup(status: string): boolean {
  return (
    status === "pending_review" ||
    status === "clarification_requested" ||
    status === "pending"
  );
}

function deniedFromSignup(status: string): boolean {
  return status === "denied" || status === "rejected";
}

function suspendedFromSignup(status: string): boolean {
  return status === "suspended";
}

const ALL_ACTIONS_FALSE: AllowedAccountActions = {
  canInvite: false,
  canAssignTools: false,
  canCreateReport: false,
  canUseDemoData: false,
  canAccessClientPortal: false,
  canUsePaymentFlows: false,
  canRunStandaloneTools: false,
  canCreateGigDeliverable: false,
  canPublishClientVisibleOutputs: false,
  canAccessFullDiagnostic: false,
  canAccessImplementation: false,
  canAccessControlSystem: false,
};

/**
 * ACCOUNT TYPE LABELS
 */
export const ACCOUNT_KIND_DISPLAY_LABEL: Record<AccountKind, string> = {
  real_client: "Real Client",
  demo_test: "Demo / Test Account",
  prospect_draft: "Prospect / Draft",
  gig_work: "Gig Work Account",
  pending_request: "Pending Request",
  needs_review: "Needs Review",
};

export const DATA_MODE_LABEL: Record<DataMode, string> = {
  real_data: "Real Client Data",
  demo_data: "Demo Data Only",
  draft_data: "Draft / Pre-Sale Data",
  gig_scope_data: "Gig Scope Data Only",
  unknown: "Unknown / Needs Review",
};

export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  real_payment: "Real Payment",
  admin_link_only: "Admin Payment Link Only",
  gig_payment: "Gig Payment",
  demo_no_real_payment: "Demo Payment Simulation",
  not_required: "No Real Payment Required",
  unknown: "Unknown / Needs Review",
};

export const PORTAL_ACCESS_LABEL: Record<PortalAccessState, string> = {
  not_invited: "Not Invited",
  pending: "Pending Approval",
  active: "Active",
  suspended: "Suspended",
  denied: "Denied",
  demo_access: "Demo Access Only",
  gig_limited_access: "Gig Limited Access",
  unknown: "Unknown / Needs Review",
};

export const SCOPE_BOUNDARY_LABEL: Record<ScopeBoundary, string> = {
  full_diagnostic: "Full Diagnostic",
  implementation: "Implementation",
  control_system: "RGS Control System",
  standalone_deliverable: "Standalone Deliverable",
  gig_deliverable_only: "Gig Deliverable Only",
  demo_only: "Demo Only",
  prospect_only: "Prospect Only",
  unknown: "Unknown / Needs Review",
};

/**
 * MAIN CLASSIFIER
 */
export function classifyAccount(input: AccountInput): AccountClassification {
  const conflictReasons: string[] = [];

  // 1) Resolve underlying customer kind via the existing helper so we share
  //    one source of truth for internal/demo/test/client detection.
  const baseKind = getCustomerAccountKind({
    account_kind: input.account_kind ?? null,
    is_demo_account: input.is_demo_account ?? null,
    email: input.email ?? null,
    full_name: input.full_name ?? null,
    business_name: input.business_name ?? null,
    status: input.status ?? null,
  });

  const isDemo =
    baseKind === "demo" ||
    input.is_demo === true ||
    input.is_demo_account === true;
  const isInternalAdmin = baseKind === "internal_admin";
  const isTest = baseKind === "test";
  const gig = isGigSignal(input);
  const prospect = isProspectSignal(input);

  const realPayment = isRealPayment(input);
  const signupStatus = lower(input.signup_request_status);
  const portalRaw = lower(input.portal_access_status);
  const suspended =
    input.suspended === true ||
    portalRaw === "suspended" ||
    suspendedFromSignup(signupStatus);
  const denied = portalRaw === "denied" || deniedFromSignup(signupStatus);

  const implActive =
    input.implementation_active === true ||
    lower(input.implementation_status) === "active";
  const csActive =
    input.control_system_active === true ||
    lower(input.control_system_status) === "active";
  const dxActive = realPayment || lower(input.diagnostic_status) === "active";

  // 2) Conflict detection (explicit checks before classification finalizes)
  if (isDemo && lower(input.account_kind) === "client") {
    conflictReasons.push(
      "Account is flagged as demo but account_kind is set to client.",
    );
  }
  if (isDemo && input.has_real_payment === true) {
    conflictReasons.push("Demo account has a real payment recorded.");
  }
  if (isDemo && realPayment && input.diagnostic_paid === true) {
    conflictReasons.push(
      "Demo account is marked as Diagnostic Paid with a real payment source.",
    );
  }
  if (
    gig &&
    csActive &&
    input.upgraded_to_control_system !== true
  ) {
    conflictReasons.push(
      "Gig Work Account has RGS Control System access without an explicit upgrade.",
    );
  }
  if (
    gig &&
    implActive &&
    input.upgraded_to_implementation !== true
  ) {
    conflictReasons.push(
      "Gig Work Account has Implementation access without an explicit upgrade.",
    );
  }
  if (
    gig &&
    input.diagnostic_paid === true &&
    input.upgraded_to_diagnostic !== true
  ) {
    conflictReasons.push(
      "Gig Work Account is marked Diagnostic Paid but only a standalone/gig deliverable was scoped.",
    );
  }
  if (
    (denied || pendingFromSignup(signupStatus)) &&
    portalRaw === "active"
  ) {
    conflictReasons.push(
      "Account has active portal access while the signup request is pending or denied.",
    );
  }
  if (suspended && portalRaw === "active") {
    conflictReasons.push(
      "Account is suspended but still has active portal access.",
    );
  }

  // 3) If there are conflicts → needs_review (blocked)
  if (conflictReasons.length > 0) {
    return {
      accountKind: "needs_review",
      displayLabel: ACCOUNT_KIND_DISPLAY_LABEL.needs_review,
      dataMode: "unknown",
      paymentMode: "unknown",
      portalAccessState: "unknown",
      deliveryStage: "unknown",
      scopeBoundary: "unknown",
      riskLevel: "blocked",
      helperText:
        "This account has conflicting fields. Resolve the conflict before taking any client-visible or payment action.",
      conflictReasons,
      allowedActions: ALL_ACTIONS_FALSE,
    };
  }

  // 4) Pending request short-circuit (no customer row yet, or signup pending)
  if (pendingFromSignup(signupStatus) || portalRaw === "pending") {
    return {
      accountKind: "pending_request",
      displayLabel: ACCOUNT_KIND_DISPLAY_LABEL.pending_request,
      dataMode: "unknown",
      paymentMode: "not_required",
      portalAccessState: "pending",
      deliveryStage: "not_started",
      scopeBoundary: "unknown",
      riskLevel: "warning",
      helperText: "Awaiting admin review. No tools or client data are available yet.",
      conflictReasons: [],
      allowedActions: ALL_ACTIONS_FALSE,
    };
  }
  if (denied) {
    return {
      accountKind: "needs_review",
      displayLabel: ACCOUNT_KIND_DISPLAY_LABEL.needs_review,
      dataMode: "unknown",
      paymentMode: "not_required",
      portalAccessState: "denied",
      deliveryStage: "not_started",
      scopeBoundary: "unknown",
      riskLevel: "blocked",
      helperText: "Signup was denied. Risky actions are blocked.",
      conflictReasons: ["Signup request status is denied/rejected."],
      allowedActions: ALL_ACTIONS_FALSE,
    };
  }

  // 5) Demo / Test
  if (isDemo || isTest || isInternalAdmin) {
    const portal: PortalAccessState =
      portalRaw === "active" ? "demo_access" :
      portalRaw === "demo_access" ? "demo_access" :
      portalRaw === "not_invited" ? "not_invited" :
      "demo_access";
    return {
      accountKind: "demo_test",
      displayLabel: ACCOUNT_KIND_DISPLAY_LABEL.demo_test,
      dataMode: "demo_data",
      paymentMode: "demo_no_real_payment",
      portalAccessState: portal,
      deliveryStage: "not_started",
      scopeBoundary: "demo_only",
      riskLevel: "demo",
      helperText:
        "Demo or test record. Use only seeded demo data. Real payment, real client outputs, and real diagnostic/implementation/control-system access are not available.",
      conflictReasons: [],
      allowedActions: {
        ...ALL_ACTIONS_FALSE,
        canUseDemoData: true,
        canAssignTools: true,
      },
    };
  }

  // 6) Gig Work
  if (gig) {
    const portal: PortalAccessState =
      portalRaw === "active" ? "gig_limited_access" :
      portalRaw === "gig_limited_access" ? "gig_limited_access" :
      portalRaw === "not_invited" ? "not_invited" :
      input.has_user_link ? "gig_limited_access" : "not_invited";

    const stage: DeliveryStage =
      lower(input.standalone_status) === "active" ? "standalone" :
      lower(input.delivery_stage) === "gig_deliverable" ? "gig_deliverable" :
      "gig_deliverable";

    return {
      accountKind: "gig_work",
      displayLabel: ACCOUNT_KIND_DISPLAY_LABEL.gig_work,
      dataMode: "gig_scope_data",
      paymentMode:
        input.has_real_payment === true || lower(input.payment_status) === "paid"
          ? "gig_payment"
          : "unknown",
      portalAccessState: portal,
      deliveryStage: stage,
      scopeBoundary: "gig_deliverable_only",
      riskLevel: "gig",
      helperText:
        "Gig Work Account. Scope is limited to the purchased standalone deliverable. Full Diagnostic, Implementation, and RGS Control System are not included unless explicitly upgraded.",
      conflictReasons: [],
      allowedActions: {
        ...ALL_ACTIONS_FALSE,
        canAssignTools: true,
        canRunStandaloneTools: true,
        canCreateGigDeliverable: true,
        canCreateReport: true,
        canPublishClientVisibleOutputs: true,
        canAccessFullDiagnostic: input.upgraded_to_diagnostic === true,
        canAccessImplementation: input.upgraded_to_implementation === true,
        canAccessControlSystem: input.upgraded_to_control_system === true,
      },
    };
  }

  // 7) Prospect / Draft
  if (prospect) {
    return {
      accountKind: "prospect_draft",
      displayLabel: ACCOUNT_KIND_DISPLAY_LABEL.prospect_draft,
      dataMode: "draft_data",
      paymentMode: "not_required",
      portalAccessState: input.has_user_link ? "pending" : "not_invited",
      deliveryStage: "not_started",
      scopeBoundary: "prospect_only",
      riskLevel: "warning",
      helperText:
        "Pre-sale or draft record. Admin draft notes only. Client portal access, invites, and client-visible outputs require explicit conversion.",
      conflictReasons: [],
      allowedActions: {
        ...ALL_ACTIONS_FALSE,
        canCreateReport: true,
      },
    };
  }

  // 8) Real Client (default for non-demo, non-gig, non-prospect)
  const stage: DeliveryStage =
    csActive ? "control_system" :
    implActive ? "implementation" :
    dxActive ? "diagnostic" :
    lower(input.standalone_status) === "active" ? "standalone" :
    "not_started";

  const scope: ScopeBoundary =
    csActive ? "control_system" :
    implActive ? "implementation" :
    dxActive ? "full_diagnostic" :
    lower(input.standalone_status) === "active" ? "standalone_deliverable" :
    "unknown";

  const portal: PortalAccessState = suspended
    ? "suspended"
    : portalRaw === "active"
      ? "active"
      : input.has_user_link
        ? "active"
        : portalRaw === "not_invited"
          ? "not_invited"
          : "not_invited";

  return {
    accountKind: "real_client",
    displayLabel: ACCOUNT_KIND_DISPLAY_LABEL.real_client,
    dataMode: "real_data",
    paymentMode: realPayment
      ? "real_payment"
      : lower(input.payment_status) === "admin_link"
        ? "admin_link_only"
        : "unknown",
    portalAccessState: portal,
    deliveryStage: stage,
    scopeBoundary: scope,
    riskLevel: suspended ? "warning" : "normal",
    helperText:
      "Real client account. Access to Diagnostic, Implementation, and RGS Control System depends on stage, payment, tool assignment, and admin approval.",
    conflictReasons: [],
    allowedActions: {
      canInvite: !suspended,
      canAssignTools: !suspended,
      canCreateReport: !suspended,
      canUseDemoData: false,
      canAccessClientPortal: !suspended && portal === "active",
      canUsePaymentFlows: !suspended,
      canRunStandaloneTools: !suspended,
      canCreateGigDeliverable: false,
      canPublishClientVisibleOutputs: !suspended,
      canAccessFullDiagnostic: !suspended && (dxActive || input.upgraded_to_diagnostic === true),
      canAccessImplementation: !suspended && (implActive || input.upgraded_to_implementation === true),
      canAccessControlSystem: !suspended && (csActive || input.upgraded_to_control_system === true),
    },
  };
}

/* ----------------------------- Utility helpers ---------------------------- */

export const isRealClientAccount = (i: AccountInput) =>
  classifyAccount(i).accountKind === "real_client";
export const isDemoTestAccount = (i: AccountInput) =>
  classifyAccount(i).accountKind === "demo_test";
export const isProspectDraftAccount = (i: AccountInput) =>
  classifyAccount(i).accountKind === "prospect_draft";
export const isGigWorkAccount = (i: AccountInput) =>
  classifyAccount(i).accountKind === "gig_work";
export const isPendingRequestAccount = (i: AccountInput) =>
  classifyAccount(i).accountKind === "pending_request";
export const isNeedsReviewAccount = (i: AccountInput) =>
  classifyAccount(i).accountKind === "needs_review";

export const getAccountKindLabel = (i: AccountInput) =>
  classifyAccount(i).displayLabel;
export const getAccountScopeBoundary = (i: AccountInput) =>
  classifyAccount(i).scopeBoundary;
export const getAllowedAccountActions = (i: AccountInput) =>
  classifyAccount(i).allowedActions;
export const getAccountConflictReasons = (i: AccountInput) =>
  classifyAccount(i).conflictReasons;