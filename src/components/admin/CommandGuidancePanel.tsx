import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardCheck, Sparkles, HeartPulse, Inbox, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin-only "what needs attention next" guidance band. Reads existing safe
 * signals (report drafts, AI status, client health) and renders calm,
 * scan-friendly counts. Never exposes internal notes or AI draft content.
 */
export function CommandGuidancePanel() {
  const [reportsNeedingReview, setReportsNeedingReview] = useState(0);
  const [aiDraftsNeedingReview, setAiDraftsNeedingReview] = useState(0);
  const [healthAttention, setHealthAttention] = useState(0);
  const [renewalAtRisk, setRenewalAtRisk] = useState(0);
  const [openServiceRequests, setOpenServiceRequests] = useState(0);
  const [walkthroughsPending, setWalkthroughsPending] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [
        { count: reportCount },
        { count: aiCount },
        { count: hCount },
        { count: rCount },
        srRes,
        wRes,
      ] = await Promise.all([
        supabase.from("report_drafts").select("id", { count: "exact", head: true }).eq("status", "needs_review"),
        supabase.from("report_drafts").select("id", { count: "exact", head: true }).eq("ai_status", "needs_review"),
        supabase.from("client_health_records").select("id", { count: "exact", head: true })
          .eq("attention_needed", true).is("archived_at", null),
        supabase.from("client_health_records").select("id", { count: "exact", head: true })
          .in("renewal_risk_level", ["high", "critical"] as never).is("archived_at", null),
        (supabase as any).from("service_requests").select("id", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]).then((x: any) => x, () => ({ count: 0 })),
        supabase.from("tool_walkthrough_videos").select("id", { count: "exact", head: true })
          .neq("video_status", "approved").is("archived_at", null),
      ]);
      if (cancelled) return;
      setReportsNeedingReview(reportCount ?? 0);
      setAiDraftsNeedingReview(aiCount ?? 0);
      setHealthAttention(hCount ?? 0);
      setRenewalAtRisk(rCount ?? 0);
      setOpenServiceRequests(srRes?.count ?? 0);
      setWalkthroughsPending(wRes?.count ?? 0);
    })().catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="mb-8 rounded-xl border border-border bg-card p-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        RGS Command Center
      </div>
      <h2 className="mt-1 text-lg text-foreground">Today's operating priorities</h2>
      <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
        A calm overview of what needs review, approval, or follow-up across the OS.
        Counts come from existing review queues — no client-facing surfaces are bypassed,
        and no client data is exposed here.
      </p>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <GuidanceTile
          icon={ClipboardCheck}
          label="Reports needing approval"
          count={reportsNeedingReview}
          href="/admin/report-drafts"
        />
        <GuidanceTile
          icon={Sparkles}
          label="AI drafts needing review"
          count={aiDraftsNeedingReview}
          href="/admin/report-drafts"
        />
        <GuidanceTile
          icon={HeartPulse}
          label="Client health: attention needed"
          count={healthAttention}
          href="/admin/client-health"
        />
        <GuidanceTile
          icon={HeartPulse}
          label="Renewal risk: high / critical"
          count={renewalAtRisk}
          href="/admin/client-health"
        />
        <GuidanceTile
          icon={Inbox}
          label="Open client requests"
          count={openServiceRequests}
          href="/admin/service-requests"
        />
        <GuidanceTile
          icon={Wrench}
          label="Walkthroughs not yet approved"
          count={walkthroughsPending}
          href="/admin/walkthrough-videos"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        <QuickLink to="/admin/customers">Customers</QuickLink>
        <QuickLink to="/admin/report-drafts">Report Drafts</QuickLink>
        <QuickLink to="/admin/client-health">Client Health</QuickLink>
        <QuickLink to="/admin/industry-brain">Industry Brain</QuickLink>
        <QuickLink to="/admin/tool-catalog">Tool Library</QuickLink>
        <QuickLink to="/admin/walkthrough-videos">Walkthrough Videos</QuickLink>
      </div>
    </section>
  );
}

function GuidanceTile({
  icon: Icon,
  label,
  count,
  href,
}: {
  icon: any;
  label: string;
  count: number;
  href: string;
}) {
  const tone = count > 0 ? "border-primary/30 bg-primary/[0.06]" : "border-border bg-card";
  return (
    <Link to={href} className={`rounded-lg border p-4 hover:opacity-95 transition-opacity ${tone}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <div className="mt-2 text-2xl text-foreground tabular-nums font-light">{count}</div>
      <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary">
        Review <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

function QuickLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
    >
      {children}
    </Link>
  );
}