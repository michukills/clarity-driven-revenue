// P32.1 — Compact, persistent admin-only summary of the client business snapshot.
// Renders near the customer detail header so admins always see what the
// business does, the assigned industry, and verification state — across all
// tabs. Never shown to clients (admin-only RLS protects the underlying table).

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, ShieldCheck, ShieldAlert, Loader2, Info } from "lucide-react";
import {
  INDUSTRY_CONFIDENCE_LABELS,
  type IndustryConfidence,
} from "@/lib/clientBusinessSnapshot";
import { INDUSTRY_LABEL, type IndustryKey } from "@/lib/toolCatalog";
import { detectIndustryMismatch } from "@/lib/industryIntake";

interface Props {
  customerId: string;
}

interface SummaryData {
  what_business_does: string | null;
  products_services: string | null;
  revenue_model: string | null;
  operating_model: string | null;
  industry: IndustryKey | null;
  industry_confirmed: boolean;
  industry_confidence: IndustryConfidence;
  snapshot_status: "draft" | "admin_verified" | null;
  industry_verified: boolean;
  needs_industry_review: boolean;
}

export function ClientSnapshotSummaryBar({ customerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: c }, { data: s }] = await Promise.all([
          supabase
            .from("customers")
            .select("industry, industry_confirmed_by_admin, needs_industry_review")
            .eq("id", customerId)
            .maybeSingle(),
          supabase
            .from("client_business_snapshots")
            .select("what_business_does, products_services, revenue_model, operating_model, industry_confidence, snapshot_status, industry_verified")
            .eq("customer_id", customerId)
            .maybeSingle(),
        ]);
        if (!alive) return;
        const cust: any = c;
        const snap: any = s;
        setData({
          what_business_does: snap?.what_business_does ?? null,
          products_services: snap?.products_services ?? null,
          revenue_model: snap?.revenue_model ?? null,
          operating_model: snap?.operating_model ?? null,
          industry: (cust?.industry as IndustryKey) ?? null,
          industry_confirmed: !!cust?.industry_confirmed_by_admin,
          industry_confidence: (snap?.industry_confidence as IndustryConfidence) ?? "unverified",
          snapshot_status: (snap?.snapshot_status as any) ?? null,
          industry_verified: !!snap?.industry_verified,
          needs_industry_review: !!cust?.needs_industry_review,
        });
      } catch {
        // RLS / non-admin — render nothing.
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [customerId]);

  if (loading) {
    return (
      <div className="rounded-md border border-border bg-card/40 px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading client snapshot summary…
      </div>
    );
  }
  if (!data) return null;

  const verified = data.snapshot_status === "admin_verified" && data.industry_verified;
  const needsVerification =
    !verified ||
    !data.industry ||
    data.industry === ("other" as IndustryKey) ||
    !data.industry_confirmed ||
    data.needs_industry_review;
  const isMmj = data.industry === ("mmj_cannabis" as IndustryKey);
  const mismatch = detectIndustryMismatch({
    industry: data.industry as any,
    what_business_does: data.what_business_does,
    products_services: data.products_services,
    revenue_model: data.revenue_model,
    operating_model: data.operating_model,
  });

  return (
    <div className="rounded-md border border-border bg-card/40 px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
      <div className="flex items-center gap-1.5 min-w-0">
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground">What they do:</span>
        <span
          className={`truncate max-w-[420px] ${data.what_business_does ? "text-foreground" : "italic text-muted-foreground"}`}
          title={data.what_business_does ?? "Unknown — no recorded evidence yet"}
        >
          {data.what_business_does ?? "Unknown — no recorded evidence yet"}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Industry:</span>
        <span className="text-foreground">
          {data.industry ? INDUSTRY_LABEL[data.industry] : "Not assigned"}
        </span>
        <span className="text-[10px] text-muted-foreground">
          ({data.industry_confirmed ? "confirmed" : "unconfirmed"})
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Confidence:</span>
        <span className="text-foreground">{INDUSTRY_CONFIDENCE_LABELS[data.industry_confidence]}</span>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {verified ? (
          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
            <ShieldCheck className="h-3 w-3" /> Verified snapshot
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200">
            <AlertTriangle className="h-3 w-3" /> Needs verification
          </span>
        )}
        {mismatch.mismatch && (
          <span
            className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-200"
            title={mismatch.message ?? undefined}
          >
            <AlertTriangle className="h-3 w-3" /> Possible industry mismatch
          </span>
        )}
        {needsVerification && data.industry && data.industry !== ("other" as IndustryKey) && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-200/80">
            Industry-specific tools restricted
          </span>
        )}
        {isMmj && (
          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200">
            <ShieldAlert className="h-3 w-3" /> MMJ regulated
          </span>
        )}
      </div>
    </div>
  );
}

export default ClientSnapshotSummaryBar;