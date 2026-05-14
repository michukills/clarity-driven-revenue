import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  IMPACT_SCORES,
  EFFORT_SCORES,
  PRIORITY_LANES,
  computePriorityLane,
  REPAIR_PRIORITY_MATRIX_SCOPE_BOUNDARY,
  type ImpactScore,
  type EffortScore,
  type PriorityLane,
} from "@/config/repairPriorityMatrix";
import {
  STABILITY_QUICK_START_TEMPLATES,
  type QuickStartTemplateKey,
} from "@/config/stabilityQuickStartTemplates";
import {
  adminListRepairPriority,
  adminUpsertRepairPriority,
  adminListQuickStartAssignments,
  adminAssignQuickStartTemplate,
  adminRemoveQuickStartAssignment,
  type AdminRepairPriorityMetadata,
  type AdminQuickStartAssignment,
} from "@/lib/repairPriority";
import {
  adminListRoadmaps,
  adminListRoadmapItems,
  type AdminRoadmap,
  type AdminRoadmapItem,
} from "@/lib/implementationRoadmap";
import { SwotSignalConsumerPanel } from "@/components/admin/SwotSignalConsumerPanel";

interface Props {
  customerId: string;
}

export function RepairPriorityMatrixPanel({ customerId }: Props) {
  const [roadmaps, setRoadmaps] = useState<AdminRoadmap[]>([]);
  const [items, setItems] = useState<AdminRoadmapItem[]>([]);
  const [priority, setPriority] = useState<AdminRepairPriorityMetadata[]>([]);
  const [assignments, setAssignments] = useState<AdminQuickStartAssignment[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (!customerId) return;
    const rs = await adminListRoadmaps(customerId);
    setRoadmaps(rs);
    const allItems: AdminRoadmapItem[] = [];
    for (const r of rs) {
      try {
        const its = await adminListRoadmapItems(r.id);
        allItems.push(...its.filter((i) => !i.archived_at));
      } catch {
        // ignore
      }
    }
    setItems(allItems);
    setPriority(await adminListRepairPriority(customerId));
    setAssignments(await adminListQuickStartAssignments(customerId));
  };

  useEffect(() => {
    reload().catch((e: any) => toast.error(e?.message ?? "Failed to load priority data"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const priorityByItem = useMemo(() => {
    const m = new Map<string, AdminRepairPriorityMetadata>();
    for (const p of priority) m.set(p.repair_map_item_id, p);
    return m;
  }, [priority]);

  const assignmentsByItem = useMemo(() => {
    const m = new Map<string, AdminQuickStartAssignment[]>();
    for (const a of assignments) {
      const arr = m.get(a.repair_map_item_id) ?? [];
      arr.push(a);
      m.set(a.repair_map_item_id, arr);
    }
    return m;
  }, [assignments]);

  if (!customerId) return null;

  if (roadmaps.length === 0) {
    return (
      <div className="space-y-4">
        <SwotSignalConsumerPanel customerId={customerId} surface="repair_map" />
        <section className="bg-card border border-border rounded-xl p-5 space-y-2">
          <header>
            <h2 className="text-foreground">RGS Repair Priority Matrix™</h2>
            <p className="text-xs text-muted-foreground">
              Create a Repair Map (Implementation Roadmap) before assigning impact, effort, or
              Stability Quick-Start™ templates.
            </p>
          </header>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SwotSignalConsumerPanel customerId={customerId} surface="repair_map" />
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <header className="space-y-1">
          <h2 className="text-foreground">RGS Repair Priority Matrix™</h2>
          <p className="text-xs text-muted-foreground">
            {REPAIR_PRIORITY_MATRIX_SCOPE_BOUNDARY}
          </p>
        </header>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Repair Map items yet.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                customerId={customerId}
                item={item}
                meta={priorityByItem.get(item.id) ?? null}
                assignments={assignmentsByItem.get(item.id) ?? []}
                busy={busy}
                onChange={async () => {
                  setBusy(true);
                  try {
                    await reload();
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface ItemRowProps {
  customerId: string;
  item: AdminRoadmapItem;
  meta: AdminRepairPriorityMetadata | null;
  assignments: AdminQuickStartAssignment[];
  busy: boolean;
  onChange: () => Promise<void>;
}

function ItemRow({ customerId, item, meta, assignments, busy, onChange }: ItemRowProps) {
  const [impact, setImpact] = useState<ImpactScore>((meta?.impact_score ?? 3) as ImpactScore);
  const [effort, setEffort] = useState<EffortScore>((meta?.effort_score ?? 3) as EffortScore);
  const [recommendedWeek, setRecommendedWeek] = useState<string>(
    meta?.recommended_week != null ? String(meta.recommended_week) : "",
  );
  const [quickStartEligible, setQuickStartEligible] = useState<boolean>(
    !!meta?.quick_start_eligible,
  );
  const [ownerCapacity, setOwnerCapacity] = useState<string>(meta?.owner_capacity_note ?? "");
  const [dependency, setDependency] = useState<string>(meta?.dependency_note ?? "");
  const [adminNote, setAdminNote] = useState<string>(meta?.admin_priority_note ?? "");
  const [clientSafeExp, setClientSafeExp] = useState<string>(
    meta?.client_safe_priority_explanation ?? "",
  );
  const [overrideLane, setOverrideLane] = useState<PriorityLane | "">(
    meta?.lane_overridden ? meta.priority_lane : "",
  );
  const [overrideNote, setOverrideNote] = useState<string>(meta?.override_note ?? "");
  const [pickerKey, setPickerKey] = useState<QuickStartTemplateKey | "">("");
  const [recommendWeekOne, setRecommendWeekOne] = useState<boolean>(false);

  const computed = computePriorityLane(impact, effort);
  const effectiveLane = (overrideLane || computed) as PriorityLane;

  const save = async () => {
    try {
      await adminUpsertRepairPriority({
        customer_id: customerId,
        repair_map_item_id: item.id,
        impact_score: impact,
        effort_score: effort,
        recommended_week: recommendedWeek ? Number(recommendedWeek) : null,
        quick_start_eligible: quickStartEligible,
        owner_capacity_note: ownerCapacity || null,
        dependency_note: dependency || null,
        admin_priority_note: adminNote || null,
        client_safe_priority_explanation: clientSafeExp || null,
        override_lane: overrideLane || null,
        override_note: overrideLane ? overrideNote : null,
      });
      toast.success("Priority saved");
      await onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    }
  };

  const attach = async () => {
    if (!pickerKey) return;
    try {
      await adminAssignQuickStartTemplate({
        customer_id: customerId,
        repair_map_item_id: item.id,
        template_key: pickerKey,
        recommend_week_one: recommendWeekOne,
        client_visible: true,
      });
      setPickerKey("");
      setRecommendWeekOne(false);
      toast.success("Quick-Start template attached");
      await onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to attach template");
    }
  };

  const remove = async (id: string) => {
    try {
      await adminRemoveQuickStartAssignment(id);
      await onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove");
    }
  };

  const lane = PRIORITY_LANES[effectiveLane];

  return (
    <div className="border border-border rounded-md p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-foreground text-sm">{item.title}</div>
          {item.gear ? (
            <div className="text-[11px] text-muted-foreground capitalize">{item.gear.replace(/_/g, " ")}</div>
          ) : null}
        </div>
        <Badge variant="outline">{lane.label}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="text-xs text-muted-foreground space-y-1">
          Impact
          <select
            value={impact}
            onChange={(e) => setImpact(Number(e.target.value) as ImpactScore)}
            className="block w-full bg-background border border-border rounded-md px-2 text-sm h-9"
          >
            {IMPACT_SCORES.map((s) => (
              <option key={s.score} value={s.score}>
                {s.score} — {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground space-y-1">
          Effort
          <select
            value={effort}
            onChange={(e) => setEffort(Number(e.target.value) as EffortScore)}
            className="block w-full bg-background border border-border rounded-md px-2 text-sm h-9"
          >
            {EFFORT_SCORES.map((s) => (
              <option key={s.score} value={s.score}>
                {s.score} — {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground space-y-1">
          Recommended week
          <Input
            type="number"
            min={1}
            max={52}
            value={recommendedWeek}
            onChange={(e) => setRecommendedWeek(e.target.value)}
            placeholder={lane.recommended_week ? String(lane.recommended_week) : ""}
          />
        </label>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Computed lane: <span className="text-foreground">{PRIORITY_LANES[computed].label}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground space-y-1">
          Override lane (requires note)
          <select
            value={overrideLane}
            onChange={(e) => setOverrideLane((e.target.value || "") as PriorityLane | "")}
            className="block w-full bg-background border border-border rounded-md px-2 text-sm h-9"
          >
            <option value="">— no override —</option>
            {Object.values(PRIORITY_LANES).map((l) => (
              <option key={l.lane} value={l.lane}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground space-y-1">
          Override note
          <Input
            disabled={!overrideLane}
            value={overrideNote}
            onChange={(e) => setOverrideNote(e.target.value)}
            placeholder="Required when overriding"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={quickStartEligible}
          onChange={(e) => setQuickStartEligible(e.target.checked)}
        />
        Eligible for RGS Stability Quick-Start™
      </label>

      <Textarea
        placeholder="Owner capacity note (admin-only)"
        value={ownerCapacity}
        onChange={(e) => setOwnerCapacity(e.target.value)}
      />
      <Textarea
        placeholder="Dependency note (admin-only)"
        value={dependency}
        onChange={(e) => setDependency(e.target.value)}
      />
      <Textarea
        placeholder="Admin priority note (never shown to client)"
        value={adminNote}
        onChange={(e) => setAdminNote(e.target.value)}
      />
      <Textarea
        placeholder="Client-safe priority explanation"
        value={clientSafeExp}
        onChange={(e) => setClientSafeExp(e.target.value)}
      />

      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={busy}>
          Save priority
        </Button>
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <div className="text-xs text-muted-foreground">RGS Stability Quick-Start™ templates</div>
        {assignments.length === 0 ? (
          <div className="text-xs text-muted-foreground">No templates attached.</div>
        ) : (
          <ul className="space-y-1">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground">
                  {STABILITY_QUICK_START_TEMPLATES.find((t) => t.template_key === a.template_key)?.title ?? a.template_key}
                  {a.recommend_week_one ? <Badge variant="outline" className="ml-2">Week 1</Badge> : null}
                </span>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={pickerKey}
            onChange={(e) => setPickerKey(e.target.value as QuickStartTemplateKey | "")}
            className="bg-background border border-border rounded-md px-2 text-sm h-9"
          >
            <option value="">— attach template —</option>
            {STABILITY_QUICK_START_TEMPLATES.map((t) => (
              <option key={t.template_key} value={t.template_key}>
                {t.title}
              </option>
            ))}
          </select>
          <label className="text-xs text-muted-foreground flex items-center gap-2">
            <input
              type="checkbox"
              checked={recommendWeekOne}
              onChange={(e) => setRecommendWeekOne(e.target.checked)}
            />
            Recommend in week one
          </label>
          <Button size="sm" variant="outline" onClick={attach} disabled={!pickerKey}>
            Attach
          </Button>
        </div>
      </div>
    </div>
  );
}
