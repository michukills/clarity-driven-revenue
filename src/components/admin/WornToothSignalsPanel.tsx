/**
 * P71 — Worn Tooth Signals™ admin review panel.
 *
 * Lets admins seed signals from the deterministic registry, manually
 * create signals, edit client-safe wording, link evidence /
 * Reality Check Flags / Repair Map items, approve, dismiss, or
 * resolve. Admin-only; never rendered inside a client portal route.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  WORN_TOOTH_SIGNAL_GEARS,
  WORN_TOOTH_SIGNAL_SEVERITIES,
  WORN_TOOTH_SIGNAL_STATUSES,
  WORN_TOOTH_SIGNAL_TRENDS,
  WORN_TOOTH_SIGNAL_REGISTRY,
  WORN_TOOTH_SIGNALS_NAME,
  WORN_TOOTH_SIGNALS_TONE_REMINDER,
  buildSignalDraftFromRule,
  findWornToothSignalForbiddenPhrase,
  type WornToothSignalGear,
  type WornToothSignalRule,
  type WornToothSignalSeverity,
  type WornToothSignalStatus,
  type WornToothSignalTrend,
} from "@/config/wornToothSignals";
import {
  adminApproveSignalForClient,
  adminCreateWornToothSignal,
  adminDismissSignal,
  adminListWornToothSignals,
  adminResolveSignal,
  adminUpdateWornToothSignal,
  type WornToothSignalRow,
} from "@/lib/wornToothSignals/wornToothSignals";

interface Props {
  customerId: string;
}

const SEVERITY_TONE: Record<WornToothSignalSeverity, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/10 text-amber-600",
  high: "bg-orange-500/15 text-orange-600",
  critical: "bg-destructive/15 text-destructive",
};

export default function WornToothSignalsPanel({ customerId }: Props) {
  const [rows, setRows] = useState<WornToothSignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<WornToothSignalRow>>({});
  const [filterStatus, setFilterStatus] = useState<WornToothSignalStatus | "all">("all");
  const [filterGear, setFilterGear] = useState<WornToothSignalGear | "all">("all");

  const load = async () => {
    setLoading(true);
    try {
      setRows(await adminListWornToothSignals(customerId));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (customerId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const seedFromRule = async (rule: WornToothSignalRule) => {
    try {
      await adminCreateWornToothSignal(buildSignalDraftFromRule(rule, customerId));
      toast.success(`Seeded ${rule.key} for review`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const createBlank = async () => {
    try {
      await adminCreateWornToothSignal({
        customerId,
        signalTitle: "New manual signal",
        gear: "operational_efficiency",
        severity: "medium",
        detectedSource: "admin_manual",
      });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const startEdit = (r: WornToothSignalRow) => {
    setEditing(r.id);
    setDraft({ ...r });
  };

  const saveEdit = async () => {
    if (!editing) return;
    for (const text of [
      draft.client_safe_summary,
      draft.client_safe_explanation,
      draft.recommended_owner_action,
    ]) {
      const bad = text ? findWornToothSignalForbiddenPhrase(text) : null;
      if (bad) {
        toast.error(`Forbidden client-facing phrase: "${bad}"`);
        return;
      }
    }
    try {
      await adminUpdateWornToothSignal(editing, {
        signalTitle: draft.signal_title ?? undefined,
        signalCategory: draft.signal_category ?? null,
        gear: draft.gear as WornToothSignalGear,
        severity: draft.severity as WornToothSignalSeverity,
        status: draft.status as WornToothSignalStatus,
        trend: draft.trend as WornToothSignalTrend,
        clientSafeSummary: draft.client_safe_summary ?? null,
        clientSafeExplanation: draft.client_safe_explanation ?? null,
        adminInterpretation: draft.admin_interpretation ?? null,
        adminNotes: draft.admin_notes ?? null,
        recommendedOwnerAction: draft.recommended_owner_action ?? null,
        repairMapRecommendation: draft.repair_map_recommendation ?? null,
        supportingMetricKey: draft.supporting_metric_key ?? null,
        supportingMetricValue: draft.supporting_metric_value ?? null,
        supportingMetricPeriod: draft.supporting_metric_period ?? null,
        benchmarkOrThresholdUsed: draft.benchmark_or_threshold_used ?? null,
        evidenceStrength: (draft.evidence_strength as any) ?? null,
        professionalReviewRecommended: !!draft.professional_review_recommended,
        regulatedIndustrySensitive: !!draft.regulated_industry_sensitive,
        approvedForClient: !!draft.approved_for_client,
        clientVisible: !!draft.client_visible,
        includeInReport: !!draft.include_in_report,
        linkedRealityCheckFlagId: draft.linked_reality_check_flag_id ?? null,
        linkedEvidenceRecordId: draft.linked_evidence_record_id ?? null,
        linkedRepairMapItemId: draft.linked_repair_map_item_id ?? null,
      });
      toast.success("Signal updated");
      setEditing(null);
      setDraft({});
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const approve = async (r: WornToothSignalRow) => {
    if (!r.client_safe_explanation?.trim()) {
      toast.error("Add a client-safe explanation first");
      return;
    }
    try {
      await adminApproveSignalForClient(r.id, r.client_safe_explanation, {
        includeInReport: r.include_in_report,
      });
      toast.success("Approved for client visibility");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const dismiss = async (r: WornToothSignalRow) => {
    const reason = window.prompt("Dismiss reason (admin-only)?") ?? "";
    if (!reason.trim()) return;
    try {
      await adminDismissSignal(r.id, reason);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const resolve = async (r: WornToothSignalRow) => {
    try {
      await adminResolveSignal(r.id);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const filtered = rows.filter(
    (r) =>
      (filterStatus === "all" || r.status === filterStatus) &&
      (filterGear === "all" || r.gear === filterGear),
  );

  return (
    <section className="rounded-xl border border-border bg-card/60 p-5">
      <header className="flex items-center gap-2 mb-2">
        <Lock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">
          {WORN_TOOTH_SIGNALS_NAME} (admin review)
        </h3>
        <Badge variant="outline" className="ml-2">Admin only</Badge>
      </header>
      <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
        {WORN_TOOTH_SIGNALS_TONE_REMINDER} Detected ≠ client-visible. Approve a
        signal only after reviewing the client-safe wording.
      </p>

      {/* Deterministic registry seeders */}
      <div className="rounded-lg border border-border/60 bg-background/40 p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Deterministic signal registry
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {WORN_TOOTH_SIGNAL_REGISTRY.map((rule) => (
            <Button
              key={rule.key}
              variant="outline"
              size="sm"
              className="text-[11px]"
              onClick={() => seedFromRule(rule)}
              title={rule.triggerSummary}
            >
              + {rule.signalTitle}
              <span className="opacity-60 ml-1">· {rule.gear.replace(/_/g, " ")}</span>
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={createBlank}>+ Manual signal</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as WornToothSignalStatus | "all")}
          className="bg-background border border-border rounded-md px-2 h-8"
        >
          <option value="all">All statuses</option>
          {WORN_TOOTH_SIGNAL_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          value={filterGear}
          onChange={(e) => setFilterGear(e.target.value as WornToothSignalGear | "all")}
          className="bg-background border border-border rounded-md px-2 h-8"
        >
          <option value="all">All gears</option>
          {WORN_TOOTH_SIGNAL_GEARS.map((g) => (
            <option key={g} value={g}>{g.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No signals match. Use the registry above to seed a candidate.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">{r.signal_title}</span>
                <Badge variant="outline">{r.gear.replace(/_/g, " ")}</Badge>
                <Badge className={SEVERITY_TONE[r.severity]}>{r.severity}</Badge>
                <Badge variant="outline">{r.status.replace(/_/g, " ")}</Badge>
                <Badge variant="outline">trend: {r.trend}</Badge>
                {r.regulated_industry_sensitive && (
                  <Badge variant="outline">Regulated</Badge>
                )}
                {r.linked_reality_check_flag_id && (
                  <Badge variant="outline">Linked Reality Check</Badge>
                )}
                {r.linked_evidence_record_id && (
                  <Badge variant="outline">Linked evidence</Badge>
                )}
                {r.linked_repair_map_item_id && (
                  <Badge variant="outline">Linked Repair Map</Badge>
                )}
                {r.client_visible && r.approved_for_client && (
                  <Badge>Client-visible</Badge>
                )}
              </div>
              {r.client_safe_summary && (
                <p className="mt-2 text-xs text-foreground">
                  <span className="text-muted-foreground">Client-safe summary: </span>
                  {r.client_safe_summary}
                </p>
              )}
              {r.admin_notes && (
                <p className="mt-1 text-[11px] text-muted-foreground italic">
                  Admin-only note: {r.admin_notes}
                </p>
              )}

              {editing === r.id ? (
                <div className="mt-3 space-y-2">
                  <Input
                    value={draft.signal_title ?? ""}
                    onChange={(e) => setDraft({ ...draft, signal_title: e.target.value })}
                    placeholder="Signal title"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={draft.gear ?? r.gear}
                      onChange={(e) => setDraft({ ...draft, gear: e.target.value as WornToothSignalGear })}
                      className="bg-background border border-border rounded-md px-2 text-sm h-9"
                    >
                      {WORN_TOOTH_SIGNAL_GEARS.map((g) => (
                        <option key={g} value={g}>{g.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                    <select
                      value={draft.severity ?? r.severity}
                      onChange={(e) => setDraft({ ...draft, severity: e.target.value as WornToothSignalSeverity })}
                      className="bg-background border border-border rounded-md px-2 text-sm h-9"
                    >
                      {WORN_TOOTH_SIGNAL_SEVERITIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      value={draft.status ?? r.status}
                      onChange={(e) => setDraft({ ...draft, status: e.target.value as WornToothSignalStatus })}
                      className="bg-background border border-border rounded-md px-2 text-sm h-9"
                    >
                      {WORN_TOOTH_SIGNAL_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                    <select
                      value={draft.trend ?? r.trend}
                      onChange={(e) => setDraft({ ...draft, trend: e.target.value as WornToothSignalTrend })}
                      className="bg-background border border-border rounded-md px-2 text-sm h-9"
                    >
                      {WORN_TOOTH_SIGNAL_TRENDS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <Textarea
                    value={draft.client_safe_summary ?? ""}
                    onChange={(e) => setDraft({ ...draft, client_safe_summary: e.target.value })}
                    placeholder="Client-safe summary"
                  />
                  <Textarea
                    value={draft.client_safe_explanation ?? ""}
                    onChange={(e) => setDraft({ ...draft, client_safe_explanation: e.target.value })}
                    placeholder="Client-safe explanation"
                  />
                  <Textarea
                    value={draft.recommended_owner_action ?? ""}
                    onChange={(e) => setDraft({ ...draft, recommended_owner_action: e.target.value })}
                    placeholder="Recommended owner action"
                  />
                  <Textarea
                    value={draft.admin_notes ?? ""}
                    onChange={(e) => setDraft({ ...draft, admin_notes: e.target.value })}
                    placeholder="Admin-only notes (never shown to client)"
                  />
                  <Input
                    value={draft.linked_reality_check_flag_id ?? ""}
                    onChange={(e) => setDraft({ ...draft, linked_reality_check_flag_id: e.target.value || null })}
                    placeholder="Linked Reality Check Flag ID (optional)"
                  />
                  <Input
                    value={draft.linked_evidence_record_id ?? ""}
                    onChange={(e) => setDraft({ ...draft, linked_evidence_record_id: e.target.value || null })}
                    placeholder="Linked Evidence Record ID (optional)"
                  />
                  <Input
                    value={draft.linked_repair_map_item_id ?? ""}
                    onChange={(e) => setDraft({ ...draft, linked_repair_map_item_id: e.target.value || null })}
                    placeholder="Linked Repair Map item ID (optional)"
                  />
                  <div className="flex flex-wrap gap-3 text-xs">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={!!draft.approved_for_client}
                        onChange={(e) => setDraft({ ...draft, approved_for_client: e.target.checked })}
                      />
                      Approved for client
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={!!draft.client_visible}
                        onChange={(e) => setDraft({ ...draft, client_visible: e.target.checked })}
                      />
                      Client-visible
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={!!draft.include_in_report}
                        onChange={(e) => setDraft({ ...draft, include_in_report: e.target.checked })}
                      />
                      Include in report
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={!!draft.professional_review_recommended}
                        onChange={(e) => setDraft({ ...draft, professional_review_recommended: e.target.checked })}
                      />
                      Professional review recommended
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setDraft({}); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(r)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => approve(r)} disabled={r.status === "client_visible"}>
                    Approve for client
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => dismiss(r)}>Dismiss</Button>
                  <Button size="sm" variant="outline" onClick={() => resolve(r)}>Resolve</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}