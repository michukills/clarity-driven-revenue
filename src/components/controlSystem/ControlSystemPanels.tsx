/**
 * P93E-E2G-B — Shared presentational panels for the RGS Control System
 * add-on. These components consume `ControlSystemView` from the E2G
 * deterministic engine and `classifySupportRequest` from the support
 * boundary config. They never invent data, never move score, and never
 * leak admin-only fields into client-facing surfaces.
 */
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Compass,
  Gauge,
  Minus,
  ShieldCheck,
} from "lucide-react";
import {
  RGS_STAGE_LABELS,
  type ControlSystemView,
} from "@/lib/controlSystem/continuationEngine";
import {
  classifySupportRequest,
  type SupportClassification,
} from "@/config/controlSystemSupportBoundary";

const GEAR_LABELS: Record<string, string> = {
  demand_generation: "Demand Generation",
  revenue_conversion: "Revenue Conversion",
  operational_efficiency: "Operational Efficiency",
  financial_visibility: "Financial Visibility",
  owner_independence: "Owner Independence",
};

function Section({
  title,
  subtitle,
  children,
  testId,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      className="bg-card border border-border rounded-xl p-5 space-y-3"
    >
      <div>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground italic">{children}</p>;
}

function StageHeader({ view, addOn }: { view: ControlSystemView; addOn: boolean | null }) {
  return (
    <div
      data-testid="control-system-stage-header"
      className="bg-card border border-border rounded-xl p-5 space-y-3"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Gauge className="h-4 w-4" /> Stage
      </div>
      <h1 className="text-2xl font-serif text-foreground">{view.stage.label}</h1>
      <p className="text-sm text-foreground/90">{view.stage.one_liner}</p>
      <p
        data-testid="control-system-not-implementation"
        className="text-xs text-muted-foreground"
      >
        The {RGS_STAGE_LABELS.control_system.label} is not a new{" "}
        {RGS_STAGE_LABELS.implementation.label} project. It helps you continue using
        the installed RGS tools, monitor the system, keep evidence current, and know
        when something needs attention.
      </p>
      {addOn !== null && (
        <Badge variant={addOn ? "secondary" : "outline"} className="text-[11px]">
          {addOn ? "Add-on active" : "Add-on not currently active"}
        </Badge>
      )}
    </div>
  );
}

function MonitoringSnapshot({ view }: { view: ControlSystemView }) {
  const m = view.score_movement;
  const TrendIcon =
    m.trend === "improving"
      ? ArrowUpRight
      : m.trend === "regressing"
      ? ArrowDownRight
      : Minus;
  return (
    <Section
      title="System Monitoring Snapshot"
      subtitle="Score movement and the gear most worth watching."
      testId="control-system-monitoring-snapshot"
    >
      {m.current_total === null ? (
        <EmptyLine>No score history has been recorded yet.</EmptyLine>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Current score</div>
            <div className="text-foreground">{m.current_total}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Movement</div>
            <div className="text-foreground flex items-center gap-1">
              <TrendIcon className="h-4 w-4" />
              {m.delta === null ? "—" : (m.delta > 0 ? "+" : "") + m.delta}
              <span className="text-muted-foreground text-xs">({m.trend})</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Top slipping gear</div>
            <div className="text-foreground">
              {m.top_slipping_gear ? GEAR_LABELS[m.top_slipping_gear] ?? m.top_slipping_gear : "—"}
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

function RepairContinuation({
  view,
  showAdminNotes = false,
}: {
  view: ControlSystemView;
  showAdminNotes?: boolean;
}) {
  return (
    <Section
      title="Repair Continuation"
      subtitle="Read-only continuation of repairs RGS already installed."
      testId="control-system-repair-continuation"
    >
      {view.repair_continuation.length === 0 ? (
        <EmptyLine>No repair continuation items available yet.</EmptyLine>
      ) : (
        <ul className="space-y-3">
          {view.repair_continuation.map((r) => (
            <li
              key={r.recommendation_id}
              className="border border-border rounded-md p-3 space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm text-foreground">
                  {GEAR_LABELS[r.gear] ?? r.gear}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">{r.current_status}</Badge>
                  <Badge variant="outline" className="text-[10px]">{r.dependency_status}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{r.monitoring_frequency}</Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{r.client_safe_explanation}</div>
              <div className="text-xs text-foreground/80">
                <span className="text-muted-foreground">Next action: </span>
                {r.next_client_action}
              </div>
              <div className="text-xs text-foreground/80">
                <span className="text-muted-foreground">Watch: </span>
                {r.control_system_watch_item}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {r.reengagement_trigger_if_scope_expands}
              </div>
              {showAdminNotes && r.admin_only_note && (
                <div
                  data-testid="admin-only-note"
                  className="mt-2 rounded-md border border-dashed border-border p-2 text-[11px] text-muted-foreground bg-muted/30"
                >
                  <span className="uppercase tracking-wider">Admin note · </span>
                  {r.admin_only_note}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function EvidenceFreshness({
  view,
  showAdminFlags = false,
}: {
  view: ControlSystemView;
  showAdminFlags?: boolean;
}) {
  return (
    <Section
      title="Evidence Freshness"
      subtitle="Stale evidence lowers monitoring confidence; it never certifies legal, tax, accounting, compliance, or valuation status."
      testId="control-system-evidence-freshness"
    >
      {view.evidence_freshness.length === 0 ? (
        <EmptyLine>Evidence freshness will appear after evidence is linked or reviewed.</EmptyLine>
      ) : (
        <ul className="space-y-2">
          {view.evidence_freshness.map((e) => (
            <li
              key={e.recommendation_id}
              className="border border-border rounded-md p-3 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-foreground">
                  {GEAR_LABELS[e.gear] ?? e.gear}
                </div>
                <Badge
                  variant={e.freshness === "current" ? "secondary" : "outline"}
                  className="text-[10px]"
                >
                  {e.freshness}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">{e.why_it_matters}</div>
              <div className="text-xs text-foreground/80">
                <span className="text-muted-foreground">Refresh: </span>
                {e.what_to_upload}
              </div>
              <div className="text-[11px] text-muted-foreground">{e.confidence_note}</div>
              {showAdminFlags && e.admin_review_required && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-destructive text-destructive"
                  data-testid="admin-review-flag"
                >
                  Admin review required
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function OwnerControl({ view }: { view: ControlSystemView }) {
  return (
    <Section
      title="Owner-Control Watchlist"
      subtitle="Where the owner is still the bottleneck and what they can stop carrying."
      testId="control-system-owner-control"
    >
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {view.owner_control_signals.map((o) => (
          <li key={o.gear} className="border border-border rounded-md p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-foreground">{GEAR_LABELS[o.gear] ?? o.gear}</div>
              <Badge variant="outline" className="text-[10px]">
                {o.owner_independence_trend}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">{o.bottleneck_warning}</div>
            <div className="text-xs text-foreground/80">
              <span className="text-muted-foreground">Decisions: </span>
              {o.decisions_still_routed_to_owner}
            </div>
            <div className="text-xs text-foreground/80">
              <span className="text-muted-foreground">Owner can stop carrying: </span>
              {o.what_owner_can_stop_carrying}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function IndustrySignals({ view }: { view: ControlSystemView }) {
  return (
    <Section
      title="Industry Signals"
      subtitle="Industry-specific monitoring questions, grouped by gear."
      testId="control-system-industry-signals"
    >
      {view.industry_signals.length === 0 ? (
        <EmptyLine>
          Industry signals will appear once the client's industry and diagnostic context are
          available.
        </EmptyLine>
      ) : (
        <ul className="space-y-2">
          {view.industry_signals.map((s) => (
            <li
              key={`${s.gear}-${s.signal_label}`}
              className="border border-border rounded-md p-3 space-y-1"
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {GEAR_LABELS[s.gear] ?? s.gear}
              </div>
              <div className="text-sm text-foreground">{s.signal_label}</div>
              <div className="text-xs text-foreground/80">{s.monitoring_question}</div>
              <div className="text-[11px] text-muted-foreground">
                {s.client_safe_explanation}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function MonitoringPlan({ view }: { view: ControlSystemView }) {
  return (
    <Section
      title="Monitoring Plan"
      subtitle="What the Control System keeps an eye on for you."
      testId="control-system-monitoring-plan"
    >
      <ul className="text-sm text-foreground/90 list-disc pl-5 space-y-1">
        {view.monitoring_plan.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Section>
  );
}

function NextAction({ view }: { view: ControlSystemView }) {
  return (
    <Section
      title="Recommended Next Action"
      testId="control-system-next-action"
    >
      <p className="text-sm text-foreground">{view.recommended_next_client_action}</p>
    </Section>
  );
}

function SupportBoundaries({ view }: { view: ControlSystemView }) {
  return (
    <Section
      title="Support Boundaries"
      subtitle="What ongoing support covers, and what would re-open a new engagement."
      testId="control-system-support-boundaries"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-border rounded-md p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <ShieldCheck className="h-4 w-4" /> Included support
          </div>
          <ul
            data-testid="included-support-list"
            className="text-xs text-foreground/85 list-disc pl-5 space-y-1"
          >
            {view.included_support.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="border border-border rounded-md p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <AlertTriangle className="h-4 w-4" /> Re-engagement triggers
          </div>
          <ul
            data-testid="reengagement-trigger-list"
            className="text-xs text-foreground/85 list-disc pl-5 space-y-1"
          >
            {view.reengagement_triggers.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground pt-1">
        {view.scope_boundary_notice}
      </p>
    </Section>
  );
}

export function SupportClassifierWidget() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ReturnType<typeof classifySupportRequest> | null>(
    null,
  );
  return (
    <Section
      title="Support Request Helper"
      subtitle="Describe what you need help with. We'll show whether it stays inside ongoing support or would require a new engagement. This does not auto-create scope or guarantee a response time."
      testId="control-system-support-classifier"
    >
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. How do I refresh evidence for the financial visibility tool?"
          className="min-h-[80px]"
          aria-label="Describe your support request"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setResult(classifySupportRequest(text))}
            disabled={text.trim().length === 0}
            data-testid="classify-support-button"
          >
            Check classification
          </Button>
          {result && (
            <Badge
              data-testid="classifier-result-badge"
              variant={
                result.classification === "included_support"
                  ? "secondary"
                  : result.classification === "reengagement_required"
                  ? "outline"
                  : "outline"
              }
              className={cn(
                "text-[10px]",
                result.classification === "reengagement_required" &&
                  "border-destructive text-destructive",
              )}
            >
              {labelForClassification(result.classification)}
            </Badge>
          )}
        </div>
        {result && (
          <div
            data-testid="classifier-result"
            className="border border-border rounded-md p-3 text-xs text-foreground/85 space-y-1"
          >
            <p>{result.client_safe_explanation}</p>
            {result.matched_signals.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Signals: {result.matched_signals.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

function labelForClassification(c: SupportClassification): string {
  if (c === "included_support") return "Included support";
  if (c === "reengagement_required") return "Re-engagement required";
  return "Needs admin review";
}

/* ---------- Public composite views ---------- */

export function ControlSystemClientView({
  view,
  addOnActive,
}: {
  view: ControlSystemView;
  addOnActive: boolean | null;
}) {
  // Memoized so test snapshots don't re-create elements pointlessly.
  const sections = useMemo(
    () => (
      <>
        <StageHeader view={view} addOn={addOnActive} />
        <MonitoringSnapshot view={view} />
        <NextAction view={view} />
        <RepairContinuation view={view} />
        <EvidenceFreshness view={view} />
        <OwnerControl view={view} />
        <IndustrySignals view={view} />
        <MonitoringPlan view={view} />
        <SupportBoundaries view={view} />
        <SupportClassifierWidget />
      </>
    ),
    [view, addOnActive],
  );
  return (
    <div data-testid="control-system-client-view" className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Compass className="h-4 w-4" /> RGS Control System
      </div>
      {sections}
    </div>
  );
}

export function ControlSystemAdminView({
  view,
  addOnActive,
}: {
  view: ControlSystemView;
  addOnActive: boolean | null;
}) {
  return (
    <div data-testid="control-system-admin-view" className="space-y-4">
      <StageHeader view={view} addOn={addOnActive} />
      <Section
        title="Admin Summary Note"
        subtitle="Admin-only context. Not shown to the client."
        testId="control-system-admin-summary"
      >
        <p className="text-sm text-foreground/90">{view.admin_summary_note}</p>
      </Section>
      <MonitoringSnapshot view={view} />
      <RepairContinuation view={view} showAdminNotes />
      <EvidenceFreshness view={view} showAdminFlags />
      <OwnerControl view={view} />
      <IndustrySignals view={view} />
      <SupportBoundaries view={view} />
      <Section
        title="Re-engagement Candidate Review"
        subtitle="Use the support helper to test whether an inbound request stays inside the installed Control System scope."
        testId="control-system-admin-reengagement-review"
      >
        <SupportClassifierWidget />
      </Section>
    </div>
  );
}