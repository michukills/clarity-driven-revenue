import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Archive,
  CheckCircle2,
  Copy,
  Megaphone,
  RefreshCcw,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  adminCreateCampaignBrief,
  adminListCampaignAssets,
  adminListCampaignBriefs,
  adminListCampaignConnectionProofs,
  adminListCampaignProfiles,
  adminRecordCampaignPerformance,
  adminUpdateCampaignAsset,
  adminUpdateCampaignBrief,
  adminUpsertCampaignConnectionProof,
  adminUpsertCampaignProfile,
  generateCampaignAssetsWithAi,
  splitLines,
} from "@/lib/campaignControl/campaignControlData";
import {
  buildCampaignRecommendation,
  connectionProofSummary,
  recommendationToBriefDraft,
} from "@/lib/campaignControl/campaignControlEngine";
import { checkCampaignSafety } from "@/lib/campaignControl/campaignSafety";
import {
  transitionCampaignAsset,
  type CampaignAssetAction,
} from "@/lib/campaignControl/campaignStatusMachine";
import { logCampaignAuditEvent } from "@/lib/campaignControl/campaignAudit";
import { CampaignVideoPanel } from "@/components/campaignControl/CampaignVideoPanel";
import { AiOutputEnvelopePanel } from "@/components/ai/AiOutputEnvelopePanel";
import {
  extractAiOutputEnvelope,
  type AiOutputEnvelope,
} from "@/lib/ai/aiOutputEnvelopeTypes";
import {
  adminListApprovedSwotSignalsForConsumer,
  type SwotConsumerSignal,
} from "@/lib/swot/swotSignalConsumers";
import type {
  CampaignAssetDraft,
  CampaignBrief,
  CampaignConnectionProof,
  CampaignProfile,
  CampaignSignalInput,
} from "@/lib/campaignControl/types";

type CustomerRow = {
  id: string;
  business_name: string | null;
  full_name: string | null;
  email: string | null;
  industry: string | null;
  lifecycle_state: string | null;
  is_demo_account: boolean | null;
  account_kind?: string | null;
  needs_industry_review?: boolean | null;
};

const READINESS_LABEL: Record<string, string> = {
  ready_to_market: "Ready to market",
  market_with_caution: "Market with caution",
  fix_intake_first: "Fix intake first",
  fix_conversion_first: "Fix conversion first",
  fix_delivery_capacity_first: "Fix delivery capacity first",
  needs_strategy_review: "Needs strategy review",
  insufficient_data: "Insufficient data",
};

function tone(status: string) {
  if (status === "ready_to_market" || status === "verified_live" || status === "sync_success" || status === "passed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (status.includes("fix") || status === "blocked" || status === "sync_failed") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

function Pill({ children, status }: { children: React.ReactNode; status: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs ${tone(status)}`}>{children}</span>;
}

function lines(value: string) {
  return splitLines(value);
}

export default function CampaignControlAdmin() {
  const { customerId: routeCustomerId } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customerId, setCustomerId] = useState(routeCustomerId ?? "");
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [profiles, setProfiles] = useState<CampaignProfile[]>([]);
  const [briefs, setBriefs] = useState<CampaignBrief[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [editedAssets, setEditedAssets] = useState<Record<string, string>>({});
  const [proofs, setProofs] = useState<CampaignConnectionProof[]>([]);
  const [swotSignals, setSwotSignals] = useState<SwotConsumerSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [latestAssetEnvelope, setLatestAssetEnvelope] =
    useState<AiOutputEnvelope | null>(null);

  const [profileForm, setProfileForm] = useState({
    location_market_area: "",
    business_stage: "",
    primary_offers: "",
    target_audiences: "",
    brand_voice_notes: "",
    forbidden_claims: "Outcome promises, revenue promises, legal advice, compliance certification",
    preferred_cta_types: "Take the Business Stability Scorecard, Request Diagnostic fit review",
    channel_preferences: "organic_social, email",
    channel_restrictions: "",
    scope_mode: "full_rgs_client",
  });
  const [proofForm, setProofForm] = useState({
    provider: "ga4",
    capability: "analytics",
    status: "manual_export_supported",
    proof_label: "Manual export supported",
    proof_source: "",
  });
  const [performanceForm, setPerformanceForm] = useState({
    platform_channel: "manual",
    date_range_start: new Date().toISOString().slice(0, 10),
    date_range_end: new Date().toISOString().slice(0, 10),
    clicks: "",
    scorecard_starts: "",
    scorecard_completions: "",
    diagnostic_inquiries: "",
    conversions_leads: "",
    notes: "",
  });

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("id,business_name,full_name,email,industry,lifecycle_state,is_demo_account,account_kind,needs_industry_review")
      .order("last_activity_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    setCustomers((data ?? []) as CustomerRow[]);
  }

  async function loadCustomer(id: string) {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id,business_name,full_name,email,industry,lifecycle_state,is_demo_account,account_kind,needs_industry_review")
        .eq("id", id)
        .single();
      if (error) throw error;
      setCustomer(data as CustomerRow);
      const [p, b, a, cp, swot] = await Promise.all([
        adminListCampaignProfiles(id).catch(() => []),
        adminListCampaignBriefs(id).catch(() => []),
        adminListCampaignAssets(id).catch(() => []),
        adminListCampaignConnectionProofs(id).catch(() => []),
        adminListApprovedSwotSignalsForConsumer(id, "campaign").catch(() => []),
      ]);
      setProfiles(p);
      setBriefs(b);
      setAssets(a);
      setEditedAssets(
        Object.fromEntries((a ?? []).map((asset: any) => [asset.id, asset.edited_content || asset.draft_content || ""])),
      );
      setProofs(cp);
      setSwotSignals(swot);
      const current = p[0];
      if (current) {
        setProfileForm({
          location_market_area: current.location_market_area ?? "",
          business_stage: current.business_stage ?? "",
          primary_offers: (current.primary_offers ?? []).join("\n"),
          target_audiences: (current.target_audiences ?? []).join("\n"),
          brand_voice_notes: current.brand_voice_notes ?? "",
          forbidden_claims: (current.forbidden_claims ?? []).join("\n"),
          preferred_cta_types: (current.preferred_cta_types ?? []).join("\n"),
          channel_preferences: (current.channel_preferences ?? []).join("\n"),
          channel_restrictions: (current.channel_restrictions ?? []).join("\n"),
          scope_mode: current.scope_mode ?? "full_rgs_client",
        });
      }
    } catch (e) {
      toast.error("Campaign Control failed to load", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers().catch((e) => toast.error("Failed to load customers", { description: e.message }));
  }, []);

  useEffect(() => {
    if (routeCustomerId) setCustomerId(routeCustomerId);
  }, [routeCustomerId]);

  useEffect(() => {
    if (customerId) void loadCustomer(customerId);
    else setLoading(false);
  }, [customerId]);

  const activeProfile = profiles[0] ?? null;
  const signalInput: CampaignSignalInput | null = useMemo(() => {
    if (!customer) return null;
    const profile: CampaignProfile = {
      id: activeProfile?.id,
      customer_id: customer.id,
      industry: customer.industry ?? activeProfile?.industry ?? null,
      location_market_area: profileForm.location_market_area,
      business_stage: profileForm.business_stage,
      primary_offers: lines(profileForm.primary_offers),
      target_audiences: lines(profileForm.target_audiences),
      brand_voice_notes: profileForm.brand_voice_notes,
      forbidden_claims: lines(profileForm.forbidden_claims),
      preferred_cta_types: lines(profileForm.preferred_cta_types),
      channel_preferences: lines(profileForm.channel_preferences) as any,
      channel_restrictions: lines(profileForm.channel_restrictions),
      scope_mode: profileForm.scope_mode as any,
    };
    return {
      customer,
      profile,
      offer_lines: profile.primary_offers,
      target_audiences: profile.target_audiences,
      channel_readiness: profile.channel_preferences?.map((channel) => ({
        channel,
        status: "manual_only",
        notes: "Manual posting/tracking unless a connection proof is recorded.",
      })),
      connection_proofs: proofs,
      swot_signals: swotSignals.map((signal) => ({
        signal_type: signal.signal_type,
        gear: signal.gear as any,
        summary: signal.summary,
        confidence: signal.confidence,
        client_safe: signal.client_safe,
      })),
    };
  }, [customer, activeProfile?.id, profileForm, proofs, swotSignals]);

  const recommendation = useMemo(
    () => (signalInput ? buildCampaignRecommendation(signalInput) : null),
    [signalInput],
  );
  const proofSummary = signalInput ? connectionProofSummary(signalInput) : null;

  async function saveProfile() {
    if (!customer || !recommendation) return;
    setBusy(true);
    try {
      const missing = recommendation.missing_inputs;
      const saved = await adminUpsertCampaignProfile({
        id: activeProfile?.id,
        customer_id: customer.id,
        industry: customer.industry,
        location_market_area: profileForm.location_market_area,
        business_stage: profileForm.business_stage,
        primary_offers: lines(profileForm.primary_offers),
        target_audiences: lines(profileForm.target_audiences),
        brand_voice_notes: profileForm.brand_voice_notes,
        forbidden_claims: lines(profileForm.forbidden_claims),
        preferred_cta_types: lines(profileForm.preferred_cta_types),
        channel_preferences: lines(profileForm.channel_preferences) as any,
        channel_restrictions: lines(profileForm.channel_restrictions),
        readiness_status: recommendation.readiness_classification,
        missing_inputs: missing,
        scope_mode: profileForm.scope_mode as any,
      });
      toast.success("Campaign profile saved");
      await loadCustomer(customer.id);
      if (!activeProfile?.id) navigate(`/admin/customers/${customer.id}/campaign-control`, { replace: true });
      return saved;
    } catch (e) {
      toast.error("Failed to save campaign profile", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function createBrief() {
    if (!customer || !recommendation) return;
    setBusy(true);
    try {
      const profile = activeProfile?.id ? activeProfile : await saveProfile();
      const brief = recommendationToBriefDraft(customer.id, profile?.id ?? null, recommendation);
      await adminCreateCampaignBrief(brief);
      toast.success("Campaign brief created");
      await loadCustomer(customer.id);
    } catch (e) {
      toast.error("Failed to create brief", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function generateAssets(brief: CampaignBrief) {
    if (!customer || !recommendation || !brief.id) return;
    setBusy(true);
    try {
      const res = await generateCampaignAssetsWithAi({
        customerId: customer.id,
        briefId: brief.id,
        recommendation,
      });
      setLatestAssetEnvelope(extractAiOutputEnvelope(res));
      toast.success("Campaign drafts generated", {
        description: (res as any)?.generationMode === "ai_gateway" ? "AI-assisted drafts stored for review." : "Rules-based fallback drafts stored for review.",
      });
      await loadCustomer(customer.id);
    } catch (e) {
      toast.error("Generation failed", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function saveProof() {
    if (!customer) return;
    setBusy(true);
    try {
      await adminUpsertCampaignConnectionProof({
        customer_id: customer.id,
        provider: proofForm.provider,
        capability: proofForm.capability as any,
        status: proofForm.status as any,
        proof_label: proofForm.proof_label,
        proof_source: proofForm.proof_source || null,
        last_verified_at: proofForm.status === "verified_live" ? new Date().toISOString() : null,
        client_safe_summary:
          proofForm.status === "verified_live" || proofForm.status === "sync_success"
            ? `${proofForm.provider} connection is verified for campaign use.`
            : `${proofForm.provider} is not verified for live campaign automation yet.`,
      });
      toast.success("Connection proof recorded");
      await loadCustomer(customer.id);
    } catch (e) {
      toast.error("Failed to record proof", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function updateAsset(id: string, patch: Record<string, unknown>) {
    if (!customer) return;
    try {
      await adminUpdateCampaignAsset(id, patch);
      toast.success("Asset updated");
      await loadCustomer(customer.id);
    } catch (e) {
      toast.error("Asset update failed", { description: (e as Error).message });
    }
  }

  async function runAssetTransition(asset: any, action: CampaignAssetAction, extraPatch: Record<string, unknown> = {}) {
    if (!customer) return;
    const safety = checkCampaignSafety(
      editedAssets[asset.id] ?? asset.edited_content ?? asset.draft_content ?? "",
    );
    const state = {
      approval_status: asset.approval_status,
      publishing_status: asset.publishing_status,
      safety_status: safety.status,
    };
    const outcome = transitionCampaignAsset(state, action);
    if (outcome.ok !== true) {
      toast.error("Transition not allowed", { description: (outcome as { reason: string }).reason });
      return;
    }
    const ok = outcome as Extract<typeof outcome, { ok: true }>;
    try {
      const patch: Record<string, unknown> = {
        approval_status: ok.next.approval_status,
        publishing_status: ok.next.publishing_status,
        safety_status: safety.status,
        brand_check_status: safety.status,
        ...extraPatch,
      };
      if (action === "approve") {
        patch.approved_at = new Date().toISOString();
        patch.client_visible = true;
      }
      if (action === "mark_manually_posted") {
        patch.posted_at = new Date().toISOString();
      }
      await adminUpdateCampaignAsset(asset.id, patch);
      await logCampaignAuditEvent({
        action: ok.audit_action as any,
        customer_id: customer.id,
        campaign_brief_id: asset.campaign_brief_id ?? null,
        campaign_asset_id: asset.id,
        from_status: ok.from_status,
        to_status: ok.to_status,
        context: { safety: safety.status, ui: "admin" },
      });
      toast.success("Asset updated");
      await loadCustomer(customer.id);
    } catch (e) {
      toast.error("Asset update failed", { description: (e as Error).message });
    }
  }

  async function recordPerformance() {
    if (!customer) return;
    setBusy(true);
    try {
      await adminRecordCampaignPerformance({
        customer_id: customer.id,
        platform_channel: performanceForm.platform_channel,
        date_range_start: performanceForm.date_range_start,
        date_range_end: performanceForm.date_range_end,
        clicks: Number(performanceForm.clicks) || 0,
        scorecard_starts: Number(performanceForm.scorecard_starts) || 0,
        scorecard_completions: Number(performanceForm.scorecard_completions) || 0,
        diagnostic_inquiries: Number(performanceForm.diagnostic_inquiries) || 0,
        conversions_leads: Number(performanceForm.conversions_leads) || 0,
        notes: performanceForm.notes,
      });
      toast.success("Manual performance recorded");
      setPerformanceForm((f) => ({ ...f, clicks: "", scorecard_starts: "", scorecard_completions: "", diagnostic_inquiries: "", conversions_leads: "", notes: "" }));
    } catch (e) {
      toast.error("Performance entry failed", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell variant="admin">
      <Link to="/admin" className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Admin
      </Link>

      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">RGS Campaign Control System</div>
          <h1 className="mt-2 text-3xl text-foreground">Recommend, generate, review, approve, post, track, learn.</h1>
          <p className="mt-3 max-w-4xl text-sm text-muted-foreground">
            Campaign Control uses the strongest available business signals to decide what to market, who to target,
            what message to use, and when to run it. Recommendations are operational guidance, not promised outcomes.
          </p>
        </div>
        <select
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value);
            if (e.target.value) navigate(`/admin/customers/${e.target.value}/campaign-control`);
          }}
          className="min-h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
          data-testid="campaign-customer-select"
        >
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.business_name || c.full_name || c.email || c.id}
              {c.is_demo_account ? " · Demo" : ""}
            </option>
          ))}
        </select>
      </header>

      {!customer && !loading ? (
        <div className="rounded-xl border border-border bg-card/40 p-6 text-sm text-muted-foreground">
          Select a customer to open Campaign Control. Standalone/gig campaign deliverables still require a customer record so the work stays scoped and tenant-safe.
        </div>
      ) : null}

      {customer ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl text-foreground">{customer.business_name || customer.full_name || customer.email}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {customer.is_demo_account ? "Demo/test account" : "Customer-scoped campaign workspace"} · Industry: {customer.industry || "not confirmed"} · Lifecycle: {customer.lifecycle_state || "unknown"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {customer.is_demo_account ? <Pill status="market_with_caution">Demo-safe</Pill> : null}
                {customer.needs_industry_review ? <Pill status="needs_strategy_review">Industry review needed</Pill> : null}
                {recommendation ? <Pill status={recommendation.readiness_classification}>{READINESS_LABEL[recommendation.readiness_classification]}</Pill> : null}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg text-foreground">Campaign operating profile</h2>
                  <p className="text-sm text-muted-foreground">Minimum useful input for full-client or standalone/gig campaign deliverables.</p>
                </div>
                <Button onClick={saveProfile} disabled={busy} size="sm">
                  <ShieldCheck className="h-4 w-4" /> Save profile
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Market area" value={profileForm.location_market_area} onChange={(e) => setProfileForm((f) => ({ ...f, location_market_area: e.target.value }))} />
                <Input placeholder="Business stage" value={profileForm.business_stage} onChange={(e) => setProfileForm((f) => ({ ...f, business_stage: e.target.value }))} />
                <Textarea className="min-h-24" placeholder="Primary offers or service lines, one per line" value={profileForm.primary_offers} onChange={(e) => setProfileForm((f) => ({ ...f, primary_offers: e.target.value }))} />
                <Textarea className="min-h-24" placeholder="Target audiences / ICP, one per line" value={profileForm.target_audiences} onChange={(e) => setProfileForm((f) => ({ ...f, target_audiences: e.target.value }))} />
                <Textarea className="min-h-24" placeholder="Brand voice notes" value={profileForm.brand_voice_notes} onChange={(e) => setProfileForm((f) => ({ ...f, brand_voice_notes: e.target.value }))} />
                <Textarea className="min-h-24" placeholder="Forbidden claims / phrases" value={profileForm.forbidden_claims} onChange={(e) => setProfileForm((f) => ({ ...f, forbidden_claims: e.target.value }))} />
                <Textarea className="min-h-20" placeholder="Preferred CTA types" value={profileForm.preferred_cta_types} onChange={(e) => setProfileForm((f) => ({ ...f, preferred_cta_types: e.target.value }))} />
                <Textarea className="min-h-20" placeholder="Channel preferences" value={profileForm.channel_preferences} onChange={(e) => setProfileForm((f) => ({ ...f, channel_preferences: e.target.value }))} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["full_rgs_client", "standalone_gig", "demo_test"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setProfileForm((f) => ({ ...f, scope_mode: mode }))}
                    className={`rounded-md border px-3 py-2 text-xs ${profileForm.scope_mode === mode ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                    type="button"
                  >
                    {mode === "standalone_gig" ? "Standalone / Gig" : mode === "demo_test" ? "Demo / Test" : "Full RGS client"}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <h2 className="text-lg text-foreground">Recommendation engine</h2>
              </div>
              {recommendation ? (
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Pill status={recommendation.readiness_classification}>{READINESS_LABEL[recommendation.readiness_classification]}</Pill>
                    <Pill status={recommendation.confidence_level}>Confidence: {recommendation.confidence_level}</Pill>
                    <Pill status={recommendation.publishing_readiness}>Publishing: {recommendation.publishing_readiness.replace(/_/g, " ")}</Pill>
                  </div>
                  <p className="text-foreground">{recommendation.recommended_objective}</p>
                  <dl className="grid gap-2 text-xs text-muted-foreground">
                    <div><dt className="text-foreground">Audience</dt><dd>{recommendation.recommended_audience}</dd></div>
                    <div><dt className="text-foreground">Offer</dt><dd>{recommendation.recommended_offer_service_line}</dd></div>
                    <div><dt className="text-foreground">Channel</dt><dd>{recommendation.recommended_platform_channel}</dd></div>
                    <div><dt className="text-foreground">CTA</dt><dd>{recommendation.recommended_cta}</dd></div>
                  </dl>
                  {recommendation.do_not_market_yet_warning ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                      {recommendation.do_not_market_yet_warning}
                    </div>
                  ) : null}
                  <div className="rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground">
                    {proofSummary?.summary}
                  </div>
                  {recommendation.missing_inputs.length > 0 ? (
                    <div>
                      <div className="text-xs font-medium text-foreground">Missing inputs</div>
                      <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                        {recommendation.missing_inputs.map((m) => <li key={m}>{m}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  <Button onClick={createBrief} disabled={busy} className="w-full">
                    <CheckCircle2 className="h-4 w-4" /> Create campaign brief
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Add a campaign profile to generate a recommendation.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card/40 p-4">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg text-foreground">Connection proof</h2>
                <p className="text-sm text-muted-foreground">
                  GA4, platform import, and posting integration labels stay unavailable until proof is recorded for this customer.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={saveProof} disabled={busy}>
                <ShieldCheck className="h-4 w-4" /> Record proof
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              <Input value={proofForm.provider} onChange={(e) => setProofForm((f) => ({ ...f, provider: e.target.value }))} placeholder="Provider, e.g. ga4" />
              <select className="rounded-md border border-border bg-background px-3 text-sm" value={proofForm.capability} onChange={(e) => setProofForm((f) => ({ ...f, capability: e.target.value }))}>
                <option value="analytics">Analytics</option>
                <option value="social_posting">Social posting</option>
                <option value="ad_platform">Ad platform</option>
                <option value="crm">CRM</option>
                <option value="manual_import">Manual import</option>
              </select>
              <select className="rounded-md border border-border bg-background px-3 text-sm" value={proofForm.status} onChange={(e) => setProofForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="manual_export_supported">Manual export supported</option>
                <option value="setup_requested">Setup requested</option>
                <option value="connector_configured_not_synced">Configured, not synced</option>
                <option value="verified_live">Verified live</option>
                <option value="sync_success">Sync success</option>
                <option value="sync_failed">Sync failed</option>
                <option value="demo_only">Demo only</option>
              </select>
              <Input value={proofForm.proof_label} onChange={(e) => setProofForm((f) => ({ ...f, proof_label: e.target.value }))} placeholder="Proof label" />
              <Input value={proofForm.proof_source} onChange={(e) => setProofForm((f) => ({ ...f, proof_source: e.target.value }))} placeholder="Proof source / log ref" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {proofs.length === 0 ? (
                <div className="rounded-lg border border-border bg-background/30 p-3 text-sm text-muted-foreground">
                  No proven analytics or publishing connection yet. Campaigns can still be drafted, approved, copied, manually posted, and manually tracked.
                </div>
              ) : proofs.map((p) => (
                <div key={p.id ?? `${p.provider}-${p.capability}`} className="rounded-lg border border-border bg-background/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm text-foreground">{p.provider} · {p.capability}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{p.proof_label}</div>
                    </div>
                    <Pill status={p.status}>{p.status.replace(/_/g, " ")}</Pill>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Verified: {p.last_verified_at ? new Date(p.last_verified_at).toLocaleString() : "not verified"} · Source: {p.proof_source || "not provided"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <h2 className="mb-4 text-lg text-foreground">Campaign briefs</h2>
              <div className="space-y-3">
                {briefs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No briefs yet. Create one from the recommendation engine.</p>
                ) : briefs.map((b) => (
                  <div key={b.id} className="rounded-lg border border-border bg-background/30 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm text-foreground">{b.objective}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{b.channel_platform} · {b.offer_service_line} · {b.cta}</div>
                      </div>
                      <Pill status={b.status ?? "draft"}>{(b.status ?? "draft").replace(/_/g, " ")}</Pill>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => generateAssets(b)} disabled={busy || !b.id}>
                        <RefreshCcw className="h-4 w-4" /> Generate draft assets
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => b.id && adminUpdateCampaignBrief(b.id, { client_visible: true, status: "approved" } as any).then(() => loadCustomer(customer.id))}>
                        <ShieldCheck className="h-4 w-4" /> Approve client-visible brief
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-4">
              <h2 className="mb-4 text-lg text-foreground">Manual performance entry</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                Manual entry is available now. GA4/platform import requires a verified connection proof and is not shown as live by default.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Platform / channel" value={performanceForm.platform_channel} onChange={(e) => setPerformanceForm((f) => ({ ...f, platform_channel: e.target.value }))} />
                <Input placeholder="Clicks" value={performanceForm.clicks} onChange={(e) => setPerformanceForm((f) => ({ ...f, clicks: e.target.value }))} />
                <Input type="date" value={performanceForm.date_range_start} onChange={(e) => setPerformanceForm((f) => ({ ...f, date_range_start: e.target.value }))} />
                <Input type="date" value={performanceForm.date_range_end} onChange={(e) => setPerformanceForm((f) => ({ ...f, date_range_end: e.target.value }))} />
                <Input placeholder="Scorecard starts" value={performanceForm.scorecard_starts} onChange={(e) => setPerformanceForm((f) => ({ ...f, scorecard_starts: e.target.value }))} />
                <Input placeholder="Scorecard completions" value={performanceForm.scorecard_completions} onChange={(e) => setPerformanceForm((f) => ({ ...f, scorecard_completions: e.target.value }))} />
                <Input placeholder="Diagnostic inquiries" value={performanceForm.diagnostic_inquiries} onChange={(e) => setPerformanceForm((f) => ({ ...f, diagnostic_inquiries: e.target.value }))} />
                <Input placeholder="Leads/conversions" value={performanceForm.conversions_leads} onChange={(e) => setPerformanceForm((f) => ({ ...f, conversions_leads: e.target.value }))} />
              </div>
              <Textarea className="mt-3" placeholder="Notes" value={performanceForm.notes} onChange={(e) => setPerformanceForm((f) => ({ ...f, notes: e.target.value }))} />
              <Button className="mt-3" onClick={recordPerformance} disabled={busy}>
                <Send className="h-4 w-4" /> Record manual performance
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card/40 p-4">
            <h2 className="mb-4 text-lg text-foreground">Draft assets and approval queue</h2>
            <div className="grid gap-3 xl:grid-cols-2">
              {assets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assets generated yet.</p>
            ) : assets.map((a) => {
                const content = editedAssets[a.id] ?? a.edited_content ?? a.draft_content ?? "";
                const safety = checkCampaignSafety(content);
                return (
                  <div key={a.id} className="rounded-lg border border-border bg-background/30 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm text-foreground">{a.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{a.asset_type} · {a.platform} · {a.publishing_status}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Pill status={safety.status}>Safety: {safety.status}</Pill>
                        <Pill status={a.approval_status}>{a.approval_status}</Pill>
                      </div>
                    </div>
                    <Textarea
                      className="mt-3 min-h-40"
                      value={content}
                      onChange={(e) => setEditedAssets((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    />
                    <div className="mt-3 rounded-lg border border-border bg-card/40 p-3 text-xs text-muted-foreground">
                      {a.manual_posting_instructions || "Manual posting only until a verified posting connection exists."}
                    </div>
                    {safety.issues.length > 0 ? (
                      <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                        <AlertTriangle className="mb-1 inline h-3.5 w-3.5" /> {safety.issues[0].admin_remediation_suggestion}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(content).then(() => toast.success("Copied"))}>
                        <Copy className="h-4 w-4" /> Copy approved draft
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateAsset(a.id, { edited_content: content, safety_status: safety.status, brand_check_status: safety.status })}>
                        Save edit
                      </Button>
                      <Button size="sm" variant="outline" disabled={a.approval_status !== "draft"} onClick={() => runAssetTransition(a, "request_review", { edited_content: content })}>
                        Request review
                      </Button>
                      <Button size="sm" disabled={safety.status !== "passed" || a.approval_status !== "needs_review"} onClick={() => runAssetTransition(a, "approve", { edited_content: content })}>
                        <ShieldCheck className="h-4 w-4" /> Approve client-visible
                      </Button>
                      <Button size="sm" variant="outline" disabled={a.approval_status !== "approved" || a.publishing_status === "ready_for_manual_post" || a.publishing_status === "posted_manually"} onClick={() => runAssetTransition(a, "mark_ready_to_publish")}>
                        Ready for manual publishing
                      </Button>
                      <Button size="sm" variant="outline" disabled={a.approval_status !== "approved" || a.publishing_status === "posted_manually"} onClick={() => runAssetTransition(a, "mark_manually_posted")}>
                        Mark manually posted
                      </Button>
                      <Button size="sm" variant="outline" disabled={a.approval_status === "rejected" || a.approval_status === "archived"} onClick={() => runAssetTransition(a, "reject")}>
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                      <Button size="sm" variant="outline" disabled={a.approval_status === "archived"} onClick={() => runAssetTransition(a, "archive")}>
                        <Archive className="h-4 w-4" /> Archive
                      </Button>
                      <p className="basis-full text-[11px] text-muted-foreground">
                        Scheduling integration not connected yet. Approved assets are ready for manual publishing only.
                      </p>
                    </div>
                    {customer ? (
                      <CampaignVideoPanel
                        asset={a}
                        customerId={customer.id}
                        brainContext={{
                          profile: profiles[0] ?? null,
                          brief: (briefs.find((b: any) => b.id === a.campaign_brief_id) ?? briefs[0] ?? {
                            objective: "",
                            target_audience: "",
                            offer_service_line: "",
                            channel_platform: "",
                            funnel_stage: "",
                            cta: "",
                            client_safe_notes: "",
                            evidence_confidence: "medium",
                          }) as any,
                          asset: {
                            title: a.title,
                            platform: a.platform,
                            asset_type: a.asset_type,
                            client_safe_explanation: a.client_safe_explanation,
                            draft_content: a.edited_content || a.draft_content || "",
                          },
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
