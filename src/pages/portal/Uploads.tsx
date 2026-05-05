import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { formatDate } from "@/lib/portal";
import { Upload as UploadIcon, FileText, Download, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { logPortalAudit } from "@/lib/portalAudit";
import { createClientEvidenceRecord } from "@/lib/evidence/evidenceRecords";
import {
  EVIDENCE_VAULT_NAME,
  OPERATIONAL_READINESS_PRINCIPLE,
  VAULT_NOT_OFFICIAL_RECORD_DISCLAIMER,
  VAULT_DATA_PORTABILITY_NOTE,
  VAULT_REDACTION_WARNING,
  VAULT_REDACTION_CONFIRMATION_LABEL,
} from "@/config/evidenceVault";

export default function Uploads() {
  const { user } = useAuth();
  const { customerId } = usePortalCustomerId();
  const [customer, setCustomer] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [redactionConfirmed, setRedactionConfirmed] = useState(false);

  const load = async () => {
    if (!customerId) {
      setCustomer(null);
      setItems([]);
      return;
    }
    const { data: c } = await supabase.from("customers").select("*").eq("id", customerId).is("archived_at", null).maybeSingle();
    setCustomer(c);
    if (c) {
      const { data } = await supabase.from("customer_uploads").select("*").eq("customer_id", c.id).order("created_at", { ascending: false });
      setItems(data || []);
    }
  };
  useEffect(() => { load(); }, [customerId]);

  const onUpload = async (file: File) => {
    if (!customer) return;
    if (!redactionConfirmed) {
      toast.error("Confirm the redaction acknowledgment before uploading.");
      return;
    }
    setBusy(true);
    try {
      const path = `${customer.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("client-uploads").upload(path, file);
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("client-uploads").createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error: insErr } = await supabase.from("customer_uploads").insert([{
        customer_id: customer.id, file_name: file.name, file_path: path, file_url: signed?.signedUrl, size_bytes: file.size, uploaded_by: user?.id,
        notes: "owner_redaction_confirmed=true",
      }]);
      if (insErr) throw insErr;
      // P67B — create evidence_records metadata row tied to this upload.
      // Look up the just-inserted upload id (most recent for this file path).
      const { data: uploadRow } = await supabase
        .from("customer_uploads")
        .select("id")
        .eq("customer_id", customer.id)
        .eq("file_path", path)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      try {
        await createClientEvidenceRecord({
          customerId: customer.id,
          customerUploadId: uploadRow?.id ?? null,
          evidenceTitle: file.name,
          ownerRedactionConfirmed: true,
        });
      } catch (metaErr) {
        // Metadata is non-blocking for the upload itself; surface gently.
        console.warn("evidence metadata insert failed", metaErr);
      }
      // P18 audit — minimal, safe payload (no file contents).
      void logPortalAudit("file_uploaded", customer.id, {
        file_name: file.name,
        size_bytes: file.size,
        owner_redaction_confirmed: true,
      });
      toast.success("Uploaded");
      setRedactionConfirmed(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  if (!customer) {
    return (
      <PortalShell variant="customer">
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <UploadIcon className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground">Your workspace is being prepared.</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
            Secure file exchange will activate once your engagement is live. Your RGS team will let you know when it's ready.
          </p>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell variant="customer">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Secure exchange</div>
        <h1 className="mt-2 text-3xl text-foreground">{EVIDENCE_VAULT_NAME}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Send worksheets, screenshots, statements, or documents to your RGS team. Everything here stays private to your engagement.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4 mb-4 space-y-3">
        <div className="flex items-start gap-2 text-xs text-foreground">
          <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p>{OPERATIONAL_READINESS_PRINCIPLE}</p>
            <p className="text-muted-foreground">{VAULT_NOT_OFFICIAL_RECORD_DISCLAIMER}</p>
            <p className="text-muted-foreground">{VAULT_DATA_PORTABILITY_NOTE}</p>
            <p className="text-foreground"><strong>Before uploading:</strong> {VAULT_REDACTION_WARNING}</p>
          </div>
        </div>
        <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={redactionConfirmed}
            onChange={(e) => setRedactionConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          <span>{VAULT_REDACTION_CONFIRMATION_LABEL}</span>
        </label>
      </div>

      <label className={`block bg-card border-2 border-dashed border-border rounded-xl p-10 text-center transition-colors ${busy || !redactionConfirmed ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-primary/40"}`}>
        <UploadIcon className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <div className="text-sm text-foreground">
          {busy
            ? "Uploading…"
            : redactionConfirmed
              ? "Click or drop a file to upload"
              : "Confirm the redaction acknowledgment above to enable uploads"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">Spreadsheets, PDFs, or images · up to 50 MB</div>
        <input type="file" className="hidden" disabled={busy || !redactionConfirmed}
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
      </label>

      <div className="mt-8 space-y-2">
        {items.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No files shared yet. Anything you upload here is reviewed by your RGS team.
          </div>
        )}
        {items.map((u) => (
          <a key={u.id} href={u.file_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 p-3 rounded-md bg-card border border-border hover:border-primary/40">
            <FileText className="h-4 w-4 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground truncate">{u.file_name}</div>
              <div className="text-[10px] text-muted-foreground">{formatDate(u.created_at)}</div>
            </div>
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        ))}
      </div>
    </PortalShell>
  );
}
