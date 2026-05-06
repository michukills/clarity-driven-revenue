import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { deriveReminderStatus } from "@/lib/welcomeGreeting";

type ClientReminderRow = {
  id: string;
  reminder_label: string;
  reminder_type: string;
  related_workflow: string | null;
  related_route: string | null;
  due_at: string | null;
  status: string;
  client_safe_message: string | null;
  completed_at: string | null;
};

/**
 * Client-facing reminder list. Reads via a SECURITY DEFINER RPC that
 * strips admin_notes and only returns rows where client_visible=true.
 */
export function ClientTimelineRemindersList({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<ClientReminderRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc("get_client_timeline_reminders", {
        _customer_id: customerId,
      });
      if (!cancelled) {
        setRows((data as ClientReminderRow[]) || []);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (!loaded) return null;
  if (rows.length === 0) return null;

  return (
    <section className="mt-8 space-y-3 min-w-0">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Bell className="h-3 w-3" /> Reminders from your RGS team
      </div>
      <ul className="bg-card border border-border rounded-xl divide-y divide-border">
        {rows.map((r) => {
          const status = deriveReminderStatus({
            dueAt: r.due_at,
            completedAt: r.completed_at,
          });
          return (
            <li key={r.id} className="p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{r.reminder_label}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {status}
                </span>
              </div>
              {r.client_safe_message && (
                <p className="text-xs text-muted-foreground">{r.client_safe_message}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}