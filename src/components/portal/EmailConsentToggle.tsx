/**
 * P86 — Client Email Consent Toggle.
 *
 * Lets a signed-in client see and update their own RGS email-consent
 * status. Reads via RLS on email_communication_consents (own rows only).
 * Final consent wording should be reviewed by qualified counsel.
 */
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  EMAIL_CONSENT_TEXT,
  EMAIL_CONSENT_LEGAL_REVIEW_NOTE,
  getEmailConsentStatus,
  recordEmailConsent,
  revokeEmailConsent,
  type EmailConsentRow,
} from "@/lib/emailConsent";

export function EmailConsentToggle() {
  const { user } = useAuth();
  const [row, setRow] = useState<EmailConsentRow | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (!user?.email) return;
    try { setRow(await getEmailConsentStatus({ userId: user.id, email: user.email })); }
    catch { /* ignore */ }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [user?.id]);

  if (!user?.email) return null;

  const isActive = row?.consent_status === "active" && row?.unsubscribe_status === "subscribed";

  const grant = async () => {
    setBusy(true);
    try {
      await recordEmailConsent({
        user_id: user.id,
        email: user.email!,
        consent_source: "preference_center",
      });
      toast.success("Email consent recorded");
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const revoke = async () => {
    if (!row?.id) return;
    setBusy(true);
    try {
      await revokeEmailConsent(row.id);
      toast.success("Email consent revoked");
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Email communication permission
          </div>
        </div>
        <Badge variant="outline" className={isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : ""}>
          {isActive ? "Active" : (row?.consent_status ?? "missing")}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{EMAIL_CONSENT_TEXT}</p>
      <div className="mt-3 flex gap-2">
        {isActive ? (
          <Button size="sm" variant="outline" onClick={revoke} disabled={busy}>Revoke / unsubscribe</Button>
        ) : (
          <Button size="sm" onClick={grant} disabled={busy}>Grant email consent</Button>
        )}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground italic">{EMAIL_CONSENT_LEGAL_REVIEW_NOTE}</p>
    </section>
  );
}

export default EmailConsentToggle;