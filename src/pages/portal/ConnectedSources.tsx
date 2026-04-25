/**
 * P12.4.C / P12.4.C.2 / P12.4.C.H — Client Connected Source workspace.
 *
 * Lets a client browse the 18 systems in the catalog (Accounting,
 * Payments, CRM / Pipeline, Analytics, Payroll / Labor, Field Ops),
 * grouped by the categories they recognize, and start a request/setup
 * workflow per source. Honest about what is truly live (admin-driven
 * QuickBooks sync today) vs. requested / setup-in-progress.
 *
 * Every action records a row in `customer_integrations` so the admin
 * Diagnostic Workspace can see and act on the request.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { PortalShell } from "@/components/portal/PortalShell";
import { BRANDS } from "@/config/brands";
import {
  DomainShell,
  DomainSection,
  DomainBoundary,
} from "@/components/domains/DomainShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import {
  ArrowLeft,
  Plug,
  CheckCircle2,
  Send,
  Wrench,
  AlertTriangle,
  Sparkles,
  Search,
  ExternalLink,
  RefreshCw,
  Settings,
} from "lucide-react";
import {
  SOURCE_CATEGORIES,
  buildConnectorCards,
  listConnectedSourceRows,
  requestSourceConnection,
  requestCustomSourceConnection,
  statusUi,
  summarizeRows,
  isDirectOAuthConnector,
  getCapabilityEntry,
  isDirectSyncFuture,
  type CustomSourceAccessMethod,
  type CustomSourceCategory,
  type CustomSourceDataType,
  type ConnectedSourceRow,
  type ConnectorCardModel,
} from "@/lib/integrations/connectedSources";
import type { ConnectorId } from "@/lib/integrations/planning";
import {
  fetchQbStatus,
  startQbOAuth,
  triggerQbSync,
  type QbStatus,
} from "@/lib/integrations/quickbooks";

const customSourceSchema = z.object({
  sourceName: z.string().trim().min(1, "Enter the source or tool name.").max(120),
  websiteUrl: z
    .string()
    .trim()
    .max(255)
    .optional()
    .refine((value) => !value || /^https?:\/\//i.test(value), "Use a full URL starting with http:// or https://."),
  category: z.enum([
    "Accounting",
    "Payments",
    "CRM / Pipeline",
    "Analytics",
    "Payroll / Labor",
    "Field Ops",
    "Bank / Financial Report",
    "Spreadsheet / CSV",
    "Other",
  ]),
  dataTypes: z.array(z.string()).min(1, "Choose at least one data type."),
  accessMethods: z.array(z.string()).min(1, "Choose at least one access method."),
  notes: z.string().trim().max(1000).optional(),
  ownerOrAccessContact: z.string().trim().max(160).optional(),
});

const CUSTOM_SOURCE_CATEGORIES: CustomSourceCategory[] = [
  "Accounting",
  "Payments",
  "CRM / Pipeline",
  "Analytics",
  "Payroll / Labor",
  "Field Ops",
  "Bank / Financial Report",
  "Spreadsheet / CSV",
  "Other",
];

const CUSTOM_SOURCE_DATA_TYPES: { value: CustomSourceDataType; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "expenses", label: "Expenses" },
  { value: "invoices", label: "Invoices" },
  { value: "ar_ap", label: "AR/AP" },
  { value: "payroll_labor", label: "Payroll / labor" },
  { value: "pipeline", label: "Pipeline" },
  { value: "marketing", label: "Marketing" },
  { value: "job_project_data", label: "Job / project data" },
  { value: "cash_bank_reports", label: "Cash / bank reports" },
  { value: "other", label: "Other" },
];

const CUSTOM_SOURCE_ACCESS_METHODS: { value: CustomSourceAccessMethod; label: string }[] = [
  { value: "external_login_available", label: "External login available" },
  { value: "export_csv_xlsx", label: "Export CSV/XLSX" },
  { value: "upload_reports_pdfs", label: "Upload reports/PDFs" },
  { value: "rgs_should_review", label: "RGS should review" },
  { value: "manual_entry_only", label: "Manual entry only" },
];

const EMPTY_CUSTOM_SOURCE_FORM = {
  sourceName: "",
  websiteUrl: "",
  category: "Other" as CustomSourceCategory,
  dataTypes: [] as CustomSourceDataType[],
  accessMethods: [] as CustomSourceAccessMethod[],
  notes: "",
  ownerOrAccessContact: "",
};

export default function ConnectedSources() {
  const { user } = useAuth();
  const { customerId } = usePortalCustomerId();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customer, setCustomer] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConnectedSourceRow[]>([]);
  const [active, setActive] = useState<ConnectorCardModel | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [qbStatus, setQbStatus] = useState<QbStatus | null>(null);
  const [qbBusy, setQbBusy] = useState<"connect" | "sync" | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customSubmitting, setCustomSubmitting] = useState(false);
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
  const [customForm, setCustomForm] = useState(EMPTY_CUSTOM_SOURCE_FORM);

  useEffect(() => {
    void (async () => {
      if (!customerId) {
        setLoading(false);
        return;
      }
      setCustomer({ id: customerId });
      try {
        const r = await listConnectedSourceRows(customerId);
        setRows(r);
      } catch {
        // Surface as an empty state — the page is still usable.
      }
      try {
        const s = await fetchQbStatus(customerId);
        setQbStatus(s);
      } catch {
        setQbStatus({ state: "not_configured", realmId: null, companyName: null, lastSyncAt: null, lastError: null, isDemo: false });
      }
      setLoading(false);
    })();
  }, [user]);

  const cards = useMemo(() => buildConnectorCards(rows), [rows]);
  const totals = useMemo(
    () => summarizeRows(rows, { quickbooksState: qbStatus?.state ?? null }),
    [rows, qbStatus],
  );

  const refresh = async () => {
    if (!customer) return;
    const r = await listConnectedSourceRows(customer.id);
    setRows(r);
    try {
      const s = await fetchQbStatus(customer.id);
      setQbStatus(s);
    } catch { /* ignore */ }
  };

  // Handle returning from the Intuit OAuth redirect (qb=ok|error).
  useEffect(() => {
    const qb = searchParams.get("qb");
    if (!qb) return;
    if (qb === "ok") {
      toast({ title: `${BRANDS.quickbooks} connected`, description: "Active sync established." });
    } else {
      const msg = searchParams.get("msg") ?? `Could not finish ${BRANDS.quickbooks} setup.`;
      toast({ title: `${BRANDS.quickbooks} setup failed`, description: msg, variant: "destructive" });
    }
    searchParams.delete("qb");
    searchParams.delete("msg");
    setSearchParams(searchParams, { replace: true });
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("custom") === "1") {
      setCustomOpen(true);
    }
  }, [searchParams]);

  const handleQbConnect = async () => {
    if (!customer) return;
    setQbBusy("connect");
    try {
      const res = await startQbOAuth(customer.id);
      if (!res.configured || !res.authorize_url) {
        toast({
          title: `${BRANDS.quickbooks} not configured`,
          description: res.message ?? `${BRANDS.quickbooks} connection is not configured yet.`,
          variant: "destructive",
        });
        return;
      }
      window.location.href = res.authorize_url;
    } finally {
      setQbBusy(null);
    }
  };

  const handleQbSyncNow = async () => {
    if (!customer) return;
    setQbBusy("sync");
    try {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const res = await triggerQbSync({
        customerId: customer.id,
        periodStart: fmt(start),
        periodEnd: fmt(today),
      });
      if (res.ok) {
        toast({ title: "Synced", description: res.message ?? `${BRANDS.quickbooks} data refreshed.` });
        await refresh();
      } else {
        toast({ title: "Sync failed", description: res.message ?? `Could not sync ${BRANDS.quickbooks}.`, variant: "destructive" });
      }
    } finally {
      setQbBusy(null);
    }
  };

  const openRequest = (card: ConnectorCardModel) => {
    // Live-now direct-OAuth connectors must never use the request modal.
    // Future-planned direct-sync connectors may use it (RGS configures manually).
    if (
      isDirectOAuthConnector(card.connectorId) &&
      !isDirectSyncFuture(card.connectorId)
    ) {
      return;
    }
    setActive(card);
    setNote(card.note ?? "");
  };

  const submitRequest = async () => {
    if (!customer || !active) return;
    setSubmitting(true);
    try {
      await requestSourceConnection({
        customerId: customer.id,
        connectorId: active.connectorId,
        note: note.trim() || undefined,
      });
      await refresh();
      toast({
        title: "Request sent",
        description: `Your RGS team will reach out about ${active.label}.`,
      });
      setActive(null);
      setNote("");
    } catch (e) {
      toast({
        title: "Couldn't send request",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const setCustomRequestOpen = (open: boolean) => {
    setCustomOpen(open);
    const next = new URLSearchParams(searchParams);
    if (open) next.set("custom", "1");
    else next.delete("custom");
    setSearchParams(next, { replace: true });
    if (!open) {
      setCustomErrors({});
      setCustomForm(EMPTY_CUSTOM_SOURCE_FORM);
    }
  };

  const toggleMultiValue = <T extends string,>(key: "dataTypes" | "accessMethods", value: T, checked: boolean) => {
    setCustomForm((prev) => ({
      ...prev,
      [key]: checked
        ? [...prev[key], value]
        : prev[key].filter((item) => item !== value),
    }));
  };

  const submitCustomRequest = async () => {
    if (!customer) return;
    const parsed = customSourceSchema.safeParse(customForm);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setCustomErrors({
        sourceName: fieldErrors.sourceName?.[0] ?? "",
        websiteUrl: fieldErrors.websiteUrl?.[0] ?? "",
        category: fieldErrors.category?.[0] ?? "",
        dataTypes: fieldErrors.dataTypes?.[0] ?? "",
        accessMethods: fieldErrors.accessMethods?.[0] ?? "",
        notes: fieldErrors.notes?.[0] ?? "",
        ownerOrAccessContact: fieldErrors.ownerOrAccessContact?.[0] ?? "",
      });
      return;
    }

    setCustomSubmitting(true);
    setCustomErrors({});
    try {
      await requestCustomSourceConnection({
        customerId: customer.id,
        request: {
          sourceName: parsed.data.sourceName,
          websiteUrl: parsed.data.websiteUrl,
          category: parsed.data.category,
          dataTypes: parsed.data.dataTypes as CustomSourceDataType[],
          accessMethods: parsed.data.accessMethods as CustomSourceAccessMethod[],
          notes: parsed.data.notes,
          ownerOrAccessContact: parsed.data.ownerOrAccessContact,
        },
      });
      await refresh();
      toast({
        title: "Custom source request submitted",
        description: "RGS will review how this source should be handled.",
      });
      setCustomRequestOpen(false);
    } catch (e) {
      toast({
        title: "Couldn't submit request",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setCustomSubmitting(false);
    }
  };

  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="Client Workspace · Diagnostic Input"
        title="Connected Sources"
        description="Pick the systems you already use. We connect the ones that have a real sync; for everything else, sending a request brings your RGS team in to set it up with you."
        crumbs={[
          { label: "Provide Data", to: "/portal/provide-data" },
          { label: "Connected Sources" },
        ]}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/portal/provide-data">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Provide Data
            </Link>
          </Button>
        }
      >
        <DomainBoundary
          scope="Telling RGS which business systems you use, and starting the connection or setup conversation."
          outOfScope="You don't need to set up integrations yourself. Where a real connection isn't ready yet, sending a request brings your RGS team in."
        />

        <DomainSection
          title="Your sources at a glance"
          subtitle="Connections show what is live, what can sync directly, what needs attention, and what still requires setup or import."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <SummaryTile
              label="Active Connections"
              value={totals.activeConnections}
              tone="ready"
              detail="Real working connections or active syncs."
            />
            <SummaryTile
              label="Available Direct Syncs"
              value={totals.availableDirectSyncs}
              tone="info"
              detail={
                totals.notConfigured > 0 || totals.directSyncPlanned > 0
                  ? [
                      totals.notConfigured > 0 ? `${totals.notConfigured} not configured` : null,
                      totals.directSyncPlanned > 0 ? `${totals.directSyncPlanned} planned` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "Ready to connect directly."
              }
            />
            <SummaryTile
              label="Needs Attention"
              value={totals.needsAttention}
              tone="warn"
              detail="Reconnects, sync errors, or expired access."
            />
            <SummaryTile
              label="Setup / Custom Requests"
              value={totals.setupRequests + totals.customSourceRequests}
              tone="info"
              detail={`${totals.setupRequests} setup · ${totals.customSourceRequests} custom`}
            />
            <SummaryTile
              label="Import / Upload Paths"
              value={totals.importsUploads}
              tone="neutral"
              detail="Import-led sources and upload-based options."
            />
          </div>
        </DomainSection>

        {loading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : !customer ? (
          <div className="text-xs text-muted-foreground">
            Your account isn't set up for source connections yet. Contact your
            RGS contact.
          </div>
        ) : (
          <>
            <div className="relative max-w-md">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search sources (e.g. ${BRANDS.xero}, ${BRANDS.square}, ${BRANDS.gusto})…`}
                className="pl-8 h-9 text-sm"
              />
            </div>
            {(() => {
              const q = query.trim().toLowerCase();
              const sections = SOURCE_CATEGORIES.map((cat) => {
                const inCat = cards
                  .filter((c) => cat.connectorIds.includes(c.connectorId))
                  .filter(
                    (c) =>
                      !q ||
                      c.label.toLowerCase().includes(q) ||
                      c.ownedTruthSummary.toLowerCase().includes(q),
                  );
                if (inCat.length === 0) return null;
                return (
                  <DomainSection
                    key={cat.id}
                    title={cat.label}
                    subtitle={cat.description}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {inCat.map((c) => (
                        <SourceCard
                          key={c.connectorId}
                          card={c}
                          qbStatus={c.connectorId === "quickbooks" ? qbStatus : null}
                          qbBusy={c.connectorId === "quickbooks" ? qbBusy : null}
                          onQbConnect={c.connectorId === "quickbooks" ? handleQbConnect : undefined}
                          onQbSync={c.connectorId === "quickbooks" ? handleQbSyncNow : undefined}
                          onRequest={() => openRequest(c)}
                        />
                      ))}
                    </div>
                  </DomainSection>
                );
              }).filter(Boolean);
              const customTile = !q || "custom source".includes(q) || "request a custom connection".includes(q)
                ? (
                    <DomainSection
                      title="Other source"
                      subtitle="Structured intake for platforms that are not in the catalog yet."
                    >
                      <CustomSourceTile onRequest={() => setCustomRequestOpen(true)} />
                    </DomainSection>
                  )
                : null;
              if (sections.length === 0 && !customTile) {
                return (
                  <div className="p-6 rounded-md border border-dashed border-border text-center">
                    <p className="text-sm text-foreground">
                      No sources match "{query.trim()}".
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Don't see your system? Use the custom source request so RGS can review the best path.
                    </p>
                  </div>
                );
              }
              return customTile ? [...sections, customTile] : sections;
            })()}
          </>
        )}
      </DomainShell>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          {(() => {
            const activeEntry = active ? getCapabilityEntry(active.connectorId) : null;
            const isConnectorRequest =
              activeEntry?.capability === "direct_oauth_sync_future";
            const title = isConnectorRequest
              ? `Request connector support`
              : `Request ${active?.label ?? ""} setup`;
            const description = isConnectorRequest
              ? `Tell RGS that ${active?.label ?? "this source"} matters to you. We'll review demand, confirm the best interim data path, and prioritize connector development.`
              : "We'll record this for your RGS team. Add anything they should know — the account holder, whether you have admin access, or what data matters most.";
            const placeholder = isConnectorRequest
              ? `What this source is used for, what data matters most, and any priority context for the ${active?.label ?? "connector"} integration.`
              : "e.g. Account is in Mary's name, ask her for access. We mostly care about invoices.";
            const submitLabel = isConnectorRequest
              ? submitting
                ? "Submitting…"
                : "Submit Connector Request"
              : submitting
                ? "Sending…"
                : "Send request";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Send className="h-4 w-4" /> {title}
                  </DialogTitle>
                  <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={placeholder}
                  rows={4}
                />
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setActive(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button onClick={submitRequest} disabled={submitting}>
                    {submitLabel}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={customOpen} onOpenChange={setCustomRequestOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request a custom source</DialogTitle>
            <DialogDescription>
              Tell us which platform you use. RGS will review whether it should be added as a direct sync, setup-assisted source, or import option.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="custom-source-name">Source / tool name</Label>
                <Input
                  id="custom-source-name"
                  value={customForm.sourceName}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, sourceName: e.target.value }))}
                  placeholder="e.g. Zoho Books"
                />
                {customErrors.sourceName && <p className="text-xs text-destructive">{customErrors.sourceName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-source-url">Website / login URL</Label>
                <Input
                  id="custom-source-url"
                  value={customForm.websiteUrl}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                  placeholder="https://"
                />
                {customErrors.websiteUrl && <p className="text-xs text-destructive">{customErrors.websiteUrl}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={customForm.category}
                onValueChange={(value) => setCustomForm((prev) => ({ ...prev, category: value as CustomSourceCategory }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_SOURCE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>What data it contains</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {CUSTOM_SOURCE_DATA_TYPES.map((option) => (
                  <label key={option.value} className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <Checkbox
                      checked={customForm.dataTypes.includes(option.value)}
                      onCheckedChange={(checked) => toggleMultiValue("dataTypes", option.value, checked === true)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              {customErrors.dataTypes && <p className="text-xs text-destructive">{customErrors.dataTypes}</p>}
            </div>

            <div className="space-y-2">
              <Label>How you can provide access</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {CUSTOM_SOURCE_ACCESS_METHODS.map((option) => (
                  <label key={option.value} className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <Checkbox
                      checked={customForm.accessMethods.includes(option.value)}
                      onCheckedChange={(checked) => toggleMultiValue("accessMethods", option.value, checked === true)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              {customErrors.accessMethods && <p className="text-xs text-destructive">{customErrors.accessMethods}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="custom-source-owner">Notes / who owns access</Label>
                <Input
                  id="custom-source-owner"
                  value={customForm.ownerOrAccessContact}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, ownerOrAccessContact: e.target.value }))}
                  placeholder="e.g. Finance manager has admin access"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-source-notes">Notes</Label>
                <Textarea
                  id="custom-source-notes"
                  value={customForm.notes}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Anything else RGS should know"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomRequestOpen(false)} disabled={customSubmitting}>
              Cancel
            </Button>
            <Button onClick={submitCustomRequest} disabled={customSubmitting}>
              {customSubmitting ? "Submitting…" : "Request Custom Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}

function CustomSourceTile({ onRequest }: { onRequest: () => void }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-card p-4 flex flex-col gap-3 min-h-[180px]">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">Don’t see your source? Request a custom connection.</div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Tell us which platform you use. RGS will review whether it should be added as a direct sync, setup-assisted source, or import option.
        </p>
      </div>
      <div className="mt-auto">
        <Button onClick={onRequest} className="w-full" size="sm">
          <Send className="h-3.5 w-3.5 mr-1" /> Request Custom Source
        </Button>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: number;
  tone: "ready" | "info" | "warn" | "neutral";
  detail?: string;
}) {
  const cls =
    tone === "ready"
      ? "border-secondary/40 bg-secondary/5"
      : tone === "info"
        ? "border-primary/30 bg-primary/5"
        : tone === "warn"
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border bg-muted/20";
  return (
    <div className={`p-4 rounded-md border ${cls} min-h-[132px] flex flex-col`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-light text-foreground">{value}</div>
      {detail ? (
        <div className="mt-auto pt-3 text-xs leading-relaxed text-muted-foreground">
          {detail}
        </div>
      ) : null}
    </div>
  );
}

function SourceCard({
  card,
  qbStatus,
  qbBusy,
  onQbConnect,
  onQbSync,
  onRequest,
}: {
  card: ConnectorCardModel;
  qbStatus?: QbStatus | null;
  qbBusy?: "connect" | "sync" | null;
  onQbConnect?: () => void;
  onQbSync?: () => void;
  onRequest: () => void;
}) {
  // Build a capability-driven view. QuickBooks gets the live OAuth
  // status from qb-status; everything else uses customer_integrations.
  const view = buildCardView(card, qbStatus ?? null);
  const busy = qbBusy != null && card.connectorId === "quickbooks";

  const handlePrimary = () => {
    if (view.primaryAction === "qb_connect" && onQbConnect) onQbConnect();
    else if (view.primaryAction === "qb_sync" && onQbSync) onQbSync();
    else if (view.primaryAction === "request_setup") onRequest();
  };

  return (
    <div
      className={`p-4 rounded-md border bg-card flex flex-col gap-3 min-h-[180px] ${
        view.tone === "active"
          ? "border-secondary/40"
          : view.tone === "primary"
            ? "border-primary/30"
            : view.tone === "warn"
              ? "border-amber-500/40"
              : "border-border"
      }`}
    >
      {/* Header */}
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">{card.label}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
          {card.ownedTruthSummary}
        </p>
      </div>

      {/* Status pill */}
      <div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${view.pillTone}`}
        >
          {view.statusLabel}
        </span>
      </div>

      {/* Helper text */}
      <p className="text-[11px] text-muted-foreground leading-relaxed min-h-[2.5em]">
        {view.helper}
      </p>

      {/* Primary action — full-width, bottom-aligned */}
      <div className="mt-auto flex flex-col gap-1.5">
        {view.primaryAction === "none" ? (
          <Button size="sm" variant="secondary" disabled className="w-full">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            {view.primaryLabel}
          </Button>
        ) : view.primaryAction === "manage_link" ? (
          <Button size="sm" variant="outline" asChild className="w-full">
            <Link to="/portal/connected-sources">
              <Settings className="h-3.5 w-3.5 mr-1" /> {view.primaryLabel}
            </Link>
          </Button>
        ) : view.primaryAction === "disabled" ? (
          <Button size="sm" variant="outline" disabled className="w-full">
            {view.primaryLabel}
          </Button>
        ) : (
          <Button
            size="sm"
            variant={view.primaryAction === "qb_sync" ? "outline" : "default"}
            onClick={handlePrimary}
            disabled={busy}
            className="w-full"
          >
            {busy && qbBusy === "connect" ? (
              <>Opening {BRANDS.quickbooks}…</>
            ) : busy && qbBusy === "sync" ? (
              <><RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" /> Syncing…</>
            ) : (
              <>
                <view.primaryIcon className="h-3.5 w-3.5 mr-1" />
                {view.primaryLabel}
              </>
            )}
          </Button>
        )}
        {view.secondaryLabel && view.secondaryHref && (
          <Button size="sm" variant="ghost" asChild className="w-full text-[11px] h-7">
            <Link to={view.secondaryHref}>
              {view.secondaryLabel} <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Capability-driven card view model. QuickBooks gets the live OAuth
 * state from qb-status. Other connectors fall back to the user-facing
 * `customer_integrations` row status. Importantly: any "active"
 * connector (any provider) shows an active state and never offers
 * "Request setup".
 */
type PrimaryAction =
  | "qb_connect"
  | "qb_sync"
  | "request_setup"
  | "manage_link"
  | "disabled"
  | "none";

interface CardView {
  statusLabel: string;
  pillTone: string;
  helper: string;
  tone: "active" | "primary" | "warn" | "neutral";
  primaryAction: PrimaryAction;
  primaryLabel: string;
  primaryIcon: typeof Plug;
  secondaryLabel?: string;
  secondaryHref?: string;
}

function buildCardView(card: ConnectorCardModel, qb: QbStatus | null): CardView {
  const isQuickBooks = card.connectorId === "quickbooks";
  const isDirect = isDirectOAuthConnector(card.connectorId);

  // QuickBooks: live state from qb-status drives everything.
  if (isQuickBooks && qb) {
    if (qb.state === "not_configured") {
      return {
        statusLabel: "Not configured yet",
        pillTone: "bg-muted/40 text-muted-foreground border-border",
        helper: `${BRANDS.quickbooks} connection is not configured yet. RGS will enable it for your account.`,
        tone: "neutral",
        primaryAction: "disabled",
        primaryLabel: "Connection not available",
        primaryIcon: Plug,
      };
    }
    if (qb.state === "connected") {
      const last = qb.lastSyncAt ? new Date(qb.lastSyncAt).toLocaleString() : null;
      if (qb.isDemo) {
        return {
          statusLabel: "Demo connection active",
          pillTone: "bg-secondary/15 text-secondary border-secondary/40",
          helper: qb.companyName
            ? `${qb.companyName} — demo data, no live Intuit sync.${last ? ` Last refresh ${last}.` : ""}`
            : `Demo connection — no live Intuit sync.${last ? ` Last refresh ${last}.` : ""}`,
          tone: "active",
          primaryAction: "qb_sync",
          primaryLabel: "Refresh demo data",
          primaryIcon: RefreshCw,
          secondaryLabel: "Manage connection",
          secondaryHref: "/portal/connected-sources",
        };
      }
      return {
        statusLabel: "Active sync established",
        pillTone: "bg-secondary/15 text-secondary border-secondary/40",
        helper: qb.companyName
          ? `Connected to ${qb.companyName}.${last ? ` Last sync ${last}.` : ""}`
          : `Connected.${last ? ` Last sync ${last}.` : ""}`,
        tone: "active",
        primaryAction: "qb_sync",
        primaryLabel: "Sync now",
        primaryIcon: RefreshCw,
        secondaryLabel: "Manage connection",
        secondaryHref: "/portal/connected-sources",
      };
    }
    if (qb.state === "syncing") {
      return {
        statusLabel: "Syncing…",
        pillTone: "bg-primary/10 text-primary border-primary/30",
        helper: `Pulling the latest ${BRANDS.quickbooks} data. This usually takes a few seconds.`,
        tone: "primary",
        primaryAction: "disabled",
        primaryLabel: "Syncing…",
        primaryIcon: RefreshCw,
      };
    }
    if (qb.state === "expired" || qb.state === "error") {
      return {
        statusLabel: qb.state === "expired" ? "Reconnect needed" : "Sync error",
        pillTone: "bg-amber-500/10 text-amber-400 border-amber-500/40",
        helper: qb.lastError
          ? `Last error: ${truncate(qb.lastError, 100)}`
          : `${BRANDS.quickbooks} needs to be reconnected to keep syncing.`,
        tone: "warn",
        primaryAction: "qb_connect",
        primaryLabel: `Reconnect ${BRANDS.quickbooks}`,
        primaryIcon: Plug,
      };
    }
    // disconnected, configured.
    return {
      statusLabel: "Live sync available",
      pillTone: "bg-primary/10 text-primary border-primary/30",
      helper: `Connect once and your monthly baseline / weekly check-ins prefill from ${BRANDS.quickbooks}.`,
      tone: "primary",
      primaryAction: "qb_connect",
      primaryLabel: `Connect ${BRANDS.quickbooks}`,
      primaryIcon: Plug,
    };
  }

  // Other connectors — capability/status based.
  const status = card.status;
  const ui = statusUi(status);
  const isActive = status === "connected" || status === "active";

  if (isActive) {
    const connectedDate = card.requestedAt
      ? new Date(card.requestedAt).toLocaleDateString()
      : null;
    const lastSync = card.lastSyncAt
      ? new Date(card.lastSyncAt).toLocaleString()
      : null;
    const detailParts = [
      card.accountLabel ? `Connected to ${card.accountLabel}.` : connectedDate ? `Connected ${connectedDate}.` : "Connection on file with RGS.",
      lastSync ? `Last updated ${lastSync}.` : null,
    ].filter(Boolean);
    return {
      statusLabel: "Active connection established",
      pillTone: "bg-secondary/15 text-secondary border-secondary/40",
      helper: detailParts.join(" "),
      tone: "active",
      primaryAction: "none",
      primaryLabel: "Connected",
      primaryIcon: CheckCircle2,
    };
  }

  if (status === "setup_in_progress") {
    return {
      statusLabel: ui.label,
      pillTone: ui.tone,
      helper: card.note ? `"${truncate(card.note, 90)}"` : "Your RGS team is setting this up.",
      tone: "warn",
      primaryAction: "manage_link",
      primaryLabel: "View status",
      primaryIcon: Wrench,
    };
  }

  if (status === "requested") {
    return {
      statusLabel: ui.label,
      pillTone: ui.tone,
      helper: card.requestedAt
        ? `Requested ${new Date(card.requestedAt).toLocaleDateString()}. RGS has this connector request on file and will review priority and interim data options.`
        : "RGS has this connector request on file and will review priority and interim data options.",
      tone: "primary",
      primaryAction: "request_setup",
      primaryLabel: "Update request",
      primaryIcon: Sparkles,
    };
  }

  if (status === "needs_review") {
    return {
      statusLabel: ui.label,
      pillTone: ui.tone,
      helper: "RGS is reviewing this connection.",
      tone: "warn",
      primaryAction: "manage_link",
      primaryLabel: "View status",
      primaryIcon: AlertTriangle,
    };
  }

  // Direct-OAuth-capable connectors whose live sync isn't shipped yet
  // (P13.RCC.H.4B: future-planned). Honest connector-request language —
  // we're not "setting up" the tool, we're prioritizing connector dev
  // and confirming the best interim data path.
  const entry = getCapabilityEntry(card.connectorId);
  if (entry?.capability === "direct_oauth_sync_future") {
    return {
      statusLabel: "Connector planned",
      pillTone: "bg-primary/10 text-primary border-primary/30",
      helper:
        "This connector is planned but not live yet. Request it so RGS can prioritize the integration and confirm the best interim data path.",
      tone: "primary",
      primaryAction: "request_setup",
      primaryLabel: "Request this connector",
      primaryIcon: Send,
    };
  }

  // Default request_setup_only path.
  return {
    statusLabel: "Setup handled with RGS",
    pillTone: "bg-muted/40 text-muted-foreground border-border",
    helper: "Send a setup request and your RGS team will handle the connection.",
    tone: "neutral",
    primaryAction: "request_setup",
    primaryLabel: "Request setup",
    primaryIcon: Send,
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}