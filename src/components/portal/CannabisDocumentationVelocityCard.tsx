/**
 * P85.5 — Client-facing Cannabis Documentation Velocity™ card.
 * Reads only approved + client-visible reviews via SECURITY DEFINER RPC.
 * Strips admin notes. Operational-readiness language only — never legal,
 * regulatory, or compliance certification claims.
 */
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CANNABIS_DOC_VELOCITY_CLIENT_SAFE_EXPLANATION,
  findCannabisDocVelocityForbiddenPhrase,
} from "@/config/cannabisDocumentationVelocity";
import {
  getClientCannabisDocVelocity,
  type ClientCannabisDocVelocityRow,
} from "@/lib/cannabisDocumentationVelocity";

export function CannabisDocumentationVelocityCard({
  customerId,
}: {
  customerId: string;
}) {
  const [rows, setRows] = useState<ClientCannabisDocVelocityRow[] | null>(null);

  useEffect(() => {
    if (!customerId) return;
    getClientCannabisDocVelocity(customerId)
      .then(setRows)
      .catch(() => setRows([]));
  }, [customerId]);

  if (!rows || rows.length === 0) return null;
  const latest = rows[0];
  // Defensive: if any unsafe wording slipped in, do not render the row.
  const explanation = latest.client_safe_explanation ?? "";
  if (explanation && findCannabisDocVelocityForbiddenPhrase(explanation)) return null;

  return (
    <section
      data-testid="cannabis-documentation-velocity-card"
      className="rounded-xl border border-border bg-card/60 p-5"
    >
      <header className="flex items-center gap-2 mb-3">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">
          Cannabis Documentation Velocity™
        </h3>
        <Badge variant="outline" className="text-[10px]">
          {latest.velocity_status}
        </Badge>
        {latest.needs_reinspection && (
          <Badge variant="outline" className="text-[10px]">
            Needs Re-Inspection
          </Badge>
        )}
      </header>
      <div className="text-xs text-muted-foreground space-y-1">
        {latest.last_manual_audit_at && (
          <div>
            Last manual seed-to-sale / inventory audit:{" "}
            <span className="text-foreground">
              {new Date(latest.last_manual_audit_at).toLocaleDateString()}
            </span>
          </div>
        )}
        {latest.days_since_manual_audit !== null && (
          <div>
            Days since last manual audit:{" "}
            <span className="text-foreground">
              {latest.days_since_manual_audit}
            </span>
          </div>
        )}
        <div>
          Operational gear: <span className="text-foreground">Operational Efficiency</span>
        </div>
      </div>
      {explanation && (
        <p className="mt-3 text-xs text-foreground leading-relaxed">{explanation}</p>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
        {CANNABIS_DOC_VELOCITY_CLIENT_SAFE_EXPLANATION}
      </p>
    </section>
  );
}

export default CannabisDocumentationVelocityCard;