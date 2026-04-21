import { useEffect, useMemo, useState } from "react";
import { Bell, AlertCircle, Upload, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/portal";

type Notif = {
  id: string;
  icon: any;
  title: string;
  detail: string;
  href: string;
  date: string;
  tone: "info" | "warn";
};

export function NotificationsBell({ variant }: { variant: "admin" | "customer" }) {
  const [items, setItems] = useState<Notif[]>([]);

  const load = async () => {
    if (variant === "admin") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [tl, ups, tasks, custs] = await Promise.all([
        supabase
          .from("customer_timeline")
          .select("id, title, detail, created_at, customer_id")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("customer_uploads")
          .select("id, file_name, created_at, customer_id")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("customer_tasks")
          .select("id, title, due_date, customer_id, status")
          .neq("status", "done"),
        supabase.from("customers").select("id, full_name, business_name"),
      ]);
      const cmap = new Map<string, any>();
      (custs.data || []).forEach((c: any) => cmap.set(c.id, c));
      const cName = (id: string) => {
        const c = cmap.get(id);
        return c ? c.business_name || c.full_name : "Unknown client";
      };

      const overdue = (tasks.data || [])
        .filter((t: any) => t.due_date && new Date(t.due_date) < today)
        .slice(0, 5)
        .map((t: any) => ({
          id: `task-${t.id}`,
          icon: AlertCircle,
          title: `Overdue: ${t.title}`,
          detail: cName(t.customer_id),
          href: `/admin/customers/${t.customer_id}`,
          date: t.due_date,
          tone: "warn" as const,
        }));

      const uploads = (ups.data || []).map((u: any) => ({
        id: `up-${u.id}`,
        icon: Upload,
        title: `New upload: ${u.file_name}`,
        detail: cName(u.customer_id),
        href: `/admin/customers/${u.customer_id}`,
        date: u.created_at,
        tone: "info" as const,
      }));

      const events = (tl.data || []).map((e: any) => ({
        id: `tl-${e.id}`,
        icon: Activity,
        title: e.title,
        detail: cName(e.customer_id),
        href: `/admin/customers/${e.customer_id}`,
        date: e.created_at,
        tone: "info" as const,
      }));

      const merged = [...overdue, ...uploads, ...events]
        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
        .slice(0, 12);
      setItems(merged);
    } else {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: c } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!c) return;
      const [tl, tasks] = await Promise.all([
        supabase
          .from("customer_timeline")
          .select("id, title, detail, created_at")
          .eq("customer_id", c.id)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("customer_tasks")
          .select("id, title, due_date, status")
          .eq("customer_id", c.id)
          .neq("status", "done")
          .order("due_date", { ascending: true })
          .limit(4),
      ]);
      const today = new Date();
      const taskItems: Notif[] = (tasks.data || []).map((t: any) => ({
        id: `task-${t.id}`,
        icon: AlertCircle,
        title: t.due_date && new Date(t.due_date) < today ? `Overdue: ${t.title}` : t.title,
        detail: t.due_date ? `Due ${formatDate(t.due_date)}` : "Open task",
        href: "/portal/progress",
        date: t.due_date || new Date().toISOString(),
        tone: t.due_date && new Date(t.due_date) < today ? ("warn" as const) : ("info" as const),
      }));
      const tlItems: Notif[] = (tl.data || []).map((e: any) => ({
        id: `tl-${e.id}`,
        icon: Activity,
        title: e.title,
        detail: e.detail || "",
        href: "/portal",
        date: e.created_at,
        tone: "info" as const,
      }));
      setItems([...taskItems, ...tlItems].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 10));
    }
  };

  useEffect(() => {
    load();
  }, [variant]);

  const unread = useMemo(() => items.filter((i) => i.tone === "warn").length, [items]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative h-9 w-9 inline-flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/40"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-400" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 bg-card border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="text-sm text-foreground">Notifications</div>
          <button onClick={load} className="text-[11px] text-muted-foreground hover:text-foreground">
            Refresh
          </button>
        </div>
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">You're all caught up.</div>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                to={n.href}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <n.icon className={`h-3.5 w-3.5 mt-1 flex-shrink-0 ${n.tone === "warn" ? "text-amber-400" : "text-primary"}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">{n.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{n.detail}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{formatDate(n.date)}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
