// P9.0 — Compact AdminDashboard panel: RGS Impact Ledger summary.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import {
  IMPACT_AREA_LABEL,
  IMPACT_TYPE_LABEL,
  IMPACT_VISIBILITY_LABEL,
  loadImpactDashboardSummary,
  type ImpactDashboardSummary,
} from "@/lib/impact/ledger";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AdminImpactLedgerPanel() {
  const [data, setData] = useState<ImpactDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const summary = await loadImpactDashboardSummary().catch(() => null);
      if (!cancelled) {
        setData(summary);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary/70" />
          <h3 className="text-sm font-medium text-foreground">Impact Ledger</h3>
          <span className="text-[11px] text-muted-foreground">
            {(data?.visibleThisMonth ?? 0)} client-visible · {(data?.verifiedThisMonth ?? 0)} verified this month
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : !data || data.recent.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          No impact entries logged yet. Add the first one from a customer's Impact tab.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {data.recent.map((r) => {
            const name = r.customer_business_name || r.customer_full_name || "Unknown client";
            return (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/10 p-2.5"
              >
                {r.visibility === "client_visible" ? (
                  <Eye className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-foreground font-medium truncate">{name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {r.status.replace(/_/g, " ")} · {fmt(r.impact_date)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {IMPACT_AREA_LABEL[r.impact_area]} · {IMPACT_TYPE_LABEL[r.impact_type]} ·{" "}
                    {IMPACT_VISIBILITY_LABEL[r.visibility]}
                  </p>
                  <p className="text-[11px] text-foreground/85 truncate">{r.title}</p>
                </div>
                <Link
                  to={`/admin/customers/${r.customer_id}?tab=impact`}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-secondary self-center shrink-0"
                >
                  Open <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default AdminImpactLedgerPanel;