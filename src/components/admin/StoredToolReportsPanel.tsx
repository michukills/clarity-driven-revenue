import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  ShieldCheck,
  Database,
  RefreshCcw,
} from "lucide-react";
import {
  getReportableTool,
  getToolReportSignedUrl,
  listToolReportArtifacts,
  setToolReportArtifactClientVisible,
  storeToolReportPdf,
  type ToolReportArtifactRow,
} from "@/lib/reports/toolReports";
import type { DraftSection, ReportDraftRow } from "@/lib/reports/types";
import { ReportModeSelector } from "@/components/admin/ReportModeSelector";
import { useGigCustomerScope } from "@/lib/gig/useGigCustomerScope";
import type { ToolReportMode } from "@/lib/reports/toolReportMode";

/**
 * Reusable admin panel for the Tool-Specific Report Generator.
 *
 * Used inside the existing Report Draft detail page when the draft is
 * a `tool_specific` report. Lets the admin:
 *  • Generate & store a PDF of the current client-safe sections.
 *  • List previously stored PDFs for this draft.
 *  • Open a stored PDF via a short-lived signed URL (storage RLS
 *    decides what is actually returned).
 *  • Mark a stored PDF client-visible (only effective when the
 *    underlying draft is approved + client_safe — RLS enforces this).
 *  • Remove client visibility.
 *
 * No PDF leaves admin-only state without an explicit click here.
 */
export interface StoredToolReportsPanelProps {
  draft: ReportDraftRow;
  liveSections: DraftSection[];
  customerLabel: string;
}

export function StoredToolReportsPanel({
  draft,
  liveSections,
  customerLabel,
}: StoredToolReportsPanelProps) {
  const [artifacts, setArtifacts] = useState<ToolReportArtifactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [storing, setStoring] = useState(false);
  const [reportMode, setReportMode] = useState<ToolReportMode>("gig_report");

  // Tool metadata travels in evidence_snapshot.notes (set by
  // generateToolSpecificDraft). Recover the tool key here so we can
  // show the matching catalog entry + use it for storage.
  const notes = (draft.evidence_snapshot?.notes ?? []) as string[];
  const toolKey =
    notes
      .find((n) => n.startsWith("tool_key:"))
      ?.slice("tool_key:".length) ?? null;
  const toolDef = toolKey ? getReportableTool(toolKey) : undefined;
  const scope = useGigCustomerScope(draft.customer_id ?? null, toolKey ?? undefined);
  const customerScope = scope.customerId
    ? {
        isGig: scope.isGig,
        gigTier: scope.gigTier ?? null,
        gigStatus: scope.gigStatus ?? null,
      }
    : null;

  // Default mode to full_rgs_report for full clients, gig_report for gig.
  useEffect(() => {
    if (!scope.loading) {
      setReportMode(scope.isGig ? "gig_report" : "full_rgs_report");
    }
  }, [scope.loading, scope.isGig]);

  const load = async () => {
    if (!draft.customer_id) {
      setArtifacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const all = await listToolReportArtifacts(draft.customer_id);
      // narrow to artifacts tied to *this* draft so the admin sees the
      // right history without cross-draft noise.
      setArtifacts(all.filter((a) => a.report_draft_id === draft.id));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load stored tool reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id, draft.customer_id]);

  const generate = async () => {
    if (!draft.customer_id || !toolDef) return;
    const clientSafe = liveSections.filter((s) => s.client_safe);
    if (clientSafe.length === 0) {
      toast.error(
        "Mark at least one section client-safe before generating a stored PDF.",
      );
      return;
    }
    setStoring(true);
    try {
      const nextVersion = (artifacts[0]?.version ?? 0) + 1;
      const stored = await storeToolReportPdf({
        customerId: draft.customer_id,
        customerLabel,
        toolKey: toolDef.toolKey,
        reportDraftId: draft.id,
        title: draft.title ?? `${toolDef.toolName} — Tool-Specific Report`,
        sections: clientSafe,
        version: nextVersion,
        reportMode,
        customerScope: customerScope ?? undefined,
      });
      toast.success(`Stored v${stored.version} (admin-only)`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not store PDF");
    } finally {
      setStoring(false);
    }
  };

  const open = async (a: ToolReportArtifactRow) => {
    try {
      const url = await getToolReportSignedUrl(a, 60);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open PDF");
    }
  };

  const setVisible = async (a: ToolReportArtifactRow, visible: boolean) => {
    try {
      if (visible && (draft.status !== "approved" || !draft.client_safe)) {
        toast.error(
          "Approve the draft and mark it client-safe before publishing the stored PDF.",
        );
        return;
      }
      await setToolReportArtifactClientVisible(a.id, visible);
      toast.success(visible ? "Marked client-visible" : "Returned to admin-only");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update visibility");
    }
  };

  if (draft.report_type !== "tool_specific") return null;

  return (
    <section
      className="bg-card border border-border rounded-xl p-5"
      data-testid="stored-tool-reports-panel"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" /> Stored tool reports
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xl">
            Stored PDFs live in the private <code>tool-reports</code> bucket.
            They are admin-only on creation. A client only sees a PDF after
            this draft is approved and the artifact is marked client-visible.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            className="border-border"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={generate}
            disabled={storing || !toolDef || !draft.customer_id}
            className="bg-primary hover:bg-secondary"
          >
            <FilePlus2 className="h-3.5 w-3.5" />{" "}
            {storing ? "Storing…" : "Generate & store PDF"}
          </Button>
        </div>
      </div>

      {!toolDef ? (
        <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
          This draft is not linked to a registered reportable tool. Storage is
          disabled until the source tool is registered in the reportable
          catalog.
        </div>
      ) : null}

      {toolDef && customerScope ? (
        <ReportModeSelector
          toolKey={toolDef.toolKey}
          customer={customerScope}
          value={reportMode}
          onChange={setReportMode}
        />
      ) : null}

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading stored PDFs…</div>
      ) : artifacts.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          No stored PDFs yet for this tool report.
        </div>
      ) : (
        <ul className="space-y-2">
          {artifacts.map((a) => (
            <li
              key={a.id}
              className="border border-border rounded-md p-3 text-sm"
              data-testid="stored-tool-report-row"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-foreground">{a.file_name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {a.tool_name} · {a.service_lane.replace(/_/g, " ")} · v
                    {a.version} ·{" "}
                    {new Date(a.generated_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                      a.client_visible
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {a.client_visible ? "client-visible" : "admin-only"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => open(a)}
                    className="border-border"
                  >
                    <Download className="h-3.5 w-3.5" /> Open
                  </Button>
                  {a.client_visible ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setVisible(a, false)}
                      className="border-border"
                    >
                      <EyeOff className="h-3.5 w-3.5" /> Make admin-only
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setVisible(a, true)}
                      className="bg-primary hover:bg-secondary"
                    >
                      <Eye className="h-3.5 w-3.5" /> Mark client-visible
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default StoredToolReportsPanel;