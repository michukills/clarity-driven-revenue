// Public edge function that lets the frontend request an owner/admin alert
// for a small allow-listed set of events. The function NEVER trusts the
// caller for the event content — it re-reads the underlying record from
// the database (using the service role) and only sends an email when the
// record's state matches the event. This prevents anyone from triggering
// arbitrary admin emails.
//
// All sends are best-effort: failures never block the caller's flow.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { sendAdminEmail } from "../_shared/admin-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  event: z.enum(["intake_needs_review", "portal_invite_accepted"]),
  intakeId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { event, intakeId, customerId } = parsed.data;
    const supa = admin();

    if (event === "intake_needs_review") {
      if (!intakeId) return ok({ skipped: "missing_intake" });
      const { data: i } = await supa
        .from("diagnostic_intakes")
        .select("id, full_name, business_name, email, fit_status, intake_status")
        .eq("id", intakeId)
        .maybeSingle();
      if (!i || i.fit_status !== "needs_review") return ok({ skipped: "state_mismatch" });

      // Idempotency: only one notification per intake for this event.
      const { data: existing } = await supa
        .from("admin_notifications")
        .select("id")
        .eq("kind", "intake_needs_review")
        .eq("intake_id", intakeId)
        .limit(1);
      if (existing && existing.length > 0) return ok({ skipped: "already_notified" });

      const { data: notif } = await supa
        .from("admin_notifications")
        .insert({
          kind: "intake_needs_review",
          intake_id: intakeId,
          email: i.email,
          business_name: i.business_name,
          payment_lane: "public_non_client",
          priority: "normal",
          message: "New diagnostic intake needs RGS fit review.",
          next_action: "Open /admin/diagnostic-orders and review the intake",
          email_status: "pending",
        })
        .select("id")
        .maybeSingle();

      const status = await sendAdminEmail({
        event: "intake_needs_review",
        notificationId: (notif?.id as string | undefined) ?? null,
        fields: {
          businessName: i.business_name as string | null,
          clientName: i.full_name as string | null,
          clientEmail: i.email as string | null,
          paymentLane: "public_non_client",
          intakeStatus: i.intake_status as string | null,
          nextAction: "Open /admin/diagnostic-orders and review fit",
          adminLink: "/admin/diagnostic-orders",
        },
      });
      return ok({ status });
    }

    if (event === "portal_invite_accepted") {
      if (!customerId) return ok({ skipped: "missing_customer" });
      const { data: c } = await supa
        .from("customers")
        .select("id, full_name, business_name, email, user_id")
        .eq("id", customerId)
        .maybeSingle();
      if (!c || !c.user_id) return ok({ skipped: "state_mismatch" });

      const { data: existing } = await supa
        .from("admin_notifications")
        .select("id")
        .eq("kind", "portal_invite_accepted")
        .eq("customer_id", customerId)
        .limit(1);
      if (existing && existing.length > 0) return ok({ skipped: "already_notified" });

      const { data: notif } = await supa
        .from("admin_notifications")
        .insert({
          kind: "portal_invite_accepted",
          customer_id: customerId,
          email: c.email,
          business_name: c.business_name,
          payment_lane: "public_non_client",
          priority: "normal",
          message: "Client claimed their RGS portal invite and created an account.",
          next_action: "Confirm tool assignments in /admin/payments",
          email_status: "pending",
        })
        .select("id")
        .maybeSingle();

      const status = await sendAdminEmail({
        event: "portal_invite_accepted",
        notificationId: (notif?.id as string | undefined) ?? null,
        fields: {
          businessName: c.business_name as string | null,
          clientName: c.full_name as string | null,
          clientEmail: c.email as string | null,
          paymentLane: "public_non_client",
          intakeStatus: "invite_accepted",
          nextAction: "Confirm tool assignments and next-step coordination",
          adminLink: "/admin/payments",
        },
      });
      return ok({ status });
    }

    return ok({ skipped: "unknown_event" });
  } catch (e) {
    console.error("notify-admin-event error", e);
    // Best-effort: never bubble up failures.
    return new Response(JSON.stringify({ status: "error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});