/**
 * P13.Brand.1 — Brand naming validator.
 *
 * Scans the codebase for incorrect spellings of third-party brand names.
 * Run manually:
 *
 *   bun run scripts/validate-brand-names.ts
 *
 * Exits 1 if any forbidden variant is found in source files.
 *
 * Allowed: src/config/brands.ts (the dictionary itself) and this script.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { BRAND_FORBIDDEN_VARIANTS } from "../src/config/brands";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "supabase/functions"];
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".html"]);
const SKIP_PATHS = new Set([
  "src/config/brands.ts",
  "scripts/validate-brand-names.ts",
  // Identifier strings (snake_case provider keys) are NOT user-facing.
  "src/integrations/supabase/types.ts",
]);

interface Violation {
  file: string;
  line: number;
  variant: string;
  canonical: string;
  text: string;
}

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
      walk(full, out);
    } else if (SCAN_EXTS.has(extname(entry))) {
      out.push(full);
    }
  }
}

const files: string[] = [];
for (const d of SCAN_DIRS) {
  try {
    walk(join(ROOT, d), files);
  } catch {
    /* dir absent */
  }
}

const violations: Violation[] = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  if (SKIP_PATHS.has(rel)) continue;
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");

  for (const [variant, canonical] of Object.entries(BRAND_FORBIDDEN_VARIANTS)) {
    // Word-boundary check: skip identifiers, paths, table names that
    // legitimately use lowercase. We only flag occurrences that appear
    // inside string literals or comments / human prose contexts.
    const variantLower = variant.toLowerCase();
    lines.forEach((text, i) => {
      // Locate every occurrence.
      let idx = 0;
      while ((idx = text.indexOf(variant, idx)) !== -1) {
        const before = text[idx - 1] ?? " ";
        const after = text[idx + variant.length] ?? " ";
        const isWordChar = (c: string) => /[A-Za-z0-9_]/.test(c);
        // Word boundary on both sides
        if (isWordChar(before) || isWordChar(after)) {
          idx += variant.length;
          continue;
        }
        // Skip identifier-looking tokens: snake_case / kebab-case keys,
        // table names, env vars, URL paths, JSON keys.
        const left30 = text.slice(Math.max(0, idx - 30), idx);
        const right30 = text.slice(idx + variant.length, idx + variant.length + 30);
        if (
          /[_-][A-Za-z]*$/.test(left30) ||
          /^[_-]/.test(right30) ||
          /\/[A-Za-z_-]*$/.test(left30) || // URL path segment
          /^\.[A-Za-z]/.test(right30)      // .property access
        ) {
          idx += variant.length;
          continue;
        }
        // Ignore the variant if it's only the lowercase form AND used as
        // an identifier inside an import path or env var name.
        if (variant === variantLower && /["'`][^"'`]*$/.test(left30) === false) {
          // Allow only when not clearly inside human-readable string.
        }
        violations.push({
          file: rel,
          line: i + 1,
          variant,
          canonical,
          text: text.trim().slice(0, 160),
        });
        idx += variant.length;
      }
    });
  }
}

if (violations.length === 0) {
  console.log("✅ Brand naming validator: no forbidden variants found.");
  process.exit(0);
}

console.error(`❌ Brand naming validator: ${violations.length} violation(s) found.\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  "${v.variant}" → should be "${v.canonical}"`);
  console.error(`    ${v.text}`);
}
console.error(`\nFix by importing BRANDS from "@/config/brands" and using the canonical name.`);
process.exit(1);
