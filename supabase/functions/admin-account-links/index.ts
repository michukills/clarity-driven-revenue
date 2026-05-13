/**
 * Admin-only account-linking operations.
 *
 * This replaces direct browser RPC calls to SECURITY DEFINER functions that
 * touch auth.users. The browser only invokes this JWT-protected function;
 * the function verifies admin status and performs privileged work with the
 * service role on the backend.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";
import {
  seedPrairieRidgeDemoWorkspace,
  P83B_DEMO_BUSINESS_NAME,
  P83B_DEMO_INDUSTRY,
} from "./p83b_demo_seed.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AuthUserRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  linked_customer_id?: string | null;
};

type SignupRequestRow = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  business_website: string | null;
  industry: string | null;
  intended_access_type: string;
  requester_note: string | null;
  request_status: string;
  clarification_note: string | null;
  linked_customer_id: string | null;
};

type IndustryCategory =
  | "trade_field_service"
  | "retail"
  | "restaurant"
  | "mmj_cannabis"
  | "general_service"
  | "other";

const VALID_INDUSTRY_CATEGORIES: readonly IndustryCategory[] = [
  "trade_field_service",
  "retail",
  "restaurant",
  "mmj_cannabis",
  "general_service",
  "other",
];

const VALID_INDUSTRY_CATEGORY_SET = new Set<string>(VALID_INDUSTRY_CATEGORIES);
const INDUSTRY_PLACEHOLDER_VALUES = new Set([
  "industry not provided",
  "not provided",
  "unknown",
  "none",
  "null",
  "n/a",
  "na",
  "-",
]);

type IndustryStatus = "valid" | "missing" | "placeholder" | "invalid";

type AdminActionFailureContext = {
  action?: string;
  targetEmail?: string | null;
  targetId?: string | null;
  customerId?: string | null;
  industryStatus?: IndustryStatus | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeEmail(value: unknown): string | null {
  const cleaned = cleanString(value)?.toLowerCase() ?? null;
  return cleaned && cleaned.includes("@") ? cleaned : null;
}

function industryStatus(value: unknown): IndustryStatus {
  const cleaned = cleanString(value);
  if (!cleaned) return "missing";
  const normalized = cleaned.toLowerCase();
  if (INDUSTRY_PLACEHOLDER_VALUES.has(normalized)) return "placeholder";
  return VALID_INDUSTRY_CATEGORY_SET.has(cleaned) ? "valid" : "invalid";
}

function normalizeIndustryCategory(value: unknown): IndustryCategory | null {
  const cleaned = cleanString(value);
  return cleaned && industryStatus(cleaned) === "valid"
    ? (cleaned as IndustryCategory)
    : null;
}

function withIndustryIfValid<T extends Record<string, unknown>>(
  payload: T,
  industry: IndustryCategory | null,
): T & { industry?: IndustryCategory } {
  if (!industry) return payload;
  return { ...payload, industry };
}

function customerUpdateForKind(
  accountKind: "client" | "demo",
  industry: IndustryCategory | null,
  rawIndustry: string | null,
) {
  const isDemo = accountKind === "demo";
  const cleanedRawIndustry = cleanString(rawIndustry);
  const rawIndustryWasInvalid = !!cleanedRawIndustry && !normalizeIndustryCategory(cleanedRawIndustry);
  const needsIndustryReview = rawIndustryWasInvalid || !industry;
  return {
    account_kind: accountKind,
    account_kind_notes: isDemo
      ? "Approved as a demo/test account from portal intake. Demo-safe data only."
      : "Approved as a client account from portal intake.",
    is_demo_account: isDemo,
    status: "active",
    lifecycle_state: "lead",
    needs_industry_review: needsIndustryReview,
    industry_confirmed_by_admin: false,
    industry_intake_source: "portal_access_request",
    industry_intake_value: cleanedRawIndustry ?? industry,
    industry_review_notes: rawIndustryWasInvalid
      ? "Portal intake included an unsupported industry value. Review before confirming industry, payment, portal access, or delivery scope."
      : industry
        ? "Industry came from portal intake or an existing customer record. Confirm before enabling industry-specific tools."
        : "Portal intake did not include industry. Review before confirming industry, payment, portal access, or delivery scope.",
    contributes_to_global_learning: !isDemo,
    learning_enabled: !isDemo,
    learning_exclusion_reason: isDemo ? "Demo/test account" : null,
    last_activity_at: new Date().toISOString(),
  };
}

function adminSafeError(
  e: unknown,
  context: AdminActionFailureContext = {},
): {
  message: string;
  status: number;
  code?: string;
  details: Record<string, string | null | undefined>;
} {
  const err = e as { message?: string; code?: string; details?: string; hint?: string };
  const message = err?.message ?? "";
  const details = err?.details ?? "";
  const hint = err?.hint ?? "";
  const combined = `${message} ${details} ${hint}`;
  const safeDetails = {
    action: context.action,
    targetEmail: context.targetEmail,
    targetId: context.targetId,
    customerId: context.customerId,
    industryStatus: context.industryStatus,
    dbCode: err?.code,
    dbMessage: message,
  };

  if (
    err?.code === "42804" ||
    /industry.*industry_category|industry_category.*text|expression is of type text/i.test(combined)
  ) {
    return {
      message:
        "Industry could not be saved because it is not a supported RGS industry category. Leave it blank for admin review or choose a supported category, then retry the approval.",
      status: 400,
      code: err?.code,
      details: safeDetails,
    };
  }

  return {
    message: message || "Unknown error",
    status: 500,
    code: err?.code,
    details: safeDetails,
  };
}

async function getLatestSignupRequestForUser(
  admin: ReturnType<typeof adminClient>,
  userId: string,
): Promise<SignupRequestRow | null> {
  const { data, error } = await admin
    .from("signup_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as SignupRequestRow | null) ?? null;
}

async function ensureCustomerRole(admin: ReturnType<typeof adminClient>, userId: string) {
  const { error } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role: "customer" }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw error;
}

async function clearSignupDenial(admin: ReturnType<typeof adminClient>, userId: string) {
  const { error } = await admin.from("denied_signups").delete().eq("user_id", userId);
  if (error) throw error;
}

async function writeSignupRequestAudit(
  admin: ReturnType<typeof adminClient>,
  args: {
    userId: string;
    email: string;
    fullName: string | null;
    businessName: string | null;
    industry: string | null;
    status: "approved_client" | "approved_demo" | "denied" | "suspended";
    linkedCustomerId: string | null;
    adminUserId: string;
    note?: string | null;
  },
) {
  const { data: existing, error: existingErr } = await admin
    .from("signup_requests")
    .select("*")
    .eq("user_id", args.userId)
    .maybeSingle();
  if (existingErr) throw existingErr;

  const payload = {
    user_id: args.userId,
    email: args.email,
    full_name: args.fullName ?? (existing as SignupRequestRow | null)?.full_name ?? null,
    business_name: args.businessName ?? (existing as SignupRequestRow | null)?.business_name ?? null,
    industry:
      normalizeIndustryCategory(args.industry) ??
      normalizeIndustryCategory((existing as SignupRequestRow | null)?.industry) ??
      null,
    intended_access_type:
      (existing as SignupRequestRow | null)?.intended_access_type ??
      (args.status === "approved_demo" ? "demo_test" : "diagnostic_client"),
    request_status: args.status,
    clarification_note: args.note ?? (existing as SignupRequestRow | null)?.clarification_note ?? null,
    decided_by_admin_id: args.adminUserId,
    decided_at: new Date().toISOString(),
    linked_customer_id: args.linkedCustomerId,
    updated_at: new Date().toISOString(),
  };

  if ((existing as SignupRequestRow | null)?.id) {
    const { error } = await admin
      .from("signup_requests")
      .update(payload)
      .eq("id", (existing as SignupRequestRow).id);
    if (error) throw error;
    return;
  }

  const { error } = await admin.from("signup_requests").insert({
      user_id: args.userId,
      email: args.email,
      full_name: payload.full_name,
      business_name: payload.business_name,
      industry: payload.industry,
      intended_access_type: payload.intended_access_type,
      request_status: payload.request_status,
      clarification_note: payload.clarification_note,
      decided_by_admin_id: payload.decided_by_admin_id,
      decided_at: payload.decided_at,
      linked_customer_id: payload.linked_customer_id,
    });
  if (error) {
    console.warn("admin-account-links: signup request audit upsert failed", {
      userId: args.userId,
      status: args.status,
      error: error.message,
    });
    throw error;
  }
}

async function provisionCustomerForSignup(
  admin: ReturnType<typeof adminClient>,
  args: {
    userId: string;
    email: string;
    fullName: string | null;
    businessName: string | null;
    industry: string | null;
    accountKind: "client" | "demo";
    adminUserId: string;
    source: "signup_request" | "new_signup_queue";
  },
) {
  const cleanEmail = normalizeEmail(args.email);
  if (!cleanEmail) throw new Error("signup email is required");
  const fullName = cleanString(args.fullName) ?? cleanEmail.split("@")[0];
  const businessName = cleanString(args.businessName);
  const rawIndustry = cleanString(args.industry);
  const industry = normalizeIndustryCategory(args.industry);

  const { data: linkedToUser, error: linkedErr } = await admin
    .from("customers")
    .select("id, user_id, account_kind, is_demo_account, business_name, industry")
    .eq("user_id", args.userId)
    .maybeSingle();
  if (linkedErr) throw linkedErr;

  let customerId = (linkedToUser as any)?.id ?? null;
  let created = false;

  if (!customerId) {
    const { data: emailMatches, error: emailErr } = await admin
      .from("customers")
      .select("id, user_id, created_at, business_name, industry")
      .ilike("email", cleanEmail)
      .order("created_at", { ascending: false })
      .limit(2);
    if (emailErr) throw emailErr;
    const matches = (emailMatches ?? []) as any[];
    const alreadyLinkedElsewhere = matches.find((c) => c.user_id && c.user_id !== args.userId);
    if (alreadyLinkedElsewhere) {
      throw new Error(
        "A customer with this email is already linked to another auth user. Resolve the duplicate before approving this signup.",
      );
    }
    const reusable = matches.find((c) => !c.user_id || c.user_id === args.userId);
    if (reusable?.id) {
      customerId = reusable.id;
      const resolvedBusinessName = businessName ?? reusable.business_name ?? null;
      const resolvedIndustry = industry ?? normalizeIndustryCategory(reusable.industry);
      const { error } = await admin
        .from("customers")
        .update(withIndustryIfValid({
          user_id: args.userId,
          full_name: fullName,
          business_name: resolvedBusinessName,
          ...customerUpdateForKind(args.accountKind, resolvedIndustry, rawIndustry),
        }, resolvedIndustry))
        .eq("id", customerId);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await admin
        .from("customers")
        .insert(withIndustryIfValid({
          full_name: fullName,
          email: cleanEmail,
          business_name: businessName,
          user_id: args.userId,
          stage: "lead",
          payment_status: "unpaid",
          ...customerUpdateForKind(args.accountKind, industry, rawIndustry),
        }, industry))
        .select("*")
        .single();
      if (error) throw error;
      customerId = inserted.id;
      created = true;
    }
  } else {
    const linkedCustomer = linkedToUser as any;
    const resolvedBusinessName = businessName ?? linkedCustomer.business_name ?? null;
    const resolvedIndustry = industry ?? normalizeIndustryCategory(linkedCustomer.industry);
    const { error } = await admin
      .from("customers")
      .update(withIndustryIfValid({
        full_name: fullName,
        business_name: resolvedBusinessName,
        ...customerUpdateForKind(args.accountKind, resolvedIndustry, rawIndustry),
      }, resolvedIndustry))
      .eq("id", customerId);
    if (error) throw error;
  }

  await ensureCustomerRole(admin, args.userId);
  await clearSignupDenial(admin, args.userId);

  await writeSignupRequestAudit(admin, {
    userId: args.userId,
    email: cleanEmail,
    fullName,
    businessName,
    industry: rawIndustry ?? industry,
    status: args.accountKind === "demo" ? "approved_demo" : "approved_client",
    linkedCustomerId: customerId,
    adminUserId: args.adminUserId,
  });

  await admin.from("customer_timeline").insert({
    customer_id: customerId,
    event_type: created ? "customer_created" : "client_account_linked",
    title:
      args.accountKind === "demo"
        ? created
          ? "Demo account provisioned"
          : "Demo account linked"
        : created
          ? "Client account provisioned"
          : "Client account linked",
    detail:
      args.source === "signup_request"
        ? "Resolved from Portal Access Request review."
        : "Resolved from New Signups queue.",
    actor_id: args.adminUserId,
  });

  const { data, error } = await admin.from("customers").select("*").eq("id", customerId).single();
  if (error) throw error;
  return { customer: data, customerId, created };
}

async function listAuthUsers(admin: ReturnType<typeof adminClient>): Promise<AuthUserRow[]> {
  // 1000 is plenty for this admin onboarding surface. If the project grows
  // beyond that, page this helper rather than exposing auth.users via SQL RPC.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const users = data.users ?? [];
  const ids = users.map((u) => u.id);
  let profiles: any[] = [];
  if (ids.length) {
    const { data: prof, error: profErr } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    if (profErr) throw profErr;
    profiles = prof ?? [];
  }
  const pMap = new Map(profiles.map((p) => [p.id, p]));
  return users.map((u) => {
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    return {
      user_id: u.id,
      email: u.email ?? "",
      full_name:
        (pMap.get(u.id)?.full_name as string | null | undefined) ??
        (typeof meta.full_name === "string" ? meta.full_name : null) ??
        null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let failureContext: AdminActionFailureContext = {};

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    failureContext.action = action;
    const admin = adminClient();

    if (action === "list_unlinked_signups") {
      const [users, customersRes, deniedRes, requestRes] = await Promise.all([
        listAuthUsers(admin),
        admin.from("customers").select("user_id").not("user_id", "is", null),
        admin.from("denied_signups").select("user_id"),
        admin
          .from("signup_requests")
          .select("user_id, request_status")
          .in("request_status", ["pending_review", "clarification_requested", "denied", "suspended"]),
      ]);
      if (customersRes.error) throw customersRes.error;
      if (deniedRes.error) throw deniedRes.error;
      if (requestRes.error) throw requestRes.error;
      const linked = new Set(((customersRes.data ?? []) as any[]).map((c) => c.user_id).filter(Boolean));
      const denied = new Set(((deniedRes.data ?? []) as any[]).map((d) => d.user_id).filter(Boolean));
      const unresolvedRequests = new Set(((requestRes.data ?? []) as any[]).map((r) => r.user_id).filter(Boolean));
      const result = users
        .filter((u) => u.email && !linked.has(u.user_id) && !denied.has(u.user_id) && !unresolvedRequests.has(u.user_id))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return json({ result });
    }

    if (action === "list_auth_users_for_link") {
      const search = String(body.search ?? "").toLowerCase().trim();
      const [users, customersRes] = await Promise.all([
        listAuthUsers(admin),
        admin.from("customers").select("id, user_id").not("user_id", "is", null),
      ]);
      if (customersRes.error) throw customersRes.error;
      const linkedMap = new Map(((customersRes.data ?? []) as any[]).map((c) => [c.user_id, c.id]));
      const result = users
        .map((u) => ({
          ...u,
          linked_customer_id: (linkedMap.get(u.user_id) as string | undefined) ?? null,
        }))
        .filter((u) => {
          if (!search) return true;
          return (
            u.email.toLowerCase().includes(search) ||
            (u.full_name ?? "").toLowerCase().includes(search)
          );
        })
        .slice(0, 50);
      return json({ result });
    }

    if (action === "repair_customer_links") {
      const [users, customersRes] = await Promise.all([
        listAuthUsers(admin),
        admin
          .from("customers")
          .select("id, email, user_id, account_kind, is_demo_account, full_name, business_name, industry")
          .is("user_id", null)
          .not("email", "is", null),
      ]);
      if (customersRes.error) throw customersRes.error;
      const emailUsers = new Map<string, AuthUserRow[]>();
      for (const u of users) {
        const key = u.email.toLowerCase();
        emailUsers.set(key, [...(emailUsers.get(key) ?? []), u]);
      }
      let linked_count = 0;
      let ambiguous_count = 0;
      for (const c of ((customersRes.data ?? []) as any[])) {
        const matches = emailUsers.get(String(c.email ?? "").toLowerCase()) ?? [];
        if (matches.length === 1) {
          const userId = matches[0].user_id;
          const { data: existing } = await admin
            .from("customers")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();
          if (existing?.id) continue;
          const { error } = await admin
            .from("customers")
            .update({ user_id: userId, last_activity_at: new Date().toISOString() })
            .eq("id", c.id);
          if (error) throw error;
          await ensureCustomerRole(admin, userId);
          await clearSignupDenial(admin, userId);
          await writeSignupRequestAudit(admin, {
            userId,
            email: String(c.email).toLowerCase(),
            fullName: c.full_name ?? null,
            businessName: c.business_name ?? null,
            industry: c.industry ?? null,
            status: c.account_kind === "demo" || c.is_demo_account ? "approved_demo" : "approved_client",
            linkedCustomerId: c.id,
            adminUserId: auth.userId,
          });
          await admin.from("customer_timeline").insert({
            customer_id: c.id,
            event_type: "client_account_auto_linked",
            title: "Auto-linked by email match",
            detail: `Auto-linked to auth user ${userId}`,
            actor_id: auth.userId,
          });
          linked_count += 1;
        } else if (matches.length > 1) {
          ambiguous_count += 1;
        }
      }
      return json({ result: { linked_count, ambiguous_count } });
    }

    if (action === "create_customer_from_signup") {
      const userId = String(body.user_id ?? "");
      if (!userId) return json({ error: "user_id required" }, 400);
      const { data: existing } = await admin.from("customers").select("id").eq("user_id", userId).maybeSingle();
      if (existing?.id) return json({ error: "user already linked to a customer" }, 409);
      const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
      if (userErr || !userRes?.user?.email) return json({ error: "auth user not found" }, 404);
      const meta = (userRes.user.user_metadata ?? {}) as Record<string, unknown>;
      const reqRow = await getLatestSignupRequestForUser(admin, userId);
      failureContext = {
        action,
        targetId: userId,
        targetEmail: userRes.user.email,
        industryStatus: industryStatus(reqRow?.industry),
      };
      const fullName =
        cleanString(reqRow?.full_name) ??
        cleanString(meta.full_name) ??
        cleanString(meta.name) ??
        userRes.user.email.split("@")[0];
      const provisioned = await provisionCustomerForSignup(admin, {
        userId,
        email: userRes.user.email,
        fullName,
        businessName: reqRow?.business_name ?? null,
        industry: reqRow?.industry ?? null,
        accountKind: reqRow?.intended_access_type === "demo_test" ? "demo" : "client",
        adminUserId: auth.userId,
        source: "new_signup_queue",
      });
      return json({ result: provisioned.customer });
    }

    if (action === "link_signup_to_customer" || action === "set_customer_user_link") {
      const customerId = String(body.customer_id ?? "");
      const rawUserId = body.user_id === null || body.user_id === undefined ? null : String(body.user_id);
      const force = Boolean(body.force);
      if (!customerId) return json({ error: "customer_id required" }, 400);
      failureContext = { action, targetId: rawUserId, customerId };

      if (rawUserId === null) {
        const { data, error } = await admin
          .from("customers")
          .update({ user_id: null, last_activity_at: new Date().toISOString() })
          .eq("id", customerId)
          .select("*")
          .single();
        if (error) throw error;
        await admin.from("customer_timeline").insert({
          customer_id: customerId,
          event_type: "account_unlinked",
          title: "Account unlinked",
          detail: null,
          actor_id: auth.userId,
        });
        return json({ result: data });
      }

      const { data: existingOther } = await admin
        .from("customers")
        .select("id")
        .eq("user_id", rawUserId)
        .neq("id", customerId)
        .maybeSingle();
      if (existingOther?.id && !force) {
        return json({ error: `auth user is already linked to another customer (${existingOther.id})` }, 409);
      }
      if (existingOther?.id && force) {
        await admin.from("customers").update({ user_id: null }).eq("id", existingOther.id);
        await admin.from("customer_timeline").insert({
          customer_id: existingOther.id,
          event_type: "account_unlinked",
          title: "Account unlinked (relinked elsewhere)",
          detail: null,
          actor_id: auth.userId,
        });
      }
      const { data, error } = await admin
        .from("customers")
        .update({ user_id: rawUserId, last_activity_at: new Date().toISOString(), status: "active" })
        .eq("id", customerId)
        .select("*")
        .single();
      if (error) throw error;
      const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(rawUserId);
      if (userErr || !userRes?.user?.email) return json({ error: "auth user not found" }, 404);
      failureContext = {
        action,
        targetId: rawUserId,
        targetEmail: userRes.user.email,
        customerId,
        industryStatus: industryStatus(data.industry),
      };
      await ensureCustomerRole(admin, rawUserId);
      await clearSignupDenial(admin, rawUserId);
      await writeSignupRequestAudit(admin, {
        userId: rawUserId,
        email: userRes.user.email,
        fullName: data.full_name ?? null,
        businessName: data.business_name ?? null,
        industry: data.industry ?? null,
        status: data.account_kind === "demo" || data.is_demo_account ? "approved_demo" : "approved_client",
        linkedCustomerId: customerId,
        adminUserId: auth.userId,
      });
      await admin.from("customer_timeline").insert({
        customer_id: customerId,
        event_type: "client_account_linked",
        title: "Account linked",
        detail: `Linked to auth user ${rawUserId}`,
        actor_id: auth.userId,
      });
      return json({ result: data });
    }

    if (action === "deny_signup") {
      const userId = String(body.user_id ?? "");
      if (!userId) return json({ error: "user_id required" }, 400);
      const reason = body.reason === undefined || body.reason === null ? null : String(body.reason);
      const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
      if (userErr || !userRes?.user?.email) return json({ error: "auth user not found" }, 404);
      const { error } = await admin.from("denied_signups").upsert({
        user_id: userId,
        email: userRes.user.email,
        denied_by: auth.userId,
        denied_at: new Date().toISOString(),
        reason,
      });
      if (error) throw error;
      const reqRow = await getLatestSignupRequestForUser(admin, userId);
      await writeSignupRequestAudit(admin, {
        userId,
        email: userRes.user.email,
        fullName: reqRow?.full_name ?? null,
        businessName: reqRow?.business_name ?? null,
        industry: reqRow?.industry ?? null,
        status: "denied",
        linkedCustomerId: reqRow?.linked_customer_id ?? null,
        adminUserId: auth.userId,
        note: reason,
      });
      return json({ result: null });
    }

    if (action === "undeny_signup") {
      const userId = String(body.user_id ?? "");
      if (!userId) return json({ error: "user_id required" }, 400);
      const { error } = await admin.from("denied_signups").delete().eq("user_id", userId);
      if (error) throw error;
      return json({ result: null });
    }

    if (action === "list_signup_requests") {
      const { data, error } = await admin
        .from("signup_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return json({ result: data ?? [] });
    }

    if (action === "decide_signup_request") {
      const requestId = String(body.request_id ?? "");
      const decision = String(body.decision ?? "");
      if (!requestId) return json({ error: "request_id required" }, 400);
      const allowed = ["approve_as_client", "approve_as_demo", "deny", "suspend", "request_clarification"];
      if (!allowed.includes(decision)) return json({ error: "invalid decision" }, 400);
      const { data: request, error: requestErr } = await admin
        .from("signup_requests")
        .select("*")
        .eq("id", requestId)
        .single();
      if (requestErr || !request) return json({ error: "signup request not found" }, 404);
      // For demo approvals, default to the Prairie Ridge HVAC demo identity
      // unless the admin explicitly overrode business name/industry.
      const overrideBusiness =
        decision === "approve_as_demo"
          ? body.override_business_name ?? P83B_DEMO_BUSINESS_NAME
          : (body.override_business_name ?? null);
      const overrideIndustry =
        decision === "approve_as_demo"
          ? body.override_industry ?? P83B_DEMO_INDUSTRY
          : (body.override_industry ?? null);
      const requestIndustry = cleanString(overrideIndustry) ?? (request as SignupRequestRow).industry;
      failureContext = {
        action,
        targetId: (request as SignupRequestRow).user_id,
        targetEmail: (request as SignupRequestRow).email,
        industryStatus: industryStatus(requestIndustry),
      };

      let linkedCustomerId: string | null = null;
      let data: any = null;
      const note = body.clarification_note === undefined || body.clarification_note === null
        ? null
        : String(body.clarification_note);

      if (decision === "approve_as_client" || decision === "approve_as_demo") {
        const accountKind = decision === "approve_as_demo" ? "demo" : "client";
        const provisioned = await provisionCustomerForSignup(admin, {
          userId: (request as SignupRequestRow).user_id,
          email: (request as SignupRequestRow).email,
          fullName: (request as SignupRequestRow).full_name,
          businessName: cleanString(overrideBusiness) ?? (request as SignupRequestRow).business_name,
          industry: requestIndustry,
          accountKind,
          adminUserId: auth.userId,
          source: "signup_request",
        });
        linkedCustomerId = provisioned.customerId;
      } else if (decision === "deny" || decision === "suspend") {
        const { error } = await admin.from("denied_signups").upsert({
          user_id: (request as SignupRequestRow).user_id,
          email: (request as SignupRequestRow).email,
          denied_by: auth.userId,
          denied_at: new Date().toISOString(),
          reason: note ?? `${decision} via signup request review`,
        });
        if (error) throw error;
        linkedCustomerId = (request as SignupRequestRow).linked_customer_id;
        if (linkedCustomerId) {
          const { error: suspendErr } = await admin
            .from("customers")
            .update({
              status: decision === "suspend" ? "suspended" : "inactive",
              portal_unlocked: false,
              last_activity_at: new Date().toISOString(),
            })
            .eq("id", linkedCustomerId);
          if (suspendErr) throw suspendErr;
        }
      }

      if (decision === "request_clarification") {
        const { error } = await admin
          .from("signup_requests")
          .update({
            request_status: "clarification_requested",
            clarification_note: note,
            decided_by_admin_id: auth.userId,
            decided_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);
        if (error) throw error;
      } else {
        const newStatus =
          decision === "approve_as_demo"
            ? "approved_demo"
            : decision === "approve_as_client"
              ? "approved_client"
              : decision === "deny"
                ? "denied"
                : "suspended";
        const { error } = await admin
          .from("signup_requests")
          .update({
            request_status: newStatus,
            clarification_note: decision === "deny" || decision === "suspend" ? note : (request as SignupRequestRow).clarification_note,
            decided_by_admin_id: auth.userId,
            decided_at: new Date().toISOString(),
            linked_customer_id: linkedCustomerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);
        if (error) throw error;
      }

      const { data: refreshed, error: refreshErr } = await admin
        .from("signup_requests")
        .select("*")
        .eq("id", requestId)
        .single();
      if (refreshErr) throw refreshErr;
      data = refreshed;

      // P83B — auto-seed the Prairie Ridge HVAC demo workspace immediately
      // after a demo approval so testers don't enter an empty portal.
      let demoSeed: { ok: boolean; errors: string[] } | null = null;
      if (decision === "approve_as_demo" && linkedCustomerId) {
        demoSeed = await seedPrairieRidgeDemoWorkspace(admin, linkedCustomerId);
      }
      await admin.from("admin_notifications").insert({
        kind: "signup_request_decided",
        customer_id: linkedCustomerId,
        email: (request as SignupRequestRow).email,
        business_name: (data as SignupRequestRow).business_name,
        message: `Signup request ${String((data as SignupRequestRow).request_status).replace(/_/g, " ")} for ${(request as SignupRequestRow).email}`,
        priority: "normal",
        metadata: {
          signup_request_id: requestId,
          decision,
          new_status: (data as SignupRequestRow).request_status,
          admin_id: auth.userId,
        },
      });
      return json({ result: data, demo_seed: demoSeed });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const safe = adminSafeError(e, failureContext);
    console.error("admin-account-links error", {
      code: safe.code,
      message: e instanceof Error ? e.message : safe.message,
      action: safe.details.action,
      targetEmail: safe.details.targetEmail,
      targetId: safe.details.targetId,
      customerId: safe.details.customerId,
      industryStatus: safe.details.industryStatus,
    });
    return json({ error: safe.message, code: safe.code, details: safe.details }, safe.status);
  }
});
