import { describe, expect, it } from "vitest";
import {
  buildGigBundlePlan,
  bundlesProducingReport,
  bundlesUsingTool,
  getGigBundle,
  listGigBundles,
} from "@/lib/rgsBundles/gigBundleEngine";

describe("RGS standalone/gig bundle registry", () => {
  it("defines the required bounded gig bundles", () => {
    expect(listGigBundles().map((bundle) => bundle.bundleKey)).toEqual([
      "buyer_persona_icp_gig",
      "campaign_strategy_gig",
      "repair_map_gig",
      "sop_training_bible_gig",
      "control_system_setup_gig",
    ]);
  });

  it("campaign strategy gig uses persona, SWOT, Campaign Control, safety, and manual posting boundaries", () => {
    const bundle = getGigBundle("campaign_strategy_gig");
    expect(bundle?.includedTools).toEqual(expect.arrayContaining([
      "buyer_persona_icp",
      "swot_strategic_matrix",
      "campaign_control_system",
    ]));
    expect(bundle?.excludedTools).toEqual(expect.arrayContaining(["paid_diagnostic", "implementation_roadmap", "rgs_control_system"]));
    expect(bundle?.deliverables.join(" ")).toMatch(/Manual posting instructions/);
    expect(bundle?.safetyBoundaries.join(" ")).toMatch(/No fake GA4/);
    expect(bundle?.scopeBoundary).toMatch(/does not include live platform management/i);
  });

  it("does not imply full Diagnostic, Implementation, or Control System access unless explicitly included", () => {
    for (const bundle of listGigBundles()) {
      expect(bundle.scopeBoundary).toMatch(/not|does not|unless/i);
      expect(bundle.safetyBoundaries.join(" ")).toMatch(/Do not imply full Diagnostic/);
    }
    expect(getGigBundle("control_system_setup_gig")?.scopeBoundary).toMatch(/not the recurring RGS Control System subscription/i);
  });

  it("builds a safe bundle plan from available signals", () => {
    const blocked = buildGigBundlePlan("campaign_strategy_gig", ["campaign_profile"]);
    expect(blocked.canPrepareDraft).toBe(false);
    expect(blocked.missingRequiredInputs).toEqual(["buyer_persona_signal"]);
    expect(blocked.nextSafeAction).toMatch(/Collect missing inputs/);

    const ready = buildGigBundlePlan("campaign_strategy_gig", ["campaign_profile", "buyer_persona_signal", "swot_signal"]);
    expect(ready.canPrepareDraft).toBe(true);
    expect(ready.availableOptionalInputs).toContain("swot_signal");
    expect(ready.nextSafeAction).toMatch(/safety review/);
  });

  it("can find bundles by tool and report output", () => {
    expect(bundlesUsingTool("campaign_control_system").map((bundle) => bundle.bundleKey)).toEqual(expect.arrayContaining([
      "campaign_strategy_gig",
      "buyer_persona_icp_gig",
    ]));
    expect(bundlesProducingReport("sop_report").map((bundle) => bundle.bundleKey)).toEqual(["sop_training_bible_gig"]);
  });
});

