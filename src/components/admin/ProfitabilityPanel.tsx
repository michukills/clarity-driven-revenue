/* P11.6 — Offer + Client Profitability admin panel.
 *
 * Visualizes profitability rollups by service line and client/job, surfaces
 * the strongest and weakest margin zones, and lets admins manually emit
 * profitability signals into the learning bus.
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  buildProfitabilityRollup,
  type ProfitabilityLine,
  type ProfitabilityRollup,
  type ProfitWindow,
} from "@/lib/bcc/profitability";
import { emitProfitabilitySignals } from "@/lib/diagnostics/profitabilitySignalEmitter";

function money(n: number) {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString()}`;
}
function pct(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function marginTone(m: number): "good" | "ok" | "warn" | "bad" {
  if (m >= 0.45) return "good";
  if (m >= 0.2) return "ok";
  if (m >= 0.1) return "warn";
  return "bad";
}
const toneClass: Record<string, string> = {
  good: "text-emerald-400",
  ok: "text-foreground",
  warn: "text-amber-300",
  bad: "text-rose-400",
};

function MarginCell({ value }: { value: number }) {
  return <span className={toneClass[marginTone(value)]}>{pct(value)}</span>;
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-light text-foreground">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function LineRow({ line }: { line: ProfitabilityLine }) {
  return (
    <TableRow>
      <TableCell className="font-medium text-foreground">
        {line.label || <span className="text-muted-foreground italic">Unattributed</span>}
        {!line.attribution_complete && (
          <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            revenue only
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">{money(line.revenue)}</TableCell>
      <TableCell className="text-right text-muted-foreground">{money(line.labor_cost)}</TableCell>
      <TableCell className="text-right text-muted-foreground">{money(line.expense_cost)}</TableCell>
      <TableCell className="text-right">{money(line.gross_profit)}</TableCell>
      <TableCell className="text-right">
        <MarginCell value={line.gross_margin} />
      </TableCell>
      <TableCell className="text-right text-muted-foreground">{pct(line.share_of_revenue)}</TableCell>
      <TableCell className="text-right text-muted-foreground">
        {line.hourly_yield === null ? "—" : `$${Math.round(line.hourly_yield)}/hr`}
      </TableCell>
    </TableRow>
  );
}

function ProfitabilityTable({
  title,
  lines,
  emptyHint,
}: {
  title: string;
  lines: ProfitabilityLine[];
  emptyHint: string;
}) {
  const visible = lines.filter((l) => l.revenue > 0 || l.labor_cost > 0);
  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      {visible.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">{emptyHint}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Line</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Direct labor</TableHead>
              <TableHead className="text-right">Direct exp.</TableHead>
              <TableHead className="text-right">Gross profit</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-right">% of rev</TableHead>
              <TableHead className="text-right">Hourly yield</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((l) => (
              <LineRow key={l.key || "_unattrib"} line={l} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export function ProfitabilityPanel({ customerId }: { customerId: string }) {
  const [window, setWindow] = useState<ProfitWindow>("trailing_90");
  const [data, setData] = useState<ProfitabilityRollup | null>(null);
  const [loading, setLoading] = useState(true);
  const [emitting, setEmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    buildProfitabilityRollup({ customerId, window })
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e) => {
        if (!cancelled) toast.error(`Profitability load failed: ${(e as Error).message}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, window]);

  const attributionPct = useMemo(() => {
    if (!data || data.total_revenue <= 0) return 0;
    return data.attributed_revenue / data.total_revenue;
  }, [data]);

  async function handleEmit() {
    setEmitting(true);
    try {
      const res = await emitProfitabilitySignals({ customerId, window });
      toast.success(`Emitted ${res.emitted} profitability signal${res.emitted === 1 ? "" : "s"}.`);
    } catch (e) {
      toast.error(`Signal emission failed: ${(e as Error).message}`);
    } finally {
      setEmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-light text-foreground">Profitability</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Direct attribution by service line and client/job. Unattributed cost is not silently allocated.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-card border border-border rounded-md p-1">
            {(["current_month", "prior_month", "trailing_90"] as ProfitWindow[]).map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={`px-3 py-1 text-xs rounded ${
                  window === w ? "bg-primary/15 text-foreground" : "text-muted-foreground"
                }`}
              >
                {w === "current_month" ? "This month" : w === "prior_month" ? "Last month" : "Trailing 90d"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={handleEmit} disabled={emitting || loading}>
            {emitting ? "Emitting…" : "Emit signals"}
          </Button>
        </div>
      </div>

      {loading || !data ? (
        <div className="bg-card border border-border rounded-xl p-8 text-sm text-muted-foreground">
          Loading profitability…
        </div>
      ) : data.total_revenue <= 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-sm text-muted-foreground">
          No revenue recorded in this window. Add revenue entries to see profitability.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile
              label="Revenue"
              value={money(data.total_revenue)}
              hint={`${data.period_start} → ${data.period_end}`}
            />
            <Tile
              label="Direct labor"
              value={money(data.total_labor_cost)}
              hint={`Attributed: ${money(data.attributed_labor_cost)}`}
            />
            <Tile label="Direct expenses" value={money(data.total_expense_cost)} />
            <Tile
              label="Gross profit"
              value={
                <span className={toneClass[marginTone(data.total_gross_margin)]}>
                  {money(data.total_gross_profit)}
                </span>
              }
              hint={`Margin ${pct(data.total_gross_margin)}`}
            />
          </div>

          {attributionPct < 0.6 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
              <span className="font-medium">Attribution gap.</span>{" "}
              Only {pct(attributionPct)} of revenue is tagged with a service category. Per-offer
              margins reflect tagged revenue only — overhead and untagged revenue are excluded
              instead of force-allocated.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Best offer</div>
              {data.best_offer ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-foreground text-sm">{data.best_offer.label}</div>
                  <Badge variant="outline" className="text-emerald-300 border-emerald-500/30">
                    {pct(data.best_offer.gross_margin)} margin
                  </Badge>
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">No clear standout yet.</div>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Worst offer</div>
              {data.worst_offer ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-foreground text-sm">{data.worst_offer.label}</div>
                  <Badge variant="outline" className="text-rose-300 border-rose-500/30">
                    {pct(data.worst_offer.gross_margin)} margin
                  </Badge>
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">No weak offer detected.</div>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Best client/job</div>
              {data.best_client ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-foreground text-sm">{data.best_client.label}</div>
                  <Badge variant="outline" className="text-emerald-300 border-emerald-500/30">
                    {pct(data.best_client.gross_margin)} margin
                  </Badge>
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">No standout client yet.</div>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Worst client/job</div>
              {data.worst_client ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-foreground text-sm">{data.worst_client.label}</div>
                  <Badge variant="outline" className="text-rose-300 border-rose-500/30">
                    {pct(data.worst_client.gross_margin)} margin
                  </Badge>
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">No weak client detected.</div>
              )}
            </div>
          </div>

          <ProfitabilityTable
            title="Offer / service-line profitability"
            lines={data.offers}
            emptyHint="Tag revenue and labor with a service category to see offer-level margins."
          />
          <ProfitabilityTable
            title="Client / job profitability"
            lines={data.clients}
            emptyHint="Tag revenue with a client/job and labor with a job/project to see client-level margins."
          />
        </>
      )}
    </div>
  );
}