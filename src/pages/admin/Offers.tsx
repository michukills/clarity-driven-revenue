import { useEffect, useMemo, useState } from "react";
import { Loader2, Copy, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RgsPricingReferencePanel from "@/components/admin/RgsPricingReferencePanel";

type OfferRow = {
  id: string;
  slug: string;
  name: string;
  offer_type: string;
  billing_type: string;
  payment_lane: string;
  visibility: string;
  is_active: boolean;
  price_cents: number;
  currency: string;
  current_uses: number;
  max_uses: number | null;
  public_description: string | null;
  internal_admin_notes: string | null;
  stripe_lookup_key: string | null;
  created_at: string;
};

type TaxMode = "tax_not_configured" | "stripe_tax_enabled" | "manual_review_required";

const TYPE_LABELS: Record<string, string> = {
  diagnostic: "Diagnostic",
  implementation: "Implementation",
  revenue_control_system: "Revenue Control System",
  add_on: "Add-on",
  custom_manual: "Custom / Manual",
};

export default function AdminOffers() {
  const { toast } = useToast();
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [taxMode, setTaxMode] = useState<TaxMode>("tax_not_configured");
  const [showNew, setShowNew] = useState(false);

  const [draft, setDraft] = useState({
    slug: "",
    name: "",
    offer_type: "add_on",
    billing_type: "one_time",
    payment_lane: "existing_client",
    visibility: "private",
    price_cents: 0,
    public_description: "",
    internal_admin_notes: "",
  });

  async function refresh() {
    setLoading(true);
    const [oRes, sRes] = await Promise.all([
      supabase.from("offers").select("*").order("created_at", { ascending: false }),
      supabase.from("app_payment_settings").select("tax_mode").maybeSingle(),
    ]);
    if (oRes.error) toast({ title: "Failed to load offers", description: oRes.error.message, variant: "destructive" });
    setOffers((oRes.data ?? []) as OfferRow[]);
    if (sRes.data?.tax_mode) setTaxMode(sRes.data.tax_mode as TaxMode);
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, OfferRow[]>();
    for (const o of offers) {
      const arr = m.get(o.offer_type) ?? [];
      arr.push(o);
      m.set(o.offer_type, arr);
    }
    return m;
  }, [offers]);

  async function toggleActive(o: OfferRow) {
    const { error } = await supabase.from("offers").update({ is_active: !o.is_active }).eq("id", o.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    await refresh();
  }

  async function createOffer() {
    if (!draft.slug || !draft.name || draft.price_cents < 0) {
      return toast({ title: "Missing fields", description: "Slug, name, and price are required.", variant: "destructive" });
    }
    const { error } = await supabase.from("offers").insert({
      slug: draft.slug.toLowerCase().replace(/[^a-z0-9_]+/g, "_"),
      name: draft.name,
      offer_type: draft.offer_type as any,
      billing_type: draft.billing_type as any,
      payment_lane: draft.payment_lane as any,
      visibility: draft.visibility as any,
      price_cents: Math.round(draft.price_cents),
      currency: "usd",
      public_description: draft.public_description || null,
      internal_admin_notes: draft.internal_admin_notes || null,
    });
    if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    setShowNew(false);
    setDraft({ ...draft, slug: "", name: "", price_cents: 0, public_description: "", internal_admin_notes: "" });
    toast({ title: "Offer created" });
    await refresh();
  }

  async function updateTaxMode(next: TaxMode) {
    setTaxMode(next);
    const { error } = await supabase
      .from("app_payment_settings")
      .update({ tax_mode: next })
      .eq("id", true);
    if (error) toast({ title: "Tax mode update failed", description: error.message, variant: "destructive" });
    else toast({ title: "Tax mode saved" });
  }

  function copyPublicLink(o: OfferRow) {
    if (o.visibility !== "public" || o.payment_lane !== "public_non_client") {
      toast({ title: "No public link", description: "Only public, non-client offers have a public checkout link.", variant: "destructive" });
      return;
    }
    const url = `${window.location.origin}/diagnostic-apply?offer=${o.slug}`;
    void navigator.clipboard.writeText(url);
    toast({ title: "Public link copied" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Offers & Pricing</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Server-controlled offers used by the diagnostic checkout, existing-client
              payment links, recurring subscriptions, and admin-created custom offers.
              Frontend never sets price.
            </p>
          </div>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" /> New offer
          </Button>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 mb-8">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Tax mode</div>
          <div className="flex flex-wrap gap-2">
            {([
              { v: "tax_not_configured", label: "Not configured" },
              { v: "stripe_tax_enabled", label: "Stripe Tax enabled" },
              { v: "manual_review_required", label: "Manual review" },
            ] as { v: TaxMode; label: string }[]).map((t) => (
              <button
                key={t.v}
                onClick={() => updateTaxMode(t.v)}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  taxMode === t.v ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Historical orders preserve their original subtotal/tax/total regardless of this setting.
          </p>
        </div>

        <RgsPricingReferencePanel />

        {showNew && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-8 space-y-3">
            <h3 className="text-sm font-medium">New offer</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="Slug (e.g. extra_location_review)" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
              <Input placeholder="Display name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <select className="bg-background border border-border rounded-md px-3 py-2 text-sm" value={draft.offer_type} onChange={(e) => setDraft({ ...draft, offer_type: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select className="bg-background border border-border rounded-md px-3 py-2 text-sm" value={draft.billing_type} onChange={(e) => setDraft({ ...draft, billing_type: e.target.value })}>
                <option value="one_time">One-time</option>
                <option value="recurring_monthly">Recurring monthly</option>
                <option value="deposit">Deposit</option>
                <option value="manual_invoice">Manual invoice</option>
              </select>
              <select className="bg-background border border-border rounded-md px-3 py-2 text-sm" value={draft.payment_lane} onChange={(e) => setDraft({ ...draft, payment_lane: e.target.value })}>
                <option value="existing_client">Existing-client lane</option>
                <option value="public_non_client">Public / non-client lane</option>
              </select>
              <select className="bg-background border border-border rounded-md px-3 py-2 text-sm" value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value })}>
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
              <Input type="number" placeholder="Price in cents (e.g. 250000 = $2,500)" value={draft.price_cents || ""} onChange={(e) => setDraft({ ...draft, price_cents: Number(e.target.value) })} />
            </div>
            <Textarea placeholder="Public description (optional)" value={draft.public_description} onChange={(e) => setDraft({ ...draft, public_description: e.target.value })} />
            <Textarea placeholder="Internal admin notes (optional)" value={draft.internal_admin_notes} onChange={(e) => setDraft({ ...draft, internal_admin_notes: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button onClick={createOffer}>Create offer</Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([type, list]) => (
              <section key={type}>
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
                  {TYPE_LABELS[type] ?? type}
                </h2>
                <div className="space-y-3">
                  {list.map((o) => (
                    <div key={o.id} className="bg-card border border-border rounded-2xl p-5 flex flex-wrap items-start gap-4 justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-medium">{o.name}</h3>
                          <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground">{o.slug}</span>
                          <span className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${o.visibility === "public" ? "border-sky-500/30 text-sky-300 bg-sky-500/10" : "border-border text-muted-foreground"}`}>{o.visibility}</span>
                          <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground">{o.billing_type.replace(/_/g, " ")}</span>
                          <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground">{o.payment_lane.replace(/_/g, " ")}</span>
                          {!o.is_active && <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-red-500/30 text-red-300 bg-red-500/10">inactive</span>}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          ${(o.price_cents / 100).toLocaleString()} {o.currency.toUpperCase()} · {o.current_uses} uses{o.max_uses ? ` / ${o.max_uses}` : ""}
                        </div>
                        {o.public_description && <p className="text-sm text-foreground/80 mt-2 max-w-2xl">{o.public_description}</p>}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Button size="sm" variant="outline" onClick={() => toggleActive(o)}>
                          {o.is_active ? <ToggleRight className="w-4 h-4 mr-1.5" /> : <ToggleLeft className="w-4 h-4 mr-1.5" />}
                          {o.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        {o.visibility === "public" && o.payment_lane === "public_non_client" && (
                          <Button size="sm" variant="ghost" onClick={() => copyPublicLink(o)}>
                            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy public link
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {offers.length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
                No offers yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
