// Stripe webhook handler. Routes to ?env=sandbox or ?env=live.
// On successful checkout for the RGS Business Diagnostic, marks the order
// paid and the originating intake paid_pending_access (admin then mints
// a portal invite). Does NOT auto-create accounts or send emails.
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
  const intakeId = session.metadata?.intake_id ?? null;
  const amountCents = typeof session.amount_total === "number" ? session.amount_total : null;
  const currency = (session.currency ?? "usd") as string;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : null;

  // Idempotent mark-paid via security-definer RPC.
  const { error } = await getSupabase().rpc("diagnostic_order_mark_paid", {
    _stripe_session_id: sessionId,
    _stripe_payment_intent_id: paymentIntentId,
    _stripe_customer_id: stripeCustomerId,
    _amount_cents: amountCents,
    _currency: currency,
    _environment: env,
  });
  if (error) {
    console.error("diagnostic_order_mark_paid failed", error, { sessionId, intakeId });
  }
}

async function handlePaymentFailed(session: any, env: StripeEnv) {
  await getSupabase()
    .from("diagnostic_orders")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("stripe_session_id", session.id)
    .eq("environment", env);
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