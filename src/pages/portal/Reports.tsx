import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ExternalLink, Compass, Download } from "lucide-react";
import type { BusinessControlReport } from "@/lib/bcc/reportTypes";
import { useToolUsageSession } from "@/lib/usage/toolUsageSession";
import { CLIENT_SAFE_REPORT_SELECT } from "@/lib/reports/clientSafeReportFields";
import {
  getToolReportSignedUrl,
  type ToolReportArtifactRow,
} from "@/lib/reports/toolReports";
import { toast } from "sonner";

const TYPE_LABEL = {
  monthly: "Monthly Business Health Report",
  quarterly: "Quarterly Stability Review",
} as const;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default function ClientReports() {
  const navigate = useNavigate();
  useToolUsageSession({ toolTitle: "Reports & Reviews", toolKey: "client_reports" });
  const [reports, setReports] = useState<BusinessControlReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [toolReports, setToolReports] = useState<ToolReportArtifactRow[]>([]);

  useEffect(() => {
    // RLS restricts to the client's own published reports.
    // P34: explicit client-safe column allowlist — exclude internal_notes from client queries.
    supabase
      .from("business_control_reports")
      .select(CLIENT_SAFE_REPORT_SELECT)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReports(data as any);
        setLoading(false);
      });
    // P70 — Stored tool-specific PDFs. RLS restricts to the client's own
    // approved + client-visible artifacts only; no admin-only notes are
    // exposed because storage is a separate bucket of bounded PDFs.
    supabase
      .from("tool_report_artifacts" as any)
      .select(
        "id, tool_name, service_lane, version, file_name, generated_at, storage_bucket, storage_path, customer_id, report_draft_id, client_visible, archived_at",
      )
      .order("generated_at", { ascending: false })
      .then(({ data }) => {
        if (data) setToolReports(data as unknown as ToolReportArtifactRow[]);
      });
  }, []);

  const monthly = useMemo(() => reports.filter((r) => r.report_type === "monthly"), [reports]);
  const quarterly = useMemo(() => reports.filter((r) => r.report_type === "quarterly"), [reports]);

  const openToolReport = async (a: ToolReportArtifactRow) => {
    try {
      const url = await getToolReportSignedUrl(a, 60);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open report");
    }
  };

  return (
    <PortalShell variant="customer">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Business Health</div>
        <h1 className="mt-1 text-3xl text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Your Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Each report is a frozen read of the business at a point in time — what happened,
          what it appears to mean, what is changing, what is at risk, and what the next
          practical step looks like.
        </p>
        <p className="text-xs text-muted-foreground/80 mt-2 max-w-2xl leading-relaxed">
          Findings inside each report carry an evidence level so you can see how strongly
          they are supported. Observed means RGS saw direct support. Indicated means
          multiple signals point in the same direction. Possible means it is worth
          reviewing. Insufficient Data means RGS cannot conclude yet — that usually means
          a small piece of information may make the read clearer.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading your reports…</div>
      ) : reports.length === 0 && toolReports.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
          <div className="text-sm text-foreground">No report has been added yet.</div>
          <div className="text-xs text-muted-foreground mt-1">
            Once your diagnostic is reviewed, this area will show what needs attention first.
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {monthly.length > 0 && (
            <ReportGroup title="Monthly Reports" reports={monthly} onOpen={(id) => navigate(`/portal/reports/${id}`)} />
          )}
          {quarterly.length > 0 && (
            <ReportGroup title="Quarterly Reviews" reports={quarterly} onOpen={(id) => navigate(`/portal/reports/${id}`)} />
          )}
          {toolReports.length > 0 && (
            <section data-testid="client-tool-reports">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
                Tool-Specific Reports
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {toolReports.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => openToolReport(a)}
                    className="text-left rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {a.tool_name}
                      </div>
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="mt-2 text-sm text-foreground">{a.file_name}</div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {a.service_lane.replace(/_/g, " ")} · v{a.version} ·{" "}
                      {fmtDate(a.generated_at)}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PortalShell>
  );
}

function ReportGroup({
  title,
  reports,
  onOpen,
}: {
  title: string;
  reports: BusinessControlReport[];
  onOpen: (id: string) => void;
}) {
  return (
    <section>
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => onOpen(r.id)}
            className="text-left rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {TYPE_LABEL[r.report_type]}
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="mt-2 text-lg text-foreground">
              {fmtDate(r.period_start)} → {fmtDate(r.period_end)}
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm">
              {r.health_score != null && (
                <span className="text-foreground">Health {r.health_score}/100</span>
              )}
              {r.recommended_next_step && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Compass className="h-3.5 w-3.5" /> {r.recommended_next_step}
                </span>
              )}
            </div>
            {r.published_at && (
              <div className="mt-2 text-[11px] text-muted-foreground">
                Released {fmtDate(r.published_at)}
              </div>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
