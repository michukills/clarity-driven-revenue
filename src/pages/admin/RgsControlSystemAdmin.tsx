import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  getEffectiveToolsForCustomer,
  type EffectiveTool,
} from "@/lib/toolCatalog";
import { Loader2 } from "lucide-react";
import { IndustryBrainContextPanel } from "@/components/admin/IndustryBrainContextPanel";
import { IndustryEmphasisPanel } from "@/components/admin/IndustryEmphasisPanel";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import { buildControlSystemView } from "@/lib/controlSystem/continuationEngine";
import { industryToMatrixKey } from "@/lib/controlSystem/industryMap";
import { ControlSystemAdminView } from "@/components/controlSystem/ControlSystemPanels";

interface CustomerSnapshot {
  id: string;
  lifecycle_state: string | null;
  stage: string | null;
  rcc_subscription_status: string | null;
  rcc_paid_through: string | null;
  industry: string | null;
}

export default function RgsControlSystemAdmin() {
  const { customerId = "" } = useParams();
  const [snapshot, setSnapshot] = useState<CustomerSnapshot | null>(null);
  const [tools, setTools] = useState<EffectiveTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [{ data: c }, eff] = await Promise.all([
          supabase
            .from("customers")
            .select(
              "id, lifecycle_state, stage, rcc_subscription_status, rcc_paid_through, industry",
            )
            .eq("id", customerId)
            .maybeSingle(),
          getEffectiveToolsForCustomer(customerId),
        ]);
        if (!alive) return;
        setSnapshot((c ?? null) as CustomerSnapshot | null);
        setTools(eff.filter((t: any) => t.tool_type === "tracking" || t.tool_type === "reporting"));
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [customerId]);

  const rcsTools = tools.filter((t: any) =>
    ["revenue_control_center","revenue_tracker","revenue_risk_monitor",
     "quickbooks_sync_health","weekly_alignment_system","priority_tasks",
     "scorecard","reports_and_reviews"].includes(t.tool_key),
  );

  const subStatus = snapshot?.rcc_subscription_status ?? null;
  const addOnActive =
    subStatus ? subStatus === "active" || subStatus === "trialing" : null;
  const view = buildControlSystemView({
    industry: industryToMatrixKey(snapshot?.industry ?? null),
    findings: [],
    repair_progress: [],
    score_history: [],
    add_on_active: addOnActive ?? false,
  });

  return (
    <PortalShell variant="admin">
      <div className="max-w-6xl mx-auto w-full min-w-0 px-4 sm:px-6 py-8 space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl text-foreground font-serif break-words">
            RGS Control System™ (Admin)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lane snapshot and effective RCS tools for this client. Access remains governed
            by the existing stage-based access model, RCS subscription/grace rules, and
            ClientToolGuard. This view documents and explains the lane — it does not
            change access.
          </p>
        </header>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : err ? (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            {err}
          </div>
        ) : (
          <>
            <section className="bg-card border border-border rounded-xl p-5 space-y-2">
              <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
                Lane snapshot
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="min-w-0">
                  <div className="text-muted-foreground text-xs">Lifecycle</div>
                  <div className="text-foreground break-words">{snapshot?.lifecycle_state ?? "—"}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground text-xs">Stage</div>
                  <div className="text-foreground break-words">{snapshot?.stage ?? "—"}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground text-xs">RCS subscription</div>
                  <div className="text-foreground break-words">
                    {snapshot?.rcc_subscription_status ?? "—"}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground text-xs">Paid through</div>
                  <div className="text-foreground break-words">
                    {snapshot?.rcc_paid_through ?? "—"}
                  </div>
                </div>
              </div>
            </section>

            <IndustryBrainContextPanel
              industry={(snapshot?.industry as IndustryCategory | null) ?? null}
              surface="rgs_control_system"
            />
            <IndustryEmphasisPanel
              industry={(snapshot?.industry as IndustryCategory | null) ?? null}
              surface="rgs_control_system"
            />

            <ControlSystemAdminView view={view} addOnActive={addOnActive} />

            <section className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
                Effective RCS tools
              </h2>
              {rcsTools.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No RCS-lane tools are effective for this client right now.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rcsTools.map((t) => (
                    <li
                      key={t.tool_id}
                      className="flex items-start justify-between gap-3 border border-border rounded-md p-3 min-w-0"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-foreground break-words">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 break-words">
                          {t.tool_key} · {t.reason} · override: {t.override_state}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={t.effective_enabled ? "secondary" : "outline"}
                          className="text-[11px] whitespace-nowrap">
                          {t.effective_enabled ? "Active" : "Locked"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground pt-2">
                Manage actual access via the ToolAccessPanel and the existing override
                controls. This view is read-only.
              </p>
            </section>
          </>
        )}
      </div>
    </PortalShell>
  );
}