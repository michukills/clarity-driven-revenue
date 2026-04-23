// P7.2 — Cross-Client Revenue Control Center™ Alerts
// Computed aggregation. No persistence, no resolution lifecycle. Only
// surfaces clients with active RCC access (addon-assigned resource).
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Activity, Eye } from "lucide-react";
import {
  loadRccCrossClientAlerts,
  type RccCrossClientAlert,
  type RccAlertSeverity,
} from "@/lib/bcc/crossClientAlerts";

const SEV_LABEL: Record<RccAlertSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  watch: "Watch",
};

const SEV_DOT: Record<RccAlertSeverity, string> = {
  critical: "bg-destructive",
  warning: "bg-amber-400",
  watch: "bg-sky-400",
};

const SEV_ICON: Record<RccAlertSeverity, JSX.Element> = {
  critical: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
  watch: <Eye className="h-3.5 w-3.5 text-sky-400" />,
};

function formatSignalDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AdminRccAlertsPanel() {
  const [alerts, setAlerts] = useState<RccCrossClientAlert[]>([]);
  const [activeClientCount, setActiveClientCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await loadRccCrossClientAlerts().catch(() => ({
        alerts: [],
        activeClientCount: 0,
      }));
      if (cancelled) return;
      setAlerts(res.alerts);
      setActiveClientCount(res.activeClientCount);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, watch: 0 };
    for (const a of alerts) c[a.severity]++;
    return c;
  }, [alerts]);

  // Cap dashboard density. Highest-severity alerts come first (already
  // sorted by loadRccCrossClientAlerts). Show top 12 here.
  const visible = alerts.slice(0, 12);
  const overflow = alerts.length - visible.length;

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Revenue Control Center™ · cross-client alerts
          </div>
          <h3 className="text-base font-light text-foreground inline-flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary/70" />
            Pattern detected across active RCC clients
          </h3>
        </div>
        <div className="text-xs text-muted-foreground">
          {activeClientCount} active RCC client{activeClientCount === 1 ? "" : "s"}
        </div>
      </div>

      {!loading && alerts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${SEV_DOT.critical}`} /> {counts.critical} critical
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${SEV_DOT.warning}`} /> {counts.warning} warning
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${SEV_DOT.watch}`} /> {counts.watch} watch
          </span>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : activeClientCount === 0 ? (
        <div className="text-sm text-muted-foreground">
          No active Revenue Control Center™ clients. Diagnostic-only clients
          are not included here.
        </div>
      ) : visible.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No Revenue Control Center™ alerts right now. All active RCC clients
          are within normal operating range.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((a) => (
            <li key={a.id}>
              <Link
                to={a.href}
                className="flex items-start gap-2 rounded-lg border border-border bg-card/30 p-2.5 hover:border-primary/40 transition-colors"
              >
                <div className="mt-0.5">{SEV_ICON[a.severity]}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">
                    {a.customerLabel} · {a.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{a.reason}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {SEV_LABEL[a.severity]}
                  </span>
                  <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    {formatSignalDate(a.latestSignalAt)}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {overflow > 0 && (
        <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          +{overflow} more · open a client to review
        </div>
      )}
    </section>
  );
}