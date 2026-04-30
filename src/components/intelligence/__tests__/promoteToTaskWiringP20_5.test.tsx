// P20.5 — UI wiring tests for the Promote-to-task button.
//
// Confirms:
//  - Demo route (no customerId, no handler) → button stays disabled with the
//    existing "coming after admin approval flow is verified" copy.
//  - With a customerId, the button is enabled, calls the helper, shows
//    success copy, and surfaces the duplicate state on a second click.
//  - Custom onPromoteToTask handler overrides the default helper.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { analyzeLeaks } from "@/lib/leakEngine";
import { AdminLeakIntelligencePanel } from "../AdminLeakIntelligencePanel";

const mockPromote = vi.fn();
vi.mock("@/lib/leakEngine/promoteLeakToTask", async () => {
  return {
    promoteLeakToTask: (...args: any[]) => mockPromote(...args),
  };
});

function buildAnalysis() {
  return analyzeLeaks({
    industry: "trade_field_service",
    industryConfirmed: true,
    estimates: [],
    brainSignals: [
      {
        key: "delayed_invoicing",
        observation: "Many completed jobs uninvoiced.",
        estimated_revenue_impact: 8200,
        severity: "high",
      },
    ],
    industryData: { trades: { jobsCompleted: 18, jobsCompletedNotInvoiced: 4 } },
  });
}

beforeEach(() => {
  mockPromote.mockReset();
});

describe("AdminLeakIntelligencePanel — Promote-to-task wiring (P20.5)", () => {
  it("demo mode (no customerId, no handler) keeps the button disabled", () => {
    const a = buildAnalysis();
    render(<AdminLeakIntelligencePanel admin={a.admin} />);
    const btns = screen.getAllByRole("button", { name: /Promote to task/i });
    for (const b of btns) expect((b as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getAllByText(/Task promotion coming after admin approval flow is verified/i).length,
    ).toBeGreaterThan(0);
    expect(mockPromote).not.toHaveBeenCalled();
  });

  it("with a customerId, enables the button and shows the success state", async () => {
    mockPromote.mockResolvedValue({ ok: true, task_id: "task_1", duplicate: false });
    const a = buildAnalysis();
    render(<AdminLeakIntelligencePanel admin={a.admin} customerId="cust_a" />);
    const root = screen.getByTestId("admin-leak-intelligence");
    const btn = within(root).getAllByRole("button", { name: /Promote to task/i })[0];
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mockPromote).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(
        screen.getByText(/Task created in admin review \(not yet released to client\)/i),
      ).toBeTruthy();
    });
    const callArg = mockPromote.mock.calls[0][0];
    expect(callArg.customer_id).toBe("cust_a");
    expect(callArg.ranked.scored.rank).toBe(1);
  });

  it("shows the duplicate-prevention state when the helper returns duplicate=true", async () => {
    mockPromote.mockResolvedValue({ ok: true, task_id: "task_1", duplicate: true });
    const a = buildAnalysis();
    render(<AdminLeakIntelligencePanel admin={a.admin} customerId="cust_a" />);
    const root = screen.getByTestId("admin-leak-intelligence");
    fireEvent.click(within(root).getAllByRole("button", { name: /Promote to task/i })[0]);
    await waitFor(() => {
      expect(screen.getByText(/Task already exists for this issue/i)).toBeTruthy();
    });
  });

  it("shows an error state when the helper returns ok=false", async () => {
    mockPromote.mockResolvedValue({ ok: false, error: "row-level security" });
    const a = buildAnalysis();
    render(<AdminLeakIntelligencePanel admin={a.admin} customerId="cust_a" />);
    const root = screen.getByTestId("admin-leak-intelligence");
    fireEvent.click(within(root).getAllByRole("button", { name: /Promote to task/i })[0]);
    await waitFor(() => {
      expect(screen.getByText(/Promotion failed: row-level security/i)).toBeTruthy();
    });
  });

  it("a custom onPromoteToTask handler overrides the default helper", async () => {
    const custom = vi.fn().mockResolvedValue({ ok: true, task_id: "x", duplicate: false });
    const a = buildAnalysis();
    render(
      <AdminLeakIntelligencePanel
        admin={a.admin}
        customerId="cust_a"
        onPromoteToTask={custom}
      />,
    );
    const root = screen.getByTestId("admin-leak-intelligence");
    fireEvent.click(within(root).getAllByRole("button", { name: /Promote to task/i })[0]);
    await waitFor(() => expect(custom).toHaveBeenCalledTimes(1));
    expect(mockPromote).not.toHaveBeenCalled();
  });
});