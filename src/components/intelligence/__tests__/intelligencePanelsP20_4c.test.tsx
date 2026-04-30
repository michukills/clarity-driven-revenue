// P20.4c — Render tests for the admin + client intelligence panels.
//
// Verifies the existing analyzeLeaks() outputs are rendered correctly into
// the new presentational components without leaking admin-only data into
// the client view, and confirms cannabis/MMC copy stays in regulated retail
// territory (no healthcare wording).

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { analyzeLeaks } from "@/lib/leakEngine";
import { AdminLeakIntelligencePanel } from "../AdminLeakIntelligencePanel";
import { ClientLeakIntelligencePanel } from "../ClientLeakIntelligencePanel";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import type { BrainSignal, IndustryDataInput } from "@/lib/intelligence/types";

function run(industry: IndustryCategory, confirmed: boolean, signals: BrainSignal[] = [], data?: IndustryDataInput) {
  return analyzeLeaks({
    industry,
    industryConfirmed: confirmed,
    estimates: [],
    brainSignals: signals,
    industryData: data,
  });
}

const HEALTHCARE_FORBIDDEN = /\b(patient|patients|claim|claims|reimbursement|insurance|appointment|appointments|provider|providers|diagnosis|diagnoses|clinical|healthcare|medical billing)\b/i;

describe("AdminLeakIntelligencePanel", () => {
  it("renders Top 3 priorities with rank, gear, score, band, confidence, and recommendation", () => {
    const a = run("trade_field_service", true, [
      {
        key: "delayed_invoicing",
        observation: "Many completed jobs uninvoiced.",
        estimated_revenue_impact: 8200,
        severity: "high",
      },
    ], { trades: { jobsCompleted: 18, jobsCompletedNotInvoiced: 4 } });
    render(<AdminLeakIntelligencePanel admin={a.admin} />);
    const root = screen.getByTestId("admin-leak-intelligence");
    expect(within(root).getByText(/Top 3 Repair Priorities/i)).toBeTruthy();
    expect(within(root).getByText(/Priority score/i)).toBeTruthy();
    expect(within(root).getByText(/Recommendation:/i)).toBeTruthy();
    expect(within(root).getAllByText(/^#1$/).length).toBeGreaterThan(0);
  });

  it("renders the full ranked table with scoring factor columns", () => {
    const a = run("trade_field_service", true, [], { trades: { jobsCompletedNotInvoiced: 3, jobsCompleted: 10 } });
    render(<AdminLeakIntelligencePanel admin={a.admin} />);
    const root = screen.getByTestId("admin-leak-intelligence");
    for (const col of ["Impact", "Visibility", "Ease", "Dependency", "Score", "Band", "Why ranked"]) {
      expect(within(root).getAllByText(new RegExp(`^${col}$`, "i")).length).toBeGreaterThan(0);
    }
  });

  it("separates General, Industry, and Estimate/Workflow leaks", () => {
    const a = run("retail", true, [], { retail: { deadStockValue: 12000, hasCategoryMargin: false } });
    render(<AdminLeakIntelligencePanel admin={a.admin} />);
    const root = screen.getByTestId("admin-leak-intelligence");
    expect(within(root).getByText(/Universal \/ General RGS Brain/i)).toBeTruthy();
    expect(within(root).getByText(/Industry Brain — Retail/i)).toBeTruthy();
    expect(within(root).getAllByText(/Estimate \/ Workflow/i).length).toBeGreaterThan(0);
  });

  it("renders the industry gap report with confirmed + active state", () => {
    const a = run("retail", true, [], { retail: { deadStockValue: 5000 } });
    render(<AdminLeakIntelligencePanel admin={a.admin} />);
    expect(screen.getByText(/Industry confirmed/i)).toBeTruthy();
    expect(screen.getByText(/Industry-specific logic active/i)).toBeTruthy();
  });

  it("renders fallback gap report when industry is unconfirmed", () => {
    const a = run("retail", false);
    render(<AdminLeakIntelligencePanel admin={a.admin} />);
    expect(screen.getByText(/Industry unconfirmed/i)).toBeTruthy();
    expect(screen.getAllByText(/fell back to General \/ Mixed/i).length).toBeGreaterThan(0);
  });

  it("disables Promote-to-task when no handler is supplied", () => {
    const a = run("trade_field_service", true, [
      { key: "delayed_invoicing", observation: "x", estimated_revenue_impact: 1000, severity: "high" },
    ]);
    render(<AdminLeakIntelligencePanel admin={a.admin} />);
    const btns = screen.getAllByRole("button", { name: /Promote to task/i });
    expect(btns.length).toBeGreaterThan(0);
    for (const b of btns) expect((b as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByText(/Task promotion coming after admin approval flow is verified/i).length).toBeGreaterThan(0);
  });

  it("renders an empty-state for Top 3 when no leaks exist", () => {
    const a = run("general_service", true);
    if (a.admin.top3.length === 0) {
      render(<AdminLeakIntelligencePanel admin={a.admin} />);
      expect(screen.getByText(/No confirmed leaks yet/i)).toBeTruthy();
    } else {
      // If general_service produced a leak, force-empty top3 to assert the empty state.
      render(
        <AdminLeakIntelligencePanel
          admin={{ ...a.admin, top3: [], ranked: [] }}
        />,
      );
      expect(screen.getByText(/No confirmed leaks yet/i)).toBeTruthy();
    }
  });

  it("uses cannabis-retail vocabulary and contains no healthcare wording", () => {
    const a = run("mmj_cannabis", true, [], {
      cannabis: {
        grossMarginPct: 28,
        productMarginVisible: false,
        deadStockValue: 9300,
        stockoutCount: 5,
        discountImpactPct: 14,
        promotionImpactPct: 9,
        vendorCostIncreasePct: 6,
        paymentReconciliationGap: true,
      },
    });
    const { container } = render(<AdminLeakIntelligencePanel admin={a.admin} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(HEALTHCARE_FORBIDDEN);
    // Some cannabis-retail terminology should appear from the brain output.
    expect(text.toLowerCase()).toMatch(/inventory|margin|stockout|dead stock|promotion|discount|vendor|reconciliation/);
  });
});

describe("ClientLeakIntelligencePanel", () => {
  it("renders Top 3 issues without raw scoring factors or rationale", () => {
    const a = run("trade_field_service", true, [
      { key: "delayed_invoicing", observation: "x", estimated_revenue_impact: 8200, severity: "high" },
    ], { trades: { jobsCompletedNotInvoiced: 4, jobsCompleted: 18 } });
    const { container } = render(<ClientLeakIntelligencePanel client={a.client} />);
    const root = screen.getByTestId("client-leak-intelligence");
    expect(within(root).getByText(/Top issues to address/i)).toBeTruthy();
    expect(within(root).getByText(/Next action:/i)).toBeTruthy();
    const text = container.textContent ?? "";
    // No raw scoring labels.
    expect(text).not.toMatch(/Visibility|Ease|Dependency|Priority score|Why ranked|impact × 2/i);
    // No internal leak ids leaking.
    expect(text).not.toMatch(/leak[-_]/i);
  });

  it("renders needs-verification checklist with plain language only", () => {
    const a = run("retail", false);
    render(<ClientLeakIntelligencePanel client={a.client} />);
    expect(screen.getByText(/Confirm your business industry/i)).toBeTruthy();
  });

  it("never lists admin-only tools in the visible-tools section", () => {
    const a = run("trade_field_service", true);
    render(<ClientLeakIntelligencePanel client={a.client} />);
    for (const t of a.client.visibleTools) {
      expect(t.visibility).toBe("client_visible");
    }
    // revenue_leak_finder is admin_only — must not appear in the client view.
    const text = screen.getByTestId("client-leak-intelligence").textContent ?? "";
    expect(text).not.toMatch(/revenue leak finder/i);
  });

  it("shows calm empty state when there are no top issues", () => {
    const a = run("general_service", true);
    render(<ClientLeakIntelligencePanel client={{ ...a.client, topIssues: [] }} />);
    expect(screen.getByText(/We need more data before we can confirm your top issues/i)).toBeTruthy();
  });

  it("cannabis client view contains no healthcare/medical wording", () => {
    const a = run("mmj_cannabis", true, [], {
      cannabis: {
        productMarginVisible: false,
        deadStockValue: 9300,
        stockoutCount: 5,
        discountImpactPct: 14,
        vendorCostIncreasePct: 6,
      },
    });
    const { container } = render(<ClientLeakIntelligencePanel client={a.client} />);
    expect(container.textContent ?? "").not.toMatch(HEALTHCARE_FORBIDDEN);
  });
});