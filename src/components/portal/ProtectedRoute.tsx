import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: "admin" | "customer";
}) => {
  const { user, role, isAdmin, previewAsClient, loading } = useAuth();

  if (loading) {
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

  // Customer route: customers always allowed; admins allowed only when in preview mode
  if (requireRole === "customer" && isAdmin && !previewAsClient) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};