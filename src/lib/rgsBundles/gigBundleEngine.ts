import { GIG_BUNDLE_REGISTRY } from "./gigBundleRegistry";
import type { GigBundleKey, GigBundlePlan } from "./types";
import type { RgsSignalKey } from "@/lib/rgsInterlock/types";

export function listGigBundles() {
  return GIG_BUNDLE_REGISTRY;
}

export function getGigBundle(bundleKey: GigBundleKey) {
  return GIG_BUNDLE_REGISTRY.find((bundle) => bundle.bundleKey === bundleKey) ?? null;
}

export function buildGigBundlePlan(
  bundleKey: GigBundleKey,
  availableSignals: ReadonlyArray<RgsSignalKey>,
): GigBundlePlan {
  const bundle = getGigBundle(bundleKey);
  if (!bundle) throw new Error(`Unknown gig bundle: ${bundleKey}`);

  const available = new Set(availableSignals);
  const missingRequiredInputs = bundle.requiredInputs.filter((input) => !available.has(input));
  const availableOptionalInputs = bundle.optionalInputs.filter((input) => available.has(input));
  const canPrepareDraft = missingRequiredInputs.length === 0;

  return {
    bundle,
    missingRequiredInputs,
    availableOptionalInputs,
    canPrepareDraft,
    nextSafeAction: canPrepareDraft
      ? "Prepare the bounded deliverable draft, run safety review, and keep admin-only notes out of client output."
      : `Collect missing inputs first: ${missingRequiredInputs.join(", ")}.`,
  };
}

export function bundlesUsingTool(toolKey: string) {
  return GIG_BUNDLE_REGISTRY.filter(
    (bundle) => bundle.includedTools.includes(toolKey) || bundle.optionalTools.includes(toolKey),
  );
}

export function bundlesProducingReport(reportOutput: string) {
  return GIG_BUNDLE_REGISTRY.filter((bundle) => bundle.reportOutputs.includes(reportOutput));
}

