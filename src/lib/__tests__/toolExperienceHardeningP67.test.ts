import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const HEADER = "src/components/tools/PremiumToolHeader.tsx";
const PANEL = "src/components/tools/ToolGuidancePanel.tsx";
const PAT = "src/pages/portal/tools/PriorityActionTracker.tsx";
const MSR = "src/pages/portal/tools/MonthlySystemReview.tsx";
const SCH = "src/pages/portal/tools/ScorecardHistory.tsx";
const DOC = "docs/rgs-tool-experience-hardening-audit.md";

const BANNED: RegExp[] = [
  /trusted by/i,
  /proven results/i,
  /guaranteed (revenue|ROI|results|stability|renewal)/i,
  /unlimited (support|consulting|advisory)/i,
  /done[- ]for[- ]you/i,
  /AI advisor/i,
  /coming soon/i,
  /\blegal advice\b/i,
  /\btax advice\b/i,
  /\baccounting advice\b/i,
  /healthcare compliance/i,
  /patient care/i,
  /\bHIPAA\b/i,
];

describe("Tool experience hardening (P67)", () => {
  it("shared PremiumToolHeader exposes lane badges and a purpose statement", () => {
    const t = read(HEADER);
    expect(t).toMatch(/PremiumToolHeader/);
    expect(t).toMatch(/Diagnostic/);
    expect(t).toMatch(/Implementation/);
    expect(t).toMatch(/RGS Control System/);
    expect(t).toMatch(/Admin-only/);
    expect(t).toMatch(/Recommended next action/);
  });

  it("shared ToolGuidancePanel includes the canonical guidance sections", () => {
    const t = read(PANEL);
    expect(t).toMatch(/How to use this tool/);
    expect(t).toMatch(/Before you start/);
    expect(t).toMatch(/What a strong update looks like/);
    expect(t).toMatch(/What happens next/);
    expect(t).toMatch(/ToolEmptyState/);
    expect(t).toMatch(/ToolLoadingState/);
    expect(t).toMatch(/ToolErrorState/);
    expect(t).toMatch(/Waiting on you/);
    expect(t).toMatch(/Waiting on RGS review/);
  });

  it("Priority Action Tracker adopts the premium pattern and useful empty state", () => {
    const t = read(PAT);
    expect(t).toMatch(/PremiumToolHeader/);
    expect(t).toMatch(/ToolGuidancePanel/);
    expect(t).toMatch(/ToolEmptyState/);
    expect(t).not.toMatch(/No visible priority actions yet\.$/m);
    // Must keep its scope-safe framing
    expect(t).toMatch(/RGS Control System/);
  });

  it("Monthly System Review adopts the premium pattern and useful empty state", () => {
    const t = read(MSR);
    expect(t).toMatch(/PremiumToolHeader/);
    expect(t).toMatch(/ToolGuidancePanel/);
    expect(t).toMatch(/ToolEmptyState/);
    expect(t).toMatch(/bounded interpretation/);
  });

  it("Scorecard History adopts the premium pattern and useful empty state", () => {
    const t = read(SCH);
    expect(t).toMatch(/PremiumToolHeader/);
    expect(t).toMatch(/ToolGuidancePanel/);
    expect(t).toMatch(/ToolEmptyState/);
  });

  it("ClientToolGuard usage on diagnostic interview is preserved", () => {
    const t = read("src/pages/portal/tools/OwnerDiagnosticInterview.tsx");
    expect(t).toMatch(/ClientToolGuard/);
  });

  it("audit doc exists and is honest about what remains deferred", () => {
    const d = read(DOC);
    expect(d).toMatch(/P67/);
    expect(d).toMatch(/What remains deferred/);
    expect(d).toMatch(/deferred/i);
    expect(d).toMatch(/PremiumToolHeader/);
  });

  it("no banned scope-creep / fake-proof / advice / coming-soon language", () => {
    for (const f of [HEADER, PANEL, PAT, MSR, SCH, DOC]) {
      const text = read(f);
      for (const re of BANNED) expect(text, `${f} matches ${re}`).not.toMatch(re);
    }
  });
});