import { CalendarClock } from "lucide-react";
import { DIAGNOSTIC_TIMELINE_STEPS } from "@/lib/welcomeGreeting";

/**
 * P86B — Client-safe diagnostic timeline. Reflects the standard 10-day
 * diagnostic cadence. Reminders are described as admin-tracked because
 * automated send is not implemented.
 */
export function DiagnosticTimelinePanel({
  currentStep,
}: {
  currentStep?: string | null;
}) {
  return (
    <section className="mt-8 space-y-3 min-w-0">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <CalendarClock className="h-3 w-3" /> Diagnostic Timeline
      </div>
      <h2 className="text-lg sm:text-xl text-foreground font-light tracking-tight">
        What to expect, day by day
      </h2>
      <ol className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
        {DIAGNOSTIC_TIMELINE_STEPS.map((step) => {
          const active = currentStep === step.key;
          return (
            <li
              key={step.key}
              className={`p-4 flex items-start gap-4 ${active ? "bg-primary/5" : ""}`}
            >
              <div className="shrink-0 w-12 text-xs uppercase tracking-wider text-muted-foreground">
                Day {step.day}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-foreground">{step.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed mt-1">
                  {step.body}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-[11px] text-muted-foreground italic">
        Reminders shown here are tracked by your RGS admin team. Automated send is
        not enabled.
      </p>
    </section>
  );
}