import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Database, Loader2, Sparkles } from "lucide-react";
import { runDemoSeed, type DemoSeedResult } from "@/lib/admin/demoSeed";

export default function Settings() {
  const { user, role } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [lastResult, setLastResult] = useState<DemoSeedResult | null>(null);

  const handleSeed = async () => {
    if (!window.confirm("Seed/refresh the 3 named demo customers (Demo A/B/C)? This is idempotent and only touches *@demo.rgs.local emails.")) return;
    setSeeding(true);
    try {
      const res = await runDemoSeed();
      setLastResult(res);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    } catch (e: any) {
      toast.error(e?.message || "Demo seed failed");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <PortalShell variant="admin">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Settings</div>
        <h1 className="mt-2 text-3xl text-foreground">Workspace</h1>
      </div>
      <div className="bg-card border border-border rounded-xl p-6 max-w-xl space-y-3">
        <Row label="Email" value={user?.email} />
        <Row label="Role" value={role} />
        <Row label="User ID" value={user?.id} mono />
      </div>
      <p className="text-xs text-muted-foreground mt-6">
        To grant another user admin access, add a row to <code>user_roles</code> with their
        user_id and role = "admin" via Cloud → Database.
      </p>

      {/* P7.4 — Demo seed */}
      <div className="mt-12 bg-card border border-border rounded-xl p-6 max-w-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 text-primary p-2">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h2 className="text-base text-foreground">Demo data</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Creates or refreshes three named demo customers (<code>*@demo.rgs.local</code>) covering the
              full RGS OS story: mid-implementation, post-implementation grace with an RGS review request,
              and an active subscription with history. Idempotent — safe to re-run. Does not touch real customers.
            </p>
            <Button onClick={handleSeed} disabled={seeding} className="mt-4 bg-primary hover:bg-secondary">
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {seeding ? "Seeding…" : "Seed / refresh demo data"}
            </Button>

            {lastResult && (
              <div className="mt-5 rounded-md border border-border bg-muted/20 p-4 text-xs">
                <div className="text-foreground mb-2">{lastResult.message}</div>
                <ul className="space-y-1.5 text-muted-foreground">
                  {lastResult.customers.map((c) => (
                    <li key={c.email}>
                      <span className="text-foreground">{c.label}</span> — {c.email}
                      <span className="ml-2 inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-mono">
                        {c.reasonHint}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 text-[11px] text-muted-foreground">
                  Created/updated: {lastResult.countsCreated.checkins} weekly check-ins, {lastResult.countsCreated.reviewRequests} resolved review request(s), {lastResult.countsCreated.reports} draft report(s).
                </div>
                {lastResult.errors.length > 0 && (
                  <ul className="mt-3 text-[11px] text-destructive list-disc pl-4">
                    {lastResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

const Row = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) => (
  <div className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
    <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    <div className={`text-sm text-foreground ${mono ? "font-mono text-xs" : ""}`}>
      {value || "—"}
    </div>
  </div>
);