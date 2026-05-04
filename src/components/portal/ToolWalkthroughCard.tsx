import { useEffect, useState } from "react";
import { PlayCircle } from "lucide-react";
import {
  getClientWalkthroughVideos,
  type ClientWalkthroughVideo,
} from "@/lib/toolWalkthroughVideos";

/**
 * Reusable instructional card. Renders an approved walkthrough video,
 * transcript and captions if present, otherwise a calm "coming soon" note.
 * Never displays admin or internal notes — the underlying RPC excludes them.
 */
export function ToolWalkthroughCard({ toolKey }: { toolKey: string }) {
  const [video, setVideo] = useState<ClientWalkthroughVideo | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getClientWalkthroughVideos()
      .then((rows) => {
        if (cancelled) return;
        setVideo(rows.find((v) => v.tool_key === toolKey) ?? null);
      })
      .catch(() => {
        if (!cancelled) setVideo(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [toolKey]);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <PlayCircle className="h-3.5 w-3.5 text-primary" />
        How to use this tool
      </div>
      {!loaded ? (
        <p className="text-sm text-muted-foreground mt-3">Loading walkthrough…</p>
      ) : video ? (
        <div className="mt-3 space-y-3">
          <div className="text-sm text-foreground font-medium">{video.title}</div>
          {video.short_description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {video.short_description}
            </p>
          )}
          {video.embed_url ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black/40">
              <iframe
                src={video.embed_url}
                title={`${video.title} walkthrough`}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : video.video_url ? (
            <a
              href={video.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Open approved walkthrough
            </a>
          ) : null}
          {video.captions && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">Captions / subtitles</summary>
              <pre className="whitespace-pre-wrap mt-2 text-[11px] leading-relaxed">
                {video.captions}
              </pre>
            </details>
          )}
          {video.transcript && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">Transcript</summary>
              <p className="whitespace-pre-wrap mt-2 text-[11px] leading-relaxed">
                {video.transcript}
              </p>
            </details>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mt-3">
          Walkthrough video coming soon. The next step above is the best place to start.
        </p>
      )}
    </div>
  );
}