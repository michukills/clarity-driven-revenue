/**
 * P103E — Shared AI Output Envelope panel.
 *
 * Renders the P103D trust metadata where humans review AI-assisted
 * outputs. Strictly read-only: this component can never approve,
 * publish, mark client-visible, change a score, grant access, or
 * mutate any record. It only surfaces what the AI returned.
 *
 * Variants:
 *   - "admin"   : full review metadata for admin review surfaces.
 *   - "review"  : same as admin, suited for inline drafting panels.
 *   - "compact" : single-row summary (confidence + review + warning count).
 *   - "client"  : strips admin-only metadata; renders only client-safe fields.
 *
 * Fallback: when `envelope` is null/undefined, the component returns
 * `null` so legacy responses do not break existing UIs.
 */
import { ShieldCheck, AlertTriangle, Sparkles, EyeOff } from "lucide-react";
import {
  AI_ENVELOPE_CONFIDENCE_COPY,
  AI_ENVELOPE_EVIDENCE_TIER_LABEL,
  type AiOutputEnvelope,
  type AiOutputEnvelopeConfidenceLevel,
} from "@/lib/ai/aiOutputEnvelopeTypes";
import { cn } from "@/lib/utils";

export type AiOutputEnvelopePanelVariant =
  | "admin"
  | "review"
  | "compact"
  | "client";

export interface AiOutputEnvelopePanelProps {
  envelope: AiOutputEnvelope | null | undefined;
  variant?: AiOutputEnvelopePanelVariant;
  title?: string;
  showSchemaDebug?: boolean;
  className?: string;
}

const CONFIDENCE_BADGE_CLASS: Record<AiOutputEnvelopeConfidenceLevel, string> = {
  high: "bg-[hsl(140_50%_30%/0.18)] text-[hsl(140_60%_75%)] border-[hsl(140_50%_40%/0.4)]",
  medium:
    "bg-[hsl(40_80%_45%/0.15)] text-[hsl(40_90%_70%)] border-[hsl(40_80%_50%/0.4)]",
  low: "bg-[hsl(0_70%_45%/0.15)] text-[hsl(0_85%_75%)] border-[hsl(0_70%_55%/0.4)]",
};

function ConfidenceBadge({ level }: { level: AiOutputEnvelopeConfidenceLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
        CONFIDENCE_BADGE_CLASS[level],
      )}
      data-testid="ai-envelope-confidence-badge"
    >
      <Sparkles className="h-3 w-3" /> {level} confidence
    </span>
  );
}

function ReviewRequiredBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary"
      data-testid="ai-envelope-review-required-badge"
    >
      <ShieldCheck className="h-3 w-3" /> Human review required
    </span>
  );
}

function List({
  label,
  items,
  tone = "default",
  testId,
}: {
  label: string;
  items: string[];
  tone?: "default" | "warn" | "danger";
  testId?: string;
}) {
  if (!items || items.length === 0) return null;
  const toneClass =
    tone === "danger"
      ? "text-[hsl(0_85%_75%)]"
      : tone === "warn"
        ? "text-[hsl(40_90%_70%)]"
        : "text-foreground/85";
  return (
    <div className="space-y-1" data-testid={testId}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <ul className="space-y-0.5 text-[12px] leading-snug">
        {items.map((it, i) => (
          <li key={i} className={cn("flex gap-1.5", toneClass)}>
            <span className="text-muted-foreground">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiOutputEnvelopePanel({
  envelope,
  variant = "admin",
  title,
  showSchemaDebug = false,
  className,
}: AiOutputEnvelopePanelProps) {
  if (!envelope) return null;

  const isClient = variant === "client";
  const isCompact = variant === "compact";
  const heading = title ?? "AI-assisted draft";
  const warningCount =
    (envelope.risk_warnings?.length ?? 0) +
    (envelope.claim_safety_warnings?.length ?? 0);

  if (isCompact) {
    return (
      <div
        data-testid="ai-envelope-panel"
        data-variant="compact"
        className={cn(
          "inline-flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground",
          className,
        )}
      >
        <ConfidenceBadge level={envelope.confidence_level} />
        <ReviewRequiredBadge />
        {warningCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[hsl(40_90%_70%)]">
            <AlertTriangle className="h-3 w-3" />
            {warningCount} warning{warningCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
    );
  }

  // Client variant never renders admin-only review notes or admin-only metadata.
  return (
    <div
      data-testid="ai-envelope-panel"
      data-variant={variant}
      data-client-safe={envelope.client_safe_output ? "true" : "false"}
      className={cn(
        "rounded-lg border border-border bg-muted/15 p-3 space-y-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {heading}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ConfidenceBadge level={envelope.confidence_level} />
            <ReviewRequiredBadge />
            {!isClient && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
                data-testid="ai-envelope-client-safe-flag"
              >
                {envelope.client_safe_output
                  ? "Client-safe output"
                  : "Admin-only output"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-[12px] text-foreground/85 leading-snug">
        <span className="text-muted-foreground">Why this confidence: </span>
        <span data-testid="ai-envelope-confidence-reason">
          {envelope.confidence_reason ||
            AI_ENVELOPE_CONFIDENCE_COPY[envelope.confidence_level]}
        </span>
      </div>

      <List
        label="Missing inputs"
        items={envelope.missing_inputs}
        tone="warn"
        testId="ai-envelope-missing-inputs"
      />
      <List
        label="Risk warnings"
        items={envelope.risk_warnings}
        tone="warn"
        testId="ai-envelope-risk-warnings"
      />
      <List
        label="Claim-safety warnings"
        items={envelope.claim_safety_warnings}
        tone="danger"
        testId="ai-envelope-claim-safety-warnings"
      />

      {!isClient && envelope.evidence_basis.length > 0 && (
        <div className="space-y-1" data-testid="ai-envelope-evidence-basis">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Evidence basis
          </div>
          <div className="flex flex-wrap gap-1.5">
            {envelope.evidence_basis.map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="inline-flex items-center rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] text-foreground/80"
              >
                {AI_ENVELOPE_EVIDENCE_TIER_LABEL[t] ?? t}
              </span>
            ))}
          </div>
        </div>
      )}

      {!isClient && envelope.assumptions.length > 0 && (
        <List
          label="Assumptions"
          items={envelope.assumptions}
          testId="ai-envelope-assumptions"
        />
      )}

      {!isClient && envelope.recommended_next_actions.length > 0 && (
        <List
          label="Recommended next actions"
          items={envelope.recommended_next_actions}
          testId="ai-envelope-next-actions"
        />
      )}

      {isClient && (
        <div
          className="text-[10px] text-muted-foreground inline-flex items-center gap-1"
          data-testid="ai-envelope-client-hidden-notice"
        >
          <EyeOff className="h-3 w-3" /> Admin-only review notes hidden from
          clients
        </div>
      )}

      {showSchemaDebug && !isClient && (
        <div
          className="text-[10px] text-muted-foreground/70"
          data-testid="ai-envelope-schema-debug"
        >
          schema: {envelope.output_schema_version}
        </div>
      )}
    </div>
  );
}

export default AiOutputEnvelopePanel;