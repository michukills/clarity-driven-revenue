import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import type { BusinessControlReport } from "@/lib/bcc/reportTypes";
import { ReportRenderer } from "@/components/bcc/ReportRenderer";

export default function ClientReportView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<BusinessControlReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    // RLS restricts: only published + own-customer reports return.
    supabase
      .from("business_control_reports")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setReport(data as any);
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
