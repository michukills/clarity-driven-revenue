/* P10.2e — Admin-only Insight Signals viewer.
 *
 * Internal evidence layer for the Customer Detail → Stability tab.
 * Provides a compact summary, filters, and a recent signals list so admins
 * can scan structured observations driving the Insight Engine. Never shown
 * to clients.
 */

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Activity, RefreshCcw } from "lucide-react";
import {
  listInsightSignalsForCustomer,
  SIGNAL_SOURCE_LABEL,
  SIGNAL_TYPE_LABEL,
  type InsightSignalRow,
  type SignalPillar,
  type SignalSource,
  type SignalType,
} from "@/lib/diagnostics/insightSignals";

interface Props {
  customerId: string;
}

type WindowDays = 30 | 60 | 90;

const STRENGTH_RANK: Record<string, number> = { low: 0, medium: 1, high: 2 };

const PILLAR_LABEL: Record<SignalPillar | "unspecified", string> = {
  demand_generation: "Demand Generation",
  revenue_conversion: "Revenue Conversion",
  operational_efficiency: "Operational Efficiency",
  financial_visibility: "Financial Visibility",
  owner_independence: "Owner Independence",
  unspecified: "Unspecified",
};

function strengthClass(s: string) {
  return s === "high"
    ? "border-rose-500/30 text-rose-300"
    : s === "medium"
    ? "border-amber-500/30 text-amber-300"
    : "border-border text-muted-foreground";
}

function confidenceClass(c: string) {
  return c === "high"
    ? "border-emerald-500/30 text-emerald-300"
    : c === "medium"
    ? "border-border text-muted-foreground"
    : "border-border/60 text-muted-foreground/70";
}

export function InsightSignalsPanel({ customerId }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<InsightSignalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [windowDays, setWindowDays] = useState<WindowDays>(90);
  const [sourceFilter, setSourceFilter] = useState<SignalSource | "all">("all");
  const [typeFilter, setTypeFilter] = useState<SignalType | "all">("all");
  const [pillarFilter, setPillarFilter] = useState<SignalPillar | "unspecified" | "all">("all");
  const [strongOnly, setStrongOnly] = useState(false);

  const load = (days: WindowDays = windowDays) => {
    if (!customerId) return;
    setLoading(true);
    listInsightSignalsForCustomer(customerId, { limit: 200, sinceDays: days })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load(windowDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId, windowDays]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (sourceFilter !== "all" && r.signal_source !== sourceFilter) return false;
      if (typeFilter !== "all" && r.signal_type !== typeFilter) return false;
      if (pillarFilter !== "all") {
        const p = (r.related_pillar ?? "unspecified") as SignalPillar | "unspecified";
        if (p !== pillarFilter) return false;
      }
      if (strongOnly && r.strength !== "high") return false;
      return true;
    });
  }, [rows, sourceFilter, typeFilter, pillarFilter, strongOnly]);

  // Summary computed from the loaded window (not the active filter), so admins
  // can see overall context even when zooming into a slice.
  const summary = useMemo(() => {
    const by_type: Partial<Record<SignalType, number>> = {};
    const by_pillar: Partial<Record<SignalPillar | "unspecified", number>> = {};
    const by_source: Partial<Record<SignalSource, number>> = {};
    let strongest: InsightSignalRow | null = null;
    for (const r of rows) {
      by_type[r.signal_type] = (by_type[r.signal_type] ?? 0) + 1;
      const pk = (r.related_pillar ?? "unspecified") as SignalPillar | "unspecified";
      by_pillar[pk] = (by_pillar[pk] ?? 0) + 1;
      by_source[r.signal_source] = (by_source[r.signal_source] ?? 0) + 1;
      if (
        !strongest ||
        STRENGTH_RANK[r.strength] > STRENGTH_RANK[strongest.strength] ||
        (STRENGTH_RANK[r.strength] === STRENGTH_RANK[strongest.strength] &&
          new Date(r.occurred_at).getTime() > new Date(strongest.occurred_at).getTime())
      ) {
        strongest = r;
      }
    }
    const recurring = (Object.entries(by_type) as [SignalType, number][])
      .filter(([, n]) => n >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const topPillar = (Object.entries(by_pillar) as [SignalPillar | "unspecified", number][])
      .sort((a, b) => b[1] - a[1])[0];
    const topSource = (Object.entries(by_source) as [SignalSource, number][])
      .sort((a, b) => b[1] - a[1])[0];
    return {
      total: rows.length,
      recurring,
      strongest,
      topPillar,
      topSource,
      by_source,
      by_pillar,
      by_type,
    };
  }, [rows]);

  const availableSources = useMemo(
    () => Array.from(new Set(rows.map((r) => r.signal_source))),
    [rows],
  );
  const availableTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.signal_type))),
    [rows],
  );
  const availablePillars = useMemo(
    () =>
      Array.from(
        new Set(
          rows.map((r) => (r.related_pillar ?? "unspecified") as SignalPillar | "unspecified"),
        ),
      ),
    [rows],
  );

  const clearFilters = () => {
    setSourceFilter("all");
    setTypeFilter("all");
    setPillarFilter("all");
    setStrongOnly(false);
  };
  const hasActiveFilter =
    sourceFilter !== "all" || typeFilter !== "all" || pillarFilter !== "all" || strongOnly;

  return (
    <section className="bg-card border border-border rounded-xl p-5 space-y-4">
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
            Structured observations captured across RGS surfaces. Used by the
            Insight Engine as supporting evidence. Admin-only — never shown
            to clients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {open && (
            <button
              onClick={() => load(windowDays)}
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
          {/* Summary block */}
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-foreground font-medium">
                {summary.total} signal{summary.total === 1 ? "" : "s"} in last {windowDays}d
              </span>
              {summary.topSource && (
                <span className="text-muted-foreground">
                  • Top source:{" "}
                  <span className="text-foreground">
                    {SIGNAL_SOURCE_LABEL[summary.topSource[0]] ?? summary.topSource[0]}
                  </span>{" "}
                  ({summary.topSource[1]})
                </span>
              )}
              {summary.topPillar && (
                <span className="text-muted-foreground">
                  • Top pillar:{" "}
                  <span className="text-foreground">
                    {PILLAR_LABEL[summary.topPillar[0]]}
                  </span>{" "}
                  ({summary.topPillar[1]})
                </span>
              )}
            </div>
            {summary.strongest && (
              <div className="text-[11px] text-muted-foreground">
                Strongest recent:{" "}
                <span className="text-foreground">{summary.strongest.evidence_label}</span>{" "}
                <span className="text-muted-foreground/80">
                  ({summary.strongest.strength} • {new Date(summary.strongest.occurred_at).toLocaleDateString()})
                </span>
              </div>
            )}
            {summary.recurring.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Recurring:
                </span>
                {summary.recurring.map(([t, n]) => (
                  <span
                    key={t}
                    className="text-[10px] uppercase tracking-wider text-primary border border-primary/30 rounded px-1.5 py-0.5"
                  >
                    {SIGNAL_TYPE_LABEL[t] ?? t} · {n}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <div className="inline-flex rounded border border-border overflow-hidden">
              {([30, 60, 90] as WindowDays[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setWindowDays(d)}
                  className={`px-2 py-1 ${
                    windowDays === d
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SignalSource | "all")}
              className="bg-muted/40 border border-border rounded px-2 py-1 text-[11px]"
            >
              <option value="all">All sources</option>
              {availableSources.map((s) => (
                <option key={s} value={s}>
                  {SIGNAL_SOURCE_LABEL[s] ?? s}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as SignalType | "all")}
              className="bg-muted/40 border border-border rounded px-2 py-1 text-[11px]"
            >
              <option value="all">All types</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {SIGNAL_TYPE_LABEL[t] ?? t}
                </option>
              ))}
            </select>

            <select
              value={pillarFilter}
              onChange={(e) =>
                setPillarFilter(e.target.value as SignalPillar | "unspecified" | "all")
              }
              className="bg-muted/40 border border-border rounded px-2 py-1 text-[11px]"
            >
              <option value="all">All pillars</option>
              {availablePillars.map((p) => (
                <option key={p} value={p}>
                  {PILLAR_LABEL[p]}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-1 text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={strongOnly}
                onChange={(e) => setStrongOnly(e.target.checked)}
                className="accent-primary"
              />
              Strong only
            </label>

            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Clear
              </button>
            )}

            <span className="ml-auto text-muted-foreground">
              {filtered.length} shown
            </span>
          </div>

          {/* List */}
          {loading && rows.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No insight signals captured in the last {windowDays} days.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No signals match the current filters.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((r) => {
                const isStrong = r.strength === "high";
                return (
                  <li
                    key={r.id}
                    className={`rounded-md p-2.5 text-xs space-y-1 border ${
                      isStrong
                        ? "border-primary/25 bg-primary/[0.04]"
                        : "border-border/60 bg-background/30"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-foreground font-medium">
                        {r.evidence_label}
                      </span>
                      <span
                        className={`text-[9px] uppercase tracking-wider rounded px-1.5 py-0.5 border ${strengthClass(
                          r.strength,
                        )}`}
                      >
                        {r.strength}
                      </span>
                      <span
                        className={`text-[9px] uppercase tracking-wider rounded px-1.5 py-0.5 border ${confidenceClass(
                          r.confidence,
                        )}`}
                      >
                        conf: {r.confidence}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        {SIGNAL_TYPE_LABEL[r.signal_type] ?? r.signal_type}
                      </span>
                      {r.related_pillar && (
                        <span className="text-[9px] uppercase tracking-wider text-primary/80 border border-primary/30 rounded px-1.5 py-0.5">
                          {PILLAR_LABEL[r.related_pillar]}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {r.evidence_summary}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80">
                      <span>
                        {SIGNAL_SOURCE_LABEL[r.signal_source] ?? r.signal_source}
                      </span>
                      <span>{new Date(r.occurred_at).toLocaleDateString()}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}