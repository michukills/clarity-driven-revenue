import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientDecisionRights,
  type ClientDecisionRightsEntry,
} from "@/lib/decisionRights";
import { GEAR_LABELS } from "@/lib/implementationRoadmap";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || !value.trim()) return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export default function DecisionRightsAccountability() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientDecisionRightsEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientDecisionRights(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load decision rights");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  const groups: Record<string, ClientDecisionRightsEntry[]> = {};
  for (const r of rows ?? []) {
    const key = r.business_area?.trim() || "General";
    (groups[key] ||= []).push(r);
  }

  return (
    <PortalShell variant="customer">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Implementation
          </div>
          <h1 className="text-2xl text-foreground font-serif">Decision Rights / Accountability</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            This page clarifies who owns key decisions, who is responsible for action,
            who approves changes, who should be consulted, and who needs to be informed.
            Review each entry and adapt it to your business and any legal or compliance requirements.
          </p>
        </header>

        {loading || rows === null ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : err ? (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            We couldn't load your accountability map right now. Please try again shortly.
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <h2 className="text-base text-foreground mb-2">
              Your decision rights and accountability map is being prepared.
            </h2>
            <p className="text-sm text-muted-foreground">
              Once RGS marks entries ready, approved ownership rules will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groups).map(([area, entries]) => (
              <section key={area} className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground">{area}</h2>
                <div className="space-y-3">
                  {entries.map((e) => (
                    <article key={e.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-foreground">{e.title}</h3>
                          <div className="text-[11px] text-muted-foreground mt-0.5 space-x-2">
                            {e.gear && <span>{GEAR_LABELS[e.gear]}</span>}
                            {e.industry_context && <span>· {e.industry_context}</span>}
                            <span>· v{e.version}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[11px]">{e.status.replace(/_/g, " ")}</Badge>
                      </div>

                      {e.client_summary && (
                        <p className="text-sm text-foreground/90">{e.client_summary}</p>
                      )}

                      <Row label="Decision" value={e.decision_or_responsibility} />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pt-2 border-t border-border">
                        <Row label="Decision owner" value={e.decision_owner} />
                        <Row label="Action owner" value={e.action_owner} />
                        <Row label="Approver" value={e.approver} />
                        <Row label="Consulted" value={e.consulted} />
                        <Row label="Informed" value={e.informed} />
                        <Row label="Cadence" value={e.decision_cadence} />
                        <Row label="Handoff trigger" value={e.handoff_trigger} />
                        <Row label="Escalation path" value={e.escalation_path} />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
