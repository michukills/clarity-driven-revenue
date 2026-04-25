/**
 * P14 — Live integration test for the deployed quickbooks-webhook function.
 *
 * Reads QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN from the server environment, signs a
 * representative Intuit payload with HMAC-SHA256/base64, and POSTs to the
 * deployed edge function. Verifies:
 *   - missing signature -> 401
 *   - bad signature     -> 401
 *   - valid signature   -> 200
 *
 * Token is never logged.
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const ENDPOINT = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/quickbooks-webhook`;
const VERIFIER = Deno.env.get("QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN");

async function sign(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return encodeBase64(new Uint8Array(sig));
}

Deno.test("missing signature returns 401", async () => {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventNotifications: [] }),
  });
  await r.text();
  assertEquals(r.status, 401);
});

Deno.test("bad signature returns 401", async () => {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "intuit-signature": "AAAAinvalidsigBBBB==",
    },
    body: JSON.stringify({ eventNotifications: [] }),
  });
  await r.text();
  assertEquals(r.status, 401);
});

Deno.test("GET returns 405", async () => {
  const r = await fetch(ENDPOINT, { method: "GET" });
  await r.text();
  assertEquals(r.status, 405);
});

Deno.test("valid signature returns 200 and queues a job", async () => {
  if (!VERIFIER) {
    console.warn("QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN not set in test env — skipping");
    return;
  }
  const body = JSON.stringify({
    eventNotifications: [
      {
        realmId: "TEST-REALM-VERIFY",
        dataChangeEvent: {
          entities: [
            {
              name: "Customer",
              id: "verify-cust-1",
              operation: "Create",
              lastUpdated: new Date().toISOString(),
            },
            {
              name: "Invoice",
              id: "verify-inv-1",
              operation: "Update",
              lastUpdated: new Date().toISOString(),
            },
          ],
        },
      },
    ],
  });
  const signature = await sign(body, VERIFIER);
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "intuit-signature": signature,
    },
    body,
  });
  const text = await r.text();
  assertEquals(r.status, 200, `expected 200, got ${r.status}: ${text}`);
  const data = JSON.parse(text);
  assertEquals(data.ok, true);
  assertEquals(data.received, 2);
  assertEquals(data.queued, 2);
});