/**
 * P96C — Admin Scan Leads workspace.
 *
 * Read-only admin view of public Operational Friction Scan submissions
 * captured into public.scan_leads. Distinct from the Scorecard Leads
 * surface: Scan = top-of-funnel lead-gen prospects; Scorecard = the
 * first part of the structured Diagnostic engagement.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  DomainShell,
  DomainSection,
  DomainBoundary,
} from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, RefreshCcw } from "lucide-react";

type ScanLeadRow = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  business_name: string;
  phone: string | null;
  email_consent: boolean;
  source: string;
  source_page: string | null;
  lifecycle: string;
  status: string;
  linked_customer_id: string | null;
  follow_up_email_status: string;
  follow_up_email_at: string | null;
  admin_alert_email_status: string;
  manual_followup_required: boolean;
  requested_next_step: string | null;
  scan_summary: any;
};

const EMAIL_TONE: Record<string, string> = {
  sent: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  queued: "border-muted bg-muted/30 text-muted-foreground",
  pending: "border-muted bg-muted/30 text-muted-foreground",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  skipped_missing_consent: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  skipped_missing_config: "border-amber-400/30 bg-amber-400/10 text-amber-200",
};

function emailTone(s: string | null | undefined): string {
  return EMAIL_TONE[s || ""] ?? "border-border bg-muted/30 text-muted-foreground";
}

function emailLabel(s: string | null | undefined): string {
  if (!s) return "Unknown";
  return s.replace(/_/g, " ");
}

function bottleneckOf(row: ScanLeadRow): string {
  return row.scan_summary?.bottleneck?.headline ?? "—";
}

function upstreamGearOf(row: ScanLeadRow): string {
  return row.scan_summary?.bottleneck?.upstreamGear ?? "—";
}

function wornTeethCount(row: ScanLeadRow): number {
  const wt = row.scan_summary?.wornTeeth;
  return Array.isArray(wt) ? wt.length : 0;
}

export default function AdminScanLeads() {
  const [rows, setRows] = useState<ScanLeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scan_leads")
      .select(
        "id, created_at, first_name, last_name, email, business_name, phone, email_consent, source, source_page, lifecycle, status, linked_customer_id, follow_up_email_status, follow_up_email_at, admin_alert_email_status, manual_followup_required, requested_next_step, scan_summary",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error(error);
      toast.error("Couldn't load scan leads");
    }
    setRows((data as ScanLeadRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.business_name, r.email, `${r.first_name} ${r.last_name}`]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="Lead Generation"
        title="Operational Friction Scan Leads"
        description="Public prospects who completed the Operational Friction Scan on /scan. These are top-of-funnel leads — not Diagnostic clients, not portal users."
      >
        <DomainBoundary
          scope="Admin-only review of public scan submissions. Each row represents a tracked prospect who consented to follow-up, not an active Diagnostic engagement."
          outOfScope="Scan results are directional, not diagnostic. Becoming a scan lead does NOT unlock the Client Portal, Diagnostic Workspace, Implementation Workspace, or RGS Control System — those require an opened Diagnostic engagement."
        />
        <DomainSection
          title="Captured scan leads"
          subtitle={loading ? "Loading…" : `${filtered.length} of ${rows.length}`}
        >
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by business, email, or name…"
                className="w-full pl-9 pr-3 h-9 rounded-md bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/40"
              />
            </div>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div
              data-testid="scan-leads-empty"
              className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground"
            >
              No Operational Friction Scan leads yet.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="hidden md:grid grid-cols-[minmax(0,1.7fr)_minmax(0,1.6fr)_minmax(0,2fr)_120px_140px_120px] gap-3 px-4 py-2 bg-muted/30 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <div>Business / lead</div>
                <div>Contact</div>
                <div>Likely bottleneck</div>
                <div>Worn teeth</div>
                <div>Follow-up email</div>
                <div>Submitted</div>
              </div>
              {filtered.map((r) => (
                <div
                  key={r.id}
                  data-testid="scan-lead-row"
                  className="grid grid-cols-1 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1.6fr)_minmax(0,2fr)_120px_140px_120px] gap-3 px-4 py-3 border-t border-border hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-foreground font-medium truncate">
                      {r.business_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {r.first_name} {r.last_name}
                    </div>
                    <div className="text-[10px] text-[hsl(78,30%,68%)]/80 truncate mt-0.5">
                      Source: Operational Friction Scan
                    </div>
                    {r.requested_next_step === "request_deeper_diagnostic" && (
                      <div className="text-[10px] text-amber-200/80 truncate mt-0.5">
                        Requested deeper Diagnostic
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 text-xs text-muted-foreground space-y-0.5">
                    <div className="truncate">{r.email}</div>
                    {r.phone && <div className="truncate">{r.phone}</div>}
                    {r.linked_customer_id ? (
                      <Link
                        to={`/admin/customers/${r.linked_customer_id}`}
                        className="text-[10px] text-emerald-300/80 hover:underline truncate block"
                      >
                        Linked customer
                      </Link>
                    ) : (
                      <div className="text-[10px] text-muted-foreground/70 truncate">
                        No customer link yet
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-foreground/90 truncate">
                      {bottleneckOf(r)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Slipping gear: {upstreamGearOf(r)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {wornTeethCount(r)} likely
                  </div>
                  <div className="space-y-1">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${emailTone(
                        r.follow_up_email_status,
                      )}`}
                    >
                      {emailLabel(r.follow_up_email_status)}
                    </span>
                    {r.manual_followup_required && (
                      <div className="text-[10px] text-amber-200/80">Manual follow-up</div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}