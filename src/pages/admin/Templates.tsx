import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, INTERNAL_TOOL_PLACEHOLDERS } from "@/lib/portal";
import { Link } from "react-router-dom";
import { FileText, ArrowRight, Library } from "lucide-react";

export default function Templates() {
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("resources").select("*").order("updated_at", { ascending: false });
      if (data) setResources(data);
    })();
  }, []);

  const groups = [
    { key: "internal", label: "Internal templates", filter: (r: any) => r.visibility === "internal" },
    { key: "customer", label: "Customer templates", filter: (r: any) => r.visibility === "customer" },
  ];

  return (
    <PortalShell variant="admin">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Templates</div>
        <h1 className="mt-2 text-3xl text-foreground">Template Library</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Reusable assets for diagnostics, onboarding, and client work. Use the Tools area to create new templates,
          then duplicate them into client-specific copies from any client profile.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <Link to="/admin/tools" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary/15 text-primary text-xs hover:bg-primary/25 transition-colors">
          <Library className="h-3.5 w-3.5" /> Manage in Tools
        </Link>
      </div>

      <div className="bg-card border border-dashed border-border rounded-xl p-6 mb-10">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Core RGS Tool Templates</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {INTERNAL_TOOL_PLACEHOLDERS.map((p) => (
            <Link key={p.key} to="/admin/tools" className="block p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/40">
              <div className="text-sm text-foreground">{p.title}</div>
              <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.description}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-10">
        {groups.map((g) => {
          const items = resources.filter(g.filter);
          return (
            <section key={g.key}>
              <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
                <h2 className="text-base text-foreground">{g.label}</h2>
                <span className="text-[11px] text-muted-foreground">{items.length} items</span>
              </div>
              {items.length === 0 ? (
                <div className="text-xs text-muted-foreground py-6">No templates yet. Create one in the Tools area.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((r) => (
                    <Link key={r.id} to="/admin/tools" className="block p-4 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <FileText className="h-4 w-4 text-primary mt-0.5" />
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="text-sm text-foreground mt-2 truncate">{r.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{categoryLabel(r.category)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </PortalShell>
  );
}
