import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const CMD = "src/components/admin/CommandGuidancePanel.tsx";
const ADMIN_WALK = "src/pages/admin/WalkthroughVideosAdmin.tsx";
const WALK_CARD = "src/components/portal/ToolWalkthroughCard.tsx";

const BANNED: RegExp[] = [
  /trusted by/i,
  /proven results/i,
  /guaranteed (revenue|ROI|results|stability|renewal)/i,
  /unlimited (support|consulting|advisory)/i,
  /done[- ]for[- ]you/i,
  /AI advisor/i,
  /coming soon/i,
];

describe("Premium Command Center + Tool Sharpness Pass (P66B)", () => {
  it("command center renders a 4-card command summary strip", () => {
    const t = read(CMD);
    expect(t).toMatch(/Command summary/);
    expect(t).toMatch(/Needs RGS review/);
    expect(t).toMatch(/Waiting on client/);
    expect(t).toMatch(/Ready to publish/);
    expect(t).toMatch(/System cleanup/);
    // Honest about missing signal
    expect(t).toMatch(/no signal yet/i);
  });

  it("priority CTAs use the sharper P66B verbs", () => {
    const t = read(CMD);
    const labels = Array.from(t.matchAll(/ctaLabel:\s*"([^"]+)"/g)).map((m) => m[1]);
    expect(new Set(labels).size).toBe(labels.length);
    const j = labels.join("|").toLowerCase();
    expect(j).toMatch(/open report queue/);
    expect(j).toMatch(/review ai-assisted drafts/);
    expect(j).toMatch(/sharpen walkthroughs/);
    expect(j).toMatch(/open health review/);
    expect(j).not.toMatch(/^review$/);
    expect(j).not.toMatch(/manage walkthroughs/);
  });

  it("intro copy uses the RGS Command Center voice and visibility-rules wording", () => {
    const t = read(CMD);
    expect(t).toMatch(/Start here\./);
    expect(t).toMatch(/Nothing on this page bypasses client visibility rules/);
    expect(t).toMatch(/Begin\s+with anything that affects access, reports/);
    expect(t).toMatch(/Internal notes and AI drafts stay private/);
  });

  it("quick-action groups use sharpened, intentional explanations", () => {
    const t = read(CMD);
    expect(t).toMatch(/Open customer records, health signals/);
    expect(t).toMatch(/Review report drafts, AI-assisted sections/);
    expect(t).toMatch(/Maintain the tool library, industry brain/);
  });

  it("walkthrough fallback never shows a 'coming soon' label and stays useful", () => {
    const t = read(WALK_CARD);
    expect(t).toMatch(/Walkthrough not published yet/);
    expect(t).not.toMatch(/coming soon/i);
  });

  it("admin walkthrough manager keeps a readiness matrix and warns against placeholders", () => {
    const t = read(ADMIN_WALK);
    expect(t).toMatch(/Walkthrough readiness matrix/);
    expect(t).toMatch(/Recommended next action/);
    expect(t).toMatch(/Do not publish placeholder or fabricated/i);
  });

  it("no banned scope-creep / fake-proof / coming-soon language", () => {
    for (const f of [CMD, WALK_CARD, ADMIN_WALK]) {
      const text = read(f);
      for (const re of BANNED) expect(text, `${f} matches ${re}`).not.toMatch(re);
    }
  });

  it("audit doc records the P66B pass honestly", () => {
    const d = read("docs/rgs-os-feature-hardening-audit.md");
    expect(d).toMatch(/P66B/);
    expect(d).toMatch(/Command summary/);
    expect(d).toMatch(/deferred/i);
  });
});