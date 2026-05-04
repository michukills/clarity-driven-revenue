import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TOOL_GUIDES, getToolGuide, KNOWN_TOOL_GUIDE_KEYS } from "@/lib/toolGuides";
import { buildClientStageGuidance } from "@/lib/clientStage";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const WELCOME = "src/components/portal/GuidedClientWelcome.tsx";
const WALK_CARD = "src/components/portal/ToolWalkthroughCard.tsx";
const ADMIN_WALK = "src/pages/admin/WalkthroughVideosAdmin.tsx";
const CMD = "src/components/admin/CommandGuidancePanel.tsx";
const STAGE = "src/lib/clientStage.ts";
const GUIDES = "src/lib/toolGuides.ts";

const BANNED: RegExp[] = [
  /fake testimonial/i, /fake case study/i, /trusted by/i,
  /proven results/i, /real client results/i,
  /guaranteed (revenue|ROI|results|improvement|stability|renewal|compliance|client success)/i,
  /done[- ]for[- ]you/i, /full[- ]service/i,
  /unlimited (support|consulting|advisory)/i,
  /AI advisor/i, /AI consultant/i, /Ask AI anything/i,
  /\blegal advice\b/i, /\btax advice\b/i, /\baccounting advice\b/i,
  /healthcare compliance/i, /patient care/i, /\bHIPAA\b/i,
];

describe("RGS OS feature hardening contract (P66)", () => {
  it("written tool guide registry is defined and well-formed", () => {
    expect(KNOWN_TOOL_GUIDE_KEYS.length).toBeGreaterThanOrEqual(8);
    for (const key of KNOWN_TOOL_GUIDE_KEYS) {
      const g = getToolGuide(key)!;
      expect(g.toolName.length).toBeGreaterThan(2);
      expect(g.purpose.length).toBeGreaterThan(20);
      expect(g.gather.length).toBeGreaterThan(0);
      expect(g.goodSubmission.length).toBeGreaterThan(0);
      expect(g.afterSubmit.length).toBeGreaterThan(10);
      expect(g.scopeBoundary.length).toBeGreaterThan(10);
    }
  });

  it("tool guides do not introduce banned scope-creep / fake-proof / advice language", () => {
    const blob = JSON.stringify(TOOL_GUIDES);
    for (const re of BANNED) expect(blob).not.toMatch(re);
  });

  it("walkthrough card uses written guide as fallback, not a weak placeholder", () => {
    const t = read(WALK_CARD);
    expect(t).toMatch(/getToolGuide/);
    expect(t).toMatch(/Walkthrough not published yet/);
    expect(t).toMatch(/Before you start/);
    expect(t).toMatch(/What a good submission looks like/);
    expect(t).toMatch(/What happens next/);
    // No fake video URLs / placeholders
    expect(t).not.toMatch(/youtu\.?be\.com/i);
    expect(t).not.toMatch(/vimeo\.com/i);
    expect(t).not.toMatch(/example\.com/i);
    // Written guide must not bypass admin-only fields
    expect(read(GUIDES)).not.toMatch(/internal_notes/);
    expect(read(GUIDES)).not.toMatch(/admin_notes/);
  });

  it("guided welcome answers 'not required yet' and 'after this step' for diagnostic_paid", () => {
    const w = read(WELCOME);
    expect(w).toMatch(/What is not required from you yet/);
    expect(w).toMatch(/What happens after this step/);
    const g = buildClientStageGuidance({ stage: "diagnostic_paid" });
    expect(g.notRequiredYet).toBeTruthy();
    expect(g.afterNextStep).toBeTruthy();
  });

  it("client stage copy keeps RGS-as-architect framing", () => {
    const t = read(STAGE);
    expect(t).not.toMatch(/RGS runs your business/i);
    expect(t).not.toMatch(/done[- ]for[- ]you/i);
    expect(t).not.toMatch(/unlimited support/i);
  });

  it("admin command panel is reframed as today's operating priorities and adds safe signals", () => {
    const t = read(CMD);
    expect(t).toMatch(/Today's priority lane/);
    expect(t).toMatch(/RGS Command Center/);
    expect(t).toMatch(/Open client request/);
    expect(t).toMatch(/Tool guidance needs sharpening/);
    expect(t).toMatch(/client_service_requests/);
    // No client data leakage — must read counts only, never select internal note fields
    expect(t).not.toMatch(/internal_notes/);
    expect(t).not.toMatch(/admin_notes/);
  });

  it("admin walkthrough page exposes a readiness matrix with recommended next actions", () => {
    const t = read(ADMIN_WALK);
    expect(t).toMatch(/Walkthrough readiness matrix/);
    expect(t).toMatch(/Recommended next action/);
    expect(t).toMatch(/Missing/);
    expect(t).toMatch(/Do not publish placeholder or fabricated/i);
  });

  it("no banned scope-creep / fake-proof wording in any hardened files", () => {
    for (const f of [WELCOME, WALK_CARD, ADMIN_WALK, CMD, STAGE, GUIDES]) {
      const text = read(f);
      for (const re of BANNED) expect(text, `${f} matches ${re}`).not.toMatch(re);
    }
  });

  it("audit doc exists and is honest about deferred items", () => {
    const d = read("docs/rgs-os-feature-hardening-audit.md");
    expect(d).toMatch(/What remains weak \/ deferred/);
    expect(d).toMatch(/deferred/i);
    expect(d).toMatch(/embedding/i);
  });
});