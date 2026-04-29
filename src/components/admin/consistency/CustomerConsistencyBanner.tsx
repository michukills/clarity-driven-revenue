/**
 * P13.OS.H.2 — Cross-OS consistency warnings.
 *
 * Surfaces (does NOT silently mutate) mismatches between a customer's
 * sales stage, lifecycle state, packages, tool assignments, and demo flag.
 * Each warning offers a safe, explicit admin action when one applies.
 *
 * Mounted on:
 *   - Customer Detail (top of page)
 *   - Diagnostic Case File (selected client section)
 *   - Implementation Case File (selected client section)
 */

import { useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CustomerConsistencyInput = {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  stage?: string | null;
  lifecycle_state?: string | null;
  is_demo_account?: boolean | null;
  contributes_to_global_learning?: boolean | null;
  portal_unlocked?: boolean | null;
  package_diagnostic?: boolean | null;
  package_implementation?: boolean | null;
  package_full_bundle?: boolean | null;
  package_revenue_tracker?: boolean | null;
  rcc_subscription_status?: string | null;
  industry?: string | null;
  industry_confirmed_by_admin?: boolean | null;
  needs_industry_review?: boolean | null;
  hasIndustryMismatch?: boolean | null;
  snapshot_status?: string | null;
  snapshot_industry_verified?: boolean | null;
  /** Number of currently assigned tools (resource_assignments) for this customer. */
  toolsAssigned?: number;
  /** Whether any assigned resource is RCC-gated (Revenue Control Center). */
  hasRccResource?: boolean;
};

type Severity = "warn" | "info";
type Fix =
  | { kind: "set_lifecycle"; to: string; label: string }
  | { kind: "exclude_learning"; label: string }
  | { kind: "open_assign_tools"; label: string }
  | { kind: "scroll_to"; anchor: string; label: string };

type Warning = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  fix?: Fix;
};

const DIAGNOSTIC_STAGES = new Set([
  "diagnostic_paid",
  "diagnostic_in_progress",
  "diagnostic_delivered",
  "diagnostic_complete",
  "decision_pending",
]);
const IMPLEMENTATION_STAGES = new Set([
  "implementation_added",
  "implementation_onboarding",
  "tools_assigned",
  "client_training_setup",
  "implementation_active",
  "waiting_on_client",
  "review_revision_window",
  "implementation_complete",
  "implementation",
  "work_in_progress",
  "work_completed",
]);

export function computeWarnings(c: CustomerConsistencyInput): Warning[] {
  const ws: Warning[] = [];
  const lc = (c.lifecycle_state || "lead").toString();
  const stage = (c.stage || "").toString();
  const industry = (c.industry || "").toString();
  const tools = c.toolsAssigned ?? 0;

  // 0. Industry assignment / verification guardrails.
  if (!industry) {
    ws.push({
      id: "missing-industry",
      severity: "warn",
      title: "Client has no assigned industry",
      detail:
        "Industry-specific tools, templates, and learning should stay restricted until the client is assigned to the correct industry or marked for review.",
      fix: { kind: "scroll_to", anchor: "industry-assignment", label: "Assign industry" },
    });
  } else if (industry === "other" || c.needs_industry_review) {
    ws.push({
      id: "industry-needs-review",
      severity: "warn",
      title: "Client industry needs review",
      detail:
        "This client is not ready for industry-specific routing. Confirm the correct industry from recorded evidence before enabling industry-specific tools.",
      fix: { kind: "scroll_to", anchor: "industry-assignment", label: "Verify industry" },
    });
  } else if (!c.industry_confirmed_by_admin) {
    ws.push({
      id: "industry-unconfirmed",
      severity: "warn",
      title: "Client industry is unconfirmed",
      detail:
        "An industry is assigned, but it has not been admin-confirmed. Industry-specific access remains restricted until verification is complete.",
      fix: { kind: "scroll_to", anchor: "industry-assignment", label: "Confirm industry" },
    });
  }

  if (c.hasIndustryMismatch) {
    ws.push({
      id: "possible-industry-mismatch",
      severity: "warn",
      title: "Possible industry mismatch",
      detail:
        "Recorded business evidence appears to point toward a different industry. Resolve this before enabling tools or promoting learning signals.",
      fix: { kind: "scroll_to", anchor: "industry-assignment", label: "Resolve mismatch" },
    });
  }

  if (
    industry &&
    industry !== "other" &&
    c.industry_confirmed_by_admin &&
    !c.needs_industry_review &&
    !c.hasIndustryMismatch &&
    (c.snapshot_status !== "admin_verified" || !c.snapshot_industry_verified)
  ) {
    ws.push({
      id: "snapshot-unverified",
      severity: "warn",
      title: "Business snapshot needs verification",
      detail:
        "Industry is confirmed, but the client business snapshot is not admin-verified. Industry-specific tools stay restricted until the snapshot is verified.",
      fix: { kind: "scroll_to", anchor: "business-snapshot", label: "Verify snapshot" },
    });
  }

  // 1. Stage indicates diagnostic but lifecycle_state is lead
  if (DIAGNOSTIC_STAGES.has(stage) && lc === "lead") {
    ws.push({
      id: "stage-diag-lifecycle-lead",
      severity: "warn",
      title: "Stage is diagnostic but lifecycle is still Lead",
      detail: `Sales stage "${stage}" indicates active diagnostic work, but lifecycle is still Lead. Workspace counts will look inconsistent.`,
      fix: { kind: "set_lifecycle", to: "diagnostic", label: "Move lifecycle → Diagnostic" },
    });
  }

  // 2. Stage indicates implementation but lifecycle is lead
  if (IMPLEMENTATION_STAGES.has(stage) && lc === "lead") {
    ws.push({
      id: "stage-impl-lifecycle-lead",
      severity: "warn",
      title: "Stage is implementation but lifecycle is still Lead",
      detail: `Sales stage "${stage}" indicates implementation, but lifecycle is still Lead. Implementation Workspace counts won't include this client.`,
      fix: { kind: "set_lifecycle", to: "implementation", label: "Move lifecycle → Implementation" },
    });
  }

  // 3. Diagnostic stage active but no diagnostic package
  if (DIAGNOSTIC_STAGES.has(stage) && !c.package_diagnostic && !c.package_full_bundle) {
    ws.push({
      id: "diag-stage-no-package",
      severity: "info",
      title: "Diagnostic in flight without a diagnostic package",
      detail: "Stage indicates diagnostic work, but neither Diagnostic nor Full Bundle is marked. Confirm packaging on this client.",
      fix: { kind: "scroll_to", anchor: "package-lifecycle", label: "Fix package" },
    });
  }

  // 4. Implementation stage active but no implementation package
  if (IMPLEMENTATION_STAGES.has(stage) && !c.package_implementation && !c.package_full_bundle) {
    ws.push({
      id: "impl-stage-no-package",
      severity: "info",
      title: "Implementation in flight without an implementation package",
      detail: "Stage indicates implementation, but neither Implementation nor Full Bundle is marked. Confirm packaging on this client.",
      fix: { kind: "scroll_to", anchor: "package-lifecycle", label: "Fix package" },
    });
  }

  // 5. Full bundle but no tools assigned
  if (c.package_full_bundle && tools === 0) {
    ws.push({
      id: "bundle-no-tools",
      severity: "warn",
      title: "Full Bundle marked but no tools assigned",
      detail: "This client has the Full Bundle package but currently has 0 tools assigned. They cannot use the OS until tools are assigned.",
      fix: { kind: "open_assign_tools", label: "Assign tools" },
    });
  }

  // 6. Revenue Tracker package but no RCC resource assigned
  if (c.package_revenue_tracker && !c.hasRccResource) {
    ws.push({
      id: "rt-package-no-access",
      severity: "warn",
      title: "Revenue Tracker package without access",
      detail: "Revenue Tracker is marked on the package list, but no Revenue Control Center resource is assigned. Package purchase does not equal access — assign the tool to grant it.",
      fix: { kind: "open_assign_tools", label: "Assign tools" },
    });
  }

  // 7. Portal unlocked but no tools assigned
  if (c.portal_unlocked && tools === 0) {
    ws.push({
      id: "portal-unlocked-no-tools",
      severity: "warn",
      title: "Portal unlocked but no tools assigned",
      detail: "Client portal is unlocked, but they have 0 tools to use inside it.",
      fix: { kind: "open_assign_tools", label: "Assign tools" },
    });
  }

  // 8. Demo client contributing to global learning
  if (c.is_demo_account && c.contributes_to_global_learning) {
    ws.push({
      id: "demo-learning-on",
      severity: "warn",
      title: "Demo account is contributing to global learning",
      detail: "This is a demo / showcase account but its activity is currently feeding global learning. Demo data should normally be excluded.",
      fix: { kind: "exclude_learning", label: "Exclude from global learning" },
    });
  }

  return ws;
}

export function CustomerConsistencyBanner({
  customer,
  onChanged,
  onAssignTools,
  className,
}: {
  customer: CustomerConsistencyInput;
  onChanged?: () => void;
  onAssignTools?: () => void;
  className?: string;
}) {
  const warnings = useMemo(() => computeWarnings(customer), [customer]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = warnings.filter((w) => !dismissed.has(w.id));
  if (visible.length === 0) {
    return (
      <div
        className={`rounded-md border border-secondary/30 bg-secondary/5 px-3 py-2 text-[11px] text-secondary inline-flex items-center gap-2 ${
          className ?? ""
        }`}
        title="Stage, lifecycle, packages, and tool access are coherent."
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Cross-OS state looks consistent
      </div>
    );
  }

  const apply = async (w: Warning) => {
    if (!w.fix) return;
    setBusyId(w.id);
    try {
      if (w.fix.kind === "set_lifecycle") {
        const { error } = await supabase
          .from("customers")
          .update({
            lifecycle_state: w.fix.to,
            lifecycle_updated_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
          } as any)
          .eq("id", customer.id);
        if (error) throw error;
        toast.success(`Lifecycle updated → ${w.fix.to}`);
        onChanged?.();
      } else if (w.fix.kind === "exclude_learning") {
        const { error } = await supabase
          .from("customers")
          .update({
            contributes_to_global_learning: false,
            learning_exclusion_reason: "demo account",
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", customer.id);
        if (error) throw error;
        toast.success("Demo account excluded from global learning");
        onChanged?.();
      } else if (w.fix.kind === "open_assign_tools") {
        if (onAssignTools) onAssignTools();
        else toast.message("Open the Assign Tools action to grant access");
      } else if (w.fix.kind === "scroll_to") {
        const el = document.getElementById(w.fix.anchor);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          // Fall back to URL hash so a re-render can target it.
          window.location.hash = w.fix.anchor;
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to apply fix");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className={`rounded-md border border-amber-500/30 bg-amber-500/5 ${className ?? ""}`}
    >
      <div className="px-3 py-2 border-b border-amber-500/20 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[11px] uppercase tracking-wider text-amber-300">
          Cross-OS consistency · {visible.length} {visible.length === 1 ? "issue" : "issues"}
        </span>
      </div>
      <ul className="divide-y divide-amber-500/10">
        {visible.map((w) => (
          <li key={w.id} className="px-3 py-2.5 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground">{w.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed break-words">
                {w.detail}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {w.fix && (
                <button
                  onClick={() => apply(w)}
                  disabled={busyId === w.id}
                  className="text-[11px] px-2 py-1 rounded border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                >
                  {busyId === w.id ? "…" : w.fix.label}
                </button>
              )}
              <button
                onClick={() => setDismissed((s) => new Set(s).add(w.id))}
                title="Dismiss for this session"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
