// Public edge function. Creates a Stripe Embedded Checkout session for the
// $3,000 RGS Business Diagnostic and records a pending diagnostic_orders row.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  intakeId: z.string().uuid(),
  email: z.string().trim().email().max(255),
  environment: z.enum(["sandbox", "live"]).default("sandbox"),
  returnUrl: z.string().url().max(500),
  // Optional — defaults to the public Diagnostic offer slug. Even when
  // provided, the price/type/lane is resolved server-side from the offers
  // table; the client can never override price or billing type.
  offerSlug: z.string().min(1).max(100).optional(),
});

const DEFAULT_OFFER_SLUG = "rgs_diagnostic_3000";

function getSupabaseAdmin() {
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

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { intakeId, email, environment, returnUrl, offerSlug } = parsed.data;
    const env: StripeEnv = environment;

    const admin = getSupabaseAdmin();

    // Resolve the offer server-side. Public checkout only allows public,
    // active, public_non_client offers — never trust client-provided price.
    const slug = offerSlug ?? DEFAULT_OFFER_SLUG;
    const { data: offerRows, error: offerErr } = await admin.rpc(
      "get_payable_offer_by_slug",
      { _slug: slug },
    );
    const offer = Array.isArray(offerRows) ? offerRows[0] : null;
    if (offerErr || !offer) {
      return new Response(JSON.stringify({ error: "offer_not_available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (offer.visibility !== "public" || offer.payment_lane !== "public_non_client") {
      return new Response(JSON.stringify({ error: "offer_not_public" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (offer.billing_type !== "one_time" && offer.billing_type !== "deposit") {
      return new Response(JSON.stringify({ error: "offer_billing_unsupported_here" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify intake exists and is in a payable state.
    const { data: intake, error: intakeError } = await admin
      .from("diagnostic_intakes")
      .select("id, email, intake_status, fit_status")
      .eq("id", intakeId)
      .maybeSingle();
    if (intakeError || !intake) {
      return new Response(JSON.stringify({ error: "intake_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (intake.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(JSON.stringify({ error: "email_mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      intake.intake_status === "invite_accepted" ||
      intake.intake_status === "invite_sent" ||
      intake.intake_status === "fit_declined"
    ) {
      return new Response(JSON.stringify({ error: "intake_not_payable" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient(env);
    const lookupKey = offer.stripe_lookup_key ?? offer.slug;
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: "price_not_configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripePrice = prices.data[0];

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer_email: email,
      metadata: {
        intake_id: intakeId,
        offer_id: offer.id,
        offer_slug: offer.slug,
        payment_lane: "public_non_client",
      },
      payment_intent_data: {
        metadata: {
          intake_id: intakeId,
          offer_id: offer.id,
          offer_slug: offer.slug,
        },
      },
    });

    if (!session.client_secret) {
      return new Response(JSON.stringify({ error: "stripe_session_missing_client_secret" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record pending order. Upsert by stripe_session_id (just-created → unique).
    const { error: orderError } = await admin.from("diagnostic_orders").insert({
      intake_id: intakeId,
      email,
      product_id: offer.slug,
      price_id: offer.slug,
      amount_cents: offer.price_cents,
      currency: offer.currency,
      environment: env,
      stripe_session_id: session.id,
      status: "pending",
      offer_id: offer.id,
      payment_lane: "public_non_client",
      billing_type: offer.billing_type,
      subtotal_cents: offer.price_cents,
      total_cents: offer.price_cents,
    });
    if (orderError) console.error("order insert failed", orderError);

    await admin
      .from("diagnostic_intakes")
      .update({ intake_status: "checkout_started" })
      .eq("id", intakeId)
      .in("intake_status", ["submitted", "fit_review", "fit_passed", "checkout_started"]);

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-diagnostic-checkout error", e);
    return new Response(JSON.stringify({ error: "checkout_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});