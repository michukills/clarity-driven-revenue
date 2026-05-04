import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const CMD = "src/components/admin/CommandGuidancePanel.tsx";
const APP = "src/App.tsx";
const ADMIN_DASH = "src/pages/admin/AdminDashboard.tsx";

const BANNED: RegExp[] = [
  /trusted by/i,
  /proven results/i,
  /real client results/i,
  /fake testimonial/i,
  /case stud(y|ies)/i,
  /guaranteed (revenue|ROI|results|improvement|stability|renewal|client success)/i,
  /unlimited (support|consulting|advisory)/i,
  /done[- ]for[- ]you/i,
  /AI advisor/i,
  /AI consultant/i,
  /Ask AI anything/i,
];

describe("Admin Command Center deep hardening (P66A)", () => {
  it("/admin route is gated by ProtectedRoute requireRole=admin", () => {
    const app = read(APP);
    expect(app).toMatch(
      /path="\/admin"\s+element=\{<ProtectedRoute requireRole="admin">\s*<AdminDashboard\s*\/>/,
    );
  });

  it("AdminDashboard mounts the CommandGuidancePanel", () => {
    const t = read(ADMIN_DASH);
    expect(t).toMatch(/CommandGuidancePanel/);
    expect(t).toMatch(/<CommandGuidancePanel\s*\/>/);
  });

  it("priority cards do not all share the same generic 'Review' CTA", () => {
    const t = read(CMD);
    // Each priority must have a specific, distinct ctaLabel string.
    const labels = Array.from(t.matchAll(/ctaLabel:\s*"([^"]+)"/g)).map((m) => m[1]);
    expect(labels.length).toBeGreaterThanOrEqual(5);
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length);
    // The bare word "Review" must not be a CTA on its own.
    expect(labels).not.toContain("Review");
    // At least these specific actions must appear.
    const joined = labels.join("|").toLowerCase();
    expect(joined).toMatch(/open report queue/);
    expect(joined).toMatch(/review ai-assisted drafts/);
    expect(joined).toMatch(/open health review/);
    expect(joined).toMatch(/review renewal risk/);
    expect(joined).toMatch(/answer client requests/);
    expect(joined).toMatch(/sharpen walkthroughs/);
  });

  it("each priority includes a meaning string that explains why it matters", () => {
    const t = read(CMD);
    const meanings = Array.from(t.matchAll(/meaning:\s*\n?\s*"([^"]+)"/g)).map((m) => m[1]);
    expect(meanings.length).toBeGreaterThanOrEqual(5);
    for (const m of meanings) {
      expect(m.length).toBeGreaterThan(40);
    }
  });

  it("safety language is present so client surfaces are not bypassed", () => {
    const t = read(CMD);
    expect(t).toMatch(/Client-facing surfaces are not bypassed/);
    expect(t).toMatch(/Internal[\s\S]{0,40}notes/);
    expect(t).toMatch(/AI drafts/);
    expect(t).toMatch(/admin-only/);
  });

  it("renders an empty state with useful next-step copy when no items are pending", () => {
    const t = read(CMD);
    expect(t).toMatch(/No urgent review items/);
    expect(t).toMatch(/before publishing anything client-facing/);
  });

  it("groups quick navigation into Client work, Reports & review, System tools", () => {
    const t = read(CMD);
    expect(t).toMatch(/Client work/);
    expect(t).toMatch(/Reports & review/);
    expect(t).toMatch(/System tools/);
  });

  it("does not introduce fake proof, guarantees, AI-advisor wording, or client data leakage", () => {
    const t = read(CMD);
    for (const re of BANNED) expect(t, `CommandGuidancePanel matches ${re}`).not.toMatch(re);
    expect(t).not.toMatch(/internal_notes/);
    expect(t).not.toMatch(/admin_notes/);
    // No raw env / secret reads from the panel
    expect(t).not.toMatch(/process\.env\./);
    expect(t).not.toMatch(/import\.meta\.env\.[A-Z_]*KEY/);
  });

  it("walkthrough card label is human-readable, not a raw DB enum value", () => {
    const t = read(CMD);
    // The previous build exposed the literal "Walkthroughs not yet approved"
    // which read like a raw filter string. Replace with human language.
    expect(t).toMatch(/Tool guidance needs sharpening/);
    expect(t).not.toMatch(/video_status\s*!=\s*'approved'/);
  });
});