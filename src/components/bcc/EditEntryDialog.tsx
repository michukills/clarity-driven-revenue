/**
 * P12.3.R — Generic edit dialog for BCC entry rows.
 *
 * Reuses the per-target field schema from `entryActions.ts`. Renders
 * a date / number / text / textarea / enum input per field, prefilled
 * with the row's current values. On save, writes through `updateEntry`
 * and surfaces validation/DB errors inline. If the row was imported,
 * a provenance banner explains where it came from so users edit
 * imported data with their eyes open.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  ENTRY_TARGETS,
  type EntryKind,
  coerceFieldValue,
  detectProvenance,
  updateEntry,
} from "@/lib/bcc/entryActions";

interface Props {
  kind: EntryKind;
  row: Record<string, unknown> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditEntryDialog({ kind, row, open, onOpenChange, onSaved }: Props) {
  const target = ENTRY_TARGETS[kind];
  const visibleFields = useMemo(
    () => target.fields.filter((f) => !f.hidden),
    [target],
  );
  const provenance = useMemo(
    () => (row ? detectProvenance(row) : { imported: false }),
    [row],
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Reset form when row changes / dialog reopens
  useEffect(() => {
    if (!row) {
      setValues({});
      return;
    }
    const next: Record<string, string> = {};
    for (const f of visibleFields) {
      const raw = row[f.key];
      next[f.key] = raw === null || raw === undefined ? "" : String(raw);
    }
    setValues(next);
    setErrors([]);
  }, [row, visibleFields, open]);

  if (!row) return null;
  const id = String(row.id ?? "");

  const handleSave = async () => {
    const patch: Record<string, string | number | null> = {};
    const newErrors: string[] = [];
    for (const f of visibleFields) {
      const r = coerceFieldValue(f, values[f.key] ?? "");
      if (r.ok === false) {
        newErrors.push(r.error);
      } else {
        patch[f.key] = r.value;
      }
    }
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    setBusy(true);
    const res = await updateEntry(target, id, patch);
    setBusy(false);
    if (!res.ok) {
      setErrors([res.error || "Update failed"]);
      return;
    }
    toast.success(`${target.singular[0].toUpperCase() + target.singular.slice(1)} updated`);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {target.singular}</DialogTitle>
          <DialogDescription>
            Update the fields below. Totals and summaries refresh as soon as you save.
          </DialogDescription>
        </DialogHeader>

        {provenance.imported && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>{provenance.label}</AlertTitle>
            <AlertDescription>
              This row originated from a {provenance.source?.toUpperCase()} import.
              Edits are tracked in the row's notes for traceability — the original
              import batch reference is preserved.
            </AlertDescription>
          </Alert>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleFields.map((f) => {
            const v = values[f.key] ?? "";
            const onChange = (next: string) => setValues((prev) => ({ ...prev, [f.key]: next }));
            const labelEl = (
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </span>
            );
            const wide = f.kind === "textarea";
            return (
              <label
                key={f.key}
                className={"space-y-1 block " + (wide ? "sm:col-span-2" : "")}
              >
                {labelEl}
                {f.kind === "textarea" ? (
                  <Textarea
                    rows={2}
                    value={v}
                    onChange={(e) => onChange(e.target.value)}
                  />
                ) : f.kind === "enum" ? (
                  <select
                    className="w-full bg-background border border-input rounded-md h-9 text-sm px-3"
                    value={v}
                    onChange={(e) => onChange(e.target.value)}
                  >
                    <option value="">—</option>
                    {f.enumValues?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    className="h-9 text-sm"
                    type={
                      f.kind === "date" ? "date" : f.kind === "number" ? "number" : "text"
                    }
                    inputMode={f.kind === "number" ? "decimal" : undefined}
                    value={v}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
                {f.helper && (
                  <span className="text-[10px] text-muted-foreground">{f.helper}</span>
                )}
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
