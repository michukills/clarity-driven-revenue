import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  getAdminNextActions,
  getPrimaryAdminNextAction,
  getBlockedActionReasons,
} from "@/lib/workflowClarity/adminNextActions";
import { AdminNextActionPanel } from "@/components/admin/AdminNextActionPanel";
import { AdminToolGuidePanel } from "@/components/admin/AdminToolGuidePanel";

describe("P93C — Admin Next Action engine", () => {
  it("11. Needs Review primary next action is Resolve Account Type Conflict", () => {
    const primary = getPrimaryAdminNextAction(
      { is_demo_account: true, has_real_payment: true },
      { customerId: "abc" },
    );
    expect(primary?.label).toBe("Resolve Account Type Conflict");
    expect(primary?.actionType).toBe("resolve");
  });

  it("12. Pending Request primary next action is Review Access Request", () => {
    const primary = getPrimaryAdminNextAction(
      { signup_request_status: "pending_review" },
      {},
    );
    expect(primary?.label).toBe("Review Access Request");
    expect(primary?.targetRoute).toBe("/admin/pending-accounts");
  });

  it("13. Gig Work primary action points toward standalone/gig workflow", () => {
    const primary = getPrimaryAdminNextAction({ is_gig: true }, { customerId: "g1" });
    expect(primary?.label).toBe("Open Standalone Tool Runner");
    expect(primary?.targetRoute).toBe("/admin/standalone-tool-runner");
  });

  it("14. Real Client next action adapts to invite/diagnostic/evidence/report state", () => {
    const noInvite = getPrimaryAdminNextAction(
      { account_kind: "client" },
      { customerId: "c1", inviteSent: false },
    );
    expect(noInvite?.label).toBe("Send Invite");

    const dxReady = getPrimaryAdminNextAction(
      { account_kind: "client", diagnostic_status: "active" },
      { customerId: "c1", inviteSent: true },
    );
    expect(dxReady?.label).toBe("Start Diagnostic Interview");

    const evidenceReady = getPrimaryAdminNextAction(
      { account_kind: "client", diagnostic_status: "active" },
      {
        customerId: "c1",
        inviteSent: true,
        diagnosticInterviewStarted: true,
        evidenceSubmitted: true,
      },
    );
    expect(evidenceReady?.label).toBe("Review Evidence");

    const repairReady = getPrimaryAdminNextAction(
      { account_kind: "client", diagnostic_status: "active" },
      {
        customerId: "c1",
        inviteSent: true,
        diagnosticInterviewStarted: true,
        evidenceSubmitted: true,
        evidenceReviewed: true,
        diagnosticScoreLocked: true,
        stabilitySnapshotDrafted: true,
      },
    );
    expect(repairReady?.label).toBe("Create Priority Repair Map");
  });

  it("15. Blocked actions include plain-English disabled reasons", () => {
    const reasons = getBlockedActionReasons({ is_gig: true }, { customerId: "g1" });
    expect(reasons.length).toBeGreaterThan(0);
    for (const r of reasons) {
      expect(r.length).toBeGreaterThan(8);
      expect(r.toLowerCase()).toMatch(/locked|blocked/);
    }
  });

  it("Demo/Test never returns real payment or real publish primary actions", () => {
    const actions = getAdminNextActions({ is_demo_account: true }, { customerId: "d1" });
    const labels = actions.map((a) => a.label);
    expect(labels).toContain("Open Demo Walkthrough");
    expect(labels).not.toContain("Send Invite");
    expect(actions.find((a) => a.label === "Use Real Payment Flows")?.priority).toBe("blocked");
  });

  it("Prospect/Draft cannot publish or assign full client tools", () => {
    const actions = getAdminNextActions(
      { account_kind: "prospect" },
      { customerId: "p1" },
    );
    const blocked = actions.filter((a) => a.priority === "blocked").map((a) => a.label);
    expect(blocked).toContain("Publish Client-Visible Output");
    expect(blocked).toContain("Assign Full Client Tools");
  });
});

describe("P93C — Admin panels render safely", () => {
  it("16. AdminNextActionPanel renders primary action and blocked reason", () => {
    render(
      <MemoryRouter>
        <AdminNextActionPanel
          input={{ is_gig: true }}
          context={{ customerId: "g1" }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Open Standalone Tool Runner")).toBeInTheDocument();
    expect(screen.getByText(/Locked — outside current account scope/i)).toBeInTheDocument();
  });

  it("17. AdminToolGuidePanel renders recommended tools with common mistakes", () => {
    render(
      <MemoryRouter>
        <AdminToolGuidePanel
          input={{ account_kind: "client", diagnostic_status: "active" }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Owner Diagnostic Interview")).toBeInTheDocument();
    expect(screen.getAllByText(/Common mistakes/i).length).toBeGreaterThan(0);
  });

  it("Needs Review panel shows the resolve-conflict primary and blocks invites/tools/payment/publish", () => {
    render(
      <MemoryRouter>
        <AdminNextActionPanel
          input={{ is_demo_account: true, has_real_payment: true }}
          context={{ customerId: "x1" }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Resolve Account Type Conflict")).toBeInTheDocument();
    expect(screen.getByText("Send Invite")).toBeInTheDocument();
    expect(screen.getByText("Publish Client-Visible Output")).toBeInTheDocument();
  });
});

describe("P93C — public/admin separation and forbidden language", () => {
  it("18. Admin tool guidance source files are not imported by public/client surfaces", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = path.resolve(process.cwd(), "src");
    const offenders: string[] = [];
    function walk(dir: string) {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(name)) {
          const rel = path.relative(root, full).replace(/\\/g, "/");
          if (rel.startsWith("pages/portal/")) continue;
          if (rel.startsWith("components/admin/")) continue;
          if (rel.startsWith("pages/admin/")) continue;
          if (rel.startsWith("lib/")) continue;
          if (rel.startsWith("test/") || rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
          const src = fs.readFileSync(full, "utf8");
          if (
            src.includes("AdminNextActionPanel") ||
            src.includes("AdminToolGuidePanel") ||
            src.includes("workflowClarity/toolUseGuide") ||
            src.includes("workflowClarity/adminNextActions")
          ) {
            offenders.push(rel);
          }
        }
      }
    }
    walk(root);
    expect(offenders).toEqual([]);
  });

  it("19. Action engine + panels avoid fake live-sync / automation / AI scoring language", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const files = [
      "src/lib/workflowClarity/toolUseGuide.ts",
      "src/lib/workflowClarity/adminNextActions.ts",
      "src/components/admin/AdminNextActionPanel.tsx",
      "src/components/admin/AdminToolGuidePanel.tsx",
    ];
    const blob = files.map((f) => fs.readFileSync(f, "utf8")).join("\n").toLowerCase();
    expect(blob).not.toMatch(/live sync/);
    expect(blob).not.toMatch(/fully automated/);
    expect(blob).not.toMatch(/ai-powered scoring/);
    expect(blob).not.toMatch(/guaranteed/);
    expect(blob).not.toMatch(/risk-free/);
    expect(blob).not.toMatch(/lay the bricks/);
  });
});