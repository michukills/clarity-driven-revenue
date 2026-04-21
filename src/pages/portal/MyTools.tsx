import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { ToolCard, type Tool } from "@/components/portal/ToolCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isClientVisible } from "@/lib/visibility";
import { ClipboardCheck, ListChecks, NotebookPen, ArrowRight, Wrench } from "lucide-react";

const BUILTIN = [
  { to: "/portal/tools/self-assessment", icon: ClipboardCheck, title: "Stability Self-Assessment", desc: "Score your business on the 5 RGS pillars." },
  { to: "/portal/tools/implementation-tracker", icon: ListChecks, title: "Implementation Tracker", desc: "Track in-flight tasks, owners, and status." },
  { to: "/portal/tools/weekly-reflection", icon: NotebookPen, title: "Weekly Reflection", desc: "A structured weekly check-in journal." },
];

export default function MyTools() {
  const { user } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from("customers").select("id").eq("user_id", user.id).maybeSingle();
      if (!c) { setLoading(false); return; }
      const { data: r } = await supabase
        .from("resource_assignments")
        .select("visibility_override, resources(*)")
        .eq("customer_id", c.id);
      const rows: Tool[] = [];
      const ov: Record<string, string | null> = {};
      (r ?? []).forEach((x: any) => {
        if (!x.resources) return;
        const eff = x.visibility_override || x.resources.visibility;
        if (!isClientVisible(eff)) return; // Hide internal-only tools entirely
        rows.push(x.resources);
        ov[x.resources.id] = x.visibility_override;
      });
      setTools(rows);
      setOverrides(ov);
      setLoading(false);
    })();
  }, [user]);

  return (
    <PortalShell variant="customer">
      <div className="mb-10">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your Toolbox</div>
        <h1 className="mt-2 text-3xl text-foreground">My Tools</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Built-in workspace tools you can use anytime, plus worksheets and resources curated for your engagement.
        </p>
      </div>

      <section className="mb-12">
        <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
          <h2 className="text-base text-foreground">Workspace Tools</h2>
          <span className="text-[11px] text-muted-foreground">{BUILTIN.length} built-in</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUILTIN.map((t) => (
            <Link key={t.to} to={t.to} className="block p-5 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <t.icon className="h-5 w-5 text-primary" />
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              </div>
              <div className="text-sm text-foreground mt-3">{t.title}</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
          <h2 className="text-base text-foreground">Assigned Resources</h2>
          <span className="text-[11px] text-muted-foreground">{tools.length} item{tools.length === 1 ? "" : "s"}</span>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : tools.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
            <Wrench className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No resources assigned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tools.map((t) => <ToolCard key={t.id} tool={t} visibilityOverride={overrides[t.id]} />)}
          </div>
        )}
      </section>
    </PortalShell>
  );
}
