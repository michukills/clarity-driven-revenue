import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("Public Demo Video Replacement — /demo", () => {
  const demo = read("src/pages/Demo.tsx");

  it("/demo renders a walkthrough video section (heading + safe placeholder or real <video>)", () => {
    expect(/Watch the RGS OS demo|Demo walkthrough/i.test(demo)).toBe(true);
    const hasPlaceholder = /Demo video coming soon|Walkthrough video placeholder/i.test(demo);
    const hasRealVideo = /<video[\s\S]*<source/.test(demo);
    expect(hasPlaceholder || hasRealVideo).toBe(true);
  });

  it("does not merely remove video — section + animated walkthrough both present", () => {
    expect(demo).toMatch(/SystemDemoAnimation/);
    expect(/sample.?(\/|or )?demo data/i.test(demo)).toBe(true);
  });

  it("includes required safety language", () => {
    expect(/product walkthrough,\s+not a\s+client case study/i.test(demo)).toBe(true);
    expect(/no .*outcome is guaranteed|No guaranteed/i.test(demo)).toBe(true);
    expect(/deterministic and preliminary/i.test(demo)).toBe(true);
    expect(/admin-reviewed/i.test(demo)).toBe(true);
    expect(/Cannabis\/MMJ\/MMC|Cannabis \/ MMJ/i.test(demo)).toBe(true);
    expect(/operational visibility only/i.test(demo)).toBe(true);
  });

  it("CTAs route to scorecard and diagnostic-apply", () => {
    expect(demo).toMatch(/\/scorecard/);
    expect(demo).toMatch(/\/diagnostic-apply/);
  });

  it("contains no fake proof, testimonials, guarantees, or hype phrases", () => {
    const banned = [
      /\btrusted by\b/i,
      /\bofficial partner\b/i,
      /\bguaranteed (revenue|growth|results?|roi|compliance|outcome)\b/i,
      /\bunlimited support\b/i,
      /\bskyrocket\b/i,
      /\b10x\b/i,
      /\brevolutionary\b/i,
      /\bgame.?changing\b/i,
      /\bdone-for-you operator\b/i,
    ];
    for (const re of banned) {
      expect(re.test(demo), `banned phrase matched: ${re}`).toBe(false);
    }
  });

  it("does not embed an external iframe", () => {
    expect(/<iframe\b/i.test(demo)).toBe(false);
  });

  it("does not introduce healthcare/HIPAA/clinical framing under 'medical'", () => {
    // Demo page must not affirmatively use these terms in customer copy.
    // (The storyboard doc explicitly negates them as "What not to show",
    //  which is enforced separately and is the safe pattern.)
    const banned = [/HIPAA/i, /\bclinical workflows?\b/i, /\bmedical billing\b/i, /\bhealthcare operations\b/i];
    for (const re of banned) {
      expect(re.test(demo), `healthcare term leaked: ${re}`).toBe(false);
    }
  });
});

describe("Public Demo Video Replacement — storyboard doc", () => {
  const docPath = "docs/public-demo-video-walkthrough.md";

  it("storyboard doc exists", () => {
    expect(existsSync(join(root, docPath))).toBe(true);
  });

  it("storyboard contains the required scenes and disclaimers", () => {
    const doc = read(docPath);
    const required = [
      "Scorecard",
      "Owner Diagnostic Interview",
      "Admin review",
      "0–1000 Business Stability Score",
      "Diagnostic report",
      "Stability Snapshot",
      "Priority Repair Map",
      "Implementation",
      "RGS Control System",
      "Cannabis",
      "sample/demo data",
      "no real customer data",
      "no guaranteed outcomes",
      "Request a Diagnostic",
    ];
    for (const phrase of required) {
      expect(doc.toLowerCase().includes(phrase.toLowerCase()), `missing: ${phrase}`).toBe(true);
    }
  });

  it("storyboard explicitly excludes healthcare framing in 'What not to show'", () => {
    const doc = read(docPath);
    // The doc names healthcare/HIPAA/clinical only in the negative-list
    // ("What not to show" + the medical-terminology rule). Confirm those
    // negative anchors exist so the rule stays visible.
    expect(/What not to show/i.test(doc)).toBe(true);
    expect(/healthcare/i.test(doc)).toBe(true);
    expect(/HIPAA/i.test(doc)).toBe(true);
    // And it must not promise healthcare support.
    expect(/healthcare (support|vertical|operations) (is|are) supported/i.test(doc)).toBe(false);
  });
});
