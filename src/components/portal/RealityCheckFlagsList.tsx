/**
 * P70 — Client-facing Reality Check Flags™ list.
 *
 * Renders ONLY approved + client-visible flags retrieved through the
 * SECURITY DEFINER RPC `get_client_reality_check_flags`. Never imports
 * the admin API. Never renders admin-only notes, dismissed flags,
 * other clients' flags, or unapproved flags.
 */
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  REALITY_CHECK_FLAGS_NAME,
  findRealityCheckForbiddenPhrase,
} from "@/config/realityCheckFlags";
import {
  getClientRealityCheckFlags,
  type ClientRealityCheckFlagRow,
} from "@/lib/realityCheck/realityCheckFlags";

interface Props {
  customerId: string;
}

export function RealityCheckFlagsList({ customerId }: Props) {
  const [rows, setRows] = useState<ClientRealityCheckFlagRow[] | null>(null);

  useEffect(() => {
    if (!customerId) return;
    getClientRealityCheckFlags(customerId)
      .then((r) => setRows(r))
      .catch(() => setRows([]));
  }, [customerId]);

  if (!rows) return null;

  return (
    <section className="rounded-xl border border-border bg-card/60 p-5">
      <header className="flex items-center gap-2 mb-3">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">{REALITY_CHECK_FLAGS_NAME}</h3>
      </header>
      <p className="text-[11px] text-muted-foreground mb-4">
        Operational inconsistencies and evidence gaps surfaced by RGS.
        Reality Check Flags™ are operational heuristics — not legal,
        compliance, accounting, fiduciary, or valuation conclusions.
        Where flagged, qualified professional review is recommended.
      </p>
      {rows.length === 0 && (
        <div className="text-xs text-muted-foreground">
          No Reality Check Flags have been reviewed and approved for your
          report yet.
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((f) => {
          // Defensive scrub: never display a forbidden phrase even if
          // somehow persisted past server checks.
          const expl = f.client_visible_explanation ?? "";
          if (findRealityCheckForbiddenPhrase(expl)) return null;
          return (
            <li key={f.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">{f.title}</span>
                <Badge variant="outline">{f.severity}</Badge>
                {f.affected_gear && (
                  <Badge variant="outline">{f.affected_gear.replace(/_/g, " ")}</Badge>
                )}
                {f.professional_review_recommended && (
                  <Badge variant="outline">Professional review recommended</Badge>
                )}
              </div>
              {expl && <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{expl}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default RealityCheckFlagsList;
