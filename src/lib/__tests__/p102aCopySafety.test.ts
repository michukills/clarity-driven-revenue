/**
 * P102A — Registry copy safety.
 *
 * Locks every registry entry's user-visible copy and the campaign
 * additions to REPORTABLE_TOOL_CATALOG / standaloneToolRunner ELIGIBILITY
 * map against the forbidden-claim policy.
 */

import { describe, it, expect } from "vitest";
import { RGS_TOOL_REGISTRY } from "@/lib/toolRegistry/rgsToolRegistry";
import { REPORTABLE_TOOL_CATALOG } from "@/lib/reports/toolReports";
import { listStandaloneTools } from "@/lib/standaloneToolRunner";

const FORBIDDEN = [
  /auto[- ]?post/i,
  /\bscheduled\b/i,
  /\bpublished\b/i,
  /live analytics/i,
  /guaranteed/i,
  /paid ads/i,
  /fully managed marketing/i,
  /tax (?:advice|certification)/i,
  /legal (?:advice|certification)/i,
  /compliance certification/i,
  /medical/i,
];

function assertSafe(label: string, text: string) {
  for (const pat of FORBIDDEN) {
    expect(pat.test(text), `${label} contains forbidden phrase ${pat}: ${text}`).toBe(false);
  }
}

describe("P102A — Registry copy safety", () => {
  it("RGS_TOOL_REGISTRY entries use safe copy", () => {
    for (const t of RGS_TOOL_REGISTRY) {
      assertSafe(`${t.tool_key}.display_name`, t.display_name);
      assertSafe(`${t.tool_key}.short_description`, t.short_description);
      assertSafe(`${t.tool_key}.safe_copy_notes`, t.safe_copy_notes);
    }
  });

  it("Campaign entries added to REPORTABLE_TOOL_CATALOG are safe", () => {
    const campaigns = REPORTABLE_TOOL_CATALOG.filter((t) =>
      ["campaign_brief", "campaign_strategy", "campaign_video_plan"].includes(t.toolKey),
    );
    expect(campaigns).toHaveLength(3);
    for (const t of campaigns) {
      assertSafe(`${t.toolKey}.toolName`, t.toolName);
      assertSafe(`${t.toolKey}.summary`, t.summary);
    }
  });

  it("standaloneToolRunner gig use-case copy for campaign tools is safe", () => {
    const tools = listStandaloneTools().filter((t) =>
      ["campaign_brief", "campaign_strategy", "campaign_video_plan"].includes(t.toolKey),
    );
    expect(tools).toHaveLength(3);
    for (const t of tools) {
      assertSafe(`${t.toolKey}.gigUseCase`, t.gigUseCase);
    }
  });
});
