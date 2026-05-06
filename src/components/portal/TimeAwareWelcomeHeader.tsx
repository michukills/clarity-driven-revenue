import { useMemo } from "react";
import { Sun, Compass } from "lucide-react";
import {
  composeGreetingLine,
  greetingForTimeZone,
  RGS_OPERATING_STRUCTURE_SENTENCE,
} from "@/lib/welcomeGreeting";

/**
 * P86B — Time-aware client welcome header.
 * Calm, premium, never overwhelming. Uses the visitor's local time when
 * the browser exposes a time zone; otherwise falls back to "Welcome back."
 */
export function TimeAwareWelcomeHeader({
  displayName,
  stageBlurb,
  timeZone,
}: {
  displayName?: string | null;
  stageBlurb?: string | null;
  timeZone?: string | null;
}) {
  const greetingLine = useMemo(() => {
    let tz = timeZone || null;
    if (!tz) {
      try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
      } catch {
        tz = null;
      }
    }
    const greeting = greetingForTimeZone(new Date(), tz || undefined);
    return composeGreetingLine({ greeting, displayName });
  }, [displayName, timeZone]);

  return (
    <header className="mb-8 space-y-3">
      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Sun className="h-3 w-3" /> RGS Portal
      </div>
      <h1 className="text-2xl sm:text-3xl text-foreground font-light tracking-tight break-words">
        {greetingLine}
      </h1>
      <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
        {stageBlurb || RGS_OPERATING_STRUCTURE_SENTENCE}
      </p>
      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Compass className="h-3.5 w-3.5" />
        Where you are in the RGS process is shown below.
      </div>
    </header>
  );
}