// P17 — Client portal panel for requesting account deactivation or
// add-on cancellation. Submits a record to client_service_requests.
// Never deletes or archives anything itself — admin reviews and acts.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, AlertCircle, ShieldCheck, CircleSlash, Inbox } from "lucide-react";
import {
  createServiceRequest,
  loadOwnRequests,
  REQUEST_TYPE_LABEL,
  STATUS_LABEL,
  type ServiceRequestRow,
  type ServiceRequestType,
} from "@/lib/serviceRequests";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";

export function ServiceRequestPanel() {
  const { customerId, loading: idLoading } = usePortalCustomerId();
  const [rows, setRows] = useState<ServiceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<ServiceRequestType | null>(null);
  const [reason, setReason] = useState("");
  const [addonKey, setAddonKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      setRows(await loadOwnRequests(customerId));
    } catch {
      // RLS will simply return nothing if not allowed; nothing to surface.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!idLoading) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, idLoading]);

  const submit = async () => {
    if (!customerId || !open) return;
    setSubmitting(true);
    try {
      await createServiceRequest({
        customerId,
        requestType: open,
        reason,
        addonKey: open === "addon_cancellation" ? addonKey || null : null,
      });
      toast.success(
        "Your request has been sent to RGS. Your account will remain available until the request is reviewed."
      );
      setOpen(null);
      setReason("");
      setAddonKey("");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingDeact = rows.find(
    (r) => r.request_type === "account_deactivation" && r.status === "pending"
  );

  if (!customerId && !idLoading) return null;

  return (
    <section className="bg-card border border-border rounded-xl p-6 max-w-xl space-y-4">
      <header>
        <h2 className="text-base text-foreground font-medium">Service changes</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Need to pause or close your account, or cancel an add-on? Send a request and the
          RGS team will follow up. Your records are kept either way.
        </p>
      </header>

      {pendingDeact ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-amber-100">
              Your account deactivation request is pending RGS review.
            </div>
            <div className="mt-0.5 text-amber-200/80">
              Submitted {new Date(pendingDeact.created_at).toLocaleString()}. You can keep using
              your account until it has been reviewed.
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
        <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
        <span>
          Submitting a request does not change your account immediately. Reports, tasks, and
          history are always retained.
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen("account_deactivation")}
          disabled={!customerId}
          className="border-border"
        >
          <CircleSlash className="h-3.5 w-3.5" /> Request account deactivation
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen("addon_cancellation")}
          disabled={!customerId}
          className="border-border"
        >
          <Inbox className="h-3.5 w-3.5" /> Request add-on cancellation
        </Button>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          Your recent requests
        </div>
        {loading ? (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-muted-foreground">No requests yet.</div>
        ) : (
          <ul className="space-y-1.5">
            {rows.slice(0, 5).map((r) => (
              <li
                key={r.id}
                className="text-xs border border-border rounded-md p-2 flex items-center gap-2"
              >
                <span className="text-foreground">{REQUEST_TYPE_LABEL[r.request_type]}</span>
                <span className="text-muted-foreground">
                  · {new Date(r.created_at).toLocaleDateString()}
                </span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                  {STATUS_LABEL[r.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{open ? REQUEST_TYPE_LABEL[open] : ""}</DialogTitle>
            <DialogDescription>
              Tell us briefly why. RGS will review and follow up — your records stay safe either way.
            </DialogDescription>
          </DialogHeader>
          {open === "addon_cancellation" ? (
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Add-on (optional)
              </label>
              <Input
                value={addonKey}
                onChange={(e) => setAddonKey(e.target.value)}
                placeholder="e.g. Revenue Tracker, Monitoring"
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Reason (optional)
            </label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Anything you'd like the RGS team to know."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)} className="border-border">
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
