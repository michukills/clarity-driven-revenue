import { Link } from "react-router-dom";
import { ArrowRight, Compass, MapPin, Activity, ShieldCheck, Calendar } from "lucide-react";
import {
  buildClientStageGuidance,
  RGS_CANONICAL_PRODUCT_SENTENCE,
} from "@/lib/clientStage";

/**
 * Calm, premium landing block for the client portal. Translates the
 * customer's existing stage/status into "Where you are / What RGS is doing /
 * Your next step" without bypassing any access controls. Stays purely
 * client-safe — no admin notes, no AI draft data, no raw reason codes.
 */
export function GuidedClientWelcome({
  customer,
}: {
  customer: {
    full_name?: string | null;
    business_name?: string | null;
    stage?: string | null;
    next_action?: string | null;
    portal_unlocked?: boolean | null;
  } | null;
}) {
  const guidance = buildClientStageGuidance(customer);
  const greetingName =
    customer?.business_name?.trim() ||
    customer?.full_name?.trim() ||
    "there";

  return (
    <section className="mb-10 space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Welcome to your RGS portal
        </div>
        <h1 className="mt-2 text-3xl text-foreground font-light tracking-tight">
          Hello, {greetingName}.
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          This is where your diagnostic, tools, reports, and next steps live.
          The goal is simple: help you see the system clearly and know what
          to do next.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GuidanceCard
          icon={MapPin}
          eyebrow="Where you are"
          title={guidance.stageDisplay}
          body="Your current stage in the engagement."
        />
        <GuidanceCard
          icon={Activity}
          eyebrow="What RGS is doing"
          title={guidance.rgsIsDoing}
          body="A calm summary of the work happening behind the scenes."
        />
        <GuidanceCard
          icon={Compass}
          eyebrow="Your next step"
          title={guidance.nextStep}
          body="One clear next action — secondary links live below."
          href={guidance.nextStepHref}
          tone="primary"
        />
      </div>

      {(guidance.notRequiredYet || guidance.afterNextStep) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guidance.notRequiredYet && (
            <InfoBand
              icon={ShieldCheck}
              eyebrow="What is not required from you yet"
              body={guidance.notRequiredYet}
            />
          )}
          {guidance.afterNextStep && (
            <InfoBand
              icon={Calendar}
              eyebrow="What happens after this step"
              body={guidance.afterNextStep}
            />
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          How RGS works
        </div>
        <p className="text-sm text-foreground mt-2 leading-relaxed">
          {RGS_CANONICAL_PRODUCT_SENTENCE}
        </p>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          This portal organizes the work and keeps the next step clear.
          The Diagnostic, Implementation, and the RGS Control System are
          separate stages — what is available to you depends on your
          selected service. RGS is the architect, not the operator: we
          help you see what is slipping and what to repair, and the
          decisions remain yours.
        </p>
      </div>
    </section>
  );
}

function InfoBand({
  icon: Icon,
  eyebrow,
  body,
}: {
  icon: any;
  eyebrow: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {eyebrow}
      </div>
      <p className="text-xs text-foreground/90 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

function GuidanceCard({
  icon: Icon,
  eyebrow,
  title,
  body,
  href,
  tone,
}: {
  icon: any;
  eyebrow: string;
  title: string;
  body: string;
  href?: string;
  tone?: "primary";
}) {
  const toneCls =
    tone === "primary"
      ? "border-primary/30 bg-primary/[0.06]"
      : "border-border bg-card";
  const inner = (
    <div className={`rounded-xl border p-5 h-full ${toneCls}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${tone === "primary" ? "text-primary" : "text-muted-foreground"}`} />
        {eyebrow}
      </div>
      <div className="text-sm text-foreground mt-2 leading-snug">{title}</div>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{body}</p>
      {href && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
          Open <ArrowRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
  if (href) {
    return (
      <Link to={href} className="block hover:opacity-95 transition-opacity">
        {inner}
      </Link>
    );
  }
  return inner;
}