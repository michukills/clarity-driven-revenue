import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import type { BusinessControlReport } from "@/lib/bcc/reportTypes";
import { ReportRenderer } from "@/components/bcc/ReportRenderer";
import { logPortalAudit } from "@/lib/portalAudit";
import { CLIENT_SAFE_REPORT_SELECT } from "@/lib/reports/clientSafeReportFields";
import { ArchitectsShieldAcceptance } from "@/components/legal/ArchitectsShieldAcceptance";
import { isAcknowledgmentCurrent } from "@/lib/legal/clientAcknowledgments";
import { REPORT_PDF_SCOPE_BULLETS } from "@/config/architectsShield";

export default function ClientReportView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<BusinessControlReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [shieldAccepted, setShieldAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!id) return;
    // RLS restricts: only published + own-customer reports return.
    // P34: explicit client-safe column allowlist — exclude internal_notes from client queries.
    supabase
      .from("business_control_reports")
      .select(CLIENT_SAFE_REPORT_SELECT)
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReport(data as any);
          // P69 — check if Architect's Shield™ acceptance is on file for
          // this customer at the current version.
          isAcknowledgmentCurrent(
            (data as any).customer_id,
            "architects_shield_scope_agreement",
          )
            .then((ok) => setShieldAccepted(ok))
            .catch(() => setShieldAccepted(false));
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

  // P69 — gate report viewing on Architect's Shield™ acceptance.
  if (shieldAccepted === false) {
    return (
      <PortalShell variant="customer">
        <button
          onClick={() => navigate("/portal/reports")}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Reports
        </button>
        <div className="mb-4">
          <h1 className="text-2xl text-foreground">Acknowledge before viewing your report</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Before opening your {report.report_type === "monthly" ? "monthly" : "quarterly"} report,
            please acknowledge the Architect&rsquo;s Shield&trade; scope agreement so the
            boundaries between your responsibilities and RGS&rsquo;s role are clear.
          </p>
        </div>
        <ArchitectsShieldAcceptance
          customerId={report.customer_id as string}
          agreementKey="architects_shield_scope_agreement"
          context="report_view"
          onAccepted={() => setShieldAccepted(true)}
        />
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
      <section
        data-testid="report-scope-bullets"
        className="mt-8 rounded-xl border border-border bg-card/60 p-4 sm:p-5"
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Scope &amp; responsibility
        </div>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground leading-relaxed list-disc pl-5">
          {REPORT_PDF_SCOPE_BULLETS.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </section>
    </PortalShell>
  );
}
