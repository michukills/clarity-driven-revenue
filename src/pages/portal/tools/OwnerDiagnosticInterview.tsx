import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Save, Lock, Sparkles, AlertCircle } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { ClientToolGuard } from "@/components/portal/ClientToolGuard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { useToolUsageSession } from "@/lib/usage/toolUsageSession";
import {
  OWNER_INTERVIEW_GROUPS,
  OWNER_INTERVIEW_SECTIONS,
  ownerInterviewProgress,
  markOwnerInterviewComplete,
} from "@/lib/diagnostics/ownerInterview";
import { saveIntakeAnswer, loadIntakeAnswers } from "@/lib/diagnostics/intake";
import { toast } from "sonner";

function OwnerDiagnosticInterviewInner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customerId } = usePortalCustomerId();
  useToolUsageSession({ toolKey: "owner_diagnostic_interview", toolTitle: "Owner Diagnostic Interview" });

  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    let alive = true;
    (async () => {
      const rows = await loadIntakeAnswers(customerId).catch(() => []);
      if (!alive) return;
      const m = new Map<string, string>();
      const d: Record<string, string> = {};
      rows.forEach((r) => { m.set(r.section_key, r.answer || ""); d[r.section_key] = r.answer || ""; });
      setAnswers(m);
      setDrafts(d);
      const { data: c } = await supabase
        .from("customers")
        .select("owner_interview_completed_at")
        .eq("id", customerId)
        .maybeSingle();
      setCompletedAt((c as any)?.owner_interview_completed_at ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [customerId]);

  const progress = useMemo(() => ownerInterviewProgress(answers), [answers]);
  const canComplete = progress.requiredFilled === progress.requiredTotal && !completedAt;

  const onSave = async (key: string) => {
    if (!customerId) return;
    const value = (drafts[key] || "").trim();
    setSavingKey(key);
    try {
      await saveIntakeAnswer({ customerId, sectionKey: key, answer: value, submittedBy: user?.id ?? null });
      const next = new Map(answers);
      next.set(key, value);
      setAnswers(next);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSavingKey(null);
    }
  };

  const onComplete = async () => {
    if (!customerId) return;
    setCompleting(true);
    try {
      await markOwnerInterviewComplete(customerId);
      setCompletedAt(new Date().toISOString());
      toast.success("Owner Diagnostic Interview complete. Diagnostic tools unlocked.");
      navigate("/portal/tools");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not mark complete");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <PortalShell variant="customer">
      <div className="mb-6">
        <button onClick={() => navigate("/portal/tools")} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to My Tools
        </button>
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Diagnostic — Step 1</div>
        <h1 className="mt-1 text-3xl text-foreground">Owner Diagnostic Interview</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          This is the first diagnostic step for every paid engagement. It captures how the business actually
          runs from the owner's seat — before deeper diagnostic tools unlock. You do not need perfect answers.
          If something is unclear, write "I don't know." That itself is part of the diagnosis.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-8 flex items-center gap-5">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{progress.requiredFilled} of {progress.requiredTotal} required answered</span>
            <span>{progress.filled} / {progress.total} sections total</span>
          </div>
          <Progress value={progress.pct} />
        </div>
        {completedAt ? (
          <div className="inline-flex items-center gap-2 text-xs text-primary">
            <CheckCircle2 className="h-4 w-4" /> Completed
          </div>
        ) : (
          <Button onClick={onComplete} disabled={!canComplete || completing} className="bg-primary hover:bg-secondary">
            <Sparkles className="h-4 w-4 mr-1" />
            {completing ? "Finalizing…" : "Mark complete & unlock diagnostic tools"}
          </Button>
        )}
      </div>

      {!canComplete && !completedAt && progress.missingRequired.length > 0 && (
        <div className="mb-6 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            Still needed: {progress.missingRequired.map((s) => s.label).join(", ")}.
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-10">
          {OWNER_INTERVIEW_GROUPS.map((g) => {
            const items = OWNER_INTERVIEW_SECTIONS.filter((s) => s.group === g.key);
            return (
              <section key={g.key}>
                <div className="border-b border-border pb-3 mb-4">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-primary">{g.title}</div>
                  <p className="text-sm text-muted-foreground mt-1">{g.intro}</p>
                </div>
                <div className="space-y-5">
                  {items.map((s) => {
                    const val = drafts[s.key] ?? "";
                    const saved = answers.get(s.key) ?? "";
                    const dirty = val.trim() !== saved.trim();
                    return (
                      <div key={s.key} className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <div className="text-sm text-foreground font-medium">
                              {s.label}
                              {s.required && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">required</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{s.prompt}</p>
                            {s.helper && <p className="text-[11px] text-muted-foreground/80 mt-1 italic">{s.helper}</p>}
                          </div>
                          {saved.trim().length > 0 && !dirty && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                        {s.suggestions && s.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {s.suggestions.map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => setDrafts((d) => ({ ...d, [s.key]: sug }))}
                                className="text-[11px] px-2 py-1 rounded-md border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                              >{sug}</button>
                            ))}
                          </div>
                        )}
                        <Textarea
                          value={val}
                          onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                          placeholder={s.placeholder}
                          disabled={!!completedAt}
                          className="min-h-[80px] bg-muted/30 border-border"
                        />
                        <div className="mt-2 flex items-center justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!dirty || savingKey === s.key || !!completedAt}
                            onClick={() => onSave(s.key)}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            {savingKey === s.key ? "Saving…" : dirty ? "Save" : "Saved"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {completedAt && (
        <div className="mt-10 bg-card border border-border rounded-xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="text-sm text-foreground">Owner Diagnostic Interview is complete.</div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                Based on your answers, we have arranged the next diagnostic tools in the order most likely to
                clarify where pressure is building first. You can follow the recommended path or open any
                unlocked diagnostic tool from My Tools.
              </p>
              <Button onClick={() => navigate("/portal/tools")} className="mt-4 bg-primary hover:bg-secondary">
                See your recommended diagnostic order
              </Button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

export default function OwnerDiagnosticInterviewPage() {
  return (
    <ClientToolGuard toolKey="owner_diagnostic_interview">
      <OwnerDiagnosticInterviewInner />
    </ClientToolGuard>
  );
}