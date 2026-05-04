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
  Gauge,
  Hourglass,
  UserCheck,
  PackageCheck,
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
      title: "Report draft needs approval",
      meaning:
        "This can become client-facing only after RGS reviews the scope, language, and next-step recommendations.",
      count: reportsNeedingReview,
      ctaLabel: "Open report queue",
      href: "/admin/report-drafts",
      bucket: "rgs",
    },
    {
      key: "ai",
      icon: Sparkles,
      title: "AI draft needs human review",
      meaning:
        "AI can draft, but it does not decide what the client sees. Read, edit, and approve before anything reaches the client.",
      count: aiDraftsNeedingReview,
      ctaLabel: "Review AI-assisted drafts",
      href: "/admin/report-drafts",
      bucket: "rgs",
    },
    {
      key: "renewal",
      icon: ShieldAlert,
      title: "High-risk account signal",
      meaning:
        "One or more accounts are flagged high or critical for renewal risk. Review the account before assuming the relationship is stable.",
      count: renewalAtRisk,
      ctaLabel: "Review renewal risk",
      href: "/admin/client-health",
      severity: "critical",
      bucket: "rgs",
    },
    {
      key: "health",
      icon: HeartPulse,
      title: "Client health signal",
      meaning:
        "Review whether the client needs clarification, next-step guidance, or a safer service boundary.",
      count: healthAttention,
      ctaLabel: "Open health review",
      href: "/admin/client-health",
      bucket: "rgs",
    },
    {
      key: "requests",
      icon: Inbox,
      title: "Open client request waiting on RGS",
      meaning:
        "Clients have submitted requests through the portal that are still open or in progress. Respond before they assume the system stalled.",
      count: openServiceRequests,
      ctaLabel: "Answer client requests",
      href: "/admin/service-requests",
      bucket: "client",
    },
    {
      key: "walkthroughs",
      icon: Wrench,
      title: "Tool guidance needs sharpening",
      meaning:
        "A tool may work technically, but the client experience is not complete until the walkthrough or transcript is approved.",
      count: walkthroughsPending,
      ctaLabel: "Sharpen walkthroughs",
      href: "/admin/walkthrough-videos",
      bucket: "system",
    },
  ];

  const active = priorities.filter((p) => p.count > 0);
  const quiet = priorities.filter((p) => p.count === 0);

  const totalActive = active.reduce((n, p) => n + p.count, 0);
  const rgsReview = priorities
    .filter((p) => p.bucket === "rgs")
    .reduce((n, p) => n + p.count, 0);
  const waitingClient = priorities
    .filter((p) => p.bucket === "client")
    .reduce((n, p) => n + p.count, 0);
  const systemCleanup = priorities
    .filter((p) => p.bucket === "system")
    .reduce((n, p) => n + p.count, 0);
  const readyToPublish = Math.max(
    0,
    reportsNeedingReview === 0 && aiDraftsNeedingReview === 0 ? 0 : 0,
  );

  return (
    <section className="mb-8 rounded-xl border border-border bg-card overflow-hidden">
      <header className="px-4 sm:px-5 pt-4 sm:pt-5 pb-4 border-b border-border/60">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/80">
          RGS Command Center
        </div>
        <h2 className="mt-1 text-xl sm:text-2xl font-serif text-foreground tracking-tight">
          Start here.
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed break-words">
          This page shows what needs RGS review, what is blocked, and what
          can safely move forward before anything reaches the client. Begin
          with anything that affects access, reports, client next steps, or
          published guidance.
        </p>
        <p className="mt-2.5 text-[11px] text-muted-foreground/80 max-w-2xl break-words">
          Internal notes and AI drafts stay private unless an admin
          deliberately approves client-visible language. Nothing on this
          page bypasses client visibility rules.
        </p>
      </header>

      <div className="px-4 sm:px-5 pt-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Command summary
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            icon={Gauge}
            label="Needs RGS review"
            value={loaded ? rgsReview : null}
            tone="primary"
            note="Reports, AI drafts, renewal risk, and client health."
          />
          <SummaryCard
            icon={Hourglass}
            label="Waiting on client"
            value={loaded ? waitingClient : null}
            tone="muted"
            note="Open client requests in progress."
          />
          <SummaryCard
            icon={PackageCheck}
            label="Ready to publish"
            value={null}
            tone="muted"
            note="No signal available yet — confirm in the report queue."
          />
          <SummaryCard
            icon={UserCheck}
            label="System cleanup"
            value={loaded ? systemCleanup : null}
            tone="muted"
            note="Walkthroughs and guidance still being sharpened."
          />
        </div>
      </div>

      <div className="px-4 sm:px-5 py-5">
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

      <div className="px-4 sm:px-5 pb-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Where to go next
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <QuickGroup
            heading="Client work"
            note="Open customer records, health signals, and clarification logs before making client-facing changes."
            links={[
              { to: "/admin/customers", label: "Customers" },
              { to: "/admin/client-health", label: "Client health" },
              { to: "/admin/service-requests", label: "Open client requests" },
              { to: "/admin/pending-accounts", label: "Pending accounts" },
            ]}
          />
          <QuickGroup
            heading="Reports & review"
            note="Review report drafts, AI-assisted sections, and client-ready deliverables before publishing."
            links={[
              { to: "/admin/report-drafts", label: "Report drafts" },
              { to: "/admin/reports", label: "Published reports" },
              { to: "/admin/rgs-review-queue", label: "RGS review queue" },
              { to: "/admin/diagnostic-interviews", label: "Diagnostic interviews" },
            ]}
          />
          <QuickGroup
            heading="System tools"
            note="Maintain the tool library, industry brain, walkthroughs, and guidance assets that support delivery."
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
  bucket?: "rgs" | "client" | "system";
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: any;
  label: string;
  value: number | null;
  note: string;
  tone: "primary" | "muted";
}) {
  const ring =
    tone === "primary"
      ? "border-primary/30 bg-primary/[0.05]"
      : "border-border/70 bg-background/40";
  return (
    <div className={`rounded-lg border ${ring} p-3.5`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-light tabular-nums text-foreground">
          {value === null ? "—" : value}
        </div>
        {value === null && (
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
            no signal yet
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">{note}</p>
    </div>
  );
}

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
    <li className={`rounded-lg border ${tone} p-3 sm:p-4`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="mt-0.5 shrink-0 rounded-md border border-border/60 bg-background p-2 hidden sm:block">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-foreground font-medium leading-snug flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary sm:hidden shrink-0" />
                <span className="break-words">{item.title}</span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed break-words">
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