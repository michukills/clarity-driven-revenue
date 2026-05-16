/**
 * P100 — Gig Tier definitions, tool eligibility matrix, AI scope context.
 *
 * Single source of truth for which standalone/gig tools a customer can run
 * based on their `gig_tier`, and the depth contract AI surfaces must honor.
 * Pure — no DB calls. Imported by UI, guards, and AI prompt builders so a
 * Basic gig customer never receives Premium-depth output, and no gig tier
 * unlocks full-RGS scope.
 */

export type GigTier = "basic" | "standard" | "premium";

export const GIG_TIERS: readonly GigTier[] = ["basic", "standard", "premium"] as const;

export const GIG_TIER_LABEL: Record<GigTier, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
};

export const GIG_TIER_TONE: Record<GigTier, string> = {
  basic: "bg-muted/40 text-muted-foreground border-border",
  standard: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  premium: "bg-primary/15 text-primary border-primary/40",
};

export const GIG_TIER_SHORT_DESCRIPTION: Record<GigTier, string> = {
  basic: "Narrow scope, concise output, limited sections.",
  standard: "Deeper structured analysis within the purchased gig scope.",
  premium: "Full gig-level deliverable. Not equivalent to a full RGS engagement.",
};

export type GigToolKey =
  | "sop_training_bible"
  | "buyer_persona_icp"
  | "swot_strategic_matrix"
  | "goals_kpi_plan"
  | "campaign_brief"
  | "campaign_strategy"
  | "workflow_process_map"
  | "business_friction_snapshot";

export interface GigToolEligibility {
  key: GigToolKey;
  label: string;
  minTier: GigTier;
  allowedTiers: GigTier[];
  clientVisible: boolean;
  aiAssistAllowed: boolean;
  excludedFullRgsSections: string[];
}

export const GIG_TOOL_REGISTRY: Record<GigToolKey, GigToolEligibility> = {
  sop_training_bible: {
    key: "sop_training_bible",
    label: "SOP / Training Bible",
    minTier: "basic",
    allowedTiers: ["basic", "standard", "premium"],
    clientVisible: true,
    aiAssistAllowed: true,
    excludedFullRgsSections: ["control_system_monitoring", "diagnostic_scorecard_link"],
  },
  buyer_persona_icp: {
    key: "buyer_persona_icp",
    label: "Buyer Persona / ICP",
    minTier: "basic",
    allowedTiers: ["basic", "standard", "premium"],
    clientVisible: true,
    aiAssistAllowed: true,
    excludedFullRgsSections: ["diagnostic_evidence_vault"],
  },
  swot_strategic_matrix: {
    key: "swot_strategic_matrix",
    label: "SWOT Strategic Matrix",
    minTier: "standard",
    allowedTiers: ["standard", "premium"],
    clientVisible: true,
    aiAssistAllowed: true,
    excludedFullRgsSections: ["priority_repair_map", "implementation_roadmap"],
  },
  goals_kpi_plan: {
    key: "goals_kpi_plan",
    label: "Goals & KPI Plan",
    minTier: "standard",
    allowedTiers: ["standard", "premium"],
    clientVisible: true,
    aiAssistAllowed: true,
    excludedFullRgsSections: ["control_system_monitoring", "revenue_risk_monitor"],
  },
  campaign_brief: {
    key: "campaign_brief",
    label: "Campaign Brief",
    minTier: "basic",
    allowedTiers: ["basic", "standard", "premium"],
    clientVisible: false,
    aiAssistAllowed: true,
    excludedFullRgsSections: ["publishing", "scheduling", "paid_ads"],
  },
  campaign_strategy: {
    key: "campaign_strategy",
    label: "Campaign Strategy",
    minTier: "premium",
    allowedTiers: ["premium"],
    clientVisible: false,
    aiAssistAllowed: true,
    excludedFullRgsSections: ["publishing", "scheduling", "paid_ads", "engagement_intelligence"],
  },
  workflow_process_map: {
    key: "workflow_process_map",
    label: "Workflow / Process Map",
    minTier: "standard",
    allowedTiers: ["standard", "premium"],
    clientVisible: true,
    aiAssistAllowed: true,
    excludedFullRgsSections: ["implementation_roadmap"],
  },
  business_friction_snapshot: {
    key: "business_friction_snapshot",
    label: "Business Friction Snapshot",
    minTier: "basic",
    allowedTiers: ["basic", "standard", "premium"],
    clientVisible: true,
    aiAssistAllowed: true,
    excludedFullRgsSections: [
      "full_diagnostic_scorecard",
      "owner_interview",
      "diagnostic_report",
    ],
  },
};

export const FULL_CLIENT_ONLY_TOOLS = [
  "diagnostic_scorecard",
  "owner_interview",
  "evidence_vault",
  "diagnostic_report",
  "priority_repair_map",
  "implementation_roadmap",
  "control_system",
  "revenue_risk_monitor",
] as const;

export type FullClientOnlyTool = (typeof FULL_CLIENT_ONLY_TOOLS)[number];

export function tierMeets(actual: GigTier | null | undefined, required: GigTier): boolean {
  if (!actual) return false;
  const order: Record<GigTier, number> = { basic: 1, standard: 2, premium: 3 };
  return order[actual] >= order[required];
}

export interface GigToolAccessResult {
  allowed: boolean;
  reason: string;
  excludedFullRgsSections: string[];
}

export function checkGigToolAccess(
  toolKey: string,
  ctx: {
    isGig: boolean;
    gigTier: GigTier | null | undefined;
    gigStatus: "active" | "archived" | "converted" | null | undefined;
  },
): GigToolAccessResult {
  if ((FULL_CLIENT_ONLY_TOOLS as readonly string[]).includes(toolKey)) {
    if (ctx.isGig) {
      return {
        allowed: false,
        reason:
          "Full Diagnostic access is not included in this standalone scope. Convert to a full RGS engagement to unlock this workflow.",
        excludedFullRgsSections: [],
      };
    }
    return { allowed: true, reason: "", excludedFullRgsSections: [] };
  }
  if (!ctx.isGig) {
    return { allowed: true, reason: "", excludedFullRgsSections: [] };
  }
  if (ctx.gigStatus === "archived") {
    return { allowed: false, reason: "This customer is archived.", excludedFullRgsSections: [] };
  }
  const tool = GIG_TOOL_REGISTRY[toolKey as GigToolKey];
  if (!tool) {
    return {
      allowed: false,
      reason: "This customer is not eligible for this standalone tool.",
      excludedFullRgsSections: [],
    };
  }
  if (!ctx.gigTier) {
    return {
      allowed: false,
      reason: "Set a gig package tier before running this deliverable.",
      excludedFullRgsSections: tool.excludedFullRgsSections,
    };
  }
  if (!tool.allowedTiers.includes(ctx.gigTier)) {
    return {
      allowed: false,
      reason: `This tool is not included in this gig package. Upgrade to ${GIG_TIER_LABEL[tool.minTier]} or higher to access it.`,
      excludedFullRgsSections: tool.excludedFullRgsSections,
    };
  }
  return { allowed: true, reason: "", excludedFullRgsSections: tool.excludedFullRgsSections };
}

export interface GigAiScopeContext {
  gig_mode: boolean;
  gig_tier: GigTier | null;
  scope_limitations: string[];
  excluded_full_rgs_sections: string[];
  allowed_depth: "light" | "structured" | "deep";
  output_length_target: "short" | "medium" | "long";
  client_safe_language_required: true;
}

const BASE_SCOPE_LIMITATIONS = [
  "Stay within the purchased standalone deliverable scope.",
  "Do not imply full Diagnostic, Implementation, or RGS Control System access.",
  "Do not promise outcomes, revenue lift, ROI, lead volume, ranking, or growth.",
  "Do not provide legal, tax, accounting, compliance, fiduciary, or valuation certification.",
];

const EXCLUDED_RGS_SECTIONS_BASE = [
  "full_diagnostic_scorecard",
  "owner_interview",
  "diagnostic_report",
  "priority_repair_map",
  "implementation_roadmap",
  "control_system_monitoring",
  "revenue_risk_monitor",
];

export function buildGigAiScopeContext(args: {
  isGig: boolean;
  gigTier: GigTier | null | undefined;
  toolKey?: string;
}): GigAiScopeContext {
  if (!args.isGig) {
    return {
      gig_mode: false,
      gig_tier: null,
      scope_limitations: [],
      excluded_full_rgs_sections: [],
      allowed_depth: "deep",
      output_length_target: "long",
      client_safe_language_required: true,
    };
  }
  const tool = args.toolKey ? GIG_TOOL_REGISTRY[args.toolKey as GigToolKey] : undefined;
  const excluded = Array.from(new Set([
    ...EXCLUDED_RGS_SECTIONS_BASE,
    ...(tool?.excludedFullRgsSections ?? []),
  ]));
  const tier = args.gigTier ?? null;
  switch (tier) {
    case "basic":
      return {
        gig_mode: true,
        gig_tier: "basic",
        scope_limitations: [
          ...BASE_SCOPE_LIMITATIONS,
          "Limit to the narrowest useful scope for a Basic gig deliverable.",
        ],
        excluded_full_rgs_sections: excluded,
        allowed_depth: "light",
        output_length_target: "short",
        client_safe_language_required: true,
      };
    case "standard":
      return {
        gig_mode: true,
        gig_tier: "standard",
        scope_limitations: BASE_SCOPE_LIMITATIONS,
        excluded_full_rgs_sections: excluded,
        allowed_depth: "structured",
        output_length_target: "medium",
        client_safe_language_required: true,
      };
    case "premium":
      return {
        gig_mode: true,
        gig_tier: "premium",
        scope_limitations: BASE_SCOPE_LIMITATIONS,
        excluded_full_rgs_sections: excluded,
        allowed_depth: "deep",
        output_length_target: "long",
        client_safe_language_required: true,
      };
    default:
      return {
        gig_mode: true,
        gig_tier: null,
        scope_limitations: [
          ...BASE_SCOPE_LIMITATIONS,
          "Tier not set. Decline to produce a deliverable until tier is assigned.",
        ],
        excluded_full_rgs_sections: excluded,
        allowed_depth: "light",
        output_length_target: "short",
        client_safe_language_required: true,
      };
  }
}

export interface GigReportScopeMetadata {
  customer_type: "gig" | "full_client";
  gig_tier: GigTier | null;
  purchased_tool: string | null;
  allowed_sections: string[];
  excluded_sections: string[];
  client_visibility: "client_safe" | "admin_only";
}

export function buildGigReportScopeMetadata(args: {
  isGig: boolean;
  gigTier: GigTier | null | undefined;
  toolKey?: string;
  clientVisible?: boolean;
}): GigReportScopeMetadata {
  const tool = args.toolKey ? GIG_TOOL_REGISTRY[args.toolKey as GigToolKey] : undefined;
  const excluded = [
    ...EXCLUDED_RGS_SECTIONS_BASE,
    ...(tool?.excludedFullRgsSections ?? []),
  ];
  if (!args.isGig) {
    return {
      customer_type: "full_client",
      gig_tier: null,
      purchased_tool: args.toolKey ?? null,
      allowed_sections: [],
      excluded_sections: [],
      client_visibility: args.clientVisible === false ? "admin_only" : "client_safe",
    };
  }
  const allowedByTier: Record<GigTier, string[]> = {
    basic: ["summary", "key_findings", "next_actions"],
    standard: ["summary", "key_findings", "structured_analysis", "next_actions"],
    premium: [
      "summary",
      "key_findings",
      "structured_analysis",
      "swot",
      "positioning",
      "channel_plan",
      "kpi_outline",
      "next_actions",
    ],
  };
  const tier = args.gigTier ?? null;
  return {
    customer_type: "gig",
    gig_tier: tier,
    purchased_tool: args.toolKey ?? null,
    allowed_sections: tier ? allowedByTier[tier] : [],
    excluded_sections: excluded,
    client_visibility: args.clientVisible === false ? "admin_only" : "client_safe",
  };
}

const FORBIDDEN_GIG_PHRASES = [
  "full os access",
  "everything included",
  "unlimited",
  "guaranteed results",
  "guaranteed revenue",
  "guaranteed roi",
  "guaranteed growth",
  "guaranteed ranking",
  "guaranteed leads",
  "explosive growth",
  "10x",
  "dominate",
  "done-for-you operator",
  "fully managed marketing department",
  "ongoing control system monitoring",
  "full diagnostic access",
  "full implementation access",
];

export function detectUnsafeGigCopy(text: string): string[] {
  const lower = (text ?? "").toLowerCase();
  return FORBIDDEN_GIG_PHRASES.filter((p) => lower.includes(p));
}

export const GIG_DENIAL_REASONS = {
  notIncludedInPackage: "This tool is not included in this gig package.",
  upgradeRequired: "Upgrade to a full RGS engagement to access this workflow.",
  archived: "This customer is archived.",
  notEligible: "This customer is not eligible for this standalone tool.",
  tierMissing: "Set a gig package tier before running this deliverable.",
} as const;
