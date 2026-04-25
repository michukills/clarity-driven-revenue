/**
 * P14 — QuickBooks webhook receiver.
 *
 * Public endpoint (no Supabase JWT). Verifies the Intuit signature with
 * HMAC-SHA256 over the raw request body using the verifier token, then
 * logs verified events and queues one sync job per changed entity.
 *
 * Webhook payloads are NEVER treated as source-of-truth financial data.
 * They only trigger sync jobs that should later pull authoritative data
 * from the QuickBooks Accounting API.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, intuit-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256Base64(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  // Base64 of the signature bytes (Intuit format).
  let bin = "";
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const verifier = Deno.env.get("QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!verifier || !supabaseUrl || !serviceKey) {
    // Honest "not configured" — never echo which secret is missing in detail.
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // CRITICAL: read raw body BEFORE parsing JSON so the signature matches.
  const rawBody = await req.text();
  const provided = req.headers.get("intuit-signature") ?? "";

  let signatureValid = false;
  if (provided) {
    try {
      const expected = await hmacSha256Base64(verifier, rawBody);
      const a = new TextEncoder().encode(expected);
      const b = new TextEncoder().encode(provided);
      signatureValid = timingSafeEqual(a, b);
    } catch (_) {
      signatureValid = false;
    }
  }

  if (!signatureValid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parse payload — be defensive about shape.
  let payload: any = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (_) {
    payload = {};
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const notifications: any[] = Array.isArray(payload?.eventNotifications)
    ? payload.eventNotifications
    : [];

  const eventRows: any[] = [];
  const jobRows: any[] = [];

  for (const note of notifications) {
    const realmId: string | null = note?.realmId ?? null;
    const entities: any[] = note?.dataChangeEvent?.entities ?? [];
    if (entities.length === 0) {
      eventRows.push({
        realm_id: realmId,
        event_type: "dataChangeEvent",
        entity_name: null,
        entity_id: null,
        operation: null,
        raw_payload: note ?? {},
        signature_valid: true,
        processing_status: "received",
      });
      continue;
    }
    for (const ent of entities) {
      const entity_name = ent?.name ?? null;
      const entity_id = ent?.id ?? null;
      const operation = ent?.operation ?? null;
      eventRows.push({
        realm_id: realmId,
        event_type: "dataChangeEvent",
        entity_name,
        entity_id,
        operation,
        raw_payload: ent ?? {},
        signature_valid: true,
        processing_status: "received",
      });
      jobRows.push({
        realm_id: realmId,
        entity_name,
        entity_id,
        operation,
        status: "queued",
        source: "webhook",
      });
    }
  }

  // If the body had no recognizable notifications, still log a record so the
  // admin panel can show that something arrived.
  if (eventRows.length === 0) {
    eventRows.push({
      realm_id: null,
      event_type: "unknown",
      entity_name: null,
      entity_id: null,
      operation: null,
      raw_payload: payload ?? {},
      signature_valid: true,
      processing_status: "received",
    });
  }

  // Best-effort writes; even on partial failure return 200 so Intuit does not
  // hammer-retry, but log the error.
  try {
    await admin.from("quickbooks_webhook_events").insert(eventRows);
    if (jobRows.length > 0) {
      await admin.from("quickbooks_sync_jobs").insert(jobRows);
    }
  } catch (err) {
    console.error("[quickbooks-webhook] insert failed", err);
  }

  return new Response(JSON.stringify({ ok: true, received: eventRows.length, queued: jobRows.length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
