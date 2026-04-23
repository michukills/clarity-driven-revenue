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
import { DomainShell, DomainSection, LinkRow } from "@/components/domains/DomainShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvImportWizard } from "@/components/imports/CsvImportWizard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Database,
  Upload as UploadIcon,
  Plug,
  FileText,
  CheckCircle2,
  Circle,
  ShieldCheck,
} from "lucide-react";

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
          .eq("status", "active"),
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
      setLoading(false);
    })();
  }, [user]);

  const integrationsStatus: Status = counts.integrations > 0 ? "ready" : "missing";
  const importsStatus: Status = counts.imports > 0 ? "ready" : "missing";
  const uploadsStatus: Status = counts.uploads > 0 ? "ready" : "missing";
  const anyData =
    counts.integrations + counts.imports + counts.uploads > 0;

  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="Diagnostic Input"
        title="Provide Your Business Data"
        description="Three ways to get your numbers into RGS — connect a live source, import a spreadsheet, or share files directly. They all feed the same diagnostic truth model your RGS team uses."
      >
        <DomainSection
          title="What you've shared so far"
          subtitle="A quick view of what RGS has received from you. Your diagnostic only uses what's here."
        >
          {loading ? (
            <div className="text-xs text-muted-foreground">Loading…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-md bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Connected sources
                  </div>
                  <StatusPill
                    status={integrationsStatus}
                    label={integrationsStatus === "ready" ? "Connected" : "None"}
                  />
                </div>
                <div className="mt-2 text-2xl font-light text-foreground">
                  {counts.integrations}
                </div>
              </div>
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
          title="1 · Connect a live data source"
          subtitle="The cleanest path. Your RGS team handles the connection and verification."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-md bg-muted/30 border border-border">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Plug className="h-4 w-4 text-primary" /> Accounting / sales / ops systems
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                QuickBooks, Stripe, your CRM, etc. We connect, verify, and only
                pull what the diagnostic needs.
              </p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Ask your RGS contact to start a connection — they'll guide you
                through it on a working call.
              </p>
            </div>
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
          title="2 · Import a spreadsheet"
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
          title="3 · Share files or notes directly"
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
