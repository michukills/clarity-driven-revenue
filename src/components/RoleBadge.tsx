import { Shield, User as UserIcon, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const RoleBadge = ({ className = "" }: { className?: string }) => {
  const { role, isAdmin, previewAsClient } = useAuth();
  if (!role) return null;

  if (isAdmin && previewAsClient) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/15 text-amber-500 text-[10px] font-semibold uppercase tracking-wider ${className}`}>
        <Eye className="h-3 w-3" /> Client Preview
      </span>
    );
  }

  if (isAdmin) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/15 text-primary text-[10px] font-semibold uppercase tracking-wider ${className}`}>
        <Shield className="h-3 w-3" /> Admin
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-muted-foreground text-[10px] font-semibold uppercase tracking-wider ${className}`}>
      <UserIcon className="h-3 w-3" /> Client
    </span>
  );
};

export default RoleBadge;
