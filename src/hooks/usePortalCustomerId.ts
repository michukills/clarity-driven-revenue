import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Resolves the customer id the portal should render for.
 *
 * - Admin/platform_owner in client-preview mode: uses the selected previewCustomerId.
 * - Regular client: looks up their own customer row by user_id (non-archived).
 * - Admin/owner not in preview: returns null (callers should redirect to /admin or selector).
 *
 * Returns { customerId, loading, isPreview }.
 */
export function usePortalCustomerId() {
  const { user, isAdmin, previewCustomerId } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Admin in preview mode → use selected customer
      if (isAdmin && previewCustomerId) {
        if (!cancelled) {
          setCustomerId(previewCustomerId);
          setLoading(false);
        }
        return;
      }
      // Admin not in preview → no portal customer
      if (isAdmin) {
        if (!cancelled) {
          setCustomerId(null);
          setLoading(false);
        }
        return;
      }
      // Regular client → resolve own customer by user_id, excluding archived
      if (!user) {
        if (!cancelled) {
          setCustomerId(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .maybeSingle();
      if (!cancelled) {
        setCustomerId(data?.id ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isAdmin, previewCustomerId]);

  return { customerId, loading, isPreview: isAdmin && !!previewCustomerId };
}
