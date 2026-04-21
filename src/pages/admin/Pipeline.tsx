import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, formatDate } from "@/lib/portal";
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

type Customer = {
  id: string;
  full_name: string;
  business_name: string | null;
  service_type: string | null;
  stage: string;
  updated_at: string;
};

function CustomerCard({ c, dragging }: { c: Customer; dragging?: boolean }) {
  return (
    <div
      className={`bg-card border border-border rounded-lg p-3 ${
        dragging ? "shadow-2xl border-primary/50" : "hover:border-primary/40"
      } transition-colors cursor-grab active:cursor-grabbing`}
    >
      <div className="text-sm text-foreground font-medium truncate">{c.full_name}</div>
      <div className="text-xs text-muted-foreground truncate mt-0.5">
        {c.business_name || "—"}
      </div>
      {c.service_type && (
        <div className="mt-2 inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
          {c.service_type}
        </div>
      )}
      <div className="text-[10px] text-muted-foreground mt-2">{formatDate(c.updated_at)}</div>
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

function StageColumn({ stageKey, label, customers }: { stageKey: string; label: string; customers: Customer[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageKey });
  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">{label}</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{customers.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`bg-[hsl(0_0%_10%)] rounded-xl p-2 min-h-[400px] space-y-2 border ${
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
    const { data } = await supabase
      .from("customers")
      .select("id, full_name, business_name, service_type, stage, updated_at")
      .order("updated_at", { ascending: false });
    if (data) setCustomers(data as Customer[]);
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
      toast.success(`Moved to ${STAGES.find((s) => s.key === newStage)?.label}`);
    }
  };

  const active = customers.find((c) => c.id === activeId);

  return (
    <PortalShell variant="admin">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pipeline</div>
        <h1 className="mt-2 text-3xl text-foreground">Customer Flow</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Drag customer cards across stages to update their position.
        </p>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="overflow-x-auto pb-6 -mx-10 px-10">
          <div className="flex gap-4">
            {STAGES.map((s) => (
              <StageColumn
                key={s.key}
                stageKey={s.key}
                label={s.label}
                customers={customers.filter((c) => c.stage === s.key)}
              />
            ))}
          </div>
        </div>
        <DragOverlay>{active && <CustomerCard c={active} dragging />}</DragOverlay>
      </DndContext>
    </PortalShell>
  );
}