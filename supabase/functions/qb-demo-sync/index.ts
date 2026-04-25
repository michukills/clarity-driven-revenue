/**
 * P14 — Admin-triggered demo sync for QuickBooks sandbox plumbing.
 *
 * Inserts representative `quickbooks_webhook_events` (signature_valid=true,
 * source label = "demo") and queues matching `quickbooks_sync_jobs`. Clearly
 * labeled as Demo / Sandbox Data — never presented as real client financial
 * data. Admin-only.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEMO_REALM = "DEMO-SANDBOX-0000";
const DEMO_ENTITIES: Array<{ name: string; id: string; operation: string }> = [
  { name: "Customer", id: "demo-customer-1001", operation: "Create" },
  { name: "Invoice", id: "demo-invoice-2001", operation: "Update" },
  { name: "Payment", id: "demo-payment-3001", operation: "Create" },
  { name: "Account", id: "demo-account-4001", operation: "Update" },
  { name: "Purchase", id: "demo-purchase-5001", operation: "Create" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isAdmin = (roles ?? []).some((r) =>
    r.role === "admin" || r.role === "platform_owner",
  );
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const now = new Date().toISOString();
  const eventRows = DEMO_ENTITIES.map((e) => ({
    realm_id: DEMO_REALM,
    event_type: "demoDataChangeEvent",
    entity_name: e.name,
    entity_id: e.id,
    operation: e.operation,
    raw_payload: {
      demo: true,
      label: "Demo / Sandbox Data",
      entity: e,
      generated_at: now,
    },
    signature_valid: true,
    processing_status: "received",
  }));

  const jobRows = DEMO_ENTITIES.map((e) => ({
    realm_id: DEMO_REALM,
    entity_name: e.name,
    entity_id: e.id,
    operation: e.operation,
    status: "queued",
    source: "demo",
  }));

  const { error: e1 } = await admin.from("quickbooks_webhook_events").insert(eventRows);
  if (e1) return json({ error: e1.message }, 500);
  const { error: e2 } = await admin.from("quickbooks_sync_jobs").insert(jobRows);
  if (e2) return json({ error: e2.message }, 500);

  return json({
    ok: true,
    label: "Demo / Sandbox Data",
    note: "This demo uses QuickBooks sandbox data to demonstrate live accounting data-sync capability.",
    events_logged: eventRows.length,
    jobs_queued: jobRows.length,
    realm_id: DEMO_REALM,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
