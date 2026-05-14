// P93F-Closeout — Admin-only server-side customer cleanup.
//
// Replaces the previous client-side cascade-delete on the admin customer
// detail page with a single audited, admin-gated server action.
//
// Supports three actions:
//   - "archive": sets customers.archived_at = now(), revokes portal access,
//     leaves history/audit/payments intact. Safe for real clients.
//   - "restore": clears customers.archived_at. Safe to undo an archive.
//   - "delete":  hard-deletes the customer row + cascade tables. Real-client
//     deletion requires an explicit `forceRealClientDelete: true` flag.
//
// Every attempt (success and failure) is recorded in
// public.customer_cleanup_audit. The frontend never gets a service-role key.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  customerId: z.string().uuid(),
  action: z.enum(["archive", "restore", "delete"]),
  confirmEmail: z.string().email().optional(),
  forceRealClientDelete: z.boolean().optional().default(false),
  reason: z.string().max(500).optional(),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

const CASCADE_TABLES = [
  "resource_assignments",
  "customer_notes",
  "customer_tasks",
  "checklist_items",
  "customer_timeline",
  "customer_uploads",
] as const;

async function logAudit(args: {
  supa: ReturnType<typeof admin>;
  action: "archive" | "restore" | "delete";
  customerId: string | null;
  email: string | null;
  fullName: string | null;
  businessName: string | null;
  isDemo: boolean | null;
  isRealClient: boolean | null;
  performedBy: string | null;
  performerEmail: string | null;
  reason: string | null;
  success: boolean;
  errorMessage: string | null;
}) {
  try {
    await args.supa.from("customer_cleanup_audit").insert({
      action: args.action,
      customer_id: args.customerId,
      target_email: args.email,
      target_full_name: args.fullName,
      target_business_name: args.businessName,
      was_demo_account: args.isDemo,
      was_real_client: args.isRealClient,
      performed_by: args.performedBy,
      performer_email: args.performerEmail,
      reason: args.reason,
      success: args.success,
      error_message: args.errorMessage,
    });
  } catch (_err) {
    // Audit best-effort; never blocks the action result.
  }
}

function isRealClientHeuristic(c: {
  is_demo_account: boolean | null;
  payment_status: string | null;
  portal_unlocked: boolean | null;
}): boolean {
  if (c.is_demo_account === true) return false;
  if (c.payment_status === "paid") return true;
  if (c.portal_unlocked === true) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response;

  let parsed;
  try {
    parsed = BodySchema.safeParse(await req.json());
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  const { customerId, action, confirmEmail, forceRealClientDelete, reason } =
    parsed.data;

  const supa = admin();

  // Fetch performer email for audit (best effort).
  let performerEmail: string | null = null;
  try {
    const { data: u } = await supa.auth.admin.getUserById(auth.userId);
    performerEmail = u?.user?.email ?? null;
  } catch {
    /* ignore */
  }

  const { data: customer, error: fetchErr } = await supa
    .from("customers")
    .select(
      "id, email, full_name, business_name, is_demo_account, payment_status, portal_unlocked, archived_at",
    )
    .eq("id", customerId)
    .maybeSingle();

  if (fetchErr) {
    return jsonResponse({ error: fetchErr.message }, 500);
  }
  if (!customer) {
    return jsonResponse({ error: "Customer not found" }, 404);
  }

  const targetEmail = (customer.email ?? "").trim().toLowerCase();
  const isRealClient = isRealClientHeuristic(customer as never);

  // Confirm-email gate (delete + archive of real clients require the typed
  // email to match the row's email). Restore does not require it.
  const requiresEmailConfirm =
    action === "delete" || (action === "archive" && isRealClient);
  if (requiresEmailConfirm) {
    if (!targetEmail) {
      const msg = "Account has no email on file; cannot confirm via this flow";
      await logAudit({
        supa, action, customerId, email: null,
        fullName: customer.full_name ?? null,
        businessName: customer.business_name ?? null,
        isDemo: customer.is_demo_account ?? null,
        isRealClient, performedBy: auth.userId,
        performerEmail, reason: reason ?? null,
        success: false, errorMessage: msg,
      });
      return jsonResponse({ error: msg }, 400);
    }
    if (
      !confirmEmail ||
      confirmEmail.trim().toLowerCase() !== targetEmail
    ) {
      const msg = "Confirmation email does not match target account";
      await logAudit({
        supa, action, customerId, email: targetEmail,
        fullName: customer.full_name ?? null,
        businessName: customer.business_name ?? null,
        isDemo: customer.is_demo_account ?? null,
        isRealClient, performedBy: auth.userId,
        performerEmail, reason: reason ?? null,
        success: false, errorMessage: msg,
      });
      return jsonResponse({ error: msg }, 400);
    }
  }

  // Real-client hard-delete guardrail.
  if (action === "delete" && isRealClient && !forceRealClientDelete) {
    const msg =
      "Refusing to delete a real client account. Archive instead, or pass forceRealClientDelete: true.";
    await logAudit({
      supa, action, customerId, email: targetEmail || null,
      fullName: customer.full_name ?? null,
      businessName: customer.business_name ?? null,
      isDemo: customer.is_demo_account ?? null,
      isRealClient, performedBy: auth.userId,
      performerEmail, reason: reason ?? null,
      success: false, errorMessage: msg,
    });
    return jsonResponse({ error: msg, code: "real_client_blocked" }, 409);
  }

  try {
    if (action === "archive") {
      const { error } = await supa
        .from("customers")
        .update({
          archived_at: new Date().toISOString(),
          portal_unlocked: false,
        } as never)
        .eq("id", customerId);
      if (error) throw new Error(error.message);
    } else if (action === "restore") {
      const { error } = await supa
        .from("customers")
        .update({ archived_at: null } as never)
        .eq("id", customerId);
      if (error) throw new Error(error.message);
    } else {
      // delete
      for (const t of CASCADE_TABLES) {
        const { error } = await supa.from(t).delete().eq("customer_id", customerId);
        if (error) throw new Error(`${t}: ${error.message}`);
      }
      const { error } = await supa.from("customers").delete().eq("id", customerId);
      if (error) throw new Error(error.message);
    }
  } catch (err: any) {
    const msg = err?.message ?? "Cleanup failed";
    await logAudit({
      supa, action, customerId, email: targetEmail || null,
      fullName: customer.full_name ?? null,
      businessName: customer.business_name ?? null,
      isDemo: customer.is_demo_account ?? null,
      isRealClient, performedBy: auth.userId,
      performerEmail, reason: reason ?? null,
      success: false, errorMessage: msg,
    });
    return jsonResponse({ error: msg }, 500);
  }

  await logAudit({
    supa, action, customerId, email: targetEmail || null,
    fullName: customer.full_name ?? null,
    businessName: customer.business_name ?? null,
    isDemo: customer.is_demo_account ?? null,
    isRealClient, performedBy: auth.userId,
    performerEmail, reason: reason ?? null,
    success: true, errorMessage: null,
  });

  return jsonResponse({ ok: true, action, customerId });
});