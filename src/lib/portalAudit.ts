// P18 — Portal audit helper.
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

export async function logPortalAudit(
  action: PortalAuditAction,
  customerId: string | null | undefined,
  details: Record<string, unknown> = {},
): Promise<void> {
  if (!customerId) return;
  try {
    const { error } = await supabase.rpc("log_portal_audit", {
      _action: action,
      _customer_id: customerId,
      _details: details as never,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[audit]", action, error.message);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[audit] failed", action, err);
  }
}