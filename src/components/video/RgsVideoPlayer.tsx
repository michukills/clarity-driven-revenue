import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface RgsVideoPlayerProps {
  src: string;
  title: string;
  poster?: string | null;
  captionsSrc?: string | null;
  className?: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function RgsVideoPlayer({
  src,
  title,
  poster,
  captionsSrc,
  className,
}: RgsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [muted, volume]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMuted = () => setMuted((m) => !m);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-black shadow-sm",
        className,
      )}
    >
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          poster={poster ?? undefined}
          preload="metadata"
          playsInline
          controls={false}
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          aria-label={title}
          onClick={togglePlay}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        >
          <source src={src} type="video/mp4" />
          {captionsSrc && (
            <track
              kind="captions"
              src={captionsSrc}
              srcLang="en"
              label="English captions"
              default
            />
          )}
          Your browser does not support embedded video.
        </video>
        {!playing && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/10 text-white transition hover:bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label={`Play ${title}`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 ring-1 ring-white/25 md:h-16 md:w-16">
              <Play className="h-7 w-7 translate-x-0.5" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 bg-[hsl(0_0%_8%)] px-3 py-3 text-white sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={togglePlay}
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-white/15 bg-white/10 px-3 text-sm font-medium transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={playing ? `Pause ${title}` : `Play ${title}`}
        >
          {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
        </button>

        <div className="flex flex-1 items-center gap-2">
          <span className="w-10 text-right text-[11px] tabular-nums text-white/70">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || currentTime)}
            onChange={(event) => {
              const next = Number(event.target.value);
              const video = videoRef.current;
              if (video) video.currentTime = next;
              setCurrentTime(next);
            }}
            className="h-2 min-w-0 flex-1 accent-[hsl(78,32%,58%)]"
            aria-label={`Seek ${title}`}
          />
          <span className="w-10 text-[11px] tabular-nums text-white/70">
            {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:w-44">
          <button
            type="button"
            onClick={toggleMuted}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-white/15 bg-white/10 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={muted ? `Unmute ${title}` : `Mute ${title}`}
          >
            {muted || volume === 0 ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(event) => {
              const next = Number(event.target.value);
              setVolume(next);
              setMuted(next === 0);
            }}
            className="h-2 min-w-24 flex-1 accent-[hsl(78,32%,58%)]"
            aria-label={`Volume for ${title}`}
          />
        </div>
      </div>
    </div>
  );
}
