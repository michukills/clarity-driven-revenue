import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Megaphone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import {
  clientSubmitCampaignInputs,
  getClientCampaignControl,
  splitLines,
  type CampaignControlBundle,
} from "@/lib/campaignControl/campaignControlData";
import { CampaignVideoPortalCard } from "@/components/campaignControl/CampaignVideoPortalCard";

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card/40 p-4 text-sm text-muted-foreground">{children}</div>;
}

export default function CampaignControlClient() {
  const { customerId, loading: resolvingCustomer } = usePortalCustomerId();
  const [bundle, setBundle] = useState<CampaignControlBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingInputs, setSavingInputs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputForm, setInputForm] = useState({
    businessStage: "",
    primaryOffers: "",
    targetAudiences: "",
    brandVoiceNotes: "",
    preferredCtaTypes: "",
    channelPreferences: "",
    channelRestrictions: "",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      if (resolvingCustomer) return;
      if (!customerId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getClientCampaignControl(customerId);
        if (alive) {
          setBundle(data);
          const profile = data.profile;
          if (profile) {
            setInputForm({
              businessStage: profile.business_stage ?? "",
              primaryOffers: (profile.primary_offers ?? []).join("\n"),
              targetAudiences: (profile.target_audiences ?? []).join("\n"),
              brandVoiceNotes: profile.brand_voice_notes ?? "",
              preferredCtaTypes: (profile.preferred_cta_types ?? []).join("\n"),
              channelPreferences: (profile.channel_preferences ?? []).join("\n"),
              channelRestrictions: (profile.channel_restrictions ?? []).join("\n"),
            });
          }
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [customerId, resolvingCustomer]);

  async function saveClientInputs() {
    if (!customerId) return;
    setSavingInputs(true);
    try {
      const nextBundle = await clientSubmitCampaignInputs({
        customerId,
        businessStage: inputForm.businessStage,
        primaryOffers: splitLines(inputForm.primaryOffers),
        targetAudiences: splitLines(inputForm.targetAudiences),
        brandVoiceNotes: inputForm.brandVoiceNotes,
        preferredCtaTypes: splitLines(inputForm.preferredCtaTypes),
        channelPreferences: splitLines(inputForm.channelPreferences),
        channelRestrictions: splitLines(inputForm.channelRestrictions),
      });
      setBundle(nextBundle);
      toast.success("Campaign inputs saved for RGS review");
    } catch (e) {
      toast.error("Campaign inputs could not be saved", { description: (e as Error).message });
    } finally {
      setSavingInputs(false);
    }
  }

  return (
    <PortalShell variant="customer">
      <Link to="/portal/tools" className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Tools
      </Link>

      <header className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Campaign Control</div>
        <h1 className="mt-2 text-3xl text-foreground">Approved campaign strategy and assets</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Campaign Control helps decide what to market, who to target, what message to use, and what to learn.
          It does not promise revenue, profit, growth, leads, legal, tax, accounting, valuation, or compliance outcomes.
        </p>
      </header>

      {loading ? <Empty>Loading Campaign Control…</Empty> : null}
      {error ? <Empty>Campaign Control is unavailable right now. {error}</Empty> : null}
      {!loading && !error && !bundle ? <Empty>No customer context is available for Campaign Control.</Empty> : null}

      {bundle ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <Megaphone className="mb-3 h-5 w-5 text-primary" />
              <div className="text-sm text-foreground">Approved briefs</div>
              <div className="mt-2 text-3xl text-foreground">{bundle.briefs.length}</div>
              <p className="mt-2 text-xs text-muted-foreground">Only admin-approved, client-visible briefs appear here.</p>
            </div>
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" />
              <div className="text-sm text-foreground">Approved assets</div>
              <div className="mt-2 text-3xl text-foreground">{bundle.assets.length}</div>
              <p className="mt-2 text-xs text-muted-foreground">Draft or admin-only content is not shown.</p>
            </div>
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <div className="text-sm text-foreground">Connection proof</div>
              <div className="mt-2 text-3xl text-foreground">{bundle.connection_proofs.length}</div>
              <p className="mt-2 text-xs text-muted-foreground">If no proof is listed, posting and analytics are manual-only.</p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card/40 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg text-foreground">Campaign inputs</h2>
                <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
                  Add the offer, audience, channel, and brand context RGS should use. These inputs are saved for review before any campaign draft becomes visible or usable.
                </p>
              </div>
              <Button onClick={saveClientInputs} disabled={savingInputs || !customerId} className="w-full sm:w-auto">
                {savingInputs ? "Saving…" : "Save inputs"}
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs text-muted-foreground">
                Business stage
                <Textarea
                  value={inputForm.businessStage}
                  onChange={(e) => setInputForm((prev) => ({ ...prev, businessStage: e.target.value }))}
                  placeholder="Example: steady demand, weak follow-up, hiring before scaling ads"
                  className="min-h-[84px]"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Primary offers or service lines
                <Textarea
                  value={inputForm.primaryOffers}
                  onChange={(e) => setInputForm((prev) => ({ ...prev, primaryOffers: e.target.value }))}
                  placeholder="One per line"
                  className="min-h-[84px]"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Target audiences
                <Textarea
                  value={inputForm.targetAudiences}
                  onChange={(e) => setInputForm((prev) => ({ ...prev, targetAudiences: e.target.value }))}
                  placeholder="One audience per line"
                  className="min-h-[84px]"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Preferred CTAs
                <Textarea
                  value={inputForm.preferredCtaTypes}
                  onChange={(e) => setInputForm((prev) => ({ ...prev, preferredCtaTypes: e.target.value }))}
                  placeholder="Example: book estimate, request diagnostic review, call the shop"
                  className="min-h-[84px]"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Channel preferences
                <Textarea
                  value={inputForm.channelPreferences}
                  onChange={(e) => setInputForm((prev) => ({ ...prev, channelPreferences: e.target.value }))}
                  placeholder="Example: email, Google Ads, organic social"
                  className="min-h-[84px]"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                Channel restrictions
                <Textarea
                  value={inputForm.channelRestrictions}
                  onChange={(e) => setInputForm((prev) => ({ ...prev, channelRestrictions: e.target.value }))}
                  placeholder="Example: no discounts, no auto-DMs, no compliance claims"
                  className="min-h-[84px]"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground md:col-span-2">
                Brand voice notes
                <Textarea
                  value={inputForm.brandVoiceNotes}
                  onChange={(e) => setInputForm((prev) => ({ ...prev, brandVoiceNotes: e.target.value }))}
                  placeholder="Words, tone, boundaries, and phrases the campaign should respect"
                  className="min-h-[96px]"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card/40 p-4">
            <h2 className="mb-3 text-lg text-foreground">Connection status</h2>
            {bundle.connection_proofs.length === 0 ? (
              <Empty>No live campaign or analytics connection is proven yet. Manual posting and manual tracking are available.</Empty>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {bundle.connection_proofs.map((p: any) => (
                  <div key={p.id} className="rounded-lg border border-border bg-background/30 p-3">
                    <div className="text-sm text-foreground">{p.provider} · {p.capability}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.client_safe_summary}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">Status: {p.status} · Last verified: {p.last_verified_at || p.last_sync_at || "not verified"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card/40 p-4">
            <h2 className="mb-3 text-lg text-foreground">Briefs</h2>
            {bundle.briefs.length === 0 ? (
              <Empty>No approved campaign brief is available yet.</Empty>
            ) : (
              <div className="space-y-3">
                {bundle.briefs.map((b: any) => (
                  <div key={b.id} className="rounded-lg border border-border bg-background/30 p-3">
                    <div className="text-sm text-foreground">{b.objective}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{b.target_audience} · {b.offer_service_line} · {b.channel_platform}</p>
                    <p className="mt-3 text-sm text-muted-foreground">{b.client_safe_notes}</p>
                    {b.operational_risk_warning ? (
                      <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                        {b.operational_risk_warning}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card/40 p-4">
            <h2 className="mb-3 text-lg text-foreground">Approved assets</h2>
            {bundle.assets.length === 0 ? (
              <Empty>No approved campaign assets are available yet.</Empty>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {bundle.assets.map((a: any) => (
                  <div key={a.id} className="rounded-lg border border-border bg-background/30 p-3">
                    <div className="text-sm text-foreground">{a.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.asset_type} · {a.platform} · {a.publishing_status}</p>
                    <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-border bg-card/50 p-3 text-sm text-muted-foreground">{a.content}</pre>
                    <p className="mt-3 text-xs text-muted-foreground">{a.manual_posting_instructions}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card/40 p-4">
            <h2 className="mb-3 text-lg text-foreground">Learning loop</h2>
            {bundle.learning.length === 0 ? (
              <Empty>No approved campaign learning summary is available yet. Manual performance tracking can be reviewed by RGS first.</Empty>
            ) : (
              <div className="space-y-3">
                {bundle.learning.map((l: any) => (
                  <div key={l.id} className="rounded-lg border border-border bg-background/30 p-3">
                    <div className="text-sm text-foreground">{l.summary}</div>
                    <p className="mt-2 text-xs text-muted-foreground">Next action: {l.recommended_next_action || "RGS review pending"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {customerId ? <CampaignVideoPortalCard customerId={customerId} /> : null}
        </div>
      ) : null}
    </PortalShell>
  );
}
