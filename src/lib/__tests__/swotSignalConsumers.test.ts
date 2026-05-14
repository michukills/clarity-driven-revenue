import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  groupSwotSignalsForConsumer,
  signalTypesForSwotConsumer,
  SWOT_SIGNAL_CONSUMER_SCOPE,
  type SwotConsumerSignal,
} from "@/lib/swot/swotSignalConsumers";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

function signal(over: Partial<SwotConsumerSignal>): SwotConsumerSignal {
  return {
    id: over.id ?? `${over.signal_type}-1`,
    customer_id: "customer-1",
    swot_analysis_id: "analysis-1",
    swot_item_id: null,
    signal_type: over.signal_type ?? "repair_priority",
    gear: over.gear ?? "operational_efficiency",
    summary: over.summary ?? "Approved signal",
    confidence: over.confidence ?? "partially_supported",
    client_safe: over.client_safe ?? true,
    admin_only: over.admin_only ?? false,
    consumed_by: [],
    created_at: "2026-05-14T00:00:00Z",
    updated_at: "2026-05-14T00:00:00Z",
    analysis_title: over.analysis_title ?? "Approved SWOT",
    analysis_approved_at: "2026-05-14T00:00:00Z",
  };
}

describe("SWOT signal consumers", () => {
  it("groups only surface-relevant approved signal types for Repair Map", () => {
    const groups = groupSwotSignalsForConsumer([
      signal({ signal_type: "repair_priority" }),
      signal({ signal_type: "operational_bottleneck" }),
      signal({ signal_type: "campaign_input" }),
    ], "repair_map");
    expect(groups.map((g) => g.signal_type)).toEqual(["repair_priority", "operational_bottleneck"]);
    expect(signalTypesForSwotConsumer("repair_map")).toContain("evidence_needed");
  });

  it("groups implementation signals without campaign-only inputs", () => {
    const groups = groupSwotSignalsForConsumer([
      signal({ signal_type: "implementation_input" }),
      signal({ signal_type: "control_system_watch_item" }),
      signal({ signal_type: "buyer_persona_input" }),
    ], "implementation");
    expect(groups.map((g) => g.signal_type)).toEqual(["implementation_input", "control_system_watch_item"]);
  });

  it("uses safe scope language and does not auto-create scope or promises", () => {
    expect(SWOT_SIGNAL_CONSUMER_SCOPE).toMatch(/do not automatically create new scope/i);
    expect(SWOT_SIGNAL_CONSUMER_SCOPE).toMatch(/do not.*change the official score/i);
    expect(SWOT_SIGNAL_CONSUMER_SCOPE).not.toMatch(/guaranteed|legally compliant|compliance approved/i);
  });

  it("mounts read-only SWOT signal panels on Repair Map and Implementation admin surfaces", () => {
    const repair = read("src/components/admin/RepairPriorityMatrixPanel.tsx");
    const implementation = read("src/pages/admin/ImplementationRoadmapAdmin.tsx");
    expect(repair).toMatch(/SwotSignalConsumerPanel/);
    expect(repair).toMatch(/surface="repair_map"/);
    expect(implementation).toMatch(/SwotSignalConsumerPanel/);
    expect(implementation).toMatch(/surface="implementation"/);
  });

  it("queries only approved SWOT analyses for consumer surfaces", () => {
    const source = read("src/lib/swot/swotSignalConsumers.ts");
    expect(source).toMatch(/swot_analyses!inner/);
    expect(source).toMatch(/\.eq\("swot_analyses\.status", "approved"\)/);
    expect(source).toMatch(/\.is\("swot_analyses\.archived_at", null\)/);
    expect(source).not.toMatch(/admin_only_notes/);
  });
});

