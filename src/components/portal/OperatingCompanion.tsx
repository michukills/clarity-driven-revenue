import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck2,
  CalendarDays,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Circle,
} from "lucide-react";
import {
  loadCompanionData,
  type CompanionData,
  type CompanionItem,
  type CompanionUrgency,
} from "@/lib/portal/operatingCompanion";

const urgencyStyle = (u: CompanionUrgency) => {
  switch (u) {
    case "overdue":
      return {
        dot: "bg-[hsl(0_70%_55%)]",
        chip: "bg-[hsl(0_70%_55%/0.12)] text-[hsl(0_70%_72%)] border-[hsl(0_70%_55%/0.3)]",
        label: "Overdue",
        Icon: AlertTriangle,
      };
    case "due_soon":
      return {
        dot: "bg-[hsl(38_90%_55%)]",
        chip: "bg-[hsl(38_90%_55%/0.12)] text-[hsl(38_90%_72%)] border-[hsl(38_90%_55%/0.3)]",
        label: "Due soon",
        Icon: Clock,
      };
    case "good":
      return {
        dot: "bg-[hsl(140_50%_55%)]",
        chip: "bg-[hsl(140_50%_55%/0.12)] text-[hsl(140_50%_72%)] border-[hsl(140_50%_55%/0.3)]",
        label: "On track",
        Icon: CheckCircle2,
      };
    default:
      return {
        dot: "bg-muted-foreground/60",
        chip: "bg-muted/40 text-muted-foreground border-border",
        label: "Info",
        Icon: Circle,
      };
  }
};

function ItemRow({ item }: { item: CompanionItem }) {
  const s = urgencyStyle(item.urgency);
  const Icon = s.Icon;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${s.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-foreground">{item.title}</span>
          <span
            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${s.chip}`}
          >
            <Icon className="h-2.5 w-2.5" />
            {s.label}
          </span>
        </div>
        {item.detail && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.detail}</p>
        )}
        {item.actionTo && item.actionLabel && (
          <Link
            to={item.actionTo}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            {item.actionLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

function CompanionCard({
  eyebrow,
  title,
  Icon,
  items,
  emptyText,
}: {
  eyebrow: string;
  title: string;
  Icon: any;
  items: CompanionItem[];
  emptyText: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </span>
      </div>
      <h3 className="text-base text-foreground mb-2">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-1">{emptyText}</p>
      ) : (
        <div className="divide-y divide-border/60 -mx-1">
          {items.map((i) => (
            <div key={i.id} className="px-1">
              <ItemRow item={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OperatingCompanion({ customerId }: { customerId: string }) {
  const [data, setData] = useState<CompanionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCompanionData(customerId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 mt-6">
        <div className="text-xs text-muted-foreground">Loading your operating view…</div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Operating View
          </div>
          <h2 className="text-lg text-foreground">What matters right now</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <CompanionCard
          eyebrow="This Week"
          title="Do this week"
          Icon={CalendarCheck2}
          items={data.thisWeek}
          emptyText="No weekly actions waiting on you."
        />
        <CompanionCard
          eyebrow="This Month"
          title="Review this month"
          Icon={CalendarDays}
          items={data.thisMonth}
          emptyText="You're current on monthly items."
        />
        <CompanionCard
          eyebrow="What Changed"
          title="Recent shifts"
          Icon={Sparkles}
          items={data.whatChanged}
          emptyText="No notable changes recently."
        />
        <CompanionCard
          eyebrow="Attention Needed"
          title="Needs your input"
          Icon={AlertTriangle}
          items={data.attentionNeeded}
          emptyText="Nothing flagged — you're clear."
        />
      </div>
    </section>
  );
}