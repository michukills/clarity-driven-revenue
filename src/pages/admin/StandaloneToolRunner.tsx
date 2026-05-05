import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Wrench,
  PlayCircle,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  STANDALONE_GIG_TIERS,
  createStandaloneGigDeliverable,
  listStandaloneTools,
  type StandaloneGigTier,
  type StandaloneToolEntry,
} from "@/lib/standaloneToolRunner";

/**
 * P77 — Owner Admin Command Center: Standalone Tool Runner +
 * Gig Deliverable Report Generator. Admin-only. Reuses the P76
 * reportable tool registry and tool-specific report framework, never
 * duplicates the report writer.
 */

type CustomerOption = {
  id: string;
  business_name: string | null;
  full_name: string | null;
  email: string | null;
};

const eligibilityLabel: Record<StandaloneToolEntry["eligibility"], string> = {
  eligible_built: "Ready to run",
  eligible_needs_data: "Needs client data",
  admin_only: "Admin only",
  client_internal_only: "Client internal only",
  not_reportable_yet: "Not reportable yet",
  planned: "Planned",
};

export default function StandaloneToolRunnerPage() {
  const navigate = useNavigate();
  const tools = useMemo(() => listStandaloneTools(), []);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [toolKey, setToolKey] = useState("");
  const [tier, setTier] = useState<StandaloneGigTier>(
    "fiverr_standard",
  );
  const [title, setTitle] = useState("");
  const [observations, setObservations] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [cannabis, setCannabis] = useState(false);
  const [aiAssisted, setAiAssisted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, business_name, full_name, email")
        .order("last_activity_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      setCustomers((data ?? []) as CustomerOption[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTool = tools.find((t) => t.toolKey === toolKey) ?? null;

  const generate = async () => {
    if (!customerId || !selectedTool) {
      toast.error("Select a customer and an eligible standalone tool first.");
      return;
    }
    if (!selectedTool.canRun) {
      toast.error(
        `${selectedTool.toolName} is currently ${eligibilityLabel[selectedTool.eligibility]}.`,
      );
      return;
    }
    if (observations.trim().length < 20) {
      toast.error(
        "Add at least a short observation summary (20+ characters) before generating.",
      );
      return;
    }
    setBusy(true);
    try {
      const draft = await createStandaloneGigDeliverable({
        customerId,
        toolKey: selectedTool.toolKey,
        tier,
        title: title.trim() || `${selectedTool.toolName} — Standalone Deliverable`,
        observations,
        nextReviewSteps: nextSteps,
        cannabisOperationalContext: cannabis,
        aiAssisted,
      });
      toast.success(
        "Standalone gig deliverable created as a draft. Mark sections " +
          "client-safe in the report editor before publishing.",
      );
      navigate(`/admin/report-drafts/${draft.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create standalone gig deliverable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl">
        <header className="mb-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" />
            Owner Command Center
          </div>
          <h1 className="text-2xl font-light tracking-tight mt-2">
            Standalone Tool Runner & Gig Deliverable Report
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Run an eligible RGS tool as a standalone service or gig
            deliverable for a single customer. The deliverable is created as
            a real <code>tool_specific</code> report draft using the existing
            tool-specific report framework. Admin-only — never exposed to
            clients without explicit approval and the client-visible toggle.
          </p>
        </header>

        <section
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          data-testid="standalone-tool-runner"
        >
          {/* Eligible tools */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
              Eligible Standalone Tools
            </h2>
            <div className="grid gap-2 max-h-[28rem] overflow-y-auto pr-1">
              {tools.map((t) => {
                const active = t.toolKey === toolKey;
                return (
                  <button
                    key={t.toolKey}
                    type="button"
                    onClick={() => t.canRun && setToolKey(t.toolKey)}
                    disabled={!t.canRun}
                    data-testid={`standalone-tool-${t.toolKey}`}
                    data-eligibility={t.eligibility}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : t.canRun
                          ? "border-border bg-card hover:border-primary/60"
                          : "border-border/60 bg-muted/30 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-foreground font-medium truncate">
                          {t.toolName}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          {t.gigUseCase}
                        </p>
                      </div>
                      {t.canRun ? (
                        <PlayCircle className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-normal capitalize">
                        {t.serviceLane.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {eligibilityLabel[t.eligibility]}
                      </Badge>
                      {!t.clientFacingEligible && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          admin-only by default
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generator */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
                Generate Gig Deliverable
              </h2>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-md">
                Standalone deliverables are bounded to one tool. They are not
                a Full RGS Diagnostic, Implementation Report, legal opinion,
                tax/accounting review, compliance certification, valuation,
                fiduciary recommendation, or guarantee of business results.
              </p>
            </div>

            <label className="block text-xs">
              <span className="text-muted-foreground">Customer</span>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                data-testid="standalone-customer-select"
                className="mt-1 w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
              >
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business_name || c.full_name || c.email || c.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs">
              <span className="text-muted-foreground">Selected tool</span>
              <div className="mt-1 text-sm text-foreground">
                {selectedTool ? selectedTool.toolName : "—"}
              </div>
            </label>

            <label className="block text-xs">
              <span className="text-muted-foreground">
                Report tier / depth
              </span>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as StandaloneGigTier)}
                data-testid="standalone-tier-select"
                className="mt-1 w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
              >
                {STANDALONE_GIG_TIERS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {STANDALONE_GIG_TIERS.find((t) => t.key === tier)?.description}
              </p>
            </label>

            <label className="block text-xs">
              <span className="text-muted-foreground">Title</span>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cost of Friction snapshot — Q2"
                className="mt-1"
              />
            </label>

            <label className="block text-xs">
              <span className="text-muted-foreground">
                Observations (admin-authored, evidence-aware)
              </span>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={5}
                placeholder="Plain-English observations from the tool output. Do not include legal, tax, accounting, HR, OSHA, fiduciary, or valuation claims."
                className="mt-1"
                data-testid="standalone-observations"
              />
            </label>

            <label className="block text-xs">
              <span className="text-muted-foreground">
                Suggested next review steps (optional)
              </span>
              <Textarea
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                rows={3}
                placeholder="e.g. Owner reviews supplier pricing with their accountant before signing."
                className="mt-1"
              />
            </label>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cannabis}
                  onChange={(e) => setCannabis(e.target.checked)}
                />
                Cannabis / MMJ operational-readiness framing
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aiAssisted}
                  onChange={(e) => setAiAssisted(e.target.checked)}
                />
                <Sparkles className="h-3 w-3" />
                AI-assisted draft (records brain key + adds disclosure)
              </label>
            </div>

            <div className="border border-border/60 rounded-md p-3 bg-muted/20 text-[11px] text-muted-foreground flex gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p>
                Created drafts are admin-only with every section marked
                admin-reviewed. Use the existing report draft editor and
                Stored Tool Reports panel to mark sections client-safe,
                generate the PDF, and toggle client-visible.
              </p>
            </div>

            <Button
              onClick={generate}
              disabled={busy || !customerId || !selectedTool?.canRun}
              className="w-full bg-primary hover:bg-secondary"
              data-testid="standalone-generate-button"
            >
              {busy ? "Creating draft…" : "Create standalone deliverable draft"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </section>
      </div>
    </PortalShell>
  );
}