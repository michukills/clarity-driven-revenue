import { useEffect, useState } from "react";
import { Loader2, UserCheck, UserX, MessageSquare, ShieldX, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { adminAccountLinks } from "@/lib/adminAccountLinks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Req = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  business_website: string | null;
  industry: string | null;
  intended_access_type: string;
  requester_note: string | null;
  request_status:
    | "pending_review"
    | "clarification_requested"
    | "approved_client"
    | "approved_demo"
    | "denied"
    | "suspended";
  clarification_note: string | null;
  created_at: string;
  decided_at: string | null;
};

type Decision =
  | "approve_as_client"
  | "approve_as_demo"
  | "deny"
  | "suspend"
  | "request_clarification";

type ConfirmAction = {
  row: Req;
  decision: Decision;
};

const STATUS_TONE: Record<Req["request_status"], string> = {
  pending_review: "bg-muted/30 text-muted-foreground border-border",
  clarification_requested: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  approved_client: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  approved_demo: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  denied: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  suspended: "bg-rose-500/15 text-rose-300 border-rose-500/40",
};

export function SignupRequestsPanel() {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmNote, setConfirmNote] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminAccountLinks.listSignupRequests();
      setRows((data as Req[]) || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load signup requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const actionCopy = (decision: Decision) => {
    switch (decision) {
      case "approve_as_client":
        return {
          title: "Approve as Client",
          outcome: "Creates or links a client customer record and enables customer portal role/access.",
        };
      case "approve_as_demo":
        return {
          title: "Approve as Demo",
          outcome: "Creates or links a demo/test customer record and seeds demo-safe portal data where available.",
        };
      case "request_clarification":
        return {
          title: "Request Clarification",
          outcome: "Keeps this request blocked and records a clarification note for this exact user.",
        };
      case "suspend":
        return {
          title: "Suspend Request",
          outcome: "Blocks portal access for this exact request and suspends any linked customer record.",
        };
      case "deny":
      default:
        return {
          title: "Deny Request",
          outcome: "Blocks this exact signup from portal access and removes it from the active review queue.",
        };
    }
  };

  const confirmationHeadline = (action: ConfirmAction) => {
    const email = action.row.email;
    switch (action.decision) {
      case "approve_as_demo":
        return `You are about to approve ${email} as Demo`;
      case "approve_as_client":
        return `You are about to approve ${email} as Client`;
      case "request_clarification":
        return `You are about to request clarification from ${email}`;
      case "suspend":
        return `You are about to suspend ${email}`;
      case "deny":
      default:
        return `You are about to deny ${email}`;
    }
  };

  const openConfirm = (row: Req, decision: Decision) => {
    setRowErrors((prev) => ({ ...prev, [row.id]: "" }));
    setConfirmNote("");
    setConfirmAction({ row, decision });
  };

  const decide = async () => {
    if (!confirmAction) return;
    const { row: r, decision } = confirmAction;
    const note = ["deny", "suspend", "request_clarification"].includes(decision)
      ? confirmNote.trim() || null
      : null;
    const key = `${r.id}:${decision}`;
    setBusyAction(key);
    setRowErrors((prev) => ({ ...prev, [r.id]: "" }));
    try {
      const outcome = await adminAccountLinks.decideSignupRequest(r.id, decision, { clarification_note: note });
      // P83B — demo approvals auto-seed the Prairie Ridge HVAC demo workspace
      // server-side so testers land in a populated Owner Portal.
      if (decision === "approve_as_demo") {
        if (outcome.demo_seed?.ok) {
          toast.success("Approved as Demo — Prairie Ridge HVAC demo workspace seeded");
        } else if (outcome.demo_seed && !outcome.demo_seed.ok) {
          toast.warning("Approved as Demo, but demo seed needs review");
        } else {
          toast.success("Approved as Demo — customer linked; demo seed not required for this record");
        }
      } else if (decision === "approve_as_client") {
        toast.success("Approved as Client — customer linked and portal access enabled");
      } else if (decision === "request_clarification") {
        toast.success("Clarification requested — user remains safely blocked until review");
      } else if (decision === "suspend") {
        toast.success("Request suspended — portal access remains blocked");
      } else {
        toast.success("Request denied — portal access remains blocked");
      }
      setConfirmAction(null);
      setConfirmNote("");
      await load();
    } catch (e: any) {
      const message = e?.message || "Action failed";
      setRowErrors((prev) => ({ ...prev, [r.id]: message }));
      toast.error(message);
    } finally {
      setBusyAction(null);
    }
  };

  const pending = rows.filter((r) =>
    ["pending_review", "clarification_requested"].includes(r.request_status),
  );
  const decided = rows.filter(
    (r) => !["pending_review", "clarification_requested"].includes(r.request_status),
  );

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Portal Access Requests</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submitted via the public Request Portal Access form. Approval auto-provisions
            a customer record with the correct account type. No emails are sent from this
            screen — notification rows are queued for the existing pipeline.
          </p>
        </div>
        <button
          onClick={load}
          className="text-xs text-primary hover:text-secondary"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-6">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6">No portal access requests yet.</div>
      ) : (
        <div className="space-y-3">
          {[...pending, ...decided].map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-muted/10 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="text-sm text-foreground font-medium truncate">
                    {r.business_name || r.full_name || r.email}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {r.email} · {r.industry || "industry not provided"} ·{" "}
                    {r.intended_access_type.replace(/_/g, " ")}
                  </div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5 ${STATUS_TONE[r.request_status]}`}
                >
                  {r.request_status.replace(/_/g, " ")}
                </span>
              </div>

              {r.requester_note && (
                <div className="text-[11px] text-muted-foreground italic mb-2">
                  “{r.requester_note}”
                </div>
              )}
              {r.clarification_note && (
                <div className="text-[11px] text-amber-300/80 mb-2">
                  Note: {r.clarification_note}
                </div>
              )}
              {rowErrors[r.id] && (
                <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md px-2 py-1 mb-2">
                  {rowErrors[r.id]}
                </div>
              )}

              {["pending_review", "clarification_requested"].includes(r.request_status) && (
                <div className="rounded-lg border border-border bg-muted/10 p-2">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Actions for {r.email}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={!!busyAction && busyAction.startsWith(`${r.id}:`)}
                      onClick={() => openConfirm(r, "approve_as_client")}
                      className="inline-flex items-center gap-1 text-xs rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 px-2.5 py-1 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {busyAction === `${r.id}:approve_as_client` ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
                      Approve as Client
                    </button>
                    <button
                      disabled={!!busyAction && busyAction.startsWith(`${r.id}:`)}
                      onClick={() => openConfirm(r, "approve_as_demo")}
                      className="inline-flex items-center gap-1 text-xs rounded-md border border-sky-500/40 bg-sky-500/10 text-sky-300 px-2.5 py-1 hover:bg-sky-500/20 disabled:opacity-50"
                    >
                      {busyAction === `${r.id}:approve_as_demo` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Approve as Demo
                    </button>
                    <button
                      disabled={!!busyAction && busyAction.startsWith(`${r.id}:`)}
                      onClick={() => openConfirm(r, "request_clarification")}
                      className="inline-flex items-center gap-1 text-xs rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 px-2.5 py-1 hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      {busyAction === `${r.id}:request_clarification` ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
                      Request Clarification
                    </button>
                    <button
                      disabled={!!busyAction && busyAction.startsWith(`${r.id}:`)}
                      onClick={() => openConfirm(r, "deny")}
                      className="inline-flex items-center gap-1 text-xs rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 px-2.5 py-1 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {busyAction === `${r.id}:deny` ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />}
                      Deny
                    </button>
                    <button
                      disabled={!!busyAction && busyAction.startsWith(`${r.id}:`)}
                      onClick={() => openConfirm(r, "suspend")}
                      className="inline-flex items-center gap-1 text-xs rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 px-2.5 py-1 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {busyAction === `${r.id}:suspend` ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldX className="h-3 w-3" />}
                      Suspend
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          {confirmAction && (
            <>
              <DialogHeader>
                <DialogTitle>{confirmationHeadline(confirmAction)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Target account</div>
                  <div className="mt-1 font-medium text-foreground">{confirmAction.row.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {confirmAction.row.business_name || confirmAction.row.full_name || "No display name provided"} ·{" "}
                    {confirmAction.row.industry || "industry not provided"} ·{" "}
                    {confirmAction.row.request_status.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/10 p-3 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground mb-1">Action this will perform</div>
                  {actionCopy(confirmAction.decision).outcome}
                </div>
                {!confirmAction.row.industry && ["approve_as_client", "approve_as_demo"].includes(confirmAction.decision) && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                    Industry is missing. This approval should create/link the customer with needs_industry_review=true instead of blocking the account.
                  </div>
                )}
                {["deny", "suspend", "request_clarification"].includes(confirmAction.decision) && (
                  <label className="block text-xs text-muted-foreground">
                    Note for this exact request
                    <textarea
                      value={confirmNote}
                      onChange={(e) => setConfirmNote(e.target.value)}
                      className="mt-1 min-h-20 w-full rounded-md border border-border bg-muted/30 p-2 text-sm text-foreground outline-none focus:border-primary"
                      placeholder="Add the clarification, denial, or suspension note..."
                    />
                  </label>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={decide}
                    disabled={busyAction === `${confirmAction.row.id}:${confirmAction.decision}`}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-secondary disabled:opacity-50"
                  >
                    {busyAction === `${confirmAction.row.id}:${confirmAction.decision}` && <Loader2 className="h-3 w-3 animate-spin" />}
                    Confirm for {confirmAction.row.email}
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
