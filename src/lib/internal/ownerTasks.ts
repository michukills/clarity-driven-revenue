// p.fix.internal-admin-account-workflow-separation-and-owner-task-priority
//
// Internal-only owner task surface for the RGS owner/admin.
//
// This is NOT the client task system. It surfaces real internal actions the
// RGS owner needs to take (e.g. assign/verify a client industry, link an
// orphan signup, follow up on a flagged review request) and ranks them by
// priority so the most consequential admin work is visible first.
//
// Inputs are derived from existing data the admin dashboard already loads,
// so we do not introduce a new table or a parallel state machine.

import {
  getCustomerAccountKind,
  isCustomerFlowAccount,
  type CustomerAccountKind,
} from "@/lib/customers/accountKind";

export type OwnerTaskKind =
  | "industry_unassigned"
  | "industry_needs_review"
  | "industry_unconfirmed"
  | "snapshot_unverified"
  | "unlinked_signup"
  | "review_follow_up";

export type OwnerTaskPriority = "urgent" | "high" | "normal";

export interface OwnerTask {
  id: string;
  kind: OwnerTaskKind;
  priority: OwnerTaskPriority;
  /** Numeric score used to sort. Higher = more important. */
  score: number;
  title: string;
  detail: string;
  /** Where the owner should go to act on this task. */
  href: string;
  /** Display label for the action button. */
  actionLabel: string;
  /** Optional related client label (used for grouping in the panel). */
  clientLabel?: string;
  /** Source signal so the panel can group internal vs. client-facing items. */
  source: "client_workflow" | "internal_admin" | "signup";
}

export interface OwnerTaskCustomerLike {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  status?: string | null;
  account_kind?: CustomerAccountKind | string | null;
  is_demo_account?: boolean | null;
  archived_at?: string | null;
  industry?: string | null;
  industry_confirmed_by_admin?: boolean | null;
  needs_industry_review?: boolean | null;
  /** Whether the client business snapshot has been admin-verified. */
  snapshot_verified?: boolean | null;
}

export interface OwnerTaskUnlinkedSignup {
  user_id: string;
  email: string;
  full_name?: string | null;
  created_at: string;
}

export interface OwnerTaskReviewRequest {
  id: string;
  customer_id: string;
  status: "open" | "reviewing" | "follow_up_needed" | "resolved" | "dismissed";
  priority: "normal" | "urgent";
  requested_at: string;
}

export interface BuildOwnerTasksInput {
  customers: OwnerTaskCustomerLike[];
  unlinkedSignups?: OwnerTaskUnlinkedSignup[];
  reviewRequests?: OwnerTaskReviewRequest[];
}

const PRIORITY_FROM_SCORE = (score: number): OwnerTaskPriority =>
  score >= 80 ? "urgent" : score >= 50 ? "high" : "normal";

function clientLabel(c: OwnerTaskCustomerLike): string {
  return (c.business_name?.trim() || c.full_name?.trim() || c.email?.trim() || "Unknown client");
}

/**
 * Pure builder. No database I/O. Easy to test with seeded data.
 *
 * - Only flow accounts (real clients) generate client-workflow owner tasks.
 * - The internal RGS account never produces tasks against itself for client
 *   readiness (industry, snapshot, etc.) because it is not a client.
 */
export function buildOwnerTasks(input: BuildOwnerTasksInput): OwnerTask[] {
  const tasks: OwnerTask[] = [];
  const flow = (input.customers || [])
    .filter((c) => !c.archived_at)
    .filter(isCustomerFlowAccount);

  for (const c of flow) {
    const label = clientLabel(c);
    if (!c.industry) {
      const score = 85;
      tasks.push({
        id: `industry_unassigned:${c.id}`,
        kind: "industry_unassigned",
        priority: PRIORITY_FROM_SCORE(score),
        score,
        title: `Assign industry for ${label}`,
        detail:
          "Industry-specific tools, templates, and learning stay restricted until you assign an industry or mark the client for review.",
        href: `/admin/customers/${c.id}#industry-assignment`,
        actionLabel: "Assign industry",
        clientLabel: label,
        source: "client_workflow",
      });
      continue;
    }
    if (c.industry === "other" || c.needs_industry_review) {
      const score = 70;
      tasks.push({
        id: `industry_needs_review:${c.id}`,
        kind: "industry_needs_review",
        priority: PRIORITY_FROM_SCORE(score),
        score,
        title: `Verify industry for ${label}`,
        detail:
          "Client industry is flagged for review. Confirm the correct industry from recorded evidence before enabling industry-specific tools.",
        href: `/admin/customers/${c.id}#industry-assignment`,
        actionLabel: "Verify industry",
        clientLabel: label,
        source: "client_workflow",
      });
      continue;
    }
    if (!c.industry_confirmed_by_admin) {
      const score = 55;
      tasks.push({
        id: `industry_unconfirmed:${c.id}`,
        kind: "industry_unconfirmed",
        priority: PRIORITY_FROM_SCORE(score),
        score,
        title: `Confirm industry for ${label}`,
        detail:
          "Industry is assigned but not yet admin-confirmed. Industry-specific access remains restricted until confirmation.",
        href: `/admin/customers/${c.id}#industry-assignment`,
        actionLabel: "Confirm industry",
        clientLabel: label,
        source: "client_workflow",
      });
      continue;
    }
    if (c.snapshot_verified === false) {
      const score = 40;
      tasks.push({
        id: `snapshot_unverified:${c.id}`,
        kind: "snapshot_unverified",
        priority: PRIORITY_FROM_SCORE(score),
        score,
        title: `Verify business snapshot for ${label}`,
        detail:
          "Industry is confirmed but the client business snapshot is not admin-verified. Industry-specific tools stay restricted until verification.",
        href: `/admin/customers/${c.id}#business-snapshot`,
        actionLabel: "Verify snapshot",
        clientLabel: label,
        source: "client_workflow",
      });
    }
  }

  for (const s of input.unlinkedSignups || []) {
    const score = 60;
    tasks.push({
      id: `unlinked_signup:${s.user_id}`,
      kind: "unlinked_signup",
      priority: PRIORITY_FROM_SCORE(score),
      score,
      title: `Link signup ${s.email}`,
      detail: "A new portal signup is not yet linked to a customer record.",
      href: "/admin/pending-accounts",
      actionLabel: "Open pending accounts",
      clientLabel: s.full_name?.trim() || s.email,
      source: "signup",
    });
  }

  // Build a quick lookup of internal-account ids so review requests tied to
  // the internal account never enter the owner task list as client follow-ups.
  const internalIds = new Set(
    (input.customers || [])
      .filter((c) => getCustomerAccountKind(c) === "internal_admin")
      .map((c) => c.id),
  );
  for (const r of input.reviewRequests || []) {
    if (internalIds.has(r.customer_id)) continue;
    if (r.status !== "follow_up_needed" && r.status !== "open") continue;
    const cust = (input.customers || []).find((c) => c.id === r.customer_id);
    if (cust && !isCustomerFlowAccount(cust)) continue;
    const label = cust ? clientLabel(cust) : "Unknown client";
    const baseScore = r.status === "follow_up_needed" ? 75 : 50;
    const score = r.priority === "urgent" ? Math.min(100, baseScore + 15) : baseScore;
    tasks.push({
      id: `review_follow_up:${r.id}`,
      kind: "review_follow_up",
      priority: PRIORITY_FROM_SCORE(score),
      score,
      title:
        r.status === "follow_up_needed"
          ? `Follow up on review for ${label}`
          : `Open review request for ${label}`,
      detail:
        r.status === "follow_up_needed"
          ? "Client weekly check-in flagged a follow-up. Resolve or reschedule the review."
          : "An RGS review request is open and waiting for triage.",
      href: "/admin/rgs-review",
      actionLabel: "Open review queue",
      clientLabel: label,
      source: "client_workflow",
    });
  }

  // Sort: highest score first, then stable by id.
  tasks.sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id));
  return tasks;
}

export const PRIORITY_LABEL: Record<OwnerTaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
};

export const PRIORITY_TONE: Record<OwnerTaskPriority, string> = {
  urgent: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  high: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  normal: "border-border bg-muted/30 text-muted-foreground",
};