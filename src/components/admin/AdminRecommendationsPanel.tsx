import { useEffect, useState } from "react";
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
import {
  CATEGORY_META,
  RECOMMENDATION_PILLARS,
  deleteRecommendation,
  emptyRecommendationDraft,
  listRecommendationsForCustomer,
  pillarLabel,
  reorderRecommendation,
  setIncludedInReport,
  upsertRecommendation,
  type RecommendationCategory,
  type RecommendationDraft,
  type RecommendationPriority,
  type RecommendationRow,
} from "@/lib/recommendations/recommendations";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  customerId: string;
}

const ORDER: RecommendationCategory[] = ["stop", "start", "scale"];

export function AdminRecommendationsPanel({ customerId }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<RecommendationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<RecommendationDraft | null>(null);

  const refresh = async () => {
    try {
      const data = await listRecommendationsForCustomer(customerId);
      setRows(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const grouped: Record<RecommendationCategory, RecommendationRow[]> = {
    stop: [],
    start: [],
    scale: [],
  };
  for (const r of rows) grouped[r.category].push(r);

  const startNew = (cat: RecommendationCategory) => {
    const existing = grouped[cat];
    setDraft({
      ...emptyRecommendationDraft(cat),
      display_order: existing.length,
    });
  };

  const startEdit = (row: RecommendationRow) => {
    setDraft({
      id: row.id,
      category: row.category,
      title: row.title,
      explanation: row.explanation ?? "",
      related_pillar: row.related_pillar,
      priority: row.priority,
      display_order: row.display_order,
      included_in_report: row.included_in_report,
    });
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      await upsertRecommendation(customerId, draft, user?.id ?? null);
      toast.success(draft.id ? "Recommendation updated" : "Recommendation added");
      setDraft(null);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this recommendation?")) return;
    try {
      await deleteRecommendation(id);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleInclude = async (row: RecommendationRow) => {
    try {
      await setIncludedInReport(row.id, !row.included_in_report);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const move = async (row: RecommendationRow, dir: -1 | 1) => {
    const peers = grouped[row.category];
    const idx = peers.findIndex((p) => p.id === row.id);
    const swap = peers[idx + dir];
    if (!swap) return;
    try {
      await reorderRecommendation(row.id, swap.display_order);
      await reorderRecommendation(swap.id, row.display_order);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl p-5 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Strategic Guidance
          </div>
          <h3 className="text-base font-medium text-foreground mt-0.5">
            STOP / START / SCALE
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Decide what the client should stop, start, or scale next. Only items
            marked <em>Include in client report</em> will appear in their portal.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ORDER.map((cat) => {
            const meta = CATEGORY_META[cat];
            const list = grouped[cat];
            return (
              <div
                key={cat}
                className={`rounded-lg border ${meta.ring} ${meta.bg} p-3 flex flex-col`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-[11px] font-medium tracking-[0.18em] ${meta.text}`}>
                    {meta.label}
                  </div>
                  <button
                    onClick={() => startNew(cat)}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {list.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No items yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((row, idx) => (
                      <li
                        key={row.id}
                        className="rounded-md border border-border/60 bg-background/40 p-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm text-foreground leading-snug flex-1">
                            {row.title}
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => move(row, -1)}
                              disabled={idx === 0}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              aria-label="Move up"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => move(row, 1)}
                              disabled={idx === list.length - 1}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                              aria-label="Move down"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        {row.explanation && (
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {row.explanation}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px]">
                          {pillarLabel(row.related_pillar) && (
                            <span className="uppercase tracking-wider text-muted-foreground">
                              {pillarLabel(row.related_pillar)}
                            </span>
                          )}
                          {row.priority === "high" && (
                            <span className="uppercase tracking-wider text-rose-300 border border-rose-500/30 rounded px-1.5 py-0.5">
                              High
                            </span>
                          )}
                          <span className="ml-auto inline-flex items-center gap-1.5">
                            <button
                              onClick={() => toggleInclude(row)}
                              className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 border ${
                                row.included_in_report
                                  ? "border-primary/40 text-primary"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {row.included_in_report ? (
                                <>
                                  <Eye className="h-3 w-3" /> Visible
                                </>
                              ) : (
                                <>
                                  <EyeOff className="h-3 w-3" /> Hidden
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => startEdit(row)}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              aria-label="Edit"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => remove(row.id)}
                              className="p-1 text-muted-foreground hover:text-rose-300"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {draft && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-primary">
              {draft.id ? "Edit recommendation" : "New recommendation"}
            </div>
            <button
              onClick={() => setDraft(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Category
              </label>
              <Select
                value={draft.category}
                onValueChange={(v) =>
                  setDraft({ ...draft, category: v as RecommendationCategory })
                }
              >
                <SelectTrigger className="mt-1 bg-muted/40 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Pillar
              </label>
              <Select
                value={draft.related_pillar ?? "none"}
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    related_pillar: v === "none" ? null : v,
                  })
                }
              >
                <SelectTrigger className="mt-1 bg-muted/40 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {RECOMMENDATION_PILLARS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Priority
              </label>
              <Select
                value={draft.priority ?? "medium"}
                onValueChange={(v) =>
                  setDraft({ ...draft, priority: v as RecommendationPriority })
                }
              >
                <SelectTrigger className="mt-1 bg-muted/40 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Title
            </label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder={
                draft.category === "stop"
                  ? "e.g. Routing routine approvals through the owner"
                  : draft.category === "start"
                  ? "e.g. Track weekly revenue and cash inputs"
                  : "e.g. Strengthen the best-performing lead source"
              }
              className="mt-1 bg-muted/40 border-border"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Explanation (client-facing)
            </label>
            <Textarea
              value={draft.explanation ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, explanation: e.target.value })
              }
              rows={3}
              className="mt-1 bg-muted/40 border-border"
              placeholder="Plain-language guidance the client will read."
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={draft.included_in_report ?? false}
              onChange={(e) =>
                setDraft({ ...draft, included_in_report: e.target.checked })
              }
              className="accent-primary"
            />
            Include in client-facing report
          </label>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              className="border-border"
              onClick={() => setDraft(null)}
            >
              Cancel
            </Button>
            <Button onClick={save} className="bg-primary hover:bg-secondary">
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}