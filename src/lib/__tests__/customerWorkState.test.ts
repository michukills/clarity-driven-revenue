/**
 * P93E-E2G-P2.7 — CustomerWorkState helper.
 *
 * Locks the lane-aware contract used by the customer workbench panel:
 *   - diagnostic customer → Industry Diagnostic Interview is the primary CTA
 *   - implementation customer → Implementation Roadmap is the primary CTA
 *   - control system customer → RGS Control System is the primary CTA
 *   - standalone customer → Standalone Tool Runner is the primary CTA
 *   - archived customer → no active workflow, blocked reason is explained
 *   - demo / test accounts remain labeled
 *   - internal admin accounts never get workflow tools
 *   - all returned routes are non-empty when the launcher is enabled
 */
import { describe, it, expect } from "vitest";
import { getCustomerWorkState } from "@/lib/workflow/customerWorkState";

describe("getCustomerWorkState", () => {
  it("diagnostic customer → Industry Diagnostic Interview is primary", () => {
    const s = getCustomerWorkState({
      id: "cust-1",
      lifecycle_state: "diagnostic",
      package_diagnostic: true,
      account_kind: "client",
      email: "owner@example.com",
    });
    expect(s.lane).toBe("diagnostic");
    expect(s.primaryCta?.id).toBe("industry_diagnostic_interview");
    expect(s.primaryCta?.route).toBe("/admin/industry-interviews");
    // Reading order matters: tool launchers carry top-to-bottom intent.
    expect(s.toolLaunchers.map((t) => t.id)).toContain("evidence_vault");
    expect(s.toolLaunchers.map((t) => t.id)).toContain("priority_action_tracker");
  });

  it("implementation customer → Implementation Roadmap is primary", () => {
    const s = getCustomerWorkState({
      id: "cust-2",
      lifecycle_state: "implementation",
      package_implementation: true,
      account_kind: "client",
    });
    expect(s.lane).toBe("implementation");
    expect(s.primaryCta?.id).toBe("implementation_roadmap");
    expect(s.primaryCta?.route).toBe(
      "/admin/customers/cust-2/implementation-roadmap",
    );
  });

  it("control system customer → RGS Control System is primary", () => {
    const s = getCustomerWorkState({
      id: "cust-3",
      lifecycle_state: "control_system_active",
      package_ongoing_support: true,
      account_kind: "client",
    });
    expect(s.lane).toBe("control_system");
    expect(s.primaryCta?.id).toBe("rgs_control_system");
    expect(s.primaryCta?.route).toBe(
      "/admin/customers/cust-3/rgs-control-system",
    );
  });

  it("standalone tool customer → Standalone Tool Runner is primary", () => {
    const s = getCustomerWorkState({
      id: "cust-4",
      lifecycle_state: "standalone_tool_active",
      package_addons: true,
      account_kind: "client",
    });
    expect(s.lane).toBe("standalone");
    expect(s.primaryCta?.id).toBe("standalone_tool_runner");
    expect(s.primaryCta?.route).toBe("/admin/standalone-tool-runner");
  });

  it("archived customer → blocked, no workflow tools", () => {
    const s = getCustomerWorkState({
      id: "cust-5",
      status: "archived",
      lifecycle_state: "diagnostic",
      account_kind: "client",
    });
    expect(s.isArchived).toBe(true);
    expect(s.lane).toBe("inactive");
    expect(s.toolLaunchers).toEqual([]);
    expect(s.blockedReason).toMatch(/archived/i);
  });

  it("demo account is labeled but still gets lane tools", () => {
    const s = getCustomerWorkState({
      id: "cust-6",
      lifecycle_state: "diagnostic",
      package_diagnostic: true,
      is_demo_account: true,
      account_kind: "demo",
      email: "demo+owner@demo.rgs.local",
    });
    expect(s.accountKind).toBe("demo");
    expect(s.isDemoOrTest).toBe(true);
    expect(s.lane).toBe("diagnostic");
    expect(s.primaryCta?.id).toBe("industry_diagnostic_interview");
  });

  it("internal admin account never gets workflow tools", () => {
    const s = getCustomerWorkState({
      id: "cust-internal",
      email: "internal@rgs.local",
      lifecycle_state: "lead",
    });
    expect(s.accountKind).toBe("internal_admin");
    expect(s.blockedReason).toMatch(/internal admin/i);
  });

  it("lead with no packages → falls back to advisory notes", () => {
    const s = getCustomerWorkState({
      id: "cust-7",
      lifecycle_state: "lead",
      account_kind: "client",
    });
    expect(s.lane).toBe("lead");
    expect(s.primaryCta?.id).toBe("advisory_notes");
    expect(s.primaryCta?.route).toBe("/admin/customers/cust-7/advisory-notes");
  });

  it("every enabled launcher exposes a non-empty route", () => {
    const lanes = [
      { id: "a", lifecycle_state: "diagnostic", package_diagnostic: true },
      { id: "b", lifecycle_state: "implementation", package_implementation: true },
      { id: "c", lifecycle_state: "control_system_active", package_ongoing_support: true },
      { id: "d", lifecycle_state: "standalone_tool_active", package_addons: true },
      { id: "e", lifecycle_state: "lead" },
    ];
    for (const c of lanes) {
      const s = getCustomerWorkState(c);
      for (const t of s.toolLaunchers) {
        if (!t.blockedReason) {
          expect(t.route, `${c.id}:${t.id}`).toBeTruthy();
        }
      }
    }
  });

  it("primaryCta is null when no enabled launcher exists (completed)", () => {
    const s = getCustomerWorkState({
      id: "cust-9",
      lifecycle_state: "completed",
      account_kind: "client",
    });
    expect(s.lane).toBe("completed");
    expect(s.primaryCta).toBeNull();
    expect(s.toolLaunchers).toEqual([]);
  });
});
