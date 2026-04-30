import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  listToolCatalog,
  listCategoryAccess,
  listAllCategoryAccess,
  setCategoryAccess,
  REASON_LABEL,
  TOOL_TYPE_LABEL,
  INDUSTRY_KEYS,
  INDUSTRY_LABEL,
  type IndustryKey,
  type ToolCatalogRow,
} from "@/lib/toolCatalog";
import {
  buildIndustryToolCoverage,
  type CategoryAccessRow,
  type IndustryToolCoverage,
} from "@/lib/industryToolCoverage";
import { Wrench, ShieldAlert, CheckCircle2, AlertTriangle, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const VISIBILITY_LABEL: Record<string, string> = {
  admin_only: "Admin only",
  client_available: "Client-available",
  hidden: "Hidden",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  beta: "Beta",
  deprecated: "Deprecated",
};

function isAdminOnlyTool(t: ToolCatalogRow): boolean {
  return t.tool_type === "admin_only" || t.default_visibility === "admin_only";
}

interface IndustryToggleRowProps {
  tool: ToolCatalogRow;
}

function IndustryToggleRow({ tool }: IndustryToggleRowProps) {
  const [state, setState] = useState<Record<IndustryKey, boolean>>(() => ({
    trade_field_service: false,
    retail: false,
    restaurant: false,
    mmj_cannabis: false,
    general_service: false,
    other: false,
  }));
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<IndustryKey | null>(null);
  const adminOnly = isAdminOnlyTool(tool);
  const deprecatedOrHidden = tool.status === "deprecated" || tool.default_visibility === "hidden";

  useEffect(() => {
    if (adminOnly) {
      setLoaded(true);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const rows = await listCategoryAccess(tool.id);
        if (!alive) return;
        const next = { ...state };
        for (const r of rows as Array<{ industry: IndustryKey; enabled: boolean }>) {
          if (INDUSTRY_KEYS.includes(r.industry)) next[r.industry] = !!r.enabled;
        }
        setState(next);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.id, adminOnly]);

  const toggle = async (industry: IndustryKey) => {
    if (adminOnly) return;
    if (deprecatedOrHidden && !state[industry]) {
      const ok = window.confirm(
        `${tool.name} is ${tool.status === "deprecated" ? "deprecated" : "hidden"}. ` +
          `Enabling it for ${INDUSTRY_LABEL[industry]} will not bypass that status. Continue?`,
      );
      if (!ok) return;
    }
    const next = !state[industry];
    setSaving(industry);
    setState((s) => ({ ...s, [industry]: next }));
    try {
      await setCategoryAccess({ toolId: tool.id, industry, enabled: next });
      toast.success(`${INDUSTRY_LABEL[industry]} · ${next ? "enabled" : "disabled"}`);
    } catch (e: any) {
      setState((s) => ({ ...s, [industry]: !next }));
      toast.error(e?.message ?? "Failed to update industry access");
    } finally {
      setSaving(null);
    }
  };

  if (adminOnly) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic">
        <ShieldAlert className="h-3 w-3" /> Admin-only — industry access not applicable.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {INDUSTRY_KEYS.map((k) => {
        const on = state[k];
        const isBusy = saving === k;
        return (
          <button
            key={k}
            type="button"
            disabled={!loaded || isBusy}
            onClick={() => toggle(k)}
            className={
              "text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors " +
              (on
                ? "bg-primary/15 text-primary border-primary/40 hover:bg-primary/25"
                : "bg-muted/30 text-muted-foreground border-border hover:border-foreground/30")
            }
            title={on ? "Enabled — click to disable" : "Disabled — click to enable"}
          >
            {INDUSTRY_LABEL[k]}
            {isBusy ? " …" : ""}
          </button>
        );
      })}
    </div>
  );
}

function ToolKeyList({ keys, empty = "None" }: { keys: string[]; empty?: string }) {
  if (keys.length === 0) {
    return <span className="text-muted-foreground">{empty}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {keys.map((key) => (
        <code
          key={key}
          className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/30 text-muted-foreground"
        >
          {key}
        </code>
      ))}
    </div>
  );
}

function IndustryCoveragePanel({ rows }: { rows: IndustryToolCoverage[] }) {
  return (
    <section className="mb-10 rounded-lg border border-border bg-card/40 overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
            Industry Tool + Metric Coverage
          </div>
          <h2 className="text-lg text-foreground mt-1">
            Verify each industry has its own tools and independent variables
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            This admin-only audit compares configured industry tool access against the
            RGS vertical templates. It shows the variables collected per industry and
            whether Diagnostic, Implementation, and Revenue Control lanes are covered.
          </p>
        </div>
        <Link
          to="/admin/tool-matrix"
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40"
        >
          <BarChart3 className="h-3.5 w-3.5" /> Operating matrix
        </Link>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => {
          const ready = row.missingDefaultToolKeys.length === 0;
          return (
            <div key={row.industry} className="p-4">
              <div className="flex flex-col xl:flex-row xl:items-start gap-5">
                <div className="xl:w-[18rem] shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base text-foreground">{row.label}</h3>
                    {row.regulated && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
                        Regulated
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-muted/30 text-muted-foreground">
                      {row.independentVariableCount} variables
                    </span>
                    <span
                      className={
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded border " +
                        (ready
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-300")
                      }
                    >
                      {ready ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {row.coveragePct}% default tool coverage
                    </span>
                  </div>
                  <div className="mt-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Evidence sources
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {row.evidenceSources.map((source) => (
                      <span
                        key={source}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/20 text-muted-foreground"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-4">
                  <div className="grid md:grid-cols-3 gap-3">
                    {row.packageCoverage.map((lane) => {
                      const laneReady = lane.missingToolKeys.length === 0;
                      return (
                        <div key={lane.key} className="rounded-md border border-border bg-background/40 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-xs text-foreground">{lane.label}</div>
                              <div className="text-[11px] text-muted-foreground">{lane.purpose}</div>
                            </div>
                            <span
                              className={
                                "text-[10px] px-1.5 py-0.5 rounded border " +
                                (laneReady
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-300")
                              }
                            >
                              {lane.coveragePct}%
                            </span>
                          </div>
                          {lane.missingToolKeys.length > 0 && (
                            <div className="mt-2">
                              <div className="text-[10px] uppercase tracking-[0.12em] text-amber-300 mb-1">
                                Missing configured access
                              </div>
                              <ToolKeyList keys={lane.missingToolKeys} />
                            </div>
                          )}
                          {lane.restrictedToolKeys.length > 0 && (
                            <div className="mt-2">
                              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
                                Restricted for this industry
                              </div>
                              <ToolKeyList keys={lane.restrictedToolKeys} />
                            </div>
                          )}
                          {lane.adminOnlyToolKeys.length > 0 && (
                            <div className="mt-2">
                              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
                                Admin-only (no per-industry config)
                              </div>
                              <ToolKeyList keys={lane.adminOnlyToolKeys} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
                      Independent variables tracked for this industry
                    </div>
                    <div className="grid lg:grid-cols-2 gap-2">
                      {row.metricGroups.map((group) => (
                        <div key={group.key} className="rounded-md border border-border bg-muted/15 p-2.5">
                          <div className="text-xs text-foreground mb-1">
                            {group.label}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {group.variables.map((variable) => (
                              <span
                                key={variable}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-background/50 text-muted-foreground"
                              >
                                {variable}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
                      Configured enabled tool access
                    </div>
                    <ToolKeyList
                      keys={row.configuredToolKeys}
                      empty="No configured industry tools yet — use the toggles below to enable this lane."
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ToolCatalogPage() {
  const [tools, setTools] = useState<ToolCatalogRow[]>([]);
  const [accessRows, setAccessRows] = useState<CategoryAccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [rows, access] = await Promise.all([
          listToolCatalog(),
          listAllCategoryAccess(),
        ]);
        if (alive) {
          setTools(rows);
          setAccessRows(access as CategoryAccessRow[]);
        }
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load tool catalog");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ToolCatalogRow[]>();
    for (const t of tools) {
      const key = t.tool_type;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tools]);

  const coverage = useMemo(
    () => buildIndustryToolCoverage(tools, accessRows),
    [tools, accessRows],
  );

  return (
    <PortalShell variant="admin">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Governance
        </div>
        <h1 className="mt-2 text-3xl text-foreground">RGS Tool Catalog</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          First-party RGS system tools, their default visibility, and which
          clients can see them. Industry and per-client overrides are managed
          on each customer record.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">Loading catalog…</div>
      )}
      {error && (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-3">
          {error}
        </div>
      )}
      {!loading && !error && tools.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Wrench className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground">No tools in the catalog yet.</p>
        </div>
      )}

      {!loading && !error && tools.length > 0 && (
        <IndustryCoveragePanel rows={coverage} />
      )}

      <div className="space-y-10">
        {Array.from(grouped.entries()).map(([type, items]) => (
          <section key={type}>
            <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
                  {TOOL_TYPE_LABEL[type as keyof typeof TOOL_TYPE_LABEL] ?? type}
                </div>
                <h2 className="text-base text-foreground mt-1">
                  {items.length} tool{items.length === 1 ? "" : "s"}
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium">Key</th>
                    <th className="text-left px-3 py-2 font-medium">Visibility</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Active client req.</th>
                    <th className="text-left px-3 py-2 font-medium">Industry req.</th>
                    <th className="text-left px-3 py-2 font-medium">Route</th>
                    <th className="text-left px-3 py-2 font-medium">Industry access</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id} className="border-t border-border/60">
                      <td className="px-3 py-2 text-foreground">
                        <div className="font-medium">{t.name}</div>
                        {t.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 max-w-md">
                            {t.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        <code>{t.tool_key}</code>
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground">
                        {VISIBILITY_LABEL[t.default_visibility] ?? t.default_visibility}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground">
                        {STATUS_LABEL[t.status] ?? t.status}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground">
                        {t.requires_active_client ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground">
                        {t.requires_industry ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {t.route_path ? <code>{t.route_path}</code> : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <IndustryToggleRow tool={t} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 text-xs text-muted-foreground border-t border-border pt-4">
        Effective access reasons used by the system:{" "}
        {Object.entries(REASON_LABEL)
          .map(([k, v]) => `${k} → ${v}`)
          .join(" · ")}
      </div>
    </PortalShell>
  );
}
