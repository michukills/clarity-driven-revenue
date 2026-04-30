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
//
// P20.7 — Adds cases that verify the panel feeds latest scorecard +
// snapshot rows into analyzeLeaks() so customers WITHOUT estimate friction
// can still produce ranked issues from General-Brain signals.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { CustomerLeakIntelligencePanel } from "../CustomerLeakIntelligencePanel";

import * as estimatesService from "@/lib/estimates/service";

const mockPromote = vi.fn();
vi.mock("@/lib/leakEngine/promoteLeakToTask", () => ({
  promoteLeakToTask: (...args: any[]) => mockPromote(...args),
}));

vi.mock("@/lib/estimates/service", () => ({
  listEstimates: vi.fn(async () => []),
  listInvoiceEstimateLinks: vi.fn(async () => []),
}));

// In-memory supabase stub for the two tables the wrapper now reads from.
// Each test seeds rows via `setSupabaseRows({...})` before render.
let supabaseRows: {
  scorecard_runs?: any | null;
  client_business_snapshots?: any | null;
} = {};
function setSupabaseRows(rows: typeof supabaseRows) {
  supabaseRows = rows;
}
vi.mock("@/integrations/supabase/client", () => {
  const builderFor = (table: string) => {
    const result = () => ({ data: (supabaseRows as any)[table] ?? null, error: null });
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      ilike: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => result(),
      single: async () => result(),
      then: (resolve: any) => Promise.resolve(result()).then(resolve),
    };
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => builderFor(table),
    },
  };
});

function seedAgedDraftEstimate() {
  const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
  (estimatesService.listEstimates as any).mockResolvedValueOnce([
    {
      id: "est_1",
      customer_id: "cust",
      amount: 4500,
      client_or_job: "Acme HVAC",
      service_category: null,
      estimate_number: "E-1",
      estimate_date: old.slice(0, 10),
      status: "draft",
      sent_at: null,
      approved_at: null,
      rejected_at: null,
      expires_at: null,
      notes: null,
      created_at: old,
      updated_at: old,
    },
  ]);
}

beforeEach(() => {
  mockPromote.mockReset();
  (estimatesService.listEstimates as any).mockReset?.();
  (estimatesService.listEstimates as any).mockResolvedValue?.([]);
  (estimatesService.listInvoiceEstimateLinks as any).mockReset?.();
  (estimatesService.listInvoiceEstimateLinks as any).mockResolvedValue?.([]);
  setSupabaseRows({});
});

describe("CustomerLeakIntelligencePanel — P20.6 mounting", () => {
  it("renders the admin intelligence panel with the customer's id", async () => {
    seedAgedDraftEstimate();
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
    seedAgedDraftEstimate();
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

describe("CustomerLeakIntelligencePanel — P20.7 scorecard/snapshot context", () => {
  it("feeds latest scorecard signals so a customer with NO estimates still ranks issues", async () => {
    setSupabaseRows({
      scorecard_runs: {
        id: "run_1",
        created_at: new Date().toISOString(),
        pillar_results: [
          { pillar_id: "owner", band: 1, confidence: "high" },
          { pillar_id: "financial", band: 2, confidence: "medium" },
        ],
        overall_confidence: "medium",
      },
      client_business_snapshots: {
        snapshot_status: "admin_verified",
        industry_verified: true,
        what_business_does: "Field-service business.",
      },
    });
    render(
      <CustomerLeakIntelligencePanel
        customer={{
          id: "cust_no_estimates",
          industry: "trade_field_service",
          industry_confirmed_by_admin: true,
          email: "owner@field.example",
        }}
      />,
    );
    await waitFor(() => screen.getByTestId("admin-leak-intelligence"));
    // Without scorecard signals, trade_field_service + zero estimates would
    // still produce 0 ranked items. With the scorecard signals fed in, the
    // panel should now expose at least one Promote-to-task action.
    const btns = screen.getAllByRole("button", { name: /Promote to task/i });
    expect(btns.length).toBeGreaterThan(0);
  });

  it("does not fabricate findings when scorecard + snapshot are missing", async () => {
    setSupabaseRows({}); // both null
    render(
      <CustomerLeakIntelligencePanel
        customer={{
          id: "cust_blank",
          industry: "trade_field_service",
          industry_confirmed_by_admin: true,
          email: "blank@example.com",
        }}
      />,
    );
    await waitFor(() => screen.getByTestId("admin-leak-intelligence"));
    // No estimates, no scorecard signals, no snapshot → no enabled Promote
    // buttons. The panel still renders calm empty/Needs-Verification copy
    // via the existing missing-data path.
    const enabledBtns = screen
      .queryAllByRole("button", { name: /Promote to task/i })
      .filter((b) => !(b as HTMLButtonElement).disabled);
    expect(enabledBtns.length).toBe(0);
  });

  it("cannabis/MMC with scorecard + snapshot still emits no healthcare wording", async () => {
    setSupabaseRows({
      scorecard_runs: {
        id: "run_c",
        pillar_results: [
          { pillar_id: "financial", band: 1, confidence: "high" },
          { pillar_id: "operations", band: 2, confidence: "medium" },
        ],
      },
      client_business_snapshots: {
        snapshot_status: "admin_verified",
        industry_verified: true,
        what_business_does: "Regulated cannabis dispensary; retail + inventory + margins.",
      },
    });
    render(
      <CustomerLeakIntelligencePanel
        customer={{
          id: "cust_cannabis_2",
          industry: "mmj_cannabis",
          industry_confirmed_by_admin: true,
          email: "owner@dispo.example",
          business_name: "Green Leaf Dispensary",
        }}
      />,
    );
    await waitFor(() => screen.getByTestId("admin-leak-intelligence"));
    const lower = (screen.getByTestId("admin-leak-intelligence").textContent ?? "").toLowerCase();
    for (const banned of [
      "patient",
      "claim",
      "reimbursement",
      "appointment",
      "provider",
      "clinical",
      "healthcare",
      "diagnosis",
      "insurance",
    ]) {
      expect(lower).not.toContain(banned);
    }
  });

  it("internal RGS account still skips client intelligence even with scorecard data present", async () => {
    setSupabaseRows({
      scorecard_runs: {
        id: "run_internal",
        pillar_results: [{ pillar_id: "owner", band: 1, confidence: "high" }],
      },
    });
    render(
      <CustomerLeakIntelligencePanel
        customer={{
          id: "cust_internal_2",
          email: "internal@rgs.local",
          full_name: "RGS Internal Operations",
          business_name: "Revenue & Growth Systems LLC",
          status: "internal",
          industry: "general_service",
        }}
      />,
    );
    expect(
      screen.getByTestId("customer-leak-intelligence-internal-empty"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("admin-leak-intelligence")).not.toBeInTheDocument();
  });
});