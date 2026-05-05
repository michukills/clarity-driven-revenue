/**
 * P71 — Client-facing Worn Tooth Signals™ list (Revenue & Risk Monitor™).
 *
 * Renders ONLY approved + client-visible signals retrieved through the
 * SECURITY DEFINER RPC `get_client_worn_tooth_signals`. Never imports
 * the admin API. Never renders admin notes, internal rule logic,
 * dismissed signals, or other clients' signals.
 */
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  WORN_TOOTH_SIGNALS_NAME,
  findWornToothSignalForbiddenPhrase,
} from "@/config/wornToothSignals";
import {
  getClientWornToothSignals,
  type ClientWornToothSignalRow,
} from "@/lib/wornToothSignals/wornToothSignals";

interface Props {
  customerId: string;
}

export function WornToothSignalsList({ customerId }: Props) {
  const [rows, setRows] = useState<ClientWornToothSignalRow[] | null>(null);

  useEffect(() => {
    if (!customerId) return;
    getClientWornToothSignals(customerId)
      .then(setRows)
      .catch(() => setRows([]));
  }, [customerId]);

  if (!rows) return null;

  return (
    <section className="rounded-xl border border-border bg-card/60 p-5">
      <header className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">{WORN_TOOTH_SIGNALS_NAME}</h3>
      </header>
      <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
        Early operational warnings that one part of the system may be
        slipping. These are operational observations — not guarantees,
        legal/compliance/accounting/fiduciary/valuation conclusions, or
        predictions of future business performance.
      </p>
      {rows.length === 0 && (
        <div className="text-xs text-muted-foreground">
          No approved Worn Tooth Signals™ are currently visible. RGS will
          surface them here when there is enough reviewed evidence.
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((s) => {
          // Defensive scrub: never display a forbidden phrase.
          if (
            findWornToothSignalForbiddenPhrase(s.client_safe_summary) ||
            findWornToothSignalForbiddenPhrase(s.client_safe_explanation) ||
            findWornToothSignalForbiddenPhrase(s.recommended_owner_action)
          ) {
            return null;
          }
          return (
            <li key={s.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">{s.signal_title}</span>
                <Badge variant="outline">{s.severity}</Badge>
                {s.gear && <Badge variant="outline">{s.gear.replace(/_/g, " ")}</Badge>}
                {s.trend && s.trend !== "unknown" && (
                  <Badge variant="outline">trend: {s.trend}</Badge>
                )}
                {s.professional_review_recommended && (
                  <Badge variant="outline">Professional review recommended</Badge>
                )}
              </div>
              {s.client_safe_summary && (
                <p className="mt-2 text-xs text-foreground">{s.client_safe_summary}</p>
              )}
              {s.client_safe_explanation && (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {s.client_safe_explanation}
                </p>
              )}
              {s.recommended_owner_action && (
                <p className="mt-2 text-xs text-foreground">
                  <span className="text-muted-foreground">Owner action: </span>
                  {s.recommended_owner_action}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default WornToothSignalsList;