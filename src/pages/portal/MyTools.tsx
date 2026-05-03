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
import {
  getEffectiveToolsForCustomer,
  TOOL_TYPE_LABEL,
  type EffectiveTool,
} from "@/lib/toolCatalog";
import { Link } from "react-router-dom";
import { loadToolSequence, effectiveSequence, reasonFor, type DiagnosticToolSequenceRow } from "@/lib/diagnostics/toolSequence";
import { supabase as sb } from "@/integrations/supabase/client";

type ClientTool = Tool & { tool_category?: ToolCategory | null };

// Tools every authenticated client can always reach in the portal,
// even if no admin has formally assigned them yet.
const CORE_CLIENT_TOOLS: ClientTool[] = [
  {
    id: "core:rgs_stability_scorecard",
    title: "Business Stability Index™",
    description:
      "A system check across the five RGS pillars. Helps show where the business looks steady and where it may be slipping.",
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
  const [systemTools, setSystemTools] = useState<EffectiveTool[]>([]);
  const [sequence, setSequence] = useState<DiagnosticToolSequenceRow | null>(null);
  const [ownerInterviewDone, setOwnerInterviewDone] = useState<boolean | null>(null);

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

  // P21.1 — Pull effective system tools from tool_catalog. RPC enforces that
  // only the owning client gets these rows, and only client-available, enabled
  // tools come back.
  useEffect(() => {
    if (!portalCustomerId) {
      setSystemTools([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const rows = await getEffectiveToolsForCustomer(portalCustomerId);
        if (alive) setSystemTools(rows);
      } catch {
        if (alive) setSystemTools([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [portalCustomerId]);

  // P41 — Pull diagnostic sequence + owner-interview completion state.
  useEffect(() => {
    if (!portalCustomerId) {
      setSequence(null);
      setOwnerInterviewDone(null);
      return;
    }
    let alive = true;
    (async () => {
      const [seq, cust] = await Promise.all([
        loadToolSequence(portalCustomerId).catch(() => null),
        sb.from("customers").select("owner_interview_completed_at").eq("id", portalCustomerId).maybeSingle(),
      ]);
      if (!alive) return;
      setSequence(seq);
      setOwnerInterviewDone(!!(cust.data as any)?.owner_interview_completed_at);
    })();
    return () => { alive = false; };
  }, [portalCustomerId]);

  const SECTIONS: { key: ToolCategory; title: string; subtitle: string }[] = [
    { key: "diagnostic", title: "Diagnostic Engines", subtitle: "Used during your diagnostic to assess revenue, risk, and stability." },
    { key: "implementation", title: "Structuring Engines", subtitle: "Used while we install structure and fixes inside your business." },
    { key: "addon", title: "Control Systems", subtitle: "Subscription systems active while your Revenue Control System subscription is in place." },
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
          These are the tools RGS has assigned to your engagement. Each one is here because it connects to a system area showing instability — not because more tools is better.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading your tools…</div>
      ) : tools.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Wrench className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground">No tools assigned yet.</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
            RGS assigns tools based on the system areas showing the most instability. As soon as one is ready for you, it will appear here.
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

      {systemTools.length > 0 && (
        (() => {
          // Split diagnostic vs. other system tools and order diagnostics by sequence.
          const diagnostic = systemTools.filter((t) => t.tool_type === "diagnostic");
          const others = systemTools.filter((t) => t.tool_type !== "diagnostic");
          const order = effectiveSequence(sequence);
          const ownerInterview = diagnostic.find((t) => t.tool_key === "owner_diagnostic_interview");
          const otherDx = diagnostic.filter((t) => t.tool_key !== "owner_diagnostic_interview");
          otherDx.sort((a, b) => {
            const ia = order.indexOf(a.tool_key);
            const ib = order.indexOf(b.tool_key);
            if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
          });
          const recommendedNext = ownerInterviewDone ? otherDx[0] ?? null : ownerInterview ?? null;
          const cardClass = "block rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors";
          return (
            <>
              {(ownerInterview || otherDx.length > 0) && (
                <section className="mt-12">
                  <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Diagnostic sequence</div>
                      <h2 className="text-base text-foreground mt-1">
                        {ownerInterviewDone
                          ? "Your recommended diagnostic order"
                          : "Start with the Owner Diagnostic Interview"}
                      </h2>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/80 mb-4 max-w-3xl leading-relaxed">
                    {ownerInterviewDone
                      ? "Based on your answers, your diagnostic tools are arranged in the order most likely to clarify where pressure is building first. You can follow the recommended path or open any unlocked tool."
                      : "Your diagnostic starts with the Owner Diagnostic Interview. This gives RGS the first read on how your business actually runs before deeper diagnostic tools unlock."}
                  </p>
                  {recommendedNext && recommendedNext.route_path && (
                    <Link to={recommendedNext.route_path} className="block mb-4 rounded-xl border border-primary/40 bg-primary/5 p-5 hover:bg-primary/10 transition-colors">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-1">Recommended next step</div>
                      <div className="text-base text-foreground font-medium">{recommendedNext.name}</div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {ownerInterviewDone
                          ? (reasonFor(sequence, recommendedNext.tool_key) ?? recommendedNext.description ?? "")
                          : "Capture how the business runs from the owner's seat. The other diagnostic tools unlock once this is complete."}
                      </p>
                    </Link>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {otherDx.map((t, idx) => {
                      const reason = reasonFor(sequence, t.tool_key);
                      const recommended = ownerInterviewDone && idx === 0;
                      return t.route_path ? (
                        <Link key={t.tool_id} to={t.route_path} className={cardClass}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Diagnostic {ownerInterviewDone ? `· #${idx + 1}` : ""}</div>
                            {recommended && <span className="text-[10px] uppercase tracking-wider text-primary">Recommended</span>}
                          </div>
                          <div className="text-base text-foreground font-medium">{t.name}</div>
                          {(reason || t.description) && (
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{reason ?? t.description}</p>
                          )}
                        </Link>
                      ) : (
                        <div key={t.tool_id} className={cardClass}>
                          <div className="text-base text-foreground font-medium">{t.name}</div>
                          {t.description && <p className="text-xs text-muted-foreground mt-2">{t.description}</p>}
                        </div>
                      );
                    })}
                    {!ownerInterviewDone && otherDx.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-xs text-muted-foreground">
                        Other diagnostic tools will unlock once the Owner Diagnostic Interview is complete.
                      </div>
                    )}
                  </div>
                </section>
              )}
              {others.length > 0 && (
                <section className="mt-12">
                  <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-primary">System tools</div>
                      <h2 className="text-base text-foreground mt-1">RGS system tools enabled for your account</h2>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{others.length} item{others.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {others.map((t) => (
                      t.route_path ? (
                        <Link key={t.tool_id} to={t.route_path} className={cardClass}>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">{TOOL_TYPE_LABEL[t.tool_type]}</div>
                          <div className="text-base text-foreground font-medium">{t.name}</div>
                          {t.description && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t.description}</p>}
                        </Link>
                      ) : (
                        <div key={t.tool_id} className={cardClass}>
                          <div className="text-base text-foreground font-medium">{t.name}</div>
                          {t.description && <p className="text-xs text-muted-foreground mt-2">{t.description}</p>}
                        </div>
                      )
                    ))}
                  </div>
                </section>
              )}
            </>
          );
        })()
      )}
    </PortalShell>
  );
}
