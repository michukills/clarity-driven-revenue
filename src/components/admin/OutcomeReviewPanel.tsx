// P20.1 — Admin outcome review panel.
// Lists pending and recently reviewed outcomes for a customer; lets admin
// validate, reject, or mark needs follow-up, capture measured result + impact,
// and decide whether the outcome contributes to same-industry / cross-industry
// learning. Validating with contribution flags creates learning event rows.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Clock, MessageSquare, Brain, Globe2 } from "lucide-react";
import {
  loadPendingOutcomes,
  reviewOutcome,
  type AdminOutcomeRow,
  type OutcomeStatus,
} from "@/lib/clientTaskOutcomes";

interface Props {
  customerId: string;
}

const STATUS_BADGE: Record<OutcomeStatus, string> = {
  pending_review: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  outcome_validated: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  outcome_rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  needs_follow_up: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

const STATUS_LABEL: Record<OutcomeStatus, string> = {
  pending_review: "Pending review",
  outcome_validated: "Validated",
  outcome_rejected: "Rejected",
  needs_follow_up: "Needs follow-up",
};

interface TaskMeta {
  issue_title: string;
  priority_band: string;
}

export function OutcomeReviewPanel({ customerId }: Props) {
  const [rows, setRows] = useState<AdminOutcomeRow[]>([]);
  const [taskMeta, setTaskMeta] = useState<Record<string, TaskMeta>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadPendingOutcomes(customerId);
      setRows(data);
      const taskIds = Array.from(
        new Set(data.map((d) => d.client_task_id).filter(Boolean) as string[])
      );
      if (taskIds.length > 0) {
        const { data: tasks } = await supabase
          .from("client_tasks")
          .select("id, issue_title, priority_band")
          .in("id", taskIds);
        const map: Record<string, TaskMeta> = {};
        for (const t of tasks ?? []) {
          map[t.id] = { issue_title: t.issue_title, priority_band: t.priority_band };
        }
        setTaskMeta(map);
      } else {
        setTaskMeta({});
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load outcomes");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <section className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" /> Outcome review
        <span className="ml-auto text-[10px] normal-case tracking-normal text-muted-foreground">
          Admin only
        </span>
      </h2>

      <p className="text-[11px] text-muted-foreground mb-3">
        Client-marked completions arrive here for review. Only validated outcomes feed industry or
        cross-industry learning.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">
          No client task completions to review yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <OutcomeCard
              key={row.id}
              row={row}
              meta={row.client_task_id ? taskMeta[row.client_task_id] : undefined}
              onChanged={refresh}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function OutcomeCard({
  row,
  meta,
  onChanged,
}: {
  row: AdminOutcomeRow;
  meta?: TaskMeta;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(row.outcome_status === "pending_review");
  const [measured, setMeasured] = useState(row.admin_measured_result ?? "");
  const [impact, setImpact] = useState(row.admin_impact_note ?? "");
  const [sameIndustry, setSameIndustry] = useState(row.contributes_same_industry);
  const [crossIndustry, setCrossIndustry] = useState(row.contributes_cross_industry);
  const [working, setWorking] = useState<OutcomeStatus | null>(null);

  const submit = async (status: OutcomeStatus) => {
    setWorking(status);
    try {
      await reviewOutcome({
        outcome_id: row.id,
        outcome_status: status,
        admin_measured_result: measured,
        admin_impact_note: impact,
        contributes_same_industry: status === "outcome_validated" ? sameIndustry : false,
        contributes_cross_industry:
          status === "outcome_validated" ? sameIndustry && crossIndustry : false,
      });
      toast.success(
        status === "outcome_validated"
          ? "Outcome validated" + (sameIndustry ? " · learning event saved" : "")
          : `Outcome marked ${STATUS_LABEL[status].toLowerCase()}`
      );
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save review");
    } finally {
      setWorking(null);
    }
  };

  return (
    <li className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={`${STATUS_BADGE[row.outcome_status]} text-[10px] px-1.5 py-0`}
        >
          {STATUS_LABEL[row.outcome_status]}
        </Badge>
        {meta?.priority_band ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
            {meta.priority_band}
          </Badge>
        ) : null}
        <div className="text-xs text-foreground truncate">
          {meta?.issue_title ?? "Outcome"}
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          {row.completed_at ? new Date(row.completed_at).toLocaleString() : "—"}
        </span>
      </div>

      {row.client_completion_note ? (
        <div className="text-[11px] text-muted-foreground">
          <span className="text-foreground">Client note:</span> {row.client_completion_note}
        </div>
      ) : null}

      {row.industry_learning_event_id || row.cross_industry_learning_event_id ? (
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {row.industry_learning_event_id ? (
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Brain className="h-3 w-3" /> Same-industry learning saved
            </span>
          ) : null}
          {row.cross_industry_learning_event_id ? (
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Globe2 className="h-3 w-3" /> Cross-industry learning saved
            </span>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[11px] text-muted-foreground hover:text-foreground"
      >
        {open ? "Hide review controls" : "Open review controls"}
      </button>

      {open ? (
        <div className="space-y-2 pt-1">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Measured result (admin only)
            </div>
            <Textarea
              rows={2}
              value={measured}
              onChange={(e) => setMeasured(e.target.value)}
              placeholder="e.g. AR aging dropped from 45 to 28 days."
              className="text-sm"
            />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Revenue / control impact (admin only)
            </div>
            <Textarea
              rows={2}
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="e.g. Recovered ~$8k in collectable AR; owner now sees weekly cash."
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5 rounded-md border border-border bg-muted/20 p-2">
            <label className="flex items-center gap-2 text-xs text-foreground">
              <Checkbox
                checked={sameIndustry}
                onCheckedChange={(v) => setSameIndustry(!!v)}
              />
              Contribute to same-industry learning
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground pl-5">
              <Checkbox
                checked={crossIndustry}
                disabled={!sameIndustry}
                onCheckedChange={(v) => setCrossIndustry(!!v)}
              />
              Also eligible for cross-industry learning (anonymized)
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5 justify-end pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => submit("needs_follow_up")}
              disabled={working !== null}
              className="h-7 px-2 text-[11px] border-border"
            >
              {working === "needs_follow_up" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
              Needs follow-up
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => submit("outcome_rejected")}
              disabled={working !== null}
              className="h-7 px-2 text-[11px] border-border"
            >
              {working === "outcome_rejected" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => submit("outcome_validated")}
              disabled={working !== null}
              className="h-7 px-2 text-[11px]"
            >
              {working === "outcome_validated" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Validate
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
