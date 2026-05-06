import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientLaborBurdenCalculations,
  type ClientLaborBurdenRow,
} from "@/lib/laborBurden";

export function LaborBurdenCard({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<ClientLaborBurdenRow[] | null>(null);
  useEffect(() => {
    if (!customerId) return;
    getClientLaborBurdenCalculations(customerId).then(setRows).catch(() => setRows([]));
  }, [customerId]);
  if (!rows || rows.length === 0) return null;
  return (
    <section data-testid="labor-burden-card" className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
      <header className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Labor Burden</h3>
      </header>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
              {r.paid_to_billable_gap_pct != null && (
                <span className="text-foreground">gap {Number(r.paid_to_billable_gap_pct).toFixed(1)}%</span>
              )}
            </div>
            {r.client_safe_explanation && (
              <p className="mt-1 text-muted-foreground">{r.client_safe_explanation}</p>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground italic">
        Operational-readiness signal only — not a wage, payroll, or labor-law determination.
      </p>
    </section>
  );
}

export default LaborBurdenCard;