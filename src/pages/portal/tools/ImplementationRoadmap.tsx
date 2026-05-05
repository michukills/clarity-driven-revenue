import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import {
  getClientImplementationRoadmap,
  type ClientRoadmapRow,
  GEAR_LABELS,
  OWNER_LABELS,
  type RoadmapPhase,
} from "@/lib/implementationRoadmap";
import { Loader2, ListChecks, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImplementationScopeBanner } from "@/components/tools/ImplementationScopeBanner";
import {
  getClientRepairMapEvidence,
  type ClientRepairMapEvidenceRow,
} from "@/lib/evidence/evidenceRecords";
import { REPAIR_MAP_NAME } from "@/lib/reports/structuralHealthReport";
import { ArchitectsShieldAcceptance } from "@/components/legal/ArchitectsShieldAcceptance";
import { isAcknowledgmentCurrent } from "@/lib/legal/clientAcknowledgments";

export default function ImplementationRoadmap() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientRoadmapRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [evidenceByItem, setEvidenceByItem] = useState<
    Record<string, ClientRepairMapEvidenceRow[]>
  >({});
  // P69B — Architect's Shield™ gating for Repair Map view.
  const [shieldAccepted, setShieldAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    isAcknowledgmentCurrent(customerId, "architects_shield_scope_agreement")
      .then((ok) => {
        if (alive) setShieldAccepted(ok);
      })
      .catch(() => {
        if (alive) setShieldAccepted(false);
      });
    return () => {
      alive = false;
    };
  }, [customerId, loading]);

  useEffect(() => {
    if (loading || !customerId) return;
    if (shieldAccepted !== true) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientImplementationRoadmap(customerId);
        if (alive) setRows(r);
        try {
          const ev = await getClientRepairMapEvidence(customerId);
          if (alive) {
            const map: Record<string, ClientRepairMapEvidenceRow[]> = {};
            for (const e of ev) {
              (map[e.repair_map_item_id] ||= []).push(e);
            }
            setEvidenceByItem(map);
          }
        } catch {
          // Evidence is optional; never blocks roadmap load.
        }
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load roadmap");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading, shieldAccepted]);

  const roadmap = rows && rows.length > 0
    ? { id: rows[0].roadmap_id, title: rows[0].title, summary: rows[0].summary, status: rows[0].status }
    : null;

  // Group items by phase, dropping rows that have no item (roadmap-only row).
  const items = (rows ?? []).filter((r) => r.item_id);
  // P68B — Group into the canonical 30/60/90 RGS Repair Map™ slots.
  const slots: Array<{
    key: string;
    title: string;
    phases: RoadmapPhase[];
  }> = [
    {
      key: "first30",
      title: "First 30 Days — Stop the Slipping",
      phases: ["stabilize"],
    },
    {
      key: "days31to60",
      title: "Days 31–60 — Install the Missing Systems",
      phases: ["install"],
    },
    {
      key: "days61to90",
      title: "Days 61–90 — Strengthen the Owner Independence Layer",
      phases: ["train", "handoff", "ongoing_visibility"],
    },
  ];

  return (
    <PortalShell variant="customer">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListChecks className="h-4 w-4" /> Implementation
          </div>
          <h1 className="text-2xl text-foreground font-serif">{REPAIR_MAP_NAME}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            This roadmap turns your diagnostic findings into a bounded implementation plan.
            It shows what is being installed, why it matters, who owns the next step, and what
            the expected deliverable is. It is based on diagnostic findings and available
            evidence — not a guarantee of results.
          </p>
        </header>

        <ImplementationScopeBanner />

        {loading || shieldAccepted === null ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : shieldAccepted === false && customerId ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground max-w-2xl">
              Before opening your {REPAIR_MAP_NAME}, please acknowledge the
              Architect&rsquo;s Shield&trade; scope agreement so the
              boundaries between your responsibilities and RGS&rsquo;s role
              are clear.
            </p>
            <ArchitectsShieldAcceptance
              customerId={customerId}
              agreementKey="architects_shield_scope_agreement"
              context="repair_map_view"
              onAccepted={() => setShieldAccepted(true)}
            />
          </div>
        ) : rows === null ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : err ? (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            We couldn't load your roadmap right now. Please try again shortly.
          </div>
        ) : !roadmap ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <h2 className="text-base text-foreground mb-2">Your implementation roadmap is being prepared.</h2>
            <p className="text-sm text-muted-foreground">
              Once RGS marks it ready, you'll see the approved repair plan here.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-lg text-foreground">{roadmap.title}</h2>
                <Badge variant="outline" className="capitalize">
                  {roadmap.status.replace(/_/g, " ")}
                </Badge>
              </div>
              {roadmap.summary ? (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{roadmap.summary}</p>
              ) : null}
            </div>

            {items.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
                Roadmap items will appear here once RGS releases them.
              </div>
            ) : (
              <div className="space-y-6">
                {slots.map((slot) => {
                  const inSlot = items.filter(
                    (i) => i.phase && slot.phases.includes(i.phase),
                  );
                  if (inSlot.length === 0) return null;
                  return (
                    <section key={slot.key} className="space-y-3">
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
                        {slot.title}
                      </h3>
                      <div className="space-y-3">
                        {inSlot.map((it) => {
                          const evList = evidenceByItem[it.item_id!] ?? [];
                          return (
                          <article key={it.item_id!} className="bg-card border border-border rounded-xl p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-foreground">{it.item_title}</h4>
                                {it.gear ? (
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {GEAR_LABELS[it.gear]}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className="capitalize">{it.priority}</Badge>
                                <Badge variant="secondary" className="capitalize">
                                  {(it.item_status ?? "").replace(/_/g, " ")}
                                </Badge>
                                {evList.length > 0 ? (
                                  <Badge variant="outline" className="text-[10px]">
                                    <FileCheck2 className="h-2.5 w-2.5 mr-1" /> evidence-backed
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                            {it.client_summary ? (
                              <p className="text-sm text-muted-foreground whitespace-pre-line">
                                {it.client_summary}
                              </p>
                            ) : null}
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {it.owner_type ? (
                                <div>
                                  <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Who owns the next step</dt>
                                  <dd className="text-foreground">{OWNER_LABELS[it.owner_type]}</dd>
                                </div>
                              ) : null}
                              {it.deliverable ? (
                                <div>
                                  <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Deliverable</dt>
                                  <dd className="text-foreground">{it.deliverable}</dd>
                                </div>
                              ) : null}
                              {it.success_indicator ? (
                                <div className="sm:col-span-2">
                                  <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Success indicator</dt>
                                  <dd className="text-foreground">{it.success_indicator}</dd>
                                </div>
                              ) : null}
                            </dl>
                            {evList.length > 0 ? (
                              <div className="pt-2 border-t border-border space-y-1">
                                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                  Supported by
                                </div>
                                <ul className="space-y-1">
                                  {evList.map((e) => (
                                    <li
                                      key={e.evidence_id}
                                      className="text-xs text-foreground flex items-start gap-2"
                                    >
                                      <FileCheck2 className="h-3 w-3 mt-0.5 text-muted-foreground" />
                                      <span>
                                        {e.evidence_title ?? "Evidence"}
                                        {e.client_visible_note ? (
                                          <span className="text-muted-foreground">
                                            {" "}
                                            — {e.client_visible_note}
                                          </span>
                                        ) : null}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </article>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              RGS supports the items inside the agreed implementation engagement. Decisions and
              internal execution remain the owner's responsibility. Ongoing visibility after
              implementation is offered separately through the RGS Control System™ subscription.
            </p>
          </>
        )}
      </div>
    </PortalShell>
  );
}