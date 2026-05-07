// P90 — OS-wide dead-link guard. Statically scans every source file for
// internal navigation targets and asserts each one resolves to a route
// registered in App.tsx. Also validates the toolLaunch and
// standaloneToolRoutes registries.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");
const APP = readFileSync(join(ROOT, "App.tsx"), "utf8");

const registered = new Set<string>();
for (const m of APP.matchAll(/path="([^"]+)"/g)) registered.add(m[1]);

function matchesRegistered(target: string): boolean {
  const clean = target.split("?")[0].split("#")[0];
  if (registered.has(clean)) return true;
  for (const r of registered) {
    if (!r.includes(":") && !r.includes("*")) continue;
    const rx = new RegExp(
      "^" +
        r
          .replace(/\*/g, ".*")
          .replace(/:[A-Za-z0-9_]+/g, "[^/]+") +
        "$",
    );
    if (rx.test(clean)) return true;
  }
  return false;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx?)$/.test(f)) out.push(p);
  }
  return out;
}

const files = walk(ROOT).filter(
  (f) => !f.includes("__tests__") && !f.includes("/test/"),
);

const PATTERNS = [
  /navigate\(\s*["'`]([^"'`$)]+)["'`]/g,
  /to=\{?\s*["'`]([^"'`$}]+)["'`]/g,
  /href=\{?\s*["'`](\/[^"'`$}]+)["'`]/g,
  /window\.location\.(?:href|assign)\s*=\s*["'`]([^"'`]+)["'`]/g,
  /Navigate\s+to=\{?\s*["'`]([^"'`$}]+)["'`]/g,
];

function isAsset(p: string): boolean {
  return /\.(png|jpg|jpeg|svg|webp|pdf|ico|json|xml|txt|mp4|vtt|srt|md)$/i.test(p);
}

describe("P90 — OS-wide dead-link guard", () => {
  it("every static internal navigation target maps to a registered route", () => {
    const dead: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      for (const pat of PATTERNS) {
        pat.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pat.exec(text))) {
          const target = m[1];
          if (!target.startsWith("/") || target.startsWith("//")) continue;
          if (target.includes("${")) continue;
          const just = target.split("?")[0];
          if (just === "/" || just === "") continue;
          if (isAsset(just)) continue;
          if (just.startsWith("/api/") || just.startsWith("/functions/")) continue;
          if (!matchesRegistered(target)) {
            dead.push(`${target}  (${f.replace(process.cwd() + "/", "")})`);
          }
        }
      }
    }
    expect(dead, `Dead internal links:\n${dead.join("\n")}`).toEqual([]);
  });

  it("toolLaunch built-in title routes all resolve", () => {
    const tl = readFileSync(join(ROOT, "lib/toolLaunch.ts"), "utf8");
    const routes = new Set<string>();
    for (const m of tl.matchAll(/"(\/[a-z0-9/_\-:]+)"/gi)) routes.add(m[1]);
    const bad = [...routes].filter((r) => !matchesRegistered(r));
    expect(bad).toEqual([]);
  });

  it("standaloneToolRoutes registry resolves to registered routes", () => {
    const s = readFileSync(join(ROOT, "lib/standaloneToolRoutes.ts"), "utf8");
    const routes = new Set<string>();
    for (const m of s.matchAll(/"(\/admin\/[a-z0-9/_\-:]+)"/gi)) routes.add(m[1]);
    const bad = [...routes].filter((r) => !matchesRegistered(r));
    expect(bad).toEqual([]);
  });
});