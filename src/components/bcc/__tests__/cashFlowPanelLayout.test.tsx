import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CashFlowPanel } from "../CashFlowPanel";
import type { Metrics } from "@/lib/bcc/engine";

const M: Metrics = {
  totalRevenue: 0,
  collectedRevenue: 0,
  pendingRevenue: 0,
  overdueRevenue: 0,
  recurringRevenuePct: 0,
  topClientShare: 0,
  topServiceShare: 0,
  totalExpenses: 0,
  fixedExpenses: 0,
  variableExpenses: 0,
  totalPayroll: 0,
  laborPctOfRevenue: 0,
  cashIn: 1000,
  cashOut: 400,
  netCash: 600,
  expectedCashIn: 800,
  expectedCashOut: 300,
  receivablesOpen: 1500,
  receivablesOverdue: 0,
  payablesPending: 200,
  cashRunwayMonths: 4.2,
  // Allow extra fields without breaking shape
} as unknown as Metrics;

describe("CashFlowPanel layout (P-UI repair)", () => {
  it("renders three metric cards in a single responsive grid wrapper", () => {
    const { container } = render(<CashFlowPanel m={M} />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid).toBeTruthy();
    expect(grid.className).toMatch(/grid/);
    // Auto-fit minmax keeps cards >= 240px so they don't collapse to vertical strips.
    const style = grid.getAttribute("style") || "";
    expect(style).toMatch(/minmax\(240px/);
    // Three card children.
    expect(grid.children.length).toBe(3);
  });

  it("separates labels and values into distinct elements", () => {
    const { getByText } = render(<CashFlowPanel m={M} />);
    const labelEl = getByText("Cash in");
    const card = labelEl.closest(".rounded-xl");
    expect(card).toBeTruthy();
    // Value lives in a sibling span with tabular-nums; label and value are separate nodes.
    expect(labelEl.tagName.toLowerCase()).toBe("span");
  });

  it("does not use fixed narrow widths on metric cards", () => {
    const { container } = render(<CashFlowPanel m={M} />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/w-\[?\d{1,3}px/);
    expect(html).not.toMatch(/max-w-\[?\d{1,3}px/);
  });
});