// P9.0 — Client-safe Impact Ledger summary card for the customer portal.
import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, CircleDot } from "lucide-react";
import {
  IMPACT_AREA_LABEL,
  IMPACT_STATUS_LABEL,
  formatImpactValue,
  loadClientVisibleImpact,
  type ImpactEntry,
} from "@/lib/impact/ledger";

function fmt(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  customerId: string;
}

export function ClientImpactCard({ customerId }: Props) {
  const [entries, setEntries] = useState<ImpactEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadClientVisibleImpact(customerId);
        if (!cancelled) setEntries(data);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading) return null;
  if (entries.length === 0) return null;

  const top = entries.slice(0, 6);

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary/70" />
          <h3 className="text-sm font-medium text-foreground">Impact Ledger</h3>
        </div>
        <span className="text-[11px] text-muted-foreground">
          What RGS has helped clarify, install, or improve.
        </span>
      </div>

      <ul className="space-y-2">
        {top.map((e) => {
          const isDone = e.status === "verified" || e.status === "resolved" || e.status === "improved" || e.status === "installed";
          const value =
            e.current_value !== null && e.value_unit && e.value_unit !== "text"
              ? formatImpactValue(e.current_value, e.value_unit)
              : null;
          return (
            <li
              key={e.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/10 p-3"
            >
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <CircleDot className="h-4 w-4 text-primary/70 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm text-foreground font-medium">{e.title}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {IMPACT_STATUS_LABEL[e.status]} · {fmt(e.impact_date)}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 mt-1 leading-relaxed">
                  {e.client_note?.trim() || e.summary}
                </p>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {IMPACT_AREA_LABEL[e.impact_area]}
                  {value && (
                    <span className="ml-2 text-foreground/80 tabular-nums">{value}</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ClientImpactCard;