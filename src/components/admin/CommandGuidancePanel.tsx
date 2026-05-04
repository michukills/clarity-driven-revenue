import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ClipboardCheck,
  Sparkles,
  HeartPulse,
  Inbox,
  Wrench,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin-only RGS Command Center band. Surfaces the items that need review,
 * approval, client follow-up, or cleanup before the system moves forward.
 * Reads existing safe signals only — never exposes internal notes, admin
 * notes, raw AI draft content, or any client-facing surface bypass.
 */
export function CommandGuidancePanel() {
  const [reportsNeedingReview, setReportsNeedingReview] = useState(0);
  const [aiDraftsNeedingReview, setAiDraftsNeedingReview] = useState(0);
  const [healthAttention, setHealthAttention] = useState(0);
  const [renewalAtRisk, setRenewalAtRisk] = useState(0);
  const [openServiceRequests, setOpenServiceRequests] = useState(0);
  const [walkthroughsPending, setWalkthroughsPending] = useState(0);
  const [loaded, setLoaded] = useState(false);

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
        (supabase as any).from("client_service_requests").select("id", { count: "exact", head: true })
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
      setLoaded(true);
    })().catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const priorities: PriorityItem[] = [
    {
      key: "reports",
      icon: ClipboardCheck,
      title: "Report waiting for approval",
      meaning:
        "A client-facing report draft is ready for human review. It should not be published until an admin approves the language and scope.",
      count: reportsNeedingReview,
      ctaLabel: "Review report drafts",
      href: "/admin/report-drafts",
    },
    {
      key: "ai",
      icon: Sparkles,
      title: "AI draft waiting on human review",
      meaning:
        "AI helped draft sections, but RGS decides what becomes client-visible. Read the draft, edit, and approve before anything reaches the client.",
      count: aiDraftsNeedingReview,
      ctaLabel: "Check AI drafts",
      href: "/admin/report-drafts",
    },
    {
      key: "renewal",
      icon: ShieldAlert,
      title: "High-risk account signal",
      meaning:
        "One or more accounts are flagged high or critical for renewal risk. Look at the account before assuming the relationship is stable.",
      count: renewalAtRisk,
      ctaLabel: "Review renewal risk",
      href: "/admin/client-health",
      severity: "critical",
    },
    {
      key: "health",
      icon: HeartPulse,
      title: "Client health signal needs review",
      meaning:
        "An active client record is marked attention-needed. Decide whether the client needs clarification, a follow-up, or a next-step offer.",
      count: healthAttention,
      ctaLabel: "Open client health",
      href: "/admin/client-health",
    },
    {
      key: "requests",
      icon: Inbox,
      title: "Open client requests",
      meaning:
        "Clients have submitted requests through the portal that are still open or in progress. Respond before they assume the system stalled.",
      count: openServiceRequests,
      ctaLabel: "Answer client requests",
      href: "/admin/service-requests",
    },
    {
      key: "walkthroughs",
      icon: Wrench,
      title: "Walkthroughs need publishing work",
      meaning:
        "Some tools are usable but the recorded walkthrough or transcript is not approved yet. Finish the guidance so the client experience feels complete.",
      count: walkthroughsPending,
      ctaLabel: "Manage walkthroughs",
      href: "/admin/walkthrough-videos",
    },
  ];

  const active = priorities.filter((p) => p.count > 0);
  const quiet = priorities.filter((p) => p.count === 0);

  return (
    <section className="mb-8 rounded-xl border border-border bg-card">
      <header className="px-5 pt-5 pb-4 border-b border-border/60">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/80">
          RGS Command Center
        </div>
        <h2 className="mt-1 text-xl font-serif text-foreground">
          Start here.
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
          These are the items that need review, approval, client follow-up, or
          cleanup before the system moves forward. Handle the items that affect
          access, reports, or client next steps first.
        </p>
        <p className="mt-2.5 text-[11px] text-muted-foreground/80 max-w-2xl">
          Client-facing surfaces are not bypassed from this page. Internal
          notes, AI drafts, and admin-only decisions stay admin-only until
          approved.
        </p>
      </header>

      <div className="px-5 py-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Today's priority lane
        </div>

        {!loaded ? (
          <div className="text-sm text-muted-foreground">Loading current signals…</div>
        ) : active.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-2.5">
            {active.map((p) => (
              <PriorityRow key={p.key} item={p} />
            ))}
          </ul>
        )}

        {loaded && quiet.length > 0 && active.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border/60">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Currently clear
            </div>
            <div className="flex flex-wrap gap-2">
              {quiet.map((p) => (
                <span
                  key={p.key}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border/60 rounded-md px-2 py-1"
                >
                  <CheckCircle2 className="h-3 w-3 text-primary/70" />
                  {p.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Where to go next
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickGroup
            heading="Client work"
            note="Direct work with active clients."
            links={[
              { to: "/admin/customers", label: "Customers" },
              { to: "/admin/client-health", label: "Client health" },
              { to: "/admin/service-requests", label: "Open client requests" },
              { to: "/admin/pending-accounts", label: "Pending accounts" },
            ]}
          />
          <QuickGroup
            heading="Reports & review"
            note="Anything that may become client-visible."
            links={[
              { to: "/admin/report-drafts", label: "Report drafts" },
              { to: "/admin/reports", label: "Published reports" },
              { to: "/admin/rgs-review-queue", label: "RGS review queue" },
              { to: "/admin/diagnostic-interviews", label: "Diagnostic interviews" },
            ]}
          />
          <QuickGroup
            heading="System tools"
            note="The OS surfaces clients depend on."
            links={[
              { to: "/admin/tool-catalog", label: "Tool library" },
              { to: "/admin/tool-matrix", label: "Tool assignment matrix" },
              { to: "/admin/walkthrough-videos", label: "Walkthrough videos" },
              { to: "/admin/industry-brain", label: "Industry brain" },
              { to: "/admin/payments", label: "Payments & access" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

type PriorityItem = {
  key: string;
  icon: any;
  title: string;
  meaning: string;
  count: number;
  ctaLabel: string;
  href: string;
  severity?: "critical" | "warning";
};

function PriorityRow({ item }: { item: PriorityItem }) {
  const Icon = item.icon;
  const tone =
    item.severity === "critical"
      ? "border-destructive/40 bg-destructive/[0.04]"
      : "border-primary/30 bg-primary/[0.04]";
  const badgeTone =
    item.severity === "critical"
      ? "bg-destructive/15 text-destructive"
      : "bg-primary/15 text-primary";
  return (
    <li className={`rounded-lg border ${tone} p-4`}>
      <div className="flex items-start gap-4">
        <div className="mt-0.5 shrink-0 rounded-md border border-border/60 bg-background p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-foreground font-medium leading-snug">
                {item.title}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                {item.meaning}
              </p>
            </div>
            <span
              className={`shrink-0 inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-md text-sm tabular-nums font-medium ${badgeTone}`}
              aria-label={`${item.count} items`}
            >
              {item.count}
            </span>
          </div>
          <div className="mt-3">
            <Link
              to={item.href}
              className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 font-medium"
            >
              {item.ctaLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-background/40 p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <div className="text-sm text-foreground font-medium">
            No urgent review items are showing right now.
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed max-w-xl">
            Use this page to check client status, report drafts, tool guidance,
            and system readiness before publishing anything client-facing. A
            slipping gear is easier to fix when the next action is already
            clear.
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickGroup({
  heading,
  note,
  links,
}: {
  heading: string;
  note: string;
  links: { to: string; label: string }[];
}) {
  return (
    <div className="rounded-lg border border-border/70 p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-foreground/80">
        {heading}
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">{note}</p>
      <ul className="mt-3 space-y-1.5">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="inline-flex items-center gap-1.5 text-[13px] text-foreground/90 hover:text-primary"
            >
              <ArrowRight className="h-3 w-3 text-primary/70" />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}