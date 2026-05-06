import { Link } from "react-router-dom";
import { ArrowRight, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PriorityActionCard } from "@/lib/welcomeGreeting";

/**
 * P86B — Tap-friendly priority action cards. Honest disabled states.
 * No fake links: a card without a real internal route renders disabled
 * with the supplied reason.
 */
export function PriorityActionCardGrid({
  cards,
  emptyMessage = "Nothing needs your attention right now.",
}: {
  cards: ReadonlyArray<PriorityActionCard>;
  emptyMessage?: string;
}) {
  if (cards.length === 0) {
    return (
      <div className="bg-card border border-dashed border-border rounded-xl p-6 text-sm text-muted-foreground text-center">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((c) => {
        const disabled = c.status === "disabled" || !c.href;
        const tone =
          c.status === "attention"
            ? "border-[hsl(38_90%_55%/0.4)] bg-[hsl(38_90%_55%/0.06)]"
            : c.status === "ready"
            ? "border-primary/40"
            : "border-border";
        const Icon =
          c.status === "attention"
            ? AlertTriangle
            : c.status === "ready"
            ? ArrowRight
            : c.status === "disabled"
            ? Lock
            : CheckCircle2;

        const inner = (
          <div
            className={`bg-card border ${tone} rounded-xl p-5 h-full flex flex-col gap-2 transition ${
              disabled
                ? "opacity-70 cursor-not-allowed"
                : "hover:border-primary active:scale-[0.99]"
            }`}
          >
            <div className="flex items-center gap-2 text-foreground">
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-sm">{c.title}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{c.body}</p>
            {disabled && c.disabledReason && (
              <p className="text-[11px] text-muted-foreground/80 italic mt-auto">
                {c.disabledReason}
              </p>
            )}
          </div>
        );

        if (disabled || !c.href) {
          return (
            <div key={c.key} aria-disabled="true">
              {inner}
            </div>
          );
        }
        return (
          <Link key={c.key} to={c.href} className="min-w-0">
            {inner}
          </Link>
        );
      })}
    </div>
  );
}