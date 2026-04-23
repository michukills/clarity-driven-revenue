import {
  CATEGORY_META,
  pillarLabel,
  type RecommendationCategory,
  type RecommendationRow,
} from "@/lib/recommendations/recommendations";
import { Octagon, Play, TrendingUp } from "lucide-react";

interface Item {
  id?: string;
  category: RecommendationCategory;
  title: string;
  explanation?: string | null;
  related_pillar?: string | null;
  priority?: "high" | "medium" | "low";
}

interface Props {
  items: Item[] | RecommendationRow[];
  /** Show priority badge. Default true. */
  showPriority?: boolean;
  /** Show pillar tag. Default true. */
  showPillar?: boolean;
  /** Optional title for the section. */
  title?: string;
  /** Optional eyebrow for the section. */
  eyebrow?: string;
}

const ICON: Record<RecommendationCategory, any> = {
  stop: Octagon,
  start: Play,
  scale: TrendingUp,
};

const ORDER: RecommendationCategory[] = ["stop", "start", "scale"];

/**
 * Client-facing STOP / START / SCALE strategic guidance display.
 * Three columns on wide screens, stacked on mobile. No internal/admin
 * fields are rendered here.
 */
export function StopStartScaleDisplay({
  items,
  showPriority = true,
  showPillar = true,
  title = "What to stop, start, and scale next",
  eyebrow = "Strategic Guidance",
}: Props) {
  const grouped: Record<RecommendationCategory, Item[]> = {
    stop: [],
    start: [],
    scale: [],
  };
  for (const it of items) {
    if (grouped[it.category]) grouped[it.category].push(it);
  }

  const total =
    grouped.stop.length + grouped.start.length + grouped.scale.length;
  if (total === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </div>
        <h2 className="mt-0.5 text-base font-medium text-foreground">{title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ORDER.map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = ICON[cat];
          const list = grouped[cat];
          return (
            <div
              key={cat}
              className={`rounded-lg border ${meta.ring} ${meta.bg} p-4 flex flex-col`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-3.5 w-3.5 ${meta.text}`} />
                <div className={`text-[11px] font-medium tracking-[0.18em] ${meta.text}`}>
                  {meta.label}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mb-3">
                {meta.blurb}
              </p>
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No items in this category yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {list.map((it, idx) => (
                    <li
                      key={it.id ?? idx}
                      className="rounded-md border border-border/60 bg-background/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm text-foreground leading-snug">
                          {it.title}
                        </div>
                        {showPriority && it.priority === "high" && (
                          <span className="text-[9px] uppercase tracking-wider text-rose-300 border border-rose-500/30 rounded px-1.5 py-0.5 flex-shrink-0">
                            High
                          </span>
                        )}
                      </div>
                      {it.explanation && (
                        <p className="mt-1.5 text-xs text-foreground/80 leading-relaxed">
                          {it.explanation}
                        </p>
                      )}
                      {showPillar && pillarLabel(it.related_pillar) && (
                        <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {pillarLabel(it.related_pillar)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}