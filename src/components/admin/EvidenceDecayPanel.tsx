/**
 * P86 — Admin Evidence Decay & Pulse Rules panel.
 *
 * Deterministic. No AI scoring. Reminders are admin-tracked unless a
 * real email backend is wired AND consent allows it. Honest labels only.
 */
import { useEffect, useMemo, useState } from "react";
import { Clock, RefreshCw, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  EVIDENCE_DECAY_TTL_DAYS,
  EVIDENCE_DECAY_CLIENT_SAFE_EXPLANATION,
  EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED,
  EVIDENCE_DECAY_REMINDER_MODE_LABEL,
  findEvidenceDecayForbiddenPhrase,
  type EvidenceDecayCategory,
} from "@/config/evidenceDecay";
import {
  adminCreateOrUpdateEvidenceDecayRecord,
  adminListEvidenceDecayRecords,
  adminApproveDecayForClient,
  adminRefreshDecayStates,
  adminCreateExpirationReminder,
  EVIDENCE_DECAY_EMAIL_STATUS_LABEL,
  type AdminEvidenceDecayRow,
} from "@/lib/evidenceDecay";

const CATEGORIES: EvidenceDecayCategory[] = Object.keys(
  EVIDENCE_DECAY_TTL_DAYS,
) as EvidenceDecayCategory[];

const REVIEW_STATES: AdminEvidenceDecayRow["review_state"][] = [
  "missing", "pending_review", "partial", "approved", "rejected", "not_applicable",
];

const STATE_BADGE: Record<string, string> = {
  current: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  expiring_soon: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  expired: "bg-red-500/10 text-red-600 border-red-500/30",
  missing: "bg-red-500/10 text-red-600 border-red-500/30",
  pending_review: "bg-muted text-muted-foreground",
  partial: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  rejected: "bg-red-500/10 text-red-600 border-red-500/30",
  not_applicable: "bg-muted text-muted-foreground",
};

export interface EvidenceDecayPanelProps {
  customerId: string;
}

export function EvidenceDecayPanel({ customerId }: EvidenceDecayPanelProps) {
  const [rows, setRows] = useState<AdminEvidenceDecayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [gearKey, setGearKey] = useState("");
  const [evidenceCategory, setEvidenceCategory] =
    useState<EvidenceDecayCategory>("financial_snapshot");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [reviewState, setReviewState] =
    useState<AdminEvidenceDecayRow["review_state"]>("approved");
  const [verifiedAt, setVerifiedAt] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [clientMsg, setClientMsg] = useState("");

  const reload = async () => {
    setLoading(true);
    try {
      setRows(await adminListEvidenceDecayRecords(customerId));
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load evidence decay records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleSave = async () => {
    if (!gearKey.trim() || !evidenceLabel.trim()) {
      toast.error("Gear key and evidence label are required");
      return;
    }
    for (const t of [adminNote, clientMsg]) {
      const f = findEvidenceDecayForbiddenPhrase(t);
      if (f) {
        toast.error(`Forbidden phrase in text: "${f}"`);
        return;
      }
    }
    setBusy(true);
    try {
      await adminCreateOrUpdateEvidenceDecayRecord({
        customer_id: customerId,
        gear_key: gearKey.trim(),
        evidence_category: evidenceCategory,
        evidence_label: evidenceLabel.trim(),
        review_state: reviewState,
        verified_at: verifiedAt ? new Date(verifiedAt).toISOString() : null,
        admin_notes: adminNote.trim() || null,
        client_safe_message: clientMsg.trim() || null,
      });
      setGearKey(""); setEvidenceLabel(""); setVerifiedAt("");
      setAdminNote(""); setClientMsg("");
      toast.success("Evidence decay record saved");
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await adminApproveDecayForClient(id);
      toast.success("Approved for client");
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRefresh = async () => {
    setBusy(true);
    try {
      await adminRefreshDecayStates(customerId);
      toast.success("Decay states refreshed");
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const handleReminder = async (record: AdminEvidenceDecayRow) => {
    try {
      const r = await adminCreateExpirationReminder({
        customer_id: customerId,
        evidence_decay_record_id: record.id,
        reminder_type:
          record.decay_state === "expired" ? "expired" : "expiring_soon",
        admin_notes: `Reminder for ${record.evidence_label}`,
      });
      const label = EVIDENCE_DECAY_EMAIL_STATUS_LABEL[(r as any).email_status] ?? "Reminder created";
      toast.success(label);
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card/60 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <h3 className="font-serif text-lg">Evidence Decay & Pulse Rules</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={busy}>
          <RefreshCw className="h-3 w-3 mr-1" /> Recompute states
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {EVIDENCE_DECAY_CLIENT_SAFE_EXPLANATION}
      </p>
      <div className="text-[11px] text-muted-foreground italic">
        Reminder mode: {EVIDENCE_DECAY_REMINDER_MODE_LABEL}
        {!EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED && (
          <span> — automated email sends are not wired. Reminders here are admin-tracked only.</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Gear key (e.g. financial_visibility)" value={gearKey} onChange={(e) => setGearKey(e.target.value)} />
        <Select value={evidenceCategory} onValueChange={(v) => setEvidenceCategory(v as EvidenceDecayCategory)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c} {EVIDENCE_DECAY_TTL_DAYS[c] != null ? `(TTL ${EVIDENCE_DECAY_TTL_DAYS[c]}d)` : "(no TTL)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="sm:col-span-2" placeholder="Evidence label (e.g. Q1 P&L manual upload)" value={evidenceLabel} onChange={(e) => setEvidenceLabel(e.target.value)} />
        <Select value={reviewState} onValueChange={(v) => setReviewState(v as AdminEvidenceDecayRow["review_state"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {REVIEW_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="datetime-local" value={verifiedAt} onChange={(e) => setVerifiedAt(e.target.value)} placeholder="Verified at" />
        <Textarea className="sm:col-span-2" placeholder="Admin-only note (never shown to client)" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
        <Textarea className="sm:col-span-2" placeholder="Client-safe message (shown only after approval)" value={clientMsg} onChange={(e) => setClientMsg(e.target.value)} />
      </div>
      <Button onClick={handleSave} disabled={busy}>Save evidence decay record</Button>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Tracked evidence</div>
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
          : rows.length === 0 ? <div className="text-sm text-muted-foreground">No evidence decay records yet.</div>
          : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{r.evidence_label}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.gear_key} · {r.evidence_category}
                        {r.expires_at ? ` · expires ${new Date(r.expires_at).toLocaleDateString()}` : ""}
                        {r.days_until_expiry != null ? ` (${r.days_until_expiry}d)` : ""}
                      </div>
                    </div>
                    <Badge variant="outline" className={STATE_BADGE[r.decay_state]}>{r.decay_state}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!r.approved_for_client && (
                      <Button size="sm" variant="outline" onClick={() => handleApprove(r.id)}>
                        Approve for client
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleReminder(r)}>
                      <BellRing className="h-3 w-3 mr-1" /> Create reminder
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}

export default EvidenceDecayPanel;