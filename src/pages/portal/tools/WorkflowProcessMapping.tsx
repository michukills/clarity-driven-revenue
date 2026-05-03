import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientWorkflowMaps,
  type ClientWorkflowProcessMap,
} from "@/lib/workflowProcessMapping";
import { GEAR_LABELS } from "@/lib/implementationRoadmap";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || !value.trim()) return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export default function WorkflowProcessMapping() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientWorkflowProcessMap[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientWorkflowMaps(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load workflow maps");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  const groups: Record<string, ClientWorkflowProcessMap[]> = {};
  for (const r of rows ?? []) {
    const key = r.business_area?.trim() || "General";
    (groups[key] ||= []).push(r);
  }

  return (
    <PortalShell variant="customer">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Workflow className="h-4 w-4" /> Implementation
          </div>
          <h1 className="text-2xl text-foreground font-serif">Workflow / Process Mapping</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            This page maps how work moves through the business. It shows the trigger, steps,
            handoffs, decisions, bottlenecks, and outputs so the implementation plan can turn
            messy work into clearer operating standards. Review each map and adapt it to your
            business and any compliance requirements.
          </p>
        </header>

        {loading || rows === null ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : err ? (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            We couldn't load your workflow maps right now. Please try again shortly.
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <h2 className="text-base text-foreground mb-2">
              Your workflow and process maps are being prepared.
            </h2>
            <p className="text-sm text-muted-foreground">
              Once RGS marks them ready, approved process maps will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groups).map(([area, maps]) => (
              <section key={area} className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground">{area}</h2>
                <div className="space-y-3">
                  {maps.map((m) => (
                    <article key={m.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-foreground">{m.title}</h3>
                          <div className="text-[11px] text-muted-foreground mt-0.5 space-x-2">
                            {m.gear && <span>{GEAR_LABELS[m.gear]}</span>}
                            {m.industry_context && <span>· {m.industry_context}</span>}
                            <span>· v{m.version}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[11px]">{m.status.replace(/_/g, " ")}</Badge>
                      </div>

                      {m.client_summary && (
                        <p className="text-sm text-foreground/90">{m.client_summary}</p>
                      )}

                      <Row label="Purpose" value={m.process_purpose} />
                      <Row label="Trigger" value={m.process_trigger} />
                      <Row label="Process owner" value={m.process_owner} />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pt-2 border-t border-border">
                        <Row label="Current state" value={m.current_state_summary} />
                        <Row label="Desired future state" value={m.desired_future_state_summary} />
                        <Row label="Roles involved" value={m.primary_roles} />
                        <Row label="Systems / tools" value={m.systems_tools_used} />
                        <Row label="Inputs" value={m.inputs_needed} />
                        <Row label="Outputs" value={m.outputs_deliverables} />
                        <Row label="Handoffs" value={m.handoff_points} />
                        <Row label="Decision points" value={m.decision_points} />
                        <Row label="Approval points" value={m.approval_points} />
                        <Row label="Bottlenecks" value={m.bottlenecks} />
                        <Row label="Rework loops" value={m.rework_loops} />
                        <Row label="Leaks" value={m.revenue_time_risk_leaks} />
                      </div>

                      {m.steps.length > 0 && (
                        <div className="pt-3 border-t border-border space-y-2">
                          <div className="text-xs uppercase tracking-wider text-muted-foreground">Steps</div>
                          <ol className="space-y-2">
                            {[...m.steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((s, i) => (
                              <li key={i} className="text-sm border border-border rounded-md p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-foreground">
                                    {s.order ?? i + 1}. {s.step_name}
                                  </span>
                                  <span className="flex gap-1">
                                    {s.bottleneck_flag && <Badge variant="outline" className="text-[10px]">Bottleneck</Badge>}
                                    {s.decision_required && <Badge variant="outline" className="text-[10px]">Decision</Badge>}
                                  </span>
                                </div>
                                <div className="text-[12px] text-muted-foreground mt-1 space-x-2">
                                  {s.role_owner && <span>{s.role_owner}</span>}
                                  {s.action && <span>· {s.action}</span>}
                                  {s.tool_or_system_used && <span>· {s.tool_or_system_used}</span>}
                                  {s.handoff_to && <span>· → {s.handoff_to}</span>}
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
