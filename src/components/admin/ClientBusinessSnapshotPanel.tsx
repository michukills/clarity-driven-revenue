// P32 — Admin-only Client Business Snapshot & Industry Verification panel.
// Source-backed only. Never fabricates. Never uses business name as evidence
// of what a business does.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, ShieldCheck, Loader2, RefreshCw, Save } from "lucide-react";
import {
  buildSnapshotDraft,
  buildPersistedSources,
  industrySupportAssessment,
  INDUSTRY_CONFIDENCE_LABELS,
  type ClientBusinessSnapshotDraft,
  type IndustryConfidence,
  type SnapshotField,
  type PersistedSnapshotSource,
} from "@/lib/clientBusinessSnapshot";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

interface Props {
  customerId: string;
}

interface SnapshotRow {
  id?: string;
  customer_id: string;
  what_business_does: string | null;
  products_services: string | null;
  customer_type: string | null;
  revenue_model: string | null;
  operating_model: string | null;
  service_area: string | null;
  industry_confidence: IndustryConfidence;
  industry_verification_notes: string | null;
  industry_verified: boolean;
  industry_verified_by: string | null;
  industry_verified_at: string | null;
  snapshot_status: "draft" | "admin_verified";
  draft_generated_at: string | null;
  snapshot_sources?: PersistedSnapshotSource[] | null;
  updated_at?: string;
}

const EMPTY_SNAPSHOT = (customerId: string): SnapshotRow => ({
  customer_id: customerId,
  what_business_does: null,
  products_services: null,
  customer_type: null,
  revenue_model: null,
  operating_model: null,
  service_area: null,
  industry_confidence: "unverified",
  industry_verification_notes: null,
  industry_verified: false,
  industry_verified_by: null,
  industry_verified_at: null,
  snapshot_status: "draft",
  draft_generated_at: null,
  snapshot_sources: [],
});

function FieldDisplay({ label, field }: { label: string; field: SnapshotField | { value: string | null; sources?: never } }) {
  const value = field.value;
  const sources = "sources" in field ? field.sources : [];
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      {value ? (
        <div className="text-sm text-foreground whitespace-pre-wrap">{value}</div>
      ) : (
        <div className="text-sm italic text-muted-foreground">Unknown — no recorded evidence yet</div>
      )}
      {sources && sources.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {Array.from(new Set(sources.map((s) => s.label))).map((s) => (
            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border">
              Source: {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientBusinessSnapshotPanel({ customerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [snapshot, setSnapshot] = useState<SnapshotRow | null>(null);
  const [draft, setDraft] = useState<ClientBusinessSnapshotDraft | null>(null);
  const [industry, setIndustry] = useState<IndustryCategory | null>(null);
  const [industryConfirmed, setIndustryConfirmed] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: c }, { data: snap }, { data: op }, { data: dia }, { data: notes }] = await Promise.all([
        supabase
          .from("customers")
          .select("business_name, business_description, service_type, monthly_revenue, goals, industry, industry_confirmed_by_admin, email")
          .eq("id", customerId)
          .maybeSingle(),
        supabase
          .from("client_business_snapshots")
          .select("*")
          .eq("customer_id", customerId)
          .maybeSingle(),
        supabase
          .from("customer_operational_profile")
          .select("biggest_constraint, accountable_owner_role, crew_or_job_capacity, monthly_revenue_usd, average_ticket_usd, team_size, admin_notes")
          .eq("customer_id", customerId)
          .maybeSingle(),
        supabase
          .from("diagnostic_intake_answers")
          .select("section_key, answer")
          .eq("customer_id", customerId),
        supabase
          .from("customer_notes")
          .select("content")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const customer = c as any;
      setIndustry(((customer?.industry as IndustryCategory) ?? null) || null);
      setIndustryConfirmed(!!customer?.industry_confirmed_by_admin);
      setBusinessName(customer?.business_name ?? null);

      // Latest scorecard run by email (best-effort; no fabrication if missing)
      let latestScorecard: any = null;
      if (customer?.email) {
        const { data: sc } = await supabase
          .from("scorecard_runs")
          .select("answers, rationale, role")
          .eq("email", customer.email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        latestScorecard = sc;
      }

      const diagnosticAnswers: Record<string, string> = {};
      (dia ?? []).forEach((row: any) => {
        if (row.section_key && typeof row.answer === "string") diagnosticAnswers[row.section_key] = row.answer;
      });

      const builtDraft = buildSnapshotDraft({
        business_name: customer?.business_name,
        business_description: customer?.business_description,
        service_type: customer?.service_type,
        monthly_revenue: customer?.monthly_revenue,
        goals: customer?.goals,
        industry: (customer?.industry as IndustryCategory) ?? null,
        industry_confirmed_by_admin: !!customer?.industry_confirmed_by_admin,
        operationalProfile: op as any,
        diagnosticAnswers,
        latestScorecard,
        adminNotes: (notes ?? []).map((n: any) => n.content).filter(Boolean),
      });
      setDraft(builtDraft);

      setSnapshot((snap as any) ?? EMPTY_SNAPSHOT(customerId));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load snapshot");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const supportAssessment = useMemo(
    () => (draft ? industrySupportAssessment(industry, industryConfirmed, draft) : { ok: false, warning: null }),
    [draft, industry, industryConfirmed],
  );

  const applyDraftToSnapshot = () => {
    if (!draft) return;
    if (snapshot?.snapshot_status === "admin_verified") {
      const ok = window.confirm(
        "This snapshot has been admin-verified. Generating a new draft from recorded data will overwrite the verified fields. Continue?",
      );
      if (!ok) return;
    }
    setGenerating(true);
    setSnapshot((prev) => ({
      ...(prev ?? EMPTY_SNAPSHOT(customerId)),
      what_business_does: draft.what_business_does.value,
      products_services: draft.products_services.value,
      customer_type: draft.customer_type.value,
      revenue_model: draft.revenue_model.value,
      operating_model: draft.operating_model.value,
      service_area: draft.service_area.value,
      snapshot_status: "draft",
      draft_generated_at: new Date().toISOString(),
      snapshot_sources: buildPersistedSources(draft),
    }));
    setGenerating(false);
  };

  const save = async (verify: boolean) => {
    if (!snapshot) return;
    if (snapshot.snapshot_status === "admin_verified") {
      const ok = window.confirm(
        "Editing an admin-verified snapshot may affect industry verification confidence. Continue saving?",
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
      // Persist source evidence: keep the most recent draft sources for any
      // field that still has a value, plus anything already saved.
      const sourcesPayload: PersistedSnapshotSource[] =
        snapshot.snapshot_sources && snapshot.snapshot_sources.length > 0
          ? snapshot.snapshot_sources
          : draft
          ? buildPersistedSources(draft)
          : [];
      const payload: any = {
        customer_id: customerId,
        what_business_does: snapshot.what_business_does,
        products_services: snapshot.products_services,
        customer_type: snapshot.customer_type,
        revenue_model: snapshot.revenue_model,
        operating_model: snapshot.operating_model,
        service_area: snapshot.service_area,
        industry_confidence: snapshot.industry_confidence,
        industry_verification_notes: snapshot.industry_verification_notes,
        snapshot_status: verify ? "admin_verified" : snapshot.snapshot_status,
        industry_verified: verify ? true : snapshot.industry_verified,
        industry_verified_by: verify ? userId : snapshot.industry_verified_by,
        industry_verified_at: verify ? new Date().toISOString() : snapshot.industry_verified_at,
        draft_generated_at: snapshot.draft_generated_at,
        snapshot_sources: sourcesPayload,
        last_updated_by: userId,
      };
      const { error } = await supabase
        .from("client_business_snapshots")
        .upsert(payload, { onConflict: "customer_id" });
      if (error) throw error;
      toast.success(verify ? "Snapshot verified" : "Snapshot saved");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save snapshot");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !draft || !snapshot) {
    return (
      <section className="rounded-lg border border-border bg-card/40 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading Client Business Snapshot…
        </div>
      </section>
    );
  }

  const isVerified = snapshot.snapshot_status === "admin_verified";

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Client Business Snapshot</h3>
          <p className="text-[11px] text-muted-foreground">
            Admin-only. Built strictly from recorded data. Business name is not used as evidence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isVerified ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
              <ShieldCheck className="h-3 w-3" /> Admin-verified snapshot
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
              <AlertTriangle className="h-3 w-3" /> Draft from recorded data — needs admin review
            </span>
          )}
        </div>
      </header>

      {supportAssessment.warning && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
          <div className="font-medium mb-0.5">Industry assignment needs verification</div>
          <div>{supportAssessment.warning}</div>
          {businessName && (
            <div className="mt-1 text-[11px] text-amber-200/80">
              Business name on file: <strong>{businessName}</strong> — name alone is not evidence of what the business does.
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <EditableField
          label="What the business does"
          value={snapshot.what_business_does}
          draftField={draft.what_business_does}
          onChange={(v) => setSnapshot({ ...snapshot, what_business_does: v })}
        />
        <EditableField
          label="Products / services offered"
          value={snapshot.products_services}
          draftField={draft.products_services}
          onChange={(v) => setSnapshot({ ...snapshot, products_services: v })}
        />
        <EditableField
          label="Customer type served"
          value={snapshot.customer_type}
          draftField={draft.customer_type}
          onChange={(v) => setSnapshot({ ...snapshot, customer_type: v })}
        />
        <EditableField
          label="Revenue model / job or order type"
          value={snapshot.revenue_model}
          draftField={draft.revenue_model}
          onChange={(v) => setSnapshot({ ...snapshot, revenue_model: v })}
        />
        <EditableField
          label="Operating model"
          value={snapshot.operating_model}
          draftField={draft.operating_model}
          onChange={(v) => setSnapshot({ ...snapshot, operating_model: v })}
        />
        <EditableField
          label="Location / service area"
          value={snapshot.service_area}
          draftField={draft.service_area}
          onChange={(v) => setSnapshot({ ...snapshot, service_area: v })}
        />
      </div>

      <div className="rounded border border-border bg-muted/20 p-3 space-y-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Industry assignment</div>
        <div className="text-sm text-foreground">
          Current: <strong>{industry ?? "Not assigned"}</strong>{" "}
          <span className="text-[11px] text-muted-foreground">
            ({industryConfirmed ? "confirmed" : "unconfirmed"})
          </span>
        </div>
        <FieldDisplay label="Evidence supporting industry" field={draft.industry_evidence} />
        {draft.missing_for_industry.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Missing to confirm industry</div>
            <ul className="list-disc list-inside text-[12px] text-amber-200/90 space-y-0.5">
              {draft.missing_for_industry.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Industry confidence</label>
          <select
            value={snapshot.industry_confidence}
            onChange={(e) =>
              setSnapshot({ ...snapshot, industry_confidence: e.target.value as IndustryConfidence })
            }
            className="mt-1 w-full bg-muted/40 border border-border rounded-md px-2 py-1.5 text-sm text-foreground"
          >
            {(["unverified", "low", "medium", "high", "verified"] as IndustryConfidence[]).map((v) => (
              <option key={v} value={v}>
                {INDUSTRY_CONFIDENCE_LABELS[v]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Verification notes (admin only)</label>
          <textarea
            value={snapshot.industry_verification_notes ?? ""}
            onChange={(e) =>
              setSnapshot({ ...snapshot, industry_verification_notes: e.target.value })
            }
            rows={2}
            placeholder="What was confirmed, by whom, on what date, citing what evidence."
            className="mt-1 w-full bg-muted/40 border border-border rounded-md px-2 py-1.5 text-sm text-foreground resize-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={applyDraftToSnapshot} disabled={generating || saving}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Generate draft from recorded data
        </Button>
        <Button size="sm" variant="secondary" onClick={() => save(false)} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
          Save draft
        </Button>
        <Button size="sm" onClick={() => save(true)} disabled={saving}>
          <ShieldCheck className="h-3 w-3 mr-1" />
          Verify snapshot
        </Button>
        {snapshot.draft_generated_at && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Last draft: {new Date(snapshot.draft_generated_at).toLocaleString()}
          </span>
        )}
      </div>

      {industry === "mmj_cannabis" && (
        <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          Regulated industry: do not reuse insights cross-industry without admin-approved generalization.
        </div>
      )}
    </section>
  );
}