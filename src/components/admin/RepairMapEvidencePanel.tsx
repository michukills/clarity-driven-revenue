/**
 * P68B — Admin Repair Map evidence attachment panel.
 *
 * Per Repair Map item, lets an admin:
 *  - see currently attached evidence (with safety status)
 *  - attach evidence from this customer's Evidence Vault
 *  - detach evidence
 *  - filter by gear, sufficiency, review status, client-visibility, PII/PHI,
 *    regulated tag, include-in-client-report
 *  - see warnings before attaching admin-only / unapproved / regulated /
 *    PII/PHI-flagged evidence to a client-visible item.
 *
 * Reuses `evidence_records.related_repair_map_item_id`. No new join table.
 */
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lock, ShieldAlert, FileCheck2, Link2, X } from "lucide-react";
import {
  adminAttachEvidenceToRepairMapItem,
  adminDetachEvidenceFromRepairMapItem,
  adminListCustomerEvidenceForRepairPicker,
  isUnsafeForClientVisibleRepairMap,
  type AdminRepairMapEvidenceRow,
} from "@/lib/evidence/evidenceRecords";

export interface RepairMapEvidencePanelProps {
  customerId: string;
  repairMapItemId: string;
  itemClientVisible: boolean;
  onChanged?: () => void;
}

export function RepairMapEvidencePanel({
  customerId,
  repairMapItemId,
  itemClientVisible,
  onChanged,
}: RepairMapEvidencePanelProps) {
  const [rows, setRows] = useState<AdminRepairMapEvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showOnly, setShowOnly] = useState<
    "all" | "approved_client_safe" | "needs_review" | "private"
  >("all");

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminListCustomerEvidenceForRepairPicker(customerId);
      setRows(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const attached = useMemo(
    () => rows.filter((r) => r.related_repair_map_item_id === repairMapItemId),
    [rows, repairMapItemId],
  );

  const candidates = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return rows
      .filter((r) => r.related_repair_map_item_id !== repairMapItemId)
      .filter((r) => {
        if (!q) return true;
        return (
          (r.evidence_title ?? "").toLowerCase().includes(q) ||
          (r.related_gear ?? "").toLowerCase().includes(q) ||
          (r.related_metric ?? "").toLowerCase().includes(q)
        );
      })
      .filter((r) => {
        switch (showOnly) {
          case "approved_client_safe":
            return (
              r.admin_review_status === "approved" &&
              r.client_visible_status !== "private" &&
              r.include_in_client_report
            );
          case "needs_review":
            return r.admin_review_status !== "approved";
          case "private":
            return r.client_visible_status === "private";
          default:
            return true;
        }
      });
  }, [rows, repairMapItemId, filter, showOnly]);

  const attach = async (evidenceId: string) => {
    const row = rows.find((r) => r.id === evidenceId);
    if (
      itemClientVisible &&
      row &&
      isUnsafeForClientVisibleRepairMap(row)
    ) {
      const ok = window.confirm(
        "This evidence is not approved/client-safe (private, unapproved, regulated, or possibly contains PII/PHI). " +
          "It will NOT be shown to the client even after attachment. Attach anyway for admin reference?",
      );
      if (!ok) return;
    }
    try {
      await adminAttachEvidenceToRepairMapItem(evidenceId, repairMapItemId);
      toast.success("Evidence attached.");
      await load();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const detach = async (evidenceId: string) => {
    try {
      await adminDetachEvidenceFromRepairMapItem(evidenceId);
      toast.success("Evidence detached.");
      await load();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="border border-border rounded-md p-3 space-y-3 bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5" /> Evidence Vault attachments
        </div>
        <Badge variant="outline" className="text-[10px]">
          {attached.length} attached
        </Badge>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading evidence…</div>
      ) : (
        <>
          <div className="space-y-2">
            {attached.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">
                No evidence attached to this Repair Map item yet.
              </div>
            ) : (
              attached.map((r) => (
                <EvidenceRow
                  key={r.id}
                  row={r}
                  attached
                  itemClientVisible={itemClientVisible}
                  onAction={() => detach(r.id)}
                />
              ))
            )}
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Filter by title / gear / metric"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8 text-xs flex-1 min-w-[200px]"
              />
              <select
                value={showOnly}
                onChange={(e) => setShowOnly(e.target.value as typeof showOnly)}
                className="bg-background border border-border rounded-md px-2 text-xs h-8"
              >
                <option value="all">All evidence</option>
                <option value="approved_client_safe">Approved + client-safe</option>
                <option value="needs_review">Needs review</option>
                <option value="private">Private / admin-only</option>
              </select>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {candidates.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  No matching evidence.
                </div>
              ) : (
                candidates.map((r) => (
                  <EvidenceRow
                    key={r.id}
                    row={r}
                    attached={false}
                    itemClientVisible={itemClientVisible}
                    onAction={() => attach(r.id)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EvidenceRow({
  row,
  attached,
  itemClientVisible,
  onAction,
}: {
  row: AdminRepairMapEvidenceRow;
  attached: boolean;
  itemClientVisible: boolean;
  onAction: () => void;
}) {
  const unsafe = itemClientVisible && isUnsafeForClientVisibleRepairMap(row);
  return (
    <div
      className={`flex items-start justify-between gap-2 border rounded-md px-2.5 py-2 text-xs ${
        attached ? "border-primary/40 bg-background" : "border-border"
      }`}
    >
      <div className="min-w-0 space-y-1">
        <div className="text-foreground truncate">
          {row.evidence_title || "(untitled evidence)"}
        </div>
        <div className="flex flex-wrap gap-1">
          {row.related_gear ? (
            <Badge variant="outline" className="text-[10px]">
              {row.related_gear}
            </Badge>
          ) : null}
          <Badge variant="secondary" className="text-[10px] capitalize">
            review: {row.admin_review_status.replace(/_/g, " ")}
          </Badge>
          <Badge variant="secondary" className="text-[10px] capitalize">
            sufficiency: {row.evidence_sufficiency_status.replace(/_/g, " ")}
          </Badge>
          {row.client_visible_status === "private" ? (
            <Badge variant="outline" className="text-[10px]">
              <Lock className="h-2.5 w-2.5 mr-1" /> private
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              <FileCheck2 className="h-2.5 w-2.5 mr-1" /> client-visible
            </Badge>
          )}
          {row.include_in_client_report ? (
            <Badge variant="outline" className="text-[10px]">in client report</Badge>
          ) : null}
          {row.admin_only_regulatory_tag ? (
            <Badge variant="outline" className="text-[10px]">
              admin-only tag
            </Badge>
          ) : null}
          {row.contains_possible_pii_phi ? (
            <Badge variant="outline" className="text-[10px]">
              <ShieldAlert className="h-2.5 w-2.5 mr-1" /> possible PII/PHI
            </Badge>
          ) : null}
        </div>
        {unsafe && !attached ? (
          <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Will NOT be shown to client even
            if attached (not approved + client-safe).
          </div>
        ) : null}
      </div>
      <Button
        size="sm"
        variant={attached ? "outline" : "secondary"}
        className="h-7 text-[11px] shrink-0"
        onClick={onAction}
      >
        {attached ? (
          <>
            <X className="h-3 w-3 mr-1" /> Detach
          </>
        ) : (
          <>
            <Link2 className="h-3 w-3 mr-1" /> Attach
          </>
        )}
      </Button>
    </div>
  );
}