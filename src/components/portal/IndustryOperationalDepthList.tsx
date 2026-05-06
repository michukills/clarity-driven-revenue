/**
 * P86C — Client-facing Industry Operational Depth™ list.
 * Reads only approved + client-visible rows via SECURITY DEFINER RPC.
 * Strips admin notes and evidence IDs. Operational-readiness language
 * only — never legal/tax/accounting/payroll/labor/compliance/regulatory/
 * valuation/lender/investor claims.
 */
import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DEPTH_REPORT_SAFE_LANGUAGE,
  findDepthForbiddenPhrase,
} from "@/config/industryOperationalDepth";
import {
  getClientDepthReviews,
  type ClientDepthRow,
} from "@/lib/industryOperationalDepth";

export function IndustryOperationalDepthList({
  customerId,
}: {
  customerId: string;
}) {
  const [rows, setRows] = useState<ClientDepthRow[] | null>(null);

  useEffect(() => {
    if (!customerId) return;
    getClientDepthReviews(customerId)
      .then(setRows)
      .catch(() => setRows([]));
  }, [customerId]);

  if (!rows || rows.length === 0) return null;
  const safe = rows.filter(
    (r) => !findDepthForbiddenPhrase(r.client_safe_explanation ?? ""),
  );
  if (safe.length === 0) return null;

  return (
    <section
      data-testid="industry-operational-depth-list"
      className="rounded-xl border border-border bg-card/60 p-5 space-y-3"
    >
      <header className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">
          RGS Industry Operational Depth™
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
              {r.severity && r.severity !== "none" && (
                <Badge variant="outline" className="text-[10px]">
                  severity: {r.severity}
                </Badge>
              )}
              {r.needs_reinspection && (
                <Badge variant="outline" className="text-[10px]">
                  Needs Re-Inspection
                </Badge>
              )}
              {r.trigger_value !== null && r.threshold_value !== null && (
                <span className="text-[11px] text-muted-foreground">
                  {Number(r.trigger_value).toFixed(2)} (threshold {r.threshold_value})
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
        Industry-specific signals are business-stability and operating-readiness
        indicators. They do not determine legal compliance, tax treatment,
        accounting treatment, labor compliance, licensing status, insurance
        suitability, valuation, financing readiness, or guaranteed business
        results.
      </p>
      <p className="sr-only">{DEPTH_REPORT_SAFE_LANGUAGE}</p>
    </section>
  );
}

export default IndustryOperationalDepthList;