/**
 * P93E-E2G-B — Control System UI wiring tests.
 *
 * Verifies that the client and admin Control System surfaces render
 * the E2G engine output correctly, stay distinct from Implementation,
 * preserve admin/client visibility boundaries, expose support-boundary
 * lists, route the support classifier through `classifySupportRequest`,
 * render honest empty states, and stay within Cannabis/MMJ
 * operational/documentation visibility language.
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ControlSystemClientView,
  ControlSystemAdminView,
} from "../ControlSystemPanels";
import {
  buildControlSystemView,
  RGS_STAGE_LABELS,
  type ControlSystemInput,
} from "@/lib/controlSystem/continuationEngine";
import { industryToMatrixKey } from "@/lib/controlSystem/industryMap";
import {
  CONTROL_SYSTEM_FORBIDDEN_CLAIMS,
  CONTROL_SYSTEM_CANNABIS_AFFIRMATIVE_BLOCK,
} from "@/config/controlSystemSupportBoundary";
import {
  MATRIX_GEAR_KEYS,
  type MatrixGearKey,
  type MatrixIndustryKey,
} from "@/config/industryDiagnosticDepthMatrix";

function emptyInput(industry: MatrixIndustryKey): ControlSystemInput {
  return {
    industry,
    findings: [],
    repair_progress: [],
    score_history: [],
    add_on_active: true,
  };
}

function populatedInput(industry: MatrixIndustryKey): ControlSystemInput {
  const base: Record<MatrixGearKey, number> = {
    demand_generation: 120,
    revenue_conversion: 130,
    operational_efficiency: 110,
    financial_visibility: 140,
    owner_independence: 100,
  };
  const later = { ...base, financial_visibility: 130, owner_independence: 110 };
  return {
    industry,
    findings: MATRIX_GEAR_KEYS.map((gear, i) => ({
      industry,
      gear,
      rubric_state:
        i === 0
          ? "absent_or_unknown"
          : i === 1
          ? "informal_or_owner_in_head"
          : "documented_but_inconsistent",
      evidence_confidence: i % 2 === 0 ? "low" : "medium",
      contradiction_flagged: i === 0,
      false_green_flagged: i === 2,
    })),
    repair_progress: MATRIX_GEAR_KEYS.map((gear, i) => ({
      recommendation_id: `rec_step_${i + 1}`,
      gear,
      status:
        i === 0 ? "client_action_needed" : i === 1 ? "in_progress" : "stable",
      last_updated_iso: "2026-05-01T00:00:00.000Z",
      evidence_freshness:
        i === 0 ? "missing" : i === 1 ? "needs_refresh" : "current",
      owner_action_pending: i === 0,
    })),
    score_history: [
      { iso_date: "2026-04-01", total_score: 600, gear_scores: base },
      { iso_date: "2026-05-01", total_score: 580, gear_scores: later },
    ],
    add_on_active: true,
  };
}

describe("P93E-E2G-B :: industryToMatrixKey", () => {
  it("returns canonical key when given exact match", () => {
    expect(industryToMatrixKey("trades_home_services")).toBe("trades_home_services");
  });
  it("normalizes free-form strings via aliases", () => {
    expect(industryToMatrixKey("Restaurant")).toBe("restaurant_food_service");
    expect(industryToMatrixKey("e-commerce")).toBe("ecommerce_online_retail");
    expect(industryToMatrixKey("HVAC contractor")).toBe("trades_home_services");
    expect(industryToMatrixKey("Cannabis Dispensary")).toBe("cannabis_mmj_dispensary");
  });
  it("falls back to general_service_other when unknown or null", () => {
    expect(industryToMatrixKey(null)).toBe("general_service_other");
    expect(industryToMatrixKey("")).toBe("general_service_other");
    expect(industryToMatrixKey("biotech research lab")).toBe("general_service_other");
  });
});

describe("P93E-E2G-B :: ControlSystemClientView wiring", () => {
  it("renders Control System stage identity, not Implementation", () => {
    const view = buildControlSystemView(populatedInput("trades_home_services"));
    render(<ControlSystemClientView view={view} addOnActive={true} />);
    expect(screen.getAllByText(/RGS Control System/i).length).toBeGreaterThan(0);
    const stageHeader = screen.getByTestId("control-system-stage-header");
    expect(stageHeader.textContent).toMatch(/operating and monitoring/i);
    expect(stageHeader.textContent).not.toMatch(
      new RegExp(`^${RGS_STAGE_LABELS.implementation.label}$`),
    );
  });

  it("explicitly says Control System is not a new Implementation project", () => {
    const view = buildControlSystemView(populatedInput("retail"));
    render(<ControlSystemClientView view={view} addOnActive={true} />);
    const node = screen.getByTestId("control-system-not-implementation");
    expect(node.textContent?.toLowerCase()).toMatch(
      /not a new implementation project/,
    );
  });

  it("renders all primary monitoring sections", () => {
    const view = buildControlSystemView(populatedInput("professional_services"));
    render(<ControlSystemClientView view={view} addOnActive={true} />);
    for (const id of [
      "control-system-monitoring-snapshot",
      "control-system-next-action",
      "control-system-repair-continuation",
      "control-system-evidence-freshness",
      "control-system-owner-control",
      "control-system-industry-signals",
      "control-system-monitoring-plan",
      "control-system-support-boundaries",
      "control-system-support-classifier",
    ]) {
      expect(screen.getByTestId(id), id).toBeInTheDocument();
    }
    expect(screen.getByTestId("included-support-list").children.length).toBeGreaterThan(0);
    expect(screen.getByTestId("reengagement-trigger-list").children.length).toBeGreaterThan(0);
  });

  it("renders honest empty states when no live data is available", () => {
    const view = buildControlSystemView(emptyInput("general_service_other"));
    render(<ControlSystemClientView view={view} addOnActive={null} />);
    expect(
      screen.getByTestId("control-system-monitoring-snapshot").textContent,
    ).toMatch(/No score history has been recorded yet/i);
    expect(
      screen.getByTestId("control-system-repair-continuation").textContent,
    ).toMatch(/No repair continuation items available yet/i);
    expect(
      screen.getByTestId("control-system-evidence-freshness").textContent,
    ).toMatch(/Evidence freshness will appear/i);
  });

  it("does not leak admin-only notes or admin summary into client surface", () => {
    const view = buildControlSystemView(populatedInput("trades_home_services"));
    render(<ControlSystemClientView view={view} addOnActive={true} />);
    expect(screen.queryByTestId("admin-only-note")).toBeNull();
    expect(screen.queryByTestId("control-system-admin-summary")).toBeNull();
    expect(screen.queryByTestId("admin-review-flag")).toBeNull();
    for (const r of view.repair_continuation) {
      if (r.admin_only_note) {
        expect(document.body.textContent).not.toContain(r.admin_only_note);
      }
    }
    expect(document.body.textContent).not.toContain(view.admin_summary_note);
  });

  it("client copy contains no forbidden outcome / scope-creep claims", () => {
    const view = buildControlSystemView(populatedInput("ecommerce_online_retail"));
    render(<ControlSystemClientView view={view} addOnActive={true} />);
    const text = document.body.textContent ?? "";
    for (const re of CONTROL_SYSTEM_FORBIDDEN_CLAIMS) {
      expect(text).not.toMatch(re);
    }
  });

  it("Cannabis client surface stays in operational/documentation visibility language", () => {
    const view = buildControlSystemView(populatedInput("cannabis_mmj_dispensary"));
    render(<ControlSystemClientView view={view} addOnActive={true} />);
    const text = document.body.textContent ?? "";
    for (const re of CONTROL_SYSTEM_CANNABIS_AFFIRMATIVE_BLOCK) {
      expect(text).not.toMatch(re);
    }
  });

  it("support classifier widget routes through classifySupportRequest", () => {
    const view = buildControlSystemView(populatedInput("retail"));
    render(<ControlSystemClientView view={view} addOnActive={true} />);
    const textarea = screen.getByLabelText(
      /describe your support request/i,
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "Can you build a new sales process?" },
    });
    fireEvent.click(screen.getByTestId("classify-support-button"));
    const badge = screen.getByTestId("classifier-result-badge");
    expect(badge.textContent).toMatch(/Re-engagement required/i);
    const result = screen.getByTestId("classifier-result");
    expect(result.textContent?.toLowerCase()).toMatch(
      /beyond the installed system|new diagnostic or implementation engagement/,
    );
  });

  it("classifies an included-support request as included support", () => {
    const view = buildControlSystemView(populatedInput("retail"));
    render(<ControlSystemClientView view={view} addOnActive={true} />);
    const textarea = screen.getByLabelText(
      /describe your support request/i,
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "How do I refresh evidence for this tool?" },
    });
    fireEvent.click(screen.getByTestId("classify-support-button"));
    expect(screen.getByTestId("classifier-result-badge").textContent).toMatch(
      /Included support/i,
    );
  });
});

describe("P93E-E2G-B :: ControlSystemAdminView wiring", () => {
  it("renders admin summary note and admin-only review flags", () => {
    const view = buildControlSystemView(populatedInput("trades_home_services"));
    render(<ControlSystemAdminView view={view} addOnActive={true} />);
    expect(screen.getByTestId("control-system-admin-summary").textContent).toContain(
      view.admin_summary_note,
    );
    expect(screen.getAllByTestId("admin-only-note").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("admin-review-flag").length).toBeGreaterThan(0);
  });

  it("admin view exposes support boundary and re-engagement review classifier", () => {
    const view = buildControlSystemView(populatedInput("retail"));
    render(<ControlSystemAdminView view={view} addOnActive={true} />);
    expect(screen.getByTestId("control-system-support-boundaries")).toBeInTheDocument();
    expect(
      screen.getByTestId("control-system-admin-reengagement-review"),
    ).toBeInTheDocument();
  });

  it("admin Cannabis surface still avoids affirmative compliance language", () => {
    const view = buildControlSystemView(populatedInput("cannabis_mmj_dispensary"));
    render(<ControlSystemAdminView view={view} addOnActive={true} />);
    const text = document.body.textContent ?? "";
    for (const re of CONTROL_SYSTEM_CANNABIS_AFFIRMATIVE_BLOCK) {
      expect(text).not.toMatch(re);
    }
  });
});