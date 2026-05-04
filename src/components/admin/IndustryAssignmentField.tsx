// P32.2 — Admin industry assignment control on the customer detail page.
// Combines industry assignment, admin confirmation, "needs review" flag,
// confidence, verification notes, and a confirmation prompt when changing
// an already-verified industry. Writes:
//   * customers.industry
//   * customers.industry_confirmed_by_admin
//   * customers.industry_assigned_at / industry_assigned_by
//   * customers.needs_industry_review / industry_review_notes
// And appends a row to industry_assignment_audit.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, ShieldCheck, Loader2, Flag, ShieldAlert, Sparkles } from "lucide-react";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import { classifyIndustry, shouldApplyClassification, type ClassifierResult } from "@/lib/industries/classifier";

interface Props {
  customerId: string;
  onChanged?: () => void;
}

const OPTIONS: { value: IndustryCategory; label: string }[] = [
  { value: "trade_field_service", label: "Trade / field service" },
  { value: "retail", label: "Retail" },
  { value: "restaurant", label: "Restaurant" },
  { value: "mmj_cannabis", label: "MMJ / cannabis" },
  { value: "general_service", label: "General service" },
  { value: "other", label: "Other" },
];

export function IndustryAssignmentField({ customerId, onChanged }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [industry, setIndustry] = useState<IndustryCategory | "">("");
  const [confirmed, setConfirmed] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [intakeValue, setIntakeValue] = useState<string | null>(null);
  const [intakeSource, setIntakeSource] = useState<string | null>(null);
  const [assignedAt, setAssignedAt] = useState<string | null>(null);
  const [assignedByLabel, setAssignedByLabel] = useState<string | null>(null);
  const [original, setOriginal] = useState<IndustryCategory | null>(null);
  const [originalConfirmed, setOriginalConfirmed] = useState(false);
  const [originalNeedsReview, setOriginalNeedsReview] = useState(false);
  const [originalReviewNotes, setOriginalReviewNotes] = useState("");
  const [suggestion, setSuggestion] = useState<ClassifierResult | null>(null);
  const [canApplySuggestion, setCanApplySuggestion] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select(
        "industry, industry_confirmed_by_admin, industry_assigned_at, industry_assigned_by, needs_industry_review, industry_review_notes, industry_intake_value, industry_intake_source, business_name, business_description, service_type",
      )
      .eq("id", customerId)
      .maybeSingle();
    if (error) toast.error(error.message);
    const d: any = data;
    setIndustry(((d?.industry as IndustryCategory) ?? "") || "");
    setConfirmed(!!d?.industry_confirmed_by_admin);
    setOriginalConfirmed(!!d?.industry_confirmed_by_admin);
    setNeedsReview(!!d?.needs_industry_review);
    setReviewNotes(d?.industry_review_notes ?? "");
    setOriginalNeedsReview(!!d?.needs_industry_review);
    setOriginalReviewNotes(d?.industry_review_notes ?? "");
    setIntakeValue(d?.industry_intake_value ?? null);
    setIntakeSource(d?.industry_intake_source ?? null);
    setAssignedAt(d?.industry_assigned_at ?? null);
    setOriginal((d?.industry as IndustryCategory) ?? null);

    // Deterministic classifier suggestion (admin-only). Never auto-applies.
    const result = classifyIndustry({
      business_name: d?.business_name ?? null,
      business_description: d?.business_description ?? null,
      service_type: d?.service_type ?? null,
      notes: d?.industry_review_notes ?? null,
    });
    setSuggestion(result);
    setCanApplySuggestion(
      shouldApplyClassification({
        current_industry: (d?.industry as IndustryCategory | null) ?? null,
        industry_confirmed_by_admin: !!d?.industry_confirmed_by_admin,
        result,
      }),
    );

    if (d?.industry_assigned_by) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", d.industry_assigned_by)
        .maybeSingle();
      setAssignedByLabel((prof as any)?.full_name || (prof as any)?.email || null);
    } else {
      setAssignedByLabel(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const persist = async (opts: { confirm: boolean; markNeedsReview?: boolean | null }) => {
    if (!industry && !opts.markNeedsReview) {
      toast.error("Pick an industry or mark as needs review.");
      return;
    }
    // If changing the industry on a previously-verified record, require explicit confirmation.
    if (originalConfirmed && industry && industry !== original) {
      const ok = window.confirm(
        "This customer's industry was previously verified. Changing it will reset confirmation, lower confidence, and may restrict industry-specific tools until re-verified. Continue?",
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
      const willConfirm = opts.confirm === true && !!industry;
      // Reset snapshot verification if industry changed on an already-verified record.
      const industryChanged = !!industry && industry !== original;
      const update: any = {
        industry: industry || null,
        industry_confirmed_by_admin: willConfirm,
        industry_assigned_at: industry ? new Date().toISOString() : null,
        industry_assigned_by: industry ? userId : null,
        needs_industry_review:
          opts.markNeedsReview === true
            ? true
            : opts.markNeedsReview === false
              ? false
              : willConfirm
                ? false
                : needsReview,
        industry_review_notes: reviewNotes || null,
      };
      const { error: updErr } = await supabase
        .from("customers")
        .update(update)
        .eq("id", customerId);
      if (updErr) throw updErr;

      const { error: audErr } = await supabase.from("industry_assignment_audit").insert({
        customer_id: customerId,
        previous_industry: original,
        new_industry: industry || null,
        source: "admin",
        changed_by: userId,
      } as any);
      if (audErr) throw audErr;

      // If industry changed, reset snapshot verification so tool-access
      // enforcement requires re-verification under the new industry.
      if (industryChanged) {
        await supabase
          .from("client_business_snapshots")
          .update({
            snapshot_status: "draft",
            industry_verified: false,
            industry_confidence: "unverified",
            industry_verified_at: null,
            industry_verified_by: null,
          } as any)
          .eq("customer_id", customerId);
      }

      toast.success(
        opts.markNeedsReview ? "Marked needs industry review" : willConfirm ? "Industry confirmed" : "Industry saved",
      );
      await load();
      onChanged?.();
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
  const isMmj = industry === "mmj_cannabis";
  const isMissing = !industry;
  const dirty =
    industry !== original ||
    confirmed !== originalConfirmed ||
    needsReview !== originalNeedsReview ||
    reviewNotes !== originalReviewNotes;

  const sourceLabel = originalConfirmed
    ? "admin-confirmed"
    : intakeValue
      ? "user-selected (intake, unconfirmed)"
      : original
        ? "rule-inferred (unconfirmed)"
        : "unset";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {confirmed && !needsReview ? (
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> Confirmed
          </span>
        ) : needsReview ? (
          <span className="inline-flex items-center gap-1 text-amber-300">
            <Flag className="h-3 w-3" /> Needs review
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-400">
            <AlertTriangle className="h-3 w-3" /> Unconfirmed
          </span>
        )}
        {assignedAt && (
          <span className="text-muted-foreground">
            · {confirmed ? "Confirmed" : "Updated"} {new Date(assignedAt).toLocaleDateString()}
            {assignedByLabel ? ` by ${assignedByLabel}` : ""}
          </span>
        )}
      </div>

      {(intakeValue || intakeSource) && (
        <div className="text-[11px] text-muted-foreground">
          Intake said: <span className="text-foreground">{intakeValue ?? "—"}</span>
          {intakeSource ? <span> (from {intakeSource})</span> : null} — not treated as confirmed.
        </div>
      )}

      <div className="text-[11px] text-muted-foreground">
        Source of truth: <span className="text-foreground">{sourceLabel}</span>
      </div>

      {suggestion ? (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-[11px]">
            <Sparkles className="h-3 w-3 text-accent" />
            <span className="text-muted-foreground">Classifier suggestion</span>
            <span className="text-foreground font-medium">
              {OPTIONS.find((o) => o.value === suggestion.inferred_industry)?.label ?? suggestion.inferred_industry}
            </span>
            <span className="text-muted-foreground">
              · confidence {(suggestion.confidence * 100).toFixed(0)}%
            </span>
            {suggestion.needs_admin_review ? (
              <span className="text-amber-300">· needs admin review</span>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {suggestion.rationale}
          </p>
          {originalConfirmed ? (
            <p className="text-[11px] text-emerald-400">
              Admin-confirmed industry will not be silently overwritten.
            </p>
          ) : canApplySuggestion && suggestion.inferred_industry !== industry ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIndustry(suggestion.inferred_industry)}
              disabled={saving}
            >
              Use suggestion
            </Button>
          ) : null}
        </div>
      ) : null}

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

      <textarea
        value={reviewNotes}
        onChange={(e) => setReviewNotes(e.target.value)}
        rows={2}
        placeholder="Verification notes (what was confirmed, what evidence, by whom)"
        className="w-full bg-muted/40 border border-border rounded-md px-2 py-1.5 text-[12px] text-foreground resize-none"
      />

      {(isOther || isMissing || !confirmed || needsReview) && (
        <p className="text-[11px] text-amber-400 leading-snug">
          Industry-specific tools and learning are restricted until industry is confirmed.
        </p>
      )}
      {isMmj && (
        <p className="text-[11px] text-amber-300 leading-snug inline-flex items-start gap-1">
          <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
          Regulated industry (MMJ/cannabis): require admin-approved generalization before any cross-industry reuse.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => persist({ confirm: false })}
          disabled={saving || (isMissing && !needsReview)}
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => persist({ confirm: false, markNeedsReview: true })}
          disabled={saving}
        >
          <Flag className="h-3.5 w-3.5 mr-1" /> Mark needs review
        </Button>
        <Button
          size="sm"
          onClick={() => persist({ confirm: true, markNeedsReview: false })}
          disabled={saving || isMissing}
        >
          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
          {confirmed && !dirty ? "Confirmed" : "Confirm industry"}
        </Button>
      </div>
    </div>
  );
}
