// P6 Pass C — Diagnostic draft + handoff helpers.
// Reuses business_control_reports (no schema change). report_type is constrained
// to 'monthly' | 'quarterly', so we tag diagnostic-purpose reports via
// report_data.reportPurpose = "diagnostic" and use 'monthly' as the closest fit.
import { supabase } from "@/integrations/supabase/client";
import { REPORT_SCHEMA_VERSION, type ReportSection, type ReportSnapshot } from "@/lib/bcc/reportTypes";
import { INTAKE_SECTIONS, buildIntakeProgress, type IntakeAnswerRow } from "./intake";
import { DX_STEPS, type DiagnosticEngineKey } from "./checklist";

export const DIAGNOSTIC_REPORT_PURPOSE = "diagnostic" as const;

const ENGINE_LABELS: Record<DiagnosticEngineKey, string> = {
  rgs_stability_scorecard: "Business Stability Index™",
  revenue_leak_finder: "Revenue Leak Detection Engine™",
  buyer_persona_tool: "Buyer Intelligence Engine™",
  customer_journey_mapper: "Customer Journey Mapping System™",
  process_breakdown_tool: "Process Clarity Engine™",
};

const ENGINE_ORDER: DiagnosticEngineKey[] = [
  "rgs_stability_scorecard",
  "revenue_leak_finder",
  "buyer_persona_tool",
  "customer_journey_mapper",
  "process_breakdown_tool",
];

const NEEDS_REVIEW = "Needs RGS review · data missing or low confidence.";

type ToolRunRow = {
  id: string;
  tool_key: string;
  title: string | null;
  summary: any;
  data: any;
  created_at: string;
};

type ChecklistRow = { id: string; title: string | null; completed: boolean | null; completed_at: string | null };

export type DiagnosticReadiness = {
  intakeComplete: boolean;
  enginesComplete: boolean;
  reviewDone: boolean;
  /** True when intake is complete AND every engine has a tool run AND review step is not yet completed. */
  ready: boolean;
};

export function computeDiagnosticReadiness(args: {
  intakeAnswers: IntakeAnswerRow[];
  toolRuns: { tool_key: string }[];
  checklist: ChecklistRow[];
}): DiagnosticReadiness {
  const intakeComplete = buildIntakeProgress(args.intakeAnswers).status === "complete";
  const runKeys = new Set(args.toolRuns.map((r) => r.tool_key));
  const enginesComplete = ENGINE_ORDER.every((k) => runKeys.has(k));
  const reviewRow = args.checklist.find((r) => (r.title || "").includes("[DX] review "));
  const reviewDone = !!reviewRow?.completed;
  return {
    intakeComplete,
    enginesComplete,
    reviewDone,
    ready: intakeComplete && enginesComplete && !reviewDone,
  };
}

/** Stringify any tool-run summary/data so we can show *something* even if shape varies. */
function summariseRun(run: ToolRunRow | undefined): { body: string; bullets: string[] } {
  if (!run) return { body: NEEDS_REVIEW, bullets: [] };
  const bullets: string[] = [];
  const s = run.summary;
  if (s && typeof s === "object" && !Array.isArray(s)) {
    for (const [k, v] of Object.entries(s)) {
      if (v == null) continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        bullets.push(`${k}: ${v}`);
      } else if (Array.isArray(v)) {
        bullets.push(`${k}: ${v.length} item${v.length === 1 ? "" : "s"}`);
      }
      if (bullets.length >= 6) break;
    }
  } else if (typeof s === "string") {
    bullets.push(s);
  }
  if (bullets.length === 0 && run.data && typeof run.data === "object") {
    const keys = Object.keys(run.data);
    if (keys.length > 0) bullets.push(`Captured fields: ${keys.slice(0, 6).join(", ")}`);
  }
  const body = run.title
    ? `Latest run: ${run.title} (${new Date(run.created_at).toLocaleDateString()}).`
    : `Latest run captured ${new Date(run.created_at).toLocaleDateString()}.`;
  return { body, bullets };
}

function pickAnswer(answers: IntakeAnswerRow[], key: string): string | null {
  const row = answers.find((a) => a.section_key === key);
  const v = (row?.answer || "").trim();
  return v ? v : null;
}

/** Build the full ReportSnapshot for a diagnostic draft. */
export function buildDiagnosticDraftSnapshot(args: {
  customer: { id: string; full_name?: string | null; business_name?: string | null };
  intakeAnswers: IntakeAnswerRow[];
  toolRuns: ToolRunRow[];
  checklist: ChecklistRow[];
  uploadsCount: number;
}): ReportSnapshot & { reportPurpose: typeof DIAGNOSTIC_REPORT_PURPOSE } {
  const { customer, intakeAnswers, toolRuns, checklist, uploadsCount } = args;

  // Latest run per engine
  const latestByKey = new Map<string, ToolRunRow>();
  for (const r of toolRuns) {
    const prev = latestByKey.get(r.tool_key);
    if (!prev || new Date(r.created_at) > new Date(prev.created_at)) latestByKey.set(r.tool_key, r);
  }

  const progress = buildIntakeProgress(intakeAnswers);
  const dxRows = checklist.filter((r) => (r.title || "").startsWith("[DX]"));
  const dxDone = dxRows.filter((r) => r.completed).length;

  const sections: ReportSection[] = [];

  // 1. Executive Summary
  sections.push({
    title: "Executive Summary",
    body:
      `RGS Diagnostic draft for ${customer.business_name || customer.full_name || "client"}. ` +
      `Intake ${progress.status} (${progress.requiredFilled}/${progress.requiredTotal} required sections), ` +
      `${latestByKey.size}/${ENGINE_ORDER.length} Diagnostic Engines™ run, ` +
      `${dxDone}/${dxRows.length || DX_STEPS.length} delivery checklist steps complete. ` +
      `This draft is auto-assembled from existing intake and tool data — RGS owns interpretation and final framing.`,
    severity: progress.status === "complete" && latestByKey.size === ENGINE_ORDER.length ? "ok" : "watch",
  });

  // 2. Business Context / Intake Summary
  const businessOverview = pickAnswer(intakeAnswers, "business_overview");
  const primaryOffer = pickAnswer(intakeAnswers, "primary_offer");
  const goals = pickAnswer(intakeAnswers, "diagnostic_goals");
  const ctxBullets: string[] = [];
  for (const sec of INTAKE_SECTIONS) {
    const v = pickAnswer(intakeAnswers, sec.key);
    if (v) ctxBullets.push(`${sec.label}: ${v.length > 240 ? v.slice(0, 240) + "…" : v}`);
  }
  sections.push({
    title: "Business Context / Intake Summary",
    body: businessOverview || primaryOffer || goals || NEEDS_REVIEW,
    bullets: ctxBullets.length > 0 ? ctxBullets : undefined,
    severity: progress.status === "complete" ? "ok" : progress.status === "partial" ? "watch" : "warn",
  });

  // 3–7. Engine findings
  for (const key of ENGINE_ORDER) {
    const run = latestByKey.get(key);
    const { body, bullets } = summariseRun(run);
    sections.push({
      title: `${ENGINE_LABELS[key]} Findings`,
      body,
      bullets: bullets.length > 0 ? bullets : undefined,
      severity: run ? "ok" : "warn",
    });
  }

  // 8. Buyer Persona (sourced from buyer_persona_tool + best_fit_buyer)
  const bestFit = pickAnswer(intakeAnswers, "best_fit_buyer");
  const personaRun = latestByKey.get("buyer_persona_tool");
  sections.push({
    title: "Buyer Persona",
    body: bestFit || (personaRun ? "Drawn from Buyer Intelligence Engine™ run." : NEEDS_REVIEW),
    bullets: personaRun ? summariseRun(personaRun).bullets : undefined,
    severity: bestFit || personaRun ? "ok" : "warn",
  });

  // 9. Outreach Channels (lead_sources + journey/persona context)
  const leadSources = pickAnswer(intakeAnswers, "lead_sources");
  sections.push({
    title: "Outreach Channels",
    body: leadSources || NEEDS_REVIEW,
    severity: leadSources ? "ok" : "warn",
  });

  // 10. Conversion Flow Map (sales_process + customer_journey + journey mapper)
  const sales = pickAnswer(intakeAnswers, "sales_process");
  const journey = pickAnswer(intakeAnswers, "customer_journey");
  const journeyRun = latestByKey.get("customer_journey_mapper");
  const flowBullets: string[] = [];
  if (sales) flowBullets.push(`Sales process: ${sales}`);
  if (journey) flowBullets.push(`Customer journey: ${journey}`);
  if (journeyRun) flowBullets.push(...summariseRun(journeyRun).bullets);
  sections.push({
    title: "Conversion Flow Map",
    body: sales || journey ? "Drawn from intake + Customer Journey Mapping System™." : NEEDS_REVIEW,
    bullets: flowBullets.length > 0 ? flowBullets : undefined,
    severity: sales || journey || journeyRun ? "ok" : "warn",
  });

  // 11. Revenue Metrics (pricing + revenue model + leak finder)
  const pricing = pickAnswer(intakeAnswers, "pricing_model");
  const revenueModel = pickAnswer(intakeAnswers, "revenue_model");
  const leakRun = latestByKey.get("revenue_leak_finder");
  const revBullets: string[] = [];
  if (pricing) revBullets.push(`Pricing model: ${pricing}`);
  if (revenueModel) revBullets.push(`Revenue model: ${revenueModel}`);
  if (leakRun) revBullets.push(...summariseRun(leakRun).bullets);
  sections.push({
    title: "Revenue Metrics",
    body: pricing || revenueModel ? "Drawn from intake + Revenue Leak Detection Engine™." : NEEDS_REVIEW,
    bullets: revBullets.length > 0 ? revBullets : undefined,
    severity: pricing || revenueModel || leakRun ? "ok" : "warn",
  });

  // 12. Strategy Plan
  const blockers = pickAnswer(intakeAnswers, "revenue_blockers");
  const opsBlockers = pickAnswer(intakeAnswers, "ops_blockers");
  const constraints = pickAnswer(intakeAnswers, "constraints");
  const stratBullets: string[] = [];
  if (blockers) stratBullets.push(`Revenue blockers: ${blockers}`);
  if (opsBlockers) stratBullets.push(`Operational blockers: ${opsBlockers}`);
  if (constraints) stratBullets.push(`Non-negotiables: ${constraints}`);
  sections.push({
    title: "Strategy Plan",
    body: blockers ? "Sequencing recommendation pending RGS review." : NEEDS_REVIEW,
    bullets: stratBullets.length > 0 ? stratBullets : undefined,
    severity: blockers ? "watch" : "warn",
  });

  // 13. Recommended Implementation Priorities
  sections.push({
    title: "Recommended Implementation Priorities",
    body:
      "Drafted from intake blockers + engine findings. RGS to confirm sequencing, " +
      "first implementation milestone, and whether Revenue Control System™ is " +
      "appropriate as an ongoing-control add-on (not included in the diagnostic).",
    bullets: [
      "Confirm strongest revenue leak from Revenue Leak Detection Engine™",
      "Lock buyer persona language for outreach + sales scripts",
      "Define first conversion flow fix + owner",
      "Recommend Revenue Control System™ if appropriate (optional ongoing-control add-on)",
    ],
    severity: "watch",
  });

  // 14. Missing / Low-Confidence Data
  const missingBullets: string[] = [];
  if (progress.missingRequired.length > 0) {
    missingBullets.push(
      `Required intake sections still missing: ${progress.missingRequired.map((s) => s.label).join("; ")}`,
    );
  }
  for (const key of ENGINE_ORDER) {
    if (!latestByKey.get(key)) missingBullets.push(`No ${ENGINE_LABELS[key]} run yet`);
  }
  if (uploadsCount === 0) missingBullets.push("No client uploads on record");
  sections.push({
    title: "Missing / Low-Confidence Data",
    body: missingBullets.length === 0 ? "All inputs present." : "The following inputs are missing or low confidence:",
    bullets: missingBullets.length > 0 ? missingBullets : undefined,
    severity: missingBullets.length === 0 ? "ok" : "warn",
  });

  // 15. RGS Review Notes Placeholder
  sections.push({
    title: "RGS Review Notes",
    body:
      "RGS to add final diagnosis, sales recommendation, and implementation recommendation here. " +
      "This draft remains in `draft` status until RGS publishes it from the Reports & Reviews™ editor.",
    severity: "watch",
  });

  const today = new Date();
  const periodStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const periodEnd = today.toISOString().slice(0, 10);

  const confidence: "high" | "medium" | "low" =
    progress.status === "complete" && latestByKey.size === ENGINE_ORDER.length
      ? "high"
      : progress.status !== "missing" && latestByKey.size >= 3
        ? "medium"
        : "low";

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportType: "monthly", // satisfies parser; purpose is diagnostic
    reportPurpose: DIAGNOSTIC_REPORT_PURPOSE,
    periodStart,
    periodEnd,
    generatedAt: new Date().toISOString(),
    customerLabel: customer.business_name || customer.full_name || "Client",
    healthScore: null,
    condition: "Diagnostic draft",
    confidence,
    confidenceNote:
      "Confidence based on intake completeness and Diagnostic Engine™ run coverage.",
    recommendedNextStep: "Implementation",
    recommendationReason: "Pending RGS review of diagnostic findings.",
    sections,
    meta: { weeksCovered: 0, advancedWeeks: 0, totalRevenue: 0, totalExpenses: 0, netCash: 0 },
  };
}

/** Find the most recent diagnostic-purpose draft for a customer (if any). */
export async function findExistingDiagnosticDraft(customerId: string) {
  const { data } = await supabase
    .from("business_control_reports")
    .select("id, status, report_data, updated_at")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false })
    .limit(20);
  const rows = (data || []) as Array<{ id: string; status: string; report_data: any; updated_at: string }>;
  return rows.find(
    (r) => r.status === "draft" && r.report_data?.reportPurpose === DIAGNOSTIC_REPORT_PURPOSE,
  ) || null;
}

/** Create or regenerate a diagnostic draft. Returns the report id. */
export async function createDiagnosticDraft(opts: {
  customerId: string;
  snapshot: ReturnType<typeof buildDiagnosticDraftSnapshot>;
  createdBy: string | null;
  /** When true, overwrite an existing diagnostic draft instead of creating a new one. */
  regenerate?: boolean;
}): Promise<{ id: string; created: boolean }> {
  const { customerId, snapshot, createdBy, regenerate } = opts;
  const existing = await findExistingDiagnosticDraft(customerId);

  if (existing && regenerate) {
    const { error } = await supabase
      .from("business_control_reports")
      .update({
        report_data: snapshot as any,
        period_start: snapshot.periodStart,
        period_end: snapshot.periodEnd,
        recommended_next_step: snapshot.recommendedNextStep,
      })
      .eq("id", existing.id);
    if (error) throw error;
    await supabase.from("customer_timeline").insert([
      {
        customer_id: customerId,
        event_type: "diagnostic_draft_regenerated",
        title: "Diagnostic draft regenerated",
        detail: "Auto-assembled from latest intake and Diagnostic Engine™ runs.",
      },
    ]);
    return { id: existing.id, created: false };
  }

  if (existing && !regenerate) {
    return { id: existing.id, created: false };
  }

  const { data, error } = await supabase
    .from("business_control_reports")
    .insert([
      {
        customer_id: customerId,
        report_type: "monthly", // closest allowed value; purpose stored in report_data
        status: "draft",
        period_start: snapshot.periodStart,
        period_end: snapshot.periodEnd,
        report_data: snapshot as any,
        recommended_next_step: snapshot.recommendedNextStep,
        created_by: createdBy,
      },
    ])
    .select("id")
    .single();
  if (error) throw error;

  await supabase.from("customer_timeline").insert([
    {
      customer_id: customerId,
      event_type: "diagnostic_draft_prepared",
      title: "Diagnostic draft prepared",
      detail: "Auto-assembled from intake and Diagnostic Engine™ runs. RGS to review and publish.",
    },
  ]);

  return { id: data.id, created: true };
}

// ---------------- Implementation Handoff Tasks ----------------

export const HANDOFF_TASK_TITLES = [
  "Review diagnostic findings with client",
  "Confirm implementation recommendation",
  "Define first implementation priority",
  "Schedule implementation kickoff",
  "Recommend Revenue Control System™ if appropriate (confirm whether included)",
] as const;

const HANDOFF_TAG = "[HANDOFF]";

export async function createHandoffTasks(opts: {
  customerId: string;
  createdBy: string | null;
}): Promise<{ created: number; skipped: number }> {
  const { customerId, createdBy } = opts;

  const { data: existing } = await supabase
    .from("customer_tasks")
    .select("id, title")
    .eq("customer_id", customerId);

  const existingTitles = new Set((existing || []).map((t) => (t as any).title as string));
  const toInsert = HANDOFF_TASK_TITLES.filter(
    (title) => !existingTitles.has(`${HANDOFF_TAG} ${title}`),
  ).map((title) => ({
    customer_id: customerId,
    title: `${HANDOFF_TAG} ${title}`,
    description: "Created by RGS implementation handoff prep.",
    status: "open",
    created_by: createdBy,
  }));

  if (toInsert.length === 0) return { created: 0, skipped: HANDOFF_TASK_TITLES.length };

  const { error } = await supabase.from("customer_tasks").insert(toInsert);
  if (error) throw error;

  await supabase.from("customer_timeline").insert([
    {
      customer_id: customerId,
      event_type: "implementation_handoff_prepared",
      title: "Implementation handoff prepared",
      detail: `${toInsert.length} handoff task${toInsert.length === 1 ? "" : "s"} created. RGS to confirm with client.`,
    },
  ]);

  return { created: toInsert.length, skipped: HANDOFF_TASK_TITLES.length - toInsert.length };
}

export const isHandoffTaskTitle = (title: string | null | undefined) =>
  !!title && title.startsWith(HANDOFF_TAG);
