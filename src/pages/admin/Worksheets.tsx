import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, categoryLabel } from "@/lib/portal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ExternalLink, Download, Trash2, FileText, Users } from "lucide-react";
import { toast } from "sonner";

export default function Worksheets() {
  const [resources, setResources] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "client_specific",
    resource_type: "link",
    url: "",
  });

  const load = async () => {
    const [r, c] = await Promise.all([
      supabase.from("resources").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("id, full_name, business_name").order("full_name"),
    ]);
    if (r.data) setResources(r.data);
    if (c.data) setCustomers(c.data);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.title) {
      toast.error("Title required");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("resources")
      .insert([{ ...form, created_by: u.user?.id } as any]);
    if (error) toast.error(error.message);
    else {
      setOpen(false);
      setForm({
        title: "",
        description: "",
        category: "client_specific",
        resource_type: "link",
        url: "",
      });
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    await supabase.from("resources").delete().eq("id", id);
    load();
  };

  const assignToCustomer = async (resourceId: string, customerId: string) => {
    const { error } = await supabase
      .from("resource_assignments")
      .insert([{ resource_id: resourceId, customer_id: customerId }]);
    if (error) toast.error(error.message);
    else toast.success("Assigned");
    setAssignFor(null);
  };

  return (
    <PortalShell variant="admin">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Library
          </div>
          <h1 className="mt-2 text-3xl text-foreground">Tools & Worksheets</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-secondary">
              <Plus className="h-4 w-4" /> New Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>New Resource</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={form.resource_type}
                onChange={(e) => setForm({ ...form, resource_type: e.target.value })}
                className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
              >
                <option value="link">External Link</option>
                <option value="sheet">Google Sheet</option>
                <option value="file">Hosted File</option>
              </select>
              <Input
                placeholder="URL (https://…)"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
              <Button onClick={create} className="w-full bg-primary hover:bg-secondary">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-10">
        {CATEGORIES.map((cat) => {
          const items = resources.filter((r) => r.category === cat.key);
          return (
            <div key={cat.key}>
              <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
                {cat.label}
              </h2>
              {items.length === 0 ? (
                <div className="text-sm text-muted-foreground bg-card border border-dashed border-border rounded-xl p-6">
                  No resources in this category yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((r) => (
                    <div
                      key={r.id}
                      className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <button
                          onClick={() => remove(r.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-sm text-foreground font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2 min-h-[32px]">
                        {r.description || "—"}
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary hover:text-secondary"
                          >
                            <ExternalLink className="h-3 w-3" /> Open
                          </a>
                        )}
                        {r.url && (
                          <a
                            href={r.url}
                            download
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Download className="h-3 w-3" /> Download
                          </a>
                        )}
                        <button
                          onClick={() => setAssignFor(r.id)}
                          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Users className="h-3 w-3" /> Assign
                        </button>
                      </div>
                      {assignFor === r.id && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <select
                            onChange={(e) => assignToCustomer(r.id, e.target.value)}
                            className="w-full bg-muted/40 border border-border rounded-md px-2 py-1.5 text-xs text-foreground"
                            defaultValue=""
                          >
                            <option value="">Choose customer…</option>
                            {customers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.full_name} {c.business_name ? `· ${c.business_name}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PortalShell>
  );
}