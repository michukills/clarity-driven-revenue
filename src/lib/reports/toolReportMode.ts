/**
 * P101 — Report Mode resolver.
 *
 * Pure function. Computes the report mode (`gig_report` | `full_rgs_report`),
 * the gig tier, and the section keysets a stored tool-report artifact is
 * allowed to contain for a given customer + tool + requested mode.
 *
 * Enforcement happens in three places:
 *   1. UI — `ReportModeSelector` calls `resolveReportMode` and surfaces
 *      `denialReason` instead of generating.
 *   2. Write-time — `storeToolReportPdf` calls `resolveReportMode` and
 *      filters the sections; throws if denied. The DB trigger then
 *      double-checks that a gig customer can never be persisted with
 *      `report_mode = 'full_rgs_report'`.
 *   3. Read-time — RLS on `tool_report_artifacts` and `storage.objects`
 *      denies a gig customer from reading any `full_rgs_report` artifact,
 *      even if `client_visible` was incorrectly set.
 */

import type { GigTier } from "@/lib/gig/gigTier";
import {
  buildGigReportScopeMetadata,
  FULL_CLIENT_ONLY_TOOLS,
} from "@/lib/gig/gigTier";
import {
  getAllowedSectionsForTier,
  getFullRgsSectionsForTool,
  getToolReportSectionSet,
  type ToolReportSection,
} from "./toolReportSectionCatalog";

export type ToolReportMode = "gig_report" | "full_rgs_report";

export interface ResolveReportModeInput {
  customer: {
    isGig: boolean;
    gigTier: GigTier | null;
    gigStatus?: "active" | "archived" | "converted" | null;
  } | null;
  toolKey: string;
  requestedMode: ToolReportMode;
}

export interface ResolveReportModeResult {
  allowed: boolean;
  mode: ToolReportMode;
  gigTier: GigTier | null;
  allowedSections: ToolReportSection[];
  /** Section keys excluded by gig scope (excluded RGS sections). */
  excludedSectionKeys: string[];
  denialReason: string | null;
}

/** Copy bank for denial UI. */
export const REPORT_MODE_DENIAL_COPY = {
  fullRgsBlockedForGig:
    "Full RGS Report is not available for this gig customer.",
  outsideGigScope: "This report mode is outside the purchased gig scope.",
  tierMissing:
    "Set a gig package tier before generating a Gig Report.",
  customerMissing:
    "Select a customer before generating a report.",
  archived: "This customer is archived. Reactivate to generate reports.",
  toolNotConfigured:
    "This tool does not have a P101 report structure registered yet.",
  fullClientOnlyTool:
    "This tool is reserved for full RGS clients and is not available in gig scope.",
} as const;

export function resolveReportMode(
  input: ResolveReportModeInput,
): ResolveReportModeResult {
  const sectionSet = getToolReportSectionSet(input.toolKey);
  const baseExcluded: string[] = [];

  if (!input.customer) {
    return deny("full_rgs_report", null, baseExcluded, REPORT_MODE_DENIAL_COPY.customerMissing);
  }

  if (!sectionSet) {
    return deny(input.requestedMode, null, baseExcluded, REPORT_MODE_DENIAL_COPY.toolNotConfigured);
  }

  const isFullClientOnlyTool = (FULL_CLIENT_ONLY_TOOLS as readonly string[]).includes(
    input.toolKey,
  );

  if (input.customer.isGig) {
    if (input.customer.gigStatus === "archived") {
      return deny("gig_report", input.customer.gigTier, baseExcluded, REPORT_MODE_DENIAL_COPY.archived);
    }
    if (isFullClientOnlyTool) {
      return deny(
        "gig_report",
        input.customer.gigTier,
        baseExcluded,
        REPORT_MODE_DENIAL_COPY.fullClientOnlyTool,
      );
    }
    if (input.requestedMode === "full_rgs_report") {
      return deny(
        "gig_report",
        input.customer.gigTier,
        sectionSet.full_rgs
          .filter((s) => !sectionSet.premium.some((p) => p.key === s.key))
          .map((s) => s.key),
        REPORT_MODE_DENIAL_COPY.fullRgsBlockedForGig,
      );
    }
    if (!input.customer.gigTier) {
      return deny("gig_report", null, baseExcluded, REPORT_MODE_DENIAL_COPY.tierMissing);
    }

    // gig_report path — use buildGigReportScopeMetadata to populate the
    // excluded RGS section bag, and getAllowedSectionsForTier for the
    // section keys allowed at this tier.
    const meta = buildGigReportScopeMetadata({
      isGig: true,
      gigTier: input.customer.gigTier,
      toolKey: input.toolKey,
    });
    const allowed = getAllowedSectionsForTier(input.toolKey, input.customer.gigTier);
    const fullRgsOnly = sectionSet.full_rgs
      .filter((s) => !sectionSet.premium.some((p) => p.key === s.key))
      .map((s) => s.key);
    return {
      allowed: true,
      mode: "gig_report",
      gigTier: input.customer.gigTier,
      allowedSections: allowed,
      excludedSectionKeys: Array.from(new Set([...meta.excluded_sections, ...fullRgsOnly])),
      denialReason: null,
    };
  }

  // Full client.
  if (input.requestedMode === "gig_report") {
    // Full clients may still produce a narrow gig-style deliverable.
    const allowed = getAllowedSectionsForTier(input.toolKey, "premium");
    return {
      allowed: true,
      mode: "gig_report",
      gigTier: null,
      allowedSections: allowed,
      excludedSectionKeys: sectionSet.full_rgs
        .filter((s) => !allowed.some((a) => a.key === s.key))
        .map((s) => s.key),
      denialReason: null,
    };
  }
  return {
    allowed: true,
    mode: "full_rgs_report",
    gigTier: null,
    allowedSections: getFullRgsSectionsForTool(input.toolKey),
    excludedSectionKeys: [],
    denialReason: null,
  };
}

function deny(
  mode: ToolReportMode,
  gigTier: GigTier | null,
  excluded: string[],
  reason: string,
): ResolveReportModeResult {
  return {
    allowed: false,
    mode,
    gigTier,
    allowedSections: [],
    excludedSectionKeys: excluded,
    denialReason: reason,
  };
}

/** Filter caller-supplied sections to those allowed by the resolved mode. */
export function filterSectionsToAllowed<T extends { key: string }>(
  sections: T[],
  resolved: Pick<ResolveReportModeResult, "allowedSections">,
): T[] {
  const allow = new Set(resolved.allowedSections.map((s) => s.key));
  if (allow.size === 0) return [];
  return sections.filter((s) => allow.has(s.key));
}