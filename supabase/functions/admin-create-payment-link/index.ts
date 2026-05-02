// Admin-only. Creates a Stripe Checkout Session (or subscription billing
// session) for an existing client based on a server-side offer record.
// Used for the "Existing-Client Payment Lane" — Implementation, Revenue
// Control System, add-ons, and custom/manual offers.
//
// Frontend never supplies price, billing type, or customer linkage details;
// the function resolves everything from the offers table and customer_id.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { requireAdmin } from "../_shared/admin-auth.ts";
import { sendAdminEmail } from "../_shared/admin-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  customerId: z.string().uuid(),
  offerSlug: z.string().min(1).max(100),
  environment: z.enum(["sandbox", "live"]).default("sandbox"),
  returnUrl: z.string().url().max(500),
});

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
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    const { customerId, offerSlug, environment, returnUrl } = parsed.data;
    const env: StripeEnv = environment;
    const admin = getAdminClient();

    // Resolve customer.
    const { data: customer, error: cerr } = await admin
      .from("customers")
      .select("id, email, full_name, business_name")
      .eq("id", customerId)
      .maybeSingle();
    if (cerr || !customer) {
      return new Response(JSON.stringify({ error: "customer_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Duplicate-risk check (advisory): warn admin if another active customer
    // shares the same email or business name. Returned in response so the
    // admin UI can surface a confirmation before sending the link.
    const { data: dupes } = await admin
      .from("customers")
      .select("id, business_name, email")
      .neq("id", customerId)
      .is("archived_at", null)
      .or(`email.ilike.${customer.email},business_name.ilike.${customer.business_name ?? "__none__"}`)
      .limit(5);

    // Resolve offer server-side (price/lane/billing type all from DB).
    const { data: offerRows, error: offerErr } = await admin.rpc(
      "get_payable_offer_by_slug",
      { _slug: offerSlug },
    );
    const offer = Array.isArray(offerRows) ? offerRows[0] : null;
    if (offerErr || !offer) {
      return new Response(JSON.stringify({ error: "offer_not_available" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (offer.payment_lane !== "existing_client") {
      return new Response(JSON.stringify({ error: "offer_not_existing_client_lane" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (offer.billing_type === "manual_invoice") {
      // Manual invoice: no Stripe session — admin records payment manually.
      const { data: order, error: oerr } = await admin
        .from("diagnostic_orders")
        .insert({
          customer_id: customerId,
          email: customer.email,
          product_id: offer.slug,
          price_id: offer.slug,
          amount_cents: offer.price_cents,
          currency: offer.currency,
          environment: env,
          status: "pending",
          offer_id: offer.id,
          payment_lane: "existing_client",
          billing_type: "manual_invoice",
          subtotal_cents: offer.price_cents,
          total_cents: offer.price_cents,
        })
        .select("id")
        .single();
      if (oerr) throw oerr;
      await admin.from("customer_timeline").insert({
        customer_id: customerId,
        event_type: "manual_invoice_created",
        title: `Manual invoice prepared: ${offer.name}`,
        detail: `Pending — admin will record payment manually.`,
      });
      const { data: notif } = await admin
        .from("admin_notifications")
        .insert({
          kind: "manual_invoice_created",
          customer_id: customerId,
          order_id: order.id,
          email: customer.email,
          business_name: customer.business_name,
          amount_cents: offer.price_cents,
          currency: offer.currency,
          payment_lane: "existing_client",
          offer_slug: offer.slug,
          priority: "normal",
          message: `Manual invoice for ${offer.name} ready to send.`,
          next_action: "Send manual invoice and record payment when collected",
          email_status: "pending",
        })
        .select("id")
        .maybeSingle();
      await sendAdminEmail({
        event: "existing_client_payment_link_created",
        notificationId: (notif?.id as string | undefined) ?? null,
        fields: {
          businessName: customer.business_name,
          clientName: customer.full_name,
          clientEmail: customer.email,
          offer: offer.name,
          paymentLane: "existing_client",
          amountCents: offer.price_cents,
          totalCents: offer.price_cents,
          currency: offer.currency,
          status: "manual_invoice",
          nextAction: "Send the manual invoice and record payment when collected",
          adminLink: "/admin/payments",
        },
      });
      return new Response(
        JSON.stringify({ orderId: order.id, mode: "manual_invoice", duplicateWarnings: dupes ?? [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = createStripeClient(env);
    const lookupKey = offer.stripe_lookup_key ?? offer.slug;
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: "price_not_configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripePrice = prices.data[0];
    const isRecurring = offer.billing_type === "recurring_monthly";

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "hosted",
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${returnUrl}?status=canceled`,
      customer_email: customer.email,
      metadata: {
        customer_id: customerId,
        offer_id: offer.id,
        offer_slug: offer.slug,
        payment_lane: "existing_client",
      },
      ...(isRecurring && {
        subscription_data: {
          metadata: {
            customer_id: customerId,
            offer_id: offer.id,
            offer_slug: offer.slug,
          },
        },
      }),
    });

    if (!session.url) {
      return new Response(JSON.stringify({ error: "stripe_session_missing_url" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record pending order. (For subscriptions this is the initial session;
    // recurring renewals will be tracked via payment_subscriptions by the webhook.)
    const { error: orderError } = await admin.from("diagnostic_orders").insert({
      customer_id: customerId,
      email: customer.email,
      product_id: offer.slug,
      price_id: offer.slug,
      amount_cents: offer.price_cents,
      currency: offer.currency,
      environment: env,
      stripe_session_id: session.id,
      status: "pending",
      offer_id: offer.id,
      payment_lane: "existing_client",
      billing_type: offer.billing_type,
      subtotal_cents: offer.price_cents,
      total_cents: offer.price_cents,
    });
    if (orderError) console.error("order insert failed", orderError);
    await admin.from("customer_timeline").insert({
      customer_id: customerId,
      event_type: "payment_link_sent",
      title: `Payment link created: ${offer.name}`,
      detail: `Stripe session ${session.id}.`,
    });
    const { data: linkNotif } = await admin
      .from("admin_notifications")
      .insert({
        kind: "payment_link_created",
        customer_id: customerId,
        email: customer.email,
        business_name: customer.business_name,
        amount_cents: offer.price_cents,
        currency: offer.currency,
        payment_lane: "existing_client",
        offer_slug: offer.slug,
        priority: "normal",
        message: `Payment link created for ${offer.name}.`,
        next_action: "Share link with client and wait for payment",
        metadata: { stripe_session_id: session.id, environment: env },
        email_status: "pending",
      })
      .select("id")
      .maybeSingle();
    await sendAdminEmail({
      event: "existing_client_payment_link_created",
      notificationId: (linkNotif?.id as string | undefined) ?? null,
      fields: {
        businessName: customer.business_name,
        clientName: customer.full_name,
        clientEmail: customer.email,
        offer: offer.name,
        paymentLane: "existing_client",
        amountCents: offer.price_cents,
        currency: offer.currency,
        status: "pending",
        stripeReference: session.id,
        nextAction: "Share the Stripe payment link with the client",
        adminLink: "/admin/payments",
      },
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        mode: isRecurring ? "subscription" : "payment",
        duplicateWarnings: dupes ?? [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("admin-create-payment-link error", e);
    return new Response(JSON.stringify({ error: "payment_link_failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});