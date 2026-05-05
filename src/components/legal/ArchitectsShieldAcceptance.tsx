import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AGREEMENT_REGISTRY,
  type AgreementKey,
  type AcceptanceContext,
} from "@/config/architectsShield";
import {
  getLatestAcknowledgment,
  recordAcknowledgment,
  type ClientAcknowledgmentRow,
} from "@/lib/legal/clientAcknowledgments";
import { useAuth } from "@/contexts/AuthContext";

/**
 * P69 — Reusable click-wrap acceptance card for an Architect's Shield™
 * agreement. Persists acceptance through `client_acknowledgments`.
 *
 * Calls `onAccepted` once the row has been created (or once it loads
 * an existing valid acceptance for the current version).
 */
export function ArchitectsShieldAcceptance({
  customerId,
  agreementKey,
  context,
  onAccepted,
}: {
  customerId: string;
  agreementKey: AgreementKey;
  context: AcceptanceContext;
  onAccepted?: (row: ClientAcknowledgmentRow | { existing: true }) => void;
}) {
  const def = AGREEMENT_REGISTRY[agreementKey];
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await getLatestAcknowledgment(customerId, agreementKey);
        if (cancelled) return;
        if (row && row.agreement_version === def.version) {
          setAccepted(true);
          onAccepted?.({ existing: true });
        }
      } catch {
        // non-fatal — UI shows acceptance form
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, agreementKey, def.version]);

  const handleAccept = async () => {
    if (!user) {
      toast.error("Sign in required to acknowledge.");
      return;
    }
    if (!confirmed) {
      toast.error("Confirm the acknowledgment to continue.");
      return;
    }
    setBusy(true);
    try {
      const row = await recordAcknowledgment({
        customerId,
        userId: user.id,
        agreementKey,
        context,
      });
      setAccepted(true);
      onAccepted?.(row);
      toast.success("Acknowledgment recorded");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not record acknowledgment");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-6 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking acknowledgment…
      </div>
    );
  }

  if (accepted) {
    return (
      <div
        data-testid="architects-shield-accepted"
        className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs text-foreground flex items-center gap-2"
      >
        <ShieldCheck className="h-4 w-4 text-primary" />
        Acknowledgment on file: {def.name} (v{def.version}).
      </div>
    );
  }

  return (
    <section
      data-testid="architects-shield-acceptance"
      className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4"
    >
      <header className="flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-primary mt-0.5" />
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Architect&rsquo;s Shield&trade;
          </div>
          <h3 className="text-base text-foreground mt-1">{def.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{def.summary}</p>
        </div>
      </header>
      <div className="space-y-2 text-xs text-foreground/90 leading-relaxed max-h-64 overflow-auto pr-1">
        {def.body.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I have read and accept the {def.name} (version {def.version}). I
          understand that RGS is a Business Systems Architect, not my
          operator, attorney, CPA, fiduciary, lender, appraiser, or
          regulator, and that I remain responsible for my business
          decisions and outcomes.
        </span>
      </label>
      <button
        type="button"
        onClick={handleAccept}
        disabled={busy || !confirmed}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-secondary transition-colors disabled:opacity-50"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Acknowledge & continue
      </button>
    </section>
  );
}

export default ArchitectsShieldAcceptance;