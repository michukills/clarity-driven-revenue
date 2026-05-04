import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Sparkles, Search, ShieldCheck } from "lucide-react";
import {
  generateDeterministicDraft,
  labelForType,
  AI_DRAFTING_ENABLED,
} from "@/lib/reports/draftService";
import type { ReportDraftRow, ReportDraftType } from "@/lib/reports/types";
import {
  REPORT_TYPE_TEMPLATES,
  isBoundedFiverrTier,
  P65_REPORT_TIER_KEYS,
} from "@/lib/reports/reportTypeTemplates";
import { AlertTriangle } from "lucide-react";
import { AdminScopeBanner } from "@/components/admin/AdminScopeBanner";

interface CustomerOpt {
  id: string;
  full_name: string;
  business_name: string | null;
  is_demo_account: boolean;
}

const TYPE_OPTIONS: { value: ReportDraftType; label: string; group: "p65" | "legacy" }[] = [
  // P65 — RGS report tiers (preferred for new reports).
  { value: "full_rgs_diagnostic", label: "Full RGS Diagnostic Report", group: "p65" },
  {
    value: "fiverr_basic_diagnostic",
    label: "Fiverr Basic — Business Revenue Leak Snapshot",
    group: "p65",
  },
  {
    value: "fiverr_standard_diagnostic",
    label: "Fiverr Standard — Business Revenue & Operations Diagnostic",
    group: "p65",
  },
  {
    value: "fiverr_premium_diagnostic",
    label: "Fiverr Premium — Business Stability Diagnostic & Revenue Repair Map",
    group: "p65",
  },
  { value: "implementation_report", label: "Implementation Report / Roadmap", group: "p65" },
  // Legacy types — preserved for back-compat.
  { value: "diagnostic", label: "Business Diagnostic (legacy)", group: "legacy" },
  { value: "scorecard", label: "Stability / Scorecard (legacy)", group: "legacy" },
  { value: "rcc_summary", label: "Revenue Control Summary (legacy)", group: "legacy" },
  { value: "implementation_update", label: "Implementation Update (legacy)", group: "legacy" },
];

const ALL_TYPE_VALUES: ReportDraftType[] = TYPE_OPTIONS.map((o) => o.value);

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted/50 text-muted-foreground",
  needs_review: "bg-primary/10 text-primary",
  approved: "bg-emerald-500/15 text-emerald-300",
  archived: "bg-muted/30 text-muted-foreground line-through",
};

const CONFIDENCE_TONE: Record<string, string> = {
  high: "text-emerald-400",
  medium: "text-amber-400",
  low: "text-rose-400",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  needs_review: "Needs review",
  approved: "Approved",
  archived: "Archived",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default function AdminReportDrafts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drafts, setDrafts] = useState<ReportDraftRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [genCustomer, setGenCustomer] = useState("");
  const [genType, setGenType] = useState<ReportDraftType>("full_rgs_diagnostic");
  const [generating, setGenerating] = useState(false);
  const [genScorecardRunId, setGenScorecardRunId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [d, c] = await Promise.all([
      supabase
        .from("report_drafts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("customers")
        .select("id, full_name, business_name, is_demo_account")
        .order("full_name"),
    ]);
    if (d.data) setDrafts(d.data as unknown as ReportDraftRow[]);
    if (c.data) setCustomers(c.data as unknown as CustomerOpt[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Preselect from ?customer=...&type=... (used by entry-point buttons).
  useEffect(() => {
    const c = searchParams.get("customer");
    const t = searchParams.get("type") as ReportDraftType | null;
    const s = searchParams.get("scorecard");
    if (c) setGenCustomer(c);
    if (t && ALL_TYPE_VALUES.includes(t)) {
      setGenType(t);
    }
    if (s) {
      setGenScorecardRunId(s);
      setGenType("scorecard");
    }
  }, [searchParams]);

  const customerMap = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return drafts;
    return drafts.filter((d) => {
      const c = d.customer_id ? customerMap.get(d.customer_id) : null;
      const hay = [
        d.title,
        d.report_type,
        d.status,
        c?.full_name,
        c?.business_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [drafts, search, customerMap]);

  const generate = async () => {
    if (!genCustomer && !genScorecardRunId) {
      toast.error("Pick a client (or open from a scorecard lead) first.");
      return;
    }
    setGenerating(true);
    try {
      const created = await generateDeterministicDraft({
        customer_id: genCustomer || null,
        scorecard_run_id: genScorecardRunId,
        report_type: genType,
      });
      toast.success("Deterministic draft generated");
      navigate(`/admin/report-drafts/${created.id}`);
    } catch (e: any) {
      toast.error(e.message || "Could not generate draft");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PortalShell variant="admin">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          RGS OS · Reports.AI
        </div>
        <h1 className="mt-1 text-3xl text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Report Drafts
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Evidence-grounded first drafts built from connected sources, scorecard
          runs, RCC entries, diagnostics, and admin notes. Drafts are{" "}
          <strong className="text-foreground">never client-facing</strong> until an
          admin reviews and approves them.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-3 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          AI-assisted generation: {AI_DRAFTING_ENABLED ? "enabled (admin-only)" : "disabled — deterministic only"}.
          No paid AI runs unless an admin explicitly triggers it.
        </div>
      </div>

      <div className="mb-6">
        <AdminScopeBanner
          surface="Report Drafts"
          purpose="review evidence-grounded drafts and decide what becomes client-visible. AI-assisted drafts default to admin-only review and never publish on their own."
          outside="auto-publishing AI output, replacing deterministic scoring, leaking admin-only notes, or issuing legal, tax, accounting, HR, or regulated guidance."
        />
      </div>

      {/* Generate */}
      <section className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Generate draft (deterministic, free-safe)
        </div>
        {genScorecardRunId && (
          <div className="mb-3 text-[11px] text-primary bg-primary/5 border border-primary/20 rounded-md px-2.5 py-1.5">
            Preselected from scorecard lead · run id <code>{genScorecardRunId.slice(0, 8)}…</code>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_auto] gap-3 items-end">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Client
            </label>
            <select
              value={genCustomer}
              onChange={(e) => setGenCustomer(e.target.value)}
              className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
            >
              <option value="">— Select client —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name || c.full_name}
                  {c.is_demo_account ? " · DEMO" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Report type
            </label>
            <select
              value={genType}
              onChange={(e) => setGenType(e.target.value as ReportDraftType)}
              className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
            >
              <optgroup label="RGS report tiers (P65)">
                {TYPE_OPTIONS.filter((o) => o.group === "p65").map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Legacy types">
                {TYPE_OPTIONS.filter((o) => o.group === "legacy").map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <Button
            onClick={generate}
            disabled={generating}
            className="bg-primary hover:bg-secondary h-10"
          >
            <FileText className="h-4 w-4" />{" "}
            {generating ? "Generating…" : "Generate draft"}
          </Button>
        </div>

        {/* P65 — show the selected tier's scope summary so the admin sees
            depth, exclusions, and the bounded-Fiverr warning before
            generating. AI drafts must be admin-reviewed before publish. */}
        {(P65_REPORT_TIER_KEYS as readonly ReportDraftType[]).includes(genType) ? (
          <div className="mt-4 rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-2">
            <div className="text-foreground text-[12px]">
              {REPORT_TYPE_TEMPLATES[genType].label}
              {REPORT_TYPE_TEMPLATES[genType].publicOfferName ? (
                <span className="text-muted-foreground">
                  {" "}
                  · public offer: {REPORT_TYPE_TEMPLATES[genType].publicOfferName}
                </span>
              ) : null}
            </div>
            <div>
              Depth: {REPORT_TYPE_TEMPLATES[genType].approxPageLength}
              {" · "}
              Sections: {REPORT_TYPE_TEMPLATES[genType].sections.length}
              {REPORT_TYPE_TEMPLATES[genType].includesRgsStabilitySnapshot
                ? " · Includes RGS Stability Snapshot"
                : ""}
            </div>
            <div>{REPORT_TYPE_TEMPLATES[genType].scopeBoundary}</div>
            {isBoundedFiverrTier(genType) ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-amber-200 inline-flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-[1px]" />
                <span>
                  This Fiverr report is intentionally bounded and should not include
                  the full RGS Diagnostic unless Full RGS Diagnostic Report is selected.
                </span>
              </div>
            ) : null}
            <div className="text-[11px]">
              AI-assisted drafts (when enabled) require admin review before any
              client-visible publish. Internal notes never appear in client PDFs.
            </div>
          </div>
        ) : null}
      </section>

      <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Search
          </label>
          <div className="relative mt-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, client, type, status…"
              className="pl-9 bg-muted/40 border-border"
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground pb-2">
          {filtered.length} of {drafts.length} drafts
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading drafts…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No report drafts yet. Generate one above, or open a client record and start a draft from there.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Mode</th>
                <th className="text-left px-4 py-3">Confidence</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const c = d.customer_id ? customerMap.get(d.customer_id) : null;
                return (
                  <tr
                    key={d.id}
                    className="border-t border-border hover:bg-muted/20 cursor-pointer"
                    onClick={() => navigate(`/admin/report-drafts/${d.id}`)}
                  >
                    <td className="px-4 py-3 text-foreground max-w-[320px]">
                      <div className="truncate">{d.title || "Untitled"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Draft — requires RGS review
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c?.business_name || c?.full_name || "—"}
                      {c?.is_demo_account ? (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400">
                          demo
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {labelForType(d.report_type)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {d.generation_mode === "ai_assisted" ? "AI-assisted" : "Deterministic"}
                    </td>
                    <td className={`px-4 py-3 ${CONFIDENCE_TONE[d.confidence]}`}>
                      {CONFIDENCE_LABEL[d.confidence] ?? d.confidence}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-md ${STATUS_TONE[d.status]}`}
                      >
                        {STATUS_LABEL[d.status] ?? d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PortalShell>
  );
}