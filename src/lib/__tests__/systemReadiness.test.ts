import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AI_REVIEW_DISCLOSURE,
  AI_WORKFLOW_CATALOG,
  MAINTENANCE_LINKS,
  aiWorkflowStatus,
} from "@/lib/admin/systemReadiness";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P35 — System Readiness catalog", () => {
  it("covers the AI workflows promised by the request", () => {
    const keys = AI_WORKFLOW_CATALOG.map((w) => w.key);
    for (const required of [
      "scorecard_report_assist",
      "diagnostic_report_assist",
      "client_outcome_review_assist",
    ]) {
      expect(keys).toContain(required);
    }
    // Every wired workflow must point at an edge function that actually
    // exists in the project tree.
    for (const wf of AI_WORKFLOW_CATALOG) {
      if (!wf.edgeFunction) continue;
      const path = join(root, "supabase/functions", wf.edgeFunction, "index.ts");
      expect(() => readFileSync(path, "utf8")).not.toThrow();
    }
  });

  it("never surfaces secrets, tokens, or hardcoded balances", () => {
    const page = read("src/pages/admin/SystemReadiness.tsx");
    const lib = read("src/lib/admin/systemReadiness.ts");
    for (const banned of [
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "service_role",
      "Bearer ",
      "sk_live_",
      "sk-",
    ]) {
      expect(page).not.toContain(banned);
      expect(lib).not.toContain(banned);
    }
    // Manual-check links must say so rather than invent a number.
    for (const m of MAINTENANCE_LINKS.filter((m) => m.balanceMode === "manual")) {
      expect(m.manualNote ?? "").not.toMatch(/\$\s*\d/);
    }
  });

  it("admin route is gated by ProtectedRoute requireRole='admin'", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/admin\/system-readiness"\s+element=\{<ProtectedRoute requireRole="admin">/,
    );
  });

  it("status helper degrades safely when AI is not configured", () => {
    expect(
      aiWorkflowStatus({
        hasLovableKey: false,
        balanceSignal: null,
        recentFailedRuns: 0,
        edgeFunction: "report-ai-assist",
      }).status,
    ).toBe("needs_api_key");

    expect(
      aiWorkflowStatus({
        hasLovableKey: true,
        balanceSignal: "top_up_required",
        recentFailedRuns: 0,
        edgeFunction: "report-ai-assist",
      }).status,
    ).toBe("attention");

    expect(
      aiWorkflowStatus({
        hasLovableKey: true,
        balanceSignal: "no_recent_credit_error",
        recentFailedRuns: 3,
        edgeFunction: "report-ai-assist",
      }).status,
    ).toBe("error");

    expect(
      aiWorkflowStatus({
        hasLovableKey: true,
        balanceSignal: "no_recent_credit_error",
        recentFailedRuns: 0,
        edgeFunction: null,
      }).status,
    ).toBe("not_configured");

    expect(
      aiWorkflowStatus({
        hasLovableKey: true,
        balanceSignal: "no_recent_credit_error",
        recentFailedRuns: 0,
        edgeFunction: "report-ai-assist",
      }).status,
    ).toBe("ready");
  });

  it("includes the AI review disclosure required by the spec", () => {
    const joined = AI_REVIEW_DISCLOSURE.join(" ");
    expect(joined).toMatch(/deterministic/i);
    expect(joined).toMatch(/admin review/i);
  });
});
