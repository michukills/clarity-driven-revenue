/**
 * P67B — Admin Evidence Review Panel.
 *
 * Lists evidence records for a customer and lets admins:
 *   - update title/description, gear, metric, use context
 *   - link to scorecard run / report draft / repair-map item / tool key
 *   - set sufficiency status, admin review status, client-visible status
 *   - apply admin-only regulated tags (never client-visible)
 *   - flag possible PII/PHI
 *   - mark include_in_client_report
 *   - add admin-only and client-visible notes
 *
 * Admin-only fields are clearly labelled. Client-facing forbidden phrases
 * are blocked at the service layer.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock, ShieldAlert, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import {
  ADMIN_ONLY_REGULATED_TAGS,
  EVIDENCE_SUFFICIENCY_STATUSES,
  EVIDENCE_SUFFICIENCY_CLIENT_LABEL,
  EVIDENCE_USE_CONTEXTS,
  EVIDENCE_VAULT_NAME,
  OPERATIONAL_READINESS_PRINCIPLE,
  type AdminOnlyRegulatedTag,
  type EvidenceSufficiencyStatus,
  type EvidenceUseContext,
} from "@/config/evidenceVault";
import {
  adminUpdateEvidenceRecord,
  EVIDENCE_ADMIN_REVIEW_STATUSES,
  EVIDENCE_CLIENT_VISIBLE_STATUSES,
  type EvidenceAdminReviewStatus,
  type EvidenceClientVisibleStatus,
} from "@/lib/evidence/evidenceRecords";

interface EvidenceRow {
  id: string;
  customer_id: string;
  customer_upload_id: string | null;
  evidence_title: string | null;
  evidence_description: string | null;
  evidence_category: string | null;
  related_gear: string | null;
  related_metric: string | null;
  related_scorecard_item_key: string | null;
  related_tool_key: string | null;
  evidence_use_context: string;
  evidence_sufficiency_status: EvidenceSufficiencyStatus;
  admin_review_status: EvidenceAdminReviewStatus;
  client_visible_status: EvidenceClientVisibleStatus;
  admin_only_note: string | null;
  client_visible_note: string | null;
  admin_only_regulatory_tag: AdminOnlyRegulatedTag | null;
  is_regulated_industry_sensitive: boolean;
  contains_possible_pii_phi: boolean;
  include_in_client_report: boolean;
  version_number: number;
  is_current_version: boolean;
  created_at: string;
  updated_at: string;
}

export interface EvidenceReviewPanelProps {
  customerId: string;
}

export function EvidenceReviewPanel({ customerId }: EvidenceReviewPanelProps) {
  const [rows, setRows] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<EvidenceRow>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("evidence_records")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setRows((data ?? []) as unknown as EvidenceRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (customerId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const startEdit = (row: EvidenceRow) => {
    setEditing(row.id);
    setDraft(row);
  };

  const save = async () => {
    if (!editing) return;
    try {
      await adminUpdateEvidenceRecord(editing, {
        evidenceTitle: draft.evidence_title ?? null,
        evidenceDescription: draft.evidence_description ?? null,
        evidenceCategory: draft.evidence_category ?? null,
        relatedGear: draft.related_gear ?? null,
        relatedMetric: draft.related_metric ?? null,
        relatedScorecardItemKey: draft.related_scorecard_item_key ?? null,
        relatedToolKey: draft.related_tool_key ?? null,
        evidenceUseContext: (draft.evidence_use_context as EvidenceUseContext) ?? "diagnostic",
        evidenceSufficiencyStatus:
          draft.evidence_sufficiency_status as EvidenceSufficiencyStatus,
        adminReviewStatus: draft.admin_review_status,
        clientVisibleStatus: draft.client_visible_status,
        adminOnlyNote: draft.admin_only_note ?? null,
        clientVisibleNote: draft.client_visible_note ?? null,
        adminOnlyRegulatoryTag: draft.admin_only_regulatory_tag ?? null,
        isRegulatedIndustrySensitive: !!draft.is_regulated_industry_sensitive,
        containsPossiblePiiPhi: !!draft.contains_possible_pii_phi,
        includeInClientReport: !!draft.include_in_client_report,
      });
      toast.success("Evidence updated");
      setEditing(null);
      setDraft({});
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section
      className="bg-card border border-border rounded-xl p-5 space-y-4"
      data-testid="admin-evidence-review-panel"
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">
              {EVIDENCE_VAULT_NAME} — admin review
            </h3>
            <Badge variant="outline" className="text-[10px]">Admin only</Badge>
            <Badge variant="secondary" className="text-[10px]">P67B</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            {OPERATIONAL_READINESS_PRINCIPLE}
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading evidence…</p>
      ) : rows.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-4 text-xs text-muted-foreground">
          No evidence records yet. Client uploads with metadata will appear here.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const isOpen = editing === row.id;
            return (
              <li
                key={row.id}
                className="border border-border rounded-md p-3 space-y-2"
                data-evidence-id={row.id}
              >
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div>
                    <div className="text-sm text-foreground">
                      {row.evidence_title || "(untitled evidence)"}
                      {!row.is_current_version && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          superseded
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      v{row.version_number} · {row.evidence_use_context} ·{" "}
                      {EVIDENCE_SUFFICIENCY_CLIENT_LABEL[row.evidence_sufficiency_status]}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {row.is_regulated_industry_sensitive && (
                      <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-300">
                        regulated-sensitive
                      </Badge>
                    )}
                    {row.contains_possible_pii_phi && (
                      <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-300">
                        possible PII/PHI
                      </Badge>
                    )}
                    {row.admin_only_regulatory_tag && (
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        data-testid="admin-only-regulated-tag"
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        {row.admin_only_regulatory_tag}
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                      {isOpen ? "Editing…" : "Review"}
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <Input
                      placeholder="Title"
                      value={draft.evidence_title ?? ""}
                      onChange={(e) => setDraft({ ...draft, evidence_title: e.target.value })}
                    />
                    <Input
                      placeholder="Category"
                      value={draft.evidence_category ?? ""}
                      onChange={(e) => setDraft({ ...draft, evidence_category: e.target.value })}
                    />
                    <Input
                      placeholder="Related gear"
                      value={draft.related_gear ?? ""}
                      onChange={(e) => setDraft({ ...draft, related_gear: e.target.value })}
                    />
                    <Input
                      placeholder="Related metric / scorecard item key"
                      value={draft.related_scorecard_item_key ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, related_scorecard_item_key: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Related tool key"
                      value={draft.related_tool_key ?? ""}
                      onChange={(e) => setDraft({ ...draft, related_tool_key: e.target.value })}
                    />
                    <select
                      className="bg-background border border-border rounded px-2 text-sm"
                      value={draft.evidence_use_context ?? "diagnostic"}
                      onChange={(e) =>
                        setDraft({ ...draft, evidence_use_context: e.target.value })
                      }
                    >
                      {EVIDENCE_USE_CONTEXTS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      className="bg-background border border-border rounded px-2 text-sm"
                      value={draft.evidence_sufficiency_status ?? "needs_review"}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          evidence_sufficiency_status:
                            e.target.value as EvidenceSufficiencyStatus,
                        })
                      }
                    >
                      {EVIDENCE_SUFFICIENCY_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      className="bg-background border border-border rounded px-2 text-sm"
                      value={draft.admin_review_status ?? "pending"}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          admin_review_status: e.target.value as EvidenceAdminReviewStatus,
                        })
                      }
                    >
                      {EVIDENCE_ADMIN_REVIEW_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      className="bg-background border border-border rounded px-2 text-sm"
                      value={draft.client_visible_status ?? "private"}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          client_visible_status: e.target.value as EvidenceClientVisibleStatus,
                        })
                      }
                    >
                      {EVIDENCE_CLIENT_VISIBLE_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      className="bg-background border border-border rounded px-2 text-sm"
                      value={draft.admin_only_regulatory_tag ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          admin_only_regulatory_tag:
                            (e.target.value || null) as AdminOnlyRegulatedTag | null,
                        })
                      }
                    >
                      <option value="">— admin-only regulated tag —</option>
                      {ADMIN_ONLY_REGULATED_TAGS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={!!draft.is_regulated_industry_sensitive}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            is_regulated_industry_sensitive: e.target.checked,
                          })
                        }
                      />
                      Regulated-industry sensitive
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={!!draft.contains_possible_pii_phi}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            contains_possible_pii_phi: e.target.checked,
                          })
                        }
                      />
                      Contains possible PII/PHI
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={!!draft.include_in_client_report}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            include_in_client_report: e.target.checked,
                          })
                        }
                      />
                      Include in client-facing report
                    </label>
                    <div className="md:col-span-2 space-y-2">
                      <Textarea
                        placeholder="Admin-only note (never shown to client)"
                        value={draft.admin_only_note ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, admin_only_note: e.target.value })
                        }
                        data-testid="admin-only-note-input"
                      />
                      <Textarea
                        placeholder="Client-visible note (scope-safe; no compliance/audit/GAAP claims)"
                        value={draft.client_visible_note ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, client_visible_note: e.target.value })
                        }
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(null);
                          setDraft({});
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={save}>
                        Save evidence review
                      </Button>
                    </div>
                    <p className="md:col-span-2 text-[10px] text-amber-300 inline-flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      Admin-only fields stay private. Client cannot self-certify
                      compliance, audit, GAAP, fiduciary, lender, or valuation status.
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default EvidenceReviewPanel;