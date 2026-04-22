import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Send, Archive, Eye } from "lucide-react";
import { toast } from "sonner";
import type { BusinessControlReport, ReportStatus } from "@/lib/bcc/reportTypes";
import { ReportRenderer } from "@/components/bcc/ReportRenderer";
import { logReportActivity } from "@/lib/bcc/reportActivity";

export default function AdminReportEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<BusinessControlReport | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewClient, setPreviewClient] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("business_control_reports")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReport(data as any);
          setInternalNotes((data as any).internal_notes || "");
          setClientNotes((data as any).client_notes || "");
        }
        setLoading(false);
      });
  }, [id]);

  const saveNotes = async () => {
    if (!report) return;
    setSaving(true);
    const { error } = await supabase
      .from("business_control_reports")
      .update({ internal_notes: internalNotes, client_notes: clientNotes })
      .eq("id", report.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Notes saved");
  };

  const setStatus = async (status: ReportStatus) => {
    if (!report) return;
    const prevStatus = report.status;
    const patch: any = { status };
    if (status === "published") patch.published_at = new Date().toISOString();
    const { error } = await supabase.from("business_control_reports").update(patch).eq("id", report.id);
    if (error) return toast.error(error.message);
    await logReportActivity(report.id, prevStatus, status, report.customer_id);
    toast.success(
      status === "published" ? "Report published to client" :
      status === "archived" ? "Report archived" :
      "Report status updated",
    );
    setReport({ ...report, status, published_at: patch.published_at ?? report.published_at });
  };

  if (loading) {
    return (
      <PortalShell variant="admin">
        <div className="text-sm text-muted-foreground">Loading report…</div>
      </PortalShell>
    );
  }
  if (!report) {
    return (
      <PortalShell variant="admin">
        <div className="text-sm text-muted-foreground">Report not found.</div>
      </PortalShell>
    );
  }

  return (
    <PortalShell variant="admin">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate("/admin/reports")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Reports
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setPreviewClient((v) => !v)} variant="outline" className="border-border">
            <Eye className="h-4 w-4" /> {previewClient ? "Show internal notes" : "Preview as client"}
          </Button>
          {report.status === "draft" && (
            <Button onClick={() => setStatus("published")} className="bg-primary hover:bg-secondary">
              <Send className="h-4 w-4" /> Publish to client
            </Button>
          )}
          {report.status === "published" && (
            <Button onClick={() => setStatus("archived")} variant="outline" className="border-border">
              <Archive className="h-4 w-4" /> Archive
            </Button>
          )}
        </div>
      </div>

      {previewClient && (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
          Client preview — internal notes are hidden. Exit preview to edit notes.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <ReportRenderer
            snapshot={report.report_data}
            clientNotes={clientNotes}
            internalNotes={internalNotes}
            showInternal={!previewClient}
          />
        </div>

        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Status</div>
            <div className="text-sm text-foreground capitalize">{report.status}</div>
            {report.published_at && (
              <div className="text-[11px] text-muted-foreground mt-1">
                Published {new Date(report.published_at).toLocaleString()}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Client-facing note
              </label>
              <Textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                rows={4}
                placeholder="Optional message that the client will see at the top of the report."
                className="mt-1 bg-muted/40 border-border"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Internal note (admin-only)
              </label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={4}
                placeholder="Notes for the RGS team. Never shown to the client."
                className="mt-1 bg-muted/40 border-border"
              />
            </div>
            <Button onClick={saveNotes} disabled={saving} className="w-full bg-primary hover:bg-secondary">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save notes"}
            </Button>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
