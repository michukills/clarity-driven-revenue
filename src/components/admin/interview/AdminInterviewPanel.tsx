// P83C — Admin Interview Mode + Admin Assist UI for an admin viewing a
// specific customer detail page. All writes go through `adminInterview`
// helpers which carry attribution; RLS + DB triggers enforce admin-only
// fields. There is no AI scoring or auto-publishing — admin-entered
// answers feed the same deterministic rules as client-entered ones.
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { OWNER_INTERVIEW_SECTIONS, OWNER_INTERVIEW_GROUPS } from "@/lib/diagnostics/ownerInterview";
import { loadIntakeAnswers, type IntakeAnswerRow } from "@/lib/diagnostics/intake";
import {
  startSession,
  endSession,
  getActiveSession,
  adminSaveAnswer,
  addAdminNote,
  loadAdminNotes,
  EVIDENCE_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
  CLIENT_CONFIRMATION_LABELS,
  type EvidenceStatus,
  type SourceType,
  type InterviewMode,
  type InterviewSessionRow,
  type AdminAssistNoteRow,
} from "@/lib/adminInterview";
import { toast } from "sonner";
import { Mic, Save, StopCircle, Pause, NotebookPen } from "lucide-react";

const SOURCE_OPTIONS: SourceType[] = [
  "client_verbal",
  "interview",
  "uploaded_evidence",
  "admin_observation",
  "imported_data",
  "ai_assisted_draft",
];
const EVIDENCE_OPTIONS: EvidenceStatus[] = [
  "verified",
  "partial",
  "owner_claimed",
  "missing",
  "needs_followup",
];

export function AdminInterviewPanel({ customerId }: { customerId: string }) {
  const { user } = useAuth();
  const [session, setSession] = useState<InterviewSessionRow | null>(null);
  const [mode, setMode] = useState<InterviewMode>("interview");
  const [answers, setAnswers] = useState<Map<string, IntakeAnswerRow>>(new Map());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sourceByKey, setSourceByKey] = useState<Record<string, SourceType>>({});
  const [evidenceByKey, setEvidenceByKey] = useState<Record<string, EvidenceStatus>>({});
  const [noteByKey, setNoteByKey] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<AdminAssistNoteRow[]>([]);
  const [newAdminNote, setNewAdminNote] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [rows, sess, notes] = await Promise.all([
      loadIntakeAnswers(customerId).catch(() => [] as IntakeAnswerRow[]),
      getActiveSession(customerId).catch(() => null),
      loadAdminNotes(customerId).catch(() => [] as AdminAssistNoteRow[]),
    ]);
    const m = new Map<string, IntakeAnswerRow>();
    const d: Record<string, string> = {};
    rows.forEach((r) => {
      m.set(r.section_key, r);
      d[r.section_key] = r.answer ?? "";
    });
    setAnswers(m);
    setDrafts(d);
    setSession(sess);
    setAdminNotes(notes);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const counts = useMemo(() => {
    let admin = 0;
    let client = 0;
    let needsConfirm = 0;
    let missing = 0;
    answers.forEach((r) => {
      if (r.entered_by === "admin") admin++;
      else client++;
      if (r.client_confirmation_status === "needs_client_confirmation") needsConfirm++;
      if (r.evidence_status === "missing" || r.evidence_status === "needs_followup") missing++;
    });
    return { admin, client, needsConfirm, missing, total: OWNER_INTERVIEW_SECTIONS.length };
  }, [answers]);

  const onStart = async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      const s = await startSession({ customerId, startedBy: user.id, mode });
      setSession(s);
      toast.success(`${mode === "interview" ? "Interview" : "Assist"} session started`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start session");
    } finally {
      setBusy(false);
    }
  };

  const onEnd = async (status: "completed" | "paused" | "cancelled") => {
    if (!session || !user?.id) return;
    setBusy(true);
    try {
      await endSession({ sessionId: session.id, customerId, status, actorId: user.id });
      setSession(null);
      toast.success(`Session ${status}`);
      void refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not end session");
    } finally {
      setBusy(false);
    }
  };

  const onSaveAnswer = async (sectionKey: string) => {
    if (!user?.id) return;
    const value = (drafts[sectionKey] ?? "").trim();
    if (!value) {
      toast.error("Answer is empty");
      return;
    }
    const sourceType = sourceByKey[sectionKey] ?? (mode === "interview" ? "interview" : "client_verbal");
    const evidenceStatus = evidenceByKey[sectionKey] ?? "owner_claimed";
    setSavingKey(sectionKey);
    try {
      await adminSaveAnswer({
        customerId,
        sectionKey,
        answer: value,
        adminUserId: user.id,
        sessionId: session?.id ?? null,
        sourceType,
        evidenceStatus,
        adminClarificationNote: noteByKey[sectionKey]?.trim() || null,
      });
      toast.success("Saved with admin attribution");
      void refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSavingKey(null);
    }
  };

  const onAddNote = async () => {
    if (!user?.id) return;
    const note = newAdminNote.trim();
    if (!note) return;
    try {
      await addAdminNote({ customerId, adminUserId: user.id, note, sessionId: session?.id ?? null });
      setNewAdminNote("");
      toast.success("Admin-only note added");
      void refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add note");
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl p-5 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" /> Interview / Assist Mode
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xl">
            Capture answers live during a guided session. Every entry is attributed to
            you with a source type and evidence status. Owner-claimed answers are
            never auto-marked as verified.
          </p>
        </div>
        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-3">
          <span>Admin-entered: <span className="text-foreground tabular-nums">{counts.admin}</span></span>
          <span>Client-entered: <span className="text-foreground tabular-nums">{counts.client}</span></span>
          <span>Awaiting confirmation: <span className="text-foreground tabular-nums">{counts.needsConfirm}</span></span>
          <span>Missing evidence: <span className="text-foreground tabular-nums">{counts.missing}</span></span>
        </div>
      </header>

      <div className="rounded-md border border-border bg-muted/20 p-3 flex flex-wrap items-center gap-2">
        {!session ? (
          <>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as InterviewMode)}
              className="h-8 rounded-md border border-border bg-background text-xs px-2"
            >
              <option value="interview">Interview Mode (live diagnostic)</option>
              <option value="assist">Assist Mode (help complete)</option>
            </select>
            <Button size="sm" onClick={onStart} disabled={busy} className="bg-primary hover:bg-secondary">
              <Mic className="h-3 w-3 mr-1" /> Start session
            </Button>
          </>
        ) : (
          <>
            <span className="text-[11px] text-foreground">
              Active <strong>{session.mode}</strong> session — started {new Date(session.started_at).toLocaleString()}
            </span>
            <Button size="sm" variant="outline" onClick={() => onEnd("paused")} disabled={busy}>
              <Pause className="h-3 w-3 mr-1" /> Pause
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEnd("completed")} disabled={busy}>
              <StopCircle className="h-3 w-3 mr-1" /> Complete
            </Button>
          </>
        )}
      </div>

      <div className="space-y-6 max-h-[640px] overflow-y-auto pr-1">
        {OWNER_INTERVIEW_GROUPS.map((g) => {
          const items = OWNER_INTERVIEW_SECTIONS.filter((s) => s.group === g.key);
          return (
            <div key={g.key}>
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-2">{g.title}</div>
              <div className="space-y-3">
                {items.map((s) => {
                  const row = answers.get(s.key);
                  const draft = drafts[s.key] ?? "";
                  return (
                    <div key={s.key} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground">{s.label}</div>
                          <div className="text-[10px] text-muted-foreground">{s.prompt}</div>
                        </div>
                        {row && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {row.entered_by === "admin" ? "Admin-entered" : "Client-entered"}
                            {row.evidence_status ? ` · ${EVIDENCE_STATUS_LABELS[row.evidence_status]}` : ""}
                          </span>
                        )}
                      </div>
                      <Textarea
                        value={draft}
                        onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                        placeholder={s.placeholder}
                        className="min-h-[60px] text-xs bg-background"
                      />
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="text-[10px] text-muted-foreground">
                          Source
                          <select
                            value={sourceByKey[s.key] ?? (mode === "interview" ? "interview" : "client_verbal")}
                            onChange={(e) => setSourceByKey((p) => ({ ...p, [s.key]: e.target.value as SourceType }))}
                            className="mt-1 w-full h-8 rounded-md border border-border bg-background text-xs px-2"
                          >
                            {SOURCE_OPTIONS.map((o) => (
                              <option key={o} value={o}>{SOURCE_TYPE_LABELS[o]}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-[10px] text-muted-foreground">
                          Evidence status
                          <select
                            value={evidenceByKey[s.key] ?? "owner_claimed"}
                            onChange={(e) => setEvidenceByKey((p) => ({ ...p, [s.key]: e.target.value as EvidenceStatus }))}
                            className="mt-1 w-full h-8 rounded-md border border-border bg-background text-xs px-2"
                          >
                            {EVIDENCE_OPTIONS.map((o) => (
                              <option key={o} value={o}>{EVIDENCE_STATUS_LABELS[o]}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <Input
                        value={noteByKey[s.key] ?? ""}
                        onChange={(e) => setNoteByKey((p) => ({ ...p, [s.key]: e.target.value }))}
                        placeholder="Admin-only clarification (never shown to client)"
                        className="mt-2 h-8 text-xs"
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {row?.client_confirmation_status
                            ? CLIENT_CONFIRMATION_LABELS[row.client_confirmation_status]
                            : ""}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => onSaveAnswer(s.key)}
                          disabled={savingKey === s.key || !draft.trim()}
                          className="bg-primary hover:bg-secondary"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          {savingKey === s.key ? "Saving…" : "Save admin-attributed"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mb-2">
          <NotebookPen className="h-3 w-3" /> Admin-only notes (never shown to client)
        </div>
        <div className="flex gap-2">
          <Input
            value={newAdminNote}
            onChange={(e) => setNewAdminNote(e.target.value)}
            placeholder="Internal observation, follow-up, hypothesis…"
            className="h-8 text-xs"
          />
          <Button size="sm" variant="outline" onClick={onAddNote} disabled={!newAdminNote.trim()}>
            Add
          </Button>
        </div>
        {adminNotes.length > 0 && (
          <ul className="mt-3 space-y-1 max-h-40 overflow-y-auto text-[11px] text-foreground">
            {adminNotes.map((n) => (
              <li key={n.id} className="border-l-2 border-primary/40 pl-2">
                <span className="text-muted-foreground">{new Date(n.created_at).toLocaleString()}: </span>
                {n.note}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
