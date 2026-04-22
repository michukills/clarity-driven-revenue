/* ============================================================================
 * Operational pipeline / funnel reporting page.
 * ----------------------------------------------------------------------------
 * NOT the same as the Business Control Reports surface.
 *
 * Canonical Business Control Reports route: `/admin/reports`
 * (`src/pages/admin/Reports.tsx`). That surface owns Monthly Business Health
 * and Quarterly Stability Review snapshots.
 *
 * This page (`/admin/reporting`) is retained for stage/funnel/throughput
 * counts which are unique and not duplicated by `/admin/reports`. Do NOT add
 * BCC-style report logic here — extend `/admin/reports` instead.
 * ============================================================================
 */
import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { SHARED_STAGES, DIAGNOSTIC_STAGES, IMPLEMENTATION_STAGES, stageLabel } from "@/lib/portal";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV } from "@/lib/exports";

export default function Reporting() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [c, a, t] = await Promise.all([
        supabase.from("customers").select("id, stage, track, implementation_status, payment_status"),
        supabase.from("resource_assignments").select("resource_id, customer_id"),
        supabase.from("customer_tasks").select("status, due_date"),
      ]);
      if (c.data) setCustomers(c.data);
      if (a.data) setAssignments(a.data);
      if (t.data) setTasks(t.data);
    })();
  }, []);

  const stageCounts = useMemo(() => {
    const all = [...SHARED_STAGES, ...DIAGNOSTIC_STAGES, ...IMPLEMENTATION_STAGES];
    return all
      .map((s) => ({ key: s.key, label: s.label, count: customers.filter((c) => c.stage === s.key).length }))
      .filter((s) => s.count > 0);
  }, [customers]);

  const today = new Date();
  const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < today && t.status !== "done").length;
  const completion = customers.length === 0
    ? 0
    : Math.round((customers.filter((c) => ["implementation_complete", "closed", "work_completed"].includes(c.stage)).length / customers.length) * 100);

  const dxCount = customers.filter((c) => c.track === "diagnostic_only").length;
  const implCount = customers.filter((c) => c.track === "implementation").length;
  const sharedCount = customers.length - dxCount - implCount;

  const toolUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach((a) => (counts[a.resource_id] = (counts[a.resource_id] || 0) + 1));
    return Object.values(counts);
  }, [assignments]);
  const totalAssignments = toolUsage.reduce((a, b) => a + b, 0);
  const uniqueTools = toolUsage.length;

  return (
    <PortalShell variant="admin">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reporting</div>
          <h1 className="mt-2 text-3xl text-foreground">Operating Reports</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            A clean executive view of pipeline mix, tool usage, and engagement health.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-border"
          onClick={() =>
            downloadCSV(`pipeline-by-stage-${new Date().toISOString().slice(0, 10)}`, stageCounts)
          }
        >
          <Download className="h-4 w-4" /> Export Pipeline CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Card label="Total Clients" value={customers.length} />
        <Card label="Implementation %" value={`${customers.length ? Math.round((implCount / customers.length) * 100) : 0}%`} />
        <Card label="Tool Assignments" value={totalAssignments} />
        <Card label="Overdue Tasks" value={overdue} tone={overdue ? "warn" : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Pipeline by stage">
          {stageCounts.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-2">
              {stageCounts.map((s) => {
                const max = Math.max(...stageCounts.map((x) => x.count)) || 1;
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-foreground">{stageLabel(s.key)}</span>
                      <span className="text-muted-foreground">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(s.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Track mix">
          <div className="space-y-4 mt-2">
            <Bar label="Shared funnel" value={sharedCount} total={customers.length || 1} tone="muted" />
            <Bar label="Diagnostic-only" value={dxCount} total={customers.length || 1} tone="ok" />
            <Bar label="Implementation" value={implCount} total={customers.length || 1} tone="primary" />
          </div>
          <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
            Engagement completion rate: <span className="text-foreground">{completion}%</span>
          </div>
        </Panel>

        <Panel title="Tool usage overview">
          <div className="grid grid-cols-2 gap-3">
            <Mini label="Unique tools assigned" value={uniqueTools} />
            <Mini label="Total assignments" value={totalAssignments} />
            <Mini label="Avg per client" value={customers.length ? (totalAssignments / customers.length).toFixed(1) : "0.0"} />
            <Mini label="Implementation clients" value={implCount} />
          </div>
        </Panel>

        <Panel title="Engagement health">
          <div className="space-y-3 text-xs text-muted-foreground">
            <Row label="Active clients" value={customers.filter((c) => !["closed", "implementation_complete"].includes(c.stage)).length} />
            <Row label="Waiting on client" value={customers.filter((c) => c.stage === "waiting_on_client" || c.implementation_status === "waiting_client").length} />
            <Row label="Unpaid balances" value={customers.filter((c) => c.payment_status === "unpaid").length} />
            <Row label="Closed engagements" value={customers.filter((c) => ["closed", "implementation_complete"].includes(c.stage)).length} />
          </div>
        </Panel>
      </div>
    </PortalShell>
  );
}

function Card({ label, value, tone }: { label: string; value: any; tone?: "warn" }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-light ${tone === "warn" ? "text-amber-400" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm text-foreground mb-4">{title}</h3>
      {children}
    </section>
  );
}
function Empty() { return <div className="text-xs text-muted-foreground py-6 text-center">No data yet.</div>; }
function Bar({ label, value, total, tone }: { label: string; value: number; total: number; tone: "primary" | "ok" | "muted" }) {
  const pct = (value / total) * 100;
  const color = tone === "primary" ? "bg-primary" : tone === "ok" ? "bg-secondary" : "bg-muted-foreground/40";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">{value} ({Math.round(pct)}%)</span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-muted/30 border border-border rounded-md p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl text-foreground">{value}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
