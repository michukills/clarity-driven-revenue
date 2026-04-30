/**
 * P36 — Admin review surface for AI-generated diagnostic follow-up Q&A.
 *
 * Read-only by default; admins can hide individual rows from the report
 * (audit trail is preserved — `hidden_from_report` is a flag, not a
 * delete). Deterministic intake answers are NOT shown here — they live
 * in their own Intake completeness panel.
 */
import { useEffect, useMemo, useState } from "react";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import {
  loadAiFollowups,
  groupFollowupsBySection,
  setFollowupHidden,
  type AiFollowupRow,
} from "@/lib/diagnostics/aiFollowups";
import { INTAKE_SECTIONS } from "@/lib/diagnostics/intake";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  customerId: string;
}

export function AiFollowupReviewPanel({ customerId }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<AiFollowupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    setLoading(true);
    loadAiFollowups(customerId)
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const grouped = useMemo(() => groupFollowupsBySection(rows), [rows]);
  const sectionLabel = useMemo(() => {
    const m = new Map<string, string>();
    INTAKE_SECTIONS.forEach((s) => m.set(s.key, s.label));
    return m;
  }, []);

  const toggleHidden = async (row: AiFollowupRow) => {
    setSavingId(row.id);
    try {
      await setFollowupHidden({
        followupId: row.id,
        hidden: !row.hidden_from_report,
        reviewerId: user?.id ?? null,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, hidden_from_report: !row.hidden_from_report } : r,
        ),
      );
      toast.success(!row.hidden_from_report ? "Hidden from report" : "Visible in report");
    } catch (e: any) {
      toast.error(e?.message || "Could not update");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="text-[11px] text-muted-foreground">Loading AI follow-ups…</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="text-[11px] text-muted-foreground">
        No AI follow-ups recorded for this client. Optional follow-ups appear
        only when the client (or you) explicitly request them inside a section.
      </div>
    );
  }

  const sectionKeys = Array.from(grouped.keys());

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-muted-foreground/80 leading-relaxed">
        AI follow-ups are <strong>not used by the deterministic scorecard</strong>.
        They are an audit-only conversation layer. Hide a row to keep it out of
        the published report — the audit record is preserved either way.
      </div>
      {sectionKeys.map((sk) => {
        const list = grouped.get(sk) || [];
        return (
          <div key={sk} className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              <Sparkles className="h-3 w-3" />
              {sectionLabel.get(sk) || sk}
              <span className="ml-1 text-[10px]">· {list.length}</span>
            </div>
            <ul className="space-y-2">
              {list.map((fu) => (
                <li
                  key={fu.id}
                  className={`p-2.5 rounded-md border ${fu.hidden_from_report ? "border-border/40 bg-background/20 opacity-60" : "border-border bg-background/40"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[12px] text-foreground leading-snug">
                        Q: {fu.question}
                      </div>
                      <div className="text-[12px] text-foreground/80 mt-1">
                        A:{" "}
                        {fu.answer ? (
                          fu.answer
                        ) : (
                          <span className="italic text-muted-foreground">No answer yet</span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground/70 mt-1.5">
                        {fu.model || "ai"} · asked {new Date(fu.created_at).toLocaleDateString()}
                        {fu.answered_at ? ` · answered ${new Date(fu.answered_at).toLocaleDateString()}` : ""}
                        {fu.hidden_from_report ? " · hidden from report" : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleHidden(fu)}
                      disabled={savingId === fu.id}
                      title={fu.hidden_from_report ? "Show in report" : "Hide from report"}
                      className="text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      {fu.hidden_from_report ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Hidden
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Visible
                        </>
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}