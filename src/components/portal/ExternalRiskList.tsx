import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientExternalRiskTriggers,
  type ClientExternalRiskRow,
} from "@/lib/externalRiskTriggers";

export function ExternalRiskList({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<ClientExternalRiskRow[] | null>(null);
  useEffect(() => {
    if (!customerId) return;
    getClientExternalRiskTriggers(customerId).then(setRows).catch(() => setRows([]));
  }, [customerId]);
  if (!rows || rows.length === 0) return null;
  return (
    <section data-testid="external-risk-list" className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
      <header className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">External Risk Signals</h3>
      </header>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{r.trigger_type.replace(/_/g, " ")}</Badge>
              <Badge variant="outline" className="text-[10px]">{r.severity}</Badge>
              <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
              <span className="text-[11px] text-muted-foreground">gear: {r.affected_gear}</span>
            </div>
            {r.client_safe_summary && <p className="mt-1 text-muted-foreground">{r.client_safe_summary}</p>}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground italic">
        Manual admin-reviewed operational risk signal — not live external monitoring.
      </p>
    </section>
  );
}

export default ExternalRiskList;