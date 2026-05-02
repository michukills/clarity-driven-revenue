// Stripe webhook handler. Routes to ?env=sandbox or ?env=live.
//
// Handles both payment lanes:
//   - public_non_client (diagnostic) → marks order paid + intake
//     paid_pending_access; admin then mints invite manually.
//   - existing_client (implementation, add-on, custom) → marks order
//     paid + refreshes per-bucket payment status on customers.
//   - revenue_control_system subscription events → upserts
//     payment_subscriptions and mirrors status onto customers.
//
// In all cases an admin_notifications row + customer_timeline event are
// recorded so nothing is lost. Tools are NEVER auto-unlocked here —
// admin assignment still controls portal access.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const sessionId = session.id;
  const amountCents = typeof session.amount_total === "number" ? session.amount_total : null;
  const currency = (session.currency ?? "usd") as string;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : null;

  // Lane-agnostic mark-paid (handles both diagnostic and existing-client).
  const { data: rows, error } = await getSupabase().rpc("payment_order_mark_paid", {
    _stripe_session_id: sessionId,
    _stripe_payment_intent_id: paymentIntentId,
    _stripe_customer_id: stripeCustomerId,
    _amount_cents: amountCents,
    _currency: currency,
    _environment: env,
  });
  if (error) {
    console.error("payment_order_mark_paid failed", error, { sessionId });
    return;
  }
  const row: any = Array.isArray(rows) ? rows[0] : rows;
  if (!row || row.was_already_paid) return; // idempotent — only fire side effects once

  const lane = row.payment_lane as "public_non_client" | "existing_client" | null;
  const supa = getSupabase();

  // Customer timeline (only when a customer exists; intake-only paid rows
  // get their timeline event after invite-mint promotes them to customer).
  if (row.customer_id) {
    await supa.from("customer_timeline").insert({
      customer_id: row.customer_id,
      event_type: "payment_received",
      title: "Payment received",
      detail: `Stripe session ${sessionId} ($${((amountCents ?? 0) / 100).toLocaleString()})`,
    });
  }

  // Admin notification row (always — nothing is lost).
  await supa.from("admin_notifications").insert({
    kind: lane === "existing_client" ? "existing_client_paid" : "diagnostic_paid",
    customer_id: row.customer_id,
    intake_id: row.intake_id,
    order_id: row.order_id,
    email: row.email,
    amount_cents: amountCents,
    currency,
    payment_lane: lane,
    priority: "high",
    message: lane === "existing_client"
      ? "Existing-client payment received."
      : "Diagnostic paid — review intake and send portal invite.",
    next_action: lane === "existing_client"
      ? "Confirm next-step assignment"
      : "Approve & send portal invite",
    metadata: { stripe_session_id: sessionId, environment: env },
  });
}

async function handlePaymentFailed(session: any, env: StripeEnv) {
  const supa = getSupabase();
  const { data: order } = await supa
    .from("diagnostic_orders")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("stripe_session_id", session.id)
    .eq("environment", env)
    .select("id, customer_id, intake_id, email, payment_lane")
    .maybeSingle();
  if (order) {
    await supa.from("admin_notifications").insert({
      kind: "payment_failed",
      order_id: order.id,
      customer_id: order.customer_id,
      intake_id: order.intake_id,
      email: order.email,
      payment_lane: order.payment_lane,
      priority: "high",
      message: "Payment failed or canceled.",
      next_action: "Follow up manually",
      metadata: { stripe_session_id: session.id, environment: env },
    });
  }
}

async function handleSubscriptionEvent(subscription: any, env: StripeEnv) {
  const supa = getSupabase();
  const stripeSubId = subscription.id as string;
  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : null;
  const status = subscription.status as string;
  const item = subscription.items?.data?.[0];
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const amount = item?.price?.unit_amount ?? 0;
  const currency = (item?.price?.currency ?? "usd") as string;

  // Customer linkage comes from the originating session metadata. Look up
  // by stripe customer id on existing payment_subscriptions or orders.
  let customerId: string | null =
    subscription.metadata?.customer_id ?? null;
  let offerId: string | null = subscription.metadata?.offer_id ?? null;

  if (!customerId && stripeCustomerId) {
    const { data: prior } = await supa
      .from("diagnostic_orders")
      .select("customer_id, offer_id")
      .eq("stripe_customer_id", stripeCustomerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    customerId = prior?.customer_id ?? null;
    offerId = offerId ?? prior?.offer_id ?? null;
  }

  if (!customerId) {
    console.warn("subscription event without resolvable customer", { stripeSubId });
    return;
  }

  const supportedStatuses = new Set([
    "active", "trialing", "past_due", "canceled", "paused", "incomplete",
  ]);
  const safeStatus = supportedStatuses.has(status) ? status : "incomplete";

  const { error } = await supa.rpc("payment_subscription_upsert", {
    _customer_id: customerId,
    _offer_id: offerId,
    _stripe_subscription_id: stripeSubId,
    _stripe_customer_id: stripeCustomerId,
    _status: safeStatus,
    _current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    _current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    _cancel_at_period_end: !!subscription.cancel_at_period_end,
    _amount_cents: amount,
    _currency: currency,
    _environment: env,
  });
  if (error) {
    console.error("payment_subscription_upsert failed", error);
    return;
  }

  await supa.from("customer_timeline").insert({
    customer_id: customerId,
    event_type: "subscription_" + safeStatus,
    title: `Revenue Control System subscription ${safeStatus.replace(/_/g, " ")}`,
    detail: `Stripe subscription ${stripeSubId}`,
  });

  await supa.from("admin_notifications").insert({
    kind: "subscription_" + safeStatus,
    customer_id: customerId,
    payment_lane: "existing_client",
    priority: safeStatus === "past_due" || safeStatus === "canceled" ? "high" : "normal",
    message: `Revenue Control System subscription is now ${safeStatus.replace(/_/g, " ")}.`,
    next_action:
      safeStatus === "past_due" ? "Reach out — payment retry in progress" :
      safeStatus === "canceled" ? "Confirm cancellation reason" :
      safeStatus === "active" || safeStatus === "trialing" ? "No action — monitor" :
      "Review",
    metadata: { stripe_subscription_id: stripeSubId, environment: env },
  });
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "transaction.completed":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case "checkout.session.async_payment_failed":
    case "transaction.payment_failed":
      await handlePaymentFailed(event.data.object, env);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionEvent(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("invalid env", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;
  try {
    await handleWebhook(req, env);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});