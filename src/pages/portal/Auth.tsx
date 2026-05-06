import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  // P31 + P83A: Public signup is "Request Portal Access" — every new account
  // lands in the admin New Accounts queue with status `pending_review` and
  // gets no portal/tool/admin access until an admin approves as Client or
  // Demo. The paid Diagnostic → ClaimInvite path remains untouched.
  const [mode, setMode] = useState<"signin" | "request">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [intendedAccessType, setIntendedAccessType] =
    useState<"diagnostic_client" | "demo_test" | "existing_client" | "other">("diagnostic_client");
  const [requesterNote, setRequesterNote] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(isAdmin ? "/admin" : "/portal", { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast.error("Please acknowledge the access review notice.");
      return;
    }
    if (!fullName.trim() || !businessName.trim()) {
      toast.error("Full name and business name are required.");
      return;
    }
    setBusy(true);
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal`,
          data: { full_name: fullName.trim() },
        },
      });
      if (signUpErr) throw signUpErr;
      // If email confirmation is required, the user has no session yet — the
      // request row will be created the next time they sign in (Pending screen
      // re-prompts). If we DO have a session, submit the request now.
      if (signUpData.session) {
        const { error: rpcErr } = await supabase.rpc("submit_signup_request", {
          _full_name: fullName.trim(),
          _business_name: businessName.trim(),
          _business_website: businessWebsite.trim() || null,
          _industry: industry.trim() || null,
          _intended_access_type: intendedAccessType,
          _requester_note: requesterNote.trim() || null,
          _consent: true,
        });
        if (rpcErr) throw rpcErr;
      }
      // Stash the request payload for the pending screen to submit if the
      // session arrives later (after email confirmation).
      try {
        window.localStorage.setItem(
          "rgs.pending_signup_request",
          JSON.stringify({
            full_name: fullName.trim(),
            business_name: businessName.trim(),
            business_website: businessWebsite.trim() || null,
            industry: industry.trim() || null,
            intended_access_type: intendedAccessType,
            requester_note: requesterNote.trim() || null,
          }),
        );
      } catch { /* storage optional */ }
      toast.success("Request received. RGS will review your portal access.");
      setMode("signin");
    } catch (err: any) {
      toast.error(err.message || "Could not submit request");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/portal`,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md py-12">
        <div className="text-center mb-10">
          <div className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">RGS</div>
          <h1 className="mt-3 text-3xl text-foreground">RGS Control Center</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to your workspace" : "Request access to the Owner Portal"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="mb-6 flex rounded-md border border-border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 transition-colors ${
                mode === "signin"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("request")}
              className={`flex-1 py-2 transition-colors ${
                mode === "request"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Request Portal Access
            </button>
          </div>

          {mode === "signin" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 bg-muted/40 border-border"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-2 bg-muted/40 border-border"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-primary text-primary-foreground py-3 rounded-md font-medium text-sm hover:bg-secondary transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>
          </form>
          ) : (
          <form onSubmit={handleRequestAccess} className="space-y-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
              RGS reviews new portal requests to protect client data, prevent
              spam accounts, and make sure each account is set up correctly.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Full name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-2 bg-muted/40 border-border" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Business name</label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="mt-2 bg-muted/40 border-border" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 bg-muted/40 border-border" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-2 bg-muted/40 border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Website (optional)</label>
                <Input value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} placeholder="https://" className="mt-2 bg-muted/40 border-border" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Industry</label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Professional Services" className="mt-2 bg-muted/40 border-border" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Intended access</label>
              <select
                value={intendedAccessType}
                onChange={(e) => setIntendedAccessType(e.target.value as typeof intendedAccessType)}
                className="mt-2 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
              >
                <option value="diagnostic_client">Diagnostic client</option>
                <option value="demo_test">Demo / test access</option>
                <option value="existing_client">Existing client</option>
                <option value="other">Other / not sure</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Reason for access (optional)</label>
              <Textarea value={requesterNote} onChange={(e) => setRequesterNote(e.target.value)} maxLength={500} className="mt-2 bg-muted/40 border-border min-h-[70px]" />
            </div>
            <label className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed pt-1">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              <span>I understand portal access is reviewed by RGS before being granted, and that submitting this request does not guarantee approval.</span>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-primary text-primary-foreground py-3 rounded-md font-medium text-sm hover:bg-secondary transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Request Portal Access
            </button>
          </form>
          )}

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full border border-border py-3 rounded-md text-sm text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            Continue with Google
          </button>

          <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
            <p>
              Paid Diagnostic clients receive a one-time invite link directly from RGS.
            </p>
            <p>
              Have an invite link?{" "}
              <Link to="/claim-invite" className="text-primary hover:text-secondary">
                Open it here
              </Link>
              .
            </p>
            <p>
              Interested in working with RGS?{" "}
              <Link to="/diagnostic-apply" className="text-primary hover:text-secondary">
                Apply for the Diagnostic
              </Link>
              .
            </p>
            <p className="pt-2 text-[11px] text-muted-foreground/70 leading-relaxed">
              By signing in you agree to the{" "}
              <Link to="/eula" className="underline hover:text-primary">Terms (EULA)</Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
              RGS does not guarantee revenue or business outcomes and does not
              provide legal, tax, accounting, or financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
