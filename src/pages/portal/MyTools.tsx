import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { ToolCard, type Tool } from "@/components/portal/ToolCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Wrench } from "lucide-react";

export default function MyTools() {
  const { user } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from("customers").select("id").eq("user_id", user.id).maybeSingle();
      if (!c) { setLoading(false); return; }
      const { data: r } = await supabase
        .from("resource_assignments")
        .select("resources(*)")
        .eq("customer_id", c.id);
      const rows = (r?.map((x: any) => x.resources).filter(Boolean) ?? []) as Tool[];
      // safety: filter any internal-only that may have leaked
      setTools(rows.filter((t) => t.visibility !== "internal"));
      setLoading(false);
    })();
  }, [user]);

  return (
    <PortalShell variant="customer">
      <div className="mb-10">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your Tools</div>
        <h1 className="mt-2 text-3xl text-foreground">My Tools</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Worksheets, trackers, and resources curated for your engagement.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : tools.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-16 text-center">
          <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No tools have been assigned to you yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((t) => <ToolCard key={t.id} tool={t} />)}
        </div>
      )}
    </PortalShell>
  );
}
