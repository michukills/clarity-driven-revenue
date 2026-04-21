import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Target,
  Activity,
  CheckCircle2,
  Briefcase,
  ClipboardList,
  Hourglass,
  AlertTriangle,
  TrendingUp,
  Plus,
  Wrench,
  FileText,
  Upload as UploadIcon,
  ArrowRight,
  CheckSquare,
} from "lucide-react";
import { stageLabel, formatDate, SHARED_STAGES, IMPLEMENTATION_STAGES, DIAGNOSTIC_STAGES } from "@/lib/portal";
import { Link } from "react-router-dom";

const IMPL_KEYS = new Set(IMPLEMENTATION_STAGES.map((s) => s.key));
const DX_ACTIVE = new Set(["diagnostic_paid", "diagnostic_in_progress", "diagnostic_delivered", "decision_pending"]);

export default function AdminDashboard() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [c, t, tl] = await Promise.all([
        supabase
          .from("customers")
          .select("id, full_name, business_name, stage, track, payment_status, implementation_status, next_action, last_activity_at, updated_at, created_at")
          .order("last_activity_at", { ascending: false }),
        supabase
          .from("customer_tasks")
          .select("id, title, status, due_date, customer_id")
          .neq("status", "done")
          .order("due_date", { ascending: true })
          .limit(8),
        supabase
          .from("customer_timeline")
          .select("id, title, detail, event_type, created_at, customer_id")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (c.data) setCustomers(c.data);
      if (t.data) setTasks(t.data);
      if (tl.data) setTimeline(tl.data);
    })();
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inSevenDays = new Date(today);
    inSevenDays.setDate(today.getDate() + 7);

    const waitingClient = customers.filter((c) => c.stage === "waiting_on_client" || c.implementation_status === "waiting_client").length;
    const waitingRgs = customers.filter((c) =>
      ["lead", "discovery_completed", "proposal_sent", "diagnostic_in_progress", "implementation_added", "implementation_onboarding"].includes(c.stage),
    ).length;

    return {
      total: customers.length,
      leads: customers.filter((c) => c.stage === "lead" || c.stage === "discovery_scheduled").length,
      proposals: customers.filter((c) => c.stage === "proposal_sent").length,
      diagnostics: customers.filter((c) => DX_ACTIVE.has(c.stage)).length,
      implementation: customers.filter((c) => IMPL_KEYS.has(c.stage)).length,
      diagnosticOnly: customers.filter((c) => c.track === "diagnostic_only").length,
      waitingClient,
      waitingRgs,
      followups: customers.filter((c) => c.stage === "follow_up_nurture" || c.stage === "decision_pending").length,
      tasksDueToday: tasks.filter((t) => t.due_date && new Date(t.due_date) <= today).length,
      tasksDueWeek: tasks.filter((t) => t.due_date && new Date(t.due_date) <= inSevenDays).length,
    };
  }, [customers, tasks]);

  const stageCounts = useMemo(() => {
    const all = [...SHARED_STAGES, ...DIAGNOSTIC_STAGES, ...IMPLEMENTATION_STAGES];
    return all
      .map((s) => ({ key: s.key, label: s.label, count: customers.filter((c) => c.stage === s.key).length }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [customers]);

  const customerById = (id: string) => customers.find((c) => c.id === id);

  const cards: { label: string; value: number; icon: any; tone?: string; href?: string }[] = [
    { label: "Active Clients", value: stats.total, icon: Users, href: "/admin/customers" },
    { label: "Leads", value: stats.leads, icon: Target, href: "/admin/pipeline" },
    { label: "Proposals Pending", value: stats.proposals, icon: ClipboardList, href: "/admin/pipeline" },
    { label: "Diagnostics In Progress", value: stats.diagnostics, icon: Activity, href: "/admin/pipeline" },
    { label: "Implementation Active", value: stats.implementation, icon: Briefcase, href: "/admin/pipeline" },
    { label: "Diagnostic-Only", value: stats.diagnosticOnly, icon: CheckCircle2, href: "/admin/customers" },
    { label: "Waiting on Client", value: stats.waitingClient, icon: Hourglass, tone: "warn" },
    { label: "Waiting on RGS", value: stats.waitingRgs, icon: AlertTriangle, tone: "primary" },
  ];

  return (
    <PortalShell variant="admin">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Overview</div>
          <h1 className="mt-2 text-3xl text-foreground">Operating Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-2">
            High-signal view of pipeline health, client status, and what needs attention today.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-8">
        <QuickAction to="/admin/customers" icon={Plus} label="New Client" />
        <QuickAction to="/admin/pipeline" icon={Target} label="Add Lead" />
        <QuickAction to="/admin/tools" icon={Wrench} label="Assign Tool" />
        <QuickAction to="/admin/tasks" icon={CheckSquare} label="New Task" />
        <QuickAction to="/admin/files" icon={UploadIcon} label="Upload File" />
        <QuickAction to="/admin/tools" icon={FileText} label="Open Tools" />
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {cards.map((c) => {
          const Card = (
            <div
              key={c.label}
              className="group bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors h-full"
            >
              <div className="flex items-center justify-between">
                <c.icon className={`h-4 w-4 ${c.tone === "warn" ? "text-amber-400" : "text-primary"}`} />
                {c.href && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                )}
              </div>
              <div className="mt-4 text-3xl font-light text-foreground">{c.value}</div>
              <div className="text-[11px] text-muted-foreground mt-2 uppercase tracking-wider">{c.label}</div>
            </div>
          );
          return c.href ? (
            <Link key={c.label} to={c.href}>
              {Card}
            </Link>
          ) : (
            Card
          );
        })}
      </div>

      {/* Two-column workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline distribution */}
        <Panel title="Pipeline Distribution" subtitle="Where clients sit right now">
          {stageCounts.length === 0 ? (
            <Empty text="No clients in the pipeline yet." />
          ) : (
            <div className="space-y-3">
              {stageCounts.map((s) => {
                const max = stageCounts[0].count || 1;
                const pct = (s.count / max) * 100;
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-foreground">{s.label}</span>
                      <span className="text-muted-foreground">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Tasks due */}
        <Panel
          title="Tasks Due"
          subtitle={`${stats.tasksDueToday} today · ${stats.tasksDueWeek} this week`}
          action={<Link to="/admin/tasks" className="text-xs text-muted-foreground hover:text-foreground">All tasks →</Link>}
        >
          {tasks.length === 0 ? (
            <Empty text="No open tasks. Inbox zero." />
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 6).map((t) => {
                const c = customerById(t.customer_id);
                const overdue = t.due_date && new Date(t.due_date) < new Date();
                return (
                  <Link
                    key={t.id}
                    to={c ? `/admin/customers/${c.id}` : "/admin/tasks"}
                    className="block p-3 rounded-md bg-muted/30 border border-border hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm text-foreground">{t.title}</div>
                      {t.due_date && (
                        <span className={`text-[10px] uppercase tracking-wider ${overdue ? "text-amber-400" : "text-muted-foreground"}`}>
                          {overdue ? "Overdue" : formatDate(t.due_date)}
                        </span>
                      )}
                    </div>
                    {c && <div className="text-[11px] text-muted-foreground mt-1">{c.business_name || c.full_name}</div>}
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Recent activity */}
        <Panel
          title="Recent Activity"
          subtitle="Latest client events"
          action={<Link to="/admin/customers" className="text-xs text-muted-foreground hover:text-foreground">All clients →</Link>}
        >
          {timeline.length === 0 ? (
            <Empty text="No activity yet." />
          ) : (
            <div className="space-y-2">
              {timeline.slice(0, 6).map((e) => {
                const c = customerById(e.customer_id);
                return (
                  <Link
                    key={e.id}
                    to={c ? `/admin/customers/${c.id}` : "#"}
                    className="block p-3 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3 text-primary flex-shrink-0" />
                      <div className="text-sm text-foreground truncate">{e.title}</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 ml-5">
                      {c?.business_name || c?.full_name || "—"} · {formatDate(e.created_at)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Next actions */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg text-foreground">Next Actions</h2>
          <span className="text-xs text-muted-foreground">Surfaced from your pipeline</span>
        </div>
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {customers.filter((c) => c.next_action || ["lead", "discovery_completed", "proposal_sent", "diagnostic_delivered", "decision_pending", "implementation_added", "waiting_on_client"].includes(c.stage)).slice(0, 7).map((c) => (
            <Link key={`na-${c.id}`} to={`/admin/customers/${c.id}`} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="min-w-0">
                <div className="text-sm text-foreground truncate">{c.next_action || nextActionLabel(c.stage)}</div>
                <div className="text-xs text-muted-foreground truncate">{c.full_name}{c.business_name ? ` · ${c.business_name}` : ""}</div>
              </div>
              <span className="text-[11px] text-muted-foreground ml-4 flex-shrink-0">{stageLabel(c.stage)}</span>
            </Link>
          ))}
          {customers.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No clients yet. Add one from the Clients tab.</div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm text-foreground">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-xs text-muted-foreground py-6 text-center">{text}</div>;
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-card border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors text-xs text-foreground"
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="truncate">{label}</span>
    </Link>
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
  return map[stage] || "Review client";
}
