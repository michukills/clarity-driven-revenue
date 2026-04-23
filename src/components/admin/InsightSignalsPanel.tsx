/* P10.2d — Admin-only Insight Signals viewer.
 *
 * Compact diagnostic panel for the Customer Detail → Stability tab.
 * Internal evidence layer; never shown to clients.
 */

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Activity, RefreshCcw } from "lucide-react";
import {
  listInsightSignalsForCustomer,
  SIGNAL_SOURCE_LABEL,
  SIGNAL_TYPE_LABEL,
  type InsightSignalRow,
} from "@/lib/diagnostics/insightSignals";

interface Props {
  customerId: string;
}

export function InsightSignalsPanel({ customerId }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<InsightSignalRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!customerId) return;
    setLoading(true);
    listInsightSignalsForCustomer(customerId, { limit: 25, sinceDays: 90 })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open && rows.length === 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId]);

  const strengthClass = (s: string) =>
    s === "high"
      ? "border-rose-500/30 text-rose-300"
      : s === "medium"
      ? "border-amber-500/30 text-amber-300"
      : "border-border text-muted-foreground";

  return (
    <section className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Internal Evidence
          </div>
          <h3 className="text-base font-medium text-foreground mt-0.5 inline-flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Insight Signals
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Structured observations captured across RGS surfaces. Used by
            the Insight Engine as supporting evidence. Admin-only — never
            shown to clients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {open && (
            <button
              onClick={load}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              aria-label="Refresh"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <>
          {loading && rows.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No insight signals captured in the last 90 days.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="border border-border/60 rounded-md p-2.5 text-xs space-y-1"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-foreground font-medium">
                      {r.evidence_label}
                    </span>
                    <span className={`text-[9px] uppercase tracking-wider rounded px-1.5 py-0.5 border ${strengthClass(r.strength)}`}>
                      {r.strength}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                      {SIGNAL_TYPE_LABEL[r.signal_type] ?? r.signal_type}
                    </span>
                    {r.related_pillar && (
                      <span className="text-[9px] uppercase tracking-wider text-primary/80 border border-primary/30 rounded px-1.5 py-0.5">
                        {r.related_pillar.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground">{r.evidence_summary}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/80">
                    <span>{SIGNAL_SOURCE_LABEL[r.signal_source] ?? r.signal_source}</span>
                    <span>{new Date(r.occurred_at).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}