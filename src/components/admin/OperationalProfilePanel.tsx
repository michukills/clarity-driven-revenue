// P18 — Admin-only Operational Profile panel.
// Captures structured diagnostic operating data the OS otherwise lacks:
// monthly leads, close rate, average ticket, gross margin, AR, owner hours,
// team size, capacity, change readiness, implementation capacity,
// decision bottleneck, accountable owner, preferred cadence, biggest
// constraint, failure risks. RLS keeps this admin-only.
//
// All edits write to public.customer_operational_profile.
// Never surfaced to clients in the portal.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save, ShieldAlert, Lock } from "lucide-react";

type Profile = {
  monthly_leads: number | null;
  monthly_close_rate_pct: number | null;
  average_ticket_usd: number | null;
  monthly_revenue_usd: number | null;
  gross_margin_pct: number | null;
  ar_open_usd: number | null;
  owner_hours_per_week: number | null;
  team_size: number | null;
  crew_or_job_capacity: string | null;
  accountable_owner_name: string | null;
  accountable_owner_role: string | null;
  biggest_constraint: string | null;
  owner_urgency: string | null;
  change_readiness: string | null;
  implementation_capacity: string | null;
  decision_bottleneck: string | null;
  implementation_failure_risk: string | null;
  preferred_cadence: string | null;
  preferred_channel: string | null;
  admin_notes: string | null;
};

const EMPTY: Profile = {
  monthly_leads: null,
  monthly_close_rate_pct: null,
  average_ticket_usd: null,
  monthly_revenue_usd: null,
  gross_margin_pct: null,
  ar_open_usd: null,
  owner_hours_per_week: null,
  team_size: null,
  crew_or_job_capacity: null,
  accountable_owner_name: null,
  accountable_owner_role: null,
  biggest_constraint: null,
  owner_urgency: null,
  change_readiness: null,
  implementation_capacity: null,
  decision_bottleneck: null,
  implementation_failure_risk: null,
  preferred_cadence: null,
  preferred_channel: null,
  admin_notes: null,
};

const URGENCY = ["", "low", "medium", "high", "critical"];
const READINESS = ["", "low", "medium", "high"];
const CADENCE = ["", "weekly", "biweekly", "monthly", "adhoc"];
const CHANNEL = ["", "email", "phone", "sms", "portal", "meeting"];

export function OperationalProfilePanel({ customerId }: { customerId: string }) {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("customer_operational_profile")
        .select("*")
        .eq("customer_id", customerId)
        .maybeSingle();
      if (cancelled) return;
      if (data) setProfile({ ...EMPTY, ...(data as any) });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setProfile((p) => ({ ...p, [k]: v }));

  const numOrNull = (v: string) => (v === "" ? null : Number(v));

  const save = async () => {
    setSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
      const payload = {
        customer_id: customerId,
        ...profile,
        updated_by: userId,
      };
      const { error } = await supabase
        .from("customer_operational_profile")
        .upsert(payload as any, { onConflict: "customer_id" });
      if (error) throw error;
      toast.success("Operational profile saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Operational profile
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Structured diagnostic operating data. Feeds the priority engine and roadmap.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
          Admin-only
        </span>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 mb-4 flex items-start gap-2 text-[11px] text-amber-200">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Never visible to clients. Do not include hidden recommendations or
          unreleased findings here.
        </span>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Monthly leads">
            <Input type="number" value={profile.monthly_leads ?? ""} onChange={(e) => set("monthly_leads", numOrNull(e.target.value))} />
          </Field>
          <Field label="Close rate (%)">
            <Input type="number" step="0.1" value={profile.monthly_close_rate_pct ?? ""} onChange={(e) => set("monthly_close_rate_pct", numOrNull(e.target.value))} />
          </Field>
          <Field label="Average ticket (USD)">
            <Input type="number" step="0.01" value={profile.average_ticket_usd ?? ""} onChange={(e) => set("average_ticket_usd", numOrNull(e.target.value))} />
          </Field>
          <Field label="Monthly revenue (USD)">
            <Input type="number" step="0.01" value={profile.monthly_revenue_usd ?? ""} onChange={(e) => set("monthly_revenue_usd", numOrNull(e.target.value))} />
          </Field>
          <Field label="Gross margin (%)">
            <Input type="number" step="0.1" value={profile.gross_margin_pct ?? ""} onChange={(e) => set("gross_margin_pct", numOrNull(e.target.value))} />
          </Field>
          <Field label="Open AR (USD)">
            <Input type="number" step="0.01" value={profile.ar_open_usd ?? ""} onChange={(e) => set("ar_open_usd", numOrNull(e.target.value))} />
          </Field>
          <Field label="Owner hours / week">
            <Input type="number" value={profile.owner_hours_per_week ?? ""} onChange={(e) => set("owner_hours_per_week", numOrNull(e.target.value))} />
          </Field>
          <Field label="Team size">
            <Input type="number" value={profile.team_size ?? ""} onChange={(e) => set("team_size", numOrNull(e.target.value))} />
          </Field>
          <Field label="Crew / job capacity">
            <Input value={profile.crew_or_job_capacity ?? ""} onChange={(e) => set("crew_or_job_capacity", e.target.value || null)} placeholder="e.g. 2 crews, 6 jobs/week" />
          </Field>
          <Field label="Accountable owner">
            <Input value={profile.accountable_owner_name ?? ""} onChange={(e) => set("accountable_owner_name", e.target.value || null)} placeholder="Name" />
          </Field>
          <Field label="Owner role">
            <Input value={profile.accountable_owner_role ?? ""} onChange={(e) => set("accountable_owner_role", e.target.value || null)} placeholder="e.g. Operations Manager" />
          </Field>
          <Field label="Owner urgency">
            <Select value={profile.owner_urgency ?? ""} onChange={(v) => set("owner_urgency", v || null)} options={URGENCY} />
          </Field>
          <Field label="Change readiness">
            <Select value={profile.change_readiness ?? ""} onChange={(v) => set("change_readiness", v || null)} options={READINESS} />
          </Field>
          <Field label="Implementation capacity">
            <Select value={profile.implementation_capacity ?? ""} onChange={(v) => set("implementation_capacity", v || null)} options={READINESS} />
          </Field>
          <Field label="Preferred cadence">
            <Select value={profile.preferred_cadence ?? ""} onChange={(v) => set("preferred_cadence", v || null)} options={CADENCE} />
          </Field>
          <Field label="Preferred channel">
            <Select value={profile.preferred_channel ?? ""} onChange={(v) => set("preferred_channel", v || null)} options={CHANNEL} />
          </Field>
          <Field label="Biggest constraint" full>
            <Textarea rows={2} value={profile.biggest_constraint ?? ""} onChange={(e) => set("biggest_constraint", e.target.value || null)} />
          </Field>
          <Field label="Decision bottleneck" full>
            <Textarea rows={2} value={profile.decision_bottleneck ?? ""} onChange={(e) => set("decision_bottleneck", e.target.value || null)} />
          </Field>
          <Field label="What would make implementation fail" full>
            <Textarea rows={2} value={profile.implementation_failure_risk ?? ""} onChange={(e) => set("implementation_failure_risk", e.target.value || null)} />
          </Field>
          <Field label="Admin notes" full>
            <Textarea rows={2} value={profile.admin_notes ?? ""} onChange={(e) => set("admin_notes", e.target.value || null)} />
          </Field>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button size="sm" onClick={save} disabled={saving || loading}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save profile
        </Button>
      </div>
    </section>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2 space-y-1" : "space-y-1"}>
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm text-foreground"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === "" ? "—" : o}
        </option>
      ))}
    </select>
  );
}
