import { Textarea } from "@/components/ui/textarea";

interface Props {
  internalNotes: string;
  clientNotes: string;
  onInternalChange: (v: string) => void;
  onClientChange: (v: string) => void;
  internalPlaceholder?: string;
  clientPlaceholder?: string;
}

/**
 * Standard Admin Notes / Client Notes split used by every RGS diagnostic tool.
 * Internal notes are admin-only and never rendered in the client view.
 */
export function DiagnosticNotesPanel({
  internalNotes,
  clientNotes,
  onInternalChange,
  onClientChange,
  internalPlaceholder = "Where does friction show up? Which area is the priority fix? Internal hypotheses…",
  clientPlaceholder = "Plain-language summary, recommended focus, or context the client should see.",
}: Props) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div>
        <h3 className="text-foreground">Internal notes</h3>
        <p className="text-xs text-muted-foreground mt-0.5">For the RGS team only — never visible to the client.</p>
        <Textarea
          value={internalNotes}
          onChange={(e) => onInternalChange(e.target.value)}
          placeholder={internalPlaceholder}
          className="mt-3 bg-muted/30 border-border min-h-[100px]"
        />
      </div>
      <div className="border-t border-border pt-4">
        <h3 className="text-foreground">Note for the client</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Shown at the bottom of the client view inside their portal.</p>
        <Textarea
          value={clientNotes}
          onChange={(e) => onClientChange(e.target.value)}
          placeholder={clientPlaceholder}
          className="mt-3 bg-muted/30 border-border min-h-[100px]"
        />
      </div>
    </section>
  );
}