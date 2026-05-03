import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/pages", "src/components"];
const SKIP_DIR = new Set(["__tests__", "node_modules"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx?|md)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

const FILES = ROOTS.flatMap((r) => walk(r));

const BANNED = [
  /guaranteed\s+kpi/i,
  /guaranteed\s+clean\s+data/i,
  /perfect\s+data/i,
  /automatic\s+insight\s+from\s+(every|all)\s+(tool|platform)/i,
  /guaranteed\s+(results|revenue|roi)/i,
  /guaranteed\s+outcomes?/i,
];

describe("P46.1 KPI copy contract", () => {
  it("public/client copy contains no banned KPI/guarantee phrases", () => {
    const offenders: string[] = [];
    for (const f of FILES) {
      const txt = readFileSync(f, "utf8");
      for (const re of BANNED) {
        if (re.test(txt)) offenders.push(`${f} :: ${re}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("public pages that mention 'KPI' first spell out 'key performance indicators'", () => {
    // Curated list of high-traffic public/client-facing pages where first-use
    // expansion is required. Internal admin/tool files are exempt.
    const PUBLIC = [
      "src/pages/Visibility.tsx",
      "src/pages/Scorecard.tsx",
      "src/pages/Start.tsx",
    ];
    const offenders: string[] = [];
    for (const f of PUBLIC) {
      const txt = readFileSync(f, "utf8");
      const idx = txt.search(/\bKPIs?\b/);
      if (idx === -1) continue;
      const before = txt.slice(0, idx + 5).toLowerCase();
      if (!before.includes("key performance indicator")) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});