// P20.3 — Brain Router.
//
// Pure / deterministic. Selects the correct industry brain, falls back to
// General / Mixed when the industry is missing or unverified, and ALWAYS
// runs the General RGS Brain alongside.
//
// No AI. No network. No randomness.

import type { Leak } from "@/lib/leakEngine/leakObject";
import type { BrainInput, BrainResult } from "./types";
import { runGeneralBrain } from "./generalBrain";
import { runTradesBrain } from "./industryBrains/tradesServices";
import { runRestaurantBrain } from "./industryBrains/restaurants";
import { runRetailBrain } from "./industryBrains/retail";
import { runCannabisBrain } from "./industryBrains/medicalMmc";
import { runGeneralMixedBrain } from "./industryBrains/generalMixed";
import { clientVisibleToolsForIndustry, toolsForIndustry } from "./toolCoverageMap";

export type BrainName =
  | "general"
  | "trade_field_service"
  | "restaurant"
  | "retail"
  | "mmj_cannabis"
  | "general_service";

export interface BrainRouterOutput {
  industryUsed: BrainInput["industry"];
  industryConfirmed: boolean;
  fellBackToGeneralMixed: boolean;
  generalLeaks: Leak[];
  industryLeaks: Leak[];
  /** Combined, de-duplicated leaks (general + industry). */
  combinedLeaks: Leak[];
  /** Industry brain that ran (after fallback resolution). */
  industryBrain: BrainName;
  /** Tools allowed for the resolved industry (full + client-only). */
  tools: ReturnType<typeof toolsForIndustry>;
  clientVisibleTools: ReturnType<typeof clientVisibleToolsForIndustry>;
}

function pickIndustryBrain(industry: BrainInput["industry"]): (i: BrainInput) => BrainResult {
  switch (industry) {
    case "trade_field_service":
      return runTradesBrain;
    case "restaurant":
      return runRestaurantBrain;
    case "retail":
      return runRetailBrain;
    case "mmj_cannabis":
      return runCannabisBrain;
    case "general_service":
    case "other":
    default:
      return runGeneralMixedBrain;
  }
}

export function routeBrain(input: BrainInput): BrainRouterOutput {
  // Resolve effective industry. If unconfirmed or missing, fall back to general_service
  // for the *industry* layer — but never lie about which industry we used.
  const fellBackToGeneralMixed = !input.industryConfirmed || !input.industry;
  const effectiveIndustry: BrainInput["industry"] =
    fellBackToGeneralMixed ? "general_service" : input.industry;

  const industryInput: BrainInput = { ...input, industry: effectiveIndustry };

  const general = runGeneralBrain(input);
  const industry = pickIndustryBrain(effectiveIndustry)(industryInput);

  // Combine leaks — de-dupe by id to keep ranking stable downstream.
  const seen = new Set<string>();
  const combined: Leak[] = [];
  for (const l of [...general.leaks, ...industry.leaks]) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    combined.push(l);
  }

  const tools = toolsForIndustry(effectiveIndustry);
  const clientVisibleTools = clientVisibleToolsForIndustry(effectiveIndustry);

  return {
    industryUsed: effectiveIndustry,
    industryConfirmed: input.industryConfirmed,
    fellBackToGeneralMixed,
    generalLeaks: general.leaks,
    industryLeaks: industry.leaks,
    combinedLeaks: combined,
    industryBrain: (industry.brain as BrainName) ?? "general_service",
    tools,
    clientVisibleTools,
  };
}
