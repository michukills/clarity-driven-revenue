// P9.0 — Admin dialog to create or edit a customer_impact_ledger entry.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  IMPACT_AREAS,
  IMPACT_AREA_LABEL,
  IMPACT_CONFIDENCES,
  IMPACT_SOURCES,
  IMPACT_SOURCE_LABEL,
  IMPACT_STATUSES,
  IMPACT_STATUS_LABEL,
  IMPACT_TYPES,
  IMPACT_TYPE_LABEL,
  IMPACT_VALUE_UNITS,
  IMPACT_VISIBILITIES,
  IMPACT_VISIBILITY_LABEL,
  type ImpactArea,
  type ImpactConfidence,
  type ImpactDraft,
  type ImpactSourceType,
  type ImpactStatus,
  type ImpactType,
  type ImpactValueUnit,
  type ImpactVisibility,
  saveImpactEntry,
} from "@/lib/impact/ledger";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ImpactDraft | null;
  actorId: string | null;
  onSaved: () => void;
}

const FIELD =
  "w-full bg-muted/20 border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/60";
const LABEL = "text-[11px] uppercase tracking-wider text-muted-foreground";

export function ImpactEntryDialog({ open, onOpenChange, draft, actorId, onSaved }: Props) {
  const [form, setForm] = useState<ImpactDraft | null>(draft);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(draft);
  }, [draft]);

  if (!form) return null;

  const update = <K extends keyof ImpactDraft>(k: K, v: ImpactDraft[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const handleNumber = (key: "baseline_value" | "current_value", raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") return update(key, null);
    const n = Number(trimmed);
    update(key, Number.isFinite(n) ? n : null);
  };

  const submit = async () => {
    if (!form) return;
    setBusy(true);
    const res = await saveImpactEntry(form, actorId);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error || "Could not save impact entry.");
      return;
    }
    toast.success(form.id ? "Impact entry updated." : "Impact entry created.");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground font-light">
            {form.id ? "Edit impact entry" : "New impact entry"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <div className={LABEL}>Title <span className="text-destructive">*</span></div>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="What changed, in one line"
              className={FIELD}
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <div className={LABEL}>Summary <span className="text-destructive">*</span></div>
            <Textarea
              value={form.summary}
              onChange={(e) => update("summary", e.target.value)}
              placeholder="Plain-language description of what RGS identified, installed, reduced, or improved."
              rows={3}
              className={FIELD}
            />
          </div>

          <div className="space-y-1.5">
            <div className={LABEL}>Impact type <span className="text-destructive">*</span></div>
            <select
              value={form.impact_type}
              onChange={(e) => update("impact_type", e.target.value as ImpactType)}
              className={FIELD}
            >
              {IMPACT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {IMPACT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className={LABEL}>Impact area <span className="text-destructive">*</span></div>
            <select
              value={form.impact_area}
              onChange={(e) => update("impact_area", e.target.value as ImpactArea)}
              className={FIELD}
            >
              {IMPACT_AREAS.map((a) => (
                <option key={a} value={a}>
                  {IMPACT_AREA_LABEL[a]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className={LABEL}>Status <span className="text-destructive">*</span></div>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value as ImpactStatus)}
              className={FIELD}
            >
              {IMPACT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {IMPACT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className={LABEL}>Impact date <span className="text-destructive">*</span></div>
            <input
              type="date"
              value={form.impact_date}
              onChange={(e) => update("impact_date", e.target.value)}
              className={FIELD}
            />
          </div>

          <div className="space-y-1.5">
            <div className={LABEL}>Source</div>
            <select
              value={form.source_type}
              onChange={(e) => update("source_type", e.target.value as ImpactSourceType)}
              className={FIELD}
            >
              {IMPACT_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {IMPACT_SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className={LABEL}>Source label</div>
            <Input
              value={form.source_label || ""}
              onChange={(e) => update("source_label", e.target.value)}
              placeholder="Optional reference (e.g. report period, review id)"
              className={FIELD}
            />
          </div>

          <div className="space-y-1.5">
            <div className={LABEL}>Baseline value</div>
            <Input
              type="number"
              value={form.baseline_value ?? ""}
              onChange={(e) => handleNumber("baseline_value", e.target.value)}
              className={FIELD}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-1.5">
            <div className={LABEL}>Current value</div>
            <Input
              type="number"
              value={form.current_value ?? ""}
              onChange={(e) => handleNumber("current_value", e.target.value)}
              className={FIELD}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-1.5">
            <div className={LABEL}>Value unit</div>
            <select
              value={form.value_unit ?? ""}
              onChange={(e) =>
                update("value_unit", (e.target.value || null) as ImpactValueUnit | null)
              }
              className={FIELD}
            >
              <option value="">— None —</option>
              {IMPACT_VALUE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className={LABEL}>Confidence</div>
            <select
              value={form.confidence_level}
              onChange={(e) => update("confidence_level", e.target.value as ImpactConfidence)}
              className={FIELD}
            >
              {IMPACT_CONFIDENCES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <div className={LABEL}>Admin note (never shown to client)</div>
            <Textarea
              value={form.admin_note || ""}
              onChange={(e) => update("admin_note", e.target.value)}
              rows={2}
              className={FIELD}
              placeholder="Internal context, source notes, evidence."
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <div className={LABEL}>
              Client note <span className="text-muted-foreground">(required to share with client)</span>
            </div>
            <Textarea
              value={form.client_note || ""}
              onChange={(e) => update("client_note", e.target.value)}
              rows={2}
              className={FIELD}
              placeholder='Plain-language version the client will see, e.g. "RGS installed a weekly source-of-truth process for revenue and cash review."'
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <div className={LABEL}>Visibility</div>
            <div className="flex flex-wrap gap-2">
              {IMPACT_VISIBILITIES.map((v) => {
                const active = form.visibility === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => update("visibility", v as ImpactVisibility)}
                    className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
                      active
                        ? v === "client_visible"
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                          : "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {IMPACT_VISIBILITY_LABEL[v]}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Client-visible entries appear in the client portal Impact Ledger and add a client-safe
              timeline event. Admin notes and internal source IDs are never shown.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Saving…" : form.id ? "Save changes" : "Create entry"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImpactEntryDialog;