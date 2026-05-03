import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  // P31: Public signup is disabled. Portal accounts are created only via a
  // one-time invite issued after the $3,000 Diagnostic is paid and reviewed.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

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
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">RGS</div>
          <h1 className="mt-3 text-3xl text-foreground">Client Portal</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your workspace
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
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
              Portal accounts are created by RGS after the Diagnostic is purchased.
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
