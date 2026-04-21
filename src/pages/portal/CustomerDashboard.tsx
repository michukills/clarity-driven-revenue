import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { stageLabel, IMPLEMENTATION_STAGES, isImplementationStage, formatDate } from "@/lib/portal";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, CheckCircle2, Circle, Upload, Lock } from "lucide-react";
import { toast } from "sonner";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data: c } = await supabase.from("customers").select("*").eq("user_id", user.id).maybeSingle();
    setCustomer(c);
    if (c) {
      const [{ data: r }, { data: chk }] = await Promise.all([
        supabase.from("resource_assignments").select("resources(*)").eq("customer_id", c.id),
        supabase.from("checklist_items").select("*").eq("customer_id", c.id).order("position"),
      ]);
      setResources((r || []).map((x: any) => x.resources).filter(Boolean));
      setChecklist(chk || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const toggleChecklist = async (item: any) => {
    const { error } = await supabase.from("checklist_items").update({
      completed: !item.completed,
      completed_at: !item.completed ? new Date().toISOString() : null,
    }).eq("id", item.id);
    if (error) toast.error("Could not update");
    else load();
  };

  if (loading) {
    return <PortalShell variant="customer"><div className="text-muted-foreground">Loading…</div></PortalShell>;
  }

  // Customer not yet provisioned
  if (!customer) {
    return (
      <PortalShell variant="customer">
        <Welcome name={user?.email} />
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Your account exists but no client workspace is active yet. An RGS team member will activate your portal shortly.
          </p>
        </div>
      </PortalShell>
    );
  }

  const isImplementation = customer.portal_unlocked || isImplementationStage(customer.stage);

  // Diagnostic-only / pre-implementation view
  if (!isImplementation) {
    return (
      <PortalShell variant="customer">
        <Welcome name={customer.full_name} business={customer.business_name} />
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Current Status</div>
          <div className="text-xl text-foreground">{stageLabel(customer.stage)}</div>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl leading-relaxed">
            {customer.next_action || "Your engagement is in motion. The full implementation workspace will unlock once you add the implementation engagement."}
          </p>
        </div>
      </PortalShell>
    );
  }

  // Implementation portal
  const implIdx = IMPLEMENTATION_STAGES.findIndex((s) => s.key === customer.stage);
  const progress = implIdx >= 0 ? Math.round(((implIdx + 1) / IMPLEMENTATION_STAGES.length) * 100) : 10;
  const completedItems = checklist.filter((c) => c.completed).length;

  return (
    <PortalShell variant="customer">
      <Welcome name={customer.full_name} business={customer.business_name} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Implementation Stage">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-foreground">{stageLabel(customer.stage)}</div>
              <div className="text-xs text-muted-foreground">{progress}%</div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            {customer.next_action && (
              <div className="text-sm text-muted-foreground mt-4 leading-relaxed border-l-2 border-primary/40 pl-3">
                <span className="text-foreground">Next:</span> {customer.next_action}
              </div>
            )}
          </Card>

          <Card title={`Implementation Checklist · ${completedItems}/${checklist.length}`}>
            {checklist.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet — your team will add steps as work progresses.</p>
            ) : (
              <div className="space-y-2">
                {checklist.map((it) => (
                  <button key={it.id} onClick={() => toggleChecklist(it)}
                    className="w-full flex items-start gap-3 p-3 rounded-md bg-muted/20 border border-border hover:border-primary/40 text-left">
                    {it.completed
                      ? <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      : <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />}
                    <div className="flex-1">
                      <div className={`text-sm ${it.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{it.title}</div>
                      {it.completed_at && <div className="text-[10px] text-muted-foreground mt-0.5">Completed {formatDate(it.completed_at)}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card title="Your Tools">
            {resources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tools assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {resources.slice(0, 5).map((r) => (
                  <a key={r.id} href={r.url || "#"} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/40 transition-colors">
                    <FileText className="h-4 w-4 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.description}</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                ))}
                {resources.length > 5 && (
                  <Link to="/portal/tools" className="block text-xs text-primary hover:text-secondary mt-2">
                    View all {resources.length} tools →
                  </Link>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Instructions">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Work through the checklist on the left. Open each assigned tool, complete the items, and use the Uploads area to share completed worksheets back to the RGS team.
            </p>
          </Card>

          <Card title="Quick Actions">
            <div className="space-y-2">
              <Link to="/portal/tools" className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border hover:border-primary/40">
                <span className="text-sm text-foreground">My Tools</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link to="/portal/uploads" className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border hover:border-primary/40">
                <span className="text-sm text-foreground flex items-center gap-2"><Upload className="h-3.5 w-3.5" /> Secure Uploads</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link to="/portal/progress" className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border hover:border-primary/40">
                <span className="text-sm text-foreground">Progress</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}

const Welcome = ({ name, business }: { name?: string | null; business?: string | null }) => (
  <div className="mb-10">
    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Welcome</div>
    <h1 className="mt-2 text-3xl text-foreground">{name || "Client"}</h1>
    {business && <p className="text-muted-foreground mt-1">{business}</p>}
  </div>
);

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-6">
    <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">{title}</h3>
    {children}
  </div>
);
