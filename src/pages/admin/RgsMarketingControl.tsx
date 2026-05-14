import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Copy, Megaphone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  RGS_MARKETING_WORKSPACE_KEY,
  adminCreateRgsCampaignBrief,
  adminListRgsCampaignAssets,
  adminListRgsCampaignBriefs,
  adminListRgsCampaignConnectionProofs,
  adminListRgsCampaignProfiles,
  adminRecordRgsCampaignPerformance,
  adminUpdateCampaignAsset,
  adminUpdateCampaignBrief,
  adminUpsertRgsCampaignConnectionProof,
  adminUpsertRgsCampaignProfile,
  generateRgsCampaignAssetsWithAi,
  splitLines,
} from "@/lib/campaignControl/campaignControlData";
import {
  buildCampaignRecommendation,
  connectionProofSummary,
  recommendationToBriefDraft,
} from "@/lib/campaignControl/campaignControlEngine";
import { checkCampaignSafety } from "@/lib/campaignControl/campaignSafety";
import type { CampaignBrief, CampaignConnectionProof, CampaignProfile, CampaignSignalInput } from "@/lib/campaignControl/types";

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

export default function RgsMarketingControl() {
  const [profiles, setProfiles] = useState<CampaignProfile[]>([]);
  const [briefs, setBriefs] = useState<CampaignBrief[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [proofs, setProofs] = useState<CampaignConnectionProof[]>([]);
  const [editedAssets, setEditedAssets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profileForm, setProfileForm] = useState({
    location_market_area: "United States",
    business_stage: "Live RGS public funnel and OS growth",
    primary_offers:
      "Free Business Stability Scorecard\nPaid RGS Diagnostic\nImplementation\nRGS Control System",
    target_audiences:
      "Established small-business owners with operational drag\nTrades, home services, restaurants, retail, professional services, e-commerce, and operationally complex regulated businesses",
    brand_voice_notes:
      "Calm, direct, practical, premium, owner-respecting, system-focused. RGS is a Business Systems Architect, not an agency or operator.",
    forbidden_claims:
      "Outcome promises\nRevenue promises\nProfit promises\nLegal, tax, accounting, valuation, compliance, or certification claims\nFake urgency or fake proof",
    preferred_cta_types:
      "Take the Business Stability Scorecard\nSee if the Diagnostic is a fit\nReview the RGS Control System",
    channel_preferences: "organic_social, email, linkedin, seo, reddit_manual",
    channel_restrictions: "No auto-posting\nNo cold spam\nNo fake proof\nNo outcome promises",
  });
  const [proofForm, setProofForm] = useState({
    provider: "ga4",
    capability: "analytics",
    status: "manual_export_supported",
    proof_label: "Manual analytics review only",
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

  async function load() {
    setLoading(true);
    try {
      const [p, b, a, cp] = await Promise.all([
        adminListRgsCampaignProfiles(),
        adminListRgsCampaignBriefs(),
        adminListRgsCampaignAssets(),
        adminListRgsCampaignConnectionProofs(),
      ]);
      setProfiles(p);
      setBriefs(b);
      setAssets(a);
      setProofs(cp);
      setEditedAssets(Object.fromEntries((a ?? []).map((asset: any) => [asset.id, asset.edited_content || asset.draft_content || ""])));
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
        });
      }
    } catch (e) {
      toast.error("RGS Marketing Control failed to load", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeProfile = profiles[0] ?? null;
  const signalInput: CampaignSignalInput = useMemo(() => ({
    customer: {
      id: "rgs-internal",
      business_name: "Revenue & Growth Systems",
      industry: "general_service",
      lifecycle_state: "rgs_internal",
      account_kind: "rgs_internal",
      is_demo_account: false,
    },
    profile: {
      id: activeProfile?.id,
      customer_id: null,
      workspace_scope: "rgs_internal",
      rgs_workspace_key: RGS_MARKETING_WORKSPACE_KEY,
      industry: "general_service",
      location_market_area: profileForm.location_market_area,
      business_stage: profileForm.business_stage,
      primary_offers: lines(profileForm.primary_offers),
      target_audiences: lines(profileForm.target_audiences),
      brand_voice_notes: profileForm.brand_voice_notes,
      forbidden_claims: lines(profileForm.forbidden_claims),
      preferred_cta_types: lines(profileForm.preferred_cta_types),
      channel_preferences: lines(profileForm.channel_preferences) as any,
      channel_restrictions: lines(profileForm.channel_restrictions),
      scope_mode: "full_rgs_client",
    },
    offer_lines: lines(profileForm.primary_offers),
    target_audiences: lines(profileForm.target_audiences),
    channel_readiness: lines(profileForm.channel_preferences).map((channel) => ({
      channel,
      status: "manual_only",
      notes: "Manual RGS posting/tracking unless a connection proof is recorded.",
    })),
    connection_proofs: proofs,
  }), [activeProfile?.id, profileForm, proofs]);

  const recommendation = useMemo(() => buildCampaignRecommendation(signalInput), [signalInput]);
  const proofSummary = connectionProofSummary(signalInput);

  async function saveProfile() {
    setBusy(true);
    try {
      const saved = await adminUpsertRgsCampaignProfile({
        id: activeProfile?.id,
        industry: "general_service",
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
        missing_inputs: recommendation.missing_inputs,
        scope_mode: "full_rgs_client",
      });
      toast.success("RGS marketing profile saved");
      await load();
      return saved;
    } catch (e) {
      toast.error("Failed to save RGS marketing profile", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function createBrief() {
    setBusy(true);
    try {
      const profile = activeProfile?.id ? activeProfile : await saveProfile();
      const brief = {
        ...recommendationToBriefDraft(null, profile?.id ?? null, recommendation),
        workspace_scope: "rgs_internal" as const,
        rgs_workspace_key: RGS_MARKETING_WORKSPACE_KEY,
      };
      await adminCreateRgsCampaignBrief(brief);
      toast.success("RGS marketing brief created");
      await load();
    } catch (e) {
      toast.error("Failed to create RGS marketing brief", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function generateAssets(brief: CampaignBrief) {
    if (!brief.id) return;
    setBusy(true);
    try {
      const res = await generateRgsCampaignAssetsWithAi({ briefId: brief.id, recommendation });
      toast.success("RGS marketing drafts generated", {
        description: (res as any)?.generationMode === "ai_gateway" ? "AI-assisted drafts stored for review." : "Rules-based fallback drafts stored for review.",
      });
      await load();
    } catch (e) {
      toast.error("Generation failed", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function saveProof() {
    setBusy(true);
    try {
      await adminUpsertRgsCampaignConnectionProof({
        provider: proofForm.provider,
        capability: proofForm.capability as any,
        status: proofForm.status as any,
        proof_label: proofForm.proof_label,
        proof_source: proofForm.proof_source || null,
        last_verified_at: proofForm.status === "verified_live" ? new Date().toISOString() : null,
        client_safe_summary:
          proofForm.status === "verified_live" || proofForm.status === "sync_success"
            ? `${proofForm.provider} connection is verified for RGS campaign use.`
            : `${proofForm.provider} is not verified for live RGS campaign automation yet.`,
      });
      toast.success("RGS connection proof recorded");
      await load();
    } catch (e) {
      toast.error("Failed to record proof", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function updateAsset(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      await adminUpdateCampaignAsset(id, patch);
      toast.success("RGS marketing asset updated");
      await load();
    } catch (e) {
      toast.error("Asset update failed", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function recordPerformance() {
    setBusy(true);
    try {
      await adminRecordRgsCampaignPerformance({
        platform_channel: performanceForm.platform_channel,
        date_range_start: performanceForm.date_range_start,
        date_range_end: performanceForm.date_range_end,
        clicks: Number(performanceForm.clicks || 0),
        scorecard_starts: Number(performanceForm.scorecard_starts || 0),
        scorecard_completions: Number(performanceForm.scorecard_completions || 0),
        diagnostic_inquiries: Number(performanceForm.diagnostic_inquiries || 0),
        conversions_leads: Number(performanceForm.conversions_leads || 0),
        notes: performanceForm.notes,
      });
      toast.success("Manual RGS performance entry saved");
      await load();
    } catch (e) {
      toast.error("Failed to record performance", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell variant="admin">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 min-w-0">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 min-w-0">
            <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to admin
            </Link>
            <div className="flex items-center gap-2 text-sm text-primary">
              <Megaphone className="h-4 w-4" /> RGS Marketing Control
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-foreground break-words">RGS Campaign Control System</h1>
            <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Admin-only workspace for Revenue & Growth Systems marketing. It uses the same campaign engine and safety rules as client work, but it never mixes RGS internal campaigns with customer, demo, or gig data.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground max-w-md">
            <div className="font-medium text-foreground mb-1">Connection truth</div>
            {proofSummary.summary} Live posting and GA4-style learning stay manual until a verified proof is recorded.
          </div>
        </header>

        {loading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground">Loading RGS marketing workspace...</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5 items-start min-w-0">
            <section className="rounded-lg border border-border bg-card p-5 space-y-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">RGS campaign operating profile</h2>
                <Pill status={recommendation.readiness_classification}>{READINESS_LABEL[recommendation.readiness_classification]}</Pill>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input value={profileForm.location_market_area} onChange={(e) => setProfileForm((f) => ({ ...f, location_market_area: e.target.value }))} placeholder="Market area" />
                <Input value={profileForm.business_stage} onChange={(e) => setProfileForm((f) => ({ ...f, business_stage: e.target.value }))} placeholder="Business stage" />
              </div>
              <Textarea className="min-h-24" value={profileForm.primary_offers} onChange={(e) => setProfileForm((f) => ({ ...f, primary_offers: e.target.value }))} placeholder="RGS offers, one per line" />
              <Textarea className="min-h-24" value={profileForm.target_audiences} onChange={(e) => setProfileForm((f) => ({ ...f, target_audiences: e.target.value }))} placeholder="Target audiences / ICP" />
              <Textarea className="min-h-24" value={profileForm.brand_voice_notes} onChange={(e) => setProfileForm((f) => ({ ...f, brand_voice_notes: e.target.value }))} placeholder="Brand voice" />
              <Textarea className="min-h-24" value={profileForm.forbidden_claims} onChange={(e) => setProfileForm((f) => ({ ...f, forbidden_claims: e.target.value }))} placeholder="Forbidden claims" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Textarea className="min-h-20" value={profileForm.preferred_cta_types} onChange={(e) => setProfileForm((f) => ({ ...f, preferred_cta_types: e.target.value }))} placeholder="Preferred CTAs" />
                <Textarea className="min-h-20" value={profileForm.channel_preferences} onChange={(e) => setProfileForm((f) => ({ ...f, channel_preferences: e.target.value }))} placeholder="Channels" />
              </div>
              <Textarea className="min-h-20" value={profileForm.channel_restrictions} onChange={(e) => setProfileForm((f) => ({ ...f, channel_restrictions: e.target.value }))} placeholder="Channel restrictions" />
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveProfile} disabled={busy}>Save RGS profile</Button>
                <Button variant="secondary" onClick={createBrief} disabled={busy}>Create RGS campaign brief</Button>
              </div>
            </section>

            <section className="space-y-5 min-w-0">
              <div className="rounded-lg border border-border bg-card p-5 space-y-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Recommendation</h2>
                  <Pill status={recommendation.confidence_level}>Confidence: {recommendation.confidence_level}</Pill>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Objective:</span> {recommendation.recommended_objective}</div>
                  <div><span className="text-muted-foreground">Audience:</span> {recommendation.recommended_audience}</div>
                  <div><span className="text-muted-foreground">Offer:</span> {recommendation.recommended_offer_service_line}</div>
                  <div><span className="text-muted-foreground">Channel:</span> {recommendation.recommended_platform_channel}</div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{recommendation.client_safe_explanation}</p>
                {recommendation.missing_inputs.length > 0 && (
                  <div className="text-xs text-amber-300">Missing inputs: {recommendation.missing_inputs.join(", ")}</div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Connection proof</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input value={proofForm.provider} onChange={(e) => setProofForm((f) => ({ ...f, provider: e.target.value }))} />
                  <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={proofForm.capability} onChange={(e) => setProofForm((f) => ({ ...f, capability: e.target.value }))}>
                    <option value="analytics">Analytics</option>
                    <option value="social_posting">Social posting</option>
                    <option value="ad_platform">Ad platform</option>
                    <option value="crm">CRM</option>
                    <option value="manual_import">Manual import</option>
                  </select>
                  <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={proofForm.status} onChange={(e) => setProofForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="manual_export_supported">Manual export supported</option>
                    <option value="setup_requested">Setup requested</option>
                    <option value="connector_configured_not_synced">Configured, not synced</option>
                    <option value="verified_live">Verified live</option>
                    <option value="sync_success">Sync success</option>
                    <option value="sync_failed">Sync failed</option>
                  </select>
                  <Input value={proofForm.proof_label} onChange={(e) => setProofForm((f) => ({ ...f, proof_label: e.target.value }))} />
                </div>
                <Input value={proofForm.proof_source} onChange={(e) => setProofForm((f) => ({ ...f, proof_source: e.target.value }))} placeholder="Proof source / internal note" />
                <Button variant="secondary" onClick={saveProof} disabled={busy}>Record RGS proof</Button>
              </div>

              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h2 className="text-lg font-semibold text-foreground">RGS campaign briefs</h2>
                {briefs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No RGS campaign briefs yet.</p>
                ) : briefs.map((brief) => (
                  <article key={brief.id} className="rounded-md border border-border p-4 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground break-words">{brief.objective}</div>
                        <div className="text-xs text-muted-foreground break-words">{brief.channel_platform} · {brief.status} · {brief.publishing_status}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => generateAssets(brief)} disabled={busy}>Generate drafts</Button>
                        <Button size="sm" variant="outline" onClick={() => adminUpdateCampaignBrief(brief.id!, { status: "approved" }).then(load)} disabled={busy}>Approve brief</Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Draft assets</h2>
                {assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No RGS campaign assets yet.</p>
                ) : assets.map((asset) => {
                  const text = editedAssets[asset.id] ?? asset.edited_content ?? asset.draft_content ?? "";
                  const safety = checkCampaignSafety(text);
                  return (
                    <article key={asset.id} className="rounded-md border border-border p-4 space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-foreground break-words">{asset.title}</div>
                          <div className="text-xs text-muted-foreground">{asset.asset_type} · {asset.platform} · {asset.publishing_status}</div>
                        </div>
                        <Pill status={safety.status}>{safety.status}</Pill>
                      </div>
                      <Textarea className="min-h-36" value={text} onChange={(e) => setEditedAssets((prev) => ({ ...prev, [asset.id]: e.target.value }))} />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => updateAsset(asset.id, { edited_content: text, safety_status: safety.status, brand_check_status: safety.status })} disabled={busy}>Save edit</Button>
                        <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(text)}><Copy className="h-4 w-4 mr-1" /> Copy</Button>
                        <Button size="sm" variant="outline" onClick={() => updateAsset(asset.id, { approval_status: "approved", safety_status: "passed", brand_check_status: "passed" })} disabled={busy || safety.status !== "passed"}><ShieldCheck className="h-4 w-4 mr-1" /> Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => updateAsset(asset.id, { publishing_status: "ready_for_manual_post" })} disabled={busy || asset.approval_status !== "approved"}><CheckCircle2 className="h-4 w-4 mr-1" /> Ready manual post</Button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Manual RGS performance</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input value={performanceForm.platform_channel} onChange={(e) => setPerformanceForm((f) => ({ ...f, platform_channel: e.target.value }))} placeholder="Channel" />
                  <Input type="date" value={performanceForm.date_range_start} onChange={(e) => setPerformanceForm((f) => ({ ...f, date_range_start: e.target.value }))} />
                  <Input type="date" value={performanceForm.date_range_end} onChange={(e) => setPerformanceForm((f) => ({ ...f, date_range_end: e.target.value }))} />
                  <Input value={performanceForm.clicks} onChange={(e) => setPerformanceForm((f) => ({ ...f, clicks: e.target.value }))} placeholder="Clicks" />
                  <Input value={performanceForm.scorecard_starts} onChange={(e) => setPerformanceForm((f) => ({ ...f, scorecard_starts: e.target.value }))} placeholder="Scorecard starts" />
                  <Input value={performanceForm.scorecard_completions} onChange={(e) => setPerformanceForm((f) => ({ ...f, scorecard_completions: e.target.value }))} placeholder="Scorecard completions" />
                  <Input value={performanceForm.diagnostic_inquiries} onChange={(e) => setPerformanceForm((f) => ({ ...f, diagnostic_inquiries: e.target.value }))} placeholder="Diagnostic inquiries" />
                  <Input value={performanceForm.conversions_leads} onChange={(e) => setPerformanceForm((f) => ({ ...f, conversions_leads: e.target.value }))} placeholder="Leads" />
                </div>
                <Textarea value={performanceForm.notes} onChange={(e) => setPerformanceForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Manual learning notes" />
                <Button variant="secondary" onClick={recordPerformance} disabled={busy}>Save manual performance</Button>
              </div>
            </section>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
