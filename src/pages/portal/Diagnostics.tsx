import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection } from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { stageLabel } from "@/lib/portal";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Save, Upload as UploadIcon, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import {
  INTAKE_SECTIONS,
  buildIntakeProgress,
  loadIntakeAnswers,
  saveIntakeAnswer,
  type IntakeAnswerRow,
} from "@/lib/diagnostics/intake";
import {
  loadAiFollowups,
  groupFollowupsBySection,
  generateFollowups,
  saveFollowupAnswer,
  type AiFollowupRow,
} from "@/lib/diagnostics/aiFollowups";

const DX_STAGES_FOR_INTAKE = new Set([
  "diagnostic_paid",
  "diagnostic_in_progress",
  "diagnostic_delivered",
  "decision_pending",
  "diagnostic_complete",
  "follow_up_nurture",
]);

const DELIVERABLES = [
  "Buyer Persona",
  "Outreach Channels",
  "Conversion Flow Map",
  "Revenue Metrics",
  "Strategy Plan",
];

export default function PortalDiagnostics() {
  const { user } = useAuth();
  const { customerId } = usePortalCustomerId();
  const [customer, setCustomer] = useState<any>(null);
  const [answers, setAnswers] = useState<IntakeAnswerRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [followups, setFollowups] = useState<AiFollowupRow[]>([]);
  const [openFollowupKeys, setOpenFollowupKeys] = useState<Set<string>>(new Set());
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [followupDrafts, setFollowupDrafts] = useState<Record<string, string>>({});
  const [savingFollowupId, setSavingFollowupId] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setCustomer(null);
      setAnswers([]);
      setDrafts({});
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, business_name, stage, diagnostic_status, last_activity_at")
        .eq("id", customerId)
        .is("archived_at", null)
        .maybeSingle();
      if (data) {
        setCustomer(data);
        const rows = await loadIntakeAnswers(data.id).catch(() => []);
        setAnswers(rows);
        const initial: Record<string, string> = {};
        rows.forEach((r) => { initial[r.section_key] = r.answer || ""; });
        setDrafts(initial);
        const fu = await loadAiFollowups(data.id).catch(() => []);
        setFollowups(fu);
        const fdraft: Record<string, string> = {};
        fu.forEach((r) => { fdraft[r.id] = r.answer || ""; });
        setFollowupDrafts(fdraft);
      }
    })();
  }, [customerId]);

  const intakeOpen = !!customer && DX_STAGES_FOR_INTAKE.has(customer.stage);
  const progress = useMemo(() => buildIntakeProgress(answers), [answers]);
  const followupsBySection = useMemo(() => groupFollowupsBySection(followups), [followups]);

  const onSave = async (sectionKey: string) => {
    if (!customer) return;
    const value = (drafts[sectionKey] || "").trim();
    setSavingKey(sectionKey);
    try {
      await saveIntakeAnswer({
        customerId: customer.id,
        sectionKey,
        answer: value,
        submittedBy: user?.id ?? null,
      });
      const rows = await loadIntakeAnswers(customer.id);
      setAnswers(rows);
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    } finally {
      setSavingKey(null);
    }
  };

  const toggleFollowups = (sectionKey: string) => {
    setOpenFollowupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  };

  const onGenerateFollowups = async (section: { key: string; label: string; prompt: string }) => {
    if (!customer) return;
    const saved = answers.find((a) => a.section_key === section.key);
    const savedAnswer = (saved?.answer || "").trim();
    if (savedAnswer.length < 4) {
      toast.error("Save your section answer first.");
      return;
    }
    setGeneratingKey(section.key);
    try {
      const newRows = await generateFollowups({
        customerId: customer.id,
        sectionKey: section.key,
        sectionLabel: section.label,
        sectionPrompt: section.prompt,
        savedAnswer,
      });
      setFollowups((prev) => [...prev, ...newRows]);
      setOpenFollowupKeys((prev) => new Set(prev).add(section.key));
      toast.success("AI follow-ups added.");
    } catch (e: any) {
      toast.error(e?.message || "AI follow-ups unavailable. Your intake is unaffected.");
    } finally {
      setGeneratingKey(null);
    }
  };

  const onSaveFollowupAnswer = async (row: AiFollowupRow) => {
    setSavingFollowupId(row.id);
    try {
      const value = followupDrafts[row.id] ?? "";
      await saveFollowupAnswer({
        followupId: row.id,
        answer: value,
        answeredBy: user?.id ?? null,
      });
      setFollowups((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, answer: value.trim() || null, answered_at: value.trim() ? new Date().toISOString() : null }
            : r,
        ),
      );
      toast.success("Answer saved");
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    } finally {
      setSavingFollowupId(null);
    }
  };

  const statusChip = () => {
    if (progress.status === "complete")
      return (
        <span className="px-2 py-0.5 rounded-full border bg-secondary/15 text-secondary border-secondary/40 text-[10px] uppercase tracking-wider">
          Intake complete
        </span>
      );
    if (progress.status === "partial")
      return (
        <span className="px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/40 text-[10px] uppercase tracking-wider">
          In progress · {progress.requiredFilled}/{progress.requiredTotal} required
        </span>
      );
    return (
      <span className="px-2 py-0.5 rounded-full border bg-muted/40 text-muted-foreground border-border text-[10px] uppercase tracking-wider">
        Not started
      </span>
    );
  };

  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="Your Diagnostic"
        title="Your RGS Diagnostic"
        description="The diagnostic surfaces where revenue is leaking, where the business depends on you, and what to fix before anything is rebuilt. Five deliverables, one direction."
      >
        <DomainSection
          title="Status"
          subtitle={customer ? stageLabel(customer.stage) : "Not started"}
          action={customer ? statusChip() : null}
        >
          {customer ? (
            <div className="text-sm text-foreground">
              {customer.business_name || customer.full_name}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              No diagnostic on file yet. Your RGS team will activate this view once your diagnostic begins.
            </div>
          )}
        </DomainSection>

        <DomainSection title="Your Deliverables" subtitle="What you receive at the end of the diagnostic">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {DELIVERABLES.map((d) => (
              <div key={d} className="p-3 rounded-md bg-muted/30 border border-border">
                <div className="text-sm text-foreground">{d}</div>
              </div>
            ))}
          </div>
        </DomainSection>

        {intakeOpen ? (
          <DomainSection
            title="Diagnostic Intake"
            subtitle="A short, guided set of questions so we can prepare a useful diagnostic for you. Save each section as you go — you don't have to finish in one sitting."
            action={
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {progress.filled}/{progress.total} answered
              </div>
            }
          >
            <div className="mb-4 h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
            </div>

            {progress.status === "missing" && (
              <div className="mb-4 p-3 rounded-md bg-muted/30 border border-border text-xs text-muted-foreground">
                Take it one section at a time. Most clients finish in 20–30 minutes.
              </div>
            )}
            {progress.status === "complete" && (
              <div className="mb-4 p-3 rounded-md bg-secondary/10 border border-secondary/30 text-xs text-foreground">
                All required sections received. Your RGS team will be in touch to schedule the next step. You can still update any answer below.
              </div>
            )}

            <div className="space-y-4">
              {INTAKE_SECTIONS.map((section) => {
                const saved = answers.find((a) => a.section_key === section.key);
                const draft = drafts[section.key] ?? "";
                const isSaved = !!saved && (saved.answer || "").trim().length > 0;
                const isDirty = (draft || "").trim() !== (saved?.answer || "").trim();
                return (
                  <div
                    key={section.key}
                    className="p-4 rounded-md bg-muted/30 border border-border"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isSaved ? (
                            <CheckCircle2 className="h-4 w-4 text-secondary flex-shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="text-sm text-foreground">
                            {section.label}
                            {section.required && (
                              <span className="text-[10px] text-muted-foreground ml-2 uppercase tracking-wider">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed pl-6">
                          {section.prompt}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mt-1 pl-6">
                          Feeds: {section.feeds}
                        </div>
                      </div>
                    </div>
                    {section.key === "uploads_note" && (
                      <div className="pl-6 mb-2">
                        <Link
                          to="/portal/uploads"
                          className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                        >
                          <UploadIcon className="h-3 w-3" /> Open Files & Uploads →
                        </Link>
                      </div>
                    )}
                    <Textarea
                      value={draft}
                      onChange={(e) =>
                        setDrafts({ ...drafts, [section.key]: e.target.value })
                      }
                      placeholder={section.placeholder}
                      rows={section.key === "uploads_note" ? 2 : 4}
                      maxLength={4000}
                      className="bg-background/40 border-border ml-6 w-[calc(100%-1.5rem)]"
                    />
                    <div className="mt-2 ml-6 flex items-center justify-between">
                      <div className="text-[10px] text-muted-foreground">
                        {saved?.updated_at && !isDirty
                          ? `Saved ${new Date(saved.updated_at).toLocaleDateString()}`
                          : isDirty
                            ? "Unsaved changes"
                            : "\u00A0"}
                      </div>
                      <Button
                        size="sm"
                        variant={isDirty ? "default" : "outline"}
                        disabled={!isDirty || savingKey === section.key}
                        onClick={() => onSave(section.key)}
                        className={isDirty ? "bg-primary hover:bg-secondary" : "border-border"}
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {savingKey === section.key ? "Saving…" : "Save section"}
                      </Button>
                    </div>
                    {isSaved && (
                      <div className="mt-3 ml-6 pt-3 border-t border-border/60">
                        {(() => {
                          const sectionFollowups = followupsBySection.get(section.key) || [];
                          const isOpen = openFollowupKeys.has(section.key);
                          const isGenerating = generatingKey === section.key;
                          return (
                            <>
                              <div className="flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleFollowups(section.key)}
                                  className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  AI follow-ups (optional)
                                  {sectionFollowups.length > 0 && (
                                    <span className="ml-1 text-[10px] tabular-nums">
                                      · {sectionFollowups.length}
                                    </span>
                                  )}
                                  {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isGenerating}
                                  onClick={() => onGenerateFollowups({ key: section.key, label: section.label, prompt: section.prompt })}
                                  className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                                >
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  {isGenerating ? "Generating…" : sectionFollowups.length > 0 ? "Ask more" : "Ask AI to clarify"}
                                </Button>
                              </div>
                              {isOpen && (
                                <div className="mt-3 space-y-3">
                                  <div className="text-[10px] text-muted-foreground/80 leading-relaxed">
                                    Optional. AI may ask short follow-up questions to help your RGS team understand your answer in more detail. Your scorecard is unchanged either way — these answers are reviewed by an admin before anything client-facing is published.
                                  </div>
                                  {sectionFollowups.length === 0 ? (
                                    <div className="text-[11px] text-muted-foreground italic">
                                      No AI follow-ups yet. Tap "Ask AI to clarify" if you'd like one.
                                    </div>
                                  ) : (
                                    sectionFollowups.map((fu) => {
                                      const draft = followupDrafts[fu.id] ?? "";
                                      const dirty = draft.trim() !== (fu.answer || "").trim();
                                      return (
                                        <div key={fu.id} className="p-3 rounded-md bg-background/40 border border-border">
                                          <div className="text-[12px] text-foreground leading-snug">
                                            {fu.question}
                                          </div>
                                          <Textarea
                                            value={draft}
                                            onChange={(e) => setFollowupDrafts({ ...followupDrafts, [fu.id]: e.target.value })}
                                            placeholder="Optional — answer in a sentence or two"
                                            rows={2}
                                            maxLength={2000}
                                            className="mt-2 bg-background/60 border-border text-[12px]"
                                          />
                                          <div className="mt-2 flex items-center justify-between">
                                            <div className="text-[10px] text-muted-foreground">
                                              {fu.answered_at && !dirty
                                                ? `Saved ${new Date(fu.answered_at).toLocaleDateString()}`
                                                : dirty
                                                  ? "Unsaved changes"
                                                  : "\u00A0"}
                                            </div>
                                            <Button
                                              size="sm"
                                              variant={dirty ? "default" : "outline"}
                                              disabled={!dirty || savingFollowupId === fu.id}
                                              onClick={() => onSaveFollowupAnswer(fu)}
                                              className={dirty ? "h-7 text-[11px] bg-primary hover:bg-secondary" : "h-7 text-[11px] border-border"}
                                            >
                                              {savingFollowupId === fu.id ? "Saving…" : "Save answer"}
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DomainSection>
        ) : (
          <DomainSection title="Diagnostic Intake" subtitle="Available once your diagnostic is active">
            <div className="text-xs text-muted-foreground">
              The intake will open here once your diagnostic begins. You'll be guided through a short set of questions about your offer, sales, customer journey, and goals.
            </div>
          </DomainSection>
        )}
      </DomainShell>
    </PortalShell>
  );
}