import { useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Database, Loader2, Sparkles, Layers, Search, AlertTriangle } from "lucide-react";
import { runDemoSeed, type DemoSeedResult } from "@/lib/admin/demoSeed";
import {
  runShowcaseSeed,
  verifyShowcaseRows,
  type ShowcaseSeedResult,
  type ShowcaseVerifyRow,
} from "@/lib/admin/showcaseSeed";

export default function Settings() {
  const { user, role } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [lastResult, setLastResult] = useState<DemoSeedResult | null>(null);
  const [showcaseSeeding, setShowcaseSeeding] = useState(false);
  const [lastShowcase, setLastShowcase] = useState<ShowcaseSeedResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    count: number;
    rows: ShowcaseVerifyRow[];
    error?: string;
  } | null>(null);

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

  const handleShowcaseSeed = async () => {
    if (!window.confirm(
      "Seed/refresh the 4 multi-stage showcase customers (Atlas, Northstar, Summit, Keystone)?\n\nThis is idempotent and only touches *@showcase.rgs.local emails. Showcase data is excluded from global learning.",
    )) return;
    setShowcaseSeeding(true);
    try {
      const res = await runShowcaseSeed();
      setLastShowcase(res);
      if (res.ok) {
        toast.success(res.message);
      } else if (res.firstError) {
        toast.error(
          `Seed failed at ${res.firstError.table}.${res.firstError.operation} (${res.firstError.account}): ${res.firstError.message}`,
          { duration: 12000 },
        );
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      toast.error(e?.message || "Showcase seed failed");
    } finally {
      setShowcaseSeeding(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await verifyShowcaseRows();
      setVerifyResult(res);
      if (res.error) toast.error(res.error);
      else toast.success(`${res.count} showcase row(s) found`);
    } finally {
      setVerifying(false);
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

      {/* P13.DemoEvidence.H.1 — Multi-stage showcase seed */}
      <div className="mt-8 bg-card border border-border rounded-xl p-6 max-w-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 text-primary p-2">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h2 className="text-base text-foreground">Multi-stage showcase</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Creates four named showcase customers (<code>*@showcase.rgs.local</code>) at different
              maturity stages — early/thin evidence, diagnostic/medium, implementation/strong, and an
              8-week RCC learning timeline. Demonstrates how RGS OS gets sharper as evidence
              accumulates. Excluded from global learning. Idempotent — safe to re-run.
            </p>
            <Button
              onClick={handleShowcaseSeed}
              disabled={showcaseSeeding}
              className="mt-4 bg-primary hover:bg-secondary"
            >
              {showcaseSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              {showcaseSeeding ? "Seeding showcase…" : "Seed / refresh showcase"}
            </Button>

            {lastShowcase && (
              <div className="mt-5 rounded-md border border-border bg-muted/20 p-4 text-xs">
                <div className="text-foreground mb-2">{lastShowcase.message}</div>
                <ul className="space-y-1.5 text-muted-foreground">
                  {lastShowcase.customers.map((c) => (
                    <li key={c.email}>
                      <span className="text-foreground">{c.label}</span> — {c.email}
                      <span className="ml-2 inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-mono">
                        {c.stage}
                      </span>
                      {c.id && (
                        <span className="ml-2 inline-flex items-center rounded bg-muted text-foreground px-1.5 py-0.5 text-[10px] font-mono">
                          {c.id.slice(0, 8)}…
                        </span>
                      )}
                      {!c.id && (
                        <span className="ml-2 inline-flex items-center rounded bg-destructive/10 text-destructive px-1.5 py-0.5 text-[10px] font-mono">
                          NOT CREATED
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 text-[11px] text-muted-foreground space-y-0.5">
                  <div>Scorecards: {lastShowcase.counts.scorecards} · Interviews: {lastShowcase.counts.interviews} · Drafts: {lastShowcase.counts.drafts}</div>
                  <div>Recommendations: {lastShowcase.counts.recommendations} · Learning events: {lastShowcase.counts.learningEvents}</div>
                  <div>Weekly check-ins: {lastShowcase.counts.weeklyCheckins} · QB summaries: {lastShowcase.counts.qbSummaries} · Invoices: {lastShowcase.counts.invoices}</div>
                  <div>Pipeline deals: {lastShowcase.counts.pipelineDeals} · Integrations: {lastShowcase.counts.integrations} · Tasks: {lastShowcase.counts.tasks} · Checklist: {lastShowcase.counts.checklist}</div>
                </div>
                {lastShowcase.errors.length > 0 && (
                  <ul className="mt-3 text-[11px] text-destructive list-disc pl-4">
                    {lastShowcase.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
                {lastShowcase.firstError && (
                  <div className="mt-4 rounded border border-destructive/40 bg-destructive/5 p-3 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 text-destructive font-medium">
                      <AlertTriangle className="h-3.5 w-3.5" /> First failing step
                    </div>
                    <div><span className="text-muted-foreground">account:</span> {lastShowcase.firstError.account} ({lastShowcase.firstError.business})</div>
                    <div><span className="text-muted-foreground">table:</span> <code>{lastShowcase.firstError.table}</code></div>
                    <div><span className="text-muted-foreground">operation:</span> {lastShowcase.firstError.operation}</div>
                    {lastShowcase.firstError.code && (
                      <div><span className="text-muted-foreground">code:</span> <code>{lastShowcase.firstError.code}</code></div>
                    )}
                    <div><span className="text-muted-foreground">message:</span> {lastShowcase.firstError.message}</div>
                    {lastShowcase.firstError.details && (
                      <div><span className="text-muted-foreground">details:</span> {lastShowcase.firstError.details}</div>
                    )}
                    {lastShowcase.firstError.hint && (
                      <div><span className="text-muted-foreground">hint:</span> {lastShowcase.firstError.hint}</div>
                    )}
                  </div>
                )}
                {lastShowcase.stepLog.length > 0 && (
                  <details className="mt-3 text-[11px]">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Last {Math.min(10, lastShowcase.stepLog.length)} step log entries
                    </summary>
                    <ul className="mt-2 space-y-0.5 font-mono">
                      {lastShowcase.stepLog.slice(-10).map((s, i) => (
                        <li key={i} className={s.ok ? "text-muted-foreground" : "text-destructive"}>
                          {s.ok ? "✓" : "✗"} [{s.account}] {s.table}.{s.operation}
                          {!s.ok && s.message ? ` — ${s.message}` : ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleVerify}
                disabled={verifying}
                className="text-xs"
              >
                {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                {verifying ? "Verifying…" : "Verify showcase rows"}
              </Button>
              {verifyResult && (
                <span className="text-[11px] text-muted-foreground">
                  {verifyResult.error
                    ? `Error: ${verifyResult.error}`
                    : `${verifyResult.count} row(s): ${verifyResult.rows.map((r) => r.business_name ?? r.email).join(", ") || "—"}`}
                </span>
              )}
            </div>
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