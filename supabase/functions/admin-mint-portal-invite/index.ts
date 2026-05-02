// Admin-only. Promotes a paid diagnostic intake into a customer record (if
// not already linked) and mints a one-time invite token. Returns the raw
// token in the response so the admin can copy/share it. Best-effort email
// send is attempted only if email infrastructure is configured (no-op
// otherwise so the admin flow never blocks).
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
  intakeId: z.string().uuid(),
  appBaseUrl: z.string().url().max(500),
  expiresInHours: z.number().int().min(1).max(720).default(168),
});

function randomToken(byteLen = 32): string {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  // base64url
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { intakeId, appBaseUrl, expiresInHours } = parsed.data;
    const admin = getAdminClient();

    // Load intake.
    const { data: intake, error: intakeError } = await admin
      .from("diagnostic_intakes")
      .select("id, email, full_name, business_name, customer_id, intake_status")
      .eq("id", intakeId)
      .maybeSingle();
    if (intakeError || !intake) {
      return new Response(JSON.stringify({ error: "intake_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm at least one paid order exists for this intake.
    const { data: paidOrders } = await admin
      .from("diagnostic_orders")
      .select("id, status")
      .eq("intake_id", intakeId)
      .eq("status", "paid")
      .limit(1);
    if (!paidOrders || paidOrders.length === 0) {
      return new Response(JSON.stringify({ error: "no_paid_order" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const orderId = paidOrders[0].id as string;

    // Ensure a customer record exists. Reuse existing if email matches an
    // unlinked, non-archived customer; otherwise create a new one.
    let customerId = intake.customer_id as string | null;
    if (!customerId) {
      const { data: existing } = await admin
        .from("customers")
        .select("id")
        .ilike("email", intake.email)
        .is("archived_at", null)
        .limit(1);
      if (existing && existing.length > 0) {
        customerId = existing[0].id as string;
      } else {
        const { data: created, error: createError } = await admin
          .from("customers")
          .insert({
            full_name: intake.full_name,
            email: intake.email,
            business_name: intake.business_name,
            stage: "diagnostic_paid",
            payment_status: "paid",
            diagnostic_payment_status: "paid",
            diagnostic_paid_at: new Date().toISOString(),
            package_diagnostic: true,
            lifecycle_state: "diagnostic",
            account_kind: "client",
            needs_industry_review: true,
          })
          .select("id")
          .single();
        if (createError || !created) {
          console.error("customer create failed", createError);
          return new Response(JSON.stringify({ error: "customer_create_failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        customerId = created.id as string;
      }
      await admin
        .from("diagnostic_intakes")
        .update({ customer_id: customerId })
        .eq("id", intakeId);
      await admin
        .from("diagnostic_orders")
        .update({ customer_id: customerId })
        .eq("id", orderId);
    }

    // Mint token.
    const rawToken = randomToken(32);
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();

    const { data: invite, error: inviteError } = await admin
      .from("portal_invites")
      .insert({
        customer_id: customerId,
        intake_id: intakeId,
        order_id: orderId,
        email: intake.email,
        token_hash: tokenHash,
        expires_at: expiresAt,
        last_sent_at: new Date().toISOString(),
        send_count: 1,
        created_by: auth.userId,
      })
      .select("id, expires_at")
      .single();
    if (inviteError || !invite) {
      console.error("invite insert failed", inviteError);
      return new Response(JSON.stringify({ error: "invite_create_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("diagnostic_intakes")
      .update({ intake_status: "invite_sent" })
      .eq("id", intakeId);

    const inviteUrl = `${appBaseUrl.replace(/\/$/, "")}/claim-invite?token=${rawToken}`;

    // Best-effort email: only attempt if a Resend key is configured. No-op otherwise.
    let emailStatus: "sent" | "skipped" | "failed" = "skipped";
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromAddress = Deno.env.get("INVITE_EMAIL_FROM");
    if (resendKey && fromAddress) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [intake.email],
            subject: "Your RGS Business Diagnostic — portal access",
            html: `<p>Hi ${intake.full_name?.split(" ")[0] ?? "there"},</p>
              <p>Thank you for purchasing the RGS Business Diagnostic. Use the secure link below to create your portal account. The link is single-use and expires in ${Math.round(expiresInHours / 24)} days.</p>
              <p><a href="${inviteUrl}">${inviteUrl}</a></p>
              <p>— Revenue and Growth Systems</p>`,
          }),
        });
        emailStatus = r.ok ? "sent" : "failed";
        if (!r.ok) console.warn("resend send failed", await r.text());
      } catch (e) {
        console.warn("resend send threw", e);
        emailStatus = "failed";
      }
    }

    return new Response(
      JSON.stringify({
        inviteId: invite.id,
        customerId,
        inviteUrl,
        expiresAt: invite.expires_at,
        emailStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("admin-mint-portal-invite error", e);
    return new Response(JSON.stringify({ error: "mint_invite_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});