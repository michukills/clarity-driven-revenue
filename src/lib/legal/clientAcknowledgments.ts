/**
 * P69 — Architect's Shield™ acceptance persistence.
 *
 * Thin service layer over the `client_acknowledgments` table. RLS does
 * the real enforcement; these helpers exist so UI surfaces never have
 * to write raw inserts.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  AGREEMENT_REGISTRY,
  type AgreementKey,
  type AcceptanceContext,
} from "@/config/architectsShield";

export interface ClientAcknowledgmentRow {
  id: string;
  customer_id: string;
  user_id: string;
  agreement_key: string;
  agreement_name: string;
  agreement_version: string;
  acceptance_context: string;
  accepted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  revoked_at: string | null;
}

/** Record an acceptance. RLS enforces user_id and customer_id ownership. */
export async function recordAcknowledgment(opts: {
  customerId: string;
  userId: string;
  agreementKey: AgreementKey;
  context: AcceptanceContext;
  /** Override version (default: current registry version). */
  version?: string;
  ipAddress?: string | null;
}): Promise<ClientAcknowledgmentRow> {
  const def = AGREEMENT_REGISTRY[opts.agreementKey];
  if (!def) throw new Error(`Unknown agreement: ${opts.agreementKey}`);
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null;
  const { data, error } = await supabase
    .from("client_acknowledgments" as any)
    .insert({
      customer_id: opts.customerId,
      user_id: opts.userId,
      agreement_key: opts.agreementKey,
      agreement_name: def.name,
      agreement_version: opts.version ?? def.version,
      acceptance_context: opts.context,
      ip_address: opts.ipAddress ?? null,
      user_agent: userAgent,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ClientAcknowledgmentRow;
}

/** Latest non-revoked acceptance row, or null if none exists. */
export async function getLatestAcknowledgment(
  customerId: string,
  agreementKey: AgreementKey,
): Promise<ClientAcknowledgmentRow | null> {
  const { data, error } = await supabase
    .from("client_acknowledgments" as any)
    .select("*")
    .eq("customer_id", customerId)
    .eq("agreement_key", agreementKey)
    .is("revoked_at", null)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ClientAcknowledgmentRow | null) ?? null;
}

/** True only when there is a non-revoked acceptance at the current version. */
export async function isAcknowledgmentCurrent(
  customerId: string,
  agreementKey: AgreementKey,
): Promise<boolean> {
  const row = await getLatestAcknowledgment(customerId, agreementKey);
  if (!row) return false;
  const def = AGREEMENT_REGISTRY[agreementKey];
  return row.agreement_version === def.version;
}

/** Admin: list all (non-revoked) latest acceptances for a customer. */
export async function listAcknowledgmentsForCustomer(
  customerId: string,
): Promise<ClientAcknowledgmentRow[]> {
  const { data, error } = await supabase
    .from("client_acknowledgments" as any)
    .select("*")
    .eq("customer_id", customerId)
    .order("accepted_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ClientAcknowledgmentRow[]) ?? [];
}
