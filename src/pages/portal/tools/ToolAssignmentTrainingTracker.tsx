import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientTrackerEntries,
  type ClientToolTrainingTrackerEntry,
  ACCESS_SOURCE_CLIENT_LABEL,
  TRAINING_STATUS_LABEL,
  HANDOFF_STATUS_LABEL,
} from "@/lib/toolTrainingTracker";
import { ImplementationScopeBanner } from "@/components/tools/ImplementationScopeBanner";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || !value.trim()) return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export default function ToolAssignmentTrainingTracker() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientToolTrainingTrackerEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientTrackerEntries(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load tracker");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  return (
    <PortalShell variant="customer">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4" /> Implementation
          </div>
          <h1 className="text-2xl text-foreground font-serif">
            Tool Assignment + Training Tracker
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            This tracker shows which RGS tools are active for your current implementation
            stage, what each tool is used for, and whether training or handoff is complete.
          </p>
        </header>

        <ImplementationScopeBanner
          included="documenting which RGS tools are part of your current implementation stage and the training/handoff status."
          excluded="indefinite support, indefinite training delivery, or RGS managing your team. Manual assignments are exception overrides — stage-based access remains the primary access model."
        />

        {loading || rows === null ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : err ? (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            We couldn't load your tool training tracker right now. Please try again shortly.
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <h2 className="text-base text-foreground mb-2">
              Your tool training tracker is being prepared.
            </h2>
            <p className="text-sm text-muted-foreground">
              Once RGS marks entries ready, tool training and handoff details will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((m) => (
              <article key={m.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-foreground">
                      {m.tool_name_snapshot || m.tool_key}
                    </h3>
                    <div className="text-[11px] text-muted-foreground mt-0.5 space-x-2">
                      <span>{ACCESS_SOURCE_CLIENT_LABEL[m.access_source]}</span>
                      {m.customer_journey_phase && (
                        <span>· {m.customer_journey_phase.replace(/_/g, " ")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="secondary" className="text-[11px]">
                      Training: {TRAINING_STATUS_LABEL[m.training_status]}
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      Handoff: {HANDOFF_STATUS_LABEL[m.handoff_status]}
                    </Badge>
                  </div>
                </div>

                {m.client_summary && (
                  <p className="text-sm text-foreground/90">{m.client_summary}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pt-2 border-t border-border">
                  <Row label="Who was trained" value={m.trained_people} />
                  <Row label="Roles trained" value={m.trained_roles} />
                  <Row label="Training method" value={m.training_method} />
                  <Row label="Training date" value={m.training_date} />
                  <Row label="Next training step" value={m.next_training_step} />
                  <Row label="Client expectation" value={m.client_expectation} />
                  <Row label="RGS support scope" value={m.rgs_support_scope} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}