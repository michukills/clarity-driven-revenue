import { useEffect, useState } from "react";
import { Loader2, UserCheck, UserX, MessageSquare, ShieldX, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { adminAccountLinks } from "@/lib/adminAccountLinks";

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
  const [busy, setBusy] = useState<string | null>(null);

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

  const decide = async (
    r: Req,
    decision: "approve_as_client" | "approve_as_demo" | "deny" | "suspend" | "request_clarification",
    confirmText: string,
  ) => {
    if (!window.confirm(confirmText)) return;
    let note: string | null = null;
    if (decision === "deny" || decision === "suspend" || decision === "request_clarification") {
      note = window.prompt("Note (visible to admin; clarification is shown to user):", "") || null;
    }
    setBusy(r.id);
    try {
      const res: any = await adminAccountLinks.decideSignupRequest(r.id, decision, { clarification_note: note });
      // P83B — surface demo-seed result so the admin can confirm the
      // Prairie Ridge HVAC demo workspace was provisioned.
      if (decision === "approve_as_demo") {
        const seedOk = res?.demo_seed?.ok !== false;
        toast.success(
          seedOk
            ? "Approved as Demo — Prairie Ridge HVAC demo workspace seeded"
            : "Approved as Demo — workspace partially seeded (see logs)",
        );
      } else {
        toast.success(`Request ${decision.replace(/_/g, " ")}`);
      }
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    } finally {
      setBusy(null);
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

              {["pending_review", "clarification_requested"].includes(r.request_status) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    disabled={busy === r.id}
                    onClick={() =>
                      decide(
                        r,
                        "approve_as_client",
                        `Approve ${r.email} as a Client and provision Owner Portal access?`,
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 px-2.5 py-1 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    <UserCheck className="h-3 w-3" /> Approve as Client
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() =>
                      decide(
                        r,
                        "approve_as_demo",
                        `Approve ${r.email} as a Demo account (demo-safe data only)?`,
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs rounded-md border border-sky-500/40 bg-sky-500/10 text-sky-300 px-2.5 py-1 hover:bg-sky-500/20 disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" /> Approve as Demo
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => decide(r, "request_clarification", `Send clarification request to ${r.email}?`)}
                    className="inline-flex items-center gap-1 text-xs rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 px-2.5 py-1 hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    <MessageSquare className="h-3 w-3" /> Request Clarification
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => decide(r, "deny", `Deny / mark spam for ${r.email}? Login will be blocked.`)}
                    className="inline-flex items-center gap-1 text-xs rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 px-2.5 py-1 hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    <UserX className="h-3 w-3" /> Deny
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => decide(r, "suspend", `Suspend ${r.email}? Portal access will be blocked.`)}
                    className="inline-flex items-center gap-1 text-xs rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 px-2.5 py-1 hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    <ShieldX className="h-3 w-3" /> Suspend
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
