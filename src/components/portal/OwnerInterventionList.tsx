import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientOwnerInterventions,
  type ClientOwnerInterventionRow,
} from "@/lib/ownerInterventionLog";

export function OwnerInterventionList({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<ClientOwnerInterventionRow[] | null>(null);
  useEffect(() => {
    if (!customerId) return;
    getClientOwnerInterventions(customerId).then(setRows).catch(() => setRows([]));
  }, [customerId]);
  if (!rows || rows.length === 0) return null;
  return (
    <section data-testid="owner-intervention-list" className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
      <header className="flex items-center gap-2">
        <UserCog className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Owner Intervention Log</h3>
      </header>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{r.intervention_type.replace(/_/g, " ")}</Badge>
              <Badge variant="outline" className="text-[10px]">{r.severity}</Badge>
              <span className="text-[11px] text-muted-foreground">{new Date(r.intervention_date).toLocaleDateString()}</span>
            </div>
            {r.client_safe_summary && <p className="mt-1 text-muted-foreground">{r.client_safe_summary}</p>}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground italic">
        Reviewed by RGS as an operational-readiness signal — not a legal, fiduciary, or compliance determination.
      </p>
    </section>
  );
}

export default OwnerInterventionList;