/**
 * P102C — Workflow / Process Mapping tool-key alias compatibility.
 *
 * The codebase historically uses two keys for the same underlying tool:
 *   - `workflow_process_mapping` (canonical in the registry, reportable
 *     catalog, standalone routes, and portal route)
 *   - `workflow_process_map` (canonical in `GIG_TOOL_REGISTRY` / `gigTier`)
 *
 * Both must resolve to the same intended gig-capable behavior and the same
 * report section catalog. No duplicate registry entry should exist.
 */
import { describe, it, expect } from "vitest";
import {
  getRgsTool,
  listRgsTools,
} from "@/lib/toolRegistry/rgsToolRegistry";
import { resolveGigToolKey } from "@/lib/gig/gigToolKeyMap";
import { GIG_TOOL_REGISTRY } from "@/lib/gig/gigTier";
import { TOOL_REPORT_SECTION_CATALOG } from "@/lib/reports/toolReportSectionCatalog";

describe("P102C — workflow_process_map ↔ workflow_process_mapping alias", () => {
  it("only one workflow process tool entry exists in the RGS registry", () => {
    const matches = listRgsTools().filter((t) =>
      /^workflow_process(_map(ping)?)?$/.test(t.tool_key),
    );
    expect(matches.length).toBe(1);
    expect(matches[0].tool_key).toBe("workflow_process_mapping");
  });

  it("both keys resolve to a gig-capable deliverable", () => {
    const a = resolveGigToolKey("workflow_process_mapping");
    const b = resolveGigToolKey("workflow_process_map");
    expect(a.kind).toBe("gig");
    expect(b.kind).toBe("gig");
    if (a.kind === "gig" && b.kind === "gig") {
      expect(a.key).toBe(b.key);
      expect(GIG_TOOL_REGISTRY[a.key]).toBeDefined();
    }
  });

  it("registry entry for the canonical key is gig-capable with a minimum tier", () => {
    const entry = getRgsTool("workflow_process_mapping");
    expect(entry).toBeDefined();
    expect(entry!.gig_capable).toBe(true);
    expect(entry!.full_client_only).toBe(false);
    expect(entry!.minimum_gig_tier).not.toBeNull();
    expect(entry!.standalone_visible).toBe(true);
    expect(entry!.supported_report_modes).toContain("gig_report");
  });

  it("report section catalog has identical sections for both keys", () => {
    const a = (TOOL_REPORT_SECTION_CATALOG as Record<string, unknown>)[
      "workflow_process_mapping"
    ];
    const b = (TOOL_REPORT_SECTION_CATALOG as Record<string, unknown>)[
      "workflow_process_map"
    ];
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a).toBe(b);
  });
});