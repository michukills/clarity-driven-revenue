import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Plus, FolderOpen, Eye, EyeOff, Compass, History } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
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
  /** Optional client-preview slot. When provided, a "Preview as client" toggle appears in the header. */
  clientPreview?: ReactNode;
  /** Currently-selected recommended next RGS step (e.g. "Diagnostic"). */
  recommendedNextStep?: string;
  /** Available next-step options (defaults to the locked RGS three). */
  nextStepOptions?: string[];
  /** Called when admin chooses a recommended next step. */
  onRecommendedNextStepChange?: (v: string) => void;
  /** Singular noun for a saved record. Defaults to "benchmark". */
  entryNoun?: string;
  /** Plural form. Defaults to entryNoun + "s". */
  entryNounPlural?: string;
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
  clientPreview,
  recommendedNextStep,
  nextStepOptions = ["Diagnostic", "Implementation", "Add-ons / Monitoring"],
  onRecommendedNextStepChange,
  entryNoun = "benchmark",
  entryNounPlural,
}: Props) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [runs, setRuns] = useState<ToolRunRecord[]>([]);
  const [customers, setCustomers] = useState<{ id: string; full_name: string; business_name: string | null }[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const nounSingular = entryNoun;
  const nounPlural = entryNounPlural ?? `${entryNoun}s`;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const [title, setTitle] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [previewClient, setPreviewClient] = useState(false);

  const formatTimestamp = (d: Date) =>
    `${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

  const generateBenchmarkName = (custId: string): string => {
    const cust = customers.find((c) => c.id === custId);
    const base = cust ? (cust.business_name || cust.full_name || "Benchmark") : "Benchmark";
    return `${base} — ${formatTimestamp(new Date())}`;
  };

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

  // Auto-load a benchmark if ?run=<id> is present
  useEffect(() => {
    const runId = searchParams.get("run");
    if (!runId || activeRunId === runId) return;
    supabase
      .from("tool_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).tool_key === toolKey) {
          loadRun(data as any);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, toolKey]);

  const newRun = () => {
    setActiveRunId(null);
    setTitle("");
    setCustomerId("");
    setData(defaultData);
    setPreviewClient(false);
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
      const finalTitle = activeRunId
        ? (title || generateBenchmarkName(customerId))
        : generateBenchmarkName(customerId);
      const payload = {
        tool_key: toolKey,
        title: finalTitle,
        customer_id: customerId || null,
        data,
        summary,
      };
      if (activeRunId) {
        const { error } = await supabase.from("tool_runs").update(payload).eq("id", activeRunId);
        if (error) throw error;
        toast.success(`Benchmark saved`);
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { data: created, error } = await supabase
          .from("tool_runs")
          .insert([{ ...payload, created_by: u.user?.id }])
          .select()
          .single();
        if (error) throw error;
        if (created) {
          setActiveRunId((created as any).id);
          setTitle((created as any).title);
        }
        toast.success(`Benchmark saved as "${finalTitle}"`);
      }
      loadRuns();
    } catch (e: any) {
      toast.error(e.message || `Could not save benchmark`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(`Delete this saved benchmark? This cannot be undone.`)) return;
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
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">RGS OS · Core Tool</div>
          <h1 className="mt-1 text-3xl text-foreground">{toolTitle}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{description}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {clientPreview && (
            <Button
              onClick={() => setPreviewClient((v) => !v)}
              variant="outline"
              className="border-border"
              type="button"
              title="See exactly what the client will see"
            >
              {previewClient ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {previewClient ? "Exit client preview" : "Preview as client"}
            </Button>
          )}
          <Button
            onClick={() => navigate("/admin/saved-benchmarks")}
            variant="outline"
            className="border-border"
            type="button"
          >
            <History className="h-4 w-4" /> View Saved Benchmarks
          </Button>
          <Button onClick={newRun} variant="outline" className="border-border">
            <Plus className="h-4 w-4" /> New Benchmark
          </Button>
        </div>
      </div>

      {previewClient && clientPreview && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-primary">
              Client preview · admin-only notes hidden
            </div>
            <button
              type="button"
              onClick={() => setPreviewClient(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Exit preview
            </button>
          </div>
          {clientPreview}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {/* Run metadata */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Client</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
                >
                  <option value="">— Select client —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} {c.business_name ? `· ${c.business_name}` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {activeRunId
                    ? <>Editing: <span className="text-foreground">{title || "Unnamed benchmark"}</span></>
                    : <>Will be saved as: <span className="text-foreground">{generateBenchmarkName(customerId)}</span></>}
                </p>
              </div>
              <Button onClick={save} disabled={saving} className="bg-primary hover:bg-secondary h-10">
                <Save className="h-4 w-4" /> {activeRunId ? "Save changes" : "Save Benchmark"}
              </Button>
            </div>

            {onRecommendedNextStepChange && (
              <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-border/60">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Compass className="h-3.5 w-3.5 text-primary" /> Recommended next RGS step
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {nextStepOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onRecommendedNextStepChange(opt)}
                      className={`px-2.5 h-7 rounded-md border text-xs transition ${
                        recommendedNextStep === opt
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {children}
        </div>

        <aside className="space-y-6">
          {rightPanel}

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
              <FolderOpen className="h-3.5 w-3.5" /> Benchmark History
            </div>
            {runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No benchmarks saved yet. Each benchmark is captured per client and named automatically by date and time.
              </p>
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