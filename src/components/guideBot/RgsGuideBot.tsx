import { useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Bot, FileText, Loader2, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { supabase } from "@/integrations/supabase/client";
import {
  buildGuideResponse,
  buildDeterministicGuideAnswer,
  getGuideBotActions,
  getImageAssistWarnings,
  GUIDE_BOT_BAR_COPY,
  inferGuideSurface,
  isRouteSafeForSurface,
  type GuideBotResponse,
  type GuideBotSurface,
  type ImageInputAssistDraft,
} from "@/lib/guideBots/p94aGuideBotPolicy";
import { AiOutputEnvelopePanel } from "@/components/ai/AiOutputEnvelopePanel";
import { extractAiOutputEnvelope } from "@/lib/ai/aiOutputEnvelopeTypes";

type GuideMessage = {
  id: string;
  from: "user" | "guide";
  text: string;
  meta?: string;
};

function currentAdminCustomerId(pathname: string): string | null {
  const match = pathname.match(/^\/admin\/customers\/([^/]+)/);
  return match?.[1] ?? null;
}

function readFileForAssist(file: File): Promise<{ imageDataUrl?: string; text?: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      if (file.type.startsWith("image/")) resolve({ imageDataUrl: result });
      else resolve({ text: result });
    };
    if (file.type.startsWith("image/")) reader.readAsDataURL(file);
    else reader.readAsText(file);
  });
}

export function RgsGuideBot() {
  const { isAdmin, user } = useAuth();
  const location = useLocation();
  const params = useParams();
  const { customerId: portalCustomerId } = usePortalCustomerId();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [response, setResponse] = useState<GuideBotResponse | null>(null);
  const [messages, setMessages] = useState<GuideMessage[]>([]);
  const [draft, setDraft] = useState<ImageInputAssistDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const surface = inferGuideSurface(location.pathname, isAdmin);
  const routeCustomerId =
    surface === "admin"
      ? currentAdminCustomerId(location.pathname) ?? params.customerId ?? null
      : surface === "client"
        ? portalCustomerId
        : null;

  const safeActions = useMemo(
    () =>
      (response?.actions ?? getGuideBotActions(surface, location.pathname)).filter((action) =>
        isRouteSafeForSurface(action, surface),
      ),
    [response?.actions, surface, location.pathname],
  );

  const label = surface === "admin" ? "Admin OS Guide" : surface === "client" ? "Portal Guide" : "RGS Guide";
  const placeholder = GUIDE_BOT_BAR_COPY[surface];
  const canUseImageAssist = surface !== "public" && !!user;

  async function askGuide(seed?: string) {
    const message = (seed ?? prompt).trim();
    if (!message || loading) return;
    setOpen(true);
    setLoading(true);
    setError(null);
    setPrompt("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "user", text: message }]);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("rgs-guide-bot", {
        body: {
          surface,
          route: location.pathname,
          message,
          customerId: routeCustomerId,
        },
      });
      if (invokeError) throw invokeError;
      const next = data as GuideBotResponse;
      setResponse(next);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          from: "guide",
          text: next.answer,
          meta: next.aiAssisted ? "AI-assisted draft guidance" : "Rules-based guidance",
        },
      ]);
    } catch (e) {
      const fallback = buildGuideResponse(
        surface,
        location.pathname,
        buildDeterministicGuideAnswer(surface, message, {
          route: location.pathname,
          surface,
        }),
        "deterministic",
      );
      setResponse(fallback);
      setError("Live guide AI is unavailable. Showing safe rules-based guidance.");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          from: "guide",
          text: fallback.answer,
          meta: "Rules-based fallback",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function runImageAssist(file: File) {
    if (!canUseImageAssist || extracting) return;
    setOpen(true);
    setExtracting(true);
    setError(null);
    setDraft(null);
    try {
      const filePayload = await readFileForAssist(file);
      const { data, error: invokeError } = await supabase.functions.invoke("rgs-image-input-assist", {
        body: {
          surface,
          route: location.pathname,
          customerId: routeCustomerId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          ...filePayload,
        },
      });
      if (invokeError) throw invokeError;
      setDraft(data as ImageInputAssistDraft);
    } catch {
      setDraft({
        version: "p94a-guide-bots-v1",
        surface: surface as Exclude<GuideBotSurface, "public">,
        mode: "unavailable",
        draftLabel: "AI-assisted draft",
        summary: "Image/document extraction is unavailable right now. You can still describe the material in the guide prompt.",
        fields: [],
        recommendedDestination: surface === "admin" ? "Admin review notes" : "Portal upload or clarification note",
        warnings: getImageAssistWarnings(file.type || "application/octet-stream"),
        requiresConfirmationBeforeWrite: true,
        verified: false,
      });
      setError("Extraction is unavailable. No data was written.");
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function confirmDraftIntoPrompt() {
    if (!draft) return;
    const fieldText = draft.fields.map((f) => `${f.label}: ${f.value}`).join("\n");
    const nextPrompt = [
      "Use this confirmed AI-assisted draft as context. Do not treat it as verified evidence.",
      draft.summary,
      fieldText,
    ]
      .filter(Boolean)
      .join("\n");
    setPrompt(nextPrompt);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        from: "guide",
        text: "Draft added to the input box for your review. Nothing was written to the database.",
        meta: "Confirmation required before use",
      },
    ]);
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 z-40 w-auto sm:bottom-5 sm:left-auto sm:right-5 sm:w-[min(440px,calc(100vw-1.5rem))]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-border bg-background/95 px-3 py-2.5 text-left shadow-lg backdrop-blur transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open ${label}`}
          data-testid="p94a-guide-collapsed-bar"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-foreground">{label}</span>
            <span className="block truncate text-xs text-muted-foreground">{placeholder}</span>
          </span>
          <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
        </button>
      ) : (
        <section
          className="max-h-[78vh] min-w-0 max-w-full overflow-hidden break-words rounded-lg border border-border bg-background shadow-2xl [overflow-wrap:anywhere] sm:max-h-[680px]"
          aria-label={label}
          data-testid="p94a-guide-expanded-panel"
        >
          <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Bot className="h-4 w-4 shrink-0 text-primary" />
                <h2 className="min-w-0 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{label}</h2>
                <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                  {surface}
                </Badge>
              </div>
              <p className="mt-1 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{placeholder}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close guide" className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[42vh] min-w-0 space-y-3 overflow-y-auto px-4 py-3 sm:max-h-[360px]">
            {messages.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                Ask a workflow question. The guide can explain, route, and organize draft inputs. It cannot publish, approve, verify evidence, send emails, change scores, or expose hidden data.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.from === "user"
                      ? "ml-4 min-w-0 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground [overflow-wrap:anywhere] sm:ml-8"
                      : "mr-4 min-w-0 rounded-md bg-muted px-3 py-2 text-xs text-foreground [overflow-wrap:anywhere] sm:mr-8"
                  }
                >
                  <div className="whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]">{m.text}</div>
                  {m.meta && <div className="mt-1 text-[10px] opacity-70">{m.meta}</div>}
                </div>
              ))
            )}

            {draft && (
              <div className="min-w-0 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-950 [overflow-wrap:anywhere]">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <FileText className="h-3.5 w-3.5" />
                  AI-assisted draft, not verified
                </div>
                <p className="break-words [overflow-wrap:anywhere]">{draft.summary}</p>
                {draft.fields.length > 0 && (
                  <dl className="mt-2 grid gap-1">
                    {draft.fields.slice(0, 6).map((field) => (
                      <div key={field.key} className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-2">
                        <dt className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">{field.label}</dt>
                        <dd className="min-w-0 break-words [overflow-wrap:anywhere]">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {draft.warnings.slice(0, 3).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 h-auto min-h-9 whitespace-normal text-left leading-snug"
                  onClick={confirmDraftIntoPrompt}
                >
                  Confirm draft into guide input
                </Button>
              </div>
            )}

            {error && (
              <div className="min-w-0 break-words rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive [overflow-wrap:anywhere]">
                {error}
              </div>
            )}

            {response && surface === "admin" && (
              <div data-testid="guide-bot-admin-envelope">
                <AiOutputEnvelopePanel
                  envelope={extractAiOutputEnvelope(response)}
                  variant="compact"
                />
              </div>
            )}
          </div>

          {safeActions.length > 0 && (
            <div className="border-t border-border px-4 py-3">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Safe next routes</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {safeActions.map((action) => (
                  <Button
                    key={`${action.href}-${action.label}`}
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-auto min-h-9 w-full min-w-0 max-w-full items-start justify-start overflow-hidden whitespace-normal py-2 text-left leading-snug [overflow-wrap:anywhere]"
                  >
                    <Link to={action.href} className="block w-full min-w-0 whitespace-normal break-words text-left leading-snug [overflow-wrap:anywhere]">
                      {action.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border p-3">
            <div className="flex min-w-0 items-end gap-2">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                className="min-h-[48px] min-w-0 flex-1 resize-none text-xs"
                data-testid="p94a-guide-input"
              />
              <div className="flex shrink-0 flex-col gap-2">
                {canUseImageAssist && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.txt,.csv,.md,.json"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        if (file) void runImageAssist(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={extracting}
                      aria-label="Extract draft input from image or document"
                    >
                      {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    </Button>
                  </>
                )}
                <Button type="button" size="icon" onClick={() => void askGuide()} disabled={loading || !prompt.trim()} aria-label="Ask guide">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="mt-2 flex items-start gap-2 text-[10px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Role-aware guide. Draft help only. No scoring changes, publishing, emails, approvals, or evidence verification.
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default RgsGuideBot;
