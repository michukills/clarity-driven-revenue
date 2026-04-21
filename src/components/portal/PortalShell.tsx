import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Wrench,
  FolderOpen,
  Settings,
  LogOut,
  FileText,
  TrendingUp,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNav = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/pipeline", icon: KanbanSquare, label: "Pipeline" },
  { to: "/admin/customers", icon: Users, label: "Customers" },
  { to: "/admin/worksheets", icon: Wrench, label: "Tools & Worksheets" },
  { to: "/admin/files", icon: FolderOpen, label: "Files" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

const customerNav = [
  { to: "/portal", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/portal/resources", icon: FolderOpen, label: "My Resources" },
  { to: "/portal/worksheets", icon: FileText, label: "My Worksheets" },
  { to: "/portal/progress", icon: TrendingUp, label: "Progress" },
  { to: "/portal/account", icon: User, label: "Account" },
];

export const PortalShell = ({
  children,
  variant,
}: {
  children: ReactNode;
  variant: "admin" | "customer";
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const items = variant === "admin" ? adminNav : customerNav;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-[hsl(0_0%_10%)] flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="px-6 py-7 border-b border-border">
          <div className="text-sm font-semibold tracking-wide text-foreground">RGS</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
            {variant === "admin" ? "Operating Workspace" : "Client Portal"}
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary/15 text-foreground border-l-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="text-xs text-muted-foreground truncate mb-3">{user?.email}</div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="px-10 py-10 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
};