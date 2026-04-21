import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { ToolCard, type Tool } from "@/components/portal/ToolCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isClientVisible, isClientEditable } from "@/lib/visibility";
import { Wrench, Activity } from "lucide-react";
import { Link } from "react-router-dom";

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

  const activeTools = tools.filter((t) => isClientEditable(overrides[t.id] || t.visibility));
  const assignedTools = tools.filter((t) => !isClientEditable(overrides[t.id] || t.visibility));

  return (
    <PortalShell variant="customer">
      <div className="mb-10">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your Toolbox</div>
        <h1 className="mt-2 text-3xl text-foreground">My Tools</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Tools and resources your RGS team has assigned to your engagement.
        </p>
      </div>

      <section className="mb-12">
        <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Client · Active</div>
            <h2 className="text-base text-foreground mt-1">Built-in tools</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Link
            to="/portal/tools/revenue-risk-monitor"
            className="group bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-primary mb-3">
              <Activity className="h-3 w-3" /> Client · Active
            </div>
            <div className="text-base text-foreground">Revenue & Risk Monitor</div>
            <p className="text-xs text-muted-foreground mt-2">
              Real-time read on where revenue is leaking, where risk is building, and what to fix first.
            </p>
          </Link>
        </div>
      </section>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : tools.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Wrench className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tools assigned yet. Your RGS team will share tools here as your engagement progresses.</p>
        </div>
      ) : (
        <>
          {activeTools.length > 0 && (
            <section className="mb-12">
              <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Client · Active</div>
                  <h2 className="text-base text-foreground mt-1">Tools you can fill in</h2>
                </div>
                <span className="text-[11px] text-muted-foreground">{activeTools.length} item{activeTools.length === 1 ? "" : "s"}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeTools.map((t) => <ToolCard key={t.id} tool={t} visibilityOverride={overrides[t.id]} />)}
              </div>
            </section>
          )}

          {assignedTools.length > 0 && (
            <section>
              <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Client · Assigned</div>
                  <h2 className="text-base text-foreground mt-1">Resources for your engagement</h2>
                </div>
                <span className="text-[11px] text-muted-foreground">{assignedTools.length} item{assignedTools.length === 1 ? "" : "s"}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {assignedTools.map((t) => <ToolCard key={t.id} tool={t} visibilityOverride={overrides[t.id]} />)}
              </div>
            </section>
          )}
        </>
      )}
    </PortalShell>
  );
}
