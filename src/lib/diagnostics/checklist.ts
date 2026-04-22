// Diagnostic delivery checklist — uses existing checklist_items table.
// Items are tagged with a stable [DX] prefix so we can identify them
// idempotently without a schema change.
import { supabase } from "@/integrations/supabase/client";

export const DX_PREFIX = "[DX]";

export type DiagnosticEngineKey =
  | "rgs_stability_scorecard"
  | "revenue_leak_finder"
  | "buyer_persona_tool"
  | "customer_journey_mapper"
  | "process_breakdown_tool";

export type DxStep = {
  /** stable slug used to find the checklist row */
  slug: string;
  /** branded display label (also stored in checklist_items.title) */
  label: string;
  /** if this step represents a Diagnostic Engine, its tool_key */
  engine?: DiagnosticEngineKey;
  /** admin route to launch / open the engine */
  href?: string;
};

export const DX_STEPS: DxStep[] = [
  { slug: "intake",    label: "Intake received" },
  { slug: "bsi",       label: "Business Stability Index™ completed",        engine: "rgs_stability_scorecard",  href: "/admin/tools/stability-scorecard" },
  { slug: "rlde",      label: "Revenue Leak Detection Engine™ completed",   engine: "revenue_leak_finder",       href: "/admin/tools/revenue-leak-finder" },
  { slug: "bie",       label: "Buyer Intelligence Engine™ completed",       engine: "buyer_persona_tool",        href: "/admin/tools/persona-builder" },
  { slug: "cjms",      label: "Customer Journey Mapping System™ completed", engine: "customer_journey_mapper",   href: "/admin/tools/journey-mapper" },
  { slug: "pce",       label: "Process Clarity Engine™ completed",          engine: "process_breakdown_tool",    href: "/admin/tools/process-breakdown" },
  { slug: "review",    label: "Diagnostic review completed" },
  { slug: "strategy",  label: "Strategy Plan prepared" },
  { slug: "delivered", label: "Diagnostic delivered" },
  { slug: "handoff",   label: "Implementation recommendation / handoff completed" },
];

/** Title format stored in checklist_items.title:  "[DX] {slug} · {label}"  */
const itemTitle = (s: DxStep) => `${DX_PREFIX} ${s.slug} · ${s.label}`;

/** Parse the slug from a stored row title; returns null if not a DX row. */
export const slugFromTitle = (title: string | null | undefined): string | null => {
  if (!title) return null;
  const m = title.match(/^\[DX\]\s+([a-z_]+)\s+·/);
  return m ? m[1] : null;
};

export const isDxItem = (title: string | null | undefined) =>
  !!title && title.startsWith(DX_PREFIX);

/**
 * Idempotently seed the diagnostic checklist for a customer.
 * - Reads existing checklist_items
 * - Inserts only the DX steps that are missing (matched by [DX] prefix + slug)
 * - Preserves any non-DX checklist items (e.g. implementation checklist)
 * - Preserves existing DX rows' completion state
 *
 * Safe to call repeatedly. Returns the number of rows inserted.
 */
export async function seedDiagnosticChecklist(customerId: string): Promise<number> {
  const { data: existing, error } = await supabase
    .from("checklist_items")
    .select("id, title, position")
    .eq("customer_id", customerId);
  if (error) throw error;

  const haveSlugs = new Set(
    (existing || []).map((r) => slugFromTitle(r.title)).filter(Boolean) as string[],
  );
  const maxPos = (existing || []).reduce((m, r) => Math.max(m, r.position ?? 0), -1);

  const toInsert = DX_STEPS.filter((s) => !haveSlugs.has(s.slug)).map((s, i) => ({
    customer_id: customerId,
    title: itemTitle(s),
    position: maxPos + 1 + i,
  }));

  if (toInsert.length === 0) return 0;

  const { error: insErr } = await supabase.from("checklist_items").insert(toInsert);
  if (insErr) throw insErr;
  return toInsert.length;
}

export type DxItemRow = {
  id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
};

export type DxStepStatus = {
  step: DxStep;
  /** the checklist_items row, if seeded */
  row: DxItemRow | null;
  /** true if a tool_run exists for this customer + engine */
  hasRun: boolean;
  /** ISO timestamp of latest run, if any */
  lastRunAt: string | null;
  /** id of latest run, if any */
  lastRunId: string | null;
  /** true when manually completed OR (engine step && hasRun) */
  effectiveComplete: boolean;
  /** true when complete via tool run rather than manual check */
  detectedFromRun: boolean;
};

/** Build the per-step status view from raw checklist + tool_runs. */
export function buildDxStatus(
  checklist: { id: string; title: string | null; completed: boolean; completed_at: string | null }[],
  runs: { id: string; tool_key: string; created_at: string }[],
): DxStepStatus[] {
  const bySlug = new Map<string, DxItemRow>();
  for (const r of checklist) {
    const slug = slugFromTitle(r.title);
    if (slug)
      bySlug.set(slug, {
        id: r.id,
        title: r.title || "",
        completed: !!r.completed,
        completed_at: r.completed_at,
      });
  }
  const latestByKey = new Map<string, { id: string; created_at: string }>();
  for (const run of runs) {
    const prev = latestByKey.get(run.tool_key);
    if (!prev || new Date(run.created_at) > new Date(prev.created_at))
      latestByKey.set(run.tool_key, { id: run.id, created_at: run.created_at });
  }

  return DX_STEPS.map((step) => {
    const row = bySlug.get(step.slug) || null;
    const latest = step.engine ? latestByKey.get(step.engine) || null : null;
    const hasRun = !!latest;
    const manual = !!row?.completed;
    const effectiveComplete = manual || (!!step.engine && hasRun);
    return {
      step,
      row,
      hasRun,
      lastRunAt: latest?.created_at ?? null,
      lastRunId: latest?.id ?? null,
      effectiveComplete,
      detectedFromRun: !manual && effectiveComplete,
    };
  });
}

export const dxProgress = (statuses: DxStepStatus[]) => {
  const total = statuses.length;
  const done = statuses.filter((s) => s.effectiveComplete).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
};
