import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Lock, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

type Invite = {
  invite_id: string;
  customer_id: string;
  email: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

const schema = z.object({
  fullName: z.string().trim().min(1, "Required").max(200),
  password: z.string().min(8, "At least 8 characters").max(128),
});

export default function ClaimInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!token) {
        setError("This page requires an invite link. Check your email for the secure link from RGS.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("lookup_invite_by_token", { _token: token });
      if (cancelled) return;
      if (error) {
        setError("We couldn't verify this invite. Please try again or contact RGS.");
        setLoading(false);
        return;
      }
      const row = (Array.isArray(data) ? data[0] : data) as Invite | undefined;
      if (!row) {
        setError("This invite link isn't valid. Ask RGS to send a new one.");
        setLoading(false);
        return;
      }
      if (row.revoked_at) {
        setError("This invite has been revoked. Contact RGS for a new link.");
        setLoading(false);
        return;
      }
      if (row.accepted_at) {
        setError("This invite has already been used. Please sign in instead.");
        setLoading(false);
        return;
      }
      if (new Date(row.expires_at).getTime() < Date.now()) {
        setError("This invite link has expired. Contact RGS for a new one.");
        setLoading(false);
        return;
      }
      setInvite(row);
      setLoading(false);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    const parsed = schema.safeParse({ fullName, password });
    if (!parsed.success) {
      toast({
        title: "Check your details",
        description: parsed.error.issues[0]?.message ?? "",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      // Create or sign in to the auth user pinned to the invite email.
      let signedIn = false;
      const { error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/portal`,
        },
      });
      if (signUpError) {
        // If user already exists, try sign-in.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invite.email,
          password,
        });
        if (signInError) {
          throw new Error(
            "An account already exists for this email. Use your existing password, or reset it from the sign-in page.",
          );
        }
        signedIn = true;
      }
      // After signUp, depending on auth settings, the user may be auto-signed-in.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session && !signedIn) {
        // Try sign-in with the password they just set.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invite.email,
          password,
        });
        if (signInError) {
          throw new Error(
            "Account created. Please check your email to confirm, then return to this link.",
          );
        }
      }
      // Accept the invite (RPC links auth user to customer).
      const { data: acceptedCustomerId, error: acceptError } = await supabase.rpc(
        "accept_portal_invite",
        { _token: token },
      );
      if (acceptError) {
        throw new Error(acceptError.message ?? "Could not finalize portal access.");
      }
      // Best-effort owner/admin alert; never blocks the client's flow.
      if (acceptedCustomerId) {
        supabase.functions
          .invoke("notify-admin-event", {
            body: { event: "portal_invite_accepted", customerId: acceptedCustomerId },
          })
          .catch(() => {});
      }
      toast({ title: "Welcome to RGS", description: "Your portal is ready." });
      navigate("/portal", { replace: true });
    } catch (err: any) {
      toast({
        title: "Could not complete sign-up",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-24">
      <SEO
        title="Claim Your RGS Portal Invite"
        description="Use your secure invite link to create your RGS client portal account."
        canonical="/claim-invite"
        noindex
      />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent/90 mb-3">
            <Lock className="w-3.5 h-3.5" /> Secure Invite
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Create Your RGS Portal Account</h1>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Verifying invite…
          </div>
        )}

        {!loading && error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-2xl p-8 text-center">
            <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto mb-4" />
            <p className="text-foreground/90 mb-6">{error}</p>
            <Link to="/auth" className="text-primary hover:text-secondary text-sm">
              Go to sign in
            </Link>
          </motion.div>
        )}

        {!loading && invite && !error && (
          <div className="bg-card border border-border rounded-2xl p-8">
            <p className="text-sm text-muted-foreground mb-6">
              This invite is for{" "}
              <span className="text-foreground font-medium">{invite.email}</span>. Set a password
              to access your portal.
            </p>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Full name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)}
                  required maxLength={200} className="mt-2 bg-muted/40 border-border" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={8} className="mt-2 bg-muted/40 border-border" />
                <p className="text-[11px] text-muted-foreground/70 mt-1">At least 8 characters.</p>
              </div>
              <button type="submit" disabled={busy}
                className="w-full bg-primary text-primary-foreground py-3 rounded-md font-medium text-sm hover:bg-secondary transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {busy ? "Setting up…" : "Create account & enter portal"}
                {!busy && <CheckCircle2 className="w-4 h-4" />}
              </button>
            </form>
            <p className="mt-6 text-[11px] text-muted-foreground/70 leading-relaxed text-center">
              By creating your account you agree to the{" "}
              <Link to="/eula" className="underline hover:text-primary">Terms (EULA)</Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
              RGS does not guarantee revenue or business outcomes and does not
              provide legal, tax, accounting, or financial advice.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}