import { supabase } from "@/integrations/supabase/client";

export type PendingSignup = {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

export type AuthUserOption = PendingSignup & {
  linked_customer_id: string | null;
};

async function invokeAdminAccountLinks<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-account-links", { body });
  if (error) throw error;
  if ((data as any)?.error) {
    const details = (data as any)?.details;
    const detailText = details
      ? [
          details.action ? `action ${details.action}` : null,
          details.targetEmail ? `target ${details.targetEmail}` : null,
          details.customerId ? `customer ${details.customerId}` : null,
          details.industryStatus ? `industry ${details.industryStatus}` : null,
          details.dbCode ? `DB ${details.dbCode}` : null,
        ].filter(Boolean).join("; ")
      : "";
    throw new Error(detailText ? `${(data as any).error} (${detailText})` : (data as any).error);
  }
  return (data as any)?.result as T;
}

export const adminAccountLinks = {
  listUnlinkedSignups: () =>
    invokeAdminAccountLinks<PendingSignup[]>({ action: "list_unlinked_signups" }),

  listAuthUsersForLink: (search: string | null) =>
    invokeAdminAccountLinks<AuthUserOption[]>({
      action: "list_auth_users_for_link",
      search,
    }),

  repairCustomerLinks: () =>
    invokeAdminAccountLinks<{ linked_count: number; ambiguous_count: number }>({
      action: "repair_customer_links",
    }),

  createCustomerFromSignup: (userId: string) =>
    invokeAdminAccountLinks<any>({
      action: "create_customer_from_signup",
      user_id: userId,
    }),

  linkSignupToCustomer: (userId: string, customerId: string) =>
    invokeAdminAccountLinks<any>({
      action: "link_signup_to_customer",
      user_id: userId,
      customer_id: customerId,
    }),

  setCustomerUserLink: (customerId: string, userId: string | null, force = false) =>
    invokeAdminAccountLinks<any>({
      action: "set_customer_user_link",
      customer_id: customerId,
      user_id: userId,
      force,
    }),

  denySignup: (userId: string, reason: string | null) =>
    invokeAdminAccountLinks<null>({
      action: "deny_signup",
      user_id: userId,
      reason,
    }),

  undenySignup: (userId: string) =>
    invokeAdminAccountLinks<null>({
      action: "undeny_signup",
      user_id: userId,
    }),

  listSignupRequests: () =>
    invokeAdminAccountLinks<any[]>({ action: "list_signup_requests" }),

  decideSignupRequest: (
    requestId: string,
    decision: "approve_as_client" | "approve_as_demo" | "deny" | "suspend" | "request_clarification",
    opts: { clarification_note?: string | null; override_business_name?: string | null; override_industry?: string | null } = {},
  ) => supabase.functions.invoke("admin-account-links", {
    body: {
      action: "decide_signup_request",
      request_id: requestId,
      decision,
      clarification_note: opts.clarification_note ?? null,
      override_business_name: opts.override_business_name ?? null,
      override_industry: opts.override_industry ?? null,
    },
  }).then(({ data, error }) => {
    if (error) throw error;
    if ((data as any)?.error) {
      const details = (data as any)?.details;
      const detailText = details
        ? [
            details.action ? `action ${details.action}` : null,
            details.targetEmail ? `target ${details.targetEmail}` : null,
            details.customerId ? `customer ${details.customerId}` : null,
            details.industryStatus ? `industry ${details.industryStatus}` : null,
            details.dbCode ? `DB ${details.dbCode}` : null,
          ].filter(Boolean).join("; ")
        : "";
      throw new Error(detailText ? `${(data as any).error} (${detailText})` : (data as any).error);
    }
    return data as {
      result: any;
      demo_seed?: { ok: boolean; errors: string[] } | null;
    };
  }),
};
