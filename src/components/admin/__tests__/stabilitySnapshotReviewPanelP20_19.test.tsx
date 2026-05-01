// P20.19 — Admin review surface for the RGS Stability Snapshot.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { StabilitySnapshotReviewPanel } from "@/components/admin/StabilitySnapshotReviewPanel";
import {
  deriveOverallStatus,
  isSnapshotClientReady,
  type StabilitySnapshot,
} from "@/lib/reports/stabilitySnapshot";

function makeSnapshot(): StabilitySnapshot {
  return {
    current_strengths_to_preserve: {
      key: "current_strengths_to_preserve",
      title: "Current Strengths to Preserve",
      items: [
        {
          text: "Weekly review cadence is established.",
          evidence_summary: "3 weekly check-ins on file.",
          gears: ["operational_efficiency"],
          confidence: "High",
        },
      ],
      status: "Draft",
    },
    system_weaknesses_creating_instability: {
      key: "system_weaknesses_creating_instability",
      title: "System Weaknesses Creating Instability",
      items: [],
      status: "Needs Review",
    },
    opportunities_after_stabilization: {
      key: "opportunities_after_stabilization",
      title: "Opportunities After Stabilization",
      items: [],
      status: "Needs Review",
    },
    threats_to_revenue_control: {
      key: "threats_to_revenue_control",
      title: "Threats to Revenue / Control",
      items: [],
      status: "Needs Review",
    },
    overall_status: "Needs Review",
    generated_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    industry: null,
    internal_description: "SWOT-style diagnostic layer",
    client_title: "RGS Stability Snapshot",
  };
}

describe("StabilitySnapshotReviewPanel — P20.19", () => {
  it("renders client-facing title 'RGS Stability Snapshot' and never the literal 'SWOT Analysis'", () => {
    render(
      <StabilitySnapshotReviewPanel
        snapshot={makeSnapshot()}
        onChange={vi.fn()}
        draftStatus="draft"
      />,
    );
    expect(screen.getAllByText(/RGS Stability Snapshot/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/SWOT Analysis/i)).toBeNull();
    expect(screen.getByText(/SWOT-style diagnostic layer/i)).toBeInTheDocument();
  });

  it("shows all four RGS sections", () => {
    render(
      <StabilitySnapshotReviewPanel
        snapshot={makeSnapshot()}
        onChange={vi.fn()}
        draftStatus="draft"
      />,
    );
    expect(screen.getByText("Current Strengths to Preserve")).toBeInTheDocument();
    expect(
      screen.getByText("System Weaknesses Creating Instability"),
    ).toBeInTheDocument();
    expect(screen.getByText("Opportunities After Stabilization")).toBeInTheDocument();
    expect(screen.getByText("Threats to Revenue / Control")).toBeInTheDocument();
  });

  it("starts unreviewed (admin-only) until both snapshot and parent draft are approved", () => {
    render(
      <StabilitySnapshotReviewPanel
        snapshot={makeSnapshot()}
        onChange={vi.fn()}
        draftStatus="draft"
      />,
    );
    expect(screen.getByText(/Admin-only until approved/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Client-ready$/)).toBeNull();
  });

  it("editing item text emits the updated snapshot through onChange", () => {
    const onChange = vi.fn();
    render(
      <StabilitySnapshotReviewPanel
        snapshot={makeSnapshot()}
        onChange={onChange}
        draftStatus="draft"
      />,
    );
    const itemTextarea = screen.getByLabelText(
      /Current Strengths to Preserve item 1 text/i,
    );
    fireEvent.change(itemTextarea, { target: { value: "Edited text" } });
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as StabilitySnapshot;
    expect(next.current_strengths_to_preserve.items[0].text).toBe("Edited text");
  });

  it("changing per-section status to Approved keeps overall Needs Review while other sections need review", () => {
    const onChange = vi.fn();
    render(
      <StabilitySnapshotReviewPanel
        snapshot={makeSnapshot()}
        onChange={onChange}
        draftStatus="draft"
      />,
    );
    const sectionStatus = screen.getByLabelText(
      /Current Strengths to Preserve status/i,
    );
    fireEvent.change(sectionStatus, { target: { value: "Approved" } });
    const next = onChange.mock.calls[0][0] as StabilitySnapshot;
    expect(next.current_strengths_to_preserve.status).toBe("Approved");
    // Other sections still Needs Review → overall Needs Review.
    expect(next.overall_status).toBe("Needs Review");
  });

  it("handles missing snapshot with an explicit 'no snapshot generated' message", () => {
    render(
      <StabilitySnapshotReviewPanel
        snapshot={null}
        onChange={vi.fn()}
        draftStatus="draft"
      />,
    );
    expect(screen.getByTestId("stability-snapshot-review-empty")).toBeInTheDocument();
    expect(screen.getByText(/No structured snapshot/i)).toBeInTheDocument();
  });

  it("does not render any healthcare/MMC wording in the static panel chrome", () => {
    render(
      <StabilitySnapshotReviewPanel
        snapshot={makeSnapshot()}
        onChange={vi.fn()}
        draftStatus="draft"
      />,
    );
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/\bMMC\b/);
    expect(html).not.toMatch(/patient|clinical|diagnosis|treatment|insurance/i);
  });

  it("regenerate button calls back when provided", () => {
    const onRegenerate = vi.fn();
    render(
      <StabilitySnapshotReviewPanel
        snapshot={makeSnapshot()}
        onChange={vi.fn()}
        onRegenerate={onRegenerate}
        draftStatus="draft"
      />,
    );
    fireEvent.click(screen.getByTestId("snapshot-regenerate"));
    expect(onRegenerate).toHaveBeenCalled();
  });

  it("toggling a gear updates that item's gears array", () => {
    const onChange = vi.fn();
    render(
      <StabilitySnapshotReviewPanel
        snapshot={makeSnapshot()}
        onChange={onChange}
        draftStatus="draft"
      />,
    );
    const item = screen.getByTestId(
      "snapshot-item-current_strengths_to_preserve-0",
    );
    // Add Finance gear (was: operational_efficiency only).
    fireEvent.click(within(item).getByLabelText(/Toggle gear Finance/i));
    const next = onChange.mock.calls[0][0] as StabilitySnapshot;
    expect(next.current_strengths_to_preserve.items[0].gears).toContain(
      "financial_visibility",
    );
  });
});

describe("Stability Snapshot review helpers — P20.19", () => {
  it("deriveOverallStatus → Needs Review when any section needs review", () => {
    const snap = makeSnapshot();
    const status = deriveOverallStatus([
      snap.current_strengths_to_preserve,
      snap.system_weaknesses_creating_instability,
      snap.opportunities_after_stabilization,
      snap.threats_to_revenue_control,
    ]);
    expect(status).toBe("Needs Review");
  });

  it("deriveOverallStatus → Approved only when every section is Approved", () => {
    const snap = makeSnapshot();
    const all = [
      { ...snap.current_strengths_to_preserve, status: "Approved" as const },
      { ...snap.system_weaknesses_creating_instability, status: "Approved" as const },
      { ...snap.opportunities_after_stabilization, status: "Approved" as const },
      { ...snap.threats_to_revenue_control, status: "Approved" as const },
    ];
    expect(deriveOverallStatus(all)).toBe("Approved");
  });

  it("isSnapshotClientReady requires overall + every section Approved", () => {
    const snap = makeSnapshot();
    expect(isSnapshotClientReady(snap)).toBe(false);
    const approved: StabilitySnapshot = {
      ...snap,
      overall_status: "Approved",
      current_strengths_to_preserve: {
        ...snap.current_strengths_to_preserve,
        status: "Approved",
      },
      system_weaknesses_creating_instability: {
        ...snap.system_weaknesses_creating_instability,
        status: "Approved",
      },
      opportunities_after_stabilization: {
        ...snap.opportunities_after_stabilization,
        status: "Approved",
      },
      threats_to_revenue_control: {
        ...snap.threats_to_revenue_control,
        status: "Approved",
      },
    };
    expect(isSnapshotClientReady(approved)).toBe(true);
  });
});