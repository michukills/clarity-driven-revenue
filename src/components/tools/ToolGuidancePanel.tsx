import { BookOpen, ListChecks, ArrowRight, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react";

/**
 * Reusable "How to use this tool" panel. Mirrors the structure of the
 * written ToolGuide registry but accepts inline props so any tool can
 * embed premium guidance without depending on the registry.
 * Stays scope-safe — never references admin/internal notes, never
 * promises results.
 */
export interface ToolGuidancePanelProps {
  purpose?: string;
  prepare?: string[];
  goodSubmission?: string[];
  whatHappensNext: string;
  reviewedBy?: string;
  outOfScope?: string;
}

export function ToolGuidancePanel({
  purpose,
  prepare,
  goodSubmission,
  whatHappensNext,
  reviewedBy,
  outOfScope,
}: ToolGuidancePanelProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5 text-primary" /> How to use this tool
      </div>

      {purpose && (
        <p className="mt-3 text-sm text-foreground/90 leading-relaxed">{purpose}</p>
      )}

      {prepare && prepare.length > 0 && (
        <Block eyebrow="Before you start" items={prepare} />
      )}
      {goodSubmission && goodSubmission.length > 0 && (
        <Block eyebrow="What a strong update looks like" items={goodSubmission} />
      )}

      <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <ArrowRight className="h-3 w-3 text-primary" /> What happens next
        </div>
        <p className="mt-1.5 text-xs text-foreground/90 leading-relaxed">
          {whatHappensNext}
        </p>
      </div>

      {reviewedBy && (
        <div className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
          <UserCheck className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
          <span>{reviewedBy}</span>
        </div>
      )}
      {outOfScope && (
        <div className="mt-2 flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
          <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
          <span>{outOfScope}</span>
        </div>
      )}
    </section>
  );
}

function Block({ eyebrow, items }: { eyebrow: string; items: string[] }) {
  return (
    <div className="mt-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </div>
      <ul className="mt-1.5 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-foreground/90 leading-relaxed flex gap-2">
            <ListChecks className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Calm, useful empty state. Replaces dead "No data" placeholders.
 */
export function ToolEmptyState({
  title,
  body,
  responsibility,
}: {
  title: string;
  body: string;
  responsibility?: "client" | "rgs" | "shared";
}) {
  const tag =
    responsibility === "client"
      ? "Waiting on you"
      : responsibility === "rgs"
      ? "Waiting on RGS review"
      : responsibility
      ? "Shared next step"
      : null;
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div>
          <div className="text-sm text-foreground font-medium">{title}</div>
          <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed max-w-xl">
            {body}
          </p>
          {tag && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground border border-border/60 rounded-full px-2 py-0.5">
              {tag}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Calm loading state. Replaces "Loading…" placeholders.
 */
export function ToolLoadingState({ label }: { label?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
      {label ?? "Loading the current tool status…"}
    </div>
  );
}

/**
 * Calm error state. Replaces raw error toasts on the tool surface.
 */
export function ToolErrorState({ message }: { message?: string | null }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      {message ??
        "This tool could not load. Refresh first; if it continues, check access or status before changing client-facing data."}
    </div>
  );
}