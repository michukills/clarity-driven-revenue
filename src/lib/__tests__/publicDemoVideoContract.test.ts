import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * P38 — Public Demo / Ad Video contract.
 *
 * Locks in:
 *  - the public demo page exists at /demo with transcript + animation
 *  - the homepage links to /demo, /scorecard, /diagnostic-apply,
 *    and /why-rgs-is-different from the demo card
 *  - the demo surfaces never carry hype / fake proof / advice claims
 *  - the demo never embeds a remote <video> source that could break
 *    (storyboard fallback is the source of truth until a real MP4 ships)
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
    // sandbox-data disclaimer must remain
    expect(src.toLowerCase()).toContain("sandbox");
  });

  it("homepage demo card links to scorecard, demo, diagnostic, why-rgs", () => {
    const src = read("src/pages/Index.tsx");
    expect(src).toMatch(/to=\{DEMO_SCORECARD_CTA\}|to="\/scorecard/);
    expect(src).toMatch(/to="\/demo"/);
    expect(src).toMatch(/to=\{DIAGNOSTIC_APPLY_PATH\}|to="\/diagnostic-apply/);
    expect(src).toMatch(/to="\/why-rgs-is-different"/);
  });

  it("demo surfaces never embed a remote <video src=...> that could break", () => {
    for (const rel of ["src/pages/Demo.tsx", "src/components/demo/SystemDemoAnimation.tsx"]) {
      const src = read(rel);
      expect(/<video[^>]+src=/.test(src)).toBe(false);
    }
  });

  it("demo / homepage demo card carry no fake proof or guaranteed-outcome language", () => {
    const blocks = [
      read("src/pages/Demo.tsx"),
      read("src/components/demo/SystemDemoAnimation.tsx"),
    ].join("\n");
    const banned = [
      /\btestimonial/i,
      /\bcase stud/i,
      /\btrusted by\b/i,
      /\bofficial partner\b/i,
      /\bguaranteed (revenue|growth|results?|roi)\b/i,
      /\bincrease revenue by\b/i,
      /\bskyrocket/i,
      /\b10x\b/i,
      /\bdone[- ]for[- ]you\b/i,
      /\b(legal|tax|accounting|financial)\s+advice\b/i,
    ];
    for (const re of banned) {
      expect(re.test(blocks), `banned phrase matched: ${re}`).toBe(false);
    }
  });

  it("documentation exists for the public demo video", () => {
    expect(existsSync(join(root, "docs/public-demo-video.md"))).toBe(true);
    const doc = read("docs/public-demo-video.md");
    expect(doc).toMatch(/Scorecard/);
    expect(doc).toMatch(/Diagnostic/);
    expect(doc).toMatch(/Revenue Control System/);
  });
});