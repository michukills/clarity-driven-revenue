/**
 * P86 — Client-facing Evidence Decay list. Approved/client_visible only via RPC.
 */
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientEvidenceDecayRecords,
  type ClientEvidenceDecayRow,
} from "@/lib/evidenceDecay";

export function EvidenceDecayList({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<ClientEvidenceDecayRow[] | null>(null);
  useEffect(() => {
    if (!customerId) return;
    getClientEvidenceDecayRecords(customerId).then(setRows).catch(() => setRows([]));
  }, [customerId]);
  if (!rows || rows.length === 0) return null;
  return (
    <section data-testid="evidence-decay-list" className="rounded-xl border border-border bg-card/60 p-5 space-y-3">
      <header className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Evidence Freshness</h3>
      </header>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-foreground">{r.evidence_label}</span>
              <Badge variant="outline" className="text-[10px]">{r.decay_state}</Badge>
              {r.expires_at && (
                <span className="text-[11px] text-muted-foreground">
                  expires {new Date(r.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
            {r.client_safe_message && (
              <p className="mt-1 text-muted-foreground">{r.client_safe_message}</p>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground italic">
        Operational-readiness signal only — not a legal, tax, audit, or compliance determination.
      </p>
    </section>
  );
}

export default EvidenceDecayList;