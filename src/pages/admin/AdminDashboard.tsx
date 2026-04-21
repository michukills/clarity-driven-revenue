import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Users, Target, Activity, CheckCircle2, Briefcase } from "lucide-react";
import { stageLabel, formatDate } from "@/lib/portal";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    leads: 0,
    diagnostics: 0,
    implementation: 0,
    completed: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, full_name, business_name, stage, updated_at")
        .order("updated_at", { ascending: false });
      if (customers) {
        const implStages = ["implementation","implementation_added","implementation_onboarding","tools_assigned","client_training_setup","implementation_active","waiting_on_client","review_revision_window","work_in_progress"];
        setStats({
          total: customers.length,
          leads: customers.filter((c) => c.stage === "lead").length,
          diagnostics: customers.filter((c) =>
            ["diagnostic_paid","diagnostic_in_progress","diagnostic_delivered","decision_pending"].includes(c.stage),
          ).length,
          implementation: customers.filter((c) => implStages.includes(c.stage)).length,
          completed: customers.filter((c) => ["work_completed","implementation_complete","closed"].includes(c.stage)).length,
        });
        setRecent(customers.slice(0, 8));
      }
    })();
  }, []);

  const cards = [
    { label: "Total Customers", value: stats.total, icon: Users },
    { label: "Leads", value: stats.leads, icon: Target },
    { label: "Diagnostics In Progress", value: stats.diagnostics, icon: Activity },
    { label: "Implementation Clients", value: stats.implementation, icon: Briefcase },
    { label: "Completed Work", value: stats.completed, icon: CheckCircle2 },
  ];

  return (
    <PortalShell variant="admin">
      <div className="mb-10">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Overview</div>
        <h1 className="mt-2 text-3xl text-foreground">Operating Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors"
          >
            <c.icon className="h-4 w-4 text-primary mb-4" />
            <div className="text-3xl font-light text-foreground">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">
              {c.label}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg text-foreground">Recent Activity</h2>
          <Link
            to="/admin/customers"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View all customers →
          </Link>
        </div>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {recent.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">
              No customers yet. Add one from the Customers tab.
            </div>
          )}
          {recent.map((c) => (
            <Link
              key={c.id}
              to={`/admin/customers/${c.id}`}
              className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <div>
                <div className="text-sm text-foreground">{c.full_name}</div>
                <div className="text-xs text-muted-foreground">{c.business_name || "—"}</div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                  {stageLabel(c.stage)}
                </span>
                <span className="text-xs text-muted-foreground w-24 text-right">
                  {formatDate(c.updated_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg text-foreground">Next Actions</h2>
          <span className="text-xs text-muted-foreground">Surfaced from your pipeline</span>
        </div>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {recent.filter((c) => ["lead", "discovery_completed", "proposal_sent", "diagnostic_delivered", "decision_pending", "implementation_added", "waiting_on_client"].includes(c.stage)).slice(0, 6).map((c) => (
            <Link key={`na-${c.id}`} to={`/admin/customers/${c.id}`} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div>
                <div className="text-sm text-foreground">{nextActionLabel(c.stage)}</div>
                <div className="text-xs text-muted-foreground">{c.full_name}{c.business_name ? ` · ${c.business_name}` : ""}</div>
              </div>
              <span className="text-xs text-muted-foreground">{stageLabel(c.stage)}</span>
            </Link>
          ))}
          {recent.filter((c) => ["lead", "discovery_completed", "proposal_sent", "diagnostic_delivered", "decision_pending", "implementation_added", "waiting_on_client"].includes(c.stage)).length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No pending actions. Nice work.</div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

function nextActionLabel(stage: string) {
  const map: Record<string, string> = {
    lead: "Follow up with lead",
    discovery_completed: "Send proposal",
    proposal_sent: "Confirm payment",
    decision_pending: "Check in on decision",
    diagnostic_delivered: "Deliver report follow-up",
    implementation_added: "Run onboarding & assign tools",
    waiting_on_client: "Nudge for client input",
  };
  return map[stage] || "Review customer";
}