import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SignupRequestStatus =
  | "pending_review"
  | "clarification_requested"
  | "approved_client"
  | "approved_demo"
  | "denied"
  | "suspended";

export type SignupRequestRow = {
  id: string;
  request_status: SignupRequestStatus;
  intended_access_type: string;
  business_name: string | null;
  industry: string | null;
  clarification_note: string | null;
  email: string;
  full_name: string | null;
  created_at: string;
  decided_at: string | null;
  linked_customer_id: string | null;
};

/**
 * P83A — Resolves the current user's signup-request status (if any).
 *
 * - admins: skipped (returns null)
 * - users with a linked customer row: skipped (legacy invite flow); returns null
 * - new users with no customer row but a `signup_requests` entry: returns the row
 * - new users with no request row at all: also returns null (legacy/invite path)
 */
export function useSignupRequestStatus() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [request, setRequest] = useState<SignupRequestRow | null>(null);
  const [hasCustomer, setHasCustomer] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user || isAdmin) {
      setRequest(null);
      setHasCustomer(null);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [reqRes, custRes] = await Promise.all([
        supabase
          .from("signup_requests" as any)
          .select(
            "id, request_status, intended_access_type, business_name, industry, clarification_note, email, full_name, created_at, decided_at, linked_customer_id",
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .is("archived_at", null)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setRequest((reqRes.data as SignupRequestRow | null) ?? null);
      setHasCustomer(!!custRes.data?.id);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isAdmin, authLoading]);

  // Effective gate: only block portal if a request row exists and is not approved,
  // AND the user does not already have a customer row (legacy invite flow).
  const blockingStatus: SignupRequestStatus | null =
    request && !hasCustomer &&
    (request.request_status === "pending_review" ||
      request.request_status === "clarification_requested" ||
      request.request_status === "denied" ||
      request.request_status === "suspended")
      ? request.request_status
      : null;

  return { request, hasCustomer, loading, blockingStatus };
}
