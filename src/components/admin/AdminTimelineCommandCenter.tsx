import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, Bell, CheckCircle2 } from "lucide-react";
import { deriveReminderStatus } from "@/lib/welcomeGreeting";

type AdminReminderRow = {
  id: string;
  customer_id: string;
  reminder_key: string;
  reminder_label: string;
  reminder_type: string;
  related_workflow: string | null;
  related_route: string | null;
  due_at: string | null;
  status: string;
  client_visible: boolean;
  admin_notes: string | null;
  completed_at: string | null;
  created_at: string;
};

/**
 * P86B — Admin Timeline / Reminder Command Center.
 * Lists reminders ordered by overdue → due → scheduled → completed, with
 * a one-click "Mark complete" action and an optional route to the
 * related workflow. No fake automation.
 */
export function AdminTimelineCommandCenter() {
  const [rows, setRows] = useState<AdminReminderRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    const { data } = await (supabase as any)
      .from("rgs_timeline_reminders")
      .select(
        "id, customer_id, reminder_key, reminder_label, reminder_type, related_workflow, related_route, due_at, status, client_visible, admin_notes, completed_at, created_at",
      )
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(50);
    setRows((data as AdminReminderRow[]) || []);
    setLoaded(true);
  };

  useEffect(() => {
    refresh();
  }, []);

  const grouped = useMemo(() => {
    const out: Record<"overdue" | "due" | "scheduled" | "completed", AdminReminderRow[]> = {
      overdue: [],
      due: [],
      scheduled: [],
      completed: [],
    };
    for (const r of rows) {
      const status = deriveReminderStatus({ dueAt: r.due_at, completedAt: r.completed_at });
      out[status].push(r);
    }
    return out;
  }, [rows]);

  const markComplete = async (id: string) => {
    setBusyId(id);
    const { data: u } = await supabase.auth.getUser();
    await (supabase as any)
      .from("rgs_timeline_reminders")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_by: u?.user?.id ?? null,
      })
      .eq("id", id);
    setBusyId(null);
    refresh();
  };

  if (!loaded) return null;

  const totalOpen = grouped.overdue.length + grouped.due.length + grouped.scheduled.length;

  return (
    <section className="bg-card border border-border rounded-xl p-5 mb-8 min-w-0">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <CalendarClock className="h-3 w-3" /> Timeline & Reminders
      </div>
      <div className="flex items-baseline justify-between mt-1">
        <h2 className="text-lg text-foreground font-light tracking-tight">
          {totalOpen === 0 ? "No open reminders" : `${totalOpen} open reminder${totalOpen === 1 ? "" : "s"}`}
        </h2>
        <span className="text-[11px] text-muted-foreground italic">
          Admin-tracked. No automatic send.
        </span>
      </div>

      {totalOpen === 0 && (
        <div className="mt-4">
          <WorkflowEmptyState
            title="No open reminders right now."
            body="Reminders are admin-tracked — RGS does not auto-send notifications. Items appear here when an admin schedules a follow-up against a customer or workflow stage. Open Customers to schedule one or check active work."
            primary={{ label: "Open Customers", to: "/admin/customers", testId: "timeline-empty-customers" }}
            testId="timeline-empty"
          />
        </div>
      )}

      {(["overdue", "due", "scheduled"] as const).map((bucket) => {
        if (grouped[bucket].length === 0) return null;
        return (
          <div key={bucket} className="mt-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              {bucket}
            </div>
            <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {grouped[bucket].map((r) => (
                <li key={r.id} className="p-3 flex items-center gap-3 min-w-0">
                  <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground truncate">{r.reminder_label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.related_workflow || "general"}
                      {r.due_at ? ` · due ${new Date(r.due_at).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  {r.related_route && r.related_route.startsWith("/") && (
                    <Link
                      to={r.related_route}
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      Open
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => markComplete(r.id)}
                    disabled={busyId === r.id}
                    className="text-xs text-muted-foreground hover:text-foreground shrink-0 inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Done
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}