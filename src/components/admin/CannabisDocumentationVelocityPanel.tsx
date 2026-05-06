/**
 * P85.5 — Admin Cannabis Documentation Velocity™ panel.
 *
 * Admin can enter the last manual seed-to-sale / inventory audit date,
 * record evidence (manual export / upload only — no fake live sync),
 * see deterministic days-since + status, add admin-only notes, write a
 * client-safe explanation, and approve for client visibility.
 *
 * Renders only for cannabis / MMJ / dispensary industry keys.
 */
import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CANNABIS_ALLOWED_EVIDENCE_EXAMPLES,
  CANNABIS_DOC_VELOCITY_ADMIN_INTERPRETATION,
  CANNABIS_DOC_VELOCITY_CLIENT_SAFE_EXPLANATION,
  CANNABIS_DOC_VELOCITY_THRESHOLD_DAYS,
  findCannabisDocVelocityForbiddenPhrase,
  isCannabisIndustryKey,
} from "@/config/cannabisDocumentationVelocity";
import {
  approveCannabisDocVelocityForClient,
  createCannabisDocVelocityReview,
  detectCannabisDocumentationVelocity,
  listAdminCannabisDocVelocity,
  unapproveCannabisDocVelocity,
  type AdminCannabisDocVelocityRow,
} from "@/lib/cannabisDocumentationVelocity";

export interface CannabisDocumentationVelocityPanelProps {
  customerId: string;
  industryKey: string | null | undefined;
}

export function CannabisDocumentationVelocityPanel({
  customerId,
  industryKey,
}: CannabisDocumentationVelocityPanelProps) {
  const isCannabis = isCannabisIndustryKey(industryKey);
  const [rows, setRows] = useState<AdminCannabisDocVelocityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [auditDate, setAuditDate] = useState<string>("");
  const [sourceType, setSourceType] = useState<string>("");
  const [evidenceLabel, setEvidenceLabel] = useState<string>("");
  const [adminNote, setAdminNote] = useState<string>("");
  const [clientExpl, setClientExpl] = useState<string>("");

  const reload = async () => {
    if (!isCannabis) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await listAdminCannabisDocVelocity(customerId));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, isCannabis]);

  const previewResult = useMemo(
    () =>
      detectCannabisDocumentationVelocity({
        lastManualAuditAt: auditDate || null,
        industryKey: industryKey ?? null,
      }),
    [auditDate, industryKey],
  );

  if (!isCannabis) {
    return (
      <section
        className="bg-card border border-border rounded-xl p-5"
        data-testid="cannabis-documentation-velocity-panel"
        data-applicable="false"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Cannabis Documentation Velocity™
          </h3>
          <Badge variant="outline" className="text-[10px]">
            Not applicable
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This signal applies only to cannabis / MMJ / dispensary / regulated
          cannabis retail businesses.
        </p>
      </section>
    );
  }

  const submit = async () => {
    if (clientExpl && findCannabisDocVelocityForbiddenPhrase(clientExpl)) {
      toast.error(
        "Client-safe explanation contains forbidden compliance/legal language.",
      );
      return;
    }
    setBusy(true);
    try {
      await createCannabisDocVelocityReview({
        customer_id: customerId,
        industry_key: industryKey as string,
        last_manual_audit_at: auditDate ? new Date(auditDate).toISOString() : null,
        evidence_source_type: (sourceType || null) as any,
        evidence_label: evidenceLabel || null,
        admin_notes: adminNote || null,
        client_safe_explanation: clientExpl || null,
      });
      toast.success("Cannabis Documentation Velocity™ review recorded.");
      setAuditDate("");
      setSourceType("");
      setEvidenceLabel("");
      setAdminNote("");
      setClientExpl("");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not record review.");
    } finally {
      setBusy(false);
    }
  };

  const approve = async (id: string, expl: string | null) => {
    if (expl && findCannabisDocVelocityForbiddenPhrase(expl)) {
      toast.error("Client-safe explanation contains forbidden language.");
      return;
    }
    setBusy(true);
    try {
      await approveCannabisDocVelocityForClient(id, expl ?? undefined);
      toast.success("Approved for client visibility.");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not approve.");
    } finally {
      setBusy(false);
    }
  };

  const unapprove = async (id: string) => {
    setBusy(true);
    try {
      await unapproveCannabisDocVelocity(id);
      toast.success("Removed from client visibility.");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="bg-card border border-border rounded-xl p-5 space-y-5"
      data-testid="cannabis-documentation-velocity-panel"
      data-applicable="true"
    >
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-medium text-foreground">
            Cannabis Documentation Velocity™
          </h3>
          <Badge variant="outline" className="text-[10px]">
            Admin
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </header>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {CANNABIS_DOC_VELOCITY_ADMIN_INTERPRETATION} Threshold:{" "}
        {CANNABIS_DOC_VELOCITY_THRESHOLD_DAYS} calendar days. All evidence below
        is treated as <strong>manual export / upload</strong> — RGS does not
        currently maintain a live METRC or BioTrack connector.
      </p>

      <div className="grid md:grid-cols-2 gap-4 border border-border/60 rounded-lg p-4">
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Last manual seed-to-sale / inventory audit date
          </label>
          <Input
            type="date"
            value={auditDate}
            onChange={(e) => setAuditDate(e.target.value)}
          />
          <div className="text-[11px] text-muted-foreground">
            Preview status:{" "}
            <Badge variant="outline" className="text-[10px]">
              {previewResult.status}
            </Badge>
            {previewResult.days_since_manual_audit !== null && (
              <span className="ml-2">
                {previewResult.days_since_manual_audit} days since audit
              </span>
            )}
            {previewResult.needs_reinspection && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                Needs Re-Inspection
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Evidence source (manual export / upload)
          </label>
          <Select value={sourceType} onValueChange={setSourceType}>
            <SelectTrigger>
              <SelectValue placeholder="Select evidence source" />
            </SelectTrigger>
            <SelectContent>
              {CANNABIS_ALLOWED_EVIDENCE_EXAMPLES.map((e) => (
                <SelectItem key={e.source_type} value={e.source_type}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Evidence label (file name, reference, etc.)"
            value={evidenceLabel}
            onChange={(e) => setEvidenceLabel(e.target.value)}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Admin-only note (never shown to client)
          </label>
          <Textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={2}
            placeholder="Internal context, follow-ups, evidence quality observations…"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Client-safe explanation (operational-readiness only)
          </label>
          <Textarea
            value={clientExpl}
            onChange={(e) => setClientExpl(e.target.value)}
            rows={2}
            placeholder={CANNABIS_DOC_VELOCITY_CLIENT_SAFE_EXPLANATION}
          />
          {clientExpl &&
            findCannabisDocVelocityForbiddenPhrase(clientExpl) && (
              <p className="text-[11px] text-destructive">
                Forbidden compliance/legal language detected — please rephrase
                using operational-readiness wording.
              </p>
            )}
        </div>

        <div className="md:col-span-2 flex justify-end">
          <Button onClick={submit} disabled={busy}>
            Record review
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
          Recent reviews
        </h4>
        {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
        {!loading && rows.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No Cannabis Documentation Velocity™ reviews recorded yet.
          </div>
        )}
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-border/60 bg-background/40 p-3"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {r.velocity_status}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {r.severity}
                </Badge>
                {r.needs_reinspection && (
                  <Badge variant="outline" className="text-[10px]">
                    Needs Re-Inspection
                  </Badge>
                )}
                {r.approved_for_client ? (
                  <Badge variant="outline" className="text-[10px]">
                    Client visible
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Admin only
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {r.last_manual_audit_at
                    ? `Audit: ${new Date(r.last_manual_audit_at).toLocaleDateString()}`
                    : "No audit date provided"}
                </span>
                {r.days_since_manual_audit !== null && (
                  <span className="text-[11px] text-muted-foreground">
                    {r.days_since_manual_audit} days since
                  </span>
                )}
              </div>
              {r.evidence_label && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Evidence: {r.evidence_label}
                  {r.evidence_source_type ? ` (${r.evidence_source_type})` : ""}{" "}
                  — manual export / upload
                </p>
              )}
              {r.admin_notes && (
                <p className="mt-1 text-[11px] text-muted-foreground italic">
                  Admin note: {r.admin_notes}
                </p>
              )}
              {r.client_safe_explanation && (
                <p className="mt-1 text-[11px] text-foreground">
                  Client-safe: {r.client_safe_explanation}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                {!r.approved_for_client ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => approve(r.id, r.client_safe_explanation)}
                  >
                    Approve for client
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => unapprove(r.id)}
                  >
                    Remove client visibility
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default CannabisDocumentationVelocityPanel;