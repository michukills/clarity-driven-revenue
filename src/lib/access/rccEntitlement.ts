// P7.2.4 — Single source of truth for Revenue Control Center™ entitlement.
//
// Access rule:
//   1. Admins always have access.
//   2. Non-admins need the true RCC resource assigned (isRccResource), AND
//      at least one of:
//       a) currently in an implementation stage (implementation_included)
//       b) implementation ended <= 30 days ago (post_implementation_grace)
//       c) subscription is 'active' AND not paid-through-expired
//       d) subscription is 'comped'
//       e) subscription is 'past_due' but still inside the post-implementation
//          grace window
//
// Onboarding Worksheet, Revenue & Risk Monitor, etc. NEVER unlock RCC because
// the resource gate uses isRccResource (P7.2.1).

import { isRccResource, type RccResourceLike } from "@/lib/access/rccResource";

export const RCC_GRACE_DAYS = 30;

// Active implementation stages (excluding implementation_complete which marks
// the end of the engagement). Mirrors IMPLEMENTATION_STAGE_KEYS in portal.ts
// but lives here so this helper has no UI dependency.
const ACTIVE_IMPL_STAGES = new Set<string>([
  "implementation_added",
  "implementation_onboarding",
  "tools_assigned",
  "client_training_setup",
  "implementation_active",
  "waiting_on_client",
  "review_revision_window",
  // legacy
  "implementation",
  "work_in_progress",
]);

export type RccSubscriptionStatus =
  | "none"
  | "active"
  | "past_due"
  | "cancelled"
  | "comped";

export type RccEntitlementReason =
  | "admin"
  | "implementation_included"
  | "post_implementation_grace"
  | "subscription_active"
  | "subscription_comped"
  | "subscription_past_due_grace"
  | "no_rcc_resource"
  | "subscription_required"
  | "subscription_past_due"
  | "subscription_cancelled"
  | "paid_through_expired";

export interface RccEntitlementInput {
  isAdmin?: boolean;
  /** Resource rows assigned to the customer (with title/url/etc). */
  assignedResources?: Array<RccResourceLike | null | undefined>;
  /** Pre-computed boolean — overrides resource scan when provided. */
  hasRccResource?: boolean;
  stage?: string | null;
  implementationEndedAt?: string | null; // YYYY-MM-DD
  rccSubscriptionStatus?: RccSubscriptionStatus | string | null;
  rccPaidThrough?: string | null; // YYYY-MM-DD
  /** Override "today" (YYYY-MM-DD), useful for tests. Defaults to today. */
  today?: string;
}

export interface RccEntitlement {
  hasAccess: boolean;
  reason: RccEntitlementReason;
  hasRccResource: boolean;
  includedByImplementation: boolean;
  includedByGrace: boolean;
  subscriptionAllows: boolean;
  /** YYYY-MM-DD — last day of the 30-day post-implementation grace, if any. */
  graceEndsAt: string | null;
  paidThrough: string | null;
  subscriptionStatus: RccSubscriptionStatus;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Compute the last day of the post-implementation grace window. */
export function computeGraceEndsAt(
  implementationEndedAt: string | null | undefined,
): string | null {
  if (!implementationEndedAt) return null;
  return addDaysIso(implementationEndedAt, RCC_GRACE_DAYS);
}

function normalizeStatus(s: string | null | undefined): RccSubscriptionStatus {
  switch (s) {
    case "active":
    case "past_due":
    case "cancelled":
    case "comped":
      return s;
    default:
      return "none";
  }
}

export function computeRccEntitlement(input: RccEntitlementInput): RccEntitlement {
  const today = input.today || todayIso();
  const status = normalizeStatus(input.rccSubscriptionStatus);
  const paidThrough = input.rccPaidThrough || null;

  // Admin short-circuit.
  if (input.isAdmin) {
    return {
      hasAccess: true,
      reason: "admin",
      hasRccResource: true,
      includedByImplementation: false,
      includedByGrace: false,
      subscriptionAllows: false,
      graceEndsAt: computeGraceEndsAt(input.implementationEndedAt),
      paidThrough,
      subscriptionStatus: status,
    };
  }

  const hasRccResource =
    input.hasRccResource ??
    (input.assignedResources || []).some((r) => isRccResource(r));

  const stage = input.stage || null;
  const includedByImplementation = !!stage && ACTIVE_IMPL_STAGES.has(stage);

  const graceEndsAt = computeGraceEndsAt(input.implementationEndedAt);
  const includedByGrace =
    !!graceEndsAt && today <= graceEndsAt && !includedByImplementation;

  const paidExpired = !!paidThrough && paidThrough < today;
  const subscriptionAllows =
    status === "comped" ||
    (status === "active" && !paidExpired) ||
    (status === "past_due" && includedByGrace);

  if (!hasRccResource) {
    return {
      hasAccess: false,
      reason: "no_rcc_resource",
      hasRccResource: false,
      includedByImplementation,
      includedByGrace,
      subscriptionAllows,
      graceEndsAt,
      paidThrough,
      subscriptionStatus: status,
    };
  }

  // Allow path — pick the most "earned" reason.
  if (includedByImplementation) {
    return {
      hasAccess: true,
      reason: "implementation_included",
      hasRccResource,
      includedByImplementation,
      includedByGrace,
      subscriptionAllows,
      graceEndsAt,
      paidThrough,
      subscriptionStatus: status,
    };
  }
  if (status === "comped") {
    return {
      hasAccess: true,
      reason: "subscription_comped",
      hasRccResource,
      includedByImplementation,
      includedByGrace,
      subscriptionAllows: true,
      graceEndsAt,
      paidThrough,
      subscriptionStatus: status,
    };
  }
  if (status === "active" && !paidExpired) {
    return {
      hasAccess: true,
      reason: "subscription_active",
      hasRccResource,
      includedByImplementation,
      includedByGrace,
      subscriptionAllows: true,
      graceEndsAt,
      paidThrough,
      subscriptionStatus: status,
    };
  }
  if (includedByGrace) {
    return {
      hasAccess: true,
      reason:
        status === "past_due"
          ? "subscription_past_due_grace"
          : "post_implementation_grace",
      hasRccResource,
      includedByImplementation,
      includedByGrace,
      subscriptionAllows,
      graceEndsAt,
      paidThrough,
      subscriptionStatus: status,
    };
  }

  // Deny path — pick clearest reason.
  let reason: RccEntitlementReason = "subscription_required";
  if (status === "past_due") reason = "subscription_past_due";
  else if (status === "cancelled") reason = "subscription_cancelled";
  else if (status === "active" && paidExpired) reason = "paid_through_expired";

  return {
    hasAccess: false,
    reason,
    hasRccResource,
    includedByImplementation,
    includedByGrace,
    subscriptionAllows,
    graceEndsAt,
    paidThrough,
    subscriptionStatus: status,
  };
}

export function reasonLabel(r: RccEntitlementReason): string {
  switch (r) {
    case "admin": return "Admin access";
    case "implementation_included": return "Included with active implementation";
    case "post_implementation_grace": return "Post-implementation grace period";
    case "subscription_active": return "Active subscription";
    case "subscription_comped": return "Comped subscription";
    case "subscription_past_due_grace": return "Past due — covered by grace period";
    case "no_rcc_resource": return "RCC resource not assigned";
    case "subscription_required": return "Subscription required";
    case "subscription_past_due": return "Subscription past due";
    case "subscription_cancelled": return "Subscription cancelled";
    case "paid_through_expired": return "Paid-through date expired";
  }
}