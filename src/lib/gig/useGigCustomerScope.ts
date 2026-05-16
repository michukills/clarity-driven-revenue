/**
 * P100A — Hook: fetch a customer's gig metadata and compose the AI/report
 * scope context for any standalone tool screen.
 *
 * Returns `null` while loading or if no customer is selected. When the
 * customer is not a gig customer, the hook still returns a stable shape so
 * tool screens have a single uniform contract.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildGigAiScopeContext,
  buildGigReportScopeMetadata,
  checkGigToolAccess,
  type GigAiScopeContext,
  type GigReportScopeMetadata,
  type GigTier,
} from "./gigTier";
import { resolveGigToolKey } from "./gigToolKeyMap";

export type GigStatusValue = "active" | "archived" | "converted" | null;

export interface GigCustomerScope {
  loading: boolean;
  customerId: string | null;
  isGig: boolean;
  gigTier: GigTier | null;
  gigStatus: GigStatusValue;
  gigPackageType: string | null;
  fullName: string | null;
  businessName: string | null;
  email: string | null;
  /** Result of `checkGigToolAccess` when a tool key is provided. */
  access: { allowed: boolean; reason: string; excludedFullRgsSections: string[] };
  /** Stable AI scope context (safe for full-client too). */
  aiScope: GigAiScopeContext;
  /** Stable report scope metadata for P101 consumers. */
  reportScope: GigReportScopeMetadata & {
    report_mode: "gig_report" | "full_rgs_report";
    rgs_report_available: boolean;
  };
}

export function useGigCustomerScope(
  customerId: string | null | undefined,
  toolKey?: string | null,
): GigCustomerScope {
  const [state, setState] = useState<{
    loading: boolean;
    row: Record<string, any> | null;
  }>({ loading: false, row: null });

  useEffect(() => {
    let cancelled = false;
    if (!customerId) {
      setState({ loading: false, row: null });
      return;
    }
    setState({ loading: true, row: null });
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select(
          "id, full_name, business_name, email, is_gig, gig_tier, gig_status, gig_package_type, account_kind",
        )
        .eq("id", customerId)
        .maybeSingle();
      if (cancelled) return;
      setState({ loading: false, row: (data as Record<string, any>) ?? null });
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return composeGigCustomerScope({
    loading: state.loading,
    row: state.row,
    customerId: customerId ?? null,
    toolKey: toolKey ?? null,
  });
}

/**
 * Pure composer extracted so it can be exercised by unit tests without
 * needing a Supabase client.
 */
export function composeGigCustomerScope(input: {
  loading: boolean;
  row: Record<string, any> | null;
  customerId: string | null;
  toolKey: string | null;
}): GigCustomerScope {
  const row = input.row;
  const isGig = Boolean(row?.is_gig);
  const gigTier = (row?.gig_tier ?? null) as GigTier | null;
  const gigStatus = (row?.gig_status ?? null) as GigStatusValue;

  const resolved = input.toolKey ? resolveGigToolKey(input.toolKey) : { kind: "unknown" as const };
  const canonical =
    resolved.kind === "gig" || resolved.kind === "full_client_only" ? resolved.key : (input.toolKey ?? "");

  const access = input.toolKey
    ? checkGigToolAccess(canonical, { isGig, gigTier, gigStatus })
    : { allowed: true, reason: "", excludedFullRgsSections: [] };

  const aiScope = buildGigAiScopeContext({
    isGig,
    gigTier,
    toolKey: resolved.kind === "gig" ? resolved.key : undefined,
  });

  const reportScopeBase = buildGigReportScopeMetadata({
    isGig,
    gigTier,
    toolKey: resolved.kind === "gig" ? resolved.key : undefined,
  });

  return {
    loading: input.loading,
    customerId: input.customerId,
    isGig,
    gigTier,
    gigStatus,
    gigPackageType: (row?.gig_package_type ?? null) as string | null,
    fullName: (row?.full_name ?? null) as string | null,
    businessName: (row?.business_name ?? null) as string | null,
    email: (row?.email ?? null) as string | null,
    access,
    aiScope,
    reportScope: {
      ...reportScopeBase,
      report_mode: isGig ? "gig_report" : "full_rgs_report",
      rgs_report_available: !isGig,
    },
  };
}
