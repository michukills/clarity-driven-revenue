import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, Library, ExternalLink, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  getClientToolLibraryResources,
  TLR_RESOURCE_TYPE_LABEL, TLR_LANE_LABEL, TLR_PHASE_LABEL, TLR_GEAR_LABEL,
  type ClientToolLibraryResource,
  type TlrResourceType, type TlrServiceLane,
} from "@/lib/toolLibraryResources";

export default function ToolLibrary() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientToolLibraryResource[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [laneFilter, setLaneFilter] = useState<TlrServiceLane | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TlrResourceType | "all">("all");

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientToolLibraryResources(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load resource library");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (laneFilter !== "all" && r.service_lane !== laneFilter) return false;
      if (typeFilter !== "all" && r.resource_type !== typeFilter) return false;
      if (q) {
        const hay = `${r.title} ${r.summary ?? ""} ${r.body ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, laneFilter, typeFilter]);

  const lanes = useMemo(() => {
    const set = new Set<TlrServiceLane>();
    rows?.forEach(r => set.add(r.service_lane));
    return Array.from(set);
  }, [rows]);

  const types = useMemo(() => {
    const set = new Set<TlrResourceType>();
    rows?.forEach(r => set.add(r.resource_type));
    return Array.from(set);
  }, [rows]);

  return (
    <PortalShell variant="customer">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Library className="h-3.5 w-3.5" />
            Part of the RGS Control System™ ·{" "}
            <Link to="/portal/tools/rgs-control-system" className="text-primary hover:underline">
              Back to RGS Control System™
            </Link>
          </div>
          <h1 className="text-2xl text-foreground font-serif">Tool Library / Resource Center</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            This library holds approved resources that support the stage of work you are in.
            It is here to make the system easier to use, not to replace the diagnostic,
            implementation work, or RGS review.
          </p>
          <p className="text-xs text-muted-foreground max-w-3xl">
            Resources are support materials. They do not replace owner judgment, qualified
            accounting / legal / tax / compliance review, or the agreed RGS service scope.
          </p>
        </header>

        {err && (
          <div className="border border-destructive/30 bg-destructive/10 rounded-md p-3 text-sm text-destructive">
            {err}
          </div>
        )}

        {loading || rows === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading resources…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="Search resources…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                className="bg-background border border-border rounded-md px-2 py-2 text-sm"
                value={laneFilter}
                onChange={e => setLaneFilter(e.target.value as any)}
              >
                <option value="all">All lanes</option>
                {lanes.map(l => (
                  <option key={l} value={l}>{TLR_LANE_LABEL[l]}</option>
                ))}
              </select>
              <select
                className="bg-background border border-border rounded-md px-2 py-2 text-sm"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
              >
                <option value="all">All types</option>
                {types.map(t => (
                  <option key={t} value={t}>{TLR_RESOURCE_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="border border-border bg-card rounded-xl p-6 text-center text-sm text-muted-foreground">
                No resources have been shared for your current stage yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {filtered.map(r => (
                  <li key={r.id} className="border border-border bg-card rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <h2 className="text-lg text-foreground font-serif flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          {r.title}
                        </h2>
                        {r.summary && (
                          <p className="text-sm text-muted-foreground">{r.summary}</p>
                        )}
                      </div>
                      <Badge variant="outline">{TLR_RESOURCE_TYPE_LABEL[r.resource_type]}</Badge>
                    </div>

                    {r.body && (
                      <p className="text-sm text-foreground whitespace-pre-line border-t border-border pt-3">
                        {r.body}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                      <Badge variant="secondary" className="text-[11px]">
                        Lane: {TLR_LANE_LABEL[r.service_lane]}
                      </Badge>
                      <Badge variant="secondary" className="text-[11px]">
                        Stage: {TLR_PHASE_LABEL[r.customer_journey_phase]}
                      </Badge>
                      {r.related_gear && (
                        <Badge variant="secondary" className="text-[11px]">
                          Gear: {TLR_GEAR_LABEL[r.related_gear]}
                        </Badge>
                      )}
                      {r.related_tool_key && (
                        <Badge variant="outline" className="text-[11px]">
                          Related tool: {r.related_tool_key}
                        </Badge>
                      )}
                    </div>

                    {r.external_url && (
                      <div>
                        <a
                          href={r.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {r.cta_label || "Open resource"} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </PortalShell>
  );
}
