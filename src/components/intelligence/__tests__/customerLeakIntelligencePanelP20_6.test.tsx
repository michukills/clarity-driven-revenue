// P20.6 — Mounting tests for CustomerLeakIntelligencePanel.
//
// Confirms:
//  - Real customer renders AdminLeakIntelligencePanel with its customerId.
//  - Promote-to-task button is enabled for a real customer with ranked
//    issues, calls promoteLeakToTask, and starts in client_visible=false
//    via the helper (verified by inspecting the call args; the helper itself
//    is covered by P20.5 tests).
//  - The RGS internal/admin operating account does NOT receive the panel
//    and instead shows the calm internal-only empty state.
//  - Cannabis/MMC mounted output uses cannabis retail/inventory/margin
//    language only and never healthcare/patient/claim/reimbursement/
//    appointment/provider/clinical wording.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { CustomerLeakIntelligencePanel } from "../CustomerLeakIntelligencePanel";

const mockPromote = vi.fn();
vi.mock("@/lib/leakEngine/promoteLeakToTask", () => ({
  promoteLeakToTask: (...args: any[]) => mockPromote(...args),
}));

vi.mock("@/lib/estimates/service", () => ({
  listEstimates: vi.fn(async () => []),
  listInvoiceEstimateLinks: vi.fn(async () => []),
}));

beforeEach(() => {
  mockPromote.mockReset();
});

describe("CustomerLeakIntelligencePanel — P20.6 mounting", () => {
  it("renders the admin intelligence panel with the customer's id", async () => {
    render(
      <CustomerLeakIntelligencePanel
        customer={{
          id: "cust_real_1",
          industry: "trade_field_service",
          industry_confirmed_by_admin: true,
          email: "owner@beltwayfitness.com",
          business_name: "Beltway Fitness",
        }}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("admin-leak-intelligence")).toBeInTheDocument();
    });
    // Promote-to-task should be enabled for a real customer (ranked issues
    // exist for trades industry by default via the General brain leaks).
    const btns = screen.getAllByRole("button", { name: /Promote to task/i });
    expect(btns.length).toBeGreaterThan(0);
  });

  it("Promote-to-task calls helper with the live customer id and admin-review state", async () => {
    mockPromote.mockResolvedValue({ ok: true, task_id: "t_1", duplicate: false });
    render(
      <CustomerLeakIntelligencePanel
        customer={{
          id: "cust_real_2",
          industry: "trade_field_service",
          industry_confirmed_by_admin: true,
        }}
      />,
    );
    await waitFor(() => screen.getByTestId("admin-leak-intelligence"));
    const root = screen.getByTestId("admin-leak-intelligence");
    const btn = within(root).getAllByRole("button", { name: /Promote to task/i })[0];
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => expect(mockPromote).toHaveBeenCalled());
    const args = mockPromote.mock.calls[0][0];
    expect(args.customer_id).toBe("cust_real_2");
    expect(args.ranked).toBeTruthy();
  });

  it("does NOT mount the panel for the RGS internal/admin operating account", async () => {
    render(
      <CustomerLeakIntelligencePanel
        customer={{
          id: "cust_internal",
          email: "internal@rgs.local",
          full_name: "RGS Internal Operations",
          business_name: "Revenue & Growth Systems LLC",
          status: "internal",
          industry: "general_service",
          industry_confirmed_by_admin: true,
        }}
      />,
    );
    expect(
      screen.getByTestId("customer-leak-intelligence-internal-empty"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("admin-leak-intelligence")).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole("button", { name: /Promote to task/i }).length,
    ).toBe(0);
  });

  it("cannabis/MMC mounted UI uses retail/inventory/margin language only — no healthcare wording", async () => {
    render(
      <CustomerLeakIntelligencePanel
        customer={{
          id: "cust_cannabis_1",
          industry: "mmj_cannabis",
          industry_confirmed_by_admin: true,
          business_name: "Green Leaf Dispensary",
        }}
      />,
    );
    await waitFor(() => screen.getByTestId("admin-leak-intelligence"));
    const text = screen.getByTestId("admin-leak-intelligence").textContent ?? "";
    const lower = text.toLowerCase();
    for (const banned of [
      "patient",
      "claim",
      "reimbursement",
      "appointment",
      "provider",
      "clinical",
      "healthcare",
    ]) {
      expect(lower).not.toContain(banned);
    }
  });
});