import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Lightbulb } from "lucide-react";
import {
  adminListApprovedSwotSignalsForConsumer,
  groupSwotSignalsForConsumer,
  SWOT_SIGNAL_CONSUMER_SCOPE,
  type SwotConsumerSignal,
  type SwotSignalConsumerSurface,
} from "@/lib/swot/swotSignalConsumers";

const SURFACE_LABEL: Record<SwotSignalConsumerSurface, string> = {
  campaign: "Campaign Control",
  repair_map: "Repair Map",
  implementation: "Implementation",
};

interface Props {
  customerId: string;
  surface: SwotSignalConsumerSurface;
}

export function SwotSignalConsumerPanel({ customerId, surface }: Props) {
  const [signals, setSignals] = useState<SwotConsumerSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    adminListApprovedSwotSignalsForConsumer(customerId, surface)
      .then((rows) => {
        if (alive) setSignals(rows);
      })
      .catch((e) => {
        if (alive) setError((e as Error).message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [customerId, surface]);

  const groups = useMemo(() => groupSwotSignalsForConsumer(signals, surface), [signals, surface]);

  return (
    <section className="rounded-xl border border-border bg-card/40 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" />
            SWOT signals for {SURFACE_LABEL[surface]}
          </div>
          <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
            {SWOT_SIGNAL_CONSUMER_SCOPE}
          </p>
        </div>
        <Link
          to={`/admin/customers/${customerId}/swot-strategic-matrix`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
        >
          Review SWOT
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-muted-foreground">Loading approved SWOT signals…</div>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          SWOT signals could not be loaded. {error}
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-4 rounded-lg border border-border bg-background/40 p-3 text-sm text-muted-foreground">
          No approved SWOT signals are available for this surface yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <div key={group.signal_type} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="mb-2 text-sm text-foreground">{group.label}</div>
              <div className="space-y-2">
                {group.signals.slice(0, 4).map((signal) => (
                  <div key={signal.id} className="rounded-md border border-border/70 bg-card/40 p-2">
                    <div className="text-xs text-foreground">{signal.summary}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      {signal.gear ? <span>{signal.gear.replace(/_/g, " ")}</span> : null}
                      <span>{signal.confidence.replace(/_/g, " ")}</span>
                      {signal.analysis_title ? <span>{signal.analysis_title}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

