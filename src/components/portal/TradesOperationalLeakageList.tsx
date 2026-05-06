/**
 * P85.6 — Client-facing Trades / Home Services Operational Leakage™ list.
 * Reads only approved + client-visible reviews via SECURITY DEFINER RPC.
 * Strips admin notes and evidence source IDs. Operational-readiness
 * language only — never legal, payroll, tax, OSHA, licensing, or
 * compliance certification claims.
 */
import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  TRADES_OPERATIONAL_CLIENT_SAFE_EXPLANATION,
  findTradesOperationalForbiddenPhrase,
} from "@/config/tradesOperationalLeakage";
import {
  getClientTradesLeakageReviews,
  type ClientTradesLeakageRow,
} from "@/lib/tradesOperationalLeakage";

export function TradesOperationalLeakageList({
  customerId,
}: {
  customerId: string;
}) {
  const [rows, setRows] = useState<ClientTradesLeakageRow[] | null>(null);

  useEffect(() => {
    if (!customerId) return;
    getClientTradesLeakageReviews(customerId)
      .then(setRows)
      .catch(() => setRows([]));
  }, [customerId]);

  if (!rows || rows.length === 0) return null;
  const safe = rows.filter(
    (r) => !findTradesOperationalForbiddenPhrase(r.client_safe_explanation ?? ""),
  );
  if (safe.length === 0) return null;

  return (
    <section
      data-testid="trades-operational-leakage-list"
      className="rounded-xl border border-border bg-card/60 p-5 space-y-3"
    >
      <header className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">
          Trades / Home Services Operational Leakage™
        </h3>
      </header>
      <ul className="space-y-3">
        {safe.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-border/60 bg-background/40 p-3"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-foreground">{r.metric_label}</span>
              <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
              {r.needs_reinspection && (
                <Badge variant="outline" className="text-[10px]">Needs Re-Inspection</Badge>
              )}
              {r.trigger_value !== null && r.threshold_value !== null && (
                <span className="text-[11px] text-muted-foreground">
                  {Number(r.trigger_value).toFixed(1)}% (threshold {r.threshold_value}%)
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                gear: {r.gear_key.replace(/_/g, " ")}
              </span>
            </div>
            {r.client_safe_explanation && (
              <p className="mt-2 text-xs text-foreground leading-relaxed">
                {r.client_safe_explanation}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {TRADES_OPERATIONAL_CLIENT_SAFE_EXPLANATION}
      </p>
    </section>
  );
}

export default TradesOperationalLeakageList;
