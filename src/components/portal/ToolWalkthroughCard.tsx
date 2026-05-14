import { useEffect, useState } from "react";
import { PlayCircle, BookOpen, ListChecks, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import {
  getClientWalkthroughVideos,
  type ClientWalkthroughVideo,
} from "@/lib/toolWalkthroughVideos";
import { getToolGuide } from "@/lib/toolGuides";
import RgsVideoPlayer from "@/components/video/RgsVideoPlayer";

function deriveWalkthroughPoster(videoUrl: string | null): string | null {
  if (!videoUrl?.startsWith("/videos/walkthroughs/") || !videoUrl.endsWith(".mp4")) return null;
  const file = videoUrl.split("/").pop();
  if (!file) return null;
  return `/videos/walkthroughs/posters/${file.replace(/\.mp4$/, "-poster.png")}`;
}

function deriveWalkthroughCaptions(videoUrl: string | null): string | null {
  if (!videoUrl?.startsWith("/videos/walkthroughs/") || !videoUrl.endsWith(".mp4")) return null;
  return videoUrl.replace(/\.mp4$/, ".vtt");
}

/**
 * Reusable instructional card. Renders an approved walkthrough video,
 * transcript and captions if present, otherwise a calm written-guide fallback.
 * Never displays admin or internal notes — the underlying RPC excludes them.
 */
export function ToolWalkthroughCard({ toolKey }: { toolKey: string }) {
  const [video, setVideo] = useState<ClientWalkthroughVideo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const guide = getToolGuide(toolKey);

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
      <p
        data-testid="tool-walkthrough-start-here"
        className="text-xs text-foreground/80 mt-2 leading-relaxed"
      >
        Start here if this is your first time on this page — the short
        walkthrough below explains what to do before scrolling into the
        workflow.
      </p>
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
            <RgsVideoPlayer
              src={video.video_url}
              poster={deriveWalkthroughPoster(video.video_url)}
              captionsSrc={deriveWalkthroughCaptions(video.video_url)}
              title={`${video.title} walkthrough`}
            />
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
      ) : guide ? (
        <div className="mt-3 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-foreground font-medium">{guide.toolName}</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{guide.purpose}</p>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground border border-border rounded-full px-2 py-0.5">
              Walkthrough not published yet
            </span>
          </div>

          <GuideBlock icon={BookOpen} eyebrow="Before you start" items={guide.gather} />
          <GuideBlock icon={CheckCircle2} eyebrow="What a good submission looks like" items={guide.goodSubmission} />

          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <ArrowRight className="h-3 w-3 text-primary" /> What happens next
            </div>
            <p className="text-xs text-foreground/90 mt-1.5 leading-relaxed">{guide.afterSubmit}</p>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
            <span>{guide.scopeBoundary}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mt-3">
          Walkthrough not published yet. The next step shown above is the best place to start.
        </p>
      )}
    </div>
  );
}

function GuideBlock({
  icon: Icon,
  eyebrow,
  items,
}: {
  icon: any;
  eyebrow: string;
  items: string[];
}) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3 w-3 text-primary" /> {eyebrow}
      </div>
      <ul className="mt-1.5 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-foreground/90 leading-relaxed flex gap-2">
            <ListChecks className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
