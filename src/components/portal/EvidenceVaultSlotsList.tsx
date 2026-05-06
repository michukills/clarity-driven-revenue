/**
 * P87 — Client-facing Evidence Vault progress/list.
 * Reads only via SECURITY DEFINER RPC. No admin-only fields.
 * No raw storage paths. Client cannot mark Verified/Partial/Rejected.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Upload as UploadIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  EVIDENCE_VAULT_SLOTS,
  EVIDENCE_SLOT_STATUS_CLIENT_LABEL,
  type EvidenceSlotKey,
  type EvidenceSlotStatus,
  type IndustryKey,
  resolveSlotForIndustry,
} from "@/config/evidenceVaultSlots";
import {
  getClientSlotsForCustomer,
  type ClientEvidenceSlotRow,
} from "@/lib/evidenceVaultSlots";

export function EvidenceVaultSlotsList({
  customerId,
  industryKey,
}: {
  customerId: string;
  industryKey?: IndustryKey | null;
}) {
  const [rows, setRows] = useState<ClientEvidenceSlotRow[] | null>(null);
  useEffect(() => {
    if (!customerId) return;
    getClientSlotsForCustomer(customerId).then(setRows).catch(() => setRows([]));
  }, [customerId]);

  const byKey = useMemo(() => {
    const m = new Map<EvidenceSlotKey, ClientEvidenceSlotRow>();
    for (const r of rows ?? []) m.set(r.slot_key as EvidenceSlotKey, r);
    return m;
  }, [rows]);

  const counts = useMemo(() => {
    const c: Record<EvidenceSlotStatus, number> = {
      missing: 0, pending_review: 0, verified: 0, partial: 0,
      rejected: 0, expired: 0, expiring_soon: 0, not_applicable: 0,
    };
    for (const slot of EVIDENCE_VAULT_SLOTS) {
      const r = byKey.get(slot.key);
      const st = (r?.status as EvidenceSlotStatus) ?? "missing";
      c[st] = (c[st] ?? 0) + 1;
    }
    return c;
  }, [byKey]);

  const total = EVIDENCE_VAULT_SLOTS.length;
  const progressPct = Math.round(((counts.verified + counts.not_applicable) / total) * 100);

  return (
    <section data-testid="evidence-vault-slots-list" className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
      <header className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Evidence Vault</h3>
      </header>
      <div className="space-y-1">
        <Progress value={progressPct} />
        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-3">
          <span>Verified: {counts.verified}</span>
          <span>Pending review: {counts.pending_review}</span>
          <span>Missing: {counts.missing}</span>
          <span>More info: {counts.partial}</span>
          <span>Expiring soon: {counts.expiring_soon}</span>
          <span>Expired: {counts.expired}</span>
        </div>
      </div>
      <ul className="space-y-2">
        {EVIDENCE_VAULT_SLOTS.map((slot) => {
          const resolved = resolveSlotForIndustry(slot.key, industryKey ?? null)!;
          const r = byKey.get(slot.key);
          const status: EvidenceSlotStatus = (r?.status as EvidenceSlotStatus) ?? "missing";
          return (
            <li key={slot.key} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm text-foreground">{resolved.industryLabel}</div>
                <Badge variant="outline" className="text-[10px]">{EVIDENCE_SLOT_STATUS_CLIENT_LABEL[status]}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">{resolved.industryHelpText}</p>
              <p className="text-[10px] text-muted-foreground">
                Examples: {slot.acceptedExamples.join(", ")}
              </p>
              <p className="text-[10px] text-muted-foreground italic">{slot.clientSafeWording}</p>
              {r?.client_safe_message && (
                <p className="text-[11px] text-foreground">{r.client_safe_message}</p>
              )}
              {(status === "missing" || status === "rejected" || status === "partial" || status === "expired" || status === "expiring_soon") && (
                <Button asChild size="sm" variant="outline" className="mt-1">
                  <Link to={`/portal/uploads?slot=${slot.key}`}>
                    <UploadIcon className="h-3 w-3 mr-1" /> Upload
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-muted-foreground italic">
        Operational-readiness signal only. Not legal, tax, lending, audit, or
        compliance certification.
      </p>
    </section>
  );
}

export default EvidenceVaultSlotsList;