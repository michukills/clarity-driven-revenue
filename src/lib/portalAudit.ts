// P18/P19 — Portal audit helper.
//
// Thin wrapper around the SECURITY DEFINER RPC `public.log_portal_audit`.
// All sensitive client/admin actions in the portal should call this AFTER
// the primary action succeeds. Failures are swallowed and logged so audit
// instrumentation can never break a user-facing flow.
//
// IMPORTANT: never pass secrets, OAuth tokens, ciphertext, raw imported
// rows, full file contents, or full AI prompts in `details`. Keep payloads
// small (the RPC enforces a 16 KB cap server-side) and event-shaped:
//   { report_id }, { task_id, new_status }, { connector, status }, etc.
//
// P19 hardening:
//   - Denylist sanitizer strips token/secret-shaped fields if accidentally
//     passed by a caller, at any nesting level.
//   - 2 attempts (retry once on transient failure).
//   - Critical connector / data-import events log warnings on failure so
//     missing audit rows are visible in the console at minimum.

import { supabase } from "@/integrations/supabase/client";

export type PortalAuditAction =
  | "report_generated"
  | "report_viewed"
  | "task_assigned"
  | "task_status_changed"
  | "file_uploaded"
  | "file_deleted"
  | "connector_connected"
  | "connector_disconnected"
  | "data_import_started"
  | "data_import_completed"
  | "admin_note_created"
  | "admin_note_edited"
  | "ai_recommendation_generated"
  | "client_record_updated";

// Denylist of field names that must NEVER reach the audit row. Matched
// case-insensitively. Anything with a name in this set is dropped before
// the payload is sent to the database, at any nesting depth.
const DENYLIST = new Set([
  "access_token",
  "refresh_token",
  "accesstoken",
  "refreshtoken",
  "token",
  "api_key",
  "apikey",
  "secret",
  "ciphertext",
  "authorization",
  "oauth_code",
  "code",
]);

const CRITICAL_EVENTS: ReadonlySet<PortalAuditAction> = new Set([
  "connector_connected",
  "connector_disconnected",
  "data_import_started",
  "data_import_completed",
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

/**
 * Recursively strip denylisted keys (case-insensitive) from a payload.
 * Exported for tests.
 */
export function sanitizeAuditDetails(input: unknown): Record<string, unknown> {
  if (!isPlainObject(input)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (DENYLIST.has(k.toLowerCase())) continue;
    if (isPlainObject(v)) {
      out[k] = sanitizeAuditDetails(v);
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        isPlainObject(item) ? sanitizeAuditDetails(item) : item,
      );
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function callAuditRpc(
  action: PortalAuditAction,
  customerId: string,
  details: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc("log_portal_audit", {
    _action: action,
    _customer_id: customerId,
    _details: details as never,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function logPortalAudit(
  action: PortalAuditAction,
  customerId: string | null | undefined,
  details: Record<string, unknown> = {},
): Promise<void> {
  if (!customerId) return;

  const safeDetails = sanitizeAuditDetails(
    isPlainObject(details) ? details : {},
  );
  const isCritical = CRITICAL_EVENTS.has(action);

  let lastMessage = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await callAuditRpc(action, customerId, safeDetails);
      if (result.ok) return;
      lastMessage = result.message;
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : String(err);
    }
    if (attempt === 1) {
      // brief backoff before the single retry
      await new Promise((r) => setTimeout(r, 75));
    }
  }
  // Both attempts failed. Always console.warn with action name; never throw.
  // eslint-disable-next-line no-console
  console.warn(
    `[audit]${isCritical ? "[critical]" : ""} ${action} failed:`,
    lastMessage,
  );
}