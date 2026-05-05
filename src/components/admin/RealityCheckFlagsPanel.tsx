/**
 * P70 — Reality Check Flags™ admin review panel.
 *
 * Lets admins detect (from deterministic rules), create (manual),
 * review, link evidence/repair-map, edit client-safe wording,
 * approve, dismiss, or resolve flags for a customer.
 *
 * Admin-only: this component must NEVER be rendered inside a client
 * portal route. RLS additionally enforces this server-side.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lock, ShieldAlert, Sparkles, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import {
  REALITY_CHECK_FLAG_GEARS,
  REALITY_CHECK_FLAG_SEVERITIES,
  REALITY_CHECK_FLAG_STATUSES,
  REALITY_CHECK_FLAG_TYPES,
  REALITY_CHECK_FLAGS_NAME,
  REALITY_CHECK_FLAGS_TONE_REMINDER,
  REALITY_CHECK_RULE_REGISTRY,
  findRealityCheckForbiddenPhrase,
  type RealityCheckFlagGear,
  type RealityCheckFlagSeverity,
  type RealityCheckFlagStatus,
  type RealityCheckFlagType,
  type RealityCheckRule,
} from "@/config/realityCheckFlags";
import {
  adminApproveFlagForClient,
  adminCreateRealityCheckFlag,
  adminDismissFlag,
  adminListRealityCheckFlags,
  adminResolveFlag,
  adminUpdateRealityCheckFlag,
  buildFlagDraftFromRule,
  type RealityCheckFlagRow,
} from "@/lib/realityCheck/realityCheckFlags";

interface Props {
  customerId: string;
}

const SEVERITY_TONE: Record<RealityCheckFlagSeverity, string> = {
  watch: "bg-muted text-muted-foreground",
  warning: "bg-amber-500/15 text-amber-600",
  critical: "bg-destructive/15 text-destructive",
};

export default function RealityCheckFlagsPanel({ customerId }: Props) {
  const [rows, setRows] = useState<RealityCheckFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<RealityCheckFlagRow>>({});
  const [filterStatus, setFilterStatus] = useState<RealityCheckFlagStatus | "all">("all");

  const load = async () => {
    setLoading(true);
    try {
      setRows(await adminListRealityCheckFlags(customerId));
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

  const seedFromRule = async (rule: RealityCheckRule) => {
    try {
      await adminCreateRealityCheckFlag(buildFlagDraftFromRule(rule, customerId));
      toast.success(`Seeded ${rule.id} for review`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const createBlank = async () => {
    try {
      await adminCreateRealityCheckFlag({
        customerId,
        title: "New manual flag",
        flagType: "owner_claim_unsupported",
        severity: "watch",
        detectedSource: "admin_manual",
      });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const startEdit = (r: RealityCheckFlagRow) => {
    setEditing(r.id);
    setDraft({ ...r });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const expl = draft.client_visible_explanation ?? "";
    const bad = expl ? findRealityCheckForbiddenPhrase(expl) : null;
    if (bad) {
      toast.error(`Forbidden client-facing phrase: "${bad}"`);
      return;
    }
    try {
      await adminUpdateRealityCheckFlag(editing, {
        title: draft.title ?? undefined,
        summary: draft.summary ?? undefined,
        affectedGear: (draft.affected_gear as RealityCheckFlagGear) ?? null,
        affectedMetric: draft.affected_metric ?? null,
        flagType: draft.flag_type as RealityCheckFlagType,
        severity: draft.severity as RealityCheckFlagSeverity,
        status: draft.status as RealityCheckFlagStatus,
        ownerClaim: draft.owner_claim ?? null,
        evidenceGap: draft.evidence_gap ?? null,
        contradictingMetric: draft.contradicting_metric ?? null,
        adminOnlyNote: draft.admin_only_note ?? null,
        clientVisibleExplanation: expl || null,
        professionalReviewRecommended: !!draft.professional_review_recommended,
        regulatedIndustrySensitive: !!draft.regulated_industry_sensitive,
        clientVisible: !!draft.client_visible,
        approvedForClient: !!draft.approved_for_client,
        includeInReport: !!draft.include_in_report,
      });
      toast.success("Flag updated");
      setEditing(null);
      setDraft({});
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const approve = async (r: RealityCheckFlagRow) => {
    if (!r.client_visible_explanation?.trim()) {
      toast.error("Add a client-safe explanation first");
      return;
    }
    try {
      await adminApproveFlagForClient(r.id, r.client_visible_explanation);
      toast.success("Approved for client visibility");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const dismiss = async (r: RealityCheckFlagRow) => {
    const reason = window.prompt("Dismiss reason (admin-only)?") ?? "";
    if (!reason.trim()) return;
    try {
      await adminDismissFlag(r.id, reason);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const resolve = async (r: RealityCheckFlagRow) => {
    try {
      await adminResolveFlag(r.id);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const filtered = rows.filter((r) => filterStatus === "all" || r.status === filterStatus);

  return (
    <section className="rounded-xl border border-border bg-card/60 p-5">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            {REALITY_CHECK_FLAGS_NAME}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-2xl">
            {REALITY_CHECK_FLAGS_TONE_REMINDER}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as RealityCheckFlagStatus | "all")}
            className="text-xs bg-background border border-border rounded px-2 py-1"
          >
            <option value="all">All statuses</option>
            {REALITY_CHECK_FLAG_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={createBlank}>+ Manual flag</Button>
        </div>
      </header>

      <details className="mb-4 rounded-md border border-border/60 bg-muted/20 p-3">
        <summary className="text-xs font-medium cursor-pointer flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" /> Seed from deterministic rule registry
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {REALITY_CHECK_RULE_REGISTRY.map((rule) => (
            <div key={rule.id} className="flex items-start justify-between gap-2 rounded border border-border/60 bg-background/40 p-2">
              <div className="min-w-0">
                <div className="text-[11px] font-medium truncate">{rule.id}</div>
                <div className="text-[10px] text-muted-foreground">
                  {rule.gear} · {rule.flagType} · {rule.severity}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => seedFromRule(rule)}>Seed</Button>
            </div>
          ))}
        </div>
      </details>

      {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div className="text-xs text-muted-foreground">No flags in this view.</div>
      )}

      <div className="space-y-3">
        {filtered.map((r) => {
          const isEditing = editing === r.id;
          return (
            <article key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-medium text-foreground truncate">{r.title}</h4>
                    <Badge className={SEVERITY_TONE[r.severity]}>{r.severity}</Badge>
                    <Badge variant="outline">{r.status}</Badge>
                    {r.approved_for_client && <Badge variant="outline">approved</Badge>}
                    {r.include_in_report && <Badge variant="outline"><FileCheck2 className="h-3 w-3 mr-1" />in report</Badge>}
                    {r.regulated_industry_sensitive && <Badge variant="outline">regulated</Badge>}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {r.affected_gear ?? "—"} · {r.flag_type} · {r.detected_source ?? "manual"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {!isEditing && <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>Edit</Button>}
                  {!isEditing && r.status !== "client_visible" && (
                    <Button size="sm" variant="outline" onClick={() => approve(r)}>Approve for client</Button>
                  )}
                  {!isEditing && r.status !== "dismissed" && (
                    <Button size="sm" variant="ghost" onClick={() => dismiss(r)}>Dismiss</Button>
                  )}
                  {!isEditing && r.status !== "resolved" && (
                    <Button size="sm" variant="ghost" onClick={() => resolve(r)}>Resolve</Button>
                  )}
                </div>
              </div>

              {!isEditing && (
                <div className="mt-2 space-y-1 text-xs">
                  {r.owner_claim && <div><span className="text-muted-foreground">Owner claim:</span> {r.owner_claim}</div>}
                  {r.evidence_gap && <div><span className="text-muted-foreground">Evidence gap:</span> {r.evidence_gap}</div>}
                  {r.contradicting_metric && <div><span className="text-muted-foreground">Contradicting metric:</span> {r.contradicting_metric}</div>}
                  {r.client_visible_explanation && (
                    <div className="mt-1 rounded bg-muted/30 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Client-safe explanation</div>
                      <div>{r.client_visible_explanation}</div>
                    </div>
                  )}
                  {r.admin_only_note && (
                    <div className="mt-1 rounded bg-destructive/5 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Admin-only note</div>
                      <div>{r.admin_only_note}</div>
                    </div>
                  )}
                </div>
              )}

              {isEditing && (
                <div className="mt-3 space-y-2 text-xs">
                  <Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
                  <div className="grid grid-cols-3 gap-2">
                    <select className="bg-background border border-border rounded px-2 py-1" value={(draft.affected_gear ?? "") as string} onChange={(e) => setDraft({ ...draft, affected_gear: e.target.value || null })}>
                      <option value="">— gear —</option>
                      {REALITY_CHECK_FLAG_GEARS.map((g) => (<option key={g} value={g}>{g}</option>))}
                    </select>
                    <select className="bg-background border border-border rounded px-2 py-1" value={draft.flag_type as string} onChange={(e) => setDraft({ ...draft, flag_type: e.target.value as RealityCheckFlagType })}>
                      {REALITY_CHECK_FLAG_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                    <select className="bg-background border border-border rounded px-2 py-1" value={draft.severity as string} onChange={(e) => setDraft({ ...draft, severity: e.target.value as RealityCheckFlagSeverity })}>
                      {REALITY_CHECK_FLAG_SEVERITIES.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                  <Textarea rows={2} placeholder="Owner claim" value={draft.owner_claim ?? ""} onChange={(e) => setDraft({ ...draft, owner_claim: e.target.value })} />
                  <Textarea rows={2} placeholder="Evidence gap" value={draft.evidence_gap ?? ""} onChange={(e) => setDraft({ ...draft, evidence_gap: e.target.value })} />
                  <Textarea rows={2} placeholder="Contradicting metric" value={draft.contradicting_metric ?? ""} onChange={(e) => setDraft({ ...draft, contradicting_metric: e.target.value })} />
                  <Textarea rows={3} placeholder="Client-safe explanation (no legal/compliance language)" value={draft.client_visible_explanation ?? ""} onChange={(e) => setDraft({ ...draft, client_visible_explanation: e.target.value })} />
                  <Textarea rows={2} placeholder="Admin-only note (never shown to client)" value={draft.admin_only_note ?? ""} onChange={(e) => setDraft({ ...draft, admin_only_note: e.target.value })} />
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!draft.professional_review_recommended} onChange={(e) => setDraft({ ...draft, professional_review_recommended: e.target.checked })} /> Professional review</label>
                    <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!draft.regulated_industry_sensitive} onChange={(e) => setDraft({ ...draft, regulated_industry_sensitive: e.target.checked })} /> Regulated</label>
                    <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!draft.client_visible} onChange={(e) => setDraft({ ...draft, client_visible: e.target.checked })} /> Client-visible</label>
                    <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!draft.approved_for_client} onChange={(e) => setDraft({ ...draft, approved_for_client: e.target.checked })} /> Approved for client</label>
                    <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!draft.include_in_report} onChange={(e) => setDraft({ ...draft, include_in_report: e.target.checked })} /> Include in report</label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setDraft({}); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
