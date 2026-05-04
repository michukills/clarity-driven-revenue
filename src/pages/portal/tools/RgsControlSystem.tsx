import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getEffectiveToolsForCustomer,
  type EffectiveTool,
} from "@/lib/toolCatalog";

// Curated grouping for the umbrella view. Tools that are not yet registered in
// tool_catalog show as "Coming soon" so we never imply functionality that does
// not exist.
const RCS_TOOL_GROUPS: { label: string; toolKeys: string[] }[] = [
  { label: "Revenue Control System™ — revenue visibility", toolKeys: ["revenue_control_center", "revenue_tracker"] },
  { label: "Risk and priority tracking", toolKeys: ["revenue_risk_monitor", "priority_tasks"] },
  { label: "Owner decision support", toolKeys: ["weekly_alignment_system"] },
  { label: "Score and stability trends", toolKeys: ["scorecard"] },
  { label: "Connected truth sources", toolKeys: ["quickbooks_sync_health"] },
  { label: "Reports and reviews", toolKeys: ["reports_and_reviews"] },
];

export default function RgsControlSystem() {
  const { customerId, loading } = usePortalCustomerId();
  const [tools, setTools] = useState<EffectiveTool[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getEffectiveToolsForCustomer(customerId);
        if (alive) setTools(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  const byKey = new Map<string, EffectiveTool>();
  for (const t of tools ?? []) byKey.set(t.tool_key, t);

  return (
    <PortalShell variant="customer">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gauge className="h-4 w-4" /> RGS Control System™
          </div>
          <h1 className="text-2xl text-foreground font-serif">RGS Control System™</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            The RGS Control System™ keeps you connected to the business system without
            turning RGS into an operator inside the business. It brings ongoing priorities,
            score trends, action tracking, review notes, and key business signals into one
            place. The Revenue Control System™ — focused on revenue visibility — is one
            tool inside this umbrella, not the whole subscription.
          </p>
        </header>

        {loading || tools === null ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : err ? (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            We couldn't load your RGS Control System view right now. Please try again shortly.
          </div>
        ) : (
          <div className="space-y-6">
            <section className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
                What this view shows
              </h2>
              <ul className="text-sm text-foreground/90 list-disc pl-5 space-y-1">
                <li>Ongoing visibility tools available in your subscription lane.</li>
                <li>Where to track priorities, review rhythm, and decision support.</li>
                <li>
                  Where supported, RGS can help connect key business truth sources so the
                  owner is not trying to interpret every tool in isolation.
                </li>
                <li>What remains the owner's responsibility, kept clearly bounded.</li>
              </ul>
            </section>

            {RCS_TOOL_GROUPS.map((group) => {
              const items = group.toolKeys.map((k) => ({ key: k, tool: byKey.get(k) }));
              return (
                <section key={group.label} className="space-y-2">
                  <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map(({ key, tool }) => (
                      <article
                        key={key}
                        className="bg-card border border-border rounded-xl p-4 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm text-foreground">
                            {tool?.name ?? key.replace(/_/g, " ")}
                          </div>
                          {tool && tool.effective_enabled ? (
                            <Badge variant="secondary" className="text-[11px]">Active</Badge>
                          ) : tool ? (
                            <Badge variant="outline" className="text-[11px]">
                              Not currently active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px]">
                              Not part of your current plan
                            </Badge>
                          )}
                        </div>
                        {tool?.description && (
                          <p className="text-xs text-muted-foreground">{tool.description}</p>
                        )}
                        {tool?.effective_enabled && tool.route_path && (
                          <Link
                            to={tool.route_path}
                            className="inline-block text-xs text-primary hover:underline pt-1"
                          >
                            Open
                          </Link>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}

            <section className="bg-card border border-border rounded-xl p-5 space-y-2">
              <h2 className="text-sm text-foreground">Scope reminder</h2>
              <p className="text-sm text-muted-foreground">
                The RGS Control System™ is the ongoing visibility lane. It is not
                implementation work, accounting, legal, tax, or compliance review.
                Where supported, connected systems such as QuickBooks, HubSpot, Stripe,
                Square, Xero, and Salesforce can serve as truth sources so you have a
                clearer operating picture — they remain the system of record.
              </p>
            </section>
          </div>
        )}
      </div>
    </PortalShell>
  );
}