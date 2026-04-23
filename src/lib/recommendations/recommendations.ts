/* P10.0 — STOP / START / SCALE recommendations data layer.

   Items live in the `report_recommendations` table. Admins manage them
   via the customer detail panel. When a report is published, the
   currently-included items are also frozen into the report snapshot so
   future edits don't silently rewrite history.
*/

import { supabase } from "@/integrations/supabase/client";
import type {
  StopStartScaleSnapshot,
  StopStartScaleSnapshotItem,
} from "@/lib/bcc/reportTypes";

export type RecommendationCategory = "stop" | "start" | "scale";
export type RecommendationPriority = "high" | "medium" | "low";

export const RECOMMENDATION_PILLARS = [
  { key: "demand_generation", label: "Demand Generation" },
  { key: "revenue_conversion", label: "Revenue Conversion" },
  { key: "operational_efficiency", label: "Operational Efficiency" },
  { key: "financial_visibility", label: "Financial Visibility" },
  { key: "owner_independence", label: "Owner Independence" },
] as const;

export type RecommendationPillarKey =
  (typeof RECOMMENDATION_PILLARS)[number]["key"];

export const CATEGORY_META: Record<
  RecommendationCategory,
  { label: string; tone: string; ring: string; bg: string; text: string; blurb: string }
> = {
  stop: {
    label: "STOP",
    tone: "rose",
    ring: "border-rose-500/30",
    bg: "bg-rose-500/5",
    text: "text-rose-300",
    blurb: "What to step away from to free up time, profit, or focus.",
  },
  start: {
    label: "START",
    tone: "primary",
    ring: "border-primary/30",
    bg: "bg-primary/5",
    text: "text-primary",
    blurb: "What to begin doing to strengthen consistency and visibility.",
  },
  scale: {
    label: "SCALE",
    tone: "emerald",
    ring: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    text: "text-emerald-300",
    blurb: "What's working — strengthen, repeat, and systemize it.",
  },
};

export interface RecommendationRow {
  id: string;
  customer_id: string;
  report_id: string | null;
  category: RecommendationCategory;
  title: string;
  explanation: string | null;
  related_pillar: string | null;
  priority: RecommendationPriority;
  display_order: number;
  included_in_report: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type RecommendationDraft = {
  id?: string;
  category: RecommendationCategory;
  title: string;
  explanation?: string | null;
  related_pillar?: string | null;
  priority?: RecommendationPriority;
  display_order?: number;
  included_in_report?: boolean;
};

export function emptyRecommendationDraft(
  category: RecommendationCategory = "stop",
): RecommendationDraft {
  return {
    category,
    title: "",
    explanation: "",
    related_pillar: null,
    priority: "medium",
    included_in_report: false,
  };
}

export async function listRecommendationsForCustomer(
  customerId: string,
): Promise<RecommendationRow[]> {
  const { data, error } = await supabase
    .from("report_recommendations")
    .select("*")
    .eq("customer_id", customerId)
    .order("category", { ascending: true })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RecommendationRow[];
}

export async function listClientApprovedRecommendations(
  customerId: string,
): Promise<RecommendationRow[]> {
  const { data, error } = await supabase
    .from("report_recommendations")
    .select("*")
    .eq("customer_id", customerId)
    .eq("included_in_report", true)
    .order("category", { ascending: true })
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RecommendationRow[];
}

export async function upsertRecommendation(
  customerId: string,
  draft: RecommendationDraft,
  actorId: string | null,
): Promise<void> {
  if (draft.id) {
    const { error } = await supabase
      .from("report_recommendations")
      .update({
        category: draft.category,
        title: draft.title.trim(),
        explanation: draft.explanation?.trim() || null,
        related_pillar: draft.related_pillar || null,
        priority: draft.priority ?? "medium",
        display_order: draft.display_order ?? 0,
        included_in_report: draft.included_in_report ?? false,
        updated_by: actorId,
      })
      .eq("id", draft.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("report_recommendations").insert({
    customer_id: customerId,
    category: draft.category,
    title: draft.title.trim(),
    explanation: draft.explanation?.trim() || null,
    related_pillar: draft.related_pillar || null,
    priority: draft.priority ?? "medium",
    display_order: draft.display_order ?? 0,
    included_in_report: draft.included_in_report ?? false,
    created_by: actorId,
    updated_by: actorId,
  });
  if (error) throw error;
}

export async function deleteRecommendation(id: string): Promise<void> {
  const { error } = await supabase
    .from("report_recommendations")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function reorderRecommendation(
  id: string,
  newOrder: number,
): Promise<void> {
  const { error } = await supabase
    .from("report_recommendations")
    .update({ display_order: newOrder })
    .eq("id", id);
  if (error) throw error;
}

export async function setIncludedInReport(
  id: string,
  included: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("report_recommendations")
    .update({ included_in_report: included })
    .eq("id", id);
  if (error) throw error;
}

export function pillarLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return RECOMMENDATION_PILLARS.find((p) => p.key === key)?.label ?? null;
}

/** P10.0 — Build the frozen snapshot of currently-included STOP/START/SCALE
 *  items for a customer, ready to drop into business_control_reports.report_data.
 *  Returns null if there are no items so callers can skip writing the field. */
export async function buildStopStartScaleSnapshot(
  customerId: string,
): Promise<StopStartScaleSnapshot | null> {
  const { data, error } = await supabase
    .from("report_recommendations")
    .select(
      "category, title, explanation, related_pillar, priority, display_order",
    )
    .eq("customer_id", customerId)
    .eq("included_in_report", true)
    .order("category", { ascending: true })
    .order("display_order", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as StopStartScaleSnapshotItem[];
  if (rows.length === 0) return null;
  return {
    snapshot_at: new Date().toISOString(),
    items: rows.map((r) => ({
      category: r.category,
      title: r.title,
      explanation: r.explanation ?? null,
      related_pillar: r.related_pillar ?? null,
      priority: r.priority ?? "medium",
      display_order: r.display_order ?? 0,
    })),
  };
}

/** Stamp report_id on items currently included for a customer. Lets us
 *  trace which items were live when a given report was published. */
export async function stampRecommendationsWithReport(
  customerId: string,
  reportId: string,
): Promise<void> {
  const { error } = await supabase
    .from("report_recommendations")
    .update({ report_id: reportId })
    .eq("customer_id", customerId)
    .eq("included_in_report", true)
    .is("report_id", null);
  if (error) throw error;
}