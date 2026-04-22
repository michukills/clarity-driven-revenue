import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingDown, Info } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeLeaks, defaultLeakData, type LeakData } from "@/lib/revenueLeak";
import { RevenueLeakClientView } from "@/components/tools/RevenueLeakClientView";

export default function RevenueLeakEngineClient() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<{ title: string; data: LeakData; updated_at: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from("customers").select("id").eq("user_id", user.id).maybeSingle();
      if (!c) { setLoading(false); return; }

      const { data: r } = await supabase
        .from("tool_runs")
        .select("title, data, updated_at")
        .eq("tool_key", "revenue_leak_finder")
        .eq("customer_id", c.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (r) {
        // Strip internal notes defensively even though RLS allows reading.
        const safeData: LeakData = { ...defaultLeakData, ...(r.data as any), notes: "" };
        setRun({ title: r.title, data: safeData, updated_at: r.updated_at });
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <PortalShell variant="customer">
      <div className="mb-6">
        <button
          onClick={() => navigate("/portal/tools")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-3 w-3" /> Back to My Tools
        </button>
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Client View</div>
        <h1 className="mt-1 text-3xl text-foreground flex items-center gap-3">
          <TrendingDown className="h-7 w-7 text-destructive" /> Revenue Leak Detection
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          A simple, direct read on how much revenue is being lost — and what to fix first.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !run ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Info className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground">No revenue benchmark yet.</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
            Your RGS team will run Revenue Leak Detection for your business and share the results here.
          </p>
        </div>
      ) : (
        <RevenueLeakClientView
          data={run.data}
          computed={computeLeaks(run.data)}
          benchmarkLabel={`${run.title} · updated ${new Date(run.updated_at).toLocaleDateString()}`}
        />
      )}
    </PortalShell>
  );
}
