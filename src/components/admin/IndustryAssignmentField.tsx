// P16.2 — Admin industry assignment control on the customer detail page.
// Writes customers.industry, sets industry_confirmed_by_admin = true,
// and appends an industry_assignment_audit row.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

interface Props {
  customerId: string;
}

const OPTIONS: { value: IndustryCategory; label: string }[] = [
  { value: "trade_field_service", label: "Trade / field service" },
  { value: "retail", label: "Retail" },
  { value: "restaurant", label: "Restaurant" },
  { value: "mmj_cannabis", label: "MMJ / cannabis" },
  { value: "general_service", label: "General service" },
  { value: "other", label: "Other" },
];

export function IndustryAssignmentField({ customerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industry, setIndustry] = useState<IndustryCategory | "">("");
  const [confirmed, setConfirmed] = useState(false);
  const [original, setOriginal] = useState<IndustryCategory | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("industry, industry_confirmed_by_admin")
      .eq("id", customerId)
      .maybeSingle();
    if (error) toast.error(error.message);
    setIndustry(((data?.industry as IndustryCategory) ?? "") || "");
    setConfirmed(!!data?.industry_confirmed_by_admin);
    setOriginal((data?.industry as IndustryCategory) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [customerId]);

  const save = async () => {
    if (!industry) return;
    setSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
      const { error: updErr } = await supabase
        .from("customers")
        .update({
          industry,
          industry_confirmed_by_admin: true,
          industry_assigned_at: new Date().toISOString(),
          industry_assigned_by: userId,
        })
        .eq("id", customerId);
      if (updErr) throw updErr;

      const { error: audErr } = await supabase.from("industry_assignment_audit").insert({
        customer_id: customerId,
        previous_industry: original,
        new_industry: industry,
        source: "admin",
        changed_by: userId,
      });
      if (audErr) throw audErr;

      toast.success("Industry saved");
      setOriginal(industry as IndustryCategory);
      setConfirmed(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save industry");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading industry…</div>;
  }

  const isOther = industry === "other";
  const dirty = industry !== original;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px]">
        {confirmed ? (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> Confirmed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-400">
            <AlertTriangle className="h-3 w-3" /> Unconfirmed (inferred)
          </span>
        )}
      </div>
      <select
        value={industry}
        onChange={(e) => setIndustry(e.target.value as IndustryCategory)}
        className="w-full bg-muted/40 border border-border rounded-md px-2 py-1.5 text-sm text-foreground"
      >
        <option value="" disabled>
          Select industry…
        </option>
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {isOther ? (
        <p className="text-[11px] text-amber-400 leading-snug">
          Learning and roadmap features may be limited until industry is confirmed.
        </p>
      ) : null}
      <Button
        size="sm"
        onClick={save}
        disabled={!industry || saving || (!dirty && confirmed)}
        className="w-full"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {confirmed && !dirty ? "Confirmed" : "Save industry"}
      </Button>
    </div>
  );
}