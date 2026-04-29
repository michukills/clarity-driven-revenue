// P19 — Compact admin-only operational profile completeness indicator.
// Used in CustomerDetail (near profile panel) and PriorityRoadmapPanel.

import { useEffect, useState } from "react";
import {
  computeCompleteness,
  loadOperationalProfile,
  CRITICAL_FIELDS,
  type ProfileCompleteness,
} from "@/lib/priorityEngine/operationalProfile";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

const BADGE: Record<string, string> = {
  strong: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  usable: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  incomplete: "bg-red-500/15 text-red-300 border-red-500/30",
};

const FIELD_LABEL: Record<string, string> = {
  monthly_revenue_usd: "Monthly revenue",
  biggest_constraint: "Biggest constraint",
  owner_urgency: "Owner urgency",
  implementation_capacity: "Implementation capacity",
  decision_bottleneck: "Decision bottleneck",
};

export function useProfileCompleteness(customerId: string | null) {
  const [data, setData] = useState<ProfileCompleteness | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!customerId) {
        setData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const profile = await loadOperationalProfile(customerId);
      if (cancelled) return;
      setData(computeCompleteness(profile));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);
  return { data, loading };
}

export function OperationalProfileCompletenessBadge({
  customerId,
  compact = false,
}: {
  customerId: string | null;
  compact?: boolean;
}) {
  const { data, loading } = useProfileCompleteness(customerId);
  if (loading || !data) return null;

  const criticalMissing = data.critical_missing_fields;

  return (
    <div className={compact ? "space-y-1.5" : "rounded-md border border-border bg-muted/20 p-3 space-y-2"}>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${BADGE[data.readiness_label]}`}
        >
          {data.readiness_label}
        </span>
        <span className="text-[11px] text-muted-foreground">
          Profile {data.completeness_pct}% complete
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          Admin only
        </span>
      </div>

      {criticalMissing.length > 0 ? (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-200">
          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
          <div>
            <span className="text-amber-100 font-medium">Critical missing: </span>
            {criticalMissing.map((f) => FIELD_LABEL[f] ?? f).join(", ")}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          All critical fields captured
        </div>
      )}

      {data.readiness_label === "incomplete" ? (
        <div className="flex items-start gap-1.5 text-[11px] text-red-300">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          Priority scores may be less reliable until the operational profile is completed.
        </div>
      ) : null}
    </div>
  );
}
