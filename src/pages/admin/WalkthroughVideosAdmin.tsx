import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  adminListWalkthroughVideos,
  adminCreateWalkthroughVideo,
  adminUpdateWalkthroughVideo,
  adminArchiveWalkthroughVideo,
  type AdminWalkthroughVideo,
  type WalkthroughVideoStatus,
  type WalkthroughCaptionFormat,
} from "@/lib/toolWalkthroughVideos";
import { KNOWN_TOOL_GUIDE_KEYS, getToolGuide } from "@/lib/toolGuides";
import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";

const STATUSES: WalkthroughVideoStatus[] = [
  "not_started", "planned", "recorded", "uploaded", "approved", "archived",
];
const FORMATS: WalkthroughCaptionFormat[] = ["plain_text", "srt", "vtt"];

export default function WalkthroughVideosAdmin() {
  const [items, setItems] = useState<AdminWalkthroughVideo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newToolKey, setNewToolKey] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const r = await adminListWalkthroughVideos();
      setItems(r);
      if (!activeId && r[0]) setActiveId(r[0].id);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  const active = useMemo(() => items.find(i => i.id === activeId) ?? null, [items, activeId]);

  const readiness = useMemo(() => {
    const byKey = new Map<string, AdminWalkthroughVideo>();
    for (const it of items) if (!it.archived_at) byKey.set(it.tool_key, it);
    return KNOWN_TOOL_GUIDE_KEYS.map((key) => {
      const guide = getToolGuide(key)!;
      const v = byKey.get(key);
      const missing: string[] = [];
      if (!v) missing.push("no metadata");
      else {
        if (!(v.video_url || v.embed_url)) missing.push("video URL");
        if (!v.transcript) missing.push("transcript");
        if (!v.captions) missing.push("captions");
        if (v.video_status !== "approved") missing.push("approval");
        if (!v.client_visible) missing.push("client-visible");
      }
      const ready = missing.length === 0;
      const next = !v
        ? "Create walkthrough metadata"
        : !(v.video_url || v.embed_url)
        ? "Record and upload the walkthrough"
        : !v.transcript
        ? "Add transcript"
        : !v.captions
        ? "Add captions"
        : v.video_status !== "approved"
        ? "Mark approved"
        : !v.client_visible
        ? "Toggle client-visible"
        : "Ready";
      return { key, name: guide.toolName, video: v ?? null, missing, ready, next };
    });
  }, [items]);

  const create = async () => {
    if (!newToolKey.trim() || !newTitle.trim()) {
      toast.error("Tool key and title required");
      return;
    }
    try {
      const r = await adminCreateWalkthroughVideo({
        tool_key: newToolKey.trim(),
        title: newTitle.trim(),
      });
      setNewToolKey(""); setNewTitle("");
      setActiveId(r.id);
      await reload();
      toast.success("Walkthrough metadata created");
    } catch (e: any) { toast.error(e.message); }
  };

  const save = async (patch: Partial<AdminWalkthroughVideo>) => {
    if (!active) return;
    try {
      await adminUpdateWalkthroughVideo(active.id, patch);
      await reload();
      toast.success("Saved");
    } catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this walkthrough? It will be hidden from clients.")) return;
    try {
      await adminArchiveWalkthroughVideo(active.id);
      await reload();
      toast.success("Archived");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <PortalShell variant="admin">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">RGS OS</div>
        <h1 className="mt-2 text-3xl text-foreground font-light tracking-tight">Tool Walkthrough Videos</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          Manage instructional walkthrough metadata for client-facing tools.
          Only approve real walkthrough videos that show the actual tool or
          approved demo data. Do not publish placeholder or fabricated
          walkthroughs. Internal notes here are admin-only and never shown
          in the client portal.
        </p>
      </div>

      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-primary" /> Walkthrough readiness matrix
        </div>
        <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
          Status of each known client-facing tool. Until a walkthrough is approved and client-visible, the portal shows the written "How to use this tool" guide as the fallback.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 font-normal">Tool</th>
                <th className="py-2 pr-3 font-normal">Status</th>
                <th className="py-2 pr-3 font-normal">Transcript</th>
                <th className="py-2 pr-3 font-normal">Captions</th>
                <th className="py-2 pr-3 font-normal">Client-visible</th>
                <th className="py-2 pr-3 font-normal">Missing</th>
                <th className="py-2 pr-3 font-normal">Recommended next action</th>
              </tr>
            </thead>
            <tbody>
              {readiness.map((r) => (
                <tr key={r.key} className="border-b border-border/50">
                  <td className="py-2 pr-3 text-foreground">
                    <div>{r.name}</div>
                    <div className="text-[10px] text-muted-foreground">{r.key}</div>
                  </td>
                  <td className="py-2 pr-3">
                    {r.ready ? (
                      <span className="inline-flex items-center gap-1 text-[hsl(140_50%_70%)]">
                        <CheckCircle2 className="h-3 w-3" /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <CircleDashed className="h-3 w-3" /> {r.video?.video_status ?? "not_started"}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.video?.transcript ? "yes" : "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.video?.captions ? "yes" : "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.video?.client_visible ? "yes" : "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.missing.join(", ") || "—"}</td>
                  <td className="py-2 pr-3 text-foreground">{r.next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-xl border border-border bg-card p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          placeholder="tool_key (e.g. owner_diagnostic_interview)"
          value={newToolKey}
          onChange={(e) => setNewToolKey(e.target.value)}
        />
        <Input
          placeholder="Title shown to clients once approved"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <Button onClick={create}>Create walkthrough</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <div className="rounded-xl border border-border bg-card p-3 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="text-xs text-muted-foreground p-2">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-xs text-muted-foreground p-2">No walkthroughs yet.</div>
          ) : items.map(it => (
            <button
              key={it.id}
              onClick={() => setActiveId(it.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 ${
                activeId === it.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <div className="truncate">{it.title}</div>
              <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                {it.tool_key} · {it.video_status}{it.client_visible ? " · client-visible" : ""}
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          {!active ? (
            <div className="text-sm text-muted-foreground">Select a walkthrough to edit.</div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Title</label>
                <Input
                  value={active.title}
                  onChange={(e) => save({ title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Short description</label>
                <Textarea
                  rows={2}
                  value={active.short_description ?? ""}
                  onChange={(e) => save({ short_description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Video URL</label>
                  <Input value={active.video_url ?? ""} onChange={(e) => save({ video_url: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Embed URL</label>
                  <Input value={active.embed_url ?? ""} onChange={(e) => save({ embed_url: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</label>
                  <select
                    value={active.video_status}
                    onChange={(e) => save({ video_status: e.target.value as WalkthroughVideoStatus })}
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Caption format</label>
                  <select
                    value={active.caption_format ?? ""}
                    onChange={(e) => save({ caption_format: (e.target.value || null) as WalkthroughCaptionFormat | null })}
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                  >
                    <option value="">—</option>
                    {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Duration (seconds)</label>
                  <Input
                    type="number"
                    value={active.duration_seconds ?? ""}
                    onChange={(e) => save({ duration_seconds: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground mt-6">
                  <input
                    type="checkbox"
                    checked={active.client_visible}
                    onChange={(e) => save({ client_visible: e.target.checked })}
                  />
                  Client-visible (only shown when also <code>approved</code>)
                </label>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Captions / subtitles</label>
                <Textarea rows={4} value={active.captions ?? ""} onChange={(e) => save({ captions: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Transcript</label>
                <Textarea rows={5} value={active.transcript ?? ""} onChange={(e) => save({ transcript: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Internal notes (admin-only, never shown to clients)</label>
                <Textarea rows={3} value={active.internal_notes ?? ""} onChange={(e) => save({ internal_notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={archive}>Archive</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}