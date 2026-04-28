import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Archive,
  RefreshCcw,
  ShieldCheck,
  AlertTriangle,
  Database,
  FileText,
} from "lucide-react";
import { generateDeterministicDraft, labelForType, logDraftEvent } from "@/lib/reports/draftService";
import type {
  DraftSection,
  ReportDraftRow,
  ReportDraftStatus,
} from "@/lib/reports/types";
import { EvidenceTierBadge } from "@/components/evidence/EvidenceTierBadge";
import { deriveEvidenceTier } from "@/lib/evidenceIntake/tier";
import { TruthTestPanel } from "@/components/admin/TruthTestPanel";
import { gradeStoredReportDraft } from "@/lib/truthTesting/rubric";
import { PriorityRoadmapPanel } from "@/components/admin/PriorityRoadmapPanel";

const STATUS_OPTIONS: ReportDraftStatus[] = ["draft", "needs_review", "approved", "archived"];

export default function AdminReportDraftDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ReportDraftRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [sections, setSections] = useState<DraftSection[]>([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [status, setStatus] = useState<ReportDraftStatus>("draft");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("report_drafts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) toast.error(error.message);
    if (data) {
      const d = data as unknown as ReportDraftRow;
      setDraft(d);
      setSections((d.draft_sections?.sections as DraftSection[]) ?? []);
      setAdminNotes(d.admin_notes ?? "");
      setStatus(d.status);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const evidence = draft?.evidence_snapshot ?? null;

  const evidenceCounts = useMemo(() => {
    const c = evidence?.counts ?? {};
    return Object.entries(c)
      .filter(([, n]) => (n as number) > 0)
      .map(([k, n]) => `${k}: ${n}`);
  }, [evidence]);

  // Live Truth-Test grade — recomputes as the admin edits sections.
  const truthTest = useMemo(() => {
    if (!draft) return null;
    const liveBody = sections.map((s) => s.body).join("\n\n");
    return gradeStoredReportDraft({
      ...draft,
      draft_sections: { sections },
      admin_notes: adminNotes,
      status,
    } as typeof draft & { draft_sections: { sections: typeof sections } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, sections, status]);

  const updateSection = (key: string, body: string) => {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, body } : s)),
    );
  };

  const toggleSafe = (key: string) => {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, client_safe: !s.client_safe } : s)),
    );
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("report_drafts")
        .update({
          draft_sections: { sections } as any,
          admin_notes: adminNotes,
          status,
          ...(status === "approved" && !draft.approved_at
            ? {
                approved_at: new Date().toISOString(),
                approved_by: (await supabase.auth.getUser()).data.user?.id ?? null,
                client_safe: true,
              }
            : {}),
        } as any)
        .eq("id", draft.id);
      if (error) throw error;

      if (status === "approved" && draft.status !== "approved") {
        await logDraftEvent(draft.id, "approved");
      } else if (status === "archived" && draft.status !== "archived") {
        await logDraftEvent(draft.id, "archived");
      } else {
        await logDraftEvent(draft.id, "edited", { notes: "Saved edits" });
      }
      toast.success("Draft saved");
      load();
    } catch (e: any) {
      toast.error(e.message || "Could not save draft");
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    if (!draft) return;
    if (
      !confirm(
        "Regenerate the deterministic draft from fresh evidence? Your edits will be replaced (admin notes kept).",
      )
    )
      return;
    setRegenerating(true);
    try {
      const created = await generateDeterministicDraft({
        customer_id: draft.customer_id ?? undefined,
        scorecard_run_id: draft.scorecard_run_id ?? undefined,
        report_type: draft.report_type,
        title: draft.title ?? undefined,
      });
      // Carry over admin notes
      if (adminNotes.trim()) {
        await supabase
          .from("report_drafts")
          .update({ admin_notes: adminNotes } as any)
          .eq("id", created.id);
      }
      toast.success("New deterministic draft generated");
      navigate(`/admin/report-drafts/${created.id}`);
    } catch (e: any) {
      toast.error(e.message || "Could not regenerate");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <PortalShell variant="admin">
        <div className="p-8 text-sm text-muted-foreground">Loading draft…</div>
      </PortalShell>
    );
  }

  if (!draft) {
    return (
      <PortalShell variant="admin">
        <div className="p-8 text-sm text-muted-foreground">Draft not found.</div>
      </PortalShell>
    );
  }

  return (
    <PortalShell variant="admin">
      <div className="mb-4">
        <button
          onClick={() => navigate("/admin/report-drafts")}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All drafts
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {labelForType(draft.report_type)}
          </div>
          <h1 className="mt-1 text-2xl text-foreground">{draft.title || "Untitled draft"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Draft — requires RGS review
            </span>
            <span className="bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-md">
              {draft.generation_mode === "ai_assisted" ? "AI-assisted" : "Deterministic"} ·{" "}
              {draft.rubric_version}
            </span>
            <span className="bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-md">
              Confidence: <strong className="text-foreground">{draft.confidence}</strong>
            </span>
            <span className="bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-md inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> AI status: {draft.ai_status}
            </span>
            {evidence?.is_demo_account ? (
              <span className="bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md uppercase tracking-wider">
                demo account
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={regenerate}
            disabled={regenerating}
            className="border-border"
          >
            <RefreshCcw className="h-4 w-4" /> {regenerating ? "Regenerating…" : "Regenerate"}
          </Button>
          <Button onClick={save} disabled={saving} className="bg-primary hover:bg-secondary">
            <CheckCircle2 className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Main content */}
        <div className="space-y-4">
          {sections.map((s) => (
            <section
              key={s.key}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </h2>
                <button
                  onClick={() => toggleSafe(s.key)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border ${
                    s.client_safe
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-muted/40 text-muted-foreground border-border"
                  }`}
                >
                  {s.client_safe ? "Client-safe" : "Admin-only"}
                </button>
              </div>
              <Textarea
                value={s.body}
                onChange={(e) => updateSection(s.key, e.target.value)}
                rows={Math.max(4, s.body.split("\n").length + 1)}
                className="bg-muted/40 border-border text-sm font-mono"
              />
            </section>
          ))}

          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
              Recommendations ({draft.recommendations.length})
            </h2>
            <ul className="space-y-2 text-sm">
              {draft.recommendations.map((r) => {
                // Derive tier conservatively from the recommendation's
                // evidence refs + draft approval status. We never promote
                // an inference to "validated".
                const refs = r.evidence_refs ?? [];
                const refSource = refs.find((s) =>
                  /quickbooks|qb|stripe|hubspot|integration|weekly_checkin|import/i.test(s),
                )
                  ? "quickbooks"
                  : refs.find((s) => /scorecard|interview|answers/i.test(s))
                  ? "interview"
                  : null;
                const tier = deriveEvidenceTier({
                  source: refSource,
                  approved_at: draft.approved_at,
                  status: draft.status,
                  evidence_refs: refs,
                  supporting_evidence: r.detail,
                  missing_evidence: refs.length === 0 ? "no evidence refs" : undefined,
                  is_admin_entered: !r.inference,
                });
                return (
                  <li key={r.id} className="border border-border rounded-md p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <strong className="text-foreground">{r.title}</strong>
                      <div className="flex items-center gap-2">
                        <EvidenceTierBadge tier={tier} />
                        <span className="text-[11px] text-muted-foreground">
                          {r.priority} · {r.inference ? "inference" : "evidenced"}
                        </span>
                      </div>
                    </div>
                    <div className="text-muted-foreground mt-1">{r.detail}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Evidence: {refs.join(", ") || "—"}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
              Risks ({draft.risks.length})
            </h2>
            <ul className="space-y-2 text-sm">
              {draft.risks.map((r) => (
                <li key={r.id} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <strong className="text-foreground">{r.title}</strong>
                    <span className="text-[11px] text-muted-foreground">
                      severity {r.severity}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1">{r.detail}</div>
                </li>
              ))}
              {draft.risks.length === 0 ? (
                <li className="text-muted-foreground text-sm">No structural risks detected.</li>
              ) : null}
            </ul>
          </section>

          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
              Missing information ({draft.missing_information.length})
            </h2>
            <ul className="space-y-2 text-sm">
              {draft.missing_information.map((m, i) => (
                <li key={i} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <strong className="text-foreground">{m.area}</strong>
                    <EvidenceTierBadge tier="missing" />
                  </div>
                  <div className="text-muted-foreground mt-1">{m.what_is_missing}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{m.why_it_matters}</div>
                </li>
              ))}
              {draft.missing_information.length === 0 ? (
                <li className="text-muted-foreground text-sm">No critical gaps detected.</li>
              ) : null}
            </ul>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {truthTest ? (
            <TruthTestPanel
              result={truthTest}
              subtitle={`v${truthTest.version} · ${draft.recommendations.length} recommendations`}
            />
          ) : null}

          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
              Status
            </h2>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ReportDraftStatus)}
              className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {status === "approved" ? (
              <p className="text-[11px] text-emerald-400 mt-2">
                Approval marks the draft client-safe and ready for promotion.
              </p>
            ) : null}
            {status === "archived" ? (
              <p className="text-[11px] text-muted-foreground mt-2">Archived drafts stay searchable but are out of the active queue.</p>
            ) : null}
          </section>

          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
              Admin notes
            </h2>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={5}
              placeholder="Internal notes for the next reviewer…"
              className="bg-muted/40 border-border text-sm"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Admin-only. Not included in client-facing copy.
            </p>
          </section>

          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Evidence snapshot
            </h2>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                Collected:{" "}
                <span className="text-foreground">
                  {evidence?.collected_at
                    ? new Date(evidence.collected_at).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div>
                Customer:{" "}
                <span className="text-foreground">{evidence?.customer_label ?? "—"}</span>
              </div>
              <div>
                Items:{" "}
                <span className="text-foreground">{evidence?.items.length ?? 0}</span>
              </div>
              {evidenceCounts.length ? (
                <ul className="mt-2 space-y-0.5">
                  {evidenceCounts.map((s) => (
                    <li key={s} className="text-[11px]">
                      • {s}
                    </li>
                  ))}
                </ul>
              ) : null}
              {evidence?.notes?.length ? (
                <div className="mt-2 pt-2 border-t border-border">
                  {evidence.notes.map((n, i) => (
                    <div key={i} className="text-[11px]">
                      • {n}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          {draft.customer_id ? (
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/customers/${draft.customer_id}`)}
              className="w-full border-border"
            >
              <FileText className="h-4 w-4" /> Open client record
            </Button>
          ) : null}

          <PriorityRoadmapPanel
            reportDraftId={draft.id}
            customerId={draft.customer_id ?? null}
            draftStatus={status}
          />
        </aside>
      </div>
    </PortalShell>
  );
}