import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { ToolWalkthroughCard } from "@/components/portal/ToolWalkthroughCard";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, Plug, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RcsScopeBanner } from "@/components/tools/RcsScopeBanner";
import {
  getClientFinancialVisibility,
  FV_PROVIDER_LABEL, FV_SOURCE_TYPE_LABEL,
  FV_STATUS_LABEL, FV_HEALTH_LABEL,
  FV_LANE_LABEL, FV_PHASE_LABEL,
  FV_RELATED_SOURCE_LABEL,
  type ClientFinancialVisibilitySource,
  type FvProvider, type FvStatus, type FvHealth,
} from "@/lib/financialVisibility";

export default function FinancialVisibility() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientFinancialVisibilitySource[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useState<FvProvider | "all">("all");
  const [statusFilter, setStatusFilter] = useState<FvStatus | "all">("all");
  const [healthFilter, setHealthFilter] = useState<FvHealth | "all">("all");

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientFinancialVisibility(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load financial visibility");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter(r => {
      if (providerFilter !== "all" && r.provider !== providerFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (healthFilter !== "all" && r.health !== healthFilter) return false;
      return true;
    });
  }, [rows, providerFilter, statusFilter, healthFilter]);

  const providers = useMemo(() => Array.from(new Set(rows?.map(r => r.provider) ?? [])), [rows]);
  const statuses = useMemo(() => Array.from(new Set(rows?.map(r => r.health) ?? [])), [rows]);

  return (
    <PortalShell variant="customer">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Plug className="h-3.5 w-3.5" />
            Part of the RGS Control System™ ·{" "}
            <Link to="/portal/tools/rgs-control-system" className="text-primary hover:underline">
              Back to RGS Control System™
            </Link>
          </div>
          <h1 className="text-2xl text-foreground font-serif">Financial Visibility</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            This page shows the financial data sources and visibility signals connected or
            documented for your business. It helps RGS and the owner see what information is
            available, what may be missing, and what may need review.
          </p>
          <p className="text-xs text-muted-foreground max-w-3xl">
            Financial visibility is not accounting, tax, payroll, legal, or compliance review.
            Connected data may be incomplete, delayed, or limited by the source. Use qualified
            professionals where required.
          </p>
        </header>

        <RcsScopeBanner
          included="visibility into which financial data sources are connected, their health/status, and what may be missing or stale."
          excluded="accounting, bookkeeping, tax, payroll, legal, or compliance review; storage of provider secrets or tokens; and any guarantee that connected data is complete or final."
        />

        <ToolWalkthroughCard toolKey="connector_financial_visibility" />

        {err && (
          <div className="border border-destructive/30 bg-destructive/10 rounded-md p-3 text-sm text-destructive">
            {err}
          </div>
        )}

        {loading || rows === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading financial visibility…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                className="bg-background border border-border rounded-md px-2 py-2 text-sm"
                value={providerFilter}
                onChange={e => setProviderFilter(e.target.value as any)}
              >
                <option value="all">All providers</option>
                {providers.map(p => <option key={p} value={p}>{FV_PROVIDER_LABEL[p]}</option>)}
              </select>
              <select
                className="bg-background border border-border rounded-md px-2 py-2 text-sm"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All connection states</option>
                {Array.from(new Set(rows?.map(r => r.status) ?? [])).map(s => (
                  <option key={s} value={s}>{FV_STATUS_LABEL[s]}</option>
                ))}
              </select>
              <select
                className="bg-background border border-border rounded-md px-2 py-2 text-sm"
                value={healthFilter}
                onChange={e => setHealthFilter(e.target.value as any)}
              >
                <option value="all">All health states</option>
                {statuses.map(h => <option key={h} value={h}>{FV_HEALTH_LABEL[h]}</option>)}
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="border border-border bg-card rounded-xl p-6 text-center text-sm text-muted-foreground">
                No financial visibility sources have been shared yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {filtered.map(r => (
                  <li key={r.id} className="border border-border bg-card rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <h2 className="text-lg text-foreground font-serif flex items-center gap-2">
                          {r.pinned && <Pin className="h-4 w-4 text-primary" />}
                          {r.display_name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[11px]">
                            Provider: {FV_PROVIDER_LABEL[r.provider]}
                          </Badge>
                          <Badge variant="outline" className="text-[11px]">
                            Source type: {FV_SOURCE_TYPE_LABEL[r.source_type]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className="text-[11px]">
                          Connection: {FV_STATUS_LABEL[r.status]}
                        </Badge>
                        <Badge variant="secondary" className="text-[11px]">
                          Health: {FV_HEALTH_LABEL[r.health]}
                        </Badge>
                      </div>
                    </div>

                    {r.client_visible_summary && (
                      <p className="text-sm text-foreground whitespace-pre-line border-t border-border pt-3">
                        {r.client_visible_summary}
                      </p>
                    )}

                    {r.visibility_limitations && (
                      <div className="border-t border-border pt-3">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                          Limitations
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-line">{r.visibility_limitations}</p>
                      </div>
                    )}

                    <MetricGrid r={r} />

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                      <Badge variant="secondary" className="text-[11px]">
                        Lane: {FV_LANE_LABEL[r.service_lane]}
                      </Badge>
                      <Badge variant="secondary" className="text-[11px]">
                        Stage: {FV_PHASE_LABEL[r.customer_journey_phase]}
                      </Badge>
                      {r.related_source_type && (
                        <Badge variant="outline" className="text-[11px]">
                          Related source: {FV_RELATED_SOURCE_LABEL[r.related_source_type]}
                        </Badge>
                      )}
                      {r.related_tool_key && (
                        <Badge variant="outline" className="text-[11px]">
                          Related tool: {r.related_tool_key}
                        </Badge>
                      )}
                      {r.last_sync_at && (
                        <Badge variant="outline" className="text-[11px]">
                          Last synced: {new Date(r.last_sync_at).toLocaleString()}
                        </Badge>
                      )}
                      {r.last_checked_at && (
                        <Badge variant="outline" className="text-[11px]">
                          Last checked: {new Date(r.last_checked_at).toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </PortalShell>
  );
}

function MetricGrid({ r }: { r: ClientFinancialVisibilitySource }) {
  const cells: Array<[string, string | null]> = [
    ["Revenue visibility", r.revenue_summary],
    ["Expense visibility", r.expense_summary],
    ["Cash visibility", r.cash_visibility_summary],
    ["Margin visibility", r.margin_visibility_summary],
    ["Invoice / payment visibility", r.invoice_payment_summary],
    ["Data quality", r.data_quality_summary],
  ];
  const present = cells.filter(([, v]) => v && v.trim().length > 0);
  if (present.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border pt-3">
      {present.map(([label, value]) => (
        <div key={label}>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">
            {label}
          </div>
          <p className="text-sm text-foreground whitespace-pre-line">{value}</p>
        </div>
      ))}
    </div>
  );
}
