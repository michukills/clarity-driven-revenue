import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AGREEMENT_REGISTRY,
  AGREEMENT_KEYS,
  type AgreementKey,
} from "@/config/architectsShield";
import {
  listAcknowledgmentsForCustomer,
  type ClientAcknowledgmentRow,
} from "@/lib/legal/clientAcknowledgments";

/**
 * P69 — Admin-only Architect's Shield™ acceptance status panel.
 *
 * Renders a per-agreement status row showing whether the customer has a
 * non-revoked acceptance at the current registry version.
 */
export function ArchitectsShieldStatusPanel({
  customerId,
}: {
  customerId: string;
}) {
  const [rows, setRows] = useState<ClientAcknowledgmentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listAcknowledgmentsForCustomer(customerId);
        if (!cancelled) setRows(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load acknowledgments");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const latestByKey = (key: AgreementKey) =>
    (rows ?? []).find((r) => r.agreement_key === key && !r.revoked_at) ?? null;

  return (
    <section
      data-testid="architects-shield-status-panel"
      className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4"
    >
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">
            Architect&rsquo;s Shield&trade; — acceptance status
          </h3>
          <Badge variant="outline" className="text-[10px]">
            Admin only
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            P69
          </Badge>
        </div>
      </header>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : rows == null ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <ul className="divide-y divide-border">
          {AGREEMENT_KEYS.map((key) => {
            const def = AGREEMENT_REGISTRY[key];
            const row = latestByKey(key);
            const current = row?.agreement_version === def.version;
            return (
              <li
                key={key}
                className="py-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm text-foreground">{def.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Current version v{def.version}
                    {row && (
                      <>
                        {" · accepted v"}
                        {row.agreement_version}
                        {" · "}
                        {new Date(row.accepted_at).toLocaleDateString()}
                        {" · "}
                        context: {row.acceptance_context}
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {current ? (
                    <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30">
                      <ShieldCheck className="h-3 w-3 mr-1" /> On file
                    </Badge>
                  ) : row ? (
                    <Badge variant="outline" className="text-[10px]">
                      <ShieldAlert className="h-3 w-3 mr-1" /> Outdated
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Not acknowledged
                    </Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ArchitectsShieldStatusPanel;