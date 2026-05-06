/**
 * P85.3 — Client-facing Forward Stability Flags™ list.
 * Reads only approved + client-visible flags via SECURITY DEFINER RPC.
 */
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientForwardStabilityFlags,
  type ClientForwardStabilityFlagRow,
} from "@/lib/forwardStabilityFlags";
import {
  findForwardFlagForbiddenPhrase,
  FORWARD_STABILITY_FLAGS_REPORT_SAFE_LANGUAGE,
} from "@/config/forwardStabilityFlags";

export function ForwardStabilityFlagsList({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<ClientForwardStabilityFlagRow[] | null>(null);

  useEffect(() => {
    if (!customerId) return;
    getClientForwardStabilityFlags(customerId).then(setRows).catch(() => setRows([]));
  }, [customerId]);

  if (!rows) return null;

  return (
    <section className="rounded-xl border border-border bg-card/60 p-5">
      <header className="flex items-center gap-2 mb-3">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Forward Stability Flags™</h3>
      </header>
      <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
        {FORWARD_STABILITY_FLAGS_REPORT_SAFE_LANGUAGE}
      </p>
      {rows.length === 0 && (
        <div className="text-xs text-muted-foreground">
          No approved Forward Stability Flags™ are currently visible.
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((f) => {
          const expl = f.client_safe_explanation ?? "";
          if (findForwardFlagForbiddenPhrase(expl)) return null;
          return (
            <li key={f.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">{f.flag_label}</span>
                <Badge variant="outline">{f.severity}</Badge>
                <Badge variant="outline">{f.gear_key.replace(/_/g, " ")}</Badge>
                {f.needs_reinspection && (
                  <Badge variant="outline">Needs Re-Inspection</Badge>
                )}
              </div>
              {expl && (
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{expl}</p>
              )}
              {f.reinspection_reason && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Re-inspection reason: {f.reinspection_reason}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default ForwardStabilityFlagsList;
