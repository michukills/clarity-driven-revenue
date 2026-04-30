// p.fix.internal-admin-account-workflow-separation-and-owner-task-priority
// Regression tests for the internal owner task priority surface.

import { describe, it, expect } from "vitest";
import { buildOwnerTasks } from "@/lib/internal/ownerTasks";
import { computeWarnings } from "@/components/admin/consistency/CustomerConsistencyBanner";

const internal = {
  id: "internal-rgs",
  full_name: "RGS Internal Operations",
  business_name: "Revenue & Growth Systems LLC",
  email: "internal@rgs.local",
  account_kind: "internal_admin" as const,
  status: "internal",
  industry: null,
  industry_confirmed_by_admin: false,
  needs_industry_review: false,
  snapshot_verified: false,
};

const realClientNoIndustry = {
  id: "client-1",
  full_name: "Acme Owner",
  business_name: "Acme HVAC",
  email: "owner@acme.example",
  account_kind: "client" as const,
  industry: null,
  industry_confirmed_by_admin: false,
  needs_industry_review: false,
  snapshot_verified: true,
};

const realClientNeedsReview = {
  id: "client-2",
  full_name: "Bravo Owner",
  business_name: "Bravo Plumbing",
  email: "owner@bravo.example",
  account_kind: "client" as const,
  industry: "other",
  industry_confirmed_by_admin: false,
  needs_industry_review: true,
  snapshot_verified: false,
};

const realClientUnverifiedSnapshot = {
  id: "client-3",
  full_name: "Charlie Owner",
  business_name: "Charlie Roofing",
  email: "owner@charlie.example",
  account_kind: "client" as const,
  industry: "trade_field_service",
  industry_confirmed_by_admin: true,
  needs_industry_review: false,
  snapshot_verified: false,
};

describe("buildOwnerTasks — internal account exclusion", () => {
  it("never produces tasks for the internal RGS account itself", () => {
    const tasks = buildOwnerTasks({ customers: [internal] });
    expect(tasks).toEqual([]);
  });

  it("ignores review requests tied to the internal RGS account", () => {
    const tasks = buildOwnerTasks({
      customers: [internal],
      reviewRequests: [
        {
          id: "rr-internal",
          customer_id: internal.id,
          status: "follow_up_needed",
          priority: "urgent",
          requested_at: new Date().toISOString(),
        },
      ],
    });
    expect(tasks).toEqual([]);
  });
});

describe("buildOwnerTasks — ranking", () => {
  it("ranks unassigned-industry highest, then needs-review, then snapshot", () => {
    const tasks = buildOwnerTasks({
      customers: [realClientNoIndustry, realClientNeedsReview, realClientUnverifiedSnapshot, internal],
    });
    expect(tasks.map((t) => t.kind)).toEqual([
      "industry_unassigned",
      "industry_needs_review",
      "snapshot_unverified",
    ]);
    expect(tasks[0].priority).toBe("urgent");
    expect(tasks[1].priority).toBe("high");
    expect(tasks[2].priority).toBe("normal");
  });

  it("includes unlinked signups and pending review follow-ups for real clients", () => {
    const tasks = buildOwnerTasks({
      customers: [realClientNoIndustry],
      unlinkedSignups: [
        { user_id: "u1", email: "new@example.com", full_name: "New User", created_at: new Date().toISOString() },
      ],
      reviewRequests: [
        {
          id: "rr1",
          customer_id: realClientNoIndustry.id,
          status: "follow_up_needed",
          priority: "normal",
          requested_at: new Date().toISOString(),
        },
      ],
    });
    const kinds = tasks.map((t) => t.kind);
    expect(kinds).toContain("industry_unassigned");
    expect(kinds).toContain("unlinked_signup");
    expect(kinds).toContain("review_follow_up");
  });

  it("urgent review priority bumps the score above a non-urgent open request", () => {
    const open = buildOwnerTasks({
      customers: [realClientUnverifiedSnapshot],
      reviewRequests: [
        {
          id: "open",
          customer_id: realClientUnverifiedSnapshot.id,
          status: "open",
          priority: "normal",
          requested_at: new Date().toISOString(),
        },
      ],
    }).find((t) => t.kind === "review_follow_up");
    const urgent = buildOwnerTasks({
      customers: [realClientUnverifiedSnapshot],
      reviewRequests: [
        {
          id: "urgent",
          customer_id: realClientUnverifiedSnapshot.id,
          status: "follow_up_needed",
          priority: "urgent",
          requested_at: new Date().toISOString(),
        },
      ],
    }).find((t) => t.kind === "review_follow_up");
    expect(urgent!.score).toBeGreaterThan(open!.score);
  });
});

describe("CustomerConsistencyBanner — internal account suppression", () => {
  it("returns no warnings for the internal RGS account even with unpaid/no-industry/portal-locked state", () => {
    const warnings = computeWarnings({
      id: internal.id,
      full_name: internal.full_name,
      business_name: internal.business_name,
      email: internal.email,
      account_kind: internal.account_kind,
      status: internal.status,
      stage: "lead",
      lifecycle_state: "lead",
      portal_unlocked: true,
      package_full_bundle: true,
      industry: null,
      industry_confirmed_by_admin: false,
      needs_industry_review: false,
      toolsAssigned: 0,
    });
    expect(warnings).toEqual([]);
  });

  it("still flags real clients normally", () => {
    const warnings = computeWarnings({
      id: realClientNoIndustry.id,
      full_name: realClientNoIndustry.full_name,
      business_name: realClientNoIndustry.business_name,
      email: realClientNoIndustry.email,
      account_kind: "client",
      stage: "lead",
      lifecycle_state: "lead",
      portal_unlocked: false,
      industry: null,
      industry_confirmed_by_admin: false,
      needs_industry_review: false,
      toolsAssigned: 0,
    });
    expect(warnings.some((w) => w.id === "missing-industry")).toBe(true);
  });
});