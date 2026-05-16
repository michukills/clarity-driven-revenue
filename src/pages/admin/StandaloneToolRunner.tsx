import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import {
  listEligibleCustomers,
  eligibleSelectorEmptyState,
  type EligibleCustomerOption,
} from "@/lib/admin/eligibleCustomerSelector";
import { WorkflowEmptyState } from "@/components/admin/WorkflowEmptyState";
import { useGigCustomerScope } from "@/lib/gig/useGigCustomerScope";
import { GigAccountBadge, GigTierBadge } from "@/components/admin/gig/GigTierBadge";
import { GIG_DENIAL_REASONS } from "@/lib/gig/gigTier";

/**
 * P77 — Owner Admin Command Center: Standalone Tool Runner +
 * Gig Deliverable Report Generator. Admin-only. Reuses the P76
 * reportable tool registry and tool-specific report framework, never
 * duplicates the report writer.
 */

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
  const [searchParams, setSearchParams] = useSearchParams();
  const tools = useMemo(() => listStandaloneTools(), []);
  const [customers, setCustomers] = useState<EligibleCustomerOption[]>([]);
  const [includeDemo, setIncludeDemo] = useState(false);
  const [customerId, setCustomerIdState] = useState(() => searchParams.get("customerId") ?? "");
  const [toolKey, setToolKeyState] = useState(() => searchParams.get("toolKey") ?? "");
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
    scope: "",
    is_demo_account: false,
  });
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const syncRunnerParams = (next: { customerId?: string; toolKey?: string }) => {
    const params = new URLSearchParams(searchParams);
    const nextCustomerId = next.customerId ?? customerId;
    const nextToolKey = next.toolKey ?? toolKey;
    if (nextCustomerId) params.set("customerId", nextCustomerId);
    else params.delete("customerId");
    if (nextToolKey) params.set("toolKey", nextToolKey);
    else params.delete("toolKey");
    setSearchParams(params, { replace: true });
  };

  const setCustomerId = (nextCustomerId: string) => {
    setCustomerIdState(nextCustomerId);
    syncRunnerParams({ customerId: nextCustomerId });
  };

  const setToolKey = (nextToolKey: string) => {
    setToolKeyState(nextToolKey);
    syncRunnerParams({ toolKey: nextToolKey });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await listEligibleCustomers({
        runMode: "any_eligible",
        includeDemo,
        limit: 200,
      });
      if (cancelled) return;
      setCustomers(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [includeDemo]);

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
      [c.primaryLabel, c.secondaryLabel]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [customers, search]);

  const createCustomer = async () => {
    const businessName = newCustomer.business_name.trim();
    const contactName = newCustomer.full_name.trim();
    const email = newCustomer.email.trim().toLowerCase();
    if (!businessName && !contactName) {
      toast.error("Enter a business/customer name or contact name.");
      return;
    }
    setCreatingCustomer(true);
    try {
      const industry = newCustomer.industry.trim()
        ? (newCustomer.industry.trim() as CustomerIndustry)
        : null;
      const payload: CustomerInsert = {
        full_name: contactName || businessName,
        email: email || `standalone-${Date.now()}@standalone.rgs.local`,
        business_name: businessName || null,
        account_kind: newCustomer.is_demo_account ? "demo" : "client",
        account_kind_notes:
          "Standalone/gig customer context only. Does not grant full Diagnostic, Implementation, or RGS Control System access.",
        service_type: selectedTool
          ? `gig: standalone deliverable — ${selectedTool.toolName}`
          : "gig: standalone deliverable",
        stage: "lead" as const,
        lifecycle_state: "standalone_tool_draft",
        is_demo_account: newCustomer.is_demo_account,
        package_diagnostic: false,
        package_implementation: false,
        package_full_bundle: false,
        package_revenue_tracker: false,
        package_addons: false,
        package_ongoing_support: false,
        portal_unlocked: false,
        diagnostic_status: "not_started",
        implementation_status: "not_started",
        monitoring_status: "not_started",
        industry,
        needs_industry_review: true,
        industry_confirmed_by_admin: false,
        industry_intake_source: "admin_standalone_runner",
        industry_intake_value: newCustomer.industry.trim() || null,
        industry_review_notes:
          [
            "Created from Standalone Tool Runner for a bounded standalone/gig deliverable.",
            selectedTool
              ? `Assigned/purchased standalone tool: ${selectedTool.toolName} (${selectedTool.toolKey}).`
              : null,
            newCustomer.scope.trim() ? `Scope summary: ${newCustomer.scope.trim()}` : null,
            "Does not grant Diagnostic, Implementation, or RGS Control System access.",
          ]
            .filter(Boolean)
            .join(" "),
      };
      const { data, error } = await supabase
        .from("customers")
        .insert([payload])
        .select(
          "id, full_name, business_name, email, account_kind, account_kind_notes, " +
            "is_demo_account, service_type, status, lifecycle_state, " +
            "archived_at, last_activity_at, diagnostic_status, payment_status, " +
            "implementation_status, monitoring_status, portal_unlocked, " +
            "package_diagnostic, package_implementation, package_full_bundle, " +
            "package_revenue_tracker, package_addons, package_ongoing_support",
        )
        .single();
      if (error) throw error;
      const { classifyCustomerForSelector } = await import(
        "@/lib/admin/eligibleCustomerSelector"
      );
      const option = classifyCustomerForSelector(data as Record<string, any>);
      setCustomers((prev) => [option, ...prev]);
      setCustomerId(option.id);
      setShowNewCustomer(false);
      setNewCustomer({
        full_name: "",
        email: "",
        business_name: "",
        industry: "",
        scope: "",
        is_demo_account: false,
      });
      toast.success(
        "Standalone/gig customer created, selected, and ready for tool selection.",
      );
    } catch (e: unknown) {
      toast.error(errorMessage(e, "Could not create customer"));
    } finally {
      setCreatingCustomer(false);
    }
  };

  const openTool = (t: StandaloneToolEntry) => {
    if (!customerId) {
      toast.error(
        "Choose or create a standalone/gig customer before running a tool.",
      );
      return;
    }
    const r = resolveStandaloneToolRoute(t.toolKey, customerId);
    if (r.kind === "unavailable") {
      toast.error(r.reason);
      return;
    }
    const href =
      r.kind === "admin"
        ? `${r.href}?customerId=${encodeURIComponent(customerId)}&toolKey=${encodeURIComponent(t.toolKey)}`
        : r.href;
    navigate(href);
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

        <div
          className="mb-6 rounded-xl border border-border bg-card p-4"
          data-testid="standalone-runner-status"
        >
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Purpose
              </div>
              <div className="text-sm text-foreground mt-1">
                Standalone/Gig Tool Runner
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Customer/project
              </div>
              <div className="text-sm text-foreground mt-1">
                {customers.find((c) => c.id === customerId)?.primaryLabel ??
                  "none selected"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Selected tool
              </div>
              <div className="text-sm text-foreground mt-1">
                {selectedTool?.toolName ?? "none selected"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Next action
              </div>
              <div className="text-sm text-foreground mt-1">
                {!customerId
                  ? "Choose or create a standalone/gig customer before running a tool."
                  : !selectedTool
                    ? "Choose the standalone tool you want to run for this customer."
                    : selectedTool.canRun
                      ? "Ready to start this standalone deliverable."
                      : "This tool is not available as a standalone deliverable."}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={!customerId ? "default" : "outline"}
              onClick={() => setShowNewCustomer(true)}
              data-testid="standalone-status-create-customer"
            >
              Create Standalone/Gig Customer
            </Button>
            {customerId && selectedTool?.canRun && (
              <Button
                type="button"
                size="sm"
                onClick={() => openTool(selectedTool)}
                data-testid="standalone-status-start-tool"
              >
                Start Tool
              </Button>
            )}
            {selectedTool && !selectedTool.canRun && (
              <span className="text-xs text-muted-foreground">
                {selectedTool.toolName} is {eligibilityLabel[selectedTool.eligibility]}.
              </span>
            )}
          </div>
        </div>

        {(!customerId || !toolKey) && (
          <div className="mb-6" data-testid="standalone-runner-guidance">
            <WorkflowEmptyState
              tone="blocked"
              title={
                !customerId && !toolKey
                  ? "Pick a customer and an eligible tool to start a standalone deliverable."
                  : !customerId
                    ? "No customer selected for this standalone deliverable."
                    : "No standalone tool selected yet."
              }
              body={
                !customerId && !toolKey
                  ? "Standalone gigs still need a customer/project context so the resulting report draft is scoped to the right account. Choose an eligible tool on the left, then pick or create a customer in the form on the right. Demo accounts are excluded by default."
                  : !customerId
                    ? "Standalone gigs are scoped to a single customer. Select an existing customer below, or create a new standalone customer record. Standalone customers do not automatically get Diagnostic, Implementation, or Control System access."
                    : "Pick an eligible tool from the left panel. Locked tools require client data, an active package, or aren't reportable as a standalone gig yet."
              }
              testId="standalone-runner-empty"
            />
          </div>
        )}

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
                    {c.primaryLabel}
                    {c.badges.length ? `  ·  ${c.badges.join(" · ")}` : ""}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                <label className="inline-flex items-center gap-1 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={includeDemo}
                    onChange={(e) => setIncludeDemo(e.target.checked)}
                    data-testid="standalone-include-demo"
                  />
                  Include active demo accounts
                </label>
                {filteredCustomers.length === 0 && (
                  <span className="text-muted-foreground/80">
                    {eligibleSelectorEmptyState("any_eligible")}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomer((v) => !v)}
                  className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline"
                  data-testid="standalone-new-customer-toggle"
                >
                  <UserPlus className="h-3 w-3" />
                  {showNewCustomer ? "Cancel new customer" : "Create Standalone/Gig Customer"}
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
                    placeholder="Contact name (optional if business name is provided)"
                    data-testid="standalone-new-customer-name"
                  />
                  <Input
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="Email (optional; no portal invite is sent)"
                    type="email"
                    data-testid="standalone-new-customer-email"
                  />
                  <Input
                    value={newCustomer.business_name}
                    onChange={(e) =>
                      setNewCustomer((p) => ({ ...p, business_name: e.target.value }))
                    }
                    placeholder="Business/customer name *"
                  />
                  <Input
                    value={newCustomer.industry}
                    onChange={(e) =>
                      setNewCustomer((p) => ({ ...p, industry: e.target.value }))
                    }
                    placeholder="Industry (optional, marked for review)"
                  />
                  <Textarea
                    value={newCustomer.scope}
                    onChange={(e) =>
                      setNewCustomer((p) => ({ ...p, scope: e.target.value }))
                    }
                    placeholder="Scope summary (optional, e.g. Fiverr SOP cleanup gig)"
                    rows={2}
                    data-testid="standalone-new-customer-scope"
                  />
                  <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={newCustomer.is_demo_account}
                      onChange={(e) =>
                        setNewCustomer((p) => ({
                          ...p,
                          is_demo_account: e.target.checked,
                        }))
                      }
                      data-testid="standalone-new-customer-demo"
                    />
                    Demo/test standalone account
                  </label>
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
                    {creatingCustomer ? "Creating…" : "Create Standalone/Gig Customer"}
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
