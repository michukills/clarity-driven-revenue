import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { ToolCard, type Tool } from "@/components/portal/ToolCard";
import { ClientToolMatrixCard } from "@/components/portal/ClientToolMatrixCard";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { isClientVisible } from "@/lib/visibility";
import {
  TOOL_CATEGORIES,
  type ToolCategory,
  coreKeyForTitle,
  INTERNAL_TOOL_PLACEHOLDERS,
  canonicalToolDisplayTitle,
} from "@/lib/portal";
import {
  TOOL_MATRIX,
  GROUP_ORDER,
  type ToolMatrixEntry,
  type OverdueState,
} from "@/lib/toolMatrix";
import { policyByKey } from "@/lib/toolPolicy";
import { loadToolActivity } from "@/lib/toolMatrixActivity";
import { useRccAccess } from "@/lib/access/useRccAccess";
import { Wrench } from "lucide-react";
import { useToolUsageSession } from "@/lib/usage/toolUsageSession";

type ClientTool = Tool & { tool_category?: ToolCategory | null };

// Tools every authenticated client can always reach in the portal,
// even if no admin has formally assigned them yet.
const CORE_CLIENT_TOOLS: ClientTool[] = [
  {
    id: "core:rgs_stability_scorecard",
    title: "Business Stability Index™",
    description:
      "Score your business across the 5 RGS pillars to surface foundational risk and stability gaps.",
    category: "client_scorecard_sheets",
    resource_type: "link",
    visibility: "client_editable",
    url: "/portal/scorecard",
    file_path: null,
    screenshot_url: null,
    downloadable: false,
    tool_category: "diagnostic",
  },
];

export default function MyTools() {
  const { customerId: portalCustomerId } = usePortalCustomerId();
  useToolUsageSession({ toolTitle: "My Tools", toolKey: "my_tools" });
  const { hasAccess: hasRccAccess } = useRccAccess();
  const [tools, setTools] = useState<ClientTool[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activity, setActivity] = useState<
    Map<string, { lastActivityAt: string | null; overdue: OverdueState }>
  >(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!portalCustomerId) {
      setTools([]);
      setCustomerId(null);
      setLoading(false);
      return;
    }
    (async () => {
      const c = { id: portalCustomerId };
      setCustomerId(portalCustomerId);
      const { data: r } = await supabase
        .from("resource_assignments")
        .select("visibility_override, resources(*)")
        .eq("customer_id", c.id);
      const rows: ClientTool[] = [];
      const ov: Record<string, string | null> = {};
      (r ?? []).forEach((x: any) => {
        if (!x.resources) return;
        const eff = x.visibility_override || x.resources.visibility;
        if (!isClientVisible(eff)) return; // Hide internal-only tools entirely
        // Normalize legacy duplicate titles (e.g. "Revenue Leak Finder" /
        // "Revenue Leak Detection (Client View)") to the canonical RGS name
        // so clients see one consistent label.
        const ck = coreKeyForTitle(x.resources.title);
        const canonical = ck
          ? INTERNAL_TOOL_PLACEHOLDERS.find((p) => p.key === ck)
          : null;
        const base = canonical
          ? { ...x.resources, title: canonical.title, description: x.resources.description || canonical.description }
          : x.resources;
        // Apply branded display-title normalization for non-core client tools
        // (e.g. "Implementation Tracker" → "Implementation Command Tracker™").
        rows.push({ ...base, title: canonicalToolDisplayTitle(base.title) });
        ov[x.resources.id] = x.visibility_override;
      });
      // Merge in core client tools (deduped by canonical title) so universally
      // available RGS tools always render even if not formally assigned yet.
      // Also collapse duplicate rows that map to the same core concept.
      const seen = new Set<string>();
      const dedupedRows: ClientTool[] = [];
      for (const t of rows) {
        const key = (coreKeyForTitle(t.title) || t.title.toLowerCase()).trim();
        if (seen.has(key)) continue;
        seen.add(key);
        dedupedRows.push(t);
      }
      const merged = [
        ...dedupedRows,
        ...CORE_CLIENT_TOOLS.filter((t) => !seen.has(t.title.toLowerCase())),
      ];
      setTools(merged);
      setOverrides(ov);
      // Load Tool Operating Matrix activity for this customer (P6.2b)
      try {
        const idx = await loadToolActivity([c.id]);
        const perTool = idx.get(c.id) || new Map();
        const flat = new Map<string, { lastActivityAt: string | null; overdue: OverdueState }>();
        for (const [k, v] of perTool.entries()) {
          flat.set(k, { lastActivityAt: v.lastActivityAt, overdue: v.overdue });
        }
        setActivity(flat);
      } catch {
        setActivity(new Map());
      }
      setLoading(false);
    })();
  }, [portalCustomerId]);

  const SECTIONS: { key: ToolCategory; title: string; subtitle: string }[] = [
    { key: "diagnostic", title: "Diagnostic Engines", subtitle: "Used during your diagnostic to assess revenue, risk, and stability." },
    { key: "implementation", title: "Structuring Engines", subtitle: "Used while we install structure and fixes inside your business." },
    { key: "addon", title: "Control Systems", subtitle: "Ongoing systems that keep your business under control." },
  ];

  const grouped: Record<ToolCategory, ClientTool[]> = {
    diagnostic: tools.filter((t) => (t.tool_category || "diagnostic") === "diagnostic"),
    implementation: tools.filter((t) => t.tool_category === "implementation"),
    addon: tools.filter((t) => t.tool_category === "addon"),
  };

  // Resolve an assigned tool resource to its Tool Operating Matrix entry by
  // canonical core key or branded display title. Returns null if no match
  // (in which case we fall back to the legacy ToolCard rendering).
  const matrixEntryFor = (t: ClientTool): ToolMatrixEntry | null => {
    const ck = coreKeyForTitle(t.title);
    if (ck) {
      const byKey = TOOL_MATRIX.find((e) => e.key === ck);
      if (byKey) return byKey;
    }
    const display = canonicalToolDisplayTitle(t.title);
    return TOOL_MATRIX.find((e) => e.name === display) || null;
  };

  return (
    <PortalShell variant="customer">
      <div className="mb-10">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your Toolbox</div>
        <h1 className="mt-2 text-3xl text-foreground">My Tools</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          The tools your RGS team has activated for your engagement. Each one is here for a specific reason — diagnostic, implementation, or monitoring.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading your tools…</div>
      ) : tools.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Wrench className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground">No tools active yet.</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
            Your RGS team activates each tool during onboarding. As soon as one is ready for you, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {SECTIONS.map((s) => {
            const items = grouped[s.key];
            if (items.length === 0) return null;
            return (
              <section key={s.key}>
                <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-primary">{s.title}</div>
                    <h2 className="text-base text-foreground mt-1">{s.subtitle}</h2>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {items.length} item{items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map((t) => {
                    const entry = matrixEntryFor(t);
                    if (entry) {
                      const a = activity.get(entry.key);
                      const rccLocked = !!entry.requiresRccAccess && !hasRccAccess;
                      const policy = policyByKey(entry.key);
                      return (
                        <ClientToolMatrixCard
                          key={t.id}
                          entry={entry}
                          lastActivityAt={a?.lastActivityAt ?? null}
                          overdue={a?.overdue ?? "not_started"}
                          rccLocked={rccLocked}
                          resourceUrl={t.url}
                          instructions={policy?.instructions ?? null}
                        />
                      );
                    }
                    return (
                      <ToolCard key={t.id} tool={t} visibilityOverride={overrides[t.id]} />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
