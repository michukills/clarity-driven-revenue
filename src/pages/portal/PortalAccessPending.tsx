import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Loader2, Clock, CheckCircle2, ShieldX, AlertTriangle, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSignupRequestStatus } from "@/hooks/useSignupRequestStatus";

/**
 * P83A — Single safe screen shown to users whose signup request is not yet
 * approved. Renders different copy for pending / clarification / denied /
 * suspended states. Never shows tools, navigation, or another tenant's data.
 */
export default function PortalAccessPending() {
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const { request, hasCustomer, loading, blockingStatus } = useSignupRequestStatus();
  const [submitting, setSubmitting] = useState(false);

  // If a signed-in user has no signup_request yet (e.g. created via OAuth or
  // the sign-up flow without the form), try to backfill from localStorage so
  // they don't get stuck.
  useEffect(() => {
    if (loading || authLoading || !user || isAdmin || request || hasCustomer) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = window.localStorage.getItem("rgs.pending_signup_request");
        if (!raw) return;
        const payload = JSON.parse(raw);
        setSubmitting(true);
        await supabase.rpc("submit_signup_request", {
          _full_name: payload.full_name ?? null,
          _business_name: payload.business_name ?? null,
          _business_website: payload.business_website ?? null,
          _industry: payload.industry ?? null,
          _intended_access_type: payload.intended_access_type ?? "other",
          _requester_note: payload.requester_note ?? null,
          _consent: true,
        });
        window.localStorage.removeItem("rgs.pending_signup_request");
        if (!cancelled) window.location.reload();
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setSubmitting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, authLoading, user, isAdmin, request, hasCustomer]);

  const view = useMemo(() => {
    const status = blockingStatus ?? request?.request_status ?? "pending_review";
    switch (status) {
      case "denied":
        return {
          icon: ShieldX,
          tone: "text-[hsl(0_70%_70%)]",
          chip: "bg-[hsl(0_70%_55%/0.12)] border-[hsl(0_70%_55%/0.3)] text-[hsl(0_70%_70%)]",
          chipLabel: "Access Not Approved",
          title: "Access Not Approved",
          body: "Your portal access request was not approved. If you believe this is a mistake, contact RGS using the email below.",
        };
      case "suspended":
        return {
          icon: ShieldX,
          tone: "text-[hsl(0_70%_70%)]",
          chip: "bg-[hsl(0_70%_55%/0.12)] border-[hsl(0_70%_55%/0.3)] text-[hsl(0_70%_70%)]",
          chipLabel: "Suspended",
          title: "Portal Access Suspended",
          body: "This account has been suspended. Contact RGS if you need to discuss reinstatement.",
        };
      case "clarification_requested":
        return {
          icon: MessageSquare,
          tone: "text-[hsl(38_90%_70%)]",
          chip: "bg-[hsl(38_90%_55%/0.12)] border-[hsl(38_90%_55%/0.3)] text-[hsl(38_90%_70%)]",
          chipLabel: "Clarification Requested",
          title: "RGS Has a Question About Your Request",
          body: "RGS reviewed your request and needs a quick clarification before activating access. See the note below and reply by email.",
        };
      default:
        return {
          icon: Clock,
          tone: "text-muted-foreground",
          chip: "bg-muted/20 border-border text-muted-foreground",
          chipLabel: "Pending Review",
          title: "Portal Access Pending Review",
          body: "Your request has been received. RGS reviews new portal accounts before granting access so the correct workspace, account type, and tools are assigned.",
        };
    }
  }, [blockingStatus, request]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;

  // If user is fully approved (has a customer row and no blocking status),
  // get them out of this screen.
  if (hasCustomer && !blockingStatus) return <Navigate to="/portal" replace />;

  // If they don't have a request row AND don't have a customer row, they're
  // a brand-new account that didn't go through the request form (e.g. Google
  // OAuth). Send them back to /auth so they can submit the request form.
  if (!request && !hasCustomer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="text-2xl text-foreground">Finish Your Portal Access Request</h1>
          <p className="text-sm text-muted-foreground">
            Your account exists, but RGS has not yet received a portal access
            request. Submit the short Request Portal Access form so an admin
            can review your account.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground py-2.5 px-5 text-sm font-medium hover:bg-secondary transition-colors"
          >
            Open Request Form
          </Link>
          <div>
            <button
              onClick={signOut}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const Icon = view.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">RGS</div>
          <h1 className="mt-3 text-3xl text-foreground">{view.title}</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
          <div className="flex items-start gap-3">
            <Icon className={`h-5 w-5 mt-0.5 ${view.tone}`} />
            <p className="text-sm text-muted-foreground leading-relaxed">{view.body}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="uppercase tracking-wider text-muted-foreground/70">Business</div>
              <div className="mt-1 text-foreground">{request?.business_name || "—"}</div>
            </div>
            <div>
              <div className="uppercase tracking-wider text-muted-foreground/70">Intended access</div>
              <div className="mt-1 text-foreground capitalize">
                {(request?.intended_access_type ?? "other").replace(/_/g, " ")}
              </div>
            </div>
            <div>
              <div className="uppercase tracking-wider text-muted-foreground/70">Status</div>
              <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 ${view.chip}`}>
                {view.chipLabel}
              </span>
            </div>
            <div>
              <div className="uppercase tracking-wider text-muted-foreground/70">Submitted</div>
              <div className="mt-1 text-foreground">
                {request?.created_at ? new Date(request.created_at).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>

          {request?.clarification_note && (
            <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <div className="uppercase tracking-wider text-foreground/80 mb-1">Note from RGS</div>
              {request.clarification_note}
            </div>
          )}

          <div className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3">
            <a
              href="mailto:info@revenueandgrowthsystems.com?subject=Portal Access Request"
              className="inline-flex items-center gap-1 text-xs text-primary hover:text-secondary"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Contact RGS support
            </a>
            <button
              onClick={signOut}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Sign out
            </button>
          </div>

          {submitting && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Submitting your request…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
