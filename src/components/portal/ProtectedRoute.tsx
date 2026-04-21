import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: "admin" | "customer";
}) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (requireRole && role !== requireRole) {
    // Admins can access customer routes too; customers cannot access admin
    if (requireRole === "admin" && role !== "admin") {
      return <Navigate to="/portal" replace />;
    }
    if (requireRole === "customer" && role === "admin") {
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
};