import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * P46 — Truth Source / Connected Tools positioning contract.
 *
 * Public-facing copy must explain that RGS helps connect the tools owners
 * already use (QuickBooks, HubSpot, Dutchie, Square, Stripe, etc.) into a
 * clearer operating picture — without overpromising live sync, replacing
 * those tools, or implying accounting/legal/tax services.
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const PUBLIC_FILES = [
  "src/pages/RevenueControlSystem.tsx",
  "src/pages/Diagnostic.tsx",
];

const BANNED_OVERPROMISES: RegExp[] = [
  /\breplaces? (your )?(QuickBooks|HubSpot|Dutchie|Square|Stripe|Xero|Salesforce)\b/i,
  /\bautomatic(ally)? sync(s|ed|ing)? (every|all) (platform|tool|integration)\b/i,
  /\bguaranteed clean data\b/i,
  /\boauth (token|secret|client[_ ]secret)\b/i,
];

describe("P46 — truth source positioning", () => {
  it("RevenueControlSystem page contains the connected-truth-sources framing", () => {
    const src = read("src/pages/RevenueControlSystem.tsx");
    expect(src).toMatch(/truth source/i);
    expect(src).toMatch(/clearer operating picture/i);
    expect(src).toMatch(/Integration readiness varies/i);
  });

  it("Diagnostic FAQ explains RGS does not replace existing tools", () => {
    const src = read("src/pages/Diagnostic.tsx");
    expect(src).toMatch(/Does RGS replace QuickBooks/);
    expect(src).toMatch(/not designed to become another tool/i);
  });

  it("public surfaces avoid overpromising connector claims", () => {
    for (const f of PUBLIC_FILES) {
      const src = read(f);
      for (const re of BANNED_OVERPROMISES) {
        expect(re.test(src), `${f} matched banned pattern ${re}`).toBe(false);
      }
    }
  });
});