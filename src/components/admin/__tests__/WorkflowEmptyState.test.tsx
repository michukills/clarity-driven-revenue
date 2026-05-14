/**
 * P93E-E2G-P2.7C — Tests for the shared WorkflowEmptyState primitive.
 *
 * Covers:
 *   - renders the specific title and body (no generic "No data" copy)
 *   - renders primary and secondary actions with correct routes / handlers
 *   - applies the blocked tone when requested
 *   - safely renders without actions
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkflowEmptyState } from "../WorkflowEmptyState";

function renderInRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("WorkflowEmptyState", () => {
  it("renders specific title and body copy", () => {
    renderInRouter(
      <WorkflowEmptyState
        title="No diagnostic interview started yet."
        body="Start the interview to capture owner answers."
      />,
    );
    expect(screen.getByText("No diagnostic interview started yet.")).toBeInTheDocument();
    expect(screen.getByText("Start the interview to capture owner answers.")).toBeInTheDocument();
  });

  it("renders primary action as a link when `to` is provided", () => {
    renderInRouter(
      <WorkflowEmptyState
        title="No report drafts exist yet."
        primary={{ label: "Open Customers", to: "/admin/customers", testId: "cta" }}
      />,
    );
    const cta = screen.getByTestId("cta");
    expect(cta.tagName).toBe("A");
    expect(cta).toHaveAttribute("href", "/admin/customers");
    expect(cta.textContent).toBe("Open Customers");
  });

  it("renders secondary action as a button and fires onClick", () => {
    const onClick = vi.fn();
    renderInRouter(
      <WorkflowEmptyState
        title="No drafts match this filter."
        secondary={{ label: "Show all", onClick, testId: "sec" }}
      />,
    );
    fireEvent.click(screen.getByTestId("sec"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies blocked tone via data-tone", () => {
    renderInRouter(
      <WorkflowEmptyState
        tone="blocked"
        title="This customer is archived. Restore before starting work."
        testId="blocked"
      />,
    );
    const block = screen.getByTestId("blocked");
    expect(block.getAttribute("data-tone")).toBe("blocked");
  });

  it("renders without any action and does not crash", () => {
    renderInRouter(<WorkflowEmptyState title="No live interview sessions yet." />);
    expect(screen.getByText("No live interview sessions yet.")).toBeInTheDocument();
  });
});