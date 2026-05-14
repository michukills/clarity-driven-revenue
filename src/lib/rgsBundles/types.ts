import type { RgsSignalKey } from "@/lib/rgsInterlock/types";

export type GigBundleKey =
  | "buyer_persona_icp_gig"
  | "campaign_strategy_gig"
  | "repair_map_gig"
  | "sop_training_bible_gig"
  | "control_system_setup_gig";

export interface GigBundleDefinition {
  bundleKey: GigBundleKey;
  displayName: string;
  includedTools: string[];
  optionalTools: string[];
  excludedTools: string[];
  requiredInputs: RgsSignalKey[];
  optionalInputs: RgsSignalKey[];
  deliverables: string[];
  reportOutputs: string[];
  approvalRequirements: string[];
  clientVisibleOutputs: string[];
  adminOnlyFields: string[];
  scopeBoundary: string;
  missingInputBehavior: string;
  reengagementTriggers: string[];
  safetyBoundaries: string[];
}

export interface GigBundlePlan {
  bundle: GigBundleDefinition;
  missingRequiredInputs: RgsSignalKey[];
  availableOptionalInputs: RgsSignalKey[];
  canPrepareDraft: boolean;
  nextSafeAction: string;
}

