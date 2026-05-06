/**
 * P88 — Client portal "One Next Best Action" card.
 *
 * Aggregates the small set of inputs needed by the deterministic engine
 * in `@/lib/nextBestAction` and renders exactly one calm, premium card.
 * Reads use only client-safe RPCs / RLS-scoped tables. No admin-only
 * data is fetched. No fake automation copy.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getEmailConsentStatus } from "@/lib/emailConsent";
import { getClientSlotsForCustomer } from "@/lib/evidenceVaultSlots";
import { getClientTimelineStages } from "@/lib/diagnosticTimeline";
import {
  pickNextBestAction,
  type NextBestAction,
} from "@/lib/nextBestAction";
import { CLIENT_SAFE_REPORT_SELECT } from "@/lib/reports/clientSafeReportFields";

export function NextBestActionCard({ customerId }: { customerId: string }) {
  const { user } = useAuth();
  const [action, setAction] = useState<NextBestAction | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [consent, slots, stages, repRes] = await Promise.all([
          user?.email
            ? getEmailConsentStatus({ userId: user.id, email: user.email }).catch(() => null)
            : Promise.resolve(null),
          getClientSlotsForCustomer(customerId).catch(() => []),
          getClientTimelineStages(customerId).catch(() => []),
          supabase
            .from("business_control_reports")
            .select(CLIENT_SAFE_REPORT_SELECT)
            .eq("customer_id", customerId)
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(1),
        ]);
        const consentActive =
          (consent as any)?.consent_status === "active" &&
          (consent as any)?.unsubscribe_status === "subscribed";
        const vaultOpen = (stages || []).some(
          (s: any) =>
            ["evidence_vault_opens", "evidence_reminder"].includes(s.stage_key) &&
            s.status !== "completed",
        );
        const awaitingAdminReview = (stages || []).some(
          (s: any) => s.stage_key === "rgs_review" && s.status !== "completed",
        );
        const next = pickNextBestAction({
          consentActive,
          vaultOpen,
          evidenceSlots: (slots || []).map((s: any) => ({
            slot_key: s.slot_key,
            status: s.status,
          })),
          timelineStages: (stages || []).map((s: any) => ({
            stage_key: s.stage_key,
            status: s.status,
            client_relevant: true,
          })),
          reportReady: !!(repRes?.data && repRes.data[0]),
          awaitingAdminReview,
        });
        if (!cancelled) setAction(next);
      } catch {
        if (!cancelled)
          setAction({
            key: "none",
            title: "No action needed right now",
            body: "You are caught up. RGS will surface the next step here when it appears.",
            href: null,
            priority: 9,
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, user?.id, user?.email]);

  if (!action) return null;

  const inner = (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-5 h-full">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Compass className="h-3.5 w-3.5 text-primary" />
        Your next step
      </div>
      <div className="text-sm text-foreground mt-2 leading-snug font-medium">
        {action.title}
      </div>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        {action.body}
      </p>
      {action.href && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
          Open <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );

  return (
    <section className="mb-6 min-w-0" data-testid="next-best-action-card">
      {action.href ? (
        <Link to={action.href} className="block hover:opacity-95 transition-opacity">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </section>
  );
}