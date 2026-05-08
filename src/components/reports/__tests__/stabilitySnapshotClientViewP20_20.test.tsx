// P20.20 — Client-facing Stability Snapshot tests.
//
// Covers:
// - approved snapshot renders client view + client-facing title
// - unapproved snapshot does NOT render in BCC ReportRenderer
// - parent draft NOT approved → gating helper returns false
// - missing snapshot does NOT crash BCC ReportRenderer
// - PDF export includes approved snapshot, excludes unapproved
// - no "SWOT Analysis" / "MMC" / healthcare wording in client chrome

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StabilitySnapshotClientView } from "../StabilitySnapshotClientView";
import { ReportRenderer } from "@/components/bcc/ReportRenderer";
import {
  isSnapshotClientReadyForDraft,
  type StabilitySnapshot,
  type StabilitySnapshotSection,
  type SnapshotStatus,
} from "@/lib/reports/stabilitySnapshot";
import {
  appendStabilitySnapshotIfClientReady,
  buildStabilitySnapshotPdfSections,
} from "@/lib/exports";
import { MemoryRouter } from "react-router-dom";

function section(
  key: StabilitySnapshotSection["key"],
  status: SnapshotStatus,
  text = "Sample item",
): StabilitySnapshotSection {
  const titles: Record<typeof key, string> = {
    current_strengths_to_preserve: "Current Strengths to Preserve",
    system_weaknesses_creating_instability:
      "System Weaknesses Creating Instability",
    opportunities_after_stabilization: "Opportunities After Stabilization",
    threats_to_revenue_control: "Threats to Revenue / Control",
  } as const;
  return {
    key,
    title: titles[key],
    status,
    items: [
      {
        text,
        confidence: "High",
        gears: ["financial_visibility"],
      },
    ],
  };
}

function makeSnapshot(overall: SnapshotStatus): StabilitySnapshot {
  const sectionStatus: SnapshotStatus =
    overall === "Approved" ? "Approved" : "Draft";
  return {
    current_strengths_to_preserve: section(
      "current_strengths_to_preserve",
      sectionStatus,
      "Connected source data is flowing.",
    ),
    system_weaknesses_creating_instability: section(
      "system_weaknesses_creating_instability",
      sectionStatus,
      "Owner-only tasks tracked at high risk.",
    ),
    opportunities_after_stabilization: section(
      "opportunities_after_stabilization",
      sectionStatus,
      "Weekly profit visibility unlocks.",
    ),
    threats_to_revenue_control: section(
      "threats_to_revenue_control",
      sectionStatus,
      "Stale data risk if no source connected.",
    ),
    overall_status: overall,
    generated_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    industry: null,
    internal_description: "SWOT-style diagnostic layer",
    client_title: "RGS Stability Snapshot",
  };
}

function bccSnapshotData(extra: Record<string, unknown> = {}): unknown {
  return {
    schemaVersion: 1,
    reportType: "monthly",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    generatedAt: new Date().toISOString(),
    customerLabel: "Test Co",
    healthScore: 72,
    condition: "Stable",
    confidence: "medium",
    confidenceNote: "",
    recommendedNextStep: "Continue Monitoring",
    recommendationReason: "Steady cadence",
    sections: [{ title: "System Read", body: "Stable cadence." }],
    meta: {
      weeksCovered: 4,
      advancedWeeks: 4,
      totalRevenue: 0,
      totalExpenses: 0,
      netCash: 0,
    },
    ...extra,
  };
}

describe("isSnapshotClientReadyForDraft — gating", () => {
  it("returns false when snapshot missing", () => {
    expect(isSnapshotClientReadyForDraft(null, "approved")).toBe(false);
    expect(isSnapshotClientReadyForDraft(undefined, "approved")).toBe(false);
  });

  it("returns false when parent draft not approved, even if snapshot is", () => {
    const snap = makeSnapshot("Approved");
    expect(isSnapshotClientReadyForDraft(snap, "draft")).toBe(false);
    expect(isSnapshotClientReadyForDraft(snap, "needs_review")).toBe(false);
    expect(isSnapshotClientReadyForDraft(snap, null)).toBe(false);
  });

  it("returns false when overall_status is not Approved", () => {
    expect(isSnapshotClientReadyForDraft(makeSnapshot("Draft"), "approved")).toBe(
      false,
    );
    expect(
      isSnapshotClientReadyForDraft(makeSnapshot("Needs Review"), "approved"),
    ).toBe(false);
  });

  it("returns true only when fully approved end-to-end", () => {
    expect(
      isSnapshotClientReadyForDraft(makeSnapshot("Approved"), "approved"),
    ).toBe(true);
  });
});

describe("StabilitySnapshotClientView — render", () => {
  it("renders the client-facing title and never 'SWOT Analysis'", () => {
    const { container } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <StabilitySnapshotClientView snapshot={makeSnapshot("Approved")} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/RGS Stability Snapshot/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/SWOT Analysis/i);
    // Healthcare wording must never appear in client chrome.
    // (The plain word "diagnosis" is intentionally allowed — RGS voice
    // uses phrases like "not a final diagnosis". The block list targets
    // healthcare/MMC context only: medical diagnoses, patient care,
    // clinical workflows, and insurance claims.)
    expect(container.textContent).not.toMatch(
      /MMC|patient|clinical|medical diagnosis|treatment plan|insurance claim/i,
    );
  });

  it("renders all four section labels with items", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <StabilitySnapshotClientView snapshot={makeSnapshot("Approved")} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Current Strengths to Preserve")).toBeInTheDocument();
    expect(
      screen.getByText("System Weaknesses Creating Instability"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Opportunities After Stabilization"),
    ).toBeInTheDocument();
    expect(screen.getByText("Threats to Revenue / Control")).toBeInTheDocument();
    expect(
      screen.getByText(/Connected source data is flowing/i),
    ).toBeInTheDocument();
  });
});

describe("ReportRenderer — gating + backward compatibility", () => {
  it("does NOT crash when no snapshot is attached (legacy reports)", () => {
    const { container } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ReportRenderer snapshot={bccSnapshotData()} />
      </MemoryRouter>,
    );
    expect(container.textContent).not.toMatch(/RGS Stability Snapshot/i);
  });

  it("renders the snapshot when fully approved", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ReportRenderer
          snapshot={bccSnapshotData({
            rgs_stability_snapshot: makeSnapshot("Approved"),
          })}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByTestId("stability-snapshot-client-view"),
    ).toBeInTheDocument();
  });

  it("does NOT render snapshot when overall_status is not Approved", () => {
    const { queryByTestId, container } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ReportRenderer
          snapshot={bccSnapshotData({
            rgs_stability_snapshot: makeSnapshot("Needs Review"),
          })}
        />
      </MemoryRouter>,
    );
    expect(queryByTestId("stability-snapshot-client-view")).toBeNull();
    expect(container.textContent).not.toMatch(/SWOT/i);
  });
});

describe("PDF / export pipeline — gated snapshot", () => {
  it("excludes snapshot when not approved", () => {
    expect(
      appendStabilitySnapshotIfClientReady(makeSnapshot("Draft"), "approved"),
    ).toEqual([]);
    expect(
      appendStabilitySnapshotIfClientReady(makeSnapshot("Approved"), "draft"),
    ).toEqual([]);
    expect(appendStabilitySnapshotIfClientReady(null, "approved")).toEqual([]);
  });

  it("includes snapshot when approved end-to-end with client title and labels", () => {
    const out = appendStabilitySnapshotIfClientReady(
      makeSnapshot("Approved"),
      "approved",
    );
    expect(out.length).toBeGreaterThan(0);
    const titles = out
      .filter((s) => s.type === "heading" || s.type === "subheading")
      .map((s: any) => s.text);
    expect(titles).toContain("RGS Stability Snapshot");
    expect(titles).toContain("Current Strengths to Preserve");
    expect(titles).toContain("System Weaknesses Creating Instability");
    expect(titles).toContain("Opportunities After Stabilization");
    expect(titles).toContain("Threats to Revenue / Control");
    // Never the internal SWOT label
    expect(titles.some((t) => /SWOT Analysis/i.test(t))).toBe(false);
  });

  it("buildStabilitySnapshotPdfSections never emits MMC / healthcare wording", () => {
    const out = buildStabilitySnapshotPdfSections(makeSnapshot("Approved"));
    const allText = out
      .filter((s: any) => "text" in s)
      .map((s: any) => s.text)
      .join(" ");
    expect(allText).not.toMatch(
      /MMC|patient|clinical|medical diagnosis|treatment plan|insurance claim/i,
    );
    expect(allText).not.toMatch(/SWOT Analysis/i);
  });
});