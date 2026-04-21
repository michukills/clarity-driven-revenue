import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STAGES, stageLabel } from "@/lib/portal";
import { Link } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setCustomer(c);
      const { data: r } = await supabase
        .from("resource_assignments")
        .select("resources(*)")
        .eq("customer_id", c?.id || "00000000-0000-0000-0000-000000000000");
      setResources(r?.map((x: any) => x.resources) ?? []);
    })();
  }, [user]);

  const stageIdx = STAGES.findIndex((s) => s.key === customer?.stage);
  const progress = customer ? Math.round(((stageIdx + 1) / STAGES.length) * 100) : 0;

  return (
    <PortalShell variant="customer">
      <div className="mb-10">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Welcome</div>
        <h1 className="mt-2 text-3xl text-foreground">
          {customer?.full_name || user?.email}
        </h1>
        {customer?.business_name && (
          <p className="text-muted-foreground mt-1">{customer.business_name}</p>
        )}
      </div>

      {!customer && (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Your account is set up. An RGS team member will activate your portal shortly.
          </p>
        </div>
      )}

      {customer && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Current Status">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-foreground">{stageLabel(customer.stage)}</div>
                <div className="text-xs text-muted-foreground">{progress}%</div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-4">
                Service: {customer.service_type || "—"}
              </div>
            </Card>

            <Card title="Your Resources">
              {resources.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No resources have been shared with you yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {resources.slice(0, 5).map((r) => (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/40 transition-colors"
                    >
                      <FileText className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.description}
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ))}
                  {resources.length > 5 && (
                    <Link
                      to="/portal/resources"
                      className="block text-xs text-primary hover:text-secondary mt-2"
                    >
                      View all {resources.length} resources →
                    </Link>
                  )}
                </div>
              )}
            </Card>
          </div>

          <div>
            <Card title="Next Steps">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {nextStep(customer.stage)}
              </p>
            </Card>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-6">
    <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">{title}</h3>
    {children}
  </div>
);

function nextStep(stage: string) {
  const map: Record<string, string> = {
    lead: "We've received your information. We'll be in touch shortly to schedule a discovery call.",
    discovery_scheduled:
      "Your discovery call is scheduled. Please review any materials shared with you ahead of the call.",
    diagnostic_in_progress:
      "Your diagnostic is underway. We may reach out for clarifying details — check this portal for new resources.",
    diagnostic_delivered:
      "Your diagnostic is ready. Review it carefully and let us know how you'd like to proceed.",
    awaiting_decision:
      "We're standing by for your decision. Reply when you're ready to discuss next steps.",
    implementation:
      "Implementation has begun. Worksheets and resources will be added here as we progress.",
    work_in_progress:
      "Active work in progress. Check resources regularly for new worksheets and updates.",
    work_completed:
      "Engagement complete. All deliverables remain accessible here for your reference.",
  };
  return map[stage] || "Your project is in motion.";
}