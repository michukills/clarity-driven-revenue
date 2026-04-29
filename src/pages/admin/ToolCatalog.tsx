import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  listToolCatalog,
  REASON_LABEL,
  TOOL_TYPE_LABEL,
  type ToolCatalogRow,
} from "@/lib/toolCatalog";
import { Wrench } from "lucide-react";

const VISIBILITY_LABEL: Record<string, string> = {
  admin_only: "Admin only",
  client_available: "Client-available",
  hidden: "Hidden",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  beta: "Beta",
  deprecated: "Deprecated",
};

export default function ToolCatalogPage() {
  const [tools, setTools] = useState<ToolCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await listToolCatalog();
        if (alive) setTools(rows);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load tool catalog");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ToolCatalogRow[]>();
    for (const t of tools) {
      const key = t.tool_type;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tools]);

  return (
    <PortalShell variant="admin">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Governance
        </div>
        <h1 className="mt-2 text-3xl text-foreground">RGS Tool Catalog</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          First-party RGS system tools, their default visibility, and which
          clients can see them. Industry and per-client overrides are managed
          on each customer record.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">Loading catalog…</div>
      )}
      {error && (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-3">
          {error}
        </div>
      )}
      {!loading && !error && tools.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Wrench className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground">No tools in the catalog yet.</p>
        </div>
      )}

      <div className="space-y-10">
        {Array.from(grouped.entries()).map(([type, items]) => (
          <section key={type}>
            <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
                  {TOOL_TYPE_LABEL[type as keyof typeof TOOL_TYPE_LABEL] ?? type}
                </div>
                <h2 className="text-base text-foreground mt-1">
                  {items.length} tool{items.length === 1 ? "" : "s"}
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium">Key</th>
                    <th className="text-left px-3 py-2 font-medium">Visibility</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Active client req.</th>
                    <th className="text-left px-3 py-2 font-medium">Industry req.</th>
                    <th className="text-left px-3 py-2 font-medium">Route</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id} className="border-t border-border/60">
                      <td className="px-3 py-2 text-foreground">
                        <div className="font-medium">{t.name}</div>
                        {t.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 max-w-md">
                            {t.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        <code>{t.tool_key}</code>
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground">
                        {VISIBILITY_LABEL[t.default_visibility] ?? t.default_visibility}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground">
                        {STATUS_LABEL[t.status] ?? t.status}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground">
                        {t.requires_active_client ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground">
                        {t.requires_industry ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {t.route_path ? <code>{t.route_path}</code> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 text-xs text-muted-foreground border-t border-border pt-4">
        Effective access reasons used by the system:{" "}
        {Object.entries(REASON_LABEL)
          .map(([k, v]) => `${k} → ${v}`)
          .join(" · ")}
      </div>
    </PortalShell>
  );
}