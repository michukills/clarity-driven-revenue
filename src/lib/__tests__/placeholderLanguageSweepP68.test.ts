import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const CMD = "src/components/admin/CommandGuidancePanel.tsx";
const WELCOME = "src/components/portal/GuidedClientWelcome.tsx";
const RCS = "src/pages/portal/tools/RgsControlSystem.tsx";

const TOUCHED = [CMD, WELCOME, RCS];

const BANNED_PLACEHOLDER: RegExp[] = [
  /\bNo data found\b/,
  /\bNothing here\b/i,
  /\bComing soon\b/i,
  /\bThis is where\b/i,
];

const BANNED_SCOPE: RegExp[] = [
  /trusted by/i,
  /proven results/i,
  /guaranteed (revenue|ROI|results|stability|renewal|compliance)/i,
  /unlimited (support|consulting|advisory)/i,
  /done[- ]for[- ]you/i,
  /AI advisor/i,
  /AI consultant/i,
  /\blegal advice\b/i,
  /\btax advice\b/i,
  /\baccounting advice\b/i,
  /healthcare compliance/i,
  /patient care/i,
  /\bHIPAA\b/i,
];

describe("OS-wide placeholder language + premium copy sweep (P68)", () => {
  it("touched UI files no longer contain placeholder filler phrases", () => {
    for (const f of TOUCHED) {
      const t = read(f);
      // Ignore commented-out occurrences for the RCS file by checking line-by-line
      const lines = t
        .split("\n")
        .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"));
      const visible = lines.join("\n");
      for (const re of BANNED_PLACEHOLDER) {
        expect(visible, `${f} still contains placeholder ${re}`).not.toMatch(re);
      }
    }
  });

  it("touched UI files do not introduce scope-creep / fake-proof language", () => {
    for (const f of TOUCHED) {
      const t = read(f);
      for (const re of BANNED_SCOPE) {
        expect(t, `${f} matches banned ${re}`).not.toMatch(re);
      }
    }
  });

  it("admin command center intro uses the sharpened P68 phrasing", () => {
    const t = read(CMD);
    expect(t).toMatch(/Begin\s+with anything that affects access, reports/);
    expect(t).toMatch(/Internal notes and AI drafts stay private/);
  });

  it("client welcome no longer opens with a placeholder 'This is where' line", () => {
    const t = read(WELCOME);
    expect(t).toMatch(/Your diagnostic, tools, reports, and next steps live here/);
  });

  it("RGS Control System surface replaces 'Coming soon' with plan-aware copy", () => {
    const t = read(RCS);
    expect(t).toMatch(/Not part of your current plan/);
  });

  it("client-visible welcome surface does not reference admin-only fields", () => {
    const t = read(WELCOME);
    expect(t).not.toMatch(/internal_notes/);
    expect(t).not.toMatch(/admin_notes/);
    expect(t).not.toMatch(/admin_summary/);
    expect(t).not.toMatch(/ai_draft_body/);
  });

  it("audit doc records the P68 pass honestly", () => {
    const d = read("docs/rgs-placeholder-language-sweep.md");
    expect(d).toMatch(/P68/);
    expect(d).toMatch(/Examples of improved copy/);
    expect(d).toMatch(/deferred/i);
  });
});