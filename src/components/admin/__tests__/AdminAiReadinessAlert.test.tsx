// p.fix.ai-readiness-status-edge-function — regression tests for the
// admin AI readiness banner. Asserts that the UI handles all five
// readiness states (ready / needs_setup / credit_issue / error /
// function_unavailable) and never spends AI credits on a check.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminAiReadinessAlert } from "@/components/admin/AdminAiReadinessAlert";

const invokeMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

function renderBanner() {
  return render(
    <MemoryRouter>
      <AdminAiReadinessAlert />
    </MemoryRouter>,
  );
}

const baseStatus = {
  ai_gateway_configured: true,
  model: "google/gemini-2.5-flash",
  model_override_configured: false,
  public_ai_calls: false,
  scorecard_public_path: "deterministic",
  diagnostic_public_path: "deterministic",
  report_ai_assist: "ready",
  seed_helpers: "ready",
  billing: "Lovable AI usage bills through Cloud & AI balance.",
  usage_summary: {
    recent_runs_30d: 0,
    recent_failed_runs_30d: 0,
    recent_total_tokens_30d: null,
    last_run_at: null,
    last_error_at: null,
    last_error_message: null,
    balance_signal: "untested",
  },
  workflows: [],
  setup_steps: ["LOVABLE_API_KEY configured."],
};

beforeEach(() => {
  invokeMock.mockReset();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("AdminAiReadinessAlert", () => {
  it("calls the ai-readiness-status edge function (and only that function)", async () => {
    invokeMock.mockResolvedValueOnce({ data: baseStatus, error: null });
    renderBanner();
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("ai-readiness-status");
    });
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it("renders the ready state when LOVABLE_API_KEY is configured and no credit issue", async () => {
    invokeMock.mockResolvedValueOnce({ data: baseStatus, error: null });
    renderBanner();
    const node = await screen.findByTestId("admin-ai-readiness");
    expect(node.getAttribute("data-state")).toBe("ready");
    expect(node.textContent).toMatch(/AI assist is ready/i);
    expect(node.textContent).toMatch(/Deterministic scoring remains the source of truth/i);
  });

  it("renders needs_setup when LOVABLE_API_KEY is missing", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        ...baseStatus,
        ai_gateway_configured: false,
        report_ai_assist: "needs_lovable_api_key",
        seed_helpers: "needs_lovable_api_key",
        usage_summary: { ...baseStatus.usage_summary, balance_signal: "configure_lovable_api_key" },
      },
      error: null,
    });
    renderBanner();
    const node = await screen.findByTestId("admin-ai-readiness");
    expect(node.getAttribute("data-state")).toBe("needs_setup");
    expect(node.textContent).toMatch(/AI setup incomplete/i);
    expect(node.textContent).toMatch(/LOVABLE_API_KEY/);
  });

  it("renders credit_issue when balance_signal is top_up_required", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        ...baseStatus,
        usage_summary: { ...baseStatus.usage_summary, balance_signal: "top_up_required" },
      },
      error: null,
    });
    renderBanner();
    const node = await screen.findByTestId("admin-ai-readiness");
    expect(node.getAttribute("data-state")).toBe("credit_issue");
    expect(node.textContent).toMatch(/credit, quota, or balance issue/i);
  });

  it("renders function_unavailable on a 404 / not-found transport error", async () => {
    invokeMock.mockRejectedValueOnce({ status: 404, message: "Requested function was not found" });
    renderBanner();
    const node = await screen.findByTestId("admin-ai-readiness");
    expect(node.getAttribute("data-state")).toBe("function_unavailable");
    expect(node.textContent).toMatch(/AI readiness endpoint unavailable/i);
    expect(node.textContent).toMatch(/ai-readiness-status/);
  });

  it("renders generic error state on other transport failures", async () => {
    invokeMock.mockRejectedValueOnce(new Error("boom"));
    renderBanner();
    const node = await screen.findByTestId("admin-ai-readiness");
    expect(node.getAttribute("data-state")).toBe("error");
    expect(node.textContent).toMatch(/AI readiness check failed/i);
  });

  it("never exposes raw secrets in the rendered banner", async () => {
    invokeMock.mockResolvedValueOnce({ data: baseStatus, error: null });
    const { container } = renderBanner();
    await screen.findByTestId("admin-ai-readiness");
    const text = container.textContent ?? "";
    // Backend must not leak service-role / api keys; the UI must not invent them either.
    expect(text).not.toMatch(/sk_live_|sk_test_|service_role|SUPABASE_SERVICE_ROLE_KEY|eyJhbGciOi/);
  });
});