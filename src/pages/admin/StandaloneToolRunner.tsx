import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
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
  ExternalLink,
  UserPlus,
} from "lucide-react";
import {
  STANDALONE_GIG_TIERS,
  createStandaloneGigDeliverable,
  getStandalonePackageForTier,
  getStandalonePackageLadder,
  listStandaloneTools,
  type StandaloneGigTier,
  type StandaloneToolEntry,
} from "@/lib/standaloneToolRunner";
import { resolveStandaloneToolRoute } from "@/lib/standaloneToolRoutes";
import { listStandalonePricingForTool } from "@/config/rgsPricingTiers";

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
type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
type CustomerIndustry = CustomerInsert["industry"];

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

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
  const [search, setSearch] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    full_name: "",
    email: "",
    business_name: "",
    industry: "",
  });
  const [creatingCustomer, setCreatingCustomer] = useState(false);

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
  const selectedPricing = selectedTool
    ? listStandalonePricingForTool(selectedTool.toolKey)
    : [];
  const selectedPackageLadder = selectedTool
    ? getStandalonePackageLadder(selectedTool.toolKey)
    : null;
  const selectedPackage = selectedTool
    ? getStandalonePackageForTier(selectedTool.toolKey, tier)
    : null;

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.business_name, c.full_name, c.email]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [customers, search]);

  const createCustomer = async () => {
    if (!newCustomer.full_name.trim() || !newCustomer.email.trim()) {
      toast.error("Contact name and email are required.");
      return;
    }
    setCreatingCustomer(true);
    try {
      const industry = newCustomer.industry.trim()
        ? (newCustomer.industry.trim() as CustomerIndustry)
        : null;
      const payload: CustomerInsert = {
        full_name: newCustomer.full_name.trim(),
        email: newCustomer.email.trim().toLowerCase(),
        business_name: newCustomer.business_name.trim() || null,
        service_type: "Standalone Deliverable",
        stage: "lead" as const,
        industry,
        needs_industry_review: true,
        industry_confirmed_by_admin: false,
        industry_intake_source: "admin_standalone_runner",
        industry_intake_value: newCustomer.industry.trim() || null,
        industry_review_notes:
          "Created from Standalone Tool Runner for a bounded standalone " +
          "deliverable. Does not grant Diagnostic, Implementation, or " +
          "RGS Control System access.",
      };
      const { data, error } = await supabase
        .from("customers")
        .insert([payload])
        .select("id, business_name, full_name, email")
        .single();
      if (error) throw error;
      const row = data as CustomerOption;
      setCustomers((prev) => [row, ...prev]);
      setCustomerId(row.id);
      setShowNewCustomer(false);
      setNewCustomer({ full_name: "", email: "", business_name: "", industry: "" });
      toast.success("Standalone customer created and selected.");
    } catch (e: unknown) {
      toast.error(errorMessage(e, "Could not create customer"));
    } finally {
      setCreatingCustomer(false);
    }
  };

  const openTool = (t: StandaloneToolEntry) => {
    const r = resolveStandaloneToolRoute(t.toolKey, customerId || null);
    if (r.kind === "unavailable") {
      toast.error(r.reason);
      return;
    }
    navigate(r.href);
  };

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
    } catch (e: unknown) {
      toast.error(errorMessage(e, "Could not create standalone gig deliverable"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-6xl mx-auto w-full min-w-0">
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
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-start"
          data-testid="standalone-tool-runner"
        >
          {/* Eligible tools */}
          <div className="bg-card border border-border rounded-xl p-5 min-w-0 lg:sticky lg:top-4 lg:self-start">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
                Eligible Standalone Tools
              </h2>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {tools.length} total
              </span>
            </div>
            <div
              className="grid gap-2 overflow-y-auto pr-1 sm:max-h-[32rem] lg:max-h-[calc(100vh-16rem)]"
            >
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
                    className={`text-left rounded-lg border p-3 transition-colors flex flex-col min-w-0 ${
                      active
                        ? "border-primary bg-primary/10"
                        : t.canRun
                          ? "border-border bg-card hover:border-primary/60"
                          : "border-border/60 bg-muted/30 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground font-medium leading-snug break-words">
                          {t.toolName}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-3">
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
                      <Badge variant="outline" className="text-[10px] font-normal capitalize whitespace-nowrap">
                        {t.serviceLane.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-normal whitespace-nowrap">
                        {eligibilityLabel[t.eligibility]}
                      </Badge>
                      {!t.clientFacingEligible && (
                        <Badge variant="outline" className="text-[10px] font-normal whitespace-nowrap">
                          admin-only by default
                        </Badge>
                      )}
                    </div>
                    {t.canRun && (
                      <div className="mt-auto pt-3 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setToolKey(t.toolKey);
                            openTool(t);
                          }}
                          data-testid={`standalone-open-${t.toolKey}`}
                          className="h-7 text-[11px]"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open tool
                        </Button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generator */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 min-w-0">
            <div>
              <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
                Generate Gig Deliverable
              </h2>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-md">
                Standalone deliverables are bounded to one tool. They are not
                a Full RGS Business Stability Diagnostic Report, Implementation Report, legal opinion,
                tax/accounting review, compliance certification, valuation,
                fiduciary recommendation, or guarantee of business results.
              </p>
            </div>

            <label className="block text-xs">
              <span className="text-muted-foreground">Customer</span>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers by name, business, or email…"
                className="mt-1 mb-2"
                data-testid="standalone-customer-search"
              />
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                data-testid="standalone-customer-select"
                className="mt-1 w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
              >
                <option value="">Select a customer…</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.business_name || c.full_name || c.email || c.id}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomer((v) => !v)}
                  className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline"
                  data-testid="standalone-new-customer-toggle"
                >
                  <UserPlus className="h-3 w-3" />
                  {showNewCustomer ? "Cancel new customer" : "Create new standalone customer"}
                </button>
                {customerId && selectedTool?.canRun && (
                  <button
                    type="button"
                    onClick={() => openTool(selectedTool)}
                    className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline"
                    data-testid="standalone-open-selected"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open selected tool for this customer
                  </button>
                )}
              </div>
              {showNewCustomer && (
                <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/20 p-3">
                  <Input
                    value={newCustomer.full_name}
                    onChange={(e) =>
                      setNewCustomer((p) => ({ ...p, full_name: e.target.value }))
                    }
                    placeholder="Contact name *"
                    data-testid="standalone-new-customer-name"
                  />
                  <Input
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="Email *"
                    type="email"
                    data-testid="standalone-new-customer-email"
                  />
                  <Input
                    value={newCustomer.business_name}
                    onChange={(e) =>
                      setNewCustomer((p) => ({ ...p, business_name: e.target.value }))
                    }
                    placeholder="Business name"
                  />
                  <Input
                    value={newCustomer.industry}
                    onChange={(e) =>
                      setNewCustomer((p) => ({ ...p, industry: e.target.value }))
                    }
                    placeholder="Industry (optional, marked for review)"
                  />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Standalone customers do not automatically receive Diagnostic,
                    Implementation, or RGS Control System access. You can promote
                    them to a full client later from the Customers page.
                  </p>
                  <Button
                    type="button"
                    onClick={createCustomer}
                    disabled={creatingCustomer}
                    className="w-full"
                    size="sm"
                    data-testid="standalone-new-customer-save"
                  >
                    {creatingCustomer ? "Creating…" : "Create standalone customer"}
                  </Button>
                </div>
              )}
            </label>

            <label className="block text-xs">
              <span className="text-muted-foreground">Selected tool</span>
              <div className="mt-1 text-sm text-foreground">
                {selectedTool ? selectedTool.toolName : "—"}
              </div>
            </label>

            {selectedPricing.length > 0 && (
              <div
                className="rounded-md border border-border bg-muted/20 p-3"
                data-testid="standalone-pricing-guidance"
              >
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  Standalone pricing guidance
                </div>
                <div className="space-y-2">
                  {selectedPricing.map((item) => (
                    <div key={item.key} className="rounded border border-border/60 bg-background/40 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-foreground">{item.title}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {item.price.display}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        {item.scope_boundary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedPackageLadder && (
              <div
                className="rounded-md border border-border bg-muted/20 p-3"
                data-testid="standalone-package-ladder"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Approved package ladder
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {selectedPackageLadder.recommendedGigUseCase}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {selectedPackageLadder.readinessScore}/100
                  </Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {(["basic", "standard", "premium"] as const).map((level) => {
                    const p = selectedPackageLadder.packages[level];
                    const active = selectedPackage?.reportName === p.reportName;
                    return (
                      <div
                        key={p.reportName}
                        className={`rounded border p-2 ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border/60 bg-background/40"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-foreground">
                            {p.packageName}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {p.reportName}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          {p.purpose}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                {selectedPackage
                  ? `${selectedPackage.packageName} creates the ${selectedPackage.reportName}. ${selectedPackage.purpose}`
                  : STANDALONE_GIG_TIERS.find((t) => t.key === tier)?.description}
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
                Created drafts are admin-only and every section starts
                client-hidden. Use the existing report draft editor and
                Stored Tool Reports panel to mark reviewed sections client-safe,
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
