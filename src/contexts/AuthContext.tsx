import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "platform_owner" | "admin" | "customer" | null;

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: Role;            // The user's *true* role from DB
  effectiveRole: Role;   // Role used by UI (can be temporarily overridden by admin "preview as client")
  isAdmin: boolean;          // True for admin OR platform_owner, regardless of preview
  isPlatformOwner: boolean;  // True only for platform_owner
  previewAsClient: boolean;          // True when admin/owner is actively previewing a client
  previewCustomerId: string | null;  // Selected customer id being previewed
  setPreviewCustomer: (customerId: string | null) => void; // null exits preview
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  role: null,
  effectiveRole: null,
  isAdmin: false,
  isPlatformOwner: false,
  previewAsClient: false,
  previewCustomerId: null,
  setPreviewCustomer: () => {},
  loading: true,
  signOut: async () => {},
});

const PREVIEW_CUSTOMER_KEY = "rgs.preview_customer_id";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [previewCustomerId, setPreviewCustomerIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(PREVIEW_CUSTOMER_KEY) || null;
  });

  const setPreviewCustomer = (customerId: string | null) => {
    const previousCustomerId = previewCustomerId;
    setPreviewCustomerIdState(customerId);
    if (typeof window !== "undefined") {
      if (customerId) {
        window.localStorage.setItem(PREVIEW_CUSTOMER_KEY, customerId);
      } else {
        window.localStorage.removeItem(PREVIEW_CUSTOMER_KEY);
      }
    }
    // Best-effort audit logging of preview enter/exit. Never block the UI
    // on failure (e.g., RLS denies for non-admins, network errors, etc.).
    void (async () => {
      try {
        const route =
          typeof window !== "undefined" ? window.location.pathname : null;
        if (customerId && customerId !== previousCustomerId) {
          await supabase.from("activity_log").insert({
            action: "client_preview_started",
            actor_id: user?.id ?? null,
            customer_id: customerId,
            details: { route, source: "portal_shell" },
          });
        } else if (!customerId && previousCustomerId) {
          await supabase.from("activity_log").insert({
            action: "client_preview_ended",
            actor_id: user?.id ?? null,
            customer_id: previousCustomerId,
            details: { route, source: "portal_shell" },
          });
        }
      } catch {
        // best-effort only
      }
    })();
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
      // Precedence: platform_owner > admin > customer
      if (data.some((r) => r.role === "platform_owner")) setRole("platform_owner");
      else if (data.some((r) => r.role === "admin")) setRole("admin");
      else setRole("customer");
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
    setPreviewCustomer(null);
  };

  const isPlatformOwner = role === "platform_owner";
  const isAdmin = role === "admin" || isPlatformOwner;
  const previewAsClient = isAdmin && !!previewCustomerId;
  // Admin/owner can opt into client preview by selecting a customer; underlying role stays admin
  const effectiveRole: Role = previewAsClient ? "customer" : role;

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        role,
        effectiveRole,
        isAdmin,
        isPlatformOwner,
        previewAsClient,
        previewCustomerId: previewAsClient ? previewCustomerId : null,
        setPreviewCustomer,
        loading,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
