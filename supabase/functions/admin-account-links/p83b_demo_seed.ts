/**
 * P83B — Demo Account Auto-Seeding (Prairie Ridge HVAC Demo Co.)
 *
 * Called from the admin-account-links edge function immediately after a
 * `signup_request` is approved as `approved_demo`. Provisions a polished,
 * realistic, demo-safe Owner Portal experience for outside testers.
 *
 * Hard rules:
 *   - only ever touches the demo customer row passed in
 *   - all rows scoped to that customer_id (RLS-enforced for non-admin reads)
 *   - never seeds: real client data, AI prompts, Industry Brain internals,
 *     deterministic scoring source tables, secrets, production webhook data
 *   - idempotent: safe to re-run; uses metadata markers + uniqueness checks
 *   - all client-visible flags set so the Owner Portal isn't empty, but
 *     admin-only fields (admin_notes, admin_only_note, admin_interpretation,
 *     internal_notes) stay null
 */

type AdminClient = ReturnType<
  typeof import("https://esm.sh/@supabase/supabase-js@2.45.0").createClient
>;

const DEMO_MARKER = "p83b_demo_prairie_ridge";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function dateOnlyDaysAgo(days: number): string {
  return isoDaysAgo(days).slice(0, 10);
}

async function seedTimeline(admin: AdminClient, customerId: string) {
  const { data: existing } = await admin
    .from("customer_timeline")
    .select("id")
    .eq("customer_id", customerId)
    .eq("event_type", "demo_workspace_seeded")
    .maybeSingle();
  if (existing?.id) return;
  await admin.from("customer_timeline").insert([
    {
      customer_id: customerId,
      event_type: "demo_workspace_seeded",
      title: "Demo workspace seeded",
      detail: "Prairie Ridge HVAC Demo Co. — synthetic data provisioned for tester preview.",
    },
    {
      customer_id: customerId,
      event_type: "demo_owner_interview_recorded",
      title: "Owner interview recorded (demo)",
      detail: "Owner-led HVAC business with decent demand but weak follow-up and limited financial visibility.",
    },
  ]);
}

async function seedScorecardLensRun(admin: AdminClient, customerId: string) {
  const { data: existing } = await admin
    .from("stability_to_value_lens_runs")
    .select("id, result_payload")
    .eq("customer_id", customerId);
  const already = (existing ?? []).some(
    (r: any) => r?.result_payload?.demo_marker === DEMO_MARKER,
  );
  if (already) return;
  await admin.from("stability_to_value_lens_runs").insert({
    customer_id: customerId,
    run_name: "Prairie Ridge HVAC — Stability Snapshot (demo)",
    status: "client_visible",
    total_score: 58,
    demand_generation_score: 72,
    revenue_conversion_score: 48,
    operational_efficiency_score: 55,
    financial_visibility_score: 44,
    owner_independence_score: 50,
    structure_rating: "developing",
    perceived_operational_risk_level: "elevated",
    transferability_readiness_label: "early_stage",
    client_safe_summary:
      "Demand is steady, but revenue is leaking through quote follow-up, and the owner is still central to most operational decisions.",
    approved_for_client: true,
    client_visible: true,
    include_in_report: true,
    reviewed_at: isoDaysAgo(2),
    result_payload: { demo_marker: DEMO_MARKER, gears_at_risk: ["revenue_conversion", "financial_visibility", "owner_independence"] },
  });
}

async function seedCostOfFriction(admin: AdminClient, customerId: string) {
  const { data: existing } = await admin
    .from("cost_of_friction_runs")
    .select("id, result_payload")
    .eq("customer_id", customerId);
  if ((existing ?? []).some((r: any) => r?.result_payload?.demo_marker === DEMO_MARKER)) return;
  await admin.from("cost_of_friction_runs").insert({
    customer_id: customerId,
    run_name: "Prairie Ridge HVAC — Cost of Friction (demo)",
    status: "client_visible",
    monthly_total: 11400,
    annual_total: 136800,
    demand_generation_total: 1800,
    revenue_conversion_total: 4800,
    operational_efficiency_total: 2200,
    financial_visibility_total: 1600,
    owner_independence_total: 1000,
    client_visible: true,
    approved_for_client: true,
    include_in_report: true,
    client_safe_summary:
      "An estimated $11,400/month is leaving the business through slipped quotes, scheduling rework, and unclear job-cost visibility.",
    reviewed_at: isoDaysAgo(2),
    result_payload: { demo_marker: DEMO_MARKER, top_driver: "quote_followup_slip" },
    assumptions_payload: { quotes_per_month: 60, close_rate_target: 0.45, current_close_rate: 0.31 },
  });
}

async function seedWornToothSignals(admin: AdminClient, customerId: string) {
  const { data: existing } = await admin
    .from("worn_tooth_signals")
    .select("signal_key")
    .eq("customer_id", customerId);
  const have = new Set((existing ?? []).map((r: any) => r.signal_key));
  const rows = [
    {
      signal_key: `${DEMO_MARKER}__quote_followup_slip`,
      signal_title: "Quote follow-up slipping past 72 hours",
      gear: "revenue_conversion",
      severity: "high",
      trend: "worsening",
      status: "client_visible",
      client_safe_summary: "About 1 in 3 estimates aren't followed up within the first 3 days.",
      client_safe_explanation:
        "When quotes go quiet for 3+ days, close rate drops sharply. Tightening this single cadence is usually the highest-ROI move.",
      recommended_owner_action: "Set a 48-hour follow-up rule and assign a single owner.",
      approved_for_client: true,
      client_visible: true,
      include_in_report: true,
      professional_review_recommended: false,
      reviewed_at: isoDaysAgo(2),
    },
    {
      signal_key: `${DEMO_MARKER}__handoff_breakage`,
      signal_title: "Scheduling-to-tech handoff breaks weekly",
      gear: "operational_efficiency",
      severity: "medium",
      trend: "flat",
      status: "client_visible",
      client_safe_summary: "Job details are getting lost between dispatch and the tech in the field.",
      client_safe_explanation:
        "Multiple jobs/week show missing parts, missing notes, or wrong arrival windows — all tied to the same handoff gap.",
      recommended_owner_action: "Standardize the dispatch → tech handoff with a single shared checklist.",
      approved_for_client: true,
      client_visible: true,
      include_in_report: true,
      professional_review_recommended: false,
      reviewed_at: isoDaysAgo(2),
    },
    {
      signal_key: `${DEMO_MARKER}__job_cost_blind`,
      signal_title: "Job-level profitability is not visible",
      gear: "financial_visibility",
      severity: "medium",
      trend: "flat",
      status: "client_visible",
      client_safe_summary: "Owner can't tell which job types actually make money.",
      client_safe_explanation:
        "Without per-job cost rollups, pricing is being adjusted on instinct instead of on margin.",
      recommended_owner_action: "Pick one job type and instrument true cost-to-deliver.",
      approved_for_client: true,
      client_visible: true,
      include_in_report: true,
      professional_review_recommended: false,
      reviewed_at: isoDaysAgo(2),
    },
    {
      signal_key: `${DEMO_MARKER}__owner_bottleneck`,
      signal_title: "Owner is in the path of most decisions",
      gear: "owner_independence",
      severity: "medium",
      trend: "flat",
      status: "client_visible",
      client_safe_summary: "Most pricing, scheduling, and rework decisions still require the owner.",
      client_safe_explanation:
        "The business runs through one person — that's a structural risk and a growth ceiling.",
      recommended_owner_action: "Document 3 most-asked decisions and delegate with clear guardrails.",
      approved_for_client: true,
      client_visible: true,
      include_in_report: true,
      professional_review_recommended: false,
      reviewed_at: isoDaysAgo(2),
    },
  ].filter((r) => !have.has(r.signal_key));
  if (rows.length === 0) return;
  await admin.from("worn_tooth_signals").insert(rows);
}

async function seedRealityCheckFlags(admin: AdminClient, customerId: string) {
  const { data: existing } = await admin
    .from("reality_check_flags")
    .select("id, evidence_gap")
    .eq("customer_id", customerId);
  const marker = `[${DEMO_MARKER}]`;
  if ((existing ?? []).some((r: any) => (r.evidence_gap ?? "").includes(marker))) return;
  await admin.from("reality_check_flags").insert([
    {
      customer_id: customerId,
      title: "Owner says close rate is ~50%, dispatch data shows ~31%",
      summary: "Stated close rate doesn't match recent quoting activity.",
      affected_gear: "revenue_conversion",
      affected_metric: "close_rate",
      flag_type: "owner_claim_unsupported",
      severity: "watch",
      status: "client_visible",
      owner_claim: "We close about half of what we quote.",
      evidence_gap: `${marker} 31% close rate observed across last 60 quotes.`,
      client_visible_explanation:
        "Close rate appears closer to 31% — worth confirming so the right gear gets the work.",
      professional_review_recommended: false,
      client_visible: true,
      approved_for_client: true,
      include_in_report: true,
    },
  ]);
}

async function seedImplementationRoadmap(admin: AdminClient, customerId: string) {
  const { data: existingRoadmap } = await admin
    .from("implementation_roadmaps")
    .select("id, summary")
    .eq("customer_id", customerId);
  const marker = `[${DEMO_MARKER}]`;
  let roadmapId: string | undefined = (existingRoadmap ?? []).find(
    (r: any) => (r.summary ?? "").includes(marker),
  )?.id;
  if (!roadmapId) {
    const { data: created } = await admin
      .from("implementation_roadmaps")
      .insert({
        customer_id: customerId,
        title: "Prairie Ridge HVAC — Repair Map (demo)",
        summary: `${marker} Stabilize quote follow-up, tighten dispatch handoff, and surface job-level margin.`,
        status: "approved",
        client_visible: true,
      })
      .select("id")
      .single();
    roadmapId = created?.id;
  }
  if (!roadmapId) return;

  const items = [
    {
      roadmap_id: roadmapId,
      customer_id: customerId,
      gear: "revenue_conversion",
      title: "Install 48-hour quote follow-up cadence",
      description: "One owner, one cadence, no estimate sits longer than 48 hours without contact.",
      client_summary: "Tighten quote follow-up to 48 hours.",
      priority: "high",
      impact: "high",
      effort: "low",
      phase: "stabilize",
      owner_type: "client",
      status: "in_progress",
      sort_order: 1,
      client_visible: true,
    },
    {
      roadmap_id: roadmapId,
      customer_id: customerId,
      gear: "operational_efficiency",
      title: "Standardize dispatch → tech handoff",
      description: "Single shared checklist for parts, notes, and arrival window.",
      client_summary: "Standardize the dispatch handoff.",
      priority: "medium",
      impact: "medium",
      effort: "medium",
      phase: "install",
      owner_type: "shared",
      status: "not_started",
      sort_order: 2,
      client_visible: true,
    },
    {
      roadmap_id: roadmapId,
      customer_id: customerId,
      gear: "financial_visibility",
      title: "Job-level cost rollup for top job type",
      description: "Pick one job type; capture parts, labor, and rework against actual revenue.",
      client_summary: "See which jobs actually make money.",
      priority: "medium",
      impact: "high",
      effort: "medium",
      phase: "install",
      owner_type: "shared",
      status: "not_started",
      sort_order: 3,
      client_visible: true,
    },
    {
      roadmap_id: roadmapId,
      customer_id: customerId,
      gear: "owner_independence",
      title: "Document the 3 most-asked owner decisions",
      description: "Write down the rule, who owns it, and the guardrails.",
      client_summary: "Get the owner out of recurring decisions.",
      priority: "medium",
      impact: "medium",
      effort: "low",
      phase: "train",
      owner_type: "client",
      status: "not_started",
      sort_order: 4,
      client_visible: true,
    },
  ];
  // Idempotency: skip items whose title already exists for this roadmap.
  const { data: existingItems } = await admin
    .from("implementation_roadmap_items")
    .select("title")
    .eq("roadmap_id", roadmapId);
  const have = new Set((existingItems ?? []).map((r: any) => r.title));
  const toInsert = items.filter((i) => !have.has(i.title));
  if (toInsert.length) await admin.from("implementation_roadmap_items").insert(toInsert);
}

async function seedOperationalSops(admin: AdminClient, customerId: string) {
  const { data: existing } = await admin
    .from("operational_sops")
    .select("id, title")
    .eq("customer_id", customerId);
  const have = new Set((existing ?? []).map((r: any) => r.title));
  const rows = [
    {
      customer_id: customerId,
      title: "Quote follow-up cadence (demo)",
      category: "revenue_conversion",
      status: "in_progress",
      owner_role: "owner",
      step_count: 5,
      documented_level: "draft",
      last_reviewed_at: dateOnlyDaysAgo(7),
      tooling_used: "CRM + shared inbox",
      notes: "Demo SOP — document the 48-hour rule and assigned owner.",
    },
    {
      customer_id: customerId,
      title: "Dispatch → tech job handoff (demo)",
      category: "operational_efficiency",
      status: "not_started",
      owner_role: "operations_lead",
      step_count: 7,
      documented_level: "none",
      last_reviewed_at: null,
      tooling_used: "Field app + checklist",
      notes: "Demo SOP — every job gets a parts/notes/arrival-window check.",
    },
  ].filter((r) => !have.has(r.title));
  if (rows.length) await admin.from("operational_sops").insert(rows);
}

export async function seedPrairieRidgeDemoWorkspace(
  admin: AdminClient,
  customerId: string,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  // Each step is independently safe + idempotent. We collect errors but don't
  // abort — a partial seed is better than no seed for a tester.
  for (const [name, fn] of [
    ["timeline", () => seedTimeline(admin, customerId)],
    ["scorecard_lens", () => seedScorecardLensRun(admin, customerId)],
    ["cost_of_friction", () => seedCostOfFriction(admin, customerId)],
    ["worn_tooth_signals", () => seedWornToothSignals(admin, customerId)],
    ["reality_check_flags", () => seedRealityCheckFlags(admin, customerId)],
    ["implementation_roadmap", () => seedImplementationRoadmap(admin, customerId)],
    ["operational_sops", () => seedOperationalSops(admin, customerId)],
  ] as const) {
    try {
      await fn();
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export const P83B_DEMO_MARKER = DEMO_MARKER;
export const P83B_DEMO_BUSINESS_NAME = "Prairie Ridge HVAC Demo Co.";
export const P83B_DEMO_INDUSTRY = "trade_field_service";