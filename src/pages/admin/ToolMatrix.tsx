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
import { formatRelativeTime } from "@/lib/portal";
import { ArrowLeft, ArrowRight, Activity, Users, Clock } from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, counts] = await Promise.all([
        loadToolActivity(),
        loadAssignedCountsByMatrixKey(),
      ]);
      setActivity(a);
      setAssignedCounts(counts);
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
        <h1 className="mt-1 text-3xl text-foreground">Tools, owners, frequency, and overdue signal</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Every tool in the RGS operating system mapped to its phase, primary user,
          recommended cadence, and current activity. Use this to confirm clients
          are operating the right tools at the right rhythm.
        </p>
      </header>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading matrix…</div>
      ) : (
        <div className="space-y-10">
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
