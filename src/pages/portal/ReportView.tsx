import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import type { BusinessControlReport } from "@/lib/bcc/reportTypes";
import { ReportRenderer } from "@/components/bcc/ReportRenderer";
import { logPortalAudit } from "@/lib/portalAudit";
import { CLIENT_SAFE_REPORT_SELECT } from "@/lib/reports/clientSafeReportFields";

export default function ClientReportView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<BusinessControlReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    // RLS restricts: only published + own-customer reports return.
    // P34: explicit client-safe column allowlist (explicitly excludes internal_notes).
    supabase
      .from("business_control_reports")
      .select(CLIENT_SAFE_REPORT_SELECT)
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReport(data as any);
          // P19 audit — log a client viewing a published report. Minimal
          // payload: id + type + source. Never report contents.
          void logPortalAudit(
            "report_viewed",
            (data as any).customer_id,
            {
              report_id: (data as any).id,
              report_type: (data as any).report_type,
              source: "client_portal",
            },
          );
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <PortalShell variant="customer">
        <div className="text-sm text-muted-foreground">Loading report…</div>
      </PortalShell>
    );
  }
  if (!report) {
    return (
      <PortalShell variant="customer">
        <div className="text-sm text-muted-foreground">This report is not available.</div>
      </PortalShell>
    );
  }

  return (
    <PortalShell variant="customer">
      <button
        onClick={() => navigate("/portal/reports")}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Reports
      </button>
      {/* showInternal is intentionally never set — clients must not see internal notes. */}
      <ReportRenderer
        snapshot={report.report_data}
        clientNotes={report.client_notes}
      />
    </PortalShell>
  );
}
