import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isClientVisible } from "@/lib/visibility";
import { VisibilityBadge } from "@/components/VisibilityBadge";
import {
  toolCategoryShort,
  assignmentSourceLabel,
  canonicalToolDisplayTitle,
  type ToolCategory,
} from "@/lib/portal";
import {
  policyForResource,
  POLICY_LABEL,
  POLICY_TONE,
  type AssignmentPolicy,
  type ToolPolicyEntry,
} from "@/lib/toolPolicy";
import { isRccResource } from "@/lib/access/rccResource";
import { Sparkles, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Customer = {
  id: string;
  full_name: string;
  business_name?: string | null;
};

type Resource = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  tool_category: ToolCategory | null;
  tool_audience?: string | null;
  url: string | null;
  resource_type: string;
};

type Assignment = {
  id: string;
  resource_id: string;
  assignment_source: string | null;
};

// P7.4.2 — group by assignment policy so admins can quickly see what the
// client already has automatically vs what still needs an RGS walkthrough.
type GroupKey = "auto_basic" | "guided_call" | "addon";
const GROUP_ORDER: { key: GroupKey; label: string; description: string }[] = [
  {
    key: "auto_basic",
    label: "Auto-Assigned Basics",
    description: "Safe self-explanatory tools that appear in the client portal automatically.",
  },
  {
    key: "guided_call",
    label: "Guided Tools",
    description: "Best introduced during a walkthrough or video call before assigning.",
  },
  {
    key: "addon",
    label: "Add-Ons / Other Resources",
    description: "Optional resources without a defined policy. Assign intentionally.",
  },
];

const POLICY_BADGE_CLS: Record<"ok" | "warn" | "muted", string> = {
  ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  muted: "bg-muted/40 text-muted-foreground border-border",
};

/** Display title rewrites used only inside this admin modal. */
function modalDisplayTitle(r: { title: string; url: string | null }): string {
  if (isRccResource({ title: r.title, url: r.url })) {
    return "Revenue Control Center™ Access";
  }
  return canonicalToolDisplayTitle(r.title);
}

export function AssignToolsDialog({
  open,
  onOpenChange,
  customer,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: Customer | null;
  onChanged?: () => void;
}) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!customer) return;
    setLoading(true);
    const [rRes, aRes] = await Promise.all([
      supabase.from("resources").select("id, title, description, visibility, tool_category, tool_audience, url, resource_type").order("title"),
      supabase.from("resource_assignments").select("id, resource_id, assignment_source").eq("customer_id", customer.id),
    ]);
    if (rRes.data) setResources(rRes.data as any);
    if (aRes.data) setAssignments(aRes.data as any);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, customer?.id]);

  const assignedSet = useMemo(
    () => new Map(assignments.map((a) => [a.resource_id, a])),
    [assignments],
  );

  // Only client-visible resources are assignable here. Internal-only tools
  // (audience or visibility) are filtered out. We also drop admin-route
  // duplicates like the internal `/admin/business-control-center/...`
  // Revenue Tracker so admins never see two near-identical rows.
  const assignable = useMemo(
    () =>
      resources.filter((r) => {
        if (!isClientVisible(r.visibility)) return false;
        if (r.tool_audience === "internal") return false;
        if ((r.url || "").startsWith("/admin/")) return false;
        return true;
      }),
    [resources],
  );

  /** Bucket each resource by its policy. Resources without a policy land in `addon`. */
  const grouped = useMemo(() => {
    const m: Record<GroupKey, Array<{ r: Resource; policy?: ToolPolicyEntry }>> = {
      auto_basic: [],
      guided_call: [],
      addon: [],
    };
    for (const r of assignable) {
      const policy = policyForResource(r);
      if (policy?.assignmentPolicy === "auto_basic") m.auto_basic.push({ r, policy });
      else if (policy?.assignmentPolicy === "guided_call") m.guided_call.push({ r, policy });
      else if (policy?.assignmentPolicy === "admin_only") continue; // never offer in client modal
      else m.addon.push({ r, policy });
    }
    return m;
  }, [assignable]);

  const toggle = async (r: Resource) => {
    if (!customer) return;
    const existing = assignedSet.get(r.id);
    setBusyId(r.id);
    if (existing) {
      const { error } = await supabase.from("resource_assignments").delete().eq("id", existing.id);
      if (error) toast.error(error.message);
      else toast.success(`Unassigned: ${canonicalToolDisplayTitle(r.title)}`);
    } else {
      const source = r.tool_category === "addon" ? "addon" : "manual";
      const { error } = await supabase.from("resource_assignments").insert([{
        customer_id: customer.id,
        resource_id: r.id,
        assignment_source: source,
      } as any]);
      if (error) toast.error(error.message);
      else toast.success(`Assigned: ${canonicalToolDisplayTitle(r.title)}`);
    }
    setBusyId(null);
    await load();
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Assign Client Resources
            {customer && (
              <span className="text-muted-foreground text-sm font-normal">
                · {customer.business_name || customer.full_name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Tools are grouped by how they should be assigned. <b>Auto basics</b> are seeded for
          implementation clients automatically. <b>Guided tools</b> are best introduced during a
          walkthrough. Internal-only tools are hidden.
        </p>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-5 mt-2">
            {GROUP_ORDER.map((cat) => {
              const items = grouped[cat.key] || [];
              return (
                <section key={cat.key}>
                  <div className="flex items-baseline justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-foreground">{cat.label}</h4>
                      <p className="text-[11px] text-muted-foreground">{cat.description}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {items.length} item{items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <div className="text-xs text-muted-foreground border border-dashed border-border rounded-md p-3">
                      Nothing to show in this group. Manage the catalog in{" "}
                      <Link to="/admin/tools" className="text-primary hover:underline">Tool Distribution</Link>.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map(({ r, policy }) => {
                        const assigned = assignedSet.has(r.id);
                        const meta = assignedSet.get(r.id);
                        const display = modalDisplayTitle(r);
                        const policyTone = policy ? POLICY_TONE[policy.assignmentPolicy] : "muted";
                        const policyBadge = policy ? POLICY_LABEL[policy.assignmentPolicy] : null;
                        return (
                          <div
                            key={r.id}
                            className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                              assigned ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/30"
                            }`}
                          >
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => toggle(r)}
                              className="mt-0.5 text-primary disabled:opacity-50"
                              aria-label={assigned ? "Unassign" : "Assign"}
                            >
                              {assigned ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <div className="text-sm text-foreground font-medium truncate">{display}</div>
                                <VisibilityBadge visibility={r.visibility} size="sm" />
                                {policyBadge && (
                                  <span
                                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap ${POLICY_BADGE_CLS[policyTone]}`}
                                    title={policy?.guidedReason || POLICY_LABEL[policy!.assignmentPolicy]}
                                  >
                                    {policy?.guidedReason || policyBadge}
                                  </span>
                                )}
                                {r.tool_category && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-muted/60 text-muted-foreground border-muted-foreground/30">
                                    {toolCategoryShort(r.tool_category)}
                                  </span>
                                )}
                                {assigned && meta && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-secondary/15 text-secondary border-secondary/40">
                                    {assignmentSourceLabel(meta.assignment_source)}
                                  </span>
                                )}
                                {r.url && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                    <ExternalLink className="h-3 w-3" /> connected
                                  </span>
                                )}
                              </div>
                              {r.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{r.description}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={assigned ? "outline" : "default"}
                              disabled={busyId === r.id}
                              onClick={() => toggle(r)}
                              className={assigned ? "border-border" : "bg-primary hover:bg-secondary"}
                            >
                              {assigned ? "Unassign" : "Assign"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-between items-center pt-3 border-t border-border">
          <Link to="/admin/tools" className="text-xs text-muted-foreground hover:text-foreground">
            Manage tool catalog →
          </Link>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}