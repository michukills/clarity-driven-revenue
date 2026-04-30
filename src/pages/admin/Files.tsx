import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/portal";
import { FileText, Download, FolderOpen, Link2, ExternalLink } from "lucide-react";
// TODO(P19 audit): wire file_deleted once an admin/client delete UI exists.
// No client-uploads delete action is currently exposed in this view; bulk
// archival happens via customer archive in CustomerDetail.tsx.

type Upload = { id: string; customer_id: string; file_name: string; file_url: string | null; size_bytes: number | null; created_at: string };
type Resource = { id: string; title: string; url: string | null; file_path: string | null; visibility: string; resource_type: string; updated_at: string };
type Customer = { id: string; full_name: string; business_name: string | null };

export default function Files() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tab, setTab] = useState<"uploads" | "resources">("uploads");
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const [{ data: u }, { data: r }, { data: c }] = await Promise.all([
        supabase.from("customer_uploads").select("*").order("created_at", { ascending: false }),
        supabase.from("resources").select("*").order("updated_at", { ascending: false }),
        supabase.from("customers").select("id, full_name, business_name").order("full_name"),
      ]);
      setUploads((u as any) || []);
      setResources((r as any) || []);
      setCustomers((c as any) || []);
    })();
  }, []);

  const customerName = (id: string) => {
    const c = customers.find((x) => x.id === id);
    return c ? `${c.full_name}${c.business_name ? " · " + c.business_name : ""}` : "Unknown";
  };

  const filteredUploads = useMemo(() => uploads.filter((u) => {
    if (customerFilter !== "all" && u.customer_id !== customerFilter) return false;
    if (search && !u.file_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [uploads, customerFilter, search]);

  const filteredResources = useMemo(() => resources.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [resources, search]);

  const totalBytes = filteredUploads.reduce((sum, u) => sum + (u.size_bytes || 0), 0);
  const fmtSize = (b: number) => {
    if (b > 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + " MB";
    if (b > 1024) return (b / 1024).toFixed(1) + " KB";
    return b + " B";
  };

  return (
    <PortalShell variant="admin">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Files</div>
        <h1 className="mt-2 text-3xl text-foreground">File Manager</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Every file, upload, and linked resource across all clients in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <Stat label="Client uploads" value={uploads.length.toString()} />
        <Stat label="Linked resources" value={resources.length.toString()} />
        <Stat label="Total upload size" value={fmtSize(uploads.reduce((s, u) => s + (u.size_bytes || 0), 0))} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <div className="flex bg-muted/30 border border-border rounded-md p-0.5">
          {(["uploads", "resources"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 h-8 text-xs rounded-sm capitalize ${tab === t ? "bg-card text-foreground" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…" className="max-w-xs bg-muted/40 border-border" />
        {tab === "uploads" && (
          <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}
            className="bg-muted/40 border border-border rounded-md px-3 h-9 text-sm text-foreground">
            <option value="all">All clients</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {tab === "uploads" ? `${filteredUploads.length} files · ${fmtSize(totalBytes)}` : `${filteredResources.length} resources`}
        </span>
      </div>

      {tab === "uploads" ? (
        filteredUploads.length === 0 ? (
          <Empty label="No client uploads match." />
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
            {filteredUploads.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">{u.file_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    <Link to={`/admin/customers/${u.customer_id}`} className="hover:text-foreground">{customerName(u.customer_id)}</Link>
                    {" · "}{formatDate(u.created_at)}{u.size_bytes ? ` · ${fmtSize(u.size_bytes)}` : ""}
                  </div>
                </div>
                {u.file_url && (
                  <a href={u.file_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                    <Download className="h-3 w-3" /> Download
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      ) : filteredResources.length === 0 ? (
        <Empty label="No linked resources." />
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {filteredResources.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground truncate">{r.title}</div>
                <div className="text-[11px] text-muted-foreground capitalize">
                  {r.visibility} · {r.resource_type} · {formatDate(r.updated_at)}
                </div>
              </div>
              {r.url && (
                <a href={r.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-3 w-3" /> Open
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-2xl text-foreground mt-1">{value}</div>
  </div>
);

const Empty = ({ label }: { label: string }) => (
  <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
    <FolderOpen className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);
