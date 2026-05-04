import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, MessagesSquare, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RcsScopeBanner } from "@/components/tools/RcsScopeBanner";
import {
  getClientAdvisoryEntries,
  ADVISORY_TYPE_LABEL, ADVISORY_PRIORITY_LABEL,
  ADVISORY_LANE_LABEL, ADVISORY_PHASE_LABEL,
  ADVISORY_GEAR_LABEL, ADVISORY_SOURCE_LABEL,
  type ClientAdvisoryEntry,
  type AdvisoryNoteType, type AdvisoryServiceLane,
} from "@/lib/advisoryNotes";

export default function AdvisoryNotes() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientAdvisoryEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<AdvisoryNoteType | "all">("all");
  const [laneFilter, setLaneFilter] = useState<AdvisoryServiceLane | "all">("all");

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientAdvisoryEntries(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load advisory notes");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter(r => {
      if (typeFilter !== "all" && r.note_type !== typeFilter) return false;
      if (laneFilter !== "all" && r.service_lane !== laneFilter) return false;
      return true;
    });
  }, [rows, typeFilter, laneFilter]);

  const types = useMemo(() => Array.from(new Set(rows?.map(r => r.note_type) ?? [])), [rows]);
  const lanes = useMemo(() => Array.from(new Set(rows?.map(r => r.service_lane) ?? [])), [rows]);

  return (
    <PortalShell variant="customer">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessagesSquare className="h-3.5 w-3.5" />
            Part of the RGS Control System™ ·{" "}
            <Link to="/portal/tools/rgs-control-system" className="text-primary hover:underline">
              Back to RGS Control System™
            </Link>
          </div>
          <h1 className="text-2xl text-foreground font-serif">Advisory Notes / Clarification Log</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            This log keeps approved clarification notes and bounded RGS review comments in one
            place. It is here so nothing important gets lost, and it stays within the agreed
            RGS service scope. It is not a real-time messaging channel.
          </p>
          <p className="text-xs text-muted-foreground max-w-3xl">
            Notes are bounded review and clarification materials. They do not replace owner judgment,
            qualified accounting / legal / tax / compliance review, or the agreed RGS service scope.
          </p>
        </header>

        <RcsScopeBanner
          included="approved clarification notes and bounded RGS review comments kept in one durable place."
        />

        {err && (
          <div className="border border-destructive/30 bg-destructive/10 rounded-md p-3 text-sm text-destructive">
            {err}
          </div>
        )}

        {loading || rows === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading advisory notes…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                className="bg-background border border-border rounded-md px-2 py-2 text-sm"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
              >
                <option value="all">All note types</option>
                {types.map(t => <option key={t} value={t}>{ADVISORY_TYPE_LABEL[t]}</option>)}
              </select>
              <select
                className="bg-background border border-border rounded-md px-2 py-2 text-sm"
                value={laneFilter}
                onChange={e => setLaneFilter(e.target.value as any)}
              >
                <option value="all">All lanes</option>
                {lanes.map(l => <option key={l} value={l}>{ADVISORY_LANE_LABEL[l]}</option>)}
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="border border-border bg-card rounded-xl p-6 text-center text-sm text-muted-foreground">
                No advisory or clarification notes have been shared yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {filtered.map(r => (
                  <li key={r.id} className="border border-border bg-card rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <h2 className="text-lg text-foreground font-serif flex items-center gap-2">
                          {r.pinned && <Pin className="h-4 w-4 text-primary" />}
                          {r.title}
                        </h2>
                        {r.client_visible_summary && (
                          <p className="text-sm text-muted-foreground">{r.client_visible_summary}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline">{ADVISORY_TYPE_LABEL[r.note_type]}</Badge>
                        <Badge variant="secondary" className="text-[11px]">
                          Priority: {ADVISORY_PRIORITY_LABEL[r.priority]}
                        </Badge>
                      </div>
                    </div>

                    {r.client_visible_body && (
                      <p className="text-sm text-foreground whitespace-pre-line border-t border-border pt-3">
                        {r.client_visible_body}
                      </p>
                    )}

                    {r.client_question && (
                      <div className="border-t border-border pt-3">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                          Clarification question
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-line">{r.client_question}</p>
                      </div>
                    )}

                    {r.client_response && (
                      <div className="border-t border-border pt-3">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                          Client response
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-line">{r.client_response}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                      <Badge variant="secondary" className="text-[11px]">
                        Lane: {ADVISORY_LANE_LABEL[r.service_lane]}
                      </Badge>
                      <Badge variant="secondary" className="text-[11px]">
                        Stage: {ADVISORY_PHASE_LABEL[r.customer_journey_phase]}
                      </Badge>
                      {r.related_gear && (
                        <Badge variant="secondary" className="text-[11px]">
                          Gear: {ADVISORY_GEAR_LABEL[r.related_gear]}
                        </Badge>
                      )}
                      {r.related_source_type && (
                        <Badge variant="outline" className="text-[11px]">
                          Source: {ADVISORY_SOURCE_LABEL[r.related_source_type]}
                        </Badge>
                      )}
                      {r.related_tool_key && (
                        <Badge variant="outline" className="text-[11px]">
                          Related tool: {r.related_tool_key}
                        </Badge>
                      )}
                      {r.due_date && (
                        <Badge variant="outline" className="text-[11px]">
                          Due: {r.due_date}
                        </Badge>
                      )}
                      {r.resolved_at && (
                        <Badge variant="outline" className="text-[11px]">
                          Resolved: {new Date(r.resolved_at).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
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
