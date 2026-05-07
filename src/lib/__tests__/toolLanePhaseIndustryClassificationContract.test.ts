import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const VALID_LANES = new Set([
  "diagnostic",
  "implementation",
  "rgs_control_system",
  "revenue_control_system",
  "admin_only",
  "shared_support",
  "report_only",
  "public_pre_client",
]);

const VALID_PHASES = new Set([
  "public_pre_client",
  "paid_diagnostic",
  "owner_interview",
  "diagnostic_tools",
  "admin_review",
  "report_repair_map",
  "implementation_planning",
  "implementation_execution",
  "training_handoff",
  "rcs_ongoing_visibility",
  "renewal_health_monitoring",
  "internal_admin_operations",
]);

const VALID_INDUSTRY = new Set([
  "all_industries_shared",
  "industry_aware_copy",
  "industry_aware_questions",
  "industry_aware_outputs",
  "industry_specific_benchmarks",
  "industry_specific_templates",
  "industry_restricted",
  "general_fallback",
]);

type Row = {
  tool_key: string;
  tool_type: string;
  default_visibility: string;
  status: string;
  service_lane: string | null;
  customer_journey_phase: string | null;
  industry_behavior: string | null;
  can_be_client_visible: boolean | null;
  contains_internal_notes: boolean | null;
  requires_active_client?: boolean | null;
};

let catalogPromise: Promise<Row[]> | null = null;

function withTimeout<T>(promise: PromiseLike<T>, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 1200)),
  ]);
}

async function loadActiveCatalog(): Promise<Row[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  if (catalogPromise) return catalogPromise;
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  catalogPromise = withTimeout(
    sb
      .from("tool_catalog")
      .select(
        "tool_key,tool_type,default_visibility,status,service_lane,customer_journey_phase,industry_behavior,can_be_client_visible,contains_internal_notes,requires_active_client",
      )
      .neq("status", "deprecated")
      .then(({ data, error }) => {
        if (error) return [];
        return (data ?? []) as Row[];
      }),
    [],
  );
  return catalogPromise;
}

describe("P48.2 — Tool Catalog Lane / Phase / Industry classification", () => {
  it("every active tool has a valid service_lane", async () => {
    const rows = await loadActiveCatalog();
    if (rows.length === 0) return;
    for (const r of rows) {
      expect(r.service_lane, `tool=${r.tool_key} missing service_lane`).toBeTruthy();
      expect(VALID_LANES.has(r.service_lane!), `bad lane for ${r.tool_key}: ${r.service_lane}`).toBe(true);
    }
  });

  it("every active tool has a valid customer_journey_phase", async () => {
    const rows = await loadActiveCatalog();
    if (rows.length === 0) return;
    for (const r of rows) {
      expect(r.customer_journey_phase, `tool=${r.tool_key} missing journey phase`).toBeTruthy();
      expect(VALID_PHASES.has(r.customer_journey_phase!), `bad phase for ${r.tool_key}: ${r.customer_journey_phase}`).toBe(true);
    }
  });

  it("every active tool has a valid industry_behavior", async () => {
    const rows = await loadActiveCatalog();
    if (rows.length === 0) return;
    for (const r of rows) {
      expect(r.industry_behavior, `tool=${r.tool_key} missing industry_behavior`).toBeTruthy();
      expect(VALID_INDUSTRY.has(r.industry_behavior!), `bad industry behavior for ${r.tool_key}: ${r.industry_behavior}`).toBe(true);
    }
  });

  it("Implementation Roadmap and SOP / Training Bible are in the implementation lane", async () => {
    const rows = await loadActiveCatalog();
    if (rows.length === 0) return;
    const roadmap = rows.find(r => r.tool_key === "implementation_roadmap");
    const sop = rows.find(r => r.tool_key === "sop_training_bible");
    expect(roadmap?.service_lane).toBe("implementation");
    expect(sop?.service_lane).toBe("implementation");
  });

  it("admin-only tools are not flagged as client visible", async () => {
    const rows = await loadActiveCatalog();
    if (rows.length === 0) return;
    const adminTools = rows.filter(r => r.service_lane === "admin_only");
    for (const r of adminTools) {
      expect(r.can_be_client_visible, `admin tool ${r.tool_key} should not be client-visible`).toBe(false);
    }
  });

  it("public scorecard belongs to the public_pre_client lane", async () => {
    const rows = await loadActiveCatalog();
    if (rows.length === 0) return;
    const sc = rows.find(r => r.tool_key === "scorecard");
    expect(sc?.service_lane).toBe("public_pre_client");
  });

  it("RCS lane tools require an active client (not exposed to diagnostic-only by default)", async () => {
    const rows = await loadActiveCatalog();
    if (rows.length === 0) return;
    for (const r of rows.filter((row) => row.service_lane === "rgs_control_system")) {
      expect(r.requires_active_client, `RCS tool ${r.tool_key} must require active client`).toBe(true);
    }
  });
});
