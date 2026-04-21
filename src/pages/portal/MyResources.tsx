import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { categoryLabel } from "@/lib/portal";
import { ExternalLink, Download, FileText } from "lucide-react";

export default function MyResources({ filterType }: { filterType?: string }) {
  const { user } = useAuth();
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!c) return;
      const { data: r } = await supabase
        .from("resource_assignments")
        .select("resources(*)")
        .eq("customer_id", c.id);
      setResources(r?.map((x: any) => x.resources).filter(Boolean) ?? []);
    })();
  }, [user]);

  const filtered = filterType
    ? resources.filter((r) => r.resource_type === filterType)
    : resources;

  return (
    <PortalShell variant="customer">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {filterType === "sheet" ? "Worksheets" : "Resources"}
        </div>
        <h1 className="mt-2 text-3xl text-foreground">
          {filterType === "sheet" ? "My Worksheets" : "My Resources"}
        </h1>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-16 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Nothing has been shared with you yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors"
            >
              <FileText className="h-4 w-4 text-primary mb-3" />
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {categoryLabel(r.category)}
              </div>
              <div className="text-sm text-foreground font-medium">{r.title}</div>
              <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2 min-h-[32px]">
                {r.description || "—"}
              </div>
              <div className="flex items-center gap-3 mt-4">
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-secondary"
                  >
                    <ExternalLink className="h-3 w-3" /> Open
                  </a>
                )}
                {r.url && (
                  <a
                    href={r.url}
                    download
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Download className="h-3 w-3" /> Download
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}