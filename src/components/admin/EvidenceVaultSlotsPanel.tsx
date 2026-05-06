/**
 * P87 — Admin Evidence Vault Slots review panel.
 *
 * Deterministic. AI HITL gate enforced via lib + DB trigger.
 * No AI scoring. No live sync claims. Forbidden client-facing phrases
 * are blocked before write.
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, FileSearch } from "lucide-react";
import {
  EVIDENCE_VAULT_SLOTS,
  EVIDENCE_SLOT_STATUS_CLIENT_LABEL,
  type EvidenceSlotKey,
  type EvidenceSlotStatus,
  type IndustryKey,
  resolveSlotForIndustry,
  findForbiddenSlotPhrase,
} from "@/config/evidenceVaultSlots";
import {
  adminListSlotsForCustomer,
  adminReviewSlot,
  type AdminEvidenceSlotRow,
  HITL_CONFIRMATION_TEXT,
} from "@/lib/evidenceVaultSlots";
import { useAuth } from "@/contexts/AuthContext";

const ACTIONS: { label: string; status: EvidenceSlotStatus }[] = [
  { label: "Verify", status: "verified" },
  { label: "Partial / More Info", status: "partial" },
  { label: "Reject", status: "rejected" },
  { label: "Not Applicable", status: "not_applicable" },
  { label: "Return to Pending Review", status: "pending_review" },
  { label: "Mark Missing", status: "missing" },
];

interface PanelProps {
  customerId: string;
  industryKey?: IndustryKey | null;
}

export function EvidenceVaultSlotsPanel({ customerId, industryKey }: PanelProps) {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminEvidenceSlotRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeSlot, setActiveSlot] = useState<EvidenceSlotKey | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [clientMsg, setClientMsg] = useState("");
  const [naReason, setNaReason] = useState("");
  const [conflictId, setConflictId] = useState("");
  const [scoringPending, setScoringPending] = useState(true);
  const [aiUsed, setAiUsed] = useState(false);
  const [crossChecked, setCrossChecked] = useState(false);
  const [hitlText, setHitlText] = useState("");

  const reload = async () => {
    try { setRows(await adminListSlotsForCustomer(customerId)); }
    catch (e: any) { toast.error(e.message ?? "Failed to load slots"); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const byKey = useMemo(() => {
    const m = new Map<EvidenceSlotKey, AdminEvidenceSlotRow>();
    for (const r of rows) m.set(r.slot_key, r);
    return m;
  }, [rows]);

  const resetForm = () => {
    setAdminNote(""); setClientMsg(""); setNaReason("");
    setConflictId(""); setScoringPending(true);
    setAiUsed(false); setCrossChecked(false); setHitlText("");
  };

  const handleAction = async (slotKey: EvidenceSlotKey, target: EvidenceSlotStatus) => {
    if (!user?.id) { toast.error("Admin not signed in"); return; }
    const forbidden = findForbiddenSlotPhrase(clientMsg);
    if (forbidden) { toast.error(`Forbidden client-facing phrase: "${forbidden}"`); return; }
    setBusy(true);
    try {
      const res = await adminReviewSlot({
        customerId,
        slotKey,
        targetStatus: target,
        adminId: user.id,
        adminOnlyNote: adminNote || null,
        clientSafeMessage: clientMsg || null,
        notApplicableReason: target === "not_applicable" ? naReason : null,
        scoringEffectPending: scoringPending,
        sourceConflictFlagId: conflictId || null,
        ai: aiUsed
          ? {
              used: true,
              taskType: "interpret",
              rawDocumentCrossChecked: crossChecked,
              confirmationText: hitlText,
            }
          : undefined,
      });
      if (!res.ok) {
        toast.error(`Blocked: ${res.blockedReason}`);
      } else {
        toast.success(`Slot updated: ${target}`);
        resetForm();
        setActiveSlot(null);
        await reload();
      }
    } finally { setBusy(false); }
  };

  return (
    <div data-testid="admin-evidence-vault-slots-panel" className="space-y-4">
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5 mt-0.5" />
        <p>
          Five labeled slots. AI-assisted verification requires explicit HITL
          cross-check. No automated scoring or live-sync is implied.
        </p>
      </div>
      <ul className="space-y-3">
        {EVIDENCE_VAULT_SLOTS.map((slot) => {
          const resolved = resolveSlotForIndustry(slot.key, industryKey ?? null)!;
          const row = byKey.get(slot.key);
          const status: EvidenceSlotStatus = (row?.status as EvidenceSlotStatus) ?? "missing";
          const isOpen = activeSlot === slot.key;
          return (
            <li key={slot.key} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-sm font-medium text-foreground">{resolved.industryLabel}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {slot.gears.join(" · ")} · TTL {slot.defaultTtlDays ?? "—"}d · {slot.verificationCategory}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {EVIDENCE_SLOT_STATUS_CLIENT_LABEL[status]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{resolved.industryHelpText}</p>
              <p className="text-[11px] text-muted-foreground">
                Examples: {slot.acceptedExamples.join(", ")}
              </p>
              {row?.customer_upload_id && (
                <div className="flex items-center gap-2 text-[11px] text-foreground">
                  <FileSearch className="h-3 w-3" />
                  Upload reference: <code className="text-[10px]">{row.customer_upload_id}</code>
                </div>
              )}
              {row?.scoring_effect_pending && (
                <div className="text-[10px] text-amber-600">pending scoring integration</div>
              )}
              {!isOpen ? (
                <Button size="sm" variant="outline" onClick={() => { resetForm(); setActiveSlot(slot.key); }}>
                  Review
                </Button>
              ) : (
                <div className="space-y-2 border-t border-border pt-3">
                  <Textarea
                    placeholder="Admin-only note (never shown to client)"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                  <Textarea
                    placeholder="Client-safe message (no compliance/legal/audit claims)"
                    value={clientMsg}
                    onChange={(e) => setClientMsg(e.target.value)}
                  />
                  <Input
                    placeholder="Source-of-truth conflict flag ID (optional)"
                    value={conflictId}
                    onChange={(e) => setConflictId(e.target.value)}
                  />
                  <Input
                    placeholder="Not-applicable reason (if marking N/A)"
                    value={naReason}
                    onChange={(e) => setNaReason(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={scoringPending}
                      onChange={(e) => setScoringPending(e.target.checked)}
                    />
                    Scoring effect pending integration
                  </label>
                  <div className="rounded-md border border-border p-2 space-y-2 bg-muted/20">
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input type="checkbox" checked={aiUsed} onChange={(e) => setAiUsed(e.target.checked)} />
                      AI assistance was used
                    </label>
                    {aiUsed && (
                      <>
                        <label className="flex items-center gap-2 text-xs text-foreground">
                          <input
                            type="checkbox"
                            checked={crossChecked}
                            onChange={(e) => setCrossChecked(e.target.checked)}
                          />
                          Raw document cross-checked
                        </label>
                        <Input
                          placeholder={HITL_CONFIRMATION_TEXT}
                          value={hitlText}
                          onChange={(e) => setHitlText(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Verify will block unless HITL gate passes (raw cross-check + exact phrase).
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ACTIONS.map((a) => (
                      <Button
                        key={a.status}
                        size="sm"
                        variant={a.status === "verified" ? "default" : "outline"}
                        disabled={busy}
                        onClick={() => handleAction(slot.key, a.status)}
                      >
                        {a.label}
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => setActiveSlot(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default EvidenceVaultSlotsPanel;