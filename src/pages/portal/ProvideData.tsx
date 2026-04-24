/**
 * P12.4 — Client "Provide Your Data" workspace.
 *
 * One coherent home where a client supplies the truth their diagnostic
 * needs. Three paths into the same diagnostic truth model:
 *
 *   1. Connect a source  — live sync (handled by RGS during onboarding)
 *   2. Import a file     — CSV / XLSX upload via the hardened wizard
 *   3. Manual / uploads  — raw documents and short notes
 *
 * The client is supplying truth, not performing the diagnostic. Deep
 * analysis lives in the admin Diagnostic Workspace.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  DomainShell,
  DomainSection,
  LinkRow,
  DomainBoundary,
} from "@/components/domains/DomainShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvImportWizard } from "@/components/imports/CsvImportWizard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plug,
  FileText,
  CheckCircle2,
  Circle,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import {
  listConnectedSourceRows,
  summarizeRows,
  type ConnectedSourceTotals,
} from "@/lib/integrations/connectedSources";

type Status = "ready" | "partial" | "missing";

function StatusPill({ status, label }: { status: Status; label: string }) {
  const cls =
    status === "ready"
      ? "bg-secondary/15 text-secondary border-secondary/40"
      : status === "partial"
        ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
        : "bg-muted/40 text-muted-foreground border-border";
  const Icon = status === "ready" ? CheckCircle2 : Circle;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider ${cls}`}
    >
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

export default function ProvideData() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    integrations: 0,
    imports: 0,
    uploads: 0,
  });
  const [sourceTotals, setSourceTotals] = useState<ConnectedSourceTotals>({
    connected: 0,
    requested: 0,
    setupInProgress: 0,
    needsReview: 0,
    total: 0,
  });

  useEffect(() => {
    void (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) {
        setLoading(false);
        return;
      }
      setCustomer({ id: data.id });

      const [{ count: ic }, { count: im }, { count: up }] = await Promise.all([
        supabase
          .from("customer_integrations")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", data.id)
          .in("status", ["connected", "active"]),
        supabase
          .from("financial_imports")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", data.id),
        supabase
          .from("customer_uploads")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", data.id),
      ]);
      setCounts({
        integrations: ic ?? 0,
        imports: im ?? 0,
        uploads: up ?? 0,
      });
      try {
        const rows = await listConnectedSourceRows(data.id);
        setSourceTotals(summarizeRows(rows));
      } catch {
        // Non-fatal — counts already shown for connected.
      }
      setLoading(false);
    })();
  }, [user]);

  const totalSourceActivity =
    sourceTotals.connected +
    sourceTotals.requested +
    sourceTotals.setupInProgress +
    sourceTotals.needsReview;
  const integrationsStatus: Status =
    sourceTotals.connected > 0
      ? "ready"
      : totalSourceActivity > 0
        ? "partial"
        : "missing";
  const importsStatus: Status = counts.imports > 0 ? "ready" : "missing";
  const uploadsStatus: Status = counts.uploads > 0 ? "ready" : "missing";
  const anyData =
    counts.integrations + counts.imports + counts.uploads > 0;

  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="Client Workspace · Diagnostic Input"
        title="Provide Your Business Data"
        description="One place to share the numbers your RGS team needs. Pick whichever path is easiest — they all feed the same diagnostic truth model."
      >
        <DomainBoundary
          scope="Sharing your data with RGS — connect a source, import a spreadsheet, or upload files & notes."
          outOfScope="You don't need to interpret your own numbers. Analysis happens on the RGS side and comes back to you as findings & reports."
        />

        <DomainSection
          title="What you've shared so far"
          subtitle="Your diagnostic only uses what's confirmed received here."
        >
          {loading ? (
            <div className="text-xs text-muted-foreground">Loading…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link
                to="/portal/connected-sources"
                className="p-4 rounded-md bg-muted/30 border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Connected sources
                  </div>
                  <StatusPill
                    status={integrationsStatus}
                    label={
                      sourceTotals.connected > 0
                        ? "Connected"
                        : totalSourceActivity > 0
                          ? "In progress"
                          : "None"
                    }
                  />
                </div>
                <div className="mt-2 text-2xl font-light text-foreground">
                  {sourceTotals.connected}
                  {totalSourceActivity > sourceTotals.connected && (
                    <span className="text-xs text-muted-foreground ml-2 font-normal">
                      +{totalSourceActivity - sourceTotals.connected} in progress
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[10px] text-primary inline-flex items-center gap-1 group-hover:underline">
                  Open Connected Sources <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
              <div className="p-4 rounded-md bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Spreadsheet imports
                  </div>
                  <StatusPill
                    status={importsStatus}
                    label={importsStatus === "ready" ? "On file" : "None"}
                  />
                </div>
                <div className="mt-2 text-2xl font-light text-foreground">
                  {counts.imports}
                </div>
              </div>
              <div className="p-4 rounded-md bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Files shared
                  </div>
                  <StatusPill
                    status={uploadsStatus}
                    label={uploadsStatus === "ready" ? "On file" : "None"}
                  />
                </div>
                <div className="mt-2 text-2xl font-light text-foreground">
                  {counts.uploads}
                </div>
              </div>
            </div>
          )}

          {!loading && !anyData && (
            <div className="mt-4 p-3 rounded-md border border-dashed border-border text-xs text-muted-foreground">
              Nothing received yet. Use any of the paths below — pick whichever
              is easiest for you.
            </div>
          )}
        </DomainSection>

        <DomainSection
          title="Path 1 · Connect a live data source"
          subtitle="The cleanest option. Your RGS team handles the connection and verification."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              to="/portal/connected-sources"
              className="p-4 rounded-md bg-muted/30 border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Plug className="h-4 w-4 text-primary" /> Choose your systems
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Pick from 18 supported systems across the categories below — we
                connect what we can directly and book a setup call for the rest.
              </p>
              <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground/90">
                <li><span className="text-foreground">Accounting</span> — QuickBooks, Xero, FreshBooks</li>
                <li><span className="text-foreground">Payments</span> — Stripe, Square, PayPal</li>
                <li><span className="text-foreground">CRM / Pipeline</span> — HubSpot, Salesforce, Pipedrive</li>
                <li><span className="text-foreground">Analytics</span> — GA4, Search Console, Meta Ads</li>
                <li><span className="text-foreground">Payroll / Labor</span> — Paycom, ADP, Gusto</li>
                <li><span className="text-foreground">Field Ops</span> — Jobber, Housecall Pro, ServiceTitan</li>
              </ul>
              <p className="text-[10px] text-muted-foreground/70 mt-2 italic">
                Only QuickBooks currently has live-sync. The rest use a guided request / setup flow.
              </p>
              <p className="text-[11px] text-primary inline-flex items-center gap-1 mt-3 group-hover:underline">
                Open Connected Sources <ArrowRight className="h-3 w-3" />
              </p>
            </Link>
            <div className="p-4 rounded-md bg-muted/30 border border-border">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" /> What we do with it
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Synced data is staged for review before it becomes part of your
                diagnostic truth. You're never surprised by what's used.
              </p>
            </div>
          </div>
        </DomainSection>

        <DomainSection
          title="Path 2 · Import a spreadsheet"
          subtitle="If your numbers already live in Excel or Google Sheets, bring the file in directly. CSV and XLSX are both supported."
        >
          {loading ? (
            <div className="text-xs text-muted-foreground">Loading…</div>
          ) : !customer ? (
            <div className="text-xs text-muted-foreground">
              Your account isn't set up for imports yet. Contact your RGS contact.
            </div>
          ) : (
            <CsvImportWizard customerId={customer.id} audience="client" />
          )}
        </DomainSection>

        <DomainSection
          title="Path 3 · Share files or notes directly"
          subtitle="PDFs, statements, screenshots, or short context notes. Anything that helps the diagnostic see the real picture."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LinkRow
              to="/portal/uploads"
              label="Open My Files"
              hint="Send documents to your RGS team"
            />
            <LinkRow
              to="/portal/diagnostics"
              label="Diagnostic Intake Questions"
              hint="Short context questions that shape the diagnostic"
            />
          </div>
        </DomainSection>

        <Card className="mt-6 bg-muted/20 border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> What happens next
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>
              Whatever you provide here flows into your RGS team's Diagnostic
              Workspace. They handle the analysis and bring findings back to
              you.
            </p>
            <p>
              You don't need to interpret your own data — that's our job.
            </p>
          </CardContent>
        </Card>
      </DomainShell>
    </PortalShell>
  );
}
