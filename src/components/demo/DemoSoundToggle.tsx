import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Optional background-music toggle for the /demo page.
 *
 * Behavior (per P15.DemoVideoBuyerHookAndMusicHardening.1):
 *  - Lives OUTSIDE the animation frame.
 *  - Default state: muted/off. Never autoplays.
 *  - On enable: plays the looped audio at low background volume (~14%).
 *  - On disable / repeat enable: state persists for the session via sessionStorage.
 *  - Keyboard accessible (it's a button).
 *  - Fails gracefully if /audio/rgs-demo-background.mp3 is missing —
 *    the toggle hides itself instead of showing a broken control.
 *
 * For exported social/video versions, bake in the same music bed at
 * low volume with a 1s fade-in and 2s fade-out.
 */

const AUDIO_SRC = "/audio/rgs-demo-background.mp3";
const SESSION_KEY = "rgs:demo:sound";
const PLAYBACK_VOLUME = 0.14; // ~14% — sits behind the demo

export default function DemoSoundToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [available, setAvailable] = useState(true);
  const [enabled, setEnabled] = useState(false);

  // Probe the file. If it 404s or errors, hide the toggle.
  useEffect(() => {
    let alive = true;
    fetch(AUDIO_SRC, { method: "HEAD" })
      .then((r) => {
        if (!alive) return;
        if (!r.ok) setAvailable(false);
      })
      .catch(() => {
        if (alive) setAvailable(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Restore prior session preference (still requires a fresh user gesture
  // to actually play, so we only mark intent — playback starts on toggle).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved === "on") setEnabled(true);
    } catch {
      // ignore
    }
  }, []);

  // Apply state changes to the audio element.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !available) return;
    el.volume = PLAYBACK_VOLUME;
    el.loop = true;
    if (enabled) {
      const p = el.play();
      if (p && typeof p.then === "function") {
        p.catch(() => {
          // Autoplay blocked or file missing — silently disable.
          setEnabled(false);
        });
      }
    } else {
      el.pause();
    }
    try {
      sessionStorage.setItem(SESSION_KEY, enabled ? "on" : "off");
    } catch {
      // ignore
    }
  }, [enabled, available]);

  if (!available) return null;

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => setEnabled((v) => !v)}
        aria-pressed={enabled}
        aria-label={enabled ? "Mute background music" : "Play background music"}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/60 bg-[hsl(0_0%_10%)] text-foreground/85 hover:text-foreground hover:border-[hsl(78,30%,45%)]/60 hover:bg-[hsl(0_0%_12%)] transition-all duration-200 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(78,30%,45%)]/60"
      >
        {enabled ? (
          <Volume2 size={13} strokeWidth={1.85} className="text-[hsl(78,32%,72%)]" />
        ) : (
          <VolumeX size={13} strokeWidth={1.85} className="text-foreground/55" />
        )}
        {enabled ? "Sound on" : "Sound off"}
      </button>
      {/* Hidden audio element. preload="none" so we never fetch unless asked. */}
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        preload="none"
        onError={() => setAvailable(false)}
      />
    </div>
  );
}