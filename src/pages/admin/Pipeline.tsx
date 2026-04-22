import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import {
  SHARED_STAGES,
  DIAGNOSTIC_STAGES,
  IMPLEMENTATION_STAGES,
  formatDate,
  stageLabel,
  labelOf,
  PAYMENT_STATUS,
} from "@/lib/portal";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Pencil } from "lucide-react";
import { downloadCSV } from "@/lib/exports";

type Customer = {
  id: string;
  full_name: string;
  business_name: string | null;
  service_type: string | null;
  stage: string;
  track: string | null;
  diagnostic_status: string | null;
  implementation_status: string | null;
  payment_status: string | null;
  next_action: string | null;
  last_activity_at: string | null;
  updated_at: string;
  archived_at?: string | null;
  assigned_count?: number;
};

function StatusDot({ tone }: { tone: "ok" | "warn" | "muted" | "primary" }) {
  const cls =
    tone === "ok"
      ? "bg-secondary"
      : tone === "warn"
      ? "bg-amber-400"
      : tone === "primary"
      ? "bg-primary"
      : "bg-muted-foreground/40";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${cls}`} />;
}

function CustomerCard({ c, dragging }: { c: Customer; dragging?: boolean }) {
  const paymentTone =
    c.payment_status === "implementation_paid" || c.payment_status === "diagnostic_paid"
      ? "ok"
      : c.payment_status === "refunded"
      ? "warn"
      : "muted";
  return (
    <div
      className={`bg-card border border-border rounded-lg p-3 ${
        dragging ? "shadow-2xl border-primary/60" : "hover:border-primary/40"
      } transition-colors cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm text-foreground font-medium truncate">
            {c.business_name || c.full_name}
          </div>
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">{c.full_name}</div>
        </div>
        {c.service_type && (
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary flex-shrink-0">
            {c.service_type}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <StatusDot tone={c.diagnostic_status === "complete" || c.diagnostic_status === "delivered" ? "ok" : c.diagnostic_status === "in_progress" ? "primary" : "muted"} />
          DX: {c.diagnostic_status?.replace(/_/g, " ") || "—"}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <StatusDot tone={c.implementation_status === "active" ? "primary" : c.implementation_status === "complete" ? "ok" : c.implementation_status === "waiting_client" ? "warn" : "muted"} />
          IM: {c.implementation_status?.replace(/_/g, " ") || "—"}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <StatusDot tone={paymentTone} />
          {labelOf(PAYMENT_STATUS, c.payment_status)}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <StatusDot tone={c.assigned_count ? "primary" : "muted"} />
          {c.assigned_count || 0} tools
        </div>
      </div>

      {c.next_action && (
        <div className="mt-3 text-[11px] text-foreground/80 line-clamp-2 border-l-2 border-primary/40 pl-2">
          {c.next_action}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground mt-3">
        Last activity: {formatDate(c.last_activity_at || c.updated_at)}
      </div>
    </div>
  );
}

function DraggableCard({ c }: { c: Customer }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <Link to={`/admin/customers/${c.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <CustomerCard c={c} />
      </Link>
    </div>
  );
}

function StageColumn({ stageKey, label, customers, accent }: { stageKey: string; label: string; customers: Customer[]; accent?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageKey });
  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {accent && <span className={`h-1.5 w-1.5 rounded-full ${accent}`} />}
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">{label}</h3>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{customers.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`bg-[hsl(0_0%_10%)] rounded-xl p-2 min-h-[360px] space-y-2 border ${
          isOver ? "border-primary/60" : "border-border"
        } transition-colors`}
      >
        {customers.map((c) => (
          <DraggableCard key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    const [{ data }, { data: assigns }] = await Promise.all([
      supabase
        .from("customers")
        .select(
          "id, full_name, business_name, service_type, stage, track, diagnostic_status, implementation_status, payment_status, next_action, last_activity_at, updated_at, archived_at",
        )
        .order("last_activity_at", { ascending: false }),
      supabase.from("resource_assignments").select("customer_id"),
    ]);
    if (data) {
      const counts: Record<string, number> = {};
      (assigns || []).forEach((a: any) => {
        counts[a.customer_id] = (counts[a.customer_id] || 0) + 1;
      });
      setCustomers(
        (data as any[])
          .filter((c) => !c.archived_at)
          .map((c) => ({ ...c, assigned_count: counts[c.id] || 0 })) as Customer[],
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const newStage = String(over.id);
    const c = customers.find((x) => x.id === String(active.id));
    if (!c || c.stage === newStage) return;

    setCustomers((prev) =>
      prev.map((x) => (x.id === String(active.id) ? { ...x, stage: newStage } : x)),
    );

    const { error } = await supabase
      .from("customers")
      .update({ stage: newStage as any })
      .eq("id", String(active.id));
    if (error) {
      toast.error("Failed to update stage");
      load();
    } else {
      toast.success(`Moved to ${stageLabel(newStage)}`);
      load();
    }
  };

  const active = customers.find((c) => c.id === activeId);

  const inStage = (key: string) => customers.filter((c) => c.stage === key);

  return (
    <PortalShell variant="admin">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pipeline</div>
          <h1 className="mt-2 text-3xl text-foreground">Customer Flow</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Drag customer cards across stages. After "Decision Pending" the pipeline splits into the diagnostic-only track and the implementation add-on track.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-border"
          onClick={() =>
            downloadCSV(
              `pipeline-${new Date().toISOString().slice(0, 10)}`,
              customers.map((c) => ({
                business: c.business_name || c.full_name,
                full_name: c.full_name,
                stage: stageLabel(c.stage),
                track: c.track,
                payment_status: c.payment_status,
                next_action: c.next_action,
                last_activity_at: c.last_activity_at,
              })),
            )
          }
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="space-y-12">
          <TrackBlock
            title="Shared Funnel"
            description="Every client moves through these stages first."
            stages={SHARED_STAGES as any}
            customers={customers}
            inStage={inStage}
            accent="bg-muted-foreground/40"
          />
          <TrackBlock
            title="Diagnostic-Only Track"
            description="Clients who completed the diagnostic but did not add implementation."
            stages={DIAGNOSTIC_STAGES as any}
            customers={customers}
            inStage={inStage}
            accent="bg-secondary"
          />
          <TrackBlock
            title="Implementation Add-On Track"
            description="Active implementation engagements. Moving into ‘Implementation Added’ unlocks the client portal automatically."
            stages={IMPLEMENTATION_STAGES as any}
            customers={customers}
            inStage={inStage}
            accent="bg-primary"
          />
        </div>
        <DragOverlay>{active && <CustomerCard c={active} dragging />}</DragOverlay>
      </DndContext>
    </PortalShell>
  );
}

function TrackBlock({
  title,
  description,
  stages,
  inStage,
  accent,
}: {
  title: string;
  description: string;
  stages: { key: string; label: string }[];
  customers: Customer[];
  inStage: (k: string) => Customer[];
  accent: string;
}) {
  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-4 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${accent}`} />
            <h2 className="text-base text-foreground tracking-wide">{title}</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{description}</p>
        </div>
      </div>
      <div className="overflow-x-auto pb-2 -mx-10 px-10">
        <div className="flex gap-4">
          {stages.map((s) => (
            <StageColumn
              key={s.key}
              stageKey={s.key}
              label={s.label}
              customers={inStage(s.key)}
              accent={accent}
            />
          ))}
        </div>
      </div>
    </section>
  );
}