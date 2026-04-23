/**
 * P12.1 — Admin cadence/compliance visibility.
 *
 * Compact read-only card so admins can answer "is this client current,
 * overdue, missing baseline, or stale?" without digging through tool data.
 * Uses the same shared cadence helper as the client surfaces, so admin
 * and client views can never disagree.
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import {
  loadCustomerCadence,
  cadenceBadgeLabel,
  type CustomerCadenceSnapshot,
} from "@/lib/cadence/cadence";

interface Props { customerId: string }

export function CadenceCompliancePanel({ customerId }: Props) {
  const [snap, setSnap] = useState<CustomerCadenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadCustomerCadence(customerId)
      .then((s) => { if (alive) setSnap(s); })
      .catch(() => { if (alive) setSnap(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [customerId]);

  const variantFor = (tone?: string) =>
    tone === "good" ? "secondary" :
    tone === "info" ? "outline" :
    "destructive";

  const lastSeen = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : "never";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <CardTitle>Cadence & compliance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {loading && (
          <div className="text-xs text-muted-foreground">Loading cadence…</div>
        )}
        {!loading && !snap && (
          <div className="text-xs text-muted-foreground">No cadence data available.</div>
        )}
        {!loading && snap && (
          <>
            <div className="flex items-center justify-between gap-2 border-b pb-2">
              <div>
                <div className="font-medium">Monthly baseline</div>
                <div className="text-xs text-muted-foreground">
                  Last entry: {lastSeen(snap.monthly.lastEntryAt)}
                </div>
              </div>
              <Badge variant={variantFor(snap.monthly.tone)}>
                {cadenceBadgeLabel(snap.monthly)}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">Weekly check-in</div>
                <div className="text-xs text-muted-foreground">
                  Last entry: {lastSeen(snap.weekly.lastEntryAt)}
                </div>
              </div>
              <Badge variant={variantFor(snap.weekly.tone)}>
                {cadenceBadgeLabel(snap.weekly)}
              </Badge>
            </div>
            {snap.needsMonthlyBaseline && (
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Client has not yet completed their first monthly baseline.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
