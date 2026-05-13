/**
 * P93F — Delete / archive confirmation dialog.
 *
 * Shows the exact email + identity tied to the destructive action, requires
 * the admin to type the email to confirm, and is honest about what happens.
 *
 * For real-client accounts (per P93A classifier) we add an extra warning band
 * because deletion of a real client is rarely the right move — Archive is
 * usually safer.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, AlertTriangle, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  classifyAccount,
  type AccountInput,
} from "@/lib/accounts/accountClassification";

export type DeleteAccountTarget = AccountInput & {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  is_demo_account?: boolean | null;
  archived_at?: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: DeleteAccountTarget;
  /** Async deletion handler. Should throw on failure. */
  onConfirmDelete: () => Promise<void> | void;
}

const CONSEQUENCES: ReadonlyArray<string> = [
  "Permanently deletes the customer record.",
  "Removes tool assignments, notes, tasks, checklist items, timeline entries, and uploads.",
  "Removes portal access tied to this customer record.",
  "Cannot be undone. Use Archive instead if you want to hide the account but keep data.",
];

export function DeleteAccountDialog({
  open,
  onOpenChange,
  customer,
  onConfirmDelete,
}: Props) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setTyped("");
      setBusy(false);
    }
  }, [open]);

  const email = (customer.email ?? "").trim();
  const classification = useMemo(() => classifyAccount(customer), [customer]);
  const isRealClient = classification.accountKind === "real_client";
  const matches =
    !!email && typed.trim().toLowerCase() === email.toLowerCase();
  const canSubmit = !!email && matches && !busy;

  const copyEmail = () => {
    if (!email) return;
    void navigator.clipboard.writeText(email).then(
      () => toast.success("Email copied"),
      () => toast.error("Could not copy email"),
    );
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onConfirmDelete();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="delete-account-dialog"
        className="max-w-lg border-destructive/40"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" /> Delete account
          </DialogTitle>
          <DialogDescription>
            Confirm the exact account you are about to remove. Type the
            account email to enable the delete button.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Target account
            </div>
            <div className="text-sm text-foreground break-words">
              {customer.full_name || "(no contact name)"}
              {customer.business_name ? (
                <span className="text-muted-foreground">
                  {" — "}
                  {customer.business_name}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span
                data-testid="delete-account-email"
                className="text-xs font-mono text-foreground break-all"
              >
                {email || "(no email on file — cannot delete via this flow)"}
              </span>
              {email ? (
                <button
                  type="button"
                  onClick={copyEmail}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  aria-label="Copy account email"
                  data-testid="delete-account-copy-email"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              ) : null}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground pt-1">
              ID: <span className="font-mono normal-case text-foreground">{customer.id}</span>
            </div>
          </div>

          {isRealClient ? (
            <div
              data-testid="delete-account-real-client-warning"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex gap-2"
            >
              <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-xs text-destructive">
                <strong>This is classified as a real client.</strong> Deleting
                a real client is rarely correct. Consider archiving instead so
                history, payments, and audit trail are preserved.
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-200">
                Safe to remove demo, test, prospect, or draft accounts. Real
                client deletion will surface an extra warning.
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              What will happen
            </div>
            <ul className="text-xs text-foreground/90 list-disc pl-5 space-y-0.5">
              {CONSEQUENCES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div>
            <label
              htmlFor="delete-account-confirm-input"
              className="text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              Type the account email to confirm
            </label>
            <Input
              id="delete-account-confirm-input"
              data-testid="delete-account-confirm-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={email || "no email on file"}
              disabled={!email || busy}
              autoComplete="off"
              className="mt-1 font-mono"
            />
            {email && typed && !matches ? (
              <div className="mt-1 text-[11px] text-destructive">
                Does not match the account email.
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            data-testid="delete-account-confirm-submit"
            disabled={!canSubmit}
            onClick={() => void submit()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {busy ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteAccountDialog;