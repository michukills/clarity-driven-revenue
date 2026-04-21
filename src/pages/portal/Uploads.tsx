import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/portal";
import { Upload as UploadIcon, FileText, Download } from "lucide-react";
import { toast } from "sonner";

export default function Uploads() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: c } = await supabase.from("customers").select("*").eq("user_id", user.id).maybeSingle();
    setCustomer(c);
    if (c) {
      const { data } = await supabase.from("customer_uploads").select("*").eq("customer_id", c.id).order("created_at", { ascending: false });
      setItems(data || []);
    }
  };
  useEffect(() => { load(); }, [user]);

  const onUpload = async (file: File) => {
    if (!customer) return;
    setBusy(true);
    try {
      const path = `${customer.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("client-uploads").upload(path, file);
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("client-uploads").createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error: insErr } = await supabase.from("customer_uploads").insert([{
        customer_id: customer.id, file_name: file.name, file_path: path, file_url: signed?.signedUrl, size_bytes: file.size, uploaded_by: user?.id,
      }]);
      if (insErr) throw insErr;
      toast.success("Uploaded");
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
        <div className="text-muted-foreground text-sm">Your client workspace is not active yet.</div>
      </PortalShell>
    );
  }

  return (
    <PortalShell variant="customer">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Secure</div>
        <h1 className="mt-2 text-3xl text-foreground">Uploads</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Securely send completed worksheets, screenshots, and documents to the RGS team. Files are private to your workspace.
        </p>
      </div>

      <label className={`block bg-card border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 transition-colors ${busy ? "opacity-60" : ""}`}>
        <UploadIcon className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <div className="text-sm text-foreground">{busy ? "Uploading…" : "Click to upload a file"}</div>
        <div className="text-xs text-muted-foreground mt-1">Spreadsheets, PDFs, images. Max 50 MB.</div>
        <input type="file" className="hidden" disabled={busy}
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
      </label>

      <div className="mt-8 space-y-2">
        {items.length === 0 && <div className="text-xs text-muted-foreground">No uploads yet.</div>}
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
