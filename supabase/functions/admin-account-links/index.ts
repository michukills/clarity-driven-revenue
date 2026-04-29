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

  try {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const admin = adminClient();

    if (action === "list_unlinked_signups") {
      const [users, customersRes, deniedRes] = await Promise.all([
        listAuthUsers(admin),
        admin.from("customers").select("user_id").not("user_id", "is", null),
        admin.from("denied_signups").select("user_id"),
      ]);
      if (customersRes.error) throw customersRes.error;
      if (deniedRes.error) throw deniedRes.error;
      const linked = new Set(((customersRes.data ?? []) as any[]).map((c) => c.user_id).filter(Boolean));
      const denied = new Set(((deniedRes.data ?? []) as any[]).map((d) => d.user_id).filter(Boolean));
      const result = users
        .filter((u) => u.email && !linked.has(u.user_id) && !denied.has(u.user_id))
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
          .select("id, email, user_id")
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
          await admin.from("customer_timeline").insert({
            customer_id: c.id,
            event_type: "account_linked",
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
      const fullName =
        (typeof meta.full_name === "string" && meta.full_name.trim()) ||
        userRes.user.email.split("@")[0];
      const { data, error } = await admin
        .from("customers")
        .insert({
          full_name: fullName,
          email: userRes.user.email,
          user_id: userId,
          stage: "lead",
          status: "active",
          payment_status: "unpaid",
        })
        .select("*")
        .single();
      if (error) throw error;
      await admin.from("customer_timeline").insert({
        customer_id: data.id,
        event_type: "customer_created",
        title: "Customer record created from signup",
        detail: `Auto-created from auth user ${userId}`,
        actor_id: auth.userId,
      });
      return json({ result: data });
    }

    if (action === "link_signup_to_customer" || action === "set_customer_user_link") {
      const customerId = String(body.customer_id ?? "");
      const rawUserId = body.user_id === null || body.user_id === undefined ? null : String(body.user_id);
      const force = Boolean(body.force);
      if (!customerId) return json({ error: "customer_id required" }, 400);

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
        .update({ user_id: rawUserId, last_activity_at: new Date().toISOString() })
        .eq("id", customerId)
        .select("*")
        .single();
      if (error) throw error;
      await admin.from("customer_timeline").insert({
        customer_id: customerId,
        event_type: "account_linked",
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
      return json({ result: null });
    }

    if (action === "undeny_signup") {
      const userId = String(body.user_id ?? "");
      if (!userId) return json({ error: "user_id required" }, 400);
      const { error } = await admin.from("denied_signups").delete().eq("user_id", userId);
      if (error) throw error;
      return json({ result: null });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-account-links error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
