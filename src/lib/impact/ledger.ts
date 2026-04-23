// P9.0 — RGS Impact Ledger™ shared types, labels, and DB helpers.
import { supabase } from "@/integrations/supabase/client";

export type ImpactType =
  | "revenue_leak_identified"
  | "risk_reduced"
  | "bottleneck_resolved"
  | "owner_load_reduced"
  | "cash_visibility_improved"
  | "process_installed"
  | "buyer_clarity_improved"
  | "journey_friction_reduced"
  | "weekly_rhythm_established"
  | "review_intervention_completed"
  | "report_insight_captured"
  | "custom";

export type ImpactArea =
  | "diagnostic"
  | "implementation"
  | "revenue_control"
  | "operations"
  | "sales"
  | "cash"
  | "customer_journey"
  | "owner_dependency"
  | "systems"
  | "other";

export type ImpactStatus =
  | "identified"
  | "in_progress"
  | "installed"
  | "improved"
  | "resolved"
  | "verified"
  | "archived";

export type ImpactVisibility = "admin_only" | "client_visible";

export type ImpactSourceType =
  | "manual"
  | "diagnostic"
  | "weekly_checkin"
  | "rgs_review"
  | "business_control_report"
  | "timeline"
  | "tool_assignment"
  | "other";

export type ImpactConfidence = "low" | "medium" | "high";

export type ImpactValueUnit = "usd" | "percent" | "hours" | "days" | "count" | "score" | "text";

export interface ImpactEntry {
  id: string;
  customer_id: string;
  impact_type: ImpactType;
  impact_area: ImpactArea;
  title: string;
  summary: string;
  status: ImpactStatus;
  visibility: ImpactVisibility;
  source_type: ImpactSourceType;
  source_id: string | null;
  source_label: string | null;
  impact_date: string; // YYYY-MM-DD
  baseline_value: number | null;
  current_value: number | null;
  value_unit: ImpactValueUnit | null;
  confidence_level: ImpactConfidence;
  admin_note: string | null;
  client_note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const IMPACT_TYPE_LABEL: Record<ImpactType, string> = {
  revenue_leak_identified: "Revenue leak identified",
  risk_reduced: "Risk reduced",
  bottleneck_resolved: "Bottleneck resolved",
  owner_load_reduced: "Owner load reduced",
  cash_visibility_improved: "Cash visibility improved",
  process_installed: "Process installed",
  buyer_clarity_improved: "Buyer clarity improved",
  journey_friction_reduced: "Journey friction reduced",
  weekly_rhythm_established: "Weekly rhythm established",
  review_intervention_completed: "Review intervention completed",
  report_insight_captured: "Report insight captured",
  custom: "Custom",
};

export const IMPACT_AREA_LABEL: Record<ImpactArea, string> = {
  diagnostic: "Diagnostic",
  implementation: "Implementation",
  revenue_control: "Revenue Control",
  operations: "Operations",
  sales: "Sales",
  cash: "Cash",
  customer_journey: "Customer Journey",
  owner_dependency: "Owner Dependency",
  systems: "Systems",
  other: "Other",
};

export const IMPACT_STATUS_LABEL: Record<ImpactStatus, string> = {
  identified: "Identified",
  in_progress: "In progress",
  installed: "Installed",
  improved: "Improved",
  resolved: "Resolved",
  verified: "Verified",
  archived: "Archived",
};

export const IMPACT_SOURCE_LABEL: Record<ImpactSourceType, string> = {
  manual: "Manual entry",
  diagnostic: "Diagnostic",
  weekly_checkin: "Weekly check-in",
  rgs_review: "RGS review",
  business_control_report: "Business Control Report",
  timeline: "Timeline",
  tool_assignment: "Tool assignment",
  other: "Other",
};

export const IMPACT_VISIBILITY_LABEL: Record<ImpactVisibility, string> = {
  admin_only: "Admin only",
  client_visible: "Client visible",
};

export const IMPACT_TYPES: ImpactType[] = Object.keys(IMPACT_TYPE_LABEL) as ImpactType[];
export const IMPACT_AREAS: ImpactArea[] = Object.keys(IMPACT_AREA_LABEL) as ImpactArea[];
export const IMPACT_STATUSES: ImpactStatus[] = Object.keys(IMPACT_STATUS_LABEL) as ImpactStatus[];
export const IMPACT_SOURCES: ImpactSourceType[] = Object.keys(IMPACT_SOURCE_LABEL) as ImpactSourceType[];
export const IMPACT_VISIBILITIES: ImpactVisibility[] = ["admin_only", "client_visible"];
export const IMPACT_CONFIDENCES: ImpactConfidence[] = ["low", "medium", "high"];
export const IMPACT_VALUE_UNITS: ImpactValueUnit[] = ["usd", "percent", "hours", "days", "count", "score", "text"];

export function formatImpactValue(value: number | null, unit: ImpactValueUnit | null): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  switch (unit) {
    case "usd":
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
    case "percent":
      return `${value}%`;
    case "hours":
      return `${value} hr`;
    case "days":
      return `${value} d`;
    case "count":
      return `${value}`;
    case "score":
      return `${value}`;
    default:
      return `${value}`;
  }
}

export function valueDelta(entry: Pick<ImpactEntry, "baseline_value" | "current_value" | "value_unit">): string | null {
  const { baseline_value, current_value, value_unit } = entry;
  if (baseline_value === null || current_value === null) return null;
  const a = formatImpactValue(baseline_value, value_unit);
  const b = formatImpactValue(current_value, value_unit);
  if (!a || !b) return null;
  return `${a} → ${b}`;
}

// ----- DB helpers -----

export async function loadImpactForCustomer(customerId: string): Promise<ImpactEntry[]> {
  const { data, error } = await (supabase as any)
    .from("customer_impact_ledger")
    .select("*")
    .eq("customer_id", customerId)
    .order("impact_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ImpactEntry[];
}

export async function loadClientVisibleImpact(customerId: string): Promise<ImpactEntry[]> {
  const { data, error } = await (supabase as any)
    .from("customer_impact_ledger")
    .select("*")
    .eq("customer_id", customerId)
    .eq("visibility", "client_visible")
    .neq("status", "archived")
    .order("impact_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ImpactEntry[];
}

export interface ImpactDraft {
  id?: string;
  customer_id: string;
  impact_type: ImpactType;
  impact_area: ImpactArea;
  title: string;
  summary: string;
  status: ImpactStatus;
  visibility: ImpactVisibility;
  source_type: ImpactSourceType;
  source_id: string | null;
  source_label: string | null;
  impact_date: string;
  baseline_value: number | null;
  current_value: number | null;
  value_unit: ImpactValueUnit | null;
  confidence_level: ImpactConfidence;
  admin_note: string | null;
  client_note: string | null;
}

export interface SaveResult {
  ok: boolean;
  entry?: ImpactEntry;
  error?: string;
}

function trimOrNull(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function validate(draft: ImpactDraft): string | null {
  if (!draft.title.trim()) return "Title is required.";
  if (!draft.summary.trim()) return "Summary is required.";
  if (!draft.impact_date) return "Impact date is required.";
  if (draft.visibility === "client_visible" && !trimOrNull(draft.client_note)) {
    return "A client note is required before sharing this entry with the client.";
  }
  return null;
}

export async function saveImpactEntry(
  draft: ImpactDraft,
  actorId: string | null,
): Promise<SaveResult> {
  const err = validate(draft);
  if (err) return { ok: false, error: err };

  const payload: any = {
    customer_id: draft.customer_id,
    impact_type: draft.impact_type,
    impact_area: draft.impact_area,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    status: draft.status,
    visibility: draft.visibility,
    source_type: draft.source_type,
    source_id: draft.source_id,
    source_label: trimOrNull(draft.source_label),
    impact_date: draft.impact_date,
    baseline_value: draft.baseline_value,
    current_value: draft.current_value,
    value_unit: draft.value_unit,
    confidence_level: draft.confidence_level,
    admin_note: trimOrNull(draft.admin_note),
    client_note: trimOrNull(draft.client_note),
    updated_by: actorId,
  };

  let prevVisibility: ImpactVisibility | null = null;
  let entry: ImpactEntry | null = null;

  if (draft.id) {
    const { data: prev } = await (supabase as any)
      .from("customer_impact_ledger")
      .select("visibility")
      .eq("id", draft.id)
      .maybeSingle();
    prevVisibility = (prev?.visibility as ImpactVisibility | undefined) ?? null;

    const { data, error } = await (supabase as any)
      .from("customer_impact_ledger")
      .update(payload)
      .eq("id", draft.id)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    entry = data as ImpactEntry;
  } else {
    payload.created_by = actorId;
    const { data, error } = await (supabase as any)
      .from("customer_impact_ledger")
      .insert(payload)
      .select("*")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    entry = data as ImpactEntry;
  }

  if (entry) {
    await maybeLogTimeline({
      customerId: entry.customer_id,
      isNew: !draft.id,
      prevVisibility,
      nextVisibility: entry.visibility,
      actorId,
    });
  }

  return { ok: true, entry: entry ?? undefined };
}

async function maybeLogTimeline(args: {
  customerId: string;
  isNew: boolean;
  prevVisibility: ImpactVisibility | null;
  nextVisibility: ImpactVisibility;
  actorId: string | null;
}): Promise<void> {
  // Only log client-safe events. Admin-only entries never produce timeline rows.
  // Idempotency: only on create-with-client-visible OR on first transition to client_visible.
  let event_type: string | null = null;
  let title: string | null = null;
  let detail: string | null = null;

  if (args.isNew && args.nextVisibility === "client_visible") {
    event_type = "impact_ledger_entry_created";
    title = "Impact logged";
    detail = "RGS added an impact note to your Impact Ledger.";
  } else if (
    !args.isNew &&
    args.prevVisibility === "admin_only" &&
    args.nextVisibility === "client_visible"
  ) {
    event_type = "impact_ledger_entry_shared";
    title = "Impact shared";
    detail = "RGS shared an impact note in your Impact Ledger.";
  }

  if (!event_type) return;

  await supabase.from("customer_timeline").insert({
    customer_id: args.customerId,
    event_type,
    title,
    detail,
    actor_id: args.actorId,
  });
}

export async function archiveImpactEntry(id: string, actorId: string | null): Promise<{ ok: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("customer_impact_ledger")
    .update({ status: "archived", updated_by: actorId })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteImpactEntry(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await (supabase as any)
    .from("customer_impact_ledger")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function emptyDraft(customerId: string): ImpactDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    customer_id: customerId,
    impact_type: "process_installed",
    impact_area: "implementation",
    title: "",
    summary: "",
    status: "identified",
    visibility: "admin_only",
    source_type: "manual",
    source_id: null,
    source_label: null,
    impact_date: today,
    baseline_value: null,
    current_value: null,
    value_unit: null,
    confidence_level: "medium",
    admin_note: null,
    client_note: null,
  };
}

export function draftFromEntry(entry: ImpactEntry): ImpactDraft {
  return {
    id: entry.id,
    customer_id: entry.customer_id,
    impact_type: entry.impact_type,
    impact_area: entry.impact_area,
    title: entry.title,
    summary: entry.summary,
    status: entry.status,
    visibility: entry.visibility,
    source_type: entry.source_type,
    source_id: entry.source_id,
    source_label: entry.source_label,
    impact_date: entry.impact_date,
    baseline_value: entry.baseline_value,
    current_value: entry.current_value,
    value_unit: entry.value_unit,
    confidence_level: entry.confidence_level,
    admin_note: entry.admin_note,
    client_note: entry.client_note,
  };
}

// ----- Dashboard helpers -----

export interface RecentImpactRow extends ImpactEntry {
  customer_full_name: string | null;
  customer_business_name: string | null;
}

export interface ImpactDashboardSummary {
  visibleThisMonth: number;
  verifiedThisMonth: number;
  recent: RecentImpactRow[];
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export async function loadImpactDashboardSummary(): Promise<ImpactDashboardSummary> {
  const monthStart = startOfMonthIso();

  const [{ data: visibleRows }, { data: verifiedRows }, { data: recentRows }] = await Promise.all([
    (supabase as any)
      .from("customer_impact_ledger")
      .select("id")
      .eq("visibility", "client_visible")
      .gte("impact_date", monthStart),
    (supabase as any)
      .from("customer_impact_ledger")
      .select("id")
      .in("status", ["verified", "resolved"])
      .gte("impact_date", monthStart),
    (supabase as any)
      .from("customer_impact_ledger")
      .select(
        "*, customers:customer_id(full_name, business_name)"
      )
      .order("impact_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const recent: RecentImpactRow[] = ((recentRows as any[]) || []).map((r: any) => ({
    ...(r as ImpactEntry),
    customer_full_name: r?.customers?.full_name ?? null,
    customer_business_name: r?.customers?.business_name ?? null,
  }));

  return {
    visibleThisMonth: ((visibleRows as any[]) || []).length,
    verifiedThisMonth: ((verifiedRows as any[]) || []).length,
    recent,
  };
}