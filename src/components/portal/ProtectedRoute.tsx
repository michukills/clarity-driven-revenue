import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSignupRequestStatus } from "@/hooks/useSignupRequestStatus";

export const ProtectedRoute = ({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: "admin" | "customer";
}) => {
  const { user, isAdmin, previewAsClient, loading } = useAuth();
  const location = useLocation();
  const { blockingStatus, loading: signupLoading } = useSignupRequestStatus();

  if (loading || signupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Admin route: only true admins
  if (requireRole === "admin" && !isAdmin) {
    return <Navigate to="/portal" replace />;
  }

  // P83A — Pending / clarification / denied / suspended users never reach
  // portal or admin routes. They are sent to a single safe screen that shows
  // their status and a sign-out option.
  if (!isAdmin && blockingStatus && location.pathname !== "/portal-access-pending") {
    return <Navigate to="/portal-access-pending" replace />;
  }

  // Customer route: customers always allowed; admins allowed only when in preview mode
  if (requireRole === "customer" && isAdmin && !previewAsClient) {
    return <Navigate to="/admin" replace />;
  }

  // Portal routes default admins back to admin view. Admins enter the client
  // surface only through the explicit "View as client" preview workflow.
  if (!requireRole && location.pathname.startsWith("/portal") && isAdmin && !previewAsClient) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
