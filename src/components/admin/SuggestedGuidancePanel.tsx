/* P10.2c — Suggested Guidance review panel.
 *
 * Admin-only surface that runs the Insight Engine for a customer and lets
 * RGS Approve / Edit / Reject each generated STOP / START / SCALE
 * suggestion. Generated suggestions never reach the client until an admin
 * explicitly saves them and toggles "Include in client report" via the
 * existing Strategic Guidance panel.
 *
 * Approve  → inserts into `report_recommendations` (origin auto_suggested
 *            or admin_edited if edited), records client memory, records
 *            global pattern approval.
 * Edit     → opens an inline editor; saving uses origin admin_edited and
 *            records memory + pattern approval from the edited values.
 * Reject   → soft-rejects via `rejectRecommendation`, records pattern
 *            rejection. Future engine runs apply the 30-day cooldown.
 */

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  RefreshCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import {
  runInsightEngine,
  type InsightEngineResult,
  type RecommendationSuggestion,
} from "@/lib/diagnostics/insightEngine";
import {
  CATEGORY_META,
  pillarLabel,
  rejectRecommendation as softRejectRow,
  upsertRecommendation,
  listRecommendationsForCustomer,
  type RecommendationCategory,
  type RecommendationDraft,
  type RecommendationPriority,
  type RecommendationRow,
} from "@/lib/recommendations/recommendations";
import { recordApprovedGuidance } from "@/lib/diagnostics/customerMemory";
import {
  patternKeyFor,
  recordPatternApproval,
  recordPatternRejection,
} from "@/lib/diagnostics/patternIntelligence";
import {
  DEFAULT_LEARNING,
  deriveStatus,
  loadLearningSettings,
  shouldWriteGlobal,
  shouldWriteMemory,
  statusNote,
  type LearningSettings,
} from "@/lib/diagnostics/learningSettings";

interface Props {
  customerId: string;
}

type ReviewState = {
  suggestion: RecommendationSuggestion;
  status: "pending" | "approved" | "rejected" | "duplicate";
  /** When editing, the current draft replacing the suggestion. */
  edit?: {
    title: string;
    explanation: string;
    priority: RecommendationPriority;
    related_pillar: string | null;
  };
  /** True once admin opened the inline editor (changes origin to admin_edited). */
  edited: boolean;
};

const REJECT_REASONS = [
  "Not true for this client",
  "Already resolved",
  "Too generic",
  "Wrong priority",
  "Needs more evidence",
  "Other",
];

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");
}

function findDuplicate(
  s: RecommendationSuggestion,
  existing: RecommendationRow[],
): RecommendationRow | null {
  const norm = normalizeTitle(s.title);
  return (
    existing.find(
      (r) =>
        r.category === s.category &&
        ((r.rule_key && r.rule_key === s.rule_key) ||
          normalizeTitle(r.title) === norm),
    ) ?? null
  );
}

export function SuggestedGuidancePanel({ customerId }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<InsightEngineResult | null>(null);
  const [reviews, setReviews] = useState<ReviewState[]>([]);
  const [existing, setExisting] = useState<RecommendationRow[]>([]);
  const [stage, setStage] = useState<string | null>(null);
  const [learning, setLearning] = useState<LearningSettings>(DEFAULT_LEARNING);

  useEffect(() => {
    if (!customerId) return;
    supabase
      .from("customers")
      .select("stage")
      .eq("id", customerId)
      .maybeSingle()
      .then(({ data }) => setStage((data?.stage as string | null) ?? null));
    loadLearningSettings(customerId)
      .then(setLearning)
      .catch(() => {});
  }, [customerId]);

  const generate = async () => {
    setRunning(true);
    try {
      const [r, existingRows] = await Promise.all([
        runInsightEngine(customerId),
        listRecommendationsForCustomer(customerId),
      ]);
      setResult(r);
      setExisting(existingRows);
      setReviews(
        r.suggestions.map((s) => {
          const dup = findDuplicate(s, existingRows);
          return {
            suggestion: s,
            status: dup ? "duplicate" : "pending",
            edited: false,
          };
        }),
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate suggestions");
    } finally {
      setRunning(false);
    }
  };

  const updateReview = (idx: number, patch: Partial<ReviewState>) => {
    setReviews((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const startEdit = (idx: number) => {
    const r = reviews[idx];
    updateReview(idx, {
      edit: {
        title: r.suggestion.title,
        explanation: r.suggestion.explanation,
        priority: r.suggestion.priority,
        related_pillar: r.suggestion.related_pillar,
      },
      edited: true,
    });
  };

  const cancelEdit = (idx: number) => {
    updateReview(idx, { edit: undefined, edited: false });
  };

  const approve = async (idx: number) => {
    const r = reviews[idx];
    const s = r.suggestion;
    const finalTitle = (r.edit?.title ?? s.title).trim();
    const finalExpl = (r.edit?.explanation ?? s.explanation).trim();
    const finalPriority = r.edit?.priority ?? s.priority;
    const finalPillar = r.edit?.related_pillar ?? s.related_pillar;

    if (!finalTitle) {
      toast.error("Title is required");
      return;
    }

    try {
      const dup = findDuplicate(s, existing);
      if (dup) {
        toast.message("A similar recommendation already exists for this client.");
        updateReview(idx, { status: "duplicate" });
        return;
      }

      const draft: RecommendationDraft = {
        category: s.category,
        title: finalTitle,
        explanation: finalExpl,
        related_pillar: finalPillar,
        priority: finalPriority,
        included_in_report: false,
        origin: r.edited ? "admin_edited" : "auto_suggested",
        rule_key: s.rule_key,
        display_order: 0,
      };
      await upsertRecommendation(customerId, draft, user?.id ?? null);

      // Client-specific memory (only if learning is enabled).
      if (shouldWriteMemory(learning)) {
        await recordApprovedGuidance({
          customerId,
          title: finalTitle,
          summary: finalExpl || null,
          related_pillar: finalPillar,
          actorId: user?.id ?? null,
        });
      }

      // Global pattern approval (anonymized; only if global learning is on).
      if (shouldWriteGlobal(learning)) {
        await recordPatternApproval({
          pattern_key: patternKeyFor({
            rule_key: s.rule_key,
            benchmark_band: result?.stability?.benchmark.key ?? null,
            customer_stage: stage,
          }),
          pattern_type: "recommendation_approval_pattern",
          title: s.title,
          summary: s.generated_reason,
          related_pillar: finalPillar,
          benchmark_band: result?.stability?.benchmark.key ?? null,
          customer_stage: stage,
        });
      }

      updateReview(idx, { status: "approved" });
      // Refresh existing so subsequent dedupe works.
      setExisting(await listRecommendationsForCustomer(customerId));
      toast.success(
        r.edited ? "Edited recommendation saved" : "Suggestion approved",
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Approve failed");
    }
  };

  const reject = async (idx: number, reason: string) => {
    const r = reviews[idx];
    const s = r.suggestion;
    try {
      // Insert a soft-rejected row so the engine cooldown applies even when
      // the suggestion was never approved.
      const { data: inserted, error: insErr } = await supabase
        .from("report_recommendations")
        .insert({
          customer_id: customerId,
          category: s.category,
          title: s.title,
          explanation: s.explanation,
          related_pillar: s.related_pillar,
          priority: s.priority,
          display_order: 0,
          included_in_report: false,
          origin: "auto_suggested",
          rule_key: s.rule_key,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      await softRejectRow(inserted.id, reason, user?.id ?? null);

      // Global rejection only when global learning is enabled. The local
      // 30-day cooldown still applies because we soft-rejected the row above.
      if (shouldWriteGlobal(learning)) {
        await recordPatternRejection({
          pattern_key: patternKeyFor({
            rule_key: s.rule_key,
            benchmark_band: result?.stability?.benchmark.key ?? null,
            customer_stage: stage,
          }),
          pattern_type: "recommendation_rejection_pattern",
          title: s.title,
          summary: reason,
          related_pillar: s.related_pillar,
          benchmark_band: result?.stability?.benchmark.key ?? null,
          customer_stage: stage,
        });
      }

      updateReview(idx, { status: "rejected" });
      toast.success("Suggestion rejected — engine will cool down for 30 days");
    } catch (e: any) {
      toast.error(e?.message ?? "Reject failed");
    }
  };

  const grouped = useMemo(() => {
    const g: Record<RecommendationCategory, { idx: number; r: ReviewState }[]> = {
      stop: [],
      start: [],
      scale: [],
    };
    reviews.forEach((r, idx) => g[r.suggestion.category].push({ idx, r }));
    return g;
  }, [reviews]);

  const pending = reviews.filter((r) => r.status === "pending").length;

  return (
    <section className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Suggested Guidance
          </div>
          <h3 className="text-base font-medium text-foreground mt-0.5 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            RGS Insight Engine
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Suggested by RGS Insight Engine — review before saving. Hidden
            from clients until approved and explicitly included in their
            report.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <Button
            onClick={generate}
            disabled={running}
            className="bg-primary hover:bg-secondary"
          >
            {running ? (
              <RefreshCcw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {result ? "Re-generate" : "Generate suggested guidance"}
          </Button>
        </div>
      </div>

      {open && (
        <>
          {!result && !running && (
            <p className="text-xs text-muted-foreground italic">
              Run the engine to draft STOP / START / SCALE suggestions from this
              client's score, intake, and recent check-ins.
            </p>
          )}

          {result && (
            <>
              <SignalCoverage result={result} />
              {(() => {
                const note = statusNote(deriveStatus(learning));
                const all = note ? [note, ...result.notes] : result.notes;
                if (all.length === 0) return null;
                return (
                <ul className="text-[11px] text-muted-foreground space-y-1 border-l border-border pl-3">
                    {all.map((n, i) => (
                    <li key={i}>• {n}</li>
                  ))}
                </ul>
                );
              })()}

              {reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No suggestions produced from current data.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(["stop", "start", "scale"] as RecommendationCategory[]).map(
                    (cat) => {
                      const meta = CATEGORY_META[cat];
                      const items = grouped[cat];
                      return (
                        <div
                          key={cat}
                          className={`rounded-lg border ${meta.ring} ${meta.bg} p-3 flex flex-col gap-2`}
                        >
                          <div className={`text-[11px] font-medium tracking-[0.18em] ${meta.text}`}>
                            {meta.label}
                          </div>
                          {items.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">
                              No suggestions.
                            </p>
                          ) : (
                            items.map(({ idx, r }) => (
                              <SuggestionCard
                                key={idx}
                                review={r}
                                onApprove={() => approve(idx)}
                                onEdit={() => startEdit(idx)}
                                onCancelEdit={() => cancelEdit(idx)}
                                onReject={(reason) => reject(idx, reason)}
                                onChange={(patch) =>
                                  updateReview(idx, {
                                    edit: { ...r.edit!, ...patch },
                                  })
                                }
                              />
                            ))
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              )}

              <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                {pending} pending • Approved suggestions appear in Strategic
                Guidance below; toggle <em>Visible</em> there to include in
                client reports.
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function SignalCoverage({ result }: { result: InsightEngineResult }) {
  const c = result.signal_coverage;
  const items: { label: string; value: string | number }[] = [
    { label: "Score", value: c.has_stability_score ? "On file" : "Missing" },
    { label: "Check-ins", value: c.weekly_checkins_count },
    { label: "Intake", value: c.diagnostic_answers_count },
    { label: "Reviews", value: c.open_review_requests },
    { label: "Memory", value: c.memory_rows },
    { label: "Patterns", value: c.global_patterns },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <span
          key={i.label}
          className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded px-2 py-0.5"
        >
          {i.label}: <span className="text-foreground">{i.value}</span>
        </span>
      ))}
    </div>
  );
}

interface CardProps {
  review: ReviewState;
  onApprove: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onReject: (reason: string) => void;
  onChange: (
    patch: Partial<NonNullable<ReviewState["edit"]>>,
  ) => void;
}

function SuggestionCard({
  review,
  onApprove,
  onEdit,
  onCancelEdit,
  onReject,
  onChange,
}: CardProps) {
  const s = review.suggestion;
  const editing = !!review.edit;
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState(REJECT_REASONS[0]);

  const statusBadge =
    review.status === "approved" ? (
      <span className="text-[10px] uppercase tracking-wider text-emerald-300 border border-emerald-500/30 rounded px-1.5 py-0.5">
        Approved
      </span>
    ) : review.status === "rejected" ? (
      <span className="text-[10px] uppercase tracking-wider text-rose-300 border border-rose-500/30 rounded px-1.5 py-0.5">
        Rejected
      </span>
    ) : review.status === "duplicate" ? (
      <span className="text-[10px] uppercase tracking-wider text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5">
        Already exists
      </span>
    ) : null;

  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5 space-y-2">
      {editing ? (
        <>
          <Input
            value={review.edit!.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="bg-muted/40 border-border text-sm"
          />
          <Textarea
            value={review.edit!.explanation}
            onChange={(e) => onChange({ explanation: e.target.value })}
            rows={3}
            className="bg-muted/40 border-border text-xs"
          />
          <div className="flex gap-2">
            <Select
              value={review.edit!.priority}
              onValueChange={(v) =>
                onChange({ priority: v as RecommendationPriority })
              }
            >
              <SelectTrigger className="bg-muted/40 border-border h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={onCancelEdit}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm text-foreground leading-snug flex-1">
              {s.title}
            </div>
            {statusBadge}
          </div>
          {s.explanation && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {s.explanation}
            </p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        {pillarLabel(s.related_pillar) && (
          <span className="uppercase tracking-wider text-muted-foreground">
            {pillarLabel(s.related_pillar)}
          </span>
        )}
        <span
          className={`uppercase tracking-wider rounded px-1.5 py-0.5 border ${
            s.priority === "high"
              ? "border-rose-500/30 text-rose-300"
              : s.priority === "medium"
              ? "border-amber-500/30 text-amber-300"
              : "border-border text-muted-foreground"
          }`}
        >
          {s.priority}
        </span>
        <span className="uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
          conf: {s.confidence}
        </span>
        <span className="uppercase tracking-wider text-muted-foreground">
          {s.evidence.length} evidence
        </span>
        {s.memory_boosted && (
          <span className="uppercase tracking-wider text-primary border border-primary/40 rounded px-1.5 py-0.5">
            Memory boosted
          </span>
        )}
        {s.globally_softened && (
          <span className="uppercase tracking-wider text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5">
            Global caution
          </span>
        )}
      </div>

      {s.evidence.length > 0 && (
        <details className="text-[11px] text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">
            Evidence & reasoning
          </summary>
          <p className="mt-1 italic">{s.generated_reason}</p>
          <ul className="mt-1 space-y-0.5">
            {s.evidence.map((e, i) => (
              <li key={i}>
                <span className="text-foreground">{e.label}:</span> {e.detail}
              </li>
            ))}
          </ul>
        </details>
      )}

      {review.status === "pending" && !showReject && (
        <div className="flex items-center gap-1.5 pt-1">
          <Button
            size="sm"
            onClick={onApprove}
            className="h-7 px-2 bg-primary hover:bg-secondary text-xs"
          >
            <ThumbsUp className="h-3 w-3" /> {editing ? "Save" : "Approve"}
          </Button>
          {!editing && (
            <button
              onClick={onEdit}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
          <button
            onClick={() => setShowReject(true)}
            className="ml-auto text-[11px] text-muted-foreground hover:text-rose-300 inline-flex items-center gap-1"
          >
            <ThumbsDown className="h-3 w-3" /> Reject
          </button>
        </div>
      )}

      {showReject && review.status === "pending" && (
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="bg-muted/40 border-border h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REJECT_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              onClick={() => {
                onReject(reason);
                setShowReject(false);
              }}
              className="h-7 px-2 bg-rose-500/80 hover:bg-rose-500 text-xs"
            >
              Confirm reject
            </Button>
            <button
              onClick={() => setShowReject(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
