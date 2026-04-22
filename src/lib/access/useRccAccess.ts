// P6.1 — Revenue Control Center™ access gating.
// Access source: explicit assignment of an "addon" client resource to the
// customer (e.g. "Revenue Tracker (Client)"). Admins always have access
// (they may also be in client-preview mode, in which case we still allow).
// Diagnostic stage alone does NOT grant access.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RccAccessState = {
  loading: boolean;
  hasAccess: boolean;
  /** True when access is granted purely because the viewer is an admin. */
  viaAdmin: boolean;
  customerId: string | null;
};

export function useRccAccess(): RccAccessState {
  const { user, isAdmin } = useAuth();
  const [state, setState] = useState<RccAccessState>({
    loading: true,
    hasAccess: false,
    viaAdmin: false,
    customerId: null,
  });

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setState({ loading: false, hasAccess: false, viaAdmin: false, customerId: null });
      return;
    }
    (async () => {
      // Find this user's customer record (admins may not have one — that's fine)
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const customerId = customer?.id ?? null;

      if (isAdmin) {
        if (!cancelled)
          setState({ loading: false, hasAccess: true, viaAdmin: true, customerId });
        return;
      }

      if (!customerId) {
        if (!cancelled)
          setState({ loading: false, hasAccess: false, viaAdmin: false, customerId: null });
        return;
      }

      // Has any addon-category client resource been assigned?
      // RLS already restricts to this customer's assignments + non-internal resources.
      const { data: assignments } = await supabase
        .from("resource_assignments")
        .select("resource_id, resources!inner(tool_category, tool_audience)")
        .eq("customer_id", customerId);

      const hasAddon = (assignments || []).some((a: any) => {
        const r = a.resources;
        return r && r.tool_category === "addon" && r.tool_audience !== "internal";
      });

      if (!cancelled)
        setState({
          loading: false,
          hasAccess: hasAddon,
          viaAdmin: false,
          customerId,
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  return state;
}
