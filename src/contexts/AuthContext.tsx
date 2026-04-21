import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "admin" | "customer" | null;

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: Role;            // The user's *true* role from DB
  effectiveRole: Role;   // Role used by UI (can be temporarily overridden by admin "preview as client")
  isAdmin: boolean;      // Admin regardless of preview mode
  previewAsClient: boolean;
  setPreviewAsClient: (v: boolean) => void;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  role: null,
  effectiveRole: null,
  isAdmin: false,
  previewAsClient: false,
  setPreviewAsClient: () => {},
  loading: true,
  signOut: async () => {},
});

const PREVIEW_KEY = "rgs.preview_as_client";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [previewAsClient, setPreviewAsClientState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(PREVIEW_KEY) === "1";
  });

  const setPreviewAsClient = (v: boolean) => {
    setPreviewAsClientState(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREVIEW_KEY, v ? "1" : "0");
    }
  };

  const fetchRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      // Don't assume customer on error — leave as null so UI shows loading
      setRole(null);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      // Admin precedence — if any row is admin, user is admin
      const isAdmin = data.some((r) => r.role === "admin");
      setRole(isAdmin ? "admin" : "customer");
    } else {
      // No role row exists yet — treat as customer (default for new signups)
      setRole("customer");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Set listener BEFORE getSession to avoid race
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer DB call to avoid deadlock with auth callback
        setTimeout(() => fetchRole(sess.user.id), 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [fetchRole]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setPreviewAsClient(false);
  };

  const isAdmin = role === "admin";
  // Admin can opt into client preview, but the underlying role stays admin
  const effectiveRole: Role = isAdmin && previewAsClient ? "customer" : role;

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        role,
        effectiveRole,
        isAdmin,
        previewAsClient: isAdmin && previewAsClient,
        setPreviewAsClient,
        loading,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
