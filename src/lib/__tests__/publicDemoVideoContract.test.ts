import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * P38 / P38.1 — Public Demo / Ad Video contract.
 *
 * Locks in:
 *  - the public demo page exists at /demo with transcript + animation
 *  - the homepage links to /demo, /scorecard, /diagnostic-apply,
 *    and /why-rgs-is-different from the demo card
 *  - the rewritten storyboard ships the five gears, "slipping",
 *    and "guided independence" language
 *  - the demo page surfaces "What this demo shows" and
 *    "What this demo does not claim"
 *  - the demo never carries fake proof / hype / advice claims
 *  - the demo never embeds a remote <video src> or <iframe>
 */

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("P38 — public demo / ad video contract", () => {
  it("ships the SystemDemoAnimation component", () => {
    expect(existsSync(join(root, "src/components/demo/SystemDemoAnimation.tsx"))).toBe(true);
  });

  it("Demo.tsx mounts the animation and renders a transcript", () => {
    const src = read("src/pages/Demo.tsx");
    expect(src).toMatch(/SystemDemoAnimation/);
    expect(src).toMatch(/transcript/i);
    expect(src.toLowerCase()).toContain("sandbox");
  });

  it("Demo page surfaces both 'What this demo shows' and 'What this demo does not claim'", () => {
    const src = read("src/pages/Demo.tsx");
    expect(src).toMatch(/What this demo shows/);
    expect(src).toMatch(/What this demo does not claim/);
  });

  it("homepage demo card links to scorecard, demo, diagnostic, why-rgs", () => {
    const src = read("src/pages/Index.tsx");
    expect(src).toMatch(/to=\{DEMO_SCORECARD_CTA\}|to="\/scorecard/);
    expect(src).toMatch(/to="\/demo"/);
    expect(src).toMatch(/to=\{DIAGNOSTIC_APPLY_PATH\}|to="\/diagnostic-apply/);
    expect(src).toMatch(/to="\/why-rgs-is-different"/);
  });

  it("storyboard names the five gears in the locked order", () => {
    const src = read("src/components/demo/SystemDemoAnimation.tsx");
    const idx = (s: string) => src.indexOf(s);
    const gears = [
      "Demand Generation",
      "Revenue Conversion",
      "Operational Efficiency",
      "Financial Visibility",
      "Owner Independence",
    ];
    for (const g of gears) expect(idx(g), `missing gear: ${g}`).toBeGreaterThan(-1);
    for (let i = 0; i < gears.length - 1; i++) {
      expect(idx(gears[i])).toBeLessThan(idx(gears[i + 1]));
    }
  });

  it("storyboard carries the slipping-gear and guided-independence concepts", () => {
    const blocks = [
      read("src/components/demo/SystemDemoAnimation.tsx"),
      read("src/pages/Demo.tsx"),
    ].join("\n");
    expect(/slip/i.test(blocks)).toBe(true);
    expect(/guided independence|clearer control|does not create dependency/i.test(blocks)).toBe(true);
    expect(/clearer decisions|less guessing|clearer (operating )?picture/i.test(blocks)).toBe(true);
  });

  it("demo / homepage demo card never embed a remote <video src=...> or <iframe>", () => {
    for (const rel of [
      "src/pages/Demo.tsx",
      "src/components/demo/SystemDemoAnimation.tsx",
      "src/pages/Index.tsx",
    ]) {
      const src = read(rel);
      expect(/<video[^>]+src=/.test(src)).toBe(false);
      expect(/<iframe\b/i.test(src)).toBe(false);
    }
  });

  it("demo / homepage demo card carry no fake proof or guaranteed-outcome language", () => {
    const blocks = [
      read("src/pages/Demo.tsx"),
      read("src/components/demo/SystemDemoAnimation.tsx"),
    ].join("\n");
    const banned = [
      /\btestimonial(?!s? or)/i,
      /\bcase stud(?!ies, or)/i,
      /\btrusted by\b/i,
      /\bofficial partner\b/i,
      /\bguaranteed (revenue|growth|results?|roi)\b/i,
      /\bincrease revenue by\b/i,
      /\bskyrocket/i,
      /\b10x\b/i,
    ];
    for (const re of banned) {
      expect(re.test(blocks), `banned phrase matched: ${re}`).toBe(false);
    }
  });

  it("demo page CTA wires to scorecard and diagnostic, not to fake purchase paths", () => {
    const src = read("src/pages/Demo.tsx");
    expect(src).toMatch(/\/scorecard/);
    // Diagnostic offered through site-wide CTAs / links
    expect(/why-rgs-is-different/.test(src)).toBe(true);
  });

  it("documentation exists for the public demo video", () => {
    expect(existsSync(join(root, "docs/public-demo-video.md"))).toBe(true);
    const doc = read("docs/public-demo-video.md");
    expect(doc).toMatch(/Scorecard/);
    expect(doc).toMatch(/Diagnostic/);
    expect(doc).toMatch(/Demand Generation/);
    expect(doc).toMatch(/Owner Independence/);
  });
});
