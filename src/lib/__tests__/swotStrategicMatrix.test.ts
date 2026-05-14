import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  defaultInternalExternal,
  inferGear,
  inferSeverity,
  normalizeSwotItem,
  isMissingEvidence,
} from "@/lib/swot/swotEngine";
import {
  deriveSignalsForItem,
  buildSwotSignalSummary,
  getCampaignRelevantSwotSignals,
  getRepairMapRelevantSwotSignals,
  getImplementationRelevantSwotSignals,
  getControlSystemWatchSignals,
  getReengagementTriggerSignals,
  SWOT_SCOPE_DISCLAIMER,
} from "@/lib/swot/swotSignals";
import {
  isSwotAiLive,
  SWOT_AI_FORBIDDEN,
  SWOT_AI_SYSTEM_PROMPT,
} from "@/lib/swot/swotAiBrain";
import type { SwotItem, SwotItemInput } from "@/lib/swot/types";

const root = process.cwd();
const allMigrations = () =>
  readdirSync(join(root, "supabase/migrations"))
    .filter(f => f.endsWith(".sql"))
    .map(f => readFileSync(join(root, "supabase/migrations", f), "utf8"))
    .join("\n");

const ctx = {
  customer_id: "cust-1",
  swot_analysis_id: "an-1",
  swot_item_id: "it-1",
};

function makeItem(over: Partial<SwotItem> = {}): SwotItem {
  return {
    id: "it-1",
    swot_analysis_id: "an-1",
    customer_id: "cust-1",
    category: "weakness",
    title: "Item",
    description: null,
    evidence_summary: null,
    evidence_confidence: "partially_supported",
    source_type: "manual",
    linked_gear: "multiple",
    severity_or_leverage: "moderate",
    internal_external: "internal",
    client_safe_summary: null,
    admin_only_notes: null,
    recommended_action: null,
    repair_map_relevance: false,
    implementation_relevance: false,
    campaign_relevance: false,
    control_system_monitoring_relevance: false,
    reengagement_trigger_relevance: false,
    client_visible: false,
    display_order: 100,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

describe("RGS SWOT Strategic Matrix — engine", () => {
  it("classifies internal vs external from category", () => {
    expect(defaultInternalExternal("strength")).toBe("internal");
    expect(defaultInternalExternal("weakness")).toBe("internal");
    expect(defaultInternalExternal("opportunity")).toBe("external");
    expect(defaultInternalExternal("threat")).toBe("external");
  });

  it("infers RGS gear from keywords", () => {
    expect(inferGear("Strong referral base")).toBe("demand_generation");
    expect(inferGear("No formal lead follow-up")).toBe("demand_generation");
    expect(inferGear("Owner approves every small decision")).toBe("owner_independence");
    expect(inferGear("Cash flow visibility is poor")).toBe("financial_visibility");
    expect(inferGear("Bottleneck in fulfillment process")).toBe("operational_efficiency");
    expect(inferGear("Closing rate dropped on quotes")).toBe("revenue_conversion");
    expect(inferGear("Totally unrelated phrase")).toBe("multiple");
  });

  it("derives severity deterministically from confidence + flags", () => {
    const low = inferSeverity({ category: "weakness", title: "x", evidence_confidence: "missing_evidence" });
    expect(low).toBe("low");
    const crit = inferSeverity({
      category: "weakness", title: "x",
      evidence_confidence: "verified",
      repair_map_relevance: true, implementation_relevance: true,
      control_system_monitoring_relevance: true, campaign_relevance: true,
    } as SwotItemInput);
    expect(crit).toBe("critical");
  });

  it("normalizes inputs, never copies admin-only notes into client_safe_summary", () => {
    const n = normalizeSwotItem({
      category: "weakness",
      title: "  Owner approval bottleneck  ",
      description: "Owner approves every job",
      admin_only_notes: "internal flag: at-risk renewal",
    });
    expect(n.title).toBe("Owner approval bottleneck");
    expect(n.linked_gear).toBe("owner_independence");
    expect(n.internal_external).toBe("internal");
    expect(n.admin_only_notes).toContain("at-risk renewal");
    expect(n.client_safe_summary).toBeNull();
  });

  it("flags missing evidence", () => {
    expect(isMissingEvidence({ category: "threat", title: "x", evidence_confidence: "missing_evidence" })).toBe(true);
    expect(isMissingEvidence({ category: "threat", title: "x", evidence_confidence: "assumption" })).toBe(true);
    expect(isMissingEvidence({ category: "threat", title: "x", evidence_confidence: "verified" })).toBe(false);
  });
});

describe("RGS SWOT Strategic Matrix — signals", () => {
  it("emits evidence_needed when evidence is missing, admin-only", () => {
    const sigs = deriveSignalsForItem(ctx, makeItem({ evidence_confidence: "missing_evidence" }));
    const ev = sigs.find(s => s.signal_type === "evidence_needed");
    expect(ev).toBeTruthy();
    expect(ev!.client_safe).toBe(false);
    expect(ev!.admin_only).toBe(true);
  });

  it("maps owner_independence weakness to owner_independence_risk + implementation + reengagement", () => {
    const item = makeItem({
      title: "Owner approves every decision",
      linked_gear: "owner_independence",
      implementation_relevance: true,
      reengagement_trigger_relevance: true,
      evidence_confidence: "owner_claim_only",
    });
    const sigs = deriveSignalsForItem(ctx, item);
    const types = sigs.map(s => s.signal_type);
    expect(types).toContain("owner_independence_risk");
    expect(types).toContain("implementation_input");
    expect(types).toContain("reengagement_trigger");
    const reeng = sigs.find(s => s.signal_type === "reengagement_trigger")!;
    expect(reeng.admin_only).toBe(true);
  });

  it("maps demand opportunity + campaign relevance to campaign + buyer_persona inputs", () => {
    const item = makeItem({
      category: "opportunity",
      title: "Local event coming up",
      description: "Seasonality opportunity for ad campaign",
      linked_gear: "demand_generation",
      campaign_relevance: true,
      client_visible: true,
      client_safe_summary: "Upcoming local event creates short-term demand.",
      evidence_confidence: "verified",
    });
    const sigs = deriveSignalsForItem(ctx, item);
    const types = sigs.map(s => s.signal_type);
    expect(types).toContain("demand_opportunity");
    expect(types).toContain("campaign_input");
    expect(types).toContain("buyer_persona_input");
    const camp = sigs.find(s => s.signal_type === "campaign_input")!;
    expect(camp.client_safe).toBe(true);
    expect(camp.admin_only).toBe(false);
  });

  it("maps financial visibility weakness to financial_visibility_risk + repair", () => {
    const item = makeItem({
      title: "Cash flow visibility is poor",
      linked_gear: "financial_visibility",
      repair_map_relevance: true,
    });
    const sigs = deriveSignalsForItem(ctx, item);
    const types = sigs.map(s => s.signal_type);
    expect(types).toContain("financial_visibility_risk");
    expect(types).toContain("repair_priority");
  });

  it("maps external threat with control system monitoring to control_system_watch_item", () => {
    const item = makeItem({
      category: "threat",
      title: "New competitor opened nearby",
      linked_gear: "demand_generation",
      internal_external: "external",
      control_system_monitoring_relevance: true,
    });
    const sigs = deriveSignalsForItem(ctx, item);
    expect(sigs.map(s => s.signal_type)).toContain("control_system_watch_item");
  });

  it("filter helpers route signals to the right downstream consumers", () => {
    const items = [
      makeItem({ id: "a", linked_gear: "owner_independence", implementation_relevance: true, reengagement_trigger_relevance: true }),
      makeItem({ id: "b", category: "opportunity", linked_gear: "demand_generation", campaign_relevance: true, client_visible: true, client_safe_summary: "ok" }),
      makeItem({ id: "c", linked_gear: "operational_efficiency", repair_map_relevance: true }),
      makeItem({ id: "d", linked_gear: "financial_visibility", control_system_monitoring_relevance: true }),
    ];
    const all = buildSwotSignalSummary("cust-1", "an-1", items);
    expect(getCampaignRelevantSwotSignals(all).length).toBeGreaterThan(0);
    expect(getRepairMapRelevantSwotSignals(all).length).toBeGreaterThan(0);
    expect(getImplementationRelevantSwotSignals(all).length).toBeGreaterThan(0);
    expect(getControlSystemWatchSignals(all).length).toBeGreaterThan(0);
    expect(getReengagementTriggerSignals(all).length).toBeGreaterThan(0);
  });

  it("never emits client-safe signals when the item is not client-visible", () => {
    const item = makeItem({
      title: "Private weakness",
      linked_gear: "revenue_conversion",
      client_visible: false,
      campaign_relevance: true,
    });
    const sigs = deriveSignalsForItem(ctx, item);
    expect(sigs.every(s => s.client_safe === false)).toBe(true);
    expect(sigs.every(s => s.admin_only === true)).toBe(true);
  });
});

describe("RGS SWOT Strategic Matrix — AI brain", () => {
  it("AI is not live; readiness-only contract", () => {
    expect(isSwotAiLive()).toBe(false);
  });
  it("forbidden list covers the dangerous behaviors", () => {
    for (const f of [
      "override_deterministic_scoring",
      "invent_evidence",
      "mark_evidence_verified",
      "leak_admin_only_notes",
      "use_other_customers_data",
    ]) expect(SWOT_AI_FORBIDDEN).toContain(f);
  });
  it("system prompt enforces admin-review and scope safety", () => {
    expect(SWOT_AI_SYSTEM_PROMPT).toMatch(/AI draft/);
    expect(SWOT_AI_SYSTEM_PROMPT).toMatch(/admin review/i);
    expect(SWOT_AI_SYSTEM_PROMPT).toMatch(/operational and documentation visibility only/i);
    expect(SWOT_AI_SYSTEM_PROMPT).not.toMatch(/guarantee revenue/i);
  });
});

describe("RGS SWOT Strategic Matrix — legal/scope language", () => {
  it("scope disclaimer is safe (no banned literal phrases)", () => {
    expect(SWOT_SCOPE_DISCLAIMER).toMatch(/do not promise revenue/);
    expect(SWOT_SCOPE_DISCLAIMER).not.toMatch(/guarantee revenue/);
    expect(SWOT_SCOPE_DISCLAIMER).not.toMatch(/legally compliant/);
    expect(SWOT_SCOPE_DISCLAIMER).not.toMatch(/compliance approved/);
    expect(SWOT_SCOPE_DISCLAIMER).toMatch(/operational and documentation visibility only/);
    expect(SWOT_SCOPE_DISCLAIMER).not.toMatch(/skyrocket|explosive growth|guaranteed/i);
  });
});

describe("RGS SWOT Strategic Matrix — schema migration", () => {
  const sql = allMigrations();
  it("creates parent analyses, items, and signals tables", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.swot_analyses/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.swot_items/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.swot_signals/);
  });
  it("enables RLS on all three", () => {
    for (const t of ["swot_analyses", "swot_items", "swot_signals"]) {
      expect(sql).toMatch(new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`));
    }
  });
  it("client read policies require approved + client_visible + tenant ownership", () => {
    const m = sql.match(/CREATE POLICY "Client read own approved visible swot analyses"[\s\S]*?;/);
    expect(m).not.toBeNull();
    const body = m![0];
    expect(body).toMatch(/client_visible = true/);
    expect(body).toMatch(/status = 'approved'/);
    expect(body).toMatch(/user_owns_customer/);
  });
  it("client signal policy requires client_safe and not admin_only", () => {
    const m = sql.match(/CREATE POLICY "Client read own client-safe swot signals"[\s\S]*?;/);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/client_safe = true/);
    expect(m![0]).toMatch(/admin_only = false/);
    expect(m![0]).toMatch(/user_owns_customer/);
  });
  it("declares the signal type enum with all twelve types", () => {
    const m = sql.match(/CREATE TYPE public\.swot_signal_type AS ENUM \(([\s\S]*?)\)/);
    expect(m).not.toBeNull();
    for (const s of [
      "repair_priority","campaign_input","buyer_persona_input","implementation_input",
      "control_system_watch_item","reengagement_trigger","evidence_needed",
      "owner_independence_risk","conversion_risk","demand_opportunity",
      "financial_visibility_risk","operational_bottleneck",
    ]) expect(m![1]).toMatch(new RegExp(`'${s}'`));
  });
});