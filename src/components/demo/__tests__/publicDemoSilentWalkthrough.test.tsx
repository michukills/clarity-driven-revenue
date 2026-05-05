import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PublicDemoSilentWalkthrough, {
  PUBLIC_DEMO_WALKTHROUGH_SCENES,
  PUBLIC_DEMO_WALKTHROUGH_PRIMARY_CTA,
  PUBLIC_DEMO_WALKTHROUGH_SECONDARY_CTA,
} from "@/components/demo/PublicDemoSilentWalkthrough";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("PublicDemoSilentWalkthrough — script mapping", () => {
  it("has exactly 9 scenes in approved order", () => {
    expect(PUBLIC_DEMO_WALKTHROUGH_SCENES).toHaveLength(9);
    PUBLIC_DEMO_WALKTHROUGH_SCENES.forEach((s, i) => {
      expect(s.number).toBe(i + 1);
      expect(s.title).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(s.caption).toBeTruthy();
      expect(s.visual).toBeTruthy();
    });
  });

  it("required scenes are present", () => {
    const titles = PUBLIC_DEMO_WALKTHROUGH_SCENES.map((s) => s.title.toLowerCase());
    const labels = PUBLIC_DEMO_WALKTHROUGH_SCENES.map((s) => s.label.toLowerCase());
    const all = [...titles, ...labels].join(" | ");
    expect(all).toMatch(/scorecard/);
    expect(all).toMatch(/portal/);
    expect(all).toMatch(/admin review|industry brain/);
    expect(all).toMatch(/snapshot/);
    expect(all).toMatch(/repair map/);
    expect(all).toMatch(/implementation/);
    expect(all).toMatch(/control system/);
  });

  it("DEMO watermark required on scenes 2–8 only", () => {
    PUBLIC_DEMO_WALKTHROUGH_SCENES.forEach((s) => {
      if (s.number >= 2 && s.number <= 8) expect(s.watermark).toBe(true);
      else expect(s.watermark).toBe(false);
    });
  });

  it("CTAs route to /scorecard and /diagnostic-apply", () => {
    expect(PUBLIC_DEMO_WALKTHROUGH_PRIMARY_CTA.to).toBe("/scorecard");
    expect(PUBLIC_DEMO_WALKTHROUGH_SECONDARY_CTA.to).toBe("/diagnostic-apply");
  });
});

describe("PublicDemoSilentWalkthrough — render", () => {
  it("renders accessible title, first caption, and DEMO not on first slide", () => {
    render(
      <MemoryRouter>
        <PublicDemoSilentWalkthrough />
      </MemoryRouter>
    );
    expect(
      screen.getByRole("heading", { name: /quiet, captioned tour/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/most business problems start when one gear slips/i)).toBeInTheDocument();
    // Scene 1 has no watermark
    expect(screen.queryByTestId("demo-watermark")).toBeNull();
    // Safety copy present
    expect(screen.getByText(/sample\/demo data only/i)).toBeInTheDocument();
    expect(screen.getByText(/product walkthrough, not a client case study/i)).toBeInTheDocument();
    expect(screen.getByText(/no revenue improvement or business outcome is guaranteed/i)).toBeInTheDocument();
    // Controls
    expect(screen.getByRole("button", { name: /play|pause/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next scene/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /replay/i })).toBeInTheDocument();
  });

  it("contains no banned hype/proof phrases in scene captions", () => {
    const all = PUBLIC_DEMO_WALKTHROUGH_SCENES.map((s) => `${s.caption} ${s.chip ?? ""}`).join(" ");
    const banned = [
      /guaranteed/i,
      /skyrocket/i,
      /\b10x\b/i,
      /revolutionary/i,
      /game.?changing/i,
      /unlimited support/i,
      /done-for-you operator/i,
      /HIPAA/i,
      /clinical/i,
      /healthcare/i,
      /patient/i,
    ];
    for (const re of banned) {
      expect(re.test(all), `banned: ${re}`).toBe(false);
    }
  });
});

describe("/demo page wires the walkthrough", () => {
  it("Demo.tsx imports and renders PublicDemoSilentWalkthrough", () => {
    const demo = read("src/pages/Demo.tsx");
    expect(demo).toMatch(/from "@\/components\/demo\/PublicDemoSilentWalkthrough"/);
    expect(demo).toMatch(/<PublicDemoSilentWalkthrough\s*\/?\s*>/);
  });
});

describe("Approved script doc still exists", () => {
  it("docs/public-demo-silent-walkthrough-script.md is present", () => {
    const doc = read("docs/public-demo-silent-walkthrough-script.md");
    expect(doc.length).toBeGreaterThan(500);
    expect(doc).toMatch(/Approval checklist/);
  });
});