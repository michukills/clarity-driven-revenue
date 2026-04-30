// P6.2 — Admin Tool Operating Matrix view
// Read-only audit of every tool in the RGS operating system: phase, primary
// user, recommended frequency, overdue activity, and assigned client count.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  TOOL_MATRIX,
  GROUP_ORDER,
  PHASE_LABEL,
  USER_LABEL,
  overdueLabel,
  overdueTone,
  type ToolMatrixEntry,
  type OverdueState,
} from "@/lib/toolMatrix";
import {
  loadToolActivity,
  loadAssignedCountsByMatrixKey,
  type ActivityIndex,
} from "@/lib/toolMatrixActivity";
import {
  buildIndustryToolCoverage,
  type IndustryToolCoverage,
} from "@/lib/industryToolCoverage";
import {
  listAllCategoryAccess,
  listToolCatalog,
  type ToolCatalogRow,
} from "@/lib/toolCatalog";
import { formatRelativeTime } from "@/lib/portal";
import { ArrowLeft, ArrowRight, Users, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

type AggregatedRow = {
  tool: ToolMatrixEntry;
  assignedCustomers: number;
  customersWithActivity: number;
  customersOverdue: number;
  customersNotStarted: number;
  latestActivityIso: string | null;
};

const TONE_CLS: Record<"ok" | "warn" | "critical" | "muted", string> = {
  ok: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  warn: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  muted: "text-muted-foreground border-border bg-muted/40",
};

export default function ToolMatrix() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityIndex>(new Map());
  const [assignedCounts, setAssignedCounts] = useState<Record<string, number>>({});
  const [catalog, setCatalog] = useState<ToolCatalogRow[]>([]);
  const [categoryAccess, setCategoryAccess] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, counts, tools, access] = await Promise.all([
        loadToolActivity(),
        loadAssignedCountsByMatrixKey(),
        listToolCatalog().catch(() => []),
        listAllCategoryAccess().catch(() => []),
      ]);
      setActivity(a);
      setAssignedCounts(counts);
      setCatalog(tools);
      setCategoryAccess(access);
      setLoading(false);
    })();
  }, []);

  const rows: AggregatedRow[] = useMemo(() => {
    return TOOL_MATRIX.map((tool) => {
      let withActivity = 0;
      let overdueCount = 0;
      let notStartedCount = 0;
      let latest: string | null = null;
      for (const perCustomer of activity.values()) {
        const a = perCustomer.get(tool.key);
        if (!a) continue;
        if (a.lastActivityAt) {
          withActivity++;
          if (!latest || new Date(a.lastActivityAt) > new Date(latest)) latest = a.lastActivityAt;
        }
        if (a.overdue === "overdue") overdueCount++;
        if (a.overdue === "not_started") notStartedCount++;
      }
      return {
        tool,
        assignedCustomers: assignedCounts[tool.key] ?? 0,
        customersWithActivity: withActivity,
        customersOverdue: overdueCount,
        customersNotStarted: notStartedCount,
        latestActivityIso: latest,
      };
    });
  }, [activity, assignedCounts]);

  const grouped = useMemo(() => {
    const out: Record<string, AggregatedRow[]> = {};
    for (const g of GROUP_ORDER) out[g] = [];
    for (const row of rows) out[row.tool.group].push(row);
    return out;
  }, [rows]);

  const industryCoverage: IndustryToolCoverage[] = useMemo(
    () => buildIndustryToolCoverage(catalog, categoryAccess as any),
    [catalog, categoryAccess],
  );

  const toolNameByKey = useMemo(() => {
    const out = new Map<string, string>();
    for (const tool of TOOL_MATRIX) out.set(tool.key, tool.name);
    for (const tool of catalog) out.set(tool.tool_key, tool.name);
    return out;
  }, [catalog]);

  const toolLabel = (key: string) => toolNameByKey.get(key) ?? key.replace(/_/g, " ");

  return (
    <PortalShell variant="admin">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Admin
      </Link>

      <header className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Tool Operating Matrix
        </div>
        <h1 className="mt-1 text-3xl text-foreground">
          Tools, industry coverage, metrics, and overdue signal
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Every tool in the RGS operating system mapped to its phase, primary user,
          recommended cadence, current activity, industry lane, package lane, and
          tracked variables. Use this to confirm clients are operating the right
          tools at the right rhythm.
        </p>
      </header>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading matrix…</div>
      ) : (
        <div className="space-y-10">
          <section>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Industry Tool Coverage
                </div>
                <h2 className="mt-1 text-xl text-foreground">
                  Tools and independent variables by industry
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  This admin-only audit shows the industry-specific variables RGS is set up
                  to track, the evidence sources expected for each lane, and whether the
                  configured tool rules cover Diagnostic, Implementation, and Revenue
                  Control work.
                </p>
              </div>
              <Link
                to="/admin/tool-catalog"
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-primary hover:text-primary/80"
              >
                Manage catalog <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {industryCoverage.map((row) => {
                const missingCount = row.packageCoverage.reduce(
                  (sum, lane) => sum + lane.missingToolKeys.length,
                  0,
                );
                return (
                  <div
                    key={row.industry}
                    className="rounded-2xl border border-border bg-card/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg text-foreground">{row.label}</h3>
                          {row.regulated ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                              <AlertTriangle className="h-3 w-3" />
                              Regulated lane
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                              <ShieldCheck className="h-3 w-3" />
                              Active lane
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.independentVariableCount} independent variables ·{" "}
                          {row.configuredToolKeys.length} configured tool rule
                          {row.configuredToolKeys.length === 1 ? "" : "s"} ·{" "}
                          {row.coveragePct}% default coverage
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          missingCount > 0
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {missingCount > 0 ? `${missingCount} tool gap${missingCount === 1 ? "" : "s"}` : "Covered"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {row.packageCoverage.map((lane) => (
                        <div
                          key={lane.key}
                          className="rounded-xl border border-border/70 bg-background/30 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm text-foreground">{lane.label}</div>
                            <span
                              className={`text-[11px] rounded border px-1.5 py-0.5 ${
                                lane.coveragePct >= 80
                                  ? TONE_CLS.ok
                                  : lane.coveragePct >= 50
                                    ? TONE_CLS.warn
                                    : TONE_CLS.critical
                              }`}
                            >
                              {lane.coveragePct}%
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {lane.purpose}
                          </div>
                          {lane.missingToolKeys.length > 0 ? (
                            <div className="mt-2 text-[11px] text-amber-300">
                              Missing:{" "}
                              {lane.missingToolKeys.map(toolLabel).join(", ")}
                            </div>
                          ) : (
                            <div className="mt-2 text-[11px] text-emerald-300">
                              Expected tools configured.
                            </div>
                          )}
                          {lane.restrictedToolKeys.length > 0 && (
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              Restricted: {lane.restrictedToolKeys.map(toolLabel).join(", ")}
                            </div>
                          )}
                          {lane.adminOnlyToolKeys.length > 0 && (
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              Admin-operated: {lane.adminOnlyToolKeys.map(toolLabel).join(", ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
                        Tracked variables
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {row.metricGroups.map((group) => (
                          <div key={group.key} className="rounded-lg bg-muted/20 p-2">
                            <div className="text-xs text-foreground">{group.label}</div>
                            <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                              {group.variables.join(" · ")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
                        Evidence sources
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {row.evidenceSources.map((source) => (
                          <span
                            key={source}
                            className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {GROUP_ORDER.map((group) => (
            <section key={group}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-light text-foreground">{group}</h2>
                <span className="text-xs text-muted-foreground">
                  {grouped[group]?.length ?? 0} tool{grouped[group]?.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-border bg-card/40">
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground border-b border-border">
                    <tr>
                      <th className="text-left p-3 font-normal">Tool</th>
                      <th className="text-left p-3 font-normal">Phase</th>
                      <th className="text-left p-3 font-normal">Primary user</th>
                      <th className="text-left p-3 font-normal">Frequency</th>
                      <th className="text-left p-3 font-normal">Last activity</th>
                      <th className="text-left p-3 font-normal">Assigned</th>
                      <th className="text-left p-3 font-normal">Overdue</th>
                      <th className="text-left p-3 font-normal">Not started</th>
                      <th className="text-left p-3 font-normal">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(grouped[group] || []).map((row) => {
                      const tone = row.customersOverdue > 0 ? "critical" : row.customersWithActivity > 0 ? "ok" : "muted";
                      return (
                        <tr
                          key={row.tool.key}
                          className="border-b border-border/60 last:border-b-0 hover:bg-muted/20"
                        >
                          <td className="p-3 align-top">
                            <div className="text-foreground">{row.tool.name}</div>
                            <div className="text-xs text-muted-foreground mt-1 max-w-md">
                              {row.tool.whenToUse}
                            </div>
                          </td>
                          <td className="p-3 align-top text-muted-foreground">
                            {PHASE_LABEL[row.tool.phase]}
                          </td>
                          <td className="p-3 align-top text-muted-foreground">
                            {USER_LABEL[row.tool.primaryUser]}
                          </td>
                          <td className="p-3 align-top text-muted-foreground">
                            {row.tool.frequencyLabel}
                          </td>
                          <td className="p-3 align-top text-muted-foreground inline-flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {row.latestActivityIso ? formatRelativeTime(row.latestActivityIso) : "Never"}
                          </td>
                          <td className="p-3 align-top">
                            <span className="inline-flex items-center gap-1 text-foreground">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              {row.assignedCustomers}
                            </span>
                          </td>
                          <td className="p-3 align-top">
                            <span
                              className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded border ${
                                row.customersOverdue > 0 ? TONE_CLS.critical : TONE_CLS.muted
                              }`}
                            >
                              {row.customersOverdue}
                            </span>
                          </td>
                          <td className="p-3 align-top">
                            <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded border bg-muted/40 text-muted-foreground border-border">
                              {row.customersNotStarted}
                            </span>
                          </td>
                          <td className="p-3 align-top">
                            {row.tool.route ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-primary hover:text-primary/80"
                                onClick={() => navigate(row.tool.route!)}
                              >
                                Open <ArrowRight className="h-3 w-3" />
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
