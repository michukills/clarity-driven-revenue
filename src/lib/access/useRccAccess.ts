// P6.1 / P7.2.1 / P7.2.4 — Revenue Control Center™ access gating.
// Combines the true-RCC-resource gate (P7.2.1) with implementation-inclusion
// + 30-day post-implementation grace + manual subscription status (P7.2.4).
// All access logic lives in computeRccEntitlement so the UI, the admin
// Billing card, and the cross-client alert aggregator share one rule.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  computeRccEntitlement,
  type RccEntitlementReason,
} from "@/lib/access/rccEntitlement";

export type RccAccessState = {
  loading: boolean;
  hasAccess: boolean;
  /** True when access is granted purely because the viewer is an admin. */
  viaAdmin: boolean;
  customerId: string | null;
  reason: RccEntitlementReason | null;
  graceEndsAt: string | null;
  paidThrough: string | null;
};

const INITIAL: RccAccessState = {
  loading: true,
  hasAccess: false,
  viaAdmin: false,
  customerId: null,
  reason: null,
  graceEndsAt: null,
  paidThrough: null,
};

export function useRccAccess(): RccAccessState {
  const { user, isAdmin } = useAuth();
  const [state, setState] = useState<RccAccessState>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setState({ ...INITIAL, loading: false });
      return;
    }
    (async () => {
      const { data: customer } = await supabase
        .from("customers")
        .select(
          "id, stage, implementation_ended_at, rcc_subscription_status, rcc_paid_through",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      const customerId = customer?.id ?? null;

      if (isAdmin) {
        const ent = computeRccEntitlement({ isAdmin: true });
        if (!cancelled)
          setState({
            loading: false,
            hasAccess: true,
            viaAdmin: true,
            customerId,
            reason: ent.reason,
            graceEndsAt: ent.graceEndsAt,
            paidThrough: ent.paidThrough,
          });
        return;
      }

      if (!customerId) {
        if (!cancelled)
          setState({
            ...INITIAL,
            loading: false,
            reason: "no_rcc_resource",
          });
        return;
      }

      const { data: assignments } = await supabase
        .from("resource_assignments")
        .select("resource_id, resources!inner(title, url, tool_category, tool_audience)")
        .eq("customer_id", customerId);

      const ent = computeRccEntitlement({
        isAdmin: false,
        assignedResources: (assignments || []).map((a: any) => a.resources),
        stage: (customer as any)?.stage ?? null,
        implementationEndedAt: (customer as any)?.implementation_ended_at ?? null,
        rccSubscriptionStatus: (customer as any)?.rcc_subscription_status ?? null,
        rccPaidThrough: (customer as any)?.rcc_paid_through ?? null,
      });

      if (!cancelled)
        setState({
          loading: false,
          hasAccess: ent.hasAccess,
          viaAdmin: false,
          customerId,
          reason: ent.reason,
          graceEndsAt: ent.graceEndsAt,
          paidThrough: ent.paidThrough,
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  return state;
}
