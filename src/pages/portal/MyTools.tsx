import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { ToolCard, type Tool } from "@/components/portal/ToolCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isClientVisible, isClientEditable } from "@/lib/visibility";
import { Wrench } from "lucide-react";

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
          Tools your RGS team has assigned to your engagement. Nothing is shown here until it's been activated for you during onboarding.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : tools.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Wrench className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground">No tools assigned yet.</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
            Your RGS team activates each tool live during your onboarding session. Once assigned, it will appear here.
          </p>
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
