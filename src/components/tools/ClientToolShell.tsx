import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, FolderOpen, Trash2 } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

export const ClientToolShell = ({
  toolKey, toolTitle, description, data, setData, computeSummary, defaultData, children, rightPanel,
}: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [title, setTitle] = useState("My run");
  const [saving, setSaving] = useState(false);

  const loadRuns = async (cid: string) => {
    const { data: r } = await supabase
      .from("tool_runs")
      .select("*")
      .eq("tool_key", toolKey)
      .eq("customer_id", cid)
      .order("updated_at", { ascending: false });
    setRuns(r || []);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from("customers").select("id").eq("user_id", user.id).maybeSingle();
      if (c) {
        setCustomerId(c.id);
        loadRuns(c.id);
      }
    })();
  }, [user, toolKey]);

  const newRun = () => {
    setActiveRunId(null);
    setTitle("My run");
    setData(defaultData);
  };

  const loadRun = (r: any) => {
    setActiveRunId(r.id);
    setTitle(r.title);
    setData(r.data ?? defaultData);
  };

  const save = async () => {
    if (!customerId) {
      toast.error("Workspace not active yet.");
      return;
    }
    setSaving(true);
    try {
      const summary = computeSummary(data);
      const payload = {
        tool_key: toolKey,
        title: title || "My run",
        customer_id: customerId,
        data,
        summary,
      };
      if (activeRunId) {
        const { error } = await supabase.from("tool_runs").update(payload).eq("id", activeRunId);
        if (error) throw error;
        toast.success("Saved");
      } else {
        const { data: created, error } = await supabase
          .from("tool_runs")
          .insert([{ ...payload, created_by: user?.id }])
          .select()
          .single();
        if (error) throw error;
        if (created) setActiveRunId((created as any).id);
        toast.success("Saved");
      }
      loadRuns(customerId);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("tool_runs").delete().eq("id", id);
    if (activeRunId === id) newRun();
    if (customerId) loadRuns(customerId);
  };

  return (
    <PortalShell variant="customer">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate("/portal/tools")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3 w-3" /> Back to My Tools
          </button>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Client Tool</div>
          <h1 className="mt-1 text-3xl text-foreground">{toolTitle}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{description}</p>
        </div>
        <Button onClick={newRun} variant="outline" className="border-border">
          <Plus className="h-4 w-4" /> New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Entry title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 bg-muted/40 border-border"
                />
              </div>
              <Button onClick={save} disabled={saving} className="bg-primary hover:bg-secondary h-10">
                <Save className="h-4 w-4" /> Save
              </Button>
            </div>
          </div>
          {children}
        </div>

        <aside className="space-y-6">
          {rightPanel}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
              <FolderOpen className="h-3.5 w-3.5" /> My Saved Entries
            </div>
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No entries yet.</p>
            ) : (
              <ul className="space-y-1">
                {runs.map((r) => {
                  const active = r.id === activeRunId;
                  return (
                    <li key={r.id} className={`group rounded-md border ${active ? "border-primary/50 bg-primary/10" : "border-transparent hover:bg-muted/30"}`}>
                      <button onClick={() => loadRun(r)} className="w-full text-left px-3 py-2">
                        <div className="text-sm text-foreground truncate">{r.title}</div>
                        <div className="text-[11px] text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</div>
                      </button>
                      <button onClick={() => remove(r.id)} className="px-3 pb-2 text-[11px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">
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

export default ClientToolShell;
