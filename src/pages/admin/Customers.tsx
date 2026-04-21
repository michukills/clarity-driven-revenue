import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { stageLabel, formatDate, STAGES } from "@/lib/portal";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function Customers() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    business_name: "",
    service_type: "",
    stage: "lead",
    business_description: "",
  });

  const load = async () => {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setRows(data);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.full_name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    const { error } = await supabase.from("customers").insert([form as any]);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Customer added");
      setOpen(false);
      setForm({
        full_name: "",
        email: "",
        business_name: "",
        service_type: "",
        stage: "lead",
        business_description: "",
      });
      load();
    }
  };

  return (
    <PortalShell variant="admin">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Customers
          </div>
          <h1 className="mt-2 text-3xl text-foreground">All Customers</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-secondary">
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input
                placeholder="Full name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
              <Input
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder="Business name"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              />
              <Input
                placeholder="Service type (e.g. Diagnostic, Implementation)"
                value={form.service_type}
                onChange={(e) => setForm({ ...form, service_type: e.target.value })}
              />
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <Textarea
                placeholder="Business description"
                value={form.business_description}
                onChange={(e) => setForm({ ...form, business_description: e.target.value })}
              />
              <Button onClick={create} className="w-full bg-primary hover:bg-secondary">
                Create Customer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3">Business</th>
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-left px-5 py-3">Service</th>
              <th className="text-left px-5 py-3">Stage</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-left px-5 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  No customers yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => navigate(`/admin/customers/${r.id}`)}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <td className="px-5 py-4 text-foreground">{r.full_name}</td>
                <td className="px-5 py-4 text-muted-foreground">{r.business_name || "—"}</td>
                <td className="px-5 py-4 text-muted-foreground">{r.email}</td>
                <td className="px-5 py-4 text-muted-foreground">{r.service_type || "—"}</td>
                <td className="px-5 py-4">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                    {stageLabel(r.stage)}
                  </span>
                </td>
                <td className="px-5 py-4 text-muted-foreground capitalize">{r.status}</td>
                <td className="px-5 py-4 text-muted-foreground text-xs">
                  {formatDate(r.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}