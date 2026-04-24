/* P11.4 — Acquisition Control Center data layer.
 *
 * Tables:
 *   - marketing_channels
 *   - marketing_spend_entries
 *   - lead_source_metrics
 *
 * Admin-managed under RLS. Client SELECT is allowed but no client UI yet.
 */

import { supabase } from "@/integrations/supabase/client";

import { BRANDS } from "@/config/brands";
export type ChannelKey =
  | "google_ads"
  | "meta_ads"
  | "seo"
  | "referrals"
  | "email"
  | "organic_social"
  | "direct_mail"
  | "events"
  | "agency_outbound"
  | "partnerships"
  | "other";

export type ChannelStatus = "active" | "paused" | "archived";

export const CHANNEL_KEY_LABEL: Record<ChannelKey, string> = {
  google_ads: "Google Ads",
  meta_ads: `${BRANDS.metaAds}`,
  seo: "SEO",
  referrals: "Referrals",
  email: "Email",
  organic_social: "Organic Social",
  direct_mail: "Direct Mail",
  events: "Events",
  agency_outbound: "Agency / Outbound",
  partnerships: "Partnerships",
  other: "Other",
};

export const CHANNEL_KEYS: ChannelKey[] = [
  "google_ads",
  "meta_ads",
  "seo",
  "referrals",
  "email",
  "organic_social",
  "direct_mail",
  "events",
  "agency_outbound",
  "partnerships",
  "other",
];

export interface MarketingChannel {
  id: string;
  customer_id: string;
  channel_key: ChannelKey;
  label: string;
  status: ChannelStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingSpendEntry {
  id: string;
  customer_id: string;
  channel_id: string;
  period_start: string;
  period_end: string;
  amount_spent: number;
  source: string | null;
  source_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadSourceMetric {
  id: string;
  customer_id: string;
  channel_id: string;
  period_start: string;
  period_end: string;
  leads: number;
  qualified_leads: number;
  booked_calls: number;
  proposals_sent: number;
  won_deals: number;
  lost_deals: number;
  revenue_attributed: number;
  notes: string | null;
  source: string | null;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

/* ---------------- channels ---------------- */

export async function listChannels(customerId: string): Promise<MarketingChannel[]> {
  const { data, error } = await supabase
    .from("marketing_channels")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MarketingChannel[];
}

export async function upsertChannel(input: {
  customer_id: string;
  channel_key: ChannelKey;
  label?: string;
  status?: ChannelStatus;
  notes?: string | null;
}): Promise<MarketingChannel> {
  const { data: auth } = await supabase.auth.getUser();
  const row = {
    customer_id: input.customer_id,
    channel_key: input.channel_key,
    label: input.label ?? CHANNEL_KEY_LABEL[input.channel_key],
    status: input.status ?? "active",
    notes: input.notes ?? null,
    created_by: auth.user?.id ?? null,
    updated_by: auth.user?.id ?? null,
  };
  const { data, error } = await supabase
    .from("marketing_channels")
    .upsert(row, { onConflict: "customer_id,channel_key" })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as MarketingChannel;
}

export async function updateChannel(
  id: string,
  patch: Partial<Pick<MarketingChannel, "label" | "status" | "notes">>,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("marketing_channels")
    .update({ ...patch, updated_by: auth.user?.id ?? null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteChannel(id: string): Promise<void> {
  const { error } = await supabase.from("marketing_channels").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- spend ---------------- */

export async function listSpend(
  customerId: string,
  opts: { sinceDays?: number } = {},
): Promise<MarketingSpendEntry[]> {
  let q = supabase
    .from("marketing_spend_entries")
    .select("*")
    .eq("customer_id", customerId)
    .order("period_start", { ascending: false })
    .limit(500);
  if (opts.sinceDays && opts.sinceDays > 0) {
    const since = new Date(Date.now() - opts.sinceDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    q = q.gte("period_start", since);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MarketingSpendEntry[];
}

export async function createSpend(input: {
  customer_id: string;
  channel_id: string;
  period_start: string;
  period_end: string;
  amount_spent: number;
  source?: string | null;
  source_ref?: string | null;
  notes?: string | null;
}): Promise<MarketingSpendEntry> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("marketing_spend_entries")
    .insert({
      customer_id: input.customer_id,
      channel_id: input.channel_id,
      period_start: input.period_start,
      period_end: input.period_end,
      amount_spent: input.amount_spent,
      source: input.source ?? "Manual",
      source_ref: input.source_ref ?? null,
      notes: input.notes ?? null,
      created_by: auth.user?.id ?? null,
      updated_by: auth.user?.id ?? null,
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as MarketingSpendEntry;
}

export async function deleteSpend(id: string): Promise<void> {
  const { error } = await supabase.from("marketing_spend_entries").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- lead/outcome metrics ---------------- */

export async function listMetrics(
  customerId: string,
  opts: { sinceDays?: number } = {},
): Promise<LeadSourceMetric[]> {
  let q = supabase
    .from("lead_source_metrics")
    .select("*")
    .eq("customer_id", customerId)
    .order("period_start", { ascending: false })
    .limit(500);
  if (opts.sinceDays && opts.sinceDays > 0) {
    const since = new Date(Date.now() - opts.sinceDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    q = q.gte("period_start", since);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LeadSourceMetric[];
}

export async function createMetric(input: {
  customer_id: string;
  channel_id: string;
  period_start: string;
  period_end: string;
  leads?: number;
  qualified_leads?: number;
  booked_calls?: number;
  proposals_sent?: number;
  won_deals?: number;
  lost_deals?: number;
  revenue_attributed?: number;
  notes?: string | null;
  source?: string | null;
  source_ref?: string | null;
}): Promise<LeadSourceMetric> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("lead_source_metrics")
    .insert({
      customer_id: input.customer_id,
      channel_id: input.channel_id,
      period_start: input.period_start,
      period_end: input.period_end,
      leads: input.leads ?? 0,
      qualified_leads: input.qualified_leads ?? 0,
      booked_calls: input.booked_calls ?? 0,
      proposals_sent: input.proposals_sent ?? 0,
      won_deals: input.won_deals ?? 0,
      lost_deals: input.lost_deals ?? 0,
      revenue_attributed: input.revenue_attributed ?? 0,
      notes: input.notes ?? null,
      source: input.source ?? "Manual",
      source_ref: input.source_ref ?? null,
      created_by: auth.user?.id ?? null,
      updated_by: auth.user?.id ?? null,
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as LeadSourceMetric;
}

export async function deleteMetric(id: string): Promise<void> {
  const { error } = await supabase.from("lead_source_metrics").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- derived metrics ---------------- */

export interface ChannelRollup {
  channel_id: string;
  channel_key: ChannelKey;
  label: string;
  status: ChannelStatus;
  spend: number;
  leads: number;
  qualified_leads: number;
  booked_calls: number;
  proposals_sent: number;
  won_deals: number;
  lost_deals: number;
  revenue_attributed: number;
  cost_per_lead: number | null;
  cost_per_qualified_lead: number | null;
  cost_per_booked_call: number | null;
  cost_per_won_deal: number | null;
  revenue_to_spend: number | null;
  lead_to_call_rate: number | null;
  call_to_win_rate: number | null;
}

function safeDiv(a: number, b: number): number | null {
  if (!isFinite(a) || !isFinite(b) || b <= 0) return null;
  return a / b;
}

export function buildChannelRollups(args: {
  channels: MarketingChannel[];
  spend: MarketingSpendEntry[];
  metrics: LeadSourceMetric[];
}): ChannelRollup[] {
  const byChannel = new Map<string, ChannelRollup>();
  for (const c of args.channels) {
    byChannel.set(c.id, {
      channel_id: c.id,
      channel_key: c.channel_key,
      label: c.label,
      status: c.status,
      spend: 0,
      leads: 0,
      qualified_leads: 0,
      booked_calls: 0,
      proposals_sent: 0,
      won_deals: 0,
      lost_deals: 0,
      revenue_attributed: 0,
      cost_per_lead: null,
      cost_per_qualified_lead: null,
      cost_per_booked_call: null,
      cost_per_won_deal: null,
      revenue_to_spend: null,
      lead_to_call_rate: null,
      call_to_win_rate: null,
    });
  }
  for (const s of args.spend) {
    const r = byChannel.get(s.channel_id);
    if (!r) continue;
    r.spend += Number(s.amount_spent) || 0;
  }
  for (const m of args.metrics) {
    const r = byChannel.get(m.channel_id);
    if (!r) continue;
    r.leads += Number(m.leads) || 0;
    r.qualified_leads += Number(m.qualified_leads) || 0;
    r.booked_calls += Number(m.booked_calls) || 0;
    r.proposals_sent += Number(m.proposals_sent) || 0;
    r.won_deals += Number(m.won_deals) || 0;
    r.lost_deals += Number(m.lost_deals) || 0;
    r.revenue_attributed += Number(m.revenue_attributed) || 0;
  }
  for (const r of byChannel.values()) {
    r.cost_per_lead = safeDiv(r.spend, r.leads);
    r.cost_per_qualified_lead = safeDiv(r.spend, r.qualified_leads);
    r.cost_per_booked_call = safeDiv(r.spend, r.booked_calls);
    r.cost_per_won_deal = safeDiv(r.spend, r.won_deals);
    r.revenue_to_spend =
      r.spend > 0 && r.revenue_attributed > 0
        ? r.revenue_attributed / r.spend
        : null;
    r.lead_to_call_rate = safeDiv(r.booked_calls, r.leads);
    r.call_to_win_rate = safeDiv(r.won_deals, r.booked_calls);
  }
  return Array.from(byChannel.values());
}
