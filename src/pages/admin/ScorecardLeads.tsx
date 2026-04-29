import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection } from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  ArrowLeft,
  RefreshCcw,
  Mail,
  Building2,
  CalendarDays,
  Sparkles,
  ShieldCheck,
  Loader2,
  FileText,
} from "lucide-react";
import {
  MATURITY_BANDS,
  type PillarResult,
  type ScorecardResult,
} from "@/lib/scorecard/rubric";
import { INDUSTRY_LABEL, type IndustryKey } from "@/lib/toolCatalog";

type Row = {
  id: string;
  created_at: string;
  status: string;
  ai_status: string;
  first_name: string;
  last_name: string;
  email: string;
  business_name: string;
  role: string | null;
  phone: string | null;
  source_page: string | null;
  overall_score_estimate: number | null;
  overall_score_low: number | null;
  overall_score_high: number | null;
  overall_band: number | null;
  overall_confidence: string;
  rationale: string | null;
  admin_final_score: number | null;
  admin_notes: string | null;
  industry_intake_value: string | null;
  industry_intake_other: string | null;
};

type Detail = Row & {
  answers: { pillar_id: string; question_id: string; prompt: string; answer: string }[];
  pillar_results: PillarResult[];
  rationale: string | null;
  recommended_focus: string[];
  missing_information: string[];
  top_gaps: { pillar_id: string; title: string; reason: string }[];
  rubric_version: string;
  user_agent: string | null;
};

const STATUSES = ["new", "reviewed", "converted", "archived"] as const;

const STATUS_TONE: Record<string, string> = {
  new: "border-primary/30 bg-primary/10 text-primary",
  reviewed: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  converted: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  archived: "border-border bg-muted/40 text-muted-foreground",
};

const INTAKE_MODEL_LABEL: Record<string, string> = {
  appointments_jobs: "Appointments / jobs",
  in_store_orders: "In-store retail orders",
  restaurant_orders: "Restaurant / food service orders",
  regulated_retail_mmj: "Regulated retail (MMJ / cannabis)",
  general_services: "General services",
  online_only: "Online-only",
  other_unsure: "Other / not sure",
};

function supportedIndustry(value: string | null | undefined): IndustryKey | null {
  if (
    value === "trade_field_service" ||
    value === "retail" ||
    value === "restaurant" ||
    value === "mmj_cannabis" ||
    value === "general_service" ||
    value === "other"
  ) {
    return value;
  }
  return null;
}

function industryIntakeLabel(r: Pick<Row, "industry_intake_value" | "industry_intake_other">): string {
  const industry = supportedIndustry(r.industry_intake_value);
  const mapped = industry ? INDUSTRY_LABEL[industry] : "Needs review";
  const raw = r.industry_intake_other ? INTAKE_MODEL_LABEL[r.industry_intake_other] ?? r.industry_intake_other : null;
  return raw ? `${mapped} · ${raw}` : mapped;
}

export default function AdminScorecardLeads() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const detailId = params.get("id");

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scorecard_runs")
      .select(
        "id, created_at, status, ai_status, first_name, last_name, email, business_name, role, phone, source_page, overall_score_estimate, overall_score_low, overall_score_high, overall_band, overall_confidence, rationale, admin_final_score, admin_notes, industry_intake_value, industry_intake_other",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error(error);
      toast.error("Couldn't load scorecard leads");
    }
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.business_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  if (detailId) {
    return (
      <DetailView
        id={detailId}
        onBack={() => setParams({})}
        onChanged={load}
      />
    );
  }

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="Scorecard System"
        title="AI Scorecard Leads"
        description="Public scorecard submissions. Each row is a deterministic preliminary estimate generated from the lead's plain-language answers. AI scoring is admin-triggered and defaults to not_run."
      >
        <DomainSection
          title="All submissions"
          subtitle={loading ? "Loading…" : `${filtered.length} of ${rows.length}`}
        >
          {/* controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by business, email, or name…"
                className="w-full pl-9 pr-3 h-9 rounded-md bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/40"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md bg-muted/40 border border-border text-sm text-foreground"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {/* list */}
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
              No scorecard submissions yet.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px_120px_120px_140px] gap-3 px-4 py-2 bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <div>Business / lead</div>
                <div>Contact</div>
                <div>Score</div>
                <div>Band</div>
                <div>Status</div>
                <div>Submitted</div>
              </div>
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setParams({ id: r.id })}
                  className="w-full text-left grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px_120px_120px_140px] gap-3 px-4 py-3 border-t border-border hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-foreground font-medium truncate">
                      {r.business_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {r.first_name} {r.last_name}
                      {r.role ? ` · ${r.role}` : ""}
                    </div>
                    <div className="text-[10px] text-amber-200/80 truncate mt-0.5">
                      Intake industry: {industryIntakeLabel(r)}
                    </div>
                  </div>
                  <div className="min-w-0 text-xs text-muted-foreground space-y-0.5">
                    <div className="truncate">{r.email}</div>
                    {r.phone && <div className="truncate">{r.phone}</div>}
                  </div>
                  <div className="text-sm tabular-nums text-foreground">
                    {r.admin_final_score ?? r.overall_score_estimate ?? "—"}
                    <span className="text-[10px] text-muted-foreground"> /1k</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.overall_band ? `Band ${r.overall_band}` : "—"}
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                        STATUS_TONE[r.status] ?? STATUS_TONE.new
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}

/* -------- Detail view -------- */

function DetailView({
  id,
  onBack,
  onChanged,
}: {
  id: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const [row, setRow] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [adminFinalScore, setAdminFinalScore] = useState<string>("");
  const [status, setStatus] = useState<string>("new");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scorecard_runs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error(error);
      toast.error("Couldn't load submission");
      setLoading(false);
      return;
    }
    const d = data as any as Detail;
    setRow(d);
    setAdminNotes(d?.admin_notes ?? "");
    setAdminFinalScore(d?.admin_final_score?.toString() ?? "");
    setStatus(d?.status ?? "new");
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async () => {
    setSaving(true);
    const finalScoreNum = adminFinalScore.trim() === "" ? null : Number(adminFinalScore);
    const { error } = await supabase
      .from("scorecard_runs")
      .update({
        admin_notes: adminNotes.trim() || null,
        admin_final_score:
          finalScoreNum != null && Number.isFinite(finalScoreNum)
            ? Math.max(0, Math.min(1000, Math.round(finalScoreNum)))
            : null,
        status,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Couldn't save changes");
      return;
    }
    toast.success("Saved");
    onChanged();
    load();
  };

  const createOrUpdateCustomer = async () => {
    if (!row) return;
    setSaving(true);
    try {
      const intakeIndustry = supportedIndustry(row.industry_intake_value);
      const canAssignIndustry = intakeIndustry && intakeIndustry !== "other";
      const regulatedOrUnclear =
        intakeIndustry === "mmj_cannabis" ||
        !canAssignIndustry ||
        row.industry_intake_other === "online_only" ||
        row.industry_intake_other === "other_unsure";
      const reviewNote = `Scorecard intake: ${industryIntakeLabel(row)}. Intake is not admin confirmation; verify from recorded evidence before tools unlock.`;

      const { data: existing, error: existingErr } = await supabase
        .from("customers")
        .select("id, industry, industry_confirmed_by_admin, needs_industry_review, industry_review_notes")
        .eq("email", row.email)
        .limit(1)
        .maybeSingle();
      if (existingErr) throw existingErr;

      let customerId: string | null = null;
      if (existing) {
        customerId = (existing as any).id;
        const currentIndustry = (existing as any).industry as string | null;
        const alreadyConfirmed = !!(existing as any).industry_confirmed_by_admin;
        const incomingConflicts =
          canAssignIndustry &&
          currentIndustry &&
          currentIndustry !== intakeIndustry &&
          currentIndustry !== "other";
        const update: any = {
          industry_intake_source: "public_scorecard",
          industry_intake_value: row.industry_intake_value,
          industry_review_notes:
            (existing as any).industry_review_notes || (incomingConflicts ? `Possible mismatch. ${reviewNote}` : reviewNote),
        };

        if (incomingConflicts) {
          update.needs_industry_review = true;
        }

        if (!alreadyConfirmed) {
          if (!currentIndustry || currentIndustry === "other") {
            update.industry = canAssignIndustry ? intakeIndustry : null;
          }
          update.needs_industry_review =
            regulatedOrUnclear || incomingConflicts || !(update.industry || currentIndustry);
        }

        const { error } = await supabase.from("customers").update(update).eq("id", customerId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("customers")
          .insert([
            {
              full_name: `${row.first_name} ${row.last_name}`.trim(),
              email: row.email,
              phone: row.phone,
              business_name: row.business_name,
              service_type: row.role,
              stage: "lead",
              lifecycle_state: "lead",
              industry: canAssignIndustry ? intakeIndustry : null,
              industry_confirmed_by_admin: false,
              needs_industry_review: regulatedOrUnclear,
              industry_intake_source: "public_scorecard",
              industry_intake_value: row.industry_intake_value,
              industry_review_notes: reviewNote,
            } as any,
          ])
          .select("id")
          .single();
        if (error) throw error;
        customerId = (inserted as any).id;
      }

      await supabase.from("scorecard_runs").update({ status: "converted" }).eq("id", row.id);
      toast.success(existing ? "Customer updated for industry review" : "Customer created for industry review");
      onChanged();
      if (customerId) navigate(`/admin/customers/${customerId}#industry-assignment`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create or update customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="Scorecard System"
        title={row?.business_name ?? "Scorecard submission"}
        description="Deterministic preliminary estimate. AI scoring has not been run on this submission."
      >
        <div className="mb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to leads
          </button>
        </div>

        {row && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Link
              to={`/admin/report-drafts?scorecard=${row.id}&type=scorecard`}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-secondary border border-primary/30 rounded-md px-2.5 py-1.5"
              title="Open Report Drafts with this scorecard preselected — deterministic, free-safe. No paid AI."
            >
              <FileText className="h-3.5 w-3.5" /> Generate Draft Report
            </Link>
            <button
              type="button"
              onClick={createOrUpdateCustomer}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-xs text-amber-200 hover:text-foreground border border-amber-500/40 rounded-md px-2.5 py-1.5 disabled:opacity-50"
              title="Create or update a customer record, carrying the intake industry into admin review without confirming it."
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Create/update customer for industry review
            </button>
          </div>
        )}

        {loading || !row ? (
          <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <DomainSection title="Lead info">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <Info label="Name" value={`${row.first_name} ${row.last_name}`} />
                <Info icon={<Mail className="h-3 w-3" />} label="Email" value={row.email} />
                <Info icon={<Building2 className="h-3 w-3" />} label="Business" value={row.business_name} />
                <Info label="Role" value={row.role ?? "—"} />
                <Info label="Phone" value={row.phone ?? "—"} />
                <Info
                  icon={<ShieldCheck className="h-3 w-3" />}
                  label="Industry intake"
                  value={industryIntakeLabel(row)}
                  hint="Owner-selected intake signal only. Creating/updating a customer carries this into admin review, never into confirmed industry."
                />
                <Info icon={<CalendarDays className="h-3 w-3" />} label="Submitted" value={new Date(row.created_at).toLocaleString()} />
                <Info label="Source page" value={row.source_page ?? "—"} />
                <Info
                  icon={<Sparkles className="h-3 w-3" />}
                  label="AI status"
                  value={row.ai_status}
                  hint="Defaults to not_run. Public scorecard never triggers paid AI."
                />
                <Info icon={<ShieldCheck className="h-3 w-3" />} label="Rubric" value={row.rubric_version} />
              </div>
            </DomainSection>

            <DomainSection
              title="Deterministic preliminary estimate"
              subtitle="Generated locally from the rubric — no AI cost."
            >
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-start">
                  <div className="md:border-r md:border-border/30 md:pr-5">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Estimated overall
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <div className="font-display text-4xl tabular-nums text-foreground leading-none">
                        {row.overall_score_estimate ?? "—"}
                      </div>
                      <div className="text-sm text-muted-foreground">/ 1,000</div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                      Range {row.overall_score_low}–{row.overall_score_high}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Confidence: {row.overall_confidence}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                      Maturity band
                    </div>
                    <div className="text-base font-medium text-foreground">
                      Band {row.overall_band} · {row.overall_band ? MATURITY_BANDS[row.overall_band - 1].label : ""}
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed mt-2">
                      {row.rationale ?? "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {row.pillar_results.map((p) => (
                  <div key={p.pillar_id} className="rounded-lg border border-border bg-card/60 p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-display text-sm text-foreground leading-snug">
                        {p.title}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Band {p.band}
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-2">{p.band_label}</div>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <div className="font-display text-xl tabular-nums text-foreground">{p.score}</div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        ({p.score_low}–{p.score_high}) · conf {p.confidence}
                      </div>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{p.rationale}</p>
                  </div>
                ))}
              </div>
            </DomainSection>

            <DomainSection title="Raw conversational answers">
              <div className="space-y-3">
                {row.answers.map((a) => (
                  <div key={a.question_id} className="rounded-lg border border-border bg-card/60 p-4">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                      {a.pillar_id} · {a.question_id}
                    </div>
                    <div className="text-sm font-medium text-foreground mb-2 leading-snug">
                      {a.prompt}
                    </div>
                    <div className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">
                      {a.answer || <span className="italic text-muted-foreground/70">(no answer)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </DomainSection>

            <DomainSection title="Likely priority areas" subtitle="From deterministic rubric.">
              <div className="space-y-2">
                {row.top_gaps.map((g, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card/60 p-3">
                    <div className="text-sm text-foreground font-medium">{g.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{g.reason}</p>
                  </div>
                ))}
              </div>
            </DomainSection>

            <DomainSection title="Recommended diagnostic focus">
              <ul className="space-y-2 list-disc pl-5 text-sm text-foreground/85">
                {row.recommended_focus.map((f, i) => (
                  <li key={i} className="leading-relaxed">{f}</li>
                ))}
              </ul>
            </DomainSection>

            {row.missing_information.length > 0 && (
              <DomainSection title="Missing information / clarifications needed">
                <ul className="space-y-1.5 list-disc pl-5 text-sm text-foreground/80">
                  {row.missing_information.map((m, i) => (
                    <li key={i} className="leading-relaxed">{m}</li>
                  ))}
                </ul>
              </DomainSection>
            )}

            <DomainSection title="Admin review" subtitle="Override score, add notes, and update status.">
              <div className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                      Admin-finalized score (0–1000)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={adminFinalScore}
                      onChange={(e) => setAdminFinalScore(e.target.value)}
                      placeholder="Leave blank to keep deterministic estimate"
                      className="w-full h-10 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                    Admin notes
                  </label>
                  <textarea
                    rows={4}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/50"
                    placeholder="Internal notes — not shown to the lead."
                  />
                </div>
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save changes
                </button>
              </div>
            </DomainSection>
          </>
        )}
      </DomainShell>
    </PortalShell>
  );
}

function Info({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground inline-flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className="mt-1 text-sm text-foreground break-words">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground/70 mt-1 leading-relaxed">{hint}</div>}
    </div>
  );
}
