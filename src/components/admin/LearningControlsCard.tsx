/* P10.2c-Guardrail — Per-client learning controls.
 *
 * Admin-only card placed in Customer Detail → Stability tab next to the
 * Suggested Guidance panel. Lets RGS exclude demo / training / sandbox
 * accounts from learning so unrealistic data does not pollute customer
 * memory or global RGS pattern intelligence.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Brain } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_LEARNING,
  deriveStatus,
  loadLatestLearningAudit,
  loadLearningSettings,
  saveLearningSettings,
  statusLabel,
  statusNote,
  type LearningAuditRow,
  type LearningSettings,
} from "@/lib/diagnostics/learningSettings";

interface Props {
  customerId: string;
  onChange?: (next: LearningSettings) => void;
}

export function LearningControlsCard({ customerId, onChange }: Props) {
  const [settings, setSettings] = useState<LearningSettings>(DEFAULT_LEARNING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [audit, setAudit] = useState<LearningAuditRow | null>(null);
  const [actorLabel, setActorLabel] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      loadLearningSettings(customerId),
      loadLatestLearningAudit(customerId).catch(() => null),
    ])
      .then(([s, a]) => {
        if (!active) return;
        setSettings(s);
        setAudit(a);
        onChange?.(s);
        if (a?.changed_by) {
          supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", a.changed_by)
            .maybeSingle()
            .then(({ data }) => {
              if (!active) return;
              const label =
                (data?.full_name as string | undefined) ||
                (data?.email as string | undefined) ||
                null;
              setActorLabel(label);
            });
        }
      })
      .catch((e) => toast.error(e?.message ?? "Failed to load learning settings"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const update = (patch: Partial<LearningSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      // If global learning is on but learning itself is off, that's
      // contradictory — force global off too.
      const normalized: LearningSettings = {
        ...settings,
        contributes_to_global_learning:
          settings.learning_enabled && settings.contributes_to_global_learning,
      };
      await saveLearningSettings(customerId, normalized);
      setSettings(normalized);
      setDirty(false);
      onChange?.(normalized);
      // Refresh the audit snapshot after save in case a new row was written.
      loadLatestLearningAudit(customerId)
        .then((a) => setAudit(a))
        .catch(() => {});
      toast.success("Learning controls saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const status = deriveStatus(settings);
  const note = statusNote(status);

  const badgeClass =
    status === "active"
      ? "border-emerald-500/30 text-emerald-300"
      : status === "local_only"
      ? "border-amber-500/30 text-amber-300"
      : "border-rose-500/30 text-rose-300";

  return (
    <section className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Learning Controls
          </div>
          <h3 className="text-base font-medium text-foreground mt-0.5 inline-flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Insight engine learning
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Use this for demo, training, or sandbox accounts so unrealistic
            data does not influence RGS pattern intelligence.
          </p>
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider rounded px-2 py-0.5 border ${badgeClass}`}
        >
          {statusLabel(status)}
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground italic">Loading…</p>
      ) : (
        <>
          <div className="space-y-3">
            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div className="space-y-0.5">
                <div className="text-sm text-foreground">
                  Enable learning for this client
                </div>
                <div className="text-[11px] text-muted-foreground">
                  When off, admin feedback is not stored in this client's
                  insight memory and is not shared with global RGS patterns.
                  Soft rejections still create a 30-day cooldown.
                </div>
              </div>
              <Switch
                checked={settings.learning_enabled}
                onCheckedChange={(v) => update({ learning_enabled: v })}
              />
            </label>

            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div className="space-y-0.5">
                <div className="text-sm text-foreground">
                  Allow this client to improve global RGS pattern intelligence
                </div>
                <div className="text-[11px] text-muted-foreground">
                  When off, this client's approvals and rejections do not
                  affect cross-client pattern intelligence.
                </div>
              </div>
              <Switch
                checked={
                  settings.learning_enabled &&
                  settings.contributes_to_global_learning
                }
                disabled={!settings.learning_enabled}
                onCheckedChange={(v) =>
                  update({ contributes_to_global_learning: v })
                }
              />
            </label>

            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Reason for exclusion
              </label>
              <Textarea
                value={settings.learning_exclusion_reason ?? ""}
                onChange={(e) =>
                  update({ learning_exclusion_reason: e.target.value })
                }
                placeholder="e.g. Demo/training account, sandbox, internal testing"
                rows={2}
                className="bg-muted/40 border-border text-xs"
              />
            </div>
          </div>

          {note && (
            <p className="text-[11px] text-muted-foreground border-l border-border pl-3 italic">
              {note}
            </p>
          )}

          {audit && (
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
              Last changed{" "}
              {new Date(audit.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {audit.changed_by ? ` by ${actorLabel ?? "admin"}` : ""}
            </p>
          )}

          <div className="flex justify-end pt-1 border-t border-border/50">
            <Button
              size="sm"
              onClick={save}
              disabled={!dirty || saving}
              className="bg-primary hover:bg-secondary"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}