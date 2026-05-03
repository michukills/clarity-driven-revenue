import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck } from "lucide-react";

/**
 * P43.1 — Minimal admin Scope / Access Snapshot.
 *
 * Read-only summary of which RGS service lanes are active for this customer.
 * Pure aggregation of existing fields — no new toggles, no duplicated
 * assignment controls, no new RPC. Lane logic mirrors P43
 * `private.get_effective_tools_for_customer`.
 */

interface CustomerLike {
  diagnostic_payment_status?: string | null;
  diagnostic_status?: string | null;
  owner_interview_completed_at?: string | null;
  diagnostic_tools_force_unlocked?: boolean | null;
  implementation_payment_status?: string | null;
  implementation_started_at?: string | null;
  implementation_ended_at?: string | null;
  stage?: string | null;
  rcc_subscription_status?: string | null;
  rcc_paid_through?: string | null;
}

const ACTIVE_IMPL_STAGES = new Set([
  "implementation_added",
  "implementation_onboarding",
  "tools_assigned",
  "client_training_setup",
  "implementation_active",
  "waiting_on_client",
  "review_revision_window",
  "implementation",
  "work_in_progress",
]);

function deriveLanes(c: CustomerLike) {
  const diag =
    c.diagnostic_payment_status === "paid" ||
    c.diagnostic_payment_status === "waived" ||
    (!!c.diagnostic_status && c.diagnostic_status !== "not_started") ||
    !!c.owner_interview_completed_at;
  const implActive = !!c.stage && ACTIVE_IMPL_STAGES.has(c.stage);
  const impl =
    c.implementation_payment_status === "paid" ||
    c.implementation_payment_status === "waived" ||
    implActive;
  const today = new Date();
  const ended = c.implementation_ended_at ? new Date(c.implementation_ended_at) : null;
  const grace =
    !!ended && (today.getTime() - ended.getTime()) / (1000 * 60 * 60 * 24) <= 30;
  const rcs =
    c.rcc_subscription_status === "active" ||
    c.rcc_subscription_status === "comped" ||
    implActive ||
    grace;
  return { diag, impl, rcs, grace };
}

export function AdminScopeAccessSnapshotPanel({ customerId }: { customerId: string }) {
  const [c, setC] = useState<CustomerLike | null>(null);
  const [counts, setCounts] = useState<{ active: number; overrides: number; force: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [cust, assigns, overrides] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "diagnostic_payment_status, diagnostic_status, owner_interview_completed_at, diagnostic_tools_force_unlocked, implementation_payment_status, implementation_started_at, implementation_ended_at, stage, rcc_subscription_status, rcc_paid_through",
          )
          .eq("id", customerId)
          .maybeSingle(),
        supabase
          .from("resource_assignments")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", customerId),
        supabase
          .from("client_tool_access")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", customerId),
      ]);
      if (!alive) return;
      setC((cust.data as CustomerLike) ?? {});
      setCounts({
        active: assigns.count ?? 0,
        overrides: overrides.count ?? 0,
        force: !!(cust.data as any)?.diagnostic_tools_force_unlocked,
      });
    })();
    return () => {
      alive = false;
    };
  }, [customerId]);

  if (!c || !counts) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
        Loading scope snapshot…
      </div>
    );
  }
  const lanes = deriveLanes(c);
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-primary">
        <ShieldCheck className="h-3 w-3" /> Scope / Access Snapshot · admin view
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
      >
        <Lane
          label="Diagnostic lane"
          active={lanes.diag}
          detail={`Pay: ${c.diagnostic_payment_status ?? "—"} · Status: ${c.diagnostic_status ?? "—"} · Owner interview: ${c.owner_interview_completed_at ? "complete" : "incomplete"}`}
        />
        <Lane
          label="Implementation lane"
          active={lanes.impl}
          detail={`Pay: ${c.implementation_payment_status ?? "—"} · Stage: ${c.stage ?? "—"}`}
        />
        <Lane
          label="RGS Control System lane"
          active={lanes.rcs}
          detail={`Subscription: ${c.rcc_subscription_status ?? "—"}${lanes.grace ? " · 30-day post-implementation grace" : ""}`}
        />
      </div>
      <div className="grid gap-3 text-xs" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Stat label="Active tool assignments" value={String(counts.active)} />
        <Stat label="Per-client overrides" value={String(counts.overrides)} />
        <Stat label="Diagnostic force-unlock" value={counts.force ? "On" : "Off"} />
      </div>
      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
        Read-only summary. Lane state is derived from existing payment, lifecycle,
        and subscription fields and matches the P43 backend gates. Use the assignment
        and override panels above to change access.
      </p>
    </div>
  );
}

function Lane({ label, active, detail }: { label: string; active: boolean; detail: string }) {
  return (
    <div
      className={`rounded-md border p-3 ${
        active ? "border-secondary/50 bg-secondary/5" : "border-border bg-muted/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <span
          className={`text-[10px] uppercase tracking-wider ${
            active ? "text-secondary" : "text-muted-foreground"
          }`}
        >
          {active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="text-[11px] text-foreground/85 mt-2 leading-relaxed">{detail}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground mt-1 tabular-nums">{value}</div>
    </div>
  );
}
