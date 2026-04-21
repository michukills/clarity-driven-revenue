import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Plus, FolderOpen } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ToolRunRecord {
  id: string;
  tool_key: string;
  customer_id: string | null;
  title: string;
  data: any;
  summary: any;
  updated_at: string;
  created_at: string;
}

interface Props {
  toolKey: string;
  toolTitle: string;
  description: string;
  data: any;
  setData: (d: any) => void;
  computeSummary: (data: any) => any;
  defaultData: any;
  children: ReactNode;
  rightPanel?: ReactNode;
}

export const ToolRunnerShell = ({
  toolKey,
  toolTitle,
  description,
  data,
  setData,
  computeSummary,
  defaultData,
  children,
  rightPanel,
}: Props) => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<ToolRunRecord[]>([]);
  const [customers, setCustomers] = useState<{ id: string; full_name: string; business_name: string | null }[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled run");
  const [customerId, setCustomerId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const loadRuns = async () => {
    const { data: r } = await supabase
      .from("tool_runs")
      .select("*")
      .eq("tool_key", toolKey)
      .order("updated_at", { ascending: false });
    if (r) setRuns(r as any);
  };

  useEffect(() => {
    loadRuns();
    supabase
      .from("customers")
      .select("id, full_name, business_name")
      .order("full_name")
      .then(({ data }) => data && setCustomers(data));
  }, [toolKey]);

  const newRun = () => {
    setActiveRunId(null);
    setTitle("Untitled run");
    setCustomerId("");
    setData(defaultData);
  };

  const loadRun = (run: ToolRunRecord) => {
    setActiveRunId(run.id);
    setTitle(run.title);
    setCustomerId(run.customer_id ?? "");
    setData(run.data ?? defaultData);
  };

  const save = async () => {
    setSaving(true);
    try {
      const summary = computeSummary(data);
      const payload = {
        tool_key: toolKey,
        title: title || "Untitled run",
        customer_id: customerId || null,
        data,
        summary,
      };
      if (activeRunId) {
        const { error } = await supabase.from("tool_runs").update(payload).eq("id", activeRunId);
        if (error) throw error;
        toast.success("Run updated");
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { data: created, error } = await supabase
          .from("tool_runs")
          .insert([{ ...payload, created_by: u.user?.id }])
          .select()
          .single();
        if (error) throw error;
        if (created) setActiveRunId((created as any).id);
        toast.success("Run saved");
      }
      loadRuns();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this run?")) return;
    await supabase.from("tool_runs").delete().eq("id", id);
    if (activeRunId === id) newRun();
    loadRuns();
  };

  return (
    <PortalShell variant="admin">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate("/admin/tools")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Tools
          </button>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Internal · Core RGS Tool</div>
          <h1 className="mt-1 text-3xl text-foreground">{toolTitle}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{description}</p>
        </div>
        <Button onClick={newRun} variant="outline" className="border-border">
          <Plus className="h-4 w-4" /> New Run
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {/* Run metadata */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_auto] gap-3 items-end">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Run title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q4 diagnostic – Acme Co."
                  className="mt-1 bg-muted/40 border-border"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Client (optional)</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
                >
                  <option value="">— None —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} {c.business_name ? `· ${c.business_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={save} disabled={saving} className="bg-primary hover:bg-secondary h-10">
                <Save className="h-4 w-4" /> {activeRunId ? "Save" : "Save run"}
              </Button>
            </div>
          </div>

          {children}
        </div>

        <aside className="space-y-6">
          {rightPanel}

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
              <FolderOpen className="h-3.5 w-3.5" /> Saved Runs
            </div>
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No saved runs yet.</p>
            ) : (
              <ul className="space-y-1">
                {runs.map((r) => {
                  const cust = customers.find((c) => c.id === r.customer_id);
                  const active = r.id === activeRunId;
                  return (
                    <li
                      key={r.id}
                      className={`group rounded-md border ${
                        active ? "border-primary/50 bg-primary/10" : "border-transparent hover:bg-muted/30"
                      }`}
                    >
                      <button
                        onClick={() => loadRun(r)}
                        className="w-full text-left px-3 py-2"
                      >
                        <div className="text-sm text-foreground truncate">{r.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {cust ? cust.full_name : "No client"} · {new Date(r.updated_at).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        onClick={() => remove(r.id)}
                        className="px-3 pb-2 text-[11px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3 inline mr-1" /> delete
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </PortalShell>
  );
};

export default ToolRunnerShell;