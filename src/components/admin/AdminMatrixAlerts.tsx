// P6.2 — Admin Command Center alerts for tool overdue/unused signals.
// Reads from the Tool Operating Matrix to surface:
//  - diagnostic clients missing required Diagnostic Engine™ runs
//  - implementation clients overdue on Implementation Command Tracker™
//  - active RCC clients overdue on weekly check-in
//  - monitoring clients overdue on Reports & Reviews™
//  - assigned tool never used (any phase)
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  TOOL_MATRIX,
  toolByKey,
  requiredToolKeysForStage,
  type OverdueState,
} from "@/lib/toolMatrix";
import { loadToolActivity, type ActivityIndex } from "@/lib/toolMatrixActivity";
import { formatRelativeTime, coreKeyForTitle, canonicalToolDisplayTitle } from "@/lib/portal";
import { AlertTriangle, ArrowRight, Activity } from "lucide-react";

type CustomerLite = {
  id: string;
  full_name: string;
  business_name: string | null;
  stage: string;
  monitoring_status: string;
  portal_unlocked: boolean;
};

type AlertItem = {
  id: string;
  customerId: string;
  customerLabel: string;
  toolName: string;
  reason: string;
  severity: "warning" | "critical";
  href: string;
};

const DX_STAGES = new Set([
  "diagnostic_paid",
  "diagnostic_in_progress",
  "diagnostic_delivered",
]);
const IMP_STAGES = new Set([
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

export function AdminMatrixAlerts() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [custRes, assignRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, full_name, business_name, stage, monitoring_status, portal_unlocked")
          .is("archived_at", null),
        supabase.from("resource_assignments").select("customer_id, resources(title, tool_category)"),
      ]);
      const customers = (custRes.data as CustomerLite[]) || [];
      const customerIds = customers.map((c) => c.id);
      const activity = await loadToolActivity(customerIds);

      // Build per-customer assigned tool keys + RCC access flag.
      const assignedByCustomer = new Map<string, Set<string>>();
      const hasRccAddonByCustomer = new Map<string, boolean>();
      for (const row of (assignRes.data as any[]) || []) {
        const cid = row.customer_id;
        const r = row.resources;
        if (!cid || !r?.title) continue;
        if (!assignedByCustomer.has(cid)) assignedByCustomer.set(cid, new Set());
        const set = assignedByCustomer.get(cid)!;
        const ck = coreKeyForTitle(r.title);
        if (ck) set.add(ck);
        const display = canonicalToolDisplayTitle(r.title);
        const match = TOOL_MATRIX.find((t) => t.name === display);
        if (match) set.add(match.key);
        if (r.tool_category === "addon") hasRccAddonByCustomer.set(cid, true);
      }

      const out: AlertItem[] = [];
      const customerLabel = (c: CustomerLite) =>
        c.business_name?.trim() || c.full_name || "Client";

      for (const c of customers) {
        const perTool = activity.get(c.id) || new Map();
        const assigned = assignedByCustomer.get(c.id) || new Set();
        const hasRcc = hasRccAddonByCustomer.get(c.id) === true;

        // Diagnostic clients missing required Diagnostic Engine™ run.
        if (DX_STAGES.has(c.stage)) {
          for (const reqKey of requiredToolKeysForStage(c.stage)) {
            const tool = toolByKey(reqKey);
            if (!tool) continue;
            const a = perTool.get(reqKey);
            if (!a?.lastActivityAt) {
              out.push({
                id: `dx-missing-${c.id}-${reqKey}`,
                customerId: c.id,
                customerLabel: customerLabel(c),
                toolName: tool.name,
                reason: `No ${tool.name} run yet during diagnostic`,
                severity: "critical",
                href: `/admin/customers/${c.id}`,
              });
            }
          }
        }

        // Implementation clients overdue on Implementation Command Tracker™.
        if (IMP_STAGES.has(c.stage)) {
          const tool = toolByKey("implementation_command_tracker");
          if (tool) {
            const a = perTool.get(tool.key);
            const state: OverdueState = a?.overdue ?? "not_started";
            if (state === "overdue" || state === "not_started") {
              out.push({
                id: `imp-${c.id}`,
                customerId: c.id,
                customerLabel: customerLabel(c),
                toolName: tool.name,
                reason:
                  state === "not_started"
                    ? "No Implementation Command Tracker™ updates yet"
                    : `Last update ${formatRelativeTime(a!.lastActivityAt!)}`,
                severity: state === "overdue" ? "critical" : "warning",
                href: `/admin/customers/${c.id}`,
              });
            }
          }
        }

        // Active RCC clients overdue on weekly check-in.
        if (hasRcc) {
          const tool = toolByKey("revenue_control_center");
          if (tool) {
            const a = perTool.get(tool.key);
            const state: OverdueState = a?.overdue ?? "not_started";
            if (state === "overdue" || state === "not_started") {
              out.push({
                id: `rcc-${c.id}`,
                customerId: c.id,
                customerLabel: customerLabel(c),
                toolName: tool.name,
                reason:
                  state === "not_started"
                    ? "No weekly check-in saved yet"
                    : `Last check-in ${formatRelativeTime(a!.lastActivityAt!)}`,
                severity: state === "overdue" ? "critical" : "warning",
                href: `/admin/clients/${c.id}/business-control`,
              });
            }
          }
        }

        // Monitoring clients overdue on Reports & Reviews™.
        if (c.monitoring_status === "active") {
          const tool = toolByKey("reports_and_reviews");
          if (tool) {
            const a = perTool.get(tool.key);
            const state: OverdueState = a?.overdue ?? "not_started";
            if (state === "overdue" || state === "not_started") {
              out.push({
                id: `rr-${c.id}`,
                customerId: c.id,
                customerLabel: customerLabel(c),
                toolName: tool.name,
                reason:
                  state === "not_started"
                    ? "No published report yet"
                    : `Last published ${formatRelativeTime(a!.lastActivityAt!)}`,
                severity: state === "overdue" ? "critical" : "warning",
                href: `/admin/reports`,
              });
            }
          }
        }

        // Assigned tool never used (catch-all). Skip RCC if no add-on.
        for (const key of assigned) {
          const tool = toolByKey(key);
          if (!tool) continue;
          if (tool.requiresRccAccess && !hasRcc) continue;
          const a = perTool.get(key);
          if (!a?.lastActivityAt) {
            out.push({
              id: `unused-${c.id}-${key}`,
              customerId: c.id,
              customerLabel: customerLabel(c),
              toolName: tool.name,
              reason: `Assigned but never used`,
              severity: "warning",
              href: `/admin/customers/${c.id}`,
            });
          }
        }
      }

      // Critical first, then warning. Cap to keep dashboard light.
      out.sort((x, y) => (x.severity === y.severity ? 0 : x.severity === "critical" ? -1 : 1));
      setItems(out.slice(0, 20));
      setLoading(false);
    })();
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Tool Operating Matrix · alerts
          </div>
          <h3 className="text-base font-light text-foreground inline-flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary/70" /> Overdue & missing tool activity
          </h3>
        </div>
        <Link
          to="/admin/tool-matrix"
          className="text-xs uppercase tracking-[0.18em] text-primary hover:text-primary/80 inline-flex items-center gap-1"
        >
          Open matrix <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          All assigned tools have recent activity. Nothing to chase.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href}
                className="flex items-start gap-2 rounded-lg border border-border bg-card/30 p-2.5 hover:border-primary/40 transition-colors"
              >
                <AlertTriangle
                  className={`h-3.5 w-3.5 mt-0.5 ${
                    item.severity === "critical" ? "text-destructive" : "text-amber-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">
                    {item.customerLabel} · {item.toolName}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.reason}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
