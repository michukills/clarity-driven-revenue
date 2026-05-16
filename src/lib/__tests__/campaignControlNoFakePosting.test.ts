/**
 * P97 — Campaign Control "no fake posting" contract.
 *
 * Pins source-text guarantees on the admin + portal Campaign Control
 * surfaces:
 *  - No copy that implies platform API publishing/scheduling exists
 *    (e.g. "Published to Facebook", "Scheduled to LinkedIn",
 *    "Auto-posted to Instagram", "Live on X").
 *  - Posting-related copy must use honest states only.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const ADMIN = read("src/pages/admin/CampaignControl.tsx");
const PORTAL = read("src/pages/portal/tools/CampaignControl.tsx");
const SURFACES: Array<[string, string]> = [
  ["admin CampaignControl", ADMIN],
  ["portal CampaignControl", PORTAL],
];

const FORBIDDEN_PATTERNS: RegExp[] = [
  /Published to (Facebook|Instagram|LinkedIn|X|Twitter|TikTok|YouTube)/i,
  /Scheduled to (Facebook|Instagram|LinkedIn|X|Twitter|TikTok|YouTube)/i,
  /Auto[- ]?posted/i,
  /Live on (Facebook|Instagram|LinkedIn|X|Twitter|TikTok|YouTube)/i,
  /Posting automatically/i,
  /We posted to your/i,
];

describe("P97 — Campaign Control surfaces never imply real platform publishing", () => {
  it.each(SURFACES)("%s contains no fake publishing/scheduling language", (_n, src) => {
    for (const re of FORBIDDEN_PATTERNS) {
      expect(src).not.toMatch(re);
    }
  });
});